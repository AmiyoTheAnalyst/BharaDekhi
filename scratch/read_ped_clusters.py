with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(6368, min(len(lines), 6420)):
    print(f'{i+1}: {lines[i]}', end='')
