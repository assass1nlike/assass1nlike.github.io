"""Discover paper pages from official proceedings indexes, cached by the caller."""

from datetime import datetime
from difflib import SequenceMatcher
from html.parser import HTMLParser
import re
from urllib.parse import urljoin, urlparse


def normalize(text):
    return ''.join(c for c in text.casefold() if c.isalnum())


def title_words(text):
    return set(re.findall(r'[a-z0-9]+', text.casefold())) - {'a', 'an', 'the', 'of', 'for', 'and', 'in', 'on', 'with', 'to', 'from'}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.href = None
        self.text = ''

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.href = dict(attrs).get('href')
            self.text = ''

    def handle_data(self, text):
        if self.href:
            self.text += text

    def handle_endtag(self, tag):
        if tag == 'a' and self.href:
            self.links.append((' '.join(self.text.split()), self.href))
            self.href = None


class PmlrVolumes(HTMLParser):
    def __init__(self):
        super().__init__()
        self.volumes = []
        self.text = None
        self.href = None

    def handle_starttag(self, tag, attrs):
        if tag == 'li':
            self.text, self.href = '', None
        if tag == 'a' and self.text is not None:
            href = dict(attrs).get('href', '')
            if re.fullmatch(r'v\d+/?', href):
                self.href = href

    def handle_data(self, text):
        if self.text is not None:
            self.text += text

    def handle_endtag(self, tag):
        if tag == 'li':
            if self.href:
                self.volumes.append((self.text, self.href))
            self.text = None


class PmlrPapers(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.field = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div' and attrs.get('class') == 'paper':
            self.row = {'title': '', 'authors': '', 'url': ''}
        if self.row is not None:
            if tag in ('p', 'span') and attrs.get('class') in ('title', 'authors'):
                self.field = attrs['class']
            if tag == 'a' and attrs.get('href', '').endswith('.html'):
                self.row['url'] = attrs['href']

    def handle_data(self, text):
        if self.row is not None and self.field:
            self.row[self.field] += text

    def handle_endtag(self, tag):
        if tag in ('p', 'span'):
            self.field = None
        if tag == 'div' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


class OfficialIndexes:
    def __init__(self, client):
        self.client = client
        self.pages = {}
        self.errors = {}
        self.search_rows = {}

    def page(self, url, parser_type):
        key = (url, parser_type)
        if key not in self.pages:
            parser = parser_type()
            try:
                parser.feed(self.client.get(url))
            except RuntimeError as error:
                # A missing annual event is normal; other failures stay visible.
                self.pages[key] = (parser, str(error))
            else:
                self.pages[key] = (parser, None)
        parser, error = self.pages[key]
        if error and 'HTTP 404' not in error:
            self.errors[url] = error
        return parser

    def candidates(self, metadata, key):
        """Broad candidate discovery only; the caller still verifies the paper."""
        title = normalize(metadata['title'])
        words = title_words(metadata['title'])
        year = metadata.get('year') or (2000 + int(key[:2]) if re.match(r'\d{4}\.', key) else datetime.now().year - 2)
        years = range(max(1990, year - 1), min(datetime.now().year, year + 3) + 1)
        found = set()
        volumes = self.page('https://proceedings.mlr.press/', PmlrVolumes).volumes
        for label, href in volumes:
            if not re.search(r'\b(?:ICML|AISTATS|COLT|UAI)\b', label) or not any(str(y) in label for y in years):
                continue
            url = urljoin('https://proceedings.mlr.press/', href.rstrip('/') + '/')
            for row in self.page(url, PmlrPapers).rows:
                # An author match can discover a renamed paper; it cannot confirm it.
                first = metadata.get('authors', [''])[0]
                if ',' in first:
                    last, first_name = first.split(',', 1)
                    first = first_name + ' ' + last
                if (normalize(row['title']) == title or
                        (first and normalize(first) in normalize(row['authors']))):
                    if row['url'] and row['url'] not in found:
                        found.add(row['url'])
                        yield row['url']
        for year in reversed(list(years)):
            indexes = [f'https://proceedings.neurips.cc/paper_files/paper/{year}']
            indexes += [f'https://openaccess.thecvf.com/{venue}{year}?day=all'
                        for venue in ('CVPR', 'ICCV', 'WACV') if venue != 'ICCV' or year % 2]
            indexes += [f'https://aclanthology.org/events/{venue}-{year}/'
                        for venue in ('acl', 'emnlp', 'naacl', 'eacl', 'coling')]
            for index in indexes:
                if index not in self.search_rows:
                    self.search_rows[index] = [(normalize(text), title_words(text), href)
                                               for text, href in self.page(index, Links).links]
                for candidate, candidate_words, href in self.search_rows[index]:
                    if len(candidate) < 15 or not (candidate == title or
                            len(words & candidate_words) * 2 >= max(len(words), len(candidate_words)) and
                            SequenceMatcher(None, candidate, title, autojunk=False).ratio() >= .75):
                        continue
                    url = urljoin(index, href)
                    if urlparse(url).hostname == urlparse(index).hostname and not url.endswith('.pdf'):
                        if url not in found:
                            found.add(url)
                            yield url
