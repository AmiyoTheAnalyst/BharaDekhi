with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function updateRoute' in line:
        print(f'{i+1}: {line.strip()}')
        for j in range(i, min(i+35, len(lines))):
            print(f'{j+1}: {lines[j]}', end='')
        break
