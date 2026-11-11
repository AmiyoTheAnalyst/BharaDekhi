with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(5450, 5493):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
