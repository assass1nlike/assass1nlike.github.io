"""Cache confirmed publication venues for the exported paper tree."""

import argparse
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
import hashlib
from html.parser import HTMLParser
from html import unescape
import json
import os
from pathlib import Path
import re
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen

from paper_indexes import OfficialIndexes


ROOT = Path(__file__).resolve().parents[1]
ARXIV_ID = r'(?:\d{4}\.\d{4,5}|[a-z][a-z.-]+/\d{7})'
QUERY_VERSION = 3


def arxiv_id(url):
    match = re.fullmatch(r'https://arxiv\.org/abs/(' + ARXIV_ID + r')(?:v\d+)?', url)
    return match[1] if match else None


def normalized(text):
    text = unescape(re.sub(r'<[^>]+>', '', text))
    text = re.sub(r'\\(?:boldsymbol|mathbf|mathrm|mathit|mathsf|mathtt|textbf|textit|text|operatorname|emph)\s*(?=\{)', '', text)
    return ''.join(c for c in unicodedata.normalize('NFKD', text).casefold() if c.isalnum())


def author_name(name):
    if ',' in name:
        last, first = name.split(',', 1)
        name = first + ' ' + last
    return normalized(name)


def same_paper(title, authors, metadata, abstract=''):
    valid = (isinstance(title, str) and isinstance(metadata.get('title'), str)
            and isinstance(authors, list) and bool(authors) and isinstance(authors[0], str)
            and bool(metadata.get('authors')))
    if not valid:
        return False
    source_authors = {author_name(a) for a in authors if isinstance(a, str)}
    expected_authors = {author_name(a) for a in metadata['authors']}
    if normalized(title) in {normalized(t) for t in [metadata['title'], *metadata.get('titleAliases', [])]}:
        return (author_name(authors[0]) == author_name(metadata['authors'][0])
                or len(source_authors & expected_authors) >= 2
                and len(source_authors & expected_authors) / max(len(source_authors), len(expected_authors)) >= .8)
    # A renamed version needs the complete author set AND near-identical abstract.
    a, b = normalized(abstract or ''), normalized(metadata.get('abstract', ''))
    return (len(expected_authors) >= 2 and source_authors == expected_authors
            and min(len(a), len(b)) >= 300
            and SequenceMatcher(None, a, b, autojunk=False).ratio() >= .9)


class ArxivMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.data = {'authors': []}
        self.field = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'td':
            self.field = next((field for field in ('comments', 'jref')
                               if field in attrs.get('class', '').split()), None)
        if tag == 'a' and self.field:
            url = attrs.get('href', '')
            if urlparse(url).scheme == 'https' and urlparse(url).hostname in PROCEEDINGS_HOSTS:
                self.data.setdefault('publication_links', []).append(url)
        if tag != 'meta':
            return
        name, value = attrs.get('name'), attrs.get('content', '')
        if name == 'citation_author':
            self.data['authors'].append(value)
        elif name in ('citation_title', 'citation_doi', 'citation_arxiv_id', 'citation_abstract'):
            self.data[name.removeprefix('citation_')] = value

    def handle_data(self, text):
        if self.field:
            self.data[self.field] = self.data.get(self.field, '') + text

    def handle_endtag(self, tag):
        if tag == 'td':
            if self.field:
                self.data[self.field] = ' '.join(self.data.get(self.field, '').split())
            self.field = None


