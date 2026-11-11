with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'toggleCrossroadsViewMode' in line or 'View: 3D' in line or 'crossroadsViewModeBtn' in line:
        print(f'{i+1}: {line.strip()}')
