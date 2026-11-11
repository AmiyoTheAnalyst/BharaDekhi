with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'pointerdown' in line or 'mousedown' in line or 'touchstart' in line:
        print(f'{i+1}: {line.strip()}')
