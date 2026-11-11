import glob

for fpath in glob.glob('**/*.js', recursive=True) + glob.glob('**/*.html', recursive=True):
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        for i, line in enumerate(f):
            if 'gltfloader' in line.lower():
                print(f'{fpath}:{i+1}: {line.strip()[:100]}')
