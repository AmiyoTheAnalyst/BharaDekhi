with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function createArticulatedHuman' in line:
        print(f'{i+1}: {line}')
        for j in range(i, min(i+50, len(lines))):
            print(f'{j+1}: {lines[j]}', end='')
        break
