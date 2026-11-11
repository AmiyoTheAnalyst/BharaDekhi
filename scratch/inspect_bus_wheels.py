import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='assets/models/dhaka-bus.glb')
print("=== BUS WHEELS ===")
for o in bpy.data.objects:
    if 'wheel' in o.name.lower():
        print(f"  {o.name}: loc={tuple(round(v, 3) for v in o.location)}, dim={tuple(round(v, 3) for v in o.dimensions)}")
