with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('--- Function start ---')
for i in range(19060, 19080):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')

print('\n--- Call to updateDhakaCrossroads3D ---')
for i in range(19630, 19650):
    if i < len(lines):
        print(f'{i+1}: {lines[i]}', end='')
