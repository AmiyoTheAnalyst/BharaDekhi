with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'biker head' in line.lower() or 'rider' in line.lower() and 'group' in line.lower() and i > 2775 and i < 4250:
        print(f'{i+1}: {line.strip()[:100]}')
