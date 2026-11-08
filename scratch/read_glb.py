import json
import struct

def parse_glb(path):
    with open(path, 'rb') as f:
        magic, version, length = struct.unpack('<4sII', f.read(12))
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        json_bytes = f.read(chunk_len)
        data = json.loads(json_bytes.decode('utf-8'))
        return data

d = parse_glb('assets/models/sportbike-rider.glb')
print("Nodes:", len(d.get('nodes', [])))
for n in d.get('nodes', []):
    if 'name' in n:
        print("Node:", n['name'])

