import bpy

bpy.ops.import_scene.gltf(filepath="assets/models/sportbike-rider.glb")
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
min_x = min(o.matrix_world @ v.co for o in objs for v in o.data.vertices)
# Just compute bbox
import mathutils
bbox_corners = [o.matrix_world @ mathutils.Vector(corner) for o in objs for corner in o.bound_box]
min_c = [min(c[i] for c in bbox_corners) for i in range(3)]
max_c = [max(c[i] for c in bbox_corners) for i in range(3)]
size = [max_c[i] - min_c[i] for i in range(3)]
print("GLB_BBOX_MIN:", min_c)
print("GLB_BBOX_MAX:", max_c)
print("GLB_BBOX_SIZE:", size)
