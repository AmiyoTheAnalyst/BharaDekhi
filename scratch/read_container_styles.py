with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '#dhakaCrossroadsContainer' in line and '{' in line:
        print(f'{i+1}: {line.strip()}')
        for j in range(i, min(i+15, len(lines))):
            print(f'{j+1}: {lines[j]}', end='')
        print('\n' + '='*40 + '\n')
