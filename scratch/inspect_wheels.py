import bpy

paths = [
    'assets/models/dhaka-bus.glb',
    'assets/models/cng-autorickshaw.glb',
    'assets/models/cycle-rickshaw.glb'
]

for p in paths:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=p)
    print(f"RESULTS_FOR: {p}")
    for o in bpy.data.objects:
        if 'wheel' in o.name.lower() or 'crank' in o.name.lower():
            print(f"  {o.name}: loc={tuple(round(v, 3) for v in o.location)}, dim={tuple(round(v, 3) for v in o.dimensions)}, parent={o.parent.name if o.parent else 'None'}")
