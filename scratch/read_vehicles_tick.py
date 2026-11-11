with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(19150, min(len(lines), 19280)):
    print(f'{i+1}: {lines[i]}', end='')
