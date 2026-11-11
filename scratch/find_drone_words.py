with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'drone' in line.lower() and ('view' in line.lower() or 'legend' in line.lower() or 'transit' in line.lower()):
        print(f'{i+1}: {line.strip()}')
