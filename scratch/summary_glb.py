import bpy
import os
from mathutils import Vector

root = r"assets/models"
for glb in ["sportbike-rider.glb", "cycle-rickshaw.glb", "cng-autorickshaw.glb", "dhaka-bus.glb", "private-car.glb", "dhaka-metro.glb", "pedestrians.glb"]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = os.path.join(root, glb)
    if not os.path.exists(path):
        continue
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')
    min_z, max_z = float('inf'), float('-inf')
    for o in objs:
        for c in o.bound_box:
            wc = o.matrix_world @ Vector(c)
            min_x, max_x = min(min_x, wc.x), max(max_x, wc.x)
            min_y, max_y = min(min_y, wc.y), max(max_x, wc.y)
            min_z, max_z = min(min_z, wc.z), max(max_z, wc.z)
    print(f"SUMMARY: {glb} | Meshes: {len(objs)} | X: [{min_x:.2f}, {max_x:.2f}] (len={max_x-min_x:.2f}) | Y: [{min_y:.2f}, {max_y:.2f}] (wid={max_y-min_y:.2f}) | Z: [{min_z:.2f}, {max_z:.2f}] (hgt={max_z-min_z:.2f})")