class Client:
    def __init__(self, cache_dir=None, refresh=False):
        self.last = {}
        self.blocked = {}
        self.cache_dir = cache_dir
        self.refresh = refresh
        self.events = []

    def get(self, url, payload=None, headers=None):
        host = urlparse(url).netloc
        cache_file = None
        if self.cache_dir:
            digest = hashlib.sha256((url + json.dumps(payload, sort_keys=True)).encode()).hexdigest()
            cache_file = self.cache_dir / (digest + '.json')
            if cache_file.exists() and not self.refresh:
                saved = json.loads(cache_file.read_text(encoding='utf-8'))
                if time.time() - saved['time'] < 7 * 86400:
                    self.events.append({'url': url, 'status': 'cached'})
                    return saved['body']
        if host in self.blocked:
            self.events.append({'url': url, 'status': 'deferred', 'error': self.blocked[host]})
            raise RuntimeError(self.blocked[host])
        # Keep requests to each provider sequential and spaced out.
        time.sleep(max(0, self.last.get(host, 0) + 3.1 - time.monotonic()))
        self.last[host] = time.monotonic()
        request_headers = {'User-Agent': 'PaperTree/1.0 (+https://www.assassinlike.top/)'}
        request_headers.update(headers or {})
        if payload is not None:
            request_headers['Content-Type'] = 'application/json'
        request = Request(url, data=json.dumps(payload).encode() if payload is not None else None,
                          headers=request_headers)
        try:
            with urlopen(request, timeout=20) as response:
                body = response.read().decode('utf-8')
                self.events.append({'url': url, 'status': 'ok'})
                # Only cache usable responses; a 200 HTML bot challenge is not JSON.
                json_api = host.startswith('api.') or host.startswith('api2.')
                usable = not json_api or body.lstrip().startswith(('{', '['))
                if cache_file and usable:
                    self.cache_dir.mkdir(parents=True, exist_ok=True)
                    write_json(cache_file, {'time': time.time(), 'body': body})
                return body
        except HTTPError as error:
            self.events.append({'url': url, 'status': 'error', 'error': f'HTTP {error.code}'})
            if error.code in (403, 429):
                self.blocked[host] = f'{host}: HTTP {error.code}; stopped requests for this run'
            raise RuntimeError(f'{host}: HTTP {error.code}') from error
        except (URLError, TimeoutError) as error:
            self.events.append({'url': url, 'status': 'error', 'error': 'network unavailable'})
            raise RuntimeError(f'{host}: network unavailable') from error

    def json(self, url, **kwargs):
        try:
            return json.loads(self.get(url, **kwargs))
        except ValueError as error:
            host = urlparse(url).netloc
            self.blocked[host] = f'{host}: expected JSON; stopped requests for this run'
            raise RuntimeError(self.blocked[host]) from error


def note_content(note):
    content = {k: v.get('value') if isinstance(v, dict) else v
               for k, v in note.get('content', {}).items()}
    if isinstance(content.get('authors'), list):
        content['authors'] = [a.get('fullname', '') if isinstance(a, dict) else a for a in content['authors']]
    return content


def choose_publication(matches):
    unique = list({p['url']: p for p in matches}.values())
    if not unique:
        return None
    # Main conference/journal first; keep workshops as additional evidence.
    priority = {'conference': 0, 'journal': 0, 'proceedings': 1, 'workshop': 2}
    unique.sort(key=lambda p: (priority[p['kind']],
                              -max([int(y) for y in re.findall(r'\b20\d{2}\b', p['label'])] or [0]),
                              p['label'], p['url']))
    result = dict(unique[0])
    if len(unique) > 1:
        result['alternatives'] = unique[1:]
    return result


def openreview_publication(notes, metadata):
    matches = []
    for note in notes:
        content = note_content(note)
        domain = note.get('domain') or note.get('invitation', '').split('/-/')[0]
        parts = domain.split('/')
        # OpenReview's accepted venue id is the venue itself. Submission,
        # rejected and withdrawn groups have different ids and must not pass.
        year_positions = [i for i, part in enumerate(parts[:-1]) if re.fullmatch(r'20\d{2}', part)
                          and parts[i + 1] in ('Conference', 'Workshop', 'Workshops')]
        journal = domain in ('TMLR', 'jmlr.org/TMLR')
        if (content.get('venueid') != domain or (len(year_positions) != 1 and not journal)
                or any(part in ('Submission', 'Blind_Submission', 'Rejected_Submission', 'Withdrawn_Submission') for part in parts)):
            continue
        year_index = year_positions[0] if year_positions else None
        if not same_paper(content.get('title') or '', content.get('authors'), metadata, content.get('abstract')):
            continue
        label = content.get('venue')
        if not label or not note.get('id'):
            continue
        if year_index is not None and parts[year_index] not in label:
            label += ' · ' + parts[year_index]
        matches.append({'label': label,
                        'kind': 'journal' if journal else 'workshop' if any(p in ('Workshop', 'Workshops') for p in parts[year_index + 1:]) else 'conference',
                        'url': 'https://openreview.net/forum?id=' + quote(note['id'])})
    return choose_publication(matches)


