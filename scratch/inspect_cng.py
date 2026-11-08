import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"assets/models/cng-autorickshaw.glb")

print(f"Total objects in cng-autorickshaw.glb: {len(bpy.context.scene.objects)}")
for obj in bpy.context.scene.objects:
    mat_names = [m.name for m in obj.data.materials] if hasattr(obj.data, 'materials') else []
    print(f"OBJ: '{obj.name}' type={obj.type} parent={obj.parent.name if obj.parent else None} loc={list(obj.location)} mats={mat_names}")
