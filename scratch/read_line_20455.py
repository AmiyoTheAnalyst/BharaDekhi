with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(20440, 20475):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
