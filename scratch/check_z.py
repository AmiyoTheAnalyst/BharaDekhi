import bpy
import mathutils

bpy.ops.import_scene.gltf(filepath="assets/models/sportbike-rider.glb")
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        bbox_corners = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        min_z = min(c.z for c in bbox_corners)
        max_z = max(c.z for c in bbox_corners)
        if min_z < -0.01:
            print(f"Object {o.name} has min_z={min_z:.2f}")
