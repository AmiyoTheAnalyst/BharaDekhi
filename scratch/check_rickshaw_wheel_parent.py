import json, struct

with open('assets/models/cycle-rickshaw.glb', 'rb') as f:
    magic, ver, length = struct.unpack('<4sII', f.read(12))
    chunk_len, chunk_type = struct.unpack('<II', f.read(8))
    gltf = json.loads(f.read(chunk_len))

for i, n in enumerate(gltf.get('nodes', [])):
    if 'wheel' in n.get('name', '').lower():
        print(f"Node {i}: {n.get('name')}, translation={n.get('translation')}, rotation={n.get('rotation')}, parent={n.get('parent')}")
