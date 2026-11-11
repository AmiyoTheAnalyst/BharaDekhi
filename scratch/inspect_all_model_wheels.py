import struct, json

models = [
    'assets/models/dhaka-bus.glb',
    'assets/models/sportbike-rider.glb',
    'assets/models/cycle-rickshaw.glb',
    'assets/models/cng-autorickshaw.glb',
    'assets/models/private-car.glb'
]

for path in models:
    print(f"\n=== Model: {path} ===")
    with open(path, 'rb') as f:
        f.seek(12)
        cl, ct = struct.unpack('<II', f.read(8))
        data = json.loads(f.read(cl).decode('utf-8'))
    
    wheel_nodes = []
    for i, n in enumerate(data.get('nodes', [])):
        name = n.get('name', '')
        if 'wheel' in name.lower():
            wheel_nodes.append((i, name, n.get('translation'), n.get('rotation'), n.get('children'), n.get('mesh')))
    print(f"Found {len(wheel_nodes)} wheel nodes:")
    for w in wheel_nodes:
        print(f"  Node {w[0]}: {w[1]}, trans={w[2]}, rot={w[3]}, has_children={bool(w[4])}, has_mesh={w[5] is not None}")
