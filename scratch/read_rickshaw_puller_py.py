with open('assets/models/create_cycle_rickshaw.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(410, min(len(lines), 460)):
    print(f'{i+1}: {lines[i]}', end='')
