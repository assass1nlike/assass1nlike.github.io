"""Cache confirmed publication venues for the exported paper tree."""

import argparse
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ARXIV_ID = r'(?:\d{4}\.\d{4,5}|[a-z][a-z.-]+/\d{7})'


def arxiv_id(url):
    match = re.fullmatch(r'https://arxiv\.org/abs/(' + ARXIV_ID + r')(?:v\d+)?', url)
    return match[1] if match else None


def normalized(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text).casefold() if c.isalnum())


def author_name(name):
    if ',' in name:
        last, first = name.split(',', 1)
        name = first + ' ' + last
    return normalized(name)


def same_paper(title, authors, metadata):
    return (normalized(title) == normalized(metadata.get('title', ''))
            and bool(authors) and bool(metadata.get('authors'))
            and author_name(authors[0]) == author_name(metadata['authors'][0]))


class ArxivMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.data = {'authors': []}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag != 'meta':
            return
        name, value = attrs.get('name'), attrs.get('content', '')
        if name == 'citation_author':
            self.data['authors'].append(value)
        elif name in ('citation_title', 'citation_doi', 'citation_arxiv_id'):
            self.data[name.removeprefix('citation_')] = value


class Client:
    def __init__(self):
        self.last = {}
        self.blocked = {}

    def get(self, url, payload=None, headers=None):
        host = urlparse(url).netloc
        if host in self.blocked:
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
                return response.read().decode('utf-8')
        except HTTPError as error:
            if error.code in (403, 429):
                self.blocked[host] = f'{host}: HTTP {error.code}; stopped requests for this run'
            raise RuntimeError(f'{host}: HTTP {error.code}') from error
        except (URLError, TimeoutError) as error:
            raise RuntimeError(f'{host}: network unavailable') from error

    def json(self, url, **kwargs):
        return json.loads(self.get(url, **kwargs))


def openreview_publication(notes, metadata):
    matches = []
    for note in notes:
        content = {k: v.get('value') if isinstance(v, dict) else v
                   for k, v in note.get('content', {}).items()}
        domain = note.get('domain', '')
        parts = domain.split('/')
        # OpenReview's accepted venue id is the venue itself. Submission,
        # rejected and withdrawn groups have different ids and must not pass.
        if (content.get('venueid') != domain or len(parts) < 3
                or not re.fullmatch(r'20\d{2}', parts[1])
                or parts[2] not in ('Conference', 'Workshop', 'Workshops')):
            continue
        if not same_paper(content.get('title') or '', content.get('authors'), metadata):
            continue
        label = content.get('venue')
        if not label or not note.get('id'):
            continue
        if parts[1] not in label:
            label += ' · ' + parts[1]
        matches.append({'label': label,
                        'kind': 'workshop' if any(p in ('Workshop', 'Workshops') for p in parts[2:]) else 'conference',
                        'url': 'https://openreview.net/forum?id=' + quote(note['id'])})
    unique = {p['url']: p for p in matches}
    return next(iter(unique.values())) if len(unique) == 1 else None


def crossref_publication(work, metadata, doi):
    if work.get('DOI', '').casefold() != doi.casefold():
        return None
    kinds = {'proceedings-article': 'conference', 'journal-article': 'journal'}
    kind = kinds.get(work.get('type'))
    authors = [' '.join((a.get('given', ''), a.get('family', ''))).strip()
               for a in work.get('author', [])]
    titles = work.get('title') or []
    if not kind or not any(same_paper(title, authors, metadata) for title in titles):
        return None
    containers = work.get('container-title') or []
    if not containers:
        return None
    label = containers[0]
    # Crossref's proceedings type does not distinguish a workshop from a main
    # conference. Keep the full proceedings name instead of inferring a track.
    if kind == 'conference':
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


def published_records(cache, overrides, ids):
    result = {}
    for key, value in overrides.items():
        if not re.fullmatch(ARXIV_ID, key):
            raise ValueError(f'Invalid arXiv id in overrides: {key}')
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


def update(root=ROOT, *, offline=False, refresh=False, limit=None):
    catalog = read_json(root / 'assets/papers/index.json')
    ids = sorted({key for p in catalog['papers'] if (key := arxiv_id(p.get('arxivUrl', '')))})
    cache_path = root / 'scripts/paper-publications-cache.json'
    cache = read_json(cache_path)
    overrides = read_json(root / 'scripts/paper-publications.json')
    published_records(cache, overrides, ids)  # Validate before doing any network work.
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=7)).isoformat()
    pending = [key for key in ids if key not in overrides and (refresh or
               (not cache.get(key, {}).get('publication') and
                (cache.get(key, {}).get('error') or cache.get(key, {}).get('checkedAt', '') < cutoff)))]
    if limit is not None:
        pending = pending[:limit]
    client = Client()
    scholar = {}
    if pending and not offline:
        try:
            headers = {'x-api-key': os.environ['SEMANTIC_SCHOLAR_API_KEY']} if os.getenv('SEMANTIC_SCHOLAR_API_KEY') else {}
            for start in range(0, len(pending), 500):
                batch = pending[start:start + 500]
                values = client.json('https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,authors,externalIds',
                                     payload={'ids': ['ARXIV:' + key for key in batch]}, headers=headers)
                for key, value in zip(batch, values):
                    if value and value.get('externalIds', {}).get('ArXiv') == key:
                        scholar[key] = value
        except (RuntimeError, ValueError) as error:
            print(f'Semantic Scholar unavailable; continuing with arXiv and OpenReview ({error})', flush=True)
    try:
        for index, key in enumerate(pending if not offline else []):
            errors = []
            publication = None
            metadata = {}
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
            doi = metadata.get('doi') or item.get('externalIds', {}).get('DOI')
            if doi and not doi.casefold().startswith('10.48550/arxiv.'):
                try:
                    work = client.json('https://api.crossref.org/works/' + quote(doi, safe=''))['message']
                    publication = crossref_publication(work, metadata, doi)
                except (RuntimeError, ValueError) as error:
                    errors.append(str(error))
            if not publication and metadata.get('title') and metadata.get('authors'):
                try:
                    response = client.json('https://api2.openreview.net/notes/search?' +
                                           urlencode({'term': metadata['title'], 'limit': 20}))
                    publication = openreview_publication(response.get('notes', []), metadata)
                except (RuntimeError, ValueError) as error:
                    errors.append(str(error))
            record = {'checkedAt': now.isoformat()}
            if publication:
                record['publication'] = publication
            elif cache.get(key, {}).get('publication'):
                record['publication'] = cache[key]['publication']
            if not metadata.get('title'):
                errors.append('No verified title and author metadata')
            if errors:
                record['error'] = '; '.join(errors)
            cache[key] = record
            write_json(cache_path, cache)
            print(f'[{index + 1}/{len(pending)}] {key}: ' +
                  (publication['label'] if publication else 'not confirmed'), flush=True)
    finally:
        records = published_records(cache, overrides, ids)
        write_json(root / 'assets/papers/publications.json', records)
        print(f'Published {len(records)} confirmed records for {len(ids)} arXiv papers.', flush=True)
        for reason in client.blocked.values():
            print(reason, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true', help='Apply cached records and manual corrections without network requests')
    parser.add_argument('--refresh', action='store_true', help='Recheck records, including already confirmed ones')
    parser.add_argument('--limit', type=int, help='Maximum papers to query in this run')
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    update(offline=args.offline, refresh=args.refresh, limit=args.limit)
