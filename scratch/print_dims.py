import bpy
import os
from mathutils import Vector

root = r"assets/models"
for glb in ["sportbike-rider.glb", "cycle-rickshaw.glb", "cng-autorickshaw.glb", "dhaka-bus.glb", "private-car.glb", "dhaka-metro.glb"]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = os.path.join(root, glb)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')
    min_z, max_z = float('inf'), float('-inf')
    for o in objs:
        for c in o.bound_box:
            wc = o.matrix_world @ Vector(c)
            min_x, max_x = min(min_x, wc.x), max(max_x, wc.x)
            min_y, max_y = min(min_y, wc.y), max(max_y, wc.y)
            min_z, max_z = min(min_z, wc.z), max(max_z, wc.z)
    print(f"RES: {glb:20s} | X: {max_x-min_x:6.2f} [{min_x:5.2f}..{max_x:5.2f}] | Y: {max_y-min_y:6.2f} [{min_y:5.2f}..{max_y:5.2f}] | Z: {max_z-min_z:6.2f} [{min_z:5.2f}..{max_z:5.2f}]")
