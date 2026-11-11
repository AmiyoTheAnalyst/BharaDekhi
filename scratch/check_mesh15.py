import struct, json

with open("assets/models/dhaka-bus.glb", "rb") as f:
    f.seek(12)
    cl, ct = struct.unpack("<II", f.read(8))
    data = json.loads(f.read(cl).decode("utf-8"))

m15 = data["meshes"][15]
pos_idx = m15["primitives"][0]["attributes"]["POSITION"]
acc = data["accessors"][pos_idx]
print("Mesh 15 accessor:", acc)
