import json
import struct

with open('assets/models/cng-autorickshaw.glb', 'rb') as f:
    data = f.read()

magic, version, length = struct.unpack_from('<4sII', data, 0)
chunk_len, chunk_type = struct.unpack_from('<II', data, 12)
json_data = json.loads(data[20:20+chunk_len].decode('utf-8'))

nodes = json_data.get('nodes', [])
print(f"Total nodes in cng-autorickshaw.glb: {len(nodes)}")
for i, n in enumerate(nodes):
    name = n.get('name', '')
    print(f"  [{i}] {name}")
