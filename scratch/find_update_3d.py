with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'updateDhakaCrossroads3D' in line:
        print(f'{i+1}: {line.strip()}')
