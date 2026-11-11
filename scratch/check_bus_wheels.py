import json
import struct

with open('assets/models/dhaka-bus.glb', 'rb') as f:
    data = f.read()

chunk_len, chunk_type = struct.unpack_from('<II', data, 12)
json_data = json.loads(data[20:20+chunk_len].decode('utf-8'))

for i, node in enumerate(json_data.get('nodes', [])):
    name = node.get('name', '')
    if 'wheel' in name.lower():
        print(f"Node {i}: {name}")
        print("  children:", node.get('children'))
        print("  rotation:", node.get('rotation'))
        print("  translation:", node.get('translation'))
