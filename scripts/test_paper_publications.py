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
        self.assertFalse(publications.same_paper(None, ['Jiayi Zhang'], self.metadata))
        self.assertFalse(publications.same_paper(self.metadata['title'], [None], self.metadata))

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
        combined = publications.openreview_publication([workshop, self.note], self.metadata)
        self.assertEqual(combined['kind'], 'conference')
        self.assertEqual(combined['alternatives'][0]['kind'], 'workshop')

    def test_nested_conference_path_and_rejected_domain(self):
        note = copy.deepcopy(self.note)
        note['domain'] = note['content']['venueid']['value'] = 'colmweb.org/COLM/2024/Conference'
        note['content']['venue']['value'] = 'COLM'
        self.assertEqual(publications.openreview_publication([note], self.metadata)['label'], 'COLM · 2024')
        note['domain'] = note['content']['venueid']['value'] = 'colmweb.org/COLM/2024/Conference/Rejected_Submission'
        self.assertIsNone(publications.openreview_publication([note], self.metadata))

    def test_renamed_paper_needs_authors_and_abstract(self):
        abstract = 'We study the behaviour of neural networks using training examples. ' * 12
        metadata = {'title': 'Old title', 'authors': ['Alice Zhang', 'Bob Wang'], 'abstract': abstract}
        self.assertTrue(publications.same_paper('New title', ['Bob Wang', 'Alice Zhang'], metadata, abstract))
        self.assertFalse(publications.same_paper('New title', ['Alice Zhang', 'Other Person'], metadata, abstract))
        self.assertFalse(publications.same_paper('New title', ['Alice Zhang', 'Bob Wang'], metadata, 'A different study.'))
        self.assertFalse(publications.same_paper('Similar old title', ['Alice Zhang', 'Bob Wang'], metadata))

    def test_title_formatting_does_not_change_identity(self):
        metadata = {'title': 'A method with f-SoftArgmax & Regularization', 'authors': ['Alice Zhang']}
        self.assertTrue(publications.same_paper(
            r'A method with $\boldsymbol{f}$-SoftArgmax $\&$ Regularization', ['Alice Zhang'], metadata))
        self.assertFalse(publications.same_paper(
            r'A method with $\boldsymbol{g}$-SoftArgmax $\&$ Regularization', ['Alice Zhang'], metadata))

    def test_successful_requests_are_cached_but_errors_are_not(self):
        with tempfile.TemporaryDirectory() as temp:
            client = publications.Client(Path(temp))
            url = 'https://api.example.org/test'
            from unittest.mock import MagicMock
            response = MagicMock()
            response.__enter__.return_value.read.return_value = b'{"ok": true}'
            with patch.object(publications, 'urlopen', return_value=response) as request:
                self.assertTrue(client.json(url)['ok'])
                self.assertTrue(client.json(url)['ok'])
                self.assertEqual(request.call_count, 1)
                self.assertTrue(publications.Client(Path(temp), refresh=True).json(url)['ok'])
                self.assertEqual(request.call_count, 2)
            with patch.object(publications, 'urlopen', side_effect=HTTPError(url, 429, '', {}, None)):
                with self.assertRaises(RuntimeError):
                    client.get(url + '/blocked')
            self.assertEqual(len(list(Path(temp).glob('*.json'))), 1)

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
        work.update(type='journal-article', ISSN=['2374-3468'])
        self.assertEqual(publications.crossref_publication(work, self.metadata, work['DOI'])['kind'], 'proceedings')

    def test_manual_override_suppression_and_url_validation(self):
        record = publications.openreview_publication([self.note], self.metadata)
        cache = {'2410.10762': {'publication': record}}
        self.assertEqual(publications.published_records(cache, {'2410.10762': None}, ['2410.10762']), {})
        fixed = dict(record, label='Corrected venue')
        self.assertEqual(publications.published_records(cache, {'2410.10762': fixed}, ['2410.10762'])['2410.10762'], fixed)
        with self.assertRaises(ValueError):
            publications.validate_publication(dict(record, url='javascript:alert(1)'))
        self.assertEqual(publications.arxiv_id('https://arxiv.org/abs/2410.10762v4'), '2410.10762')

    def test_explicit_doi_bridges_renamed_consortium_paper_but_search_doi_does_not(self):
        metadata = {'title': 'Original title', 'authors': ['Alice Li', 'Bob Wang'], 'doi': '10.1234/published'}
        work = {'DOI': metadata['doi'], 'title': ['Completely changed title'], 'type': 'journal-article',
                'author': [{'name': 'Research Consortium'}, {'given': 'Alice', 'family': 'Li'},
                           {'given': 'Bob', 'family': 'Wang'}], 'container-title': ['Example Journal']}
        self.assertEqual(publications.crossref_publication(work, metadata, work['DOI'])['kind'], 'journal')
        self.assertIsNone(publications.crossref_publication(work, dict(metadata, doi=''), work['DOI']))
        work['author'] = [{'given': 'Other', 'family': 'Person'}]
        self.assertIsNone(publications.crossref_publication(work, metadata, work['DOI']))

    def test_verified_title_alias_still_requires_matching_authors(self):
        metadata = dict(self.metadata, titleAliases=['Verified new title'])
        self.assertTrue(publications.same_paper('Verified new title', ['Jiayi Zhang'], metadata))
        self.assertFalse(publications.same_paper('Verified new title', ['Other Person'], metadata))

    def test_targeted_retry_keeps_other_publications_and_rejects_unknown_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'scripts').mkdir()
            (root / 'assets/papers').mkdir(parents=True)
            chosen, other = '2410.10762', '2410.10000'
            record = publications.openreview_publication([self.note], self.metadata)
            publications.write_json(root / 'assets/papers/index.json', {'papers': [
                {'arxivUrl': 'https://arxiv.org/abs/' + key} for key in (chosen, other)]})
            publications.write_json(root / 'scripts/paper-publications-cache.json', {
                key: {'publication': record, 'checkedAt': '2026-10-05T00:00:00+00:00',
                      'queryVersion': publications.QUERY_VERSION} for key in (chosen, other)})
            html = ('<meta name="citation_arxiv_id" content="2410.10762">'
                    '<meta name="citation_title" content="An Example: A New Method">'
                    '<meta name="citation_author" content="Zhang, Jiayi">')
            def response(url, **kwargs):
                return [None] if 'semanticscholar' in url else {'notes': [self.note]}
            with patch.object(publications.Client, 'get', return_value=html) as request, \
                    patch.object(publications.Client, 'json', side_effect=response):
                publications.update(root, paper_ids=[chosen])
                request.assert_called_once_with('https://arxiv.org/abs/' + chosen)
                with self.assertRaises(ValueError):
                    publications.update(root, paper_ids=['unknown'])
            self.assertEqual(set(publications.read_json(root / 'assets/papers/publications.json')), {chosen, other})

    def test_arxiv_citation_metadata(self):
        parser = publications.ArxivMetadata()
        parser.feed('<meta name="citation_title" content="A &amp; B"><meta name="citation_author" content="Zhang, Jiayi">'
                    '<meta name="citation_arxiv_id" content="2410.10762"><meta name="citation_doi" content="10.1234/example">')
        self.assertEqual(parser.data, {'title': 'A & B', 'authors': ['Zhang, Jiayi'], 'arxiv_id': '2410.10762', 'doi': '10.1234/example'})

    def test_legacy_openreview_requires_accepted_venue(self):
        legacy = {'id': 'legacy', 'invitation': 'ICLR.cc/2021/Conference/-/Blind_Submission',
                  'content': {'title': self.metadata['title'], 'authors': ['Jiayi Zhang'],
                              'venueid': 'ICLR.cc/2021/Conference', 'venue': 'ICLR 2021 Spotlight'}}
        self.assertEqual(publications.openreview_publication([legacy], self.metadata)['label'], 'ICLR 2021 Spotlight')
        legacy['content']['venueid'] += '/Rejected_Submission'
        self.assertIsNone(publications.openreview_publication([legacy], self.metadata))

    def test_dblp_mirror_excludes_preprints_and_wrong_identity(self):
        note = {'id': 'dblp-record', 'invitation': 'dblp.org/-/record', 'content': {
            'title': self.metadata['title'], 'authors': ['Jiayi Zhang'],
            'venueid': 'dblp.org/conf/NIPS/2020', 'venue': 'NeurIPS 2020'}}
        self.assertEqual(publications.dblp_publication([note], self.metadata)['label'], 'NeurIPS 2020')
        modern = {'id': 'modern', 'domain': 'DBLP.org',
                  'content': {key: {'value': value} for key, value in note['content'].items()}}
        self.assertEqual(publications.dblp_publication([modern], self.metadata)['label'], 'NeurIPS 2020')
        for venue in ['dblp.org/journals/CORR/2020', 'dblp.org/conf/NIPS/2020/Submission']:
            changed = copy.deepcopy(note)
            changed['content']['venueid'] = venue
            self.assertIsNone(publications.dblp_publication([changed], self.metadata))
        note['content']['authors'] = ['Wrong Author']
        self.assertIsNone(publications.dblp_publication([note], self.metadata))

    def test_official_proceedings_metadata_and_link_scope(self):
        url = 'https://aclanthology.org/2025.example-1.1/'
        html = ('<meta name="citation_title" content="An Example: A New Method">'
                '<meta name="citation_author" content="Jiayi Zhang">'
                '<meta name="citation_conference_title" content="Example Workshop">'
                '<meta name="citation_publication_date" content="2025/07">')
        record = publications.proceedings_publication(html, self.metadata, url)
        self.assertEqual(record, {'label': 'Example Workshop · 2025', 'kind': 'proceedings', 'url': url})
        self.assertEqual(publications.proceedings_publication(
            html.replace('citation_conference_title', 'citation_journal_title'), self.metadata, url)['kind'], 'proceedings')
        self.assertIsNone(publications.proceedings_publication(html.replace('Jiayi Zhang', 'Other Author'), self.metadata, url))
        notes = [{'content': {'title': self.metadata['title'], 'authors': ['Jiayi Zhang'], 'html': url}},
                 {'content': {'title': 'Other Paper', 'authors': ['Jiayi Zhang'], 'html': 'https://proceedings.mlr.press/other.html'}}]
        self.assertEqual(publications.official_links(notes, self.metadata), [url])
        notes[0]['content']['authors'] = {'value': [{'fullname': 'Jiayi Zhang'}]}
        self.assertEqual(publications.official_links(notes, self.metadata), [url])

    def test_arxiv_acceptance_is_explicit_and_preserves_workshop(self):
        parser = publications.ArxivMetadata()
        parser.feed('<td class="tablecell comments mathjax">12 pages. Accepted at <b>ICLR 2025 Workshop on Examples</b></td>'
                    '<td class="tablecell jref">Example Proceedings (2025)</td>')
        record = publications.arxiv_publication(parser.data, '2410.10762')
        self.assertEqual(record['kind'], 'workshop')
        self.assertEqual(record['label'], 'ICLR 2025 Workshop on Examples')
        self.assertEqual(parser.data['jref'], 'Example Proceedings (2025)')
        for text in ['Submitted to ICLR 2025', 'Not accepted at ICLR 2025', 'ICLR 2025 submission',
                     'Accepted at ICLR', 'Accepted at ICLR 2025; later withdrawn']:
            self.assertIsNone(publications.arxiv_publication({'comments': text}, '2410.10762'))

    def test_scholar_requires_typed_venue_and_identity(self):
        item = {'paperId': 'paper-id', 'title': self.metadata['title'], 'authors': [{'name': 'Jiayi Zhang'}],
                'year': 2025, 'publicationVenue': {'name': 'Example Conference', 'type': 'conference'}}
        self.assertEqual(publications.scholar_publication(item, self.metadata)['kind'], 'proceedings')
        self.assertEqual(publications.scholar_publication(item, self.metadata)['label'], 'Example Conference')
        item['publicationVenue']['type'] = None
        self.assertIsNone(publications.scholar_publication(item, self.metadata))

    def test_openreview_search_requests_more_than_twenty_hits(self):
        client = publications.Client()
        with patch.object(client, 'json', return_value={'notes': [{'content': {}}] * 20 + [self.note]}) as request:
            notes = publications.search_openreview(client, 'api2.openreview.net', self.metadata)
        self.assertEqual(len(notes), 21)
        self.assertIn('limit=100', request.call_args.args[0])

    def test_non_json_response_stops_provider(self):
        client = publications.Client()
        with patch.object(client, 'get', return_value='<html>Verification required</html>'):
            with self.assertRaises(RuntimeError):
                client.json('https://dblp.org/search/publ/api')
        self.assertIn('dblp.org', client.blocked)

    def test_new_channels_recheck_recent_unconfirmed_cache_and_search_crossref_without_doi(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'scripts').mkdir()
            (root / 'assets/papers').mkdir(parents=True)
            key = '2410.10762'
            publications.write_json(root / 'scripts/paper-publications-cache.json', {
                key: {'checkedAt': publications.datetime.now(publications.timezone.utc).isoformat()}})
            publications.write_json(root / 'assets/papers/index.json', {'papers': [
                {'arxivUrl': 'https://arxiv.org/abs/' + key}]})
            html = ('<meta name="citation_arxiv_id" content="2410.10762">'
                    '<meta name="citation_title" content="An Example: A New Method">'
                    '<meta name="citation_author" content="Zhang, Jiayi">')
            work = {'DOI': '10.1234/published', 'type': 'proceedings-article',
                    'title': [self.metadata['title']], 'author': [{'given': 'Jiayi', 'family': 'Zhang'}],
                    'container-title': ['Example Proceedings'], 'published': {'date-parts': [[2025]]}}

            def response(url, **kwargs):
                if 'semanticscholar' in url:
                    return [None]
                if 'openreview' in url:
                    return {'notes': []}
                if 'crossref.org/works?' in url:
                    return {'message': {'items': [work]}}
                self.fail('Unexpected URL: ' + url)

            with patch.object(publications.Client, 'get', return_value=html), \
                    patch.object(publications.Client, 'json', side_effect=response) as query:
                publications.update(root)
            queried = [call.args[0] for call in query.call_args_list]
            self.assertTrue(any('api.openreview.net' in url for url in queried))
            self.assertTrue(any('query.title=' in url for url in queried))
            result = publications.read_json(root / 'assets/papers/publications.json')
            self.assertEqual(result[key]['label'], 'Example Proceedings · 2025')
            cache = publications.read_json(root / 'scripts/paper-publications-cache.json')
            self.assertEqual(cache[key]['queryVersion'], publications.QUERY_VERSION)

    def test_paper_without_arxiv_uses_verified_identity_and_stable_catalog_id(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'scripts').mkdir()
            (root / 'assets/papers').mkdir(parents=True)
            key = 'paper:' + 'a' * 20
            publications.write_json(root / 'assets/papers/index.json', {'papers': [
                {'id': 'a' * 20, 'title': 'Short name', 'category': 'test', 'arxivUrl': ''}]})
            publications.write_json(root / 'scripts/paper-identities.json', {'test/Short name': self.metadata})
            with patch.object(publications.Client, 'json', return_value={'notes': [self.note]}) as query:
                publications.update(root)
            result = publications.read_json(root / 'assets/papers/publications.json')
            self.assertEqual(result[key]['label'], 'ICLR 2025 Oral')
            self.assertFalse(any('semanticscholar' in call.args[0] for call in query.call_args_list))

    def test_missing_local_identity_is_reported_without_guessing_from_filename(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'scripts').mkdir()
            (root / 'assets/papers').mkdir(parents=True)
            publications.write_json(root / 'assets/papers/index.json', {'papers': [
                {'id': 'a' * 20, 'title': 'Unverified acronym', 'category': 'test', 'arxivUrl': ''}]})
            with patch.object(publications.Client, 'get') as request:
                publications.update(root, source=root / 'absent')
                request.assert_not_called()
            report = publications.read_json(root / 'scripts/paper-publications-report.json')
            self.assertEqual(report['unresolved'][0]['status'], 'missing_identity')
            self.assertEqual(report['confirmed'], 0)

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
