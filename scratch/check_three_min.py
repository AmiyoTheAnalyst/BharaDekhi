with open('assets/three.min.js', 'r', encoding='utf-8') as f:
    text = f.read()

print('GLTFLoader in three.min.js?', 'GLTFLoader' in text)
print('DRACOLoader in three.min.js?', 'DRACOLoader' in text)
