from pathlib import Path
import re

root = Path(__file__).resolve().parents[3]
p = root / 'basin-like loss landscape.md'
s = p.read_text(encoding='utf-8')
chars = []
i = 0
while i < len(s) - 1:
    if re.fullmatch(r'[A-Za-z$]', s[i]):
        assert s[i+1] == '.', (i, repr(s[i:i+20]))
        chars.append(s[i])
    else:
        assert s[i] == '.', (i, repr(s[i:i+20]))
        chars.append(s[i+1])
    i += 2
assert i == len(s)-1 and s[i] == '.'
restored = ''.join(chars)
assert re.sub(r'([A-Za-z$])?', r'\1.', restored) == s
assert len(restored) == 31639, len(restored)
assert restored.count(r'\square') == 11
assert len(re.findall(r'^## ',restored,re.M)) == 9
restored = re.sub(r'([A-Za-z$])\u3002', r'\1.', restored)
p.write_text(restored, encoding='utf-8')
print('Restored exact original content and corrected 16 punctuation matches.')
