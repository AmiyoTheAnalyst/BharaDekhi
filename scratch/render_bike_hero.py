import bpy
import math
import os

repo_root = r"c:\Users\HP\Desktop\commute-dhaka-web"
glb_path = os.path.join(repo_root, "assets", "models", "sportbike-rider.glb")
output_png = os.path.join(repo_root, "scratch", "render_bike_hero.png")

# Clean scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Import GLB
bpy.ops.import_scene.gltf(filepath=glb_path)

# Floor
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
floor = bpy.context.active_object
mat_floor = bpy.data.materials.new(name="Floor_Mat")
mat_floor.use_nodes = True
bsdf = mat_floor.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.08, 0.08, 0.09, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.55
floor.data.materials.append(mat_floor)

# Target empty at center of rider/bike
target = bpy.data.objects.new("CamTarget", None)
target.location = (0.05, 0.0, 0.70)
bpy.context.collection.objects.link(target)

# Camera
cam_data = bpy.data.cameras.new("HeroCamera")
cam_data.lens = 45
cam_obj = bpy.data.objects.new("HeroCamera", cam_data)
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Position camera back and high enough to frame from helmet top (Z=1.35) to ground (Z=0)
cam_obj.location = (3.4, -3.2, 1.6)

# Track To constraint
track = cam_obj.constraints.new(type='TRACK_TO')
track.target = target
track.track_axis = 'TRACK_NEGATIVE_Z'
track.up_axis = 'UP_Y'

# Lighting: Key, Fill, Rim
key_data = bpy.data.lights.new("KeyLight", type='AREA')
key_data.energy = 600
key_data.size = 3.0
key_obj = bpy.data.objects.new("KeyLight", key_data)
key_obj.location = (3.5, -3.5, 3.5)
key_obj.rotation_euler = (math.radians(45), 0, math.radians(45))
bpy.context.collection.objects.link(key_obj)

rim_data = bpy.data.lights.new("RimLight", type='AREA')
rim_data.energy = 400
rim_data.size = 2.5
rim_obj = bpy.data.objects.new("RimLight", rim_data)
rim_obj.location = (-3.0, 3.0, 2.5)
rim_obj.rotation_euler = (math.radians(135), 0, math.radians(-135))
bpy.context.collection.objects.link(rim_obj)

fill_data = bpy.data.lights.new("FillLight", type='SUN')
fill_data.energy = 2.2
fill_obj = bpy.data.objects.new("FillLight", fill_data)
fill_obj.rotation_euler = (math.radians(55), math.radians(20), math.radians(-35))
bpy.context.collection.objects.link(fill_obj)

# Render Settings
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.filepath = output_png

bpy.ops.render.render(write_still=True)
print(f"Render saved to {output_png}")