def dblp_publication(notes, metadata):
    """Read DBLP's structured bibliography records mirrored by OpenReview."""
    matches = []
    for note in notes:
        if note.get('invitation') != 'dblp.org/-/record' and note.get('domain') != 'DBLP.org':
            continue
        content = note_content(note)
        venue = content.get('venueid', '')
        match = re.fullmatch(r'dblp\.org/(conf|journals)/([^/]+)/(\d{4})', venue)
        if not match or match[2].casefold() in ('corr', 'arxiv'):
            continue
        if not same_paper(content.get('title', ''), content.get('authors'), metadata, content.get('abstract')):
            continue
        label = content.get('venue')
        if not label or not note.get('id'):
            continue
        if match[3] not in label:
            label += ' · ' + match[3]
        matches.append({'label': label, 'kind': 'proceedings' if match[1] == 'conf' else 'journal',
                        'url': 'https://openreview.net/forum?id=' + quote(note['id'])})
    unique = {(p['label'], p['kind']): p for p in matches}
    return next(iter(unique.values())) if len(unique) == 1 else None


class ProceedingsMetadata(HTMLParser):
    """Highwire citation metadata used by ACL Anthology, PMLR and CVF."""
    def __init__(self):
        super().__init__()
        self.data = {}
        self.abstract_depth = 0
        self.abstract = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div':
            if self.abstract_depth:
                self.abstract_depth += 1
            elif attrs.get('id') == 'abstract':
                self.abstract_depth = 1
        name = attrs.get('name', '').lower()
        if tag == 'meta' and name.startswith('citation_'):
            self.data.setdefault(name, []).append(attrs.get('content', ''))

    def handle_data(self, text):
        if self.abstract_depth:
            self.abstract += text

    def handle_endtag(self, tag):
        if tag == 'div' and self.abstract_depth:
            self.abstract_depth -= 1


def proceedings_publication(html, metadata, url):
    parser = ProceedingsMetadata()
    parser.feed(html)
    data = parser.data
    if not any(same_paper(title, data.get('citation_author'), metadata, parser.abstract)
               for title in data.get('citation_title', [])):
        return None
    venue = data.get('citation_conference_title') or data.get('citation_journal_title')
    dates = data.get('citation_publication_date') or data.get('citation_date') or []
    if not venue or not dates or not re.match(r'\d{4}\b', dates[0]):
        return None
    label = venue[0]
    year = dates[0][:4]
    if year not in label:
        label += ' · ' + year
    # These proceedings sites also use citation_journal_title for conference volumes.
    return {'label': label, 'kind': 'proceedings', 'url': url}


def scholar_publication(item, metadata):
    venue = item.get('publicationVenue') or {}
    kind = venue.get('type')
    if (kind not in ('conference', 'journal') or not venue.get('name') or not item.get('paperId')
            or not same_paper(item.get('title', ''), [a['name'] for a in item.get('authors', [])], metadata)):
        return None
    label = venue['name']
    if normalized(label) in ('arxiv', 'corr', 'arxivorg'):
        return None
    # S2's paper year can be the preprint year; it is not the conference year.
    # A conference index does not always distinguish workshops from the main track.
    return {'label': label, 'kind': 'proceedings' if kind == 'conference' else kind,
            'url': 'https://www.semanticscholar.org/paper/' + item['paperId']}


