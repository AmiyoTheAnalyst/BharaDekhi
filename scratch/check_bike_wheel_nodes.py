import struct, json

with open("assets/models/sportbike-rider.glb", "rb") as f:
    f.seek(12)
    cl, ct = struct.unpack("<II", f.read(8))
    data = json.loads(f.read(cl).decode("utf-8"))

nodes = data["nodes"]
for i in [99, 111]:
    n = nodes[i]
    print(f"Node {i} ({n.get('name')}): trans={n.get('translation')}, rot={n.get('rotation')}, children={n.get('children')}")
