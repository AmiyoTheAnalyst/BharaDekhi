import struct, json

with open("assets/models/dhaka-bus.glb", "rb") as f:
    f.seek(12)
    cl, ct = struct.unpack("<II", f.read(8))
    data = json.loads(f.read(cl).decode("utf-8"))

nodes = data["nodes"]
materials = data["materials"]
meshes = data["meshes"]

for i, n in enumerate(nodes):
    name = n.get("name", "")
    if "wheel_r" in name.lower():
        m_idx = n.get("mesh")
        mat_names = []
        if m_idx is not None:
            mesh = meshes[m_idx]
            for p in mesh["primitives"]:
                mat_idx = p.get("material")
                if mat_idx is not None:
                    mat_names.append(materials[mat_idx].get("name"))
        print(f"{name}: trans={n.get('translation')}, mesh={m_idx}, mats={mat_names}")