def arxiv_publication(metadata, key):
    """Use an explicit author acceptance statement, not a bare venue mention."""
    comments = metadata.get('comments', '')
    if re.search(r'\b(?:withdrawn|retracted)\b', comments, re.I):
        return None
    for clause in re.split(r'[.;\n]', comments):
        match = re.fullmatch(
            r'\s*Accepted(?:\s+for\s+publication)?\s+(?:at|to|in|by)\s+(.+?)\s*', clause, re.I)
        if not match:
            continue
        label = match[1].strip()
        # Keep the whole venue phrase, including workshop/track qualifiers.
        if (len(label) > 160 or not re.search(r'\b20\d{2}\b', label)
                or not re.search(r'\b(?:ICLR|ICML|NeurIPS|NIPS|ACL|EMNLP|NAACL|EACL|COLING|COLM|CVPR|ICCV|ECCV|AAAI|IJCAI|AISTATS|UAI|COLT|KDD|WWW|SIGIR)\b', label, re.I)
                or re.search(r'\b(?:not|pending|withdrawn|submission|submitted)\b', label, re.I)):
            continue
        return {'label': label, 'kind': 'workshop' if re.search(r'\bworkshops?\b', label, re.I) else 'conference',
                'url': 'https://arxiv.org/abs/' + key}


PROCEEDINGS_HOSTS = {'aclanthology.org', 'proceedings.mlr.press', 'openaccess.thecvf.com',
                     'proceedings.neurips.cc', 'papers.nips.cc'}


def official_links(notes, metadata):
    return sorted({url for note in notes for content in [note_content(note)]
                   if same_paper(content.get('title', ''), content.get('authors'), metadata)
                   for url in [content.get('html', '')]
                   if isinstance(url, str) and urlparse(url).scheme == 'https'
                   and urlparse(url).hostname in PROCEEDINGS_HOSTS})


def search_openreview(client, host, metadata):
    response = client.json('https://' + host + '/notes/search?' +
                           urlencode({'term': metadata['title'], 'limit': 100}))
    return response.get('notes', [])


def crossref_publication(work, metadata, doi):
    if work.get('DOI', '').casefold() != doi.casefold():
        return None
    kinds = {'proceedings-article': 'conference', 'journal-article': 'journal'}
    kind = kinds.get(work.get('type'))
    authors = [a.get('name') or ' '.join((a.get('given', ''), a.get('family', ''))).strip()
               for a in work.get('author', [])]
    titles = work.get('title') or []
    # An explicit publication DOI in the source also bridges renamed papers and
    # consortium author lists. A DOI merely returned by title search cannot do so.
    shared_authors = {author_name(a) for a in authors if a} & {
        author_name(a) for a in metadata.get('authors', [])}
    linked_doi = (metadata.get('doi', '').casefold() == doi.casefold()
                  and (len(shared_authors) >= 2 or
                       authors and metadata.get('authors') and authors[0] and
                       author_name(authors[0]) == author_name(metadata['authors'][0])))
    if not kind or not (linked_doi or any(same_paper(title, authors, metadata) for title in titles)):
        return None
    containers = work.get('container-title') or []
    if not containers:
        return None
    label = containers[0]
    # Crossref's proceedings type does not distinguish a workshop from a main
    # conference. Keep the full proceedings name instead of inferring a track.
    # AAAI's proceedings series is registered as journal-article in Crossref.
    aaai_proceedings = {'2374-3468', '2159-5399'}
    if kind == 'conference' or aaai_proceedings.intersection(work.get('ISSN', [])):
        kind = 'proceedings'
    date = work.get('published', {}).get('date-parts', [[]])[0]
    if date and str(date[0]) not in label:
        label += f' · {date[0]}'
    return {'label': label, 'kind': kind, 'url': 'https://doi.org/' + quote(doi, safe='/')}


