from pathlib import Path
import re

root = Path(__file__).resolve().parents[3]
path = root / 'basin-like loss landscape.md'
text = path.read_text(encoding='utf-8')
math = list(re.finditer(r'\$\$(.*?)\$\$|(?<!\$)\$([^\n$]+)\$(?!\$)', text, re.S))
display = [m.group(1) for m in math if m.group(1) is not None]
inline = [m.group(2) for m in math if m.group(2) is not None]
rest = re.sub(r'\$\$(.*?)\$\$|(?<!\$)\$([^\n$]+)\$(?!\$)', '', text, flags=re.S)
assert '$' not in rest, 'Unmatched math delimiter'
assert text.count(r'\left') == text.count(r'\right')
assert text.count('{') == text.count('}')
assert '\ufffd' not in text
assert not re.search(r'\\(?:sum|int)(?!\\limits)\b', text)
print('Display formulas:', len(display))
print('Inline formulas:', len(inline))
print('Proof endings:', text.count(r'\square'))
print('English/math Chinese full stops:', [(text.count('\n', 0, m.start())+1, m.group()) for m in re.finditer(r'[A-Za-z$]。', text)])
print('Required numbered items:', re.findall(r'^## (?:Definition|Theorem|Lemma|Proposition) .+$', text, re.M))

out = Path(__file__).resolve().parent
tex = [r'\documentclass{ctexart}', r'\usepackage{amsmath,amssymb}',
       r'\usepackage[paperwidth=600mm,paperheight=600mm,margin=20mm]{geometry}',
       r'\begin{document}']
for index, match in enumerate(math, 1):
    source_line = text.count('\n', 0, match.start()) + 1
    tex.append(f'Formula {index}, source line {source_line}.')
    tex.append(r'\[' + (match.group(1) if match.group(1) is not None else match.group(2)) + r'\]')
tex.append(r'\end{document}')
(out / 'math-check.tex').write_text('\n'.join(tex), encoding='utf-8')
