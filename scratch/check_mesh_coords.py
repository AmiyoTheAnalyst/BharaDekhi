import struct, json

with open("assets/models/dhaka-bus.glb", "rb") as f:
    f.seek(12)
    cl, ct = struct.unpack("<II", f.read(8))
    data = json.loads(f.read(cl).decode("utf-8"))
    f.seek(20 + cl)
    m2, t2 = struct.unpack("<II", f.read(8))
    bin_data = f.read(m2)

# Find Wheel_FL_Tire mesh
mesh_idx = None
for n in data["nodes"]:
    if n.get("name") == "Wheel_FL_Tire":
        mesh_idx = n["mesh"]
        break

mesh = data["meshes"][mesh_idx]
pos_acc_idx = mesh["primitives"][0]["attributes"]["POSITION"]
acc = data["accessors"][pos_acc_idx]
bv = data["bufferViews"][acc["bufferView"]]
offset = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
count = acc["count"]

coords = []
for i in range(min(count, 30)):
    x, y, z = struct.unpack_from("<fff", bin_data, offset + i * 12)
    coords.append((x, y, z))

print(f"Wheel_FL_Tire has {count} vertices.")
print("Min:", acc.get("min"))
print("Max:", acc.get("max"))
print("First 10 vertices:")
for c in coords[:10]:
    print(f"  x={c[0]:.4f}, y={c[1]:.4f}, z={c[2]:.4f}")
