import json, struct

with open('assets/models/cycle-rickshaw.glb', 'rb') as f:
    magic, ver, length = struct.unpack('<4sII', f.read(12))
    chunk_len, chunk_type = struct.unpack('<II', f.read(8))
    gltf = json.loads(f.read(chunk_len))

for node in gltf.get('nodes', []):
    name = node.get('name', '')
    if 'mudguard' in name.lower():
        print(name)