def validate_publication(value):
    if value is None:
        return
    if (not isinstance(value, dict) or not isinstance(value.get('label'), str)
            or not value['label'].strip()
            or value.get('kind') not in ('conference', 'workshop', 'journal', 'proceedings')
            or not isinstance(value.get('url'), str)
            or urlparse(value['url']).scheme != 'https' or not urlparse(value['url']).netloc):
        raise ValueError('Publication needs label, kind (conference/workshop/journal/proceedings), and an HTTPS source url')
    for alternative in value.get('alternatives', []):
        validate_publication(alternative)


def published_records(cache, overrides, ids):
    result = {}
    for key, value in overrides.items():
        if not re.fullmatch(ARXIV_ID + r'|paper:[a-f0-9]{20}', key):
            raise ValueError(f'Invalid paper identity in overrides: {key}')
        validate_publication(value)
    for key in ids:
        value = overrides[key] if key in overrides else cache.get(key, {}).get('publication')
        validate_publication(value)
        if value:
            result[key] = value
    return result


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}


def write_json(path, data):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def local_identity(paper, source):
    """Use structured PDF metadata only; no guessed titles from page layout."""
    path = source / paper['category'] / (paper['title'] + '.pdf')
    if not path.exists():
        return {}
    import fitz
    with fitz.open(path) as pdf:
        info = pdf.metadata
    title, author = info.get('title', '').strip(), info.get('author', '').strip()
    if not title or not author:
        return {}
    authors = [name.strip() for name in author.split(';')]
    if len(authors) == 1 and ',' in author:
        parts = [name.strip() for name in author.split(',')]
        if all(len(name.split()) >= 2 for name in parts):
            authors = parts
    metadata = {'title': title, 'authors': authors, 'identitySource': 'PDF metadata'}
    subject = info.get('subject', '')
    year = re.search(r'\b(20\d{2})\b', subject)
    if year:
        metadata['year'] = int(year[1])
    doi = re.search(r'\b10\.\d{4,9}/[^\s,;]+', subject)
    if doi:
        metadata['doi'] = doi[0]
    return metadata


def local_abstract(paper, source):
    path = source / paper['category'] / (paper['title'] + '.pdf')
    if not path.exists():
        return ''
    import fitz
    with fitz.open(path) as pdf:
        text = pdf[0].get_text()
    match = re.search(r'\bAbstract\s*\n(.*?)\n1[.\s]*Introduction\b', text, re.I | re.S)
    return ' '.join(match[1].split()) if match else ''


