from pathlib import Path
import sys

root = Path('.').resolve()
skip_dirs = {'node_modules', '.git'}
extensions = {'.js', '.cjs', '.mjs', '.ts', '.jsx', '.tsx', '.json', '.txt', '.md', '.env', '.yaml', '.yml'}
files = []
for path in root.rglob('*'):
    if path.is_dir():
        continue
    if any(part in skip_dirs for part in path.parts):
        continue
    if path.suffix.lower() not in extensions:
        continue
    files.append(path)

changed = []
for path in files:
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        continue
    out = []
    i = 0
    n = len(text)
    state = 'code'
    quote = None
    escaped = False
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ''
        if state == 'line_comment':
            if ch == '\n':
                out.append(ch)
                state = 'code'
            elif ch == '\r':
                out.append(ch)
                state = 'code'
            i += 1
            continue
        if state == 'block_comment':
            if ch == '*' and nxt == '/':
                state = 'code'
                i += 2
                continue
            if ch == '\n':
                out.append(ch)
            elif ch == '\r':
                out.append(ch)
            i += 1
            continue
        if quote is not None:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch in {'"', "'", '`'}:
            quote = ch
            out.append(ch)
            i += 1
            continue
        if ch == '/' and nxt == '/':
            state = 'line_comment'
            i += 2
            continue
        if ch == '/' and nxt == '*':
            state = 'block_comment'
            i += 2
            continue
        out.append(ch)
        i += 1
    new_text = ''.join(out)
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        changed.append(str(path.relative_to(root)))

print(f'Arquivos alterados: {len(changed)}')
for item in changed:
    print(item)
