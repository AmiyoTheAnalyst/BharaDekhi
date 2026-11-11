with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(4815, min(len(lines), 4875)):
    print(f'{i+1}: {lines[i]}', end='')
