with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "type === 'cng'" in l or 'createRealisticDhakaCNG' in l:
        print(f"Line {i+1}: {l.strip()}")
        for k in range(max(0, i-2), min(len(lines), i+15)):
            print(f"  {k+1}: {lines[k].rstrip()}")
        print('-'*50)
