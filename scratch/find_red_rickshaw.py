with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(4674, 5200):
    line = lines[i]
    if 'red' in line.lower() or '0xff' in line.lower() or '0xee' in line.lower() or '0xdc' in line.lower() or 'front' in line.lower():
        if 'mesh' in line.lower() or 'box' in line.lower() or 'cylinder' in line.lower():
            print(f'{i+1}: {line.strip()[:100]}')
