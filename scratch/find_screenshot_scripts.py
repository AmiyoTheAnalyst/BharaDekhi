import glob

for f in glob.glob('scratch/*.py'):
    with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
        text = fp.read()
        if 'screenshot' in text:
            print(f)
