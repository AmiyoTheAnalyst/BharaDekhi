with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'crossroadsVehiclesData' in line or 'crossroadsPedestriansData' in line:
        print(f'{i+1}: {line.strip()}')
