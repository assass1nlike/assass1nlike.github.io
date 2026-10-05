import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError


spec = importlib.util.spec_from_file_location('publications', Path(__file__).with_name('update-paper-publications.py'))
publications = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publications)


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.metadata = {'title': 'An Example: A New Method', 'authors': ['Zhang, Jiayi']}
        self.note = {'id': 'forum-id', 'domain': 'ICLR.cc/2025/Conference', 'content': {
            'title': {'value': 'An Example — A New Method'},
            'authors': {'value': ['Jiayi Zhang']},
            'venue': {'value': 'ICLR 2025 Oral'},
            'venueid': {'value': 'ICLR.cc/2025/Conference'}}}

    def test_identity_and_accepted_venue(self):
        record = publications.openreview_publication([self.note], self.metadata)
        self.assertEqual(record['label'], 'ICLR 2025 Oral')
        self.assertEqual(record['kind'], 'conference')
        for field, value in [('authors', ['Other Author']), ('title', 'Another Paper')]:
            note = copy.deepcopy(self.note)
            note['content'][field]['value'] = value
            self.assertIsNone(publications.openreview_publication([note], self.metadata))

    def test_submitted_rejected_withdrawn_and_corr_are_not_accepted(self):
        for group in ('Submission', 'Rejected_Submission', 'Withdrawn_Submission'):
            note = copy.deepcopy(self.note)
            note['content']['venueid']['value'] += '/' + group
            self.assertIsNone(publications.openreview_publication([note], self.metadata))
        note = copy.deepcopy(self.note)
        note['domain'] = note['content']['venueid']['value'] = 'dblp.org/journals/CORR/2025'
        self.assertIsNone(publications.openreview_publication([note], self.metadata))

    def test_workshop_and_ambiguous_publications(self):
        workshop = copy.deepcopy(self.note)
        workshop['domain'] = workshop['content']['venueid']['value'] = 'ICLR.cc/2025/Workshop/Example'
        workshop['content']['venue']['value'] = 'Example Workshop'
        workshop['id'] = 'workshop-id'
        result = publications.openreview_publication([workshop], self.metadata)
        self.assertEqual(result['kind'], 'workshop')
        self.assertIn('2025', result['label'])
        self.assertIsNone(publications.openreview_publication([self.note, workshop], self.metadata))

    def test_crossref_requires_identity_and_published_article(self):
        work = {'DOI': '10.1234/example', 'type': 'proceedings-article',
                'title': [self.metadata['title']], 'author': [{'given': 'Jiayi', 'family': 'Zhang'}],
                'container-title': ['Example Workshop Proceedings'], 'published': {'date-parts': [[2025]]}}
        record = publications.crossref_publication(work, self.metadata, work['DOI'])
        self.assertEqual(record['kind'], 'proceedings')
        self.assertEqual(record['label'], 'Example Workshop Proceedings · 2025')
        self.assertIsNone(publications.crossref_publication(work, self.metadata, '10.1234/other'))
        work['type'] = 'posted-content'
        self.assertIsNone(publications.crossref_publication(work, self.metadata, work['DOI']))

    def test_manual_override_suppression_and_url_validation(self):
        record = publications.openreview_publication([self.note], self.metadata)
        cache = {'2410.10762': {'publication': record}}
        self.assertEqual(publications.published_records(cache, {'2410.10762': None}, ['2410.10762']), {})
        fixed = dict(record, label='Corrected venue')
        self.assertEqual(publications.published_records(cache, {'2410.10762': fixed}, ['2410.10762'])['2410.10762'], fixed)
        with self.assertRaises(ValueError):
            publications.validate_publication(dict(record, url='javascript:alert(1)'))
        self.assertEqual(publications.arxiv_id('https://arxiv.org/abs/2410.10762v4'), '2410.10762')

    def test_arxiv_citation_metadata(self):
        parser = publications.ArxivMetadata()
        parser.feed('<meta name="citation_title" content="A &amp; B"><meta name="citation_author" content="Zhang, Jiayi">'
                    '<meta name="citation_arxiv_id" content="2410.10762"><meta name="citation_doi" content="10.1234/example">')
        self.assertEqual(parser.data, {'title': 'A & B', 'authors': ['Zhang, Jiayi'], 'arxiv_id': '2410.10762', 'doi': '10.1234/example'})

    def test_rate_limit_stops_requests_to_that_provider(self):
        client = publications.Client()
        url = 'https://api.semanticscholar.org/graph/v1/paper/batch'
        with patch.object(publications, 'urlopen', side_effect=HTTPError(url, 429, 'rate limit', {}, None)) as request:
            for _ in range(2):
                with self.assertRaises(RuntimeError):
                    client.get(url)
            self.assertEqual(request.call_count, 1)

    def test_offline_and_failed_refresh_preserve_records_after_rename(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'scripts').mkdir()
            (root / 'assets/papers').mkdir(parents=True)
            record = publications.openreview_publication([self.note], self.metadata)
            cache = {'2410.10762': {'publication': record, 'checkedAt': '2025-01-01T00:00:00+00:00'}}
            publications.write_json(root / 'scripts/paper-publications-cache.json', cache)
            publications.write_json(root / 'assets/papers/index.json', {'papers': [
                {'id': 'new-id-after-move', 'title': 'Renamed paper', 'arxivUrl': 'https://arxiv.org/abs/2410.10762v4'}]})
            with patch.object(publications.Client, 'get', side_effect=RuntimeError('offline')) as request:
                publications.update(root, offline=True)
                request.assert_not_called()
                publications.update(root, refresh=True)
            output = json.loads((root / 'assets/papers/publications.json').read_text(encoding='utf-8'))
            self.assertEqual(output, {'2410.10762': record})


if __name__ == '__main__':
    unittest.main()
