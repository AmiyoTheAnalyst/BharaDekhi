import bpy
import sys

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="assets/models/sportbike-rider.glb")
print("=== OBJECTS IN GLB ===")
for obj in bpy.context.scene.objects:
    print(f"{obj.name} | {obj.type} | {obj.dimensions}")
print("=== MATERIALS ===")
for mat in bpy.data.materials:
    print(mat.name)
