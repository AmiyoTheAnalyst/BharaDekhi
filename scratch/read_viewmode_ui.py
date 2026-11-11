with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(18155, 18185):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
