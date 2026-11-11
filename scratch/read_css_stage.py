with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(750, 810):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
