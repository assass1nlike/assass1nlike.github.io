import unittest
from unittest.mock import Mock

from paper_indexes import Links, OfficialIndexes, PmlrPapers, PmlrVolumes


class ProceedingsIndexTests(unittest.TestCase):
    def test_pmlr_volume_and_renamed_paper_discovery(self):
        root = '<ul><li><a href="v162"><b>Volume 162</b></a> Proceedings of ICML 2022</li></ul>'
        paper = ('<div class="paper"><p class="title">A changed title</p>'
                 '<p><span class="authors">Andrew Ilyas,&nbsp;Other Author</span></p>'
                 '<a href="https://proceedings.mlr.press/v162/ilyas22a.html">abs</a></div>')
        client = Mock()
        client.get.side_effect = [root, paper]
        index = OfficialIndexes(client)
        metadata = {'title': 'Original title', 'authors': ['Ilyas, Andrew']}
        self.assertEqual(next(index.candidates(metadata, '2202.00622')),
                         'https://proceedings.mlr.press/v162/ilyas22a.html')
        self.assertEqual(client.get.call_count, 2)
        self.assertEqual(next(index.candidates(metadata, '2202.00622')),
                         'https://proceedings.mlr.press/v162/ilyas22a.html')
        self.assertEqual(client.get.call_count, 2)

    def test_title_links_preserve_nested_markup(self):
        parser = Links()
        parser.feed('<a href="/paper.html"><b>A Paper:</b> a result</a>')
        self.assertEqual(parser.links, [('A Paper: a result', '/paper.html')])

    def test_one_unavailable_index_does_not_abort_other_sources(self):
        client = Mock()
        client.get.side_effect = RuntimeError('HTTP 403')
        index = OfficialIndexes(client)
        self.assertEqual(index.page('https://example.org/', Links).links, [])
        self.assertEqual(index.errors['https://example.org/'], 'HTTP 403')
        index.page('https://example.org/', Links)
        self.assertEqual(client.get.call_count, 1)


if __name__ == '__main__':
    unittest.main()
