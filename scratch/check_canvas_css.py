with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'dhakaCrossroads3dCanvas' in line or 'dhakaCrossroadsStageWrapper' in line or 'is-3d-drone-mode' in line:
        print(f'{i+1}: {line.strip()}')
