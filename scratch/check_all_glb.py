import bpy
import glob
import os

for f in glob.glob("assets/models/*.glb"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f)
    for o in bpy.data.objects:
        if o.name == 'Cube' or (o.type == 'MESH' and [round(s, 2) for s in o.dimensions] == [2.0, 2.0, 2.0]):
            print(f"FILE {f} HAS UNWANTED DEFAULT CUBE: {o.name}, dimensions={o.dimensions}")
