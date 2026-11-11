with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'window.' in line:
            print(f'{i+1}: {line.strip()[:100]}')
