with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(2774, 4220):
    if 'seed' in lines[i]:
        print(f'{i+1}: {lines[i].strip()}')