def update(root=ROOT, *, offline=False, refresh=False, limit=None, deep=False, source=Path(r'D:\papers'), paper_ids=None):
    catalog = read_json(root / 'assets/papers/index.json')
    targets = {arxiv_id(p.get('arxivUrl', '')) or 'paper:' + p['id']: p for p in catalog['papers']}
    ids = sorted(targets)
    selected = set(paper_ids or [])
    if selected - targets.keys():
        raise ValueError('Unknown paper IDs: ' + ', '.join(sorted(selected - targets.keys())))
    cache_path = root / 'scripts/paper-publications-cache.json'
    cache = read_json(cache_path)
    overrides = read_json(root / 'scripts/paper-publications.json')
    identities = read_json(root / 'scripts/paper-identities.json')
    published_records(cache, overrides, ids)  # Validate before doing any network work.
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=7)).isoformat()
    pending = [key for key in ids if key not in overrides and (not selected or key in selected) and (refresh or key in selected or
               ((not cache.get(key, {}).get('publication') or
                 cache[key]['publication']['kind'] == 'workshop' and cache[key].get('queryVersion') != QUERY_VERSION or
                 deep and not cache.get(key, {}).get('deepCheckedAt') and
                 cache.get(key, {}).get('publication', {}).get('kind') == 'workshop') and
                (cache.get(key, {}).get('queryVersion') != QUERY_VERSION
                 or deep and not cache.get(key, {}).get('deepCheckedAt')
                 or cache.get(key, {}).get('error') or cache.get(key, {}).get('checkedAt', '') < cutoff)))]
    pending.sort(key=lambda key: (bool(cache.get(key, {}).get('publication')),
                                  cache.get(key, {}).get('checkedAt', ''), key))
    if limit is not None:
        pending = pending[:limit]
    client = Client(root / '.cache/paper-publications', refresh=refresh)
    indexes = OfficialIndexes(client)
    scholar = {}
    scholar_error = ''
    if pending and not offline:
        try:
            headers = {'x-api-key': os.environ['SEMANTIC_SCHOLAR_API_KEY']} if os.getenv('SEMANTIC_SCHOLAR_API_KEY') else {}
            arxiv_pending = [key for key in pending if not key.startswith('paper:')]
            for start in range(0, len(arxiv_pending), 500):
                batch = arxiv_pending[start:start + 500]
                values = client.json('https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,authors,externalIds,publicationVenue,year',
                                     payload={'ids': ['ARXIV:' + key for key in batch]}, headers=headers)
                for key, value in zip(batch, values):
                    if value and value.get('externalIds', {}).get('ArXiv') == key:
                        scholar[key] = value
        except (RuntimeError, ValueError) as error:
            scholar_error = str(error)
            print(f'Semantic Scholar unavailable; continuing with arXiv and OpenReview ({error})', flush=True)
    try:
        for index, key in enumerate(pending if not offline else []):
            errors = [scholar_error] if scholar_error and not key.startswith('paper:') else []
            client.events = []
            publication = None
            metadata = {}
            notes = []
            if key.startswith('paper:'):
                paper = targets[key]
                path = paper['category'] + '/' + paper['title']
                metadata = identities.get(path) or cache.get(key, {}).get('metadata') or local_identity(paper, source)
                if metadata and not metadata.get('abstract'):
                    abstract = local_abstract(paper, source)
                    if abstract:
                        metadata['abstract'] = abstract
            else:
                try:
                    parser = ArxivMetadata()
                    parser.feed(client.get('https://arxiv.org/abs/' + key))
                    if parser.data.get('arxiv_id') == key:
                        metadata = parser.data
                except RuntimeError as error:
                    errors.append(str(error))
            item = scholar.get(key, {})
            if not metadata.get('title') and item:
                metadata = {'title': item['title'], 'authors': [a['name'] for a in item.get('authors', [])]}
            metadata.update(identities.get(key, {}))
            doi = metadata.get('doi') or item.get('externalIds', {}).get('DOI')
            if doi and not doi.casefold().startswith('10.48550/arxiv.'):
                try:
                    work = client.json('https://api.crossref.org/works/' + quote(doi, safe=''))['message']
                    publication = crossref_publication(work, metadata, doi)
                except (RuntimeError, ValueError) as error:
                    errors.append(str(error))
            if not publication and metadata.get('title') and metadata.get('authors'):
                for host in ('api2.openreview.net', 'api.openreview.net'):
                    try:
                        notes.extend(search_openreview(client, host, metadata))
                        publication = openreview_publication(notes, metadata)
                    except (RuntimeError, ValueError) as error:
                        errors.append(str(error))
                    if publication and publication['kind'] != 'workshop':
                        break
                if not publication:
                    for url in sorted(set(official_links(notes, metadata) + metadata.get('publication_links', []))):
                        try:
                            publication = proceedings_publication(client.get(url), metadata, url)
                        except RuntimeError as error:
                            errors.append(str(error))
                        if publication:
                            break
                if not publication:
                    publication = dblp_publication(notes, metadata)
                if not publication:
                    try:
                        query = {'query.title': metadata['title'], 'rows': 5}
                        if metadata.get('jref'):
                            query['query.bibliographic'] = metadata['jref']
                        works = client.json('https://api.crossref.org/works?' + urlencode(query))['message']['items']
                        matches = [record for work in works if work.get('DOI')
                                   and (record := crossref_publication(work, metadata, work['DOI']))]
                        unique = {record['url']: record for record in matches}
                        if len(unique) == 1:
                            publication = next(iter(unique.values()))
                    except (RuntimeError, ValueError) as error:
                        errors.append(str(error))
                if not publication and item:
                    publication = scholar_publication(item, metadata)
                if not publication and not key.startswith('paper:'):
                    publication = arxiv_publication(metadata, key)
                if deep and (not publication or publication['kind'] == 'workshop' or
                             'semanticscholar.org' in publication['url']):
                    for url in indexes.candidates(metadata, key):
                        try:
                            official = proceedings_publication(client.get(url), metadata, url)
                        except RuntimeError as error:
                            errors.append(str(error))
                            continue
                        if official:
                            if publication and publication['kind'] == 'workshop':
                                official['alternatives'] = [publication]
                            publication = official
                            break
                    errors.extend(indexes.errors.values())
            record = {'checkedAt': now.isoformat(), 'queryVersion': QUERY_VERSION,
                      'status': 'confirmed' if publication else 'query_failed' if errors else 'unconfirmed',
                      'checks': client.events}
            if deep:
                record['deepCheckedAt'] = now.isoformat()
            if metadata:
                record['metadata'] = metadata
            if not publication and metadata.get('title'):
                record['candidates'] = [
                    {'title': content.get('title'), 'venue': content.get('venue'),
                     'url': 'https://openreview.net/forum?id=' + quote(note['id']),
                     'identityMatched': same_paper(content.get('title'), content.get('authors'), metadata, content.get('abstract'))}
                    for note in notes for content in [note_content(note)]
                    if isinstance(content.get('title'), str) and SequenceMatcher(
                        None, normalized(content['title']), normalized(metadata['title']), autojunk=False).ratio() >= .6]
            if publication:
                record['publication'] = publication
            elif cache.get(key, {}).get('publication'):
                record['publication'] = cache[key]['publication']
            if not metadata.get('title') or not metadata.get('authors'):
                record['status'] = 'missing_identity'
                errors.append('No verified title and author metadata')
            if errors:
                record['error'] = '; '.join(dict.fromkeys(errors))
            cache[key] = record
            write_json(cache_path, cache)
            print(f'[{index + 1}/{len(pending)}] {key}: ' +
                  (publication['label'] if publication else 'not confirmed'), flush=True)
    finally:
        records = published_records(cache, overrides, ids)
        write_json(root / 'assets/papers/publications.json', records)
        unresolved = [{'key': key, 'title': targets[key].get('title', key),
                       'fullTitle': cache.get(key, {}).get('metadata', {}).get('title', ''),
                       'checkedAt': cache.get(key, {}).get('checkedAt'),
                       'deepCheckedAt': cache.get(key, {}).get('deepCheckedAt'),
                       'status': cache.get(key, {}).get('status', 'not_checked'),
                       'error': cache.get(key, {}).get('error', ''),
                       'candidates': cache.get(key, {}).get('candidates', []),
                       'checks': cache.get(key, {}).get('checks', [])}
                      for key in ids if key not in records]
        write_json(root / 'scripts/paper-publications-report.json',
                   {'confirmed': len(records), 'total': len(ids), 'unresolved': unresolved})
        print(f'Published {len(records)} confirmed records for {len(ids)} paper identities.', flush=True)
        for reason in client.blocked.values():
            print(reason, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true', help='Apply cached records and manual corrections without network requests')
    parser.add_argument('--refresh', action='store_true', help='Recheck records, including already confirmed ones')
    parser.add_argument('--limit', type=int, help='Maximum papers to query in this run')
    parser.add_argument('--deep', action='store_true', help='Search official proceedings indexes for unresolved papers')
    parser.add_argument('--source', type=Path, default=Path(r'D:\papers'), help='Local PDF directory for papers without arXiv IDs')
    parser.add_argument('--paper', action='append', help='Recheck only this arXiv ID or paper:<catalog ID>; repeat for multiple papers')
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    update(offline=args.offline, refresh=args.refresh, limit=args.limit, deep=args.deep, source=args.source, paper_ids=args.paper)
