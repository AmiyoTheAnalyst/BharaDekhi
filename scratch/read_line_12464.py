with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(12450, 12485):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
