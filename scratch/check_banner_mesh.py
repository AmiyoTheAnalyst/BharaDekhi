import struct, json

with open("assets/models/dhaka-bus.glb", "rb") as f:
    f.seek(12)
    cl, ct = struct.unpack("<II", f.read(8))
    data = json.loads(f.read(cl).decode("utf-8"))

for m in data["meshes"]:
    if m.get("name") and "banner" in m.get("name").lower():
        print(m.get("name"), "primitives count:", len(m["primitives"]))
