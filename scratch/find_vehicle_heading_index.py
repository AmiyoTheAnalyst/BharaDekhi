with open('index.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'vehicle' in line.lower() and ('heading' in line.lower() or 'angle' in line.lower() or 'turn' in line.lower() or 'lane' in line.lower() and 'current' in line.lower()):
            print(f'{i+1}: {line.strip()[:100]}')
