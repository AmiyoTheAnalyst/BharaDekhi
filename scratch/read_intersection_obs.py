with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(19745, 19785):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
