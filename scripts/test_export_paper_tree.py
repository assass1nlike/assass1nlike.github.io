import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-paper-tree.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class PaperExportTests(unittest.TestCase):
    def test_arxiv_stamp_not_references(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'paper.pdf'
            with exporter.fitz.open() as pdf:
                page = pdf.new_page()
                page.insert_text((72, 72), 'Paper title\narXiv:2210.07229v2 [cs.CL] 1 Aug 2023\nRelated: https://arxiv.org/abs/9999.12345')
                pdf.save(path)
            self.assertEqual(exporter.arxiv_from_pdf(path), 'https://arxiv.org/abs/2210.07229')
            other = Path(temp) / 'references-only.pdf'
            with exporter.fitz.open() as pdf:
                pdf.new_page().insert_text((72, 72), 'Prior work: arXiv:2210.07229\nhttps://arxiv.org/abs/2210.07229')
                pdf.save(other)
            self.assertEqual(exporter.arxiv_from_pdf(other), '')

    def test_last_break_keeps_earlier_sections(self):
        self.assertEqual(exporter.split_note('A\r\n---\r\nB\r\n---\r\n概述'), ('A\n---\nB', '概述'))

    def test_code_and_frontmatter_are_not_summaries(self):
        text = '---\ntitle: A\n---\n正文\n```md\n---\n```\n~~~\n---\n~~~'
        self.assertEqual(exporter.split_note(text), (text, ''))

    def test_missing_or_empty_summary(self):
        for text in ('正文', '正文\n---\n'):
            self.assertEqual(exporter.split_note(text), (text.strip(), ''))

    def test_recursive_pairing_exclusions_and_resync(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'source'
            output = Path(temp) / 'output'
            branch = source / 'post-train' / '中文 & editing'
            branch.mkdir(parents=True)
            (source / 'empty').mkdir()
            (source / 'tmp').mkdir()
            (source / 'tmp' / 'figure.pdf').write_bytes(b'pdf')
            (source / 'AGENTS.md').write_text('instructions', encoding='utf-8')
            (source / '.hidden.md').write_text('hidden', encoding='utf-8')
            (branch / 'Paper++.PDF').write_bytes(b'pdf')
            note = branch / 'Paper++.md'
            note.write_text('\ufeff正文\n---\n概述', encoding='utf-8')
            (source / 'Root.pdf').write_bytes(b'pdf')
            (source / 'Note only.md').write_text('note', encoding='utf-8')
            result = exporter.export_tree(source, output)
            self.assertEqual((result['tree']['count'], result['tree']['annotated']), (3, 2))
            paper = next(p for p in result['papers'] if p['title'] == 'Paper++')
            self.assertEqual(paper['category'], 'post-train/中文 & editing')
            self.assertTrue(paper['hasPdf'] and paper['hasNote'] and paper['hasSummary'])
            note_path = output / 'notes' / (paper['id'] + '.json')
            self.assertEqual(json.loads(note_path.read_text(encoding='utf-8')), {'detail': '正文', 'summary': '概述'})
            self.assertFalse(list(output.rglob('*.pdf')))
            self.assertEqual(next(n for n in result['tree']['children'] if n['name'] == 'empty')['count'], 0)
            self.assertNotIn(str(source), json.dumps(result))
            self.assertEqual(exporter.export_tree(source, output), result)
            unrelated = output / 'notes' / 'manual.json'
            unrelated.write_text('{}', encoding='utf-8')
            note.unlink()
            updated = exporter.export_tree(source, output)
            self.assertFalse(note_path.exists())
            self.assertTrue(unrelated.exists())
            self.assertEqual(next(p['id'] for p in updated['papers'] if p['title'] == 'Paper++'), paper['id'])


if __name__ == '__main__':
    unittest.main()
