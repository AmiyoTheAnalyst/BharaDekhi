import bpy
import os
import math

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(REPO_ROOT, "assets", "models")
SCRATCH_DIR = os.path.join(REPO_ROOT, "scratch")
os.makedirs(SCRATCH_DIR, exist_ok=True)

def setup_camera_and_lights(cam_loc, cam_target, res_x=1280, res_y=720):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.film_transparent = False

    # Camera
    cam_data = bpy.data.cameras.new("StudioCam")
    cam_data.lens = 45
    cam_obj = bpy.data.objects.new("StudioCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    cam_obj.location = cam_loc

    # Track target
    target_empty = bpy.data.objects.new("CamTarget", None)
    target_empty.location = cam_target
    bpy.context.collection.objects.link(target_empty)

    tt = cam_obj.constraints.new(type='TRACK_TO')
    tt.target = target_empty
    tt.track_axis = 'TRACK_NEGATIVE_Z'
    tt.up_axis = 'UP_Y'
    scene.camera = cam_obj

    # Studio Floor
    bpy.ops.mesh.primitive_plane_add(size=80.0, location=(0, 0, 0))
    floor = bpy.context.active_object
    mat_floor = bpy.data.materials.new("Studio_Floor")
    mat_floor.use_nodes = True
    bsdf = mat_floor.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.05, 0.05, 0.07, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.35
        bsdf.inputs["Metallic"].default_value = 0.2
    floor.data.materials.append(mat_floor)

    # Key Light
    key_light = bpy.data.lights.new("KeyLight", type='AREA')
    key_light.energy = 800.0
    key_light.size = 10.0
    key_obj = bpy.data.objects.new("KeyLight", key_light)
    key_obj.location = (cam_loc[0] + 5, cam_loc[1] - 8, cam_loc[2] + 6)
    bpy.context.collection.objects.link(key_obj)

    # Rim / Fill Light
    fill_light = bpy.data.lights.new("FillLight", type='AREA')
    fill_light.energy = 450.0
    fill_light.size = 12.0
    fill_obj = bpy.data.objects.new("FillLight", fill_light)
    fill_obj.location = (cam_loc[0] - 10, cam_loc[1] + 12, cam_loc[2] + 4)
    bpy.context.collection.objects.link(fill_obj)

    # Warm street neon fill
    neon_light = bpy.data.lights.new("NeonLight", type='POINT')
    neon_light.energy = 300.0
    neon_light.color = (0.2, 0.6, 1.0)
    neon_obj = bpy.data.objects.new("NeonLight", neon_light)
    neon_obj.location = (cam_target[0], cam_target[1] - 4, cam_target[2] + 2)
    bpy.context.collection.objects.link(neon_obj)

# ==============================================================================
# 1. RENDER BUS HERO SHOWCASE (Dual Wheels & VIP Typography)
# ==============================================================================
bpy.ops.wm.read_factory_settings(use_empty=True)
bus_glb = os.path.join(MODELS_DIR, "dhaka-bus.glb")
bpy.ops.import_scene.gltf(filepath=bus_glb)

setup_camera_and_lights(cam_loc=(10.5, -9.5, 4.8), cam_target=(0.5, 0.0, 1.6), res_x=1280, res_y=720)

bus_out = os.path.join(SCRATCH_DIR, "render_bus_hero.png")
bpy.context.scene.render.filepath = bus_out
bpy.ops.render.render(write_still=True)
print(f"SUCCESS: Rendered Bus Hero Showcase to {bus_out}")

# ==============================================================================
# 2. RENDER ALL 4 CARS LINEUP
# ==============================================================================
bpy.ops.wm.read_factory_settings(use_empty=True)

car_files = [
    ("car-sedan.glb", (0.0, 4.5, 0.0)),
    ("car-muscle.glb", (0.0, 1.5, 0.0)),
    ("car-delorean.glb", (0.0, -1.5, 0.0)),
    ("car-hypercar.glb", (0.0, -4.5, 0.0))
]

for filename, offset in car_files:
    glb_path = os.path.join(MODELS_DIR, filename)
    # Import
    bpy.ops.import_scene.gltf(filepath=glb_path)
    # The imported objects are selected, move them
    for obj in bpy.context.selected_objects:
        if obj.parent is None:
            obj.location = (obj.location[0] + offset[0], obj.location[1] + offset[1], obj.location[2] + offset[2])

setup_camera_and_lights(cam_loc=(7.8, -1.0, 4.2), cam_target=(0.0, 0.0, 0.8), res_x=1280, res_y=720)

cars_out = os.path.join(SCRATCH_DIR, "render_all_cars.png")
bpy.context.scene.render.filepath = cars_out
bpy.ops.render.render(write_still=True)
print(f"SUCCESS: Rendered All 4 Cars Lineup to {cars_out}")
