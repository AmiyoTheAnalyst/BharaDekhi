with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(18975, 19045):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
