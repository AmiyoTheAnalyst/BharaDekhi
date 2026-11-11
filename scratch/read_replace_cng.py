with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function replaceCNGWithModel' in line:
        print(f'{i+1}: {line.strip()[:100]}')
        for j in range(i, min(len(lines), i + 60)):
            print(f'{j+1}: {lines[j].strip()[:100]}')
        break
