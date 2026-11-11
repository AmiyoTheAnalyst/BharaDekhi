with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(2950, 3050):
    if i < len(lines):
        if 'createRealisticGTABike' in lines[i]:
            print(f'{i+1}: {lines[i]}')
            for j in range(i, min(i+30, len(lines))):
                print(f'{j+1}: {lines[j]}', end='')
            break
