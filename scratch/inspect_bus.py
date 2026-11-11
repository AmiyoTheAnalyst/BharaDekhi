import struct, json

with open("assets/models/dhaka-bus.glb", "rb") as f:
    f.seek(12)
    cl, ct = struct.unpack("<II", f.read(8))
    data = json.loads(f.read(cl).decode("utf-8"))

nodes = data.get("nodes", [])
for i, n in enumerate(nodes):
    name = n.get("name", "")
    if "wheel" in name.lower():
        print(f"Node {i:3d}: {name}")
        print(f"   trans: {n.get('translation')}")
        print(f"   rot:   {n.get('rotation')}")
        print(f"   scale: {n.get('scale')}")
        print(f"   mesh:  {n.get('mesh')}")
        print(f"   children: {n.get('children')}")
