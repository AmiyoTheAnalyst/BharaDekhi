import json, struct

with open('assets/models/cycle-rickshaw.glb', 'rb') as f:
    magic, ver, length = struct.unpack('<4sII', f.read(12))
    chunk_len, chunk_type = struct.unpack('<II', f.read(8))
    gltf = json.loads(f.read(chunk_len))

node = gltf['nodes'][155]
mesh_idx = node['mesh']
mesh = gltf['meshes'][mesh_idx]
print("Mesh name:", mesh.get('name'))
for prim in mesh['primitives']:
    pos_idx = prim['attributes']['POSITION']
    acc = gltf['accessors'][pos_idx]
    print("Pos min:", acc['min'], "max:", acc['max'])
