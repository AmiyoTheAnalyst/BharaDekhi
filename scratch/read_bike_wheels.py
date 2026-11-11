with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'createhollowalloywheel' in line.lower() or ('wheel' in line.lower() and i > 2775 and i < 3300):
        print(f'{i+1}: {lines[i].strip()[:100]}')
