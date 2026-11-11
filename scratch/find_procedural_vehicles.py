with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "type === 'rickshaw'" in line or "type === 'bus'" in line or "type === 'cng'" in line:
        print(f'{i+1}: {line.strip()}')
