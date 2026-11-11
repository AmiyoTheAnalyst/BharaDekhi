with open('sw.js', 'r', encoding='utf-8') as f:
    text = f.read()

for line in text.splitlines()[:60]:
    if 'gltf' in line.lower() or 'three' in line.lower() or 'cdn' in line.lower() or 'cache' in line.lower():
        print(line[:100])
