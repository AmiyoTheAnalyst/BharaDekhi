import json
from mathutils import Vector, Quaternion

with open('assets/models/dhaka-bus.glb', 'rb') as f:
    f.read(12)
    chunk_len = int.from_bytes(f.read(4), 'little')
    f.read(4)
    gltf = json.loads(f.read(chunk_len))

# Let's inspect Wheel_FL and its children
nodes = gltf['nodes']
for i, n in enumerate(nodes):
    if n.get('name') == 'Wheel_FL':
        print('Wheel_FL:', n)
        for child_idx in n.get('children', []):
            child = nodes[child_idx]
            print('  child:', child.get('name'), 'rot:', child.get('rotation'), 'trans:', child.get('translation'))
