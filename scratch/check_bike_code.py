with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function createRealisticGTABike' in line:
        print(f'{i+1}: {line.strip()[:100]}')
        for j in range(i, min(len(lines), i + 100)):
            if 'helmet' in lines[j].lower() or 'face' in lines[j].lower() or 'outfit' in lines[j].lower() or 'archetype' in lines[j].lower():
                print(f'{j+1}: {lines[j].strip()[:100]}')
        break
