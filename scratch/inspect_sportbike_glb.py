import struct, json

with open("assets/models/sportbike-rider.glb", "rb") as f:
    f.seek(12)
    cl, ct = struct.unpack("<II", f.read(8))
    data = json.loads(f.read(cl).decode("utf-8"))

print("Nodes in sportbike-rider.glb:")
for i, n in enumerate(data.get("nodes", [])):
    print(f"  {i}: {n.get('name')}")
print("Materials in sportbike-rider.glb:")
for i, m in enumerate(data.get("materials", [])):
    print(f"  {i}: {m.get('name')}")
