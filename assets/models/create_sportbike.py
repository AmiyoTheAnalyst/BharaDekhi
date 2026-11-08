import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "sportbike-rider.glb")

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.actions, bpy.data.armatures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

def create_material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=1.0, clearcoat=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color[:3], 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = clearcoat
        elif "Clearcoat" in bsdf.inputs:
            bsdf.inputs["Clearcoat"].default_value = clearcoat
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission[:3], 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def assign_material(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    return obj

def smooth_mesh(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True

def create_sphere(name, loc, radius, scale, mat, segs=16, rings=12, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth_mesh(obj)
    assign_material(obj, mat)
    if parent:
        obj.parent = parent
    return obj

def create_box(name, loc, dimensions, mat, bevel=0.0, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.001:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    smooth_mesh(obj)
    assign_material(obj, mat)
    if parent:
        obj.parent = parent
    return obj

def create_cylinder_between(name, p1, p2, radius, mat, verts=12, parent=None, radius2=None):
    p1_v = Vector(p1)
    p2_v = Vector(p2)
    dir_v = p2_v - p1_v
    length = dir_v.length
    if length < 1e-5:
        length = 1e-4
    mid = (p1_v + p2_v) * 0.5
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts,
        radius1=radius if radius2 is None else radius2,
        radius2=radius,
        depth=length,
        location=mid
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = dir_v.to_track_quat("Z", "Y")
    smooth_mesh(obj)
    assign_material(obj, mat)
    if parent:
        obj.parent = parent
    return obj

def create_alloy_wheel(name, center, radius, width, tire_mat, rim_mat, disc_mat, hub_mat):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = center
    
    # Outer sport tire with grooved tread
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.055,
        minor_radius=0.055,
        major_segments=36,
        minor_segments=10,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    tire = assign_material(bpy.context.object, tire_mat)
    tire.name = name + "_tire"
    tire.parent = pivot
    smooth_mesh(tire)
    
    # Cast alloy rim lip
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.08,
        minor_radius=0.018,
        major_segments=36,
        minor_segments=8,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    rim = assign_material(bpy.context.object, rim_mat)
    rim.name = name + "_rim"
    rim.parent = pivot
    smooth_mesh(rim)

    # 5-split Y-spoke cast alloy wheel
    spoke_count = 5
    for i in range(spoke_count):
        angle = (i / spoke_count) * math.tau
        sx = center[0] + (radius - 0.09) * math.cos(angle)
        sz = center[2] + (radius - 0.09) * math.sin(angle)
        spoke = create_cylinder_between(f"{name}_spoke_{i}", center, (sx, center[1], sz), 0.016, rim_mat, verts=6, parent=pivot)

    # Center Hub
    create_cylinder_between(f"{name}_hub", (center[0], center[1] - width * 0.5, center[2]), (center[0], center[1] + width * 0.5, center[2]), 0.045, hub_mat, verts=14, parent=pivot)

    # Drilled Disc Brake
    for side in [-0.038, 0.038]:
        create_cylinder_between(f"{name}_disc_{side}", (center[0], center[1] + side - 0.005, center[2]), (center[0], center[1] + side + 0.005, center[2]), radius * 0.65, disc_mat, verts=20, parent=pivot)
        
    return pivot

def build():
    clear_scene()

    # Materials
    # Premium Blue Fairing with Clearcoat (matches user's reference image!)
    m_body_blue = create_material("Fairing_Blue", (0.04, 0.35, 0.95), metallic=0.4, roughness=0.18, clearcoat=1.0)
    m_dark_metal = create_material("Chassis_DarkMetal", (0.08, 0.09, 0.10), metallic=0.85, roughness=0.35)
    m_gold_fork = create_material("Fork_GoldAnodized", (0.88, 0.68, 0.15), metallic=0.92, roughness=0.2)
    m_chrome = create_material("Exhaust_Chrome", (0.85, 0.88, 0.90), metallic=0.95, roughness=0.15)
    m_tire = create_material("Tire_Rubber", (0.025, 0.025, 0.03), metallic=0.0, roughness=0.88)
    m_rim_blue = create_material("Rim_BlueAlloy", (0.05, 0.25, 0.85), metallic=0.6, roughness=0.25)
    m_disc = create_material("Brake_DiscSteel", (0.65, 0.68, 0.70), metallic=0.9, roughness=0.3)
    m_seat_leather = create_material("Seat_BlackLeather", (0.06, 0.06, 0.07), metallic=0.05, roughness=0.7)
    m_windshield = create_material("Windshield_SmokeGlass", (0.05, 0.10, 0.15), metallic=0.2, roughness=0.1)
    
    # Lights
    m_headlight = create_material("Headlight_LED", (1.0, 1.0, 1.0), emission=(0.7, 0.9, 1.0), emission_strength=5.0)
    m_taillight = create_material("Taillight_LED", (0.9, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=4.0)

    # Rider Attire (matches user's reference: Orange hoodie, dark denim jeans, gray/white sneakers!)
    m_hoodie_orange = create_material("Rider_OrangeHoodie", (0.98, 0.38, 0.04), metallic=0.0, roughness=0.82)
    m_jeans_dark = create_material("Rider_DarkDenim", (0.08, 0.10, 0.14), metallic=0.0, roughness=0.85)
    m_sneaker_gray = create_material("Rider_SneakerUpper", (0.45, 0.46, 0.48), metallic=0.0, roughness=0.75)
    m_sneaker_white = create_material("Rider_SneakerSole", (0.92, 0.92, 0.90), metallic=0.0, roughness=0.5)
    m_skin = create_material("Rider_Skin", (0.50, 0.32, 0.20), metallic=0.0, roughness=0.75)
    
    # Helmet Materials (Sleek full-face helmet with dark glossy visor & white stripes!)
    m_helmet_shell = create_material("Helmet_BlueGloss", (0.04, 0.35, 0.95), metallic=0.4, roughness=0.15, clearcoat=1.0)
    m_helmet_visor = create_material("Helmet_VisorSmoke", (0.02, 0.03, 0.05), metallic=0.85, roughness=0.05)
    m_helmet_stripe = create_material("Helmet_WhiteDecal", (0.95, 0.95, 0.95), metallic=0.1, roughness=0.2)

    # -------------------------------------------------------------
    # 1. WHEELS (Named pivots for Three.js rotation)
    # -------------------------------------------------------------
    wheel_radius = 0.32
    wheel_width = 0.12
    # Front wheel at X = 0.88, Z = 0.32
    w_front = create_alloy_wheel("wheel_front", (0.88, 0.0, wheel_radius), wheel_radius, wheel_width, m_tire, m_rim_blue, m_disc, m_dark_metal)
    # Rear wheel at X = -0.78, Z = 0.32
    w_rear = create_alloy_wheel("wheel_rear", (-0.78, 0.0, wheel_radius), wheel_radius, wheel_width * 1.25, m_tire, m_rim_blue, m_disc, m_dark_metal)

    # -------------------------------------------------------------
    # 2. CHASSIS, SUSPENSION & ENGINE
    # -------------------------------------------------------------
    # Inverted Gold USD Front Forks
    fork_angle = math.radians(24) # rake angle
    create_cylinder_between("Fork_L", (0.88, -0.09, wheel_radius), (0.58, -0.09, 0.88), 0.024, m_gold_fork)
    create_cylinder_between("Fork_R", (0.88, 0.09, wheel_radius), (0.58, 0.09, 0.88), 0.024, m_gold_fork)
    create_cylinder_between("ForkLower_L", (0.88, -0.09, wheel_radius), (0.76, -0.09, 0.54), 0.028, m_dark_metal)
    create_cylinder_between("ForkLower_R", (0.88, 0.09, wheel_radius), (0.76, 0.09, 0.54), 0.028, m_dark_metal)
    
    # Triple tree clamp & steering stem
    create_box("TripleTreeUpper", (0.57, 0, 0.90), (0.08, 0.24, 0.035), m_dark_metal, bevel=0.005)
    create_box("TripleTreeLower", (0.64, 0, 0.78), (0.08, 0.24, 0.04), m_dark_metal, bevel=0.005)
    
    # Clip-on Handlebars
    create_cylinder_between("ClipOn_L", (0.57, -0.08, 0.90), (0.52, -0.26, 0.86), 0.015, m_dark_metal)
    create_cylinder_between("ClipOn_R", (0.57, 0.08, 0.90), (0.52, 0.26, 0.86), 0.015, m_dark_metal)
    create_cylinder_between("BarGrip_L", (0.53, -0.20, 0.87), (0.51, -0.28, 0.85), 0.022, m_tire)
    create_cylinder_between("BarGrip_R", (0.53, 0.20, 0.87), (0.51, 0.28, 0.85), 0.022, m_tire)
    # Digital instrument gauge cluster
    create_box("DigitalDash", (0.60, 0, 0.93), (0.07, 0.14, 0.04), m_dark_metal, bevel=0.005)

    # Aluminum Twin-Spar Perimeter Frame
    create_cylinder_between("FrameSpar_L", (0.58, -0.12, 0.82), (0.02, -0.16, 0.62), 0.045, m_dark_metal)
    create_cylinder_between("FrameSpar_R", (0.58, 0.12, 0.82), (0.02, 0.16, 0.62), 0.045, m_dark_metal)
    create_cylinder_between("FrameDown_L", (0.02, -0.16, 0.62), (-0.05, -0.14, 0.36), 0.042, m_dark_metal)
    create_cylinder_between("FrameDown_R", (0.02, 0.16, 0.62), (-0.05, 0.14, 0.36), 0.042, m_dark_metal)

    # Exposed Engine Block & Crankcase
    create_box("EngineBlock", (0.12, 0, 0.42), (0.36, 0.28, 0.24), m_dark_metal, bevel=0.02)
    create_sphere("ClutchCover", (0.08, 0.15, 0.38), 0.075, (0.5, 1.0, 1.0), m_dark_metal)
    create_sphere("AlternatorCover", (0.08, -0.15, 0.38), 0.07, (0.5, 1.0, 1.0), m_dark_metal)

    # Rear Aluminum Swingarm & Monoshock
    create_cylinder_between("Swingarm_L", (-0.08, -0.12, 0.36), (-0.78, -0.08, wheel_radius), 0.038, m_dark_metal)
    create_cylinder_between("Swingarm_R", (-0.08, 0.12, 0.36), (-0.78, 0.08, wheel_radius), 0.038, m_dark_metal)
    create_cylinder_between("Monoshock", (-0.02, 0, 0.58), (-0.28, 0, 0.38), 0.032, m_gold_fork)

    # Upswept Chrome Canister Exhaust Pipe (matches photo!)
    create_cylinder_between("ExhaustHeader", (0.28, 0.08, 0.32), (0.05, 0.14, 0.22), 0.025, m_chrome)
    create_cylinder_between("ExhaustMidPipe", (0.05, 0.14, 0.22), (-0.26, 0.18, 0.30), 0.03, m_chrome)
    create_cylinder_between("ExhaustMuffler", (-0.26, 0.18, 0.30), (-0.72, 0.22, 0.48), 0.055, m_chrome, radius2=0.045)
    create_cylinder_between("ExhaustTip", (-0.72, 0.22, 0.48), (-0.78, 0.23, 0.51), 0.038, m_dark_metal)

    # Rearset Knurled Footpegs (where rider boots rest!)
    create_cylinder_between("Footpeg_L", (-0.14, -0.14, 0.42), (-0.14, -0.28, 0.42), 0.016, m_dark_metal)
    create_cylinder_between("Footpeg_R", (-0.14, 0.14, 0.42), (-0.14, 0.28, 0.42), 0.016, m_dark_metal)

    # -------------------------------------------------------------
    # 3. AERODYNAMIC FAIRINGS & BODYWORK
    # -------------------------------------------------------------
    # Front Aggressive Nose Cone & Dual LED Headlights
    create_box("FrontNoseCowl", (0.75, 0, 0.82), (0.34, 0.38, 0.22), m_body_blue, bevel=0.03)
    # Sharp Angled Dual Headlights
    create_box("Headlight_L", (0.88, -0.11, 0.82), (0.08, 0.10, 0.04), m_headlight, bevel=0.005)
    create_box("Headlight_R", (0.88, 0.11, 0.82), (0.08, 0.10, 0.04), m_headlight, bevel=0.005)
    # Clear Smoked Windshield
    create_box("Windshield", (0.66, 0, 0.98), (0.24, 0.26, 0.18), m_windshield, bevel=0.01)

    # Side Fairings with Air Duct Vents
    create_box("FairingSide_L", (0.42, -0.18, 0.65), (0.52, 0.08, 0.38), m_body_blue, bevel=0.03)
    create_box("FairingSide_R", (0.42, 0.18, 0.65), (0.52, 0.08, 0.38), m_body_blue, bevel=0.03)
    # Lower Belly Pan Cowl
    create_box("BellyPan", (0.22, 0, 0.28), (0.64, 0.26, 0.14), m_body_blue, bevel=0.02)

    # Sculpted Fuel Tank with Knee Recesses
    create_box("FuelTank", (0.24, 0, 0.82), (0.46, 0.34, 0.26), m_body_blue, bevel=0.05)
    create_cylinder_between("FuelFillerCap", (0.32, 0, 0.95), (0.32, 0, 0.97), 0.042, m_dark_metal)

    # Split Rider & Pillion Saddle
    create_box("RiderSeat", (-0.08, 0, 0.73), (0.32, 0.26, 0.08), m_seat_leather, bevel=0.03)
    create_box("PillionSeatCowl", (-0.36, 0, 0.82), (0.34, 0.22, 0.12), m_body_blue, bevel=0.04)

    # Upswept Rear Tail Cowl & License Plate Hanger
    create_box("TailCowl", (-0.48, 0, 0.80), (0.38, 0.20, 0.14), m_body_blue, bevel=0.03)
    create_box("TailLEDLight", (-0.66, 0, 0.84), (0.04, 0.14, 0.04), m_taillight, bevel=0.005)
    create_box("LicensePlateHanger", (-0.72, 0, 0.68), (0.12, 0.16, 0.08), m_dark_metal)

    # -------------------------------------------------------------
    # 4. FULL-BODIED RIDER IN SPORTS TUCK (EXACT MATCH TO REFERENCE PHOTO!)
    # -------------------------------------------------------------
    rider_group = bpy.data.objects.new("BikerRider", None)
    bpy.context.collection.objects.link(rider_group)
    rider_group.location = (0.0, 0.0, 0.0)

    # Pelvis seated in the rider seat bucket
    create_box("Rider_Pelvis", (-0.08, 0, 0.77), (0.24, 0.26, 0.16), m_jeans_dark, bevel=0.03, parent=rider_group)

    # Torso leaning forward in aerodynamic sport tuck (~35 deg forward incline)
    create_box("Rider_Torso", (0.14, 0, 0.94), (0.36, 0.32, 0.28), m_hoodie_orange, bevel=0.05, parent=rider_group)
    # Orange Hood draped on upper back
    create_sphere("Rider_HoodDrape", (0.02, 0, 1.05), 0.10, (1.2, 1.1, 0.8), m_hoodie_orange, parent=rider_group)
    # Neck
    create_cylinder_between("Rider_Neck", (0.26, 0, 1.04), (0.34, 0, 1.12), 0.052, m_skin, verts=10, parent=rider_group)

    # Arms extending forward in low tuck to grip handlebars
    # Left Arm
    create_cylinder_between("Rider_UpperArm_L", (0.24, -0.18, 1.02), (0.40, -0.24, 0.94), 0.054, m_hoodie_orange, verts=10, parent=rider_group)
    create_cylinder_between("Rider_Forearm_L", (0.40, -0.24, 0.94), (0.52, -0.26, 0.87), 0.046, m_hoodie_orange, verts=10, parent=rider_group)
    create_sphere("Rider_Glove_L", (0.52, -0.26, 0.86), 0.044, (1.2, 0.9, 0.9), m_dark_metal, parent=rider_group)

    # Right Arm
    create_cylinder_between("Rider_UpperArm_R", (0.24, 0.18, 1.02), (0.40, 0.24, 0.94), 0.054, m_hoodie_orange, verts=10, parent=rider_group)
    create_cylinder_between("Rider_Forearm_R", (0.40, 0.24, 0.94), (0.52, 0.26, 0.87), 0.046, m_hoodie_orange, verts=10, parent=rider_group)
    create_sphere("Rider_Glove_R", (0.52, 0.26, 0.86), 0.044, (1.2, 0.9, 0.9), m_dark_metal, parent=rider_group)

    # Legs hugging fuel tank, knees bent back to rearset footpegs!
    # Left Leg
    hip_l = (-0.05, -0.12, 0.76)
    knee_l = (0.18, -0.22, 0.68)
    ankle_l = (-0.14, -0.24, 0.44)
    create_cylinder_between("Rider_Thigh_L", hip_l, knee_l, 0.072, m_jeans_dark, verts=12, parent=rider_group)
    create_cylinder_between("Rider_Shin_L", knee_l, ankle_l, 0.058, m_jeans_dark, verts=10, parent=rider_group)
    # Skate sneaker with white sole & laces resting on left footpeg
    create_box("Rider_Sneaker_L", (-0.10, -0.24, 0.44), (0.18, 0.08, 0.07), m_sneaker_gray, bevel=0.015, parent=rider_group)
    create_box("Rider_Sole_L", (-0.10, -0.24, 0.405), (0.19, 0.085, 0.02), m_sneaker_white, parent=rider_group)

    # Right Leg
    hip_r = (-0.05, 0.12, 0.76)
    knee_r = (0.18, 0.22, 0.68)
    ankle_r = (-0.14, 0.24, 0.44)
    create_cylinder_between("Rider_Thigh_R", hip_r, knee_r, 0.072, m_jeans_dark, verts=12, parent=rider_group)
    create_cylinder_between("Rider_Shin_R", knee_r, ankle_r, 0.058, m_jeans_dark, verts=10, parent=rider_group)
    # Skate sneaker on right footpeg
    create_box("Rider_Sneaker_R", (-0.10, 0.24, 0.44), (0.18, 0.08, 0.07), m_sneaker_gray, bevel=0.015, parent=rider_group)
    create_box("Rider_Sole_R", (-0.10, 0.24, 0.405), (0.19, 0.085, 0.02), m_sneaker_white, parent=rider_group)

    # -------------------------------------------------------------
    # 5. AERODYNAMIC FULL-FACE HELMET WITH SLEEK TINTED VISOR (EXACT MATCH TO PHOTO!)
    # -------------------------------------------------------------
    helmet_loc = (0.42, 0, 1.25)
    helmet_group = bpy.data.objects.new("Rider_Helmet", None)
    bpy.context.collection.objects.link(helmet_group)
    helmet_group.location = helmet_loc
    helmet_group.parent = rider_group

    # Glossy Blue Aerodynamic Helmet Shell
    create_sphere("HelmetShell", (0, 0, 0), 0.155, (1.15, 0.96, 1.08), m_helmet_shell, segs=24, rings=18, parent=helmet_group)
    # Chin Bar
    create_box("HelmetChinBar", (0.09, 0, -0.06), (0.12, 0.18, 0.08), m_helmet_shell, bevel=0.02, parent=helmet_group)
    # Rear Aerodynamic Spoiler Wing
    create_box("HelmetSpoiler", (-0.12, 0, 0.04), (0.08, 0.16, 0.035), m_helmet_shell, bevel=0.01, parent=helmet_group)
    
    # White Graphic Racing Stripes on Crown (matches photo 2!)
    create_cylinder_between("HelmetStripe_L", (-0.12, -0.05, 0.08), (0.10, -0.05, 0.08), 0.012, m_helmet_stripe, parent=helmet_group)
    create_cylinder_between("HelmetStripe_R", (-0.12, 0.05, 0.08), (0.10, 0.05, 0.08), 0.012, m_helmet_stripe, parent=helmet_group)

    # Curved Dark Tinted Visor (Panoramic Smoked Glass with High Reflection)
    create_sphere("HelmetVisor", (0.06, 0, 0.01), 0.145, (0.75, 1.02, 0.70), m_helmet_visor, segs=20, rings=14, parent=helmet_group)
    # Visor Pivot Caps on sides
    create_sphere("VisorPivot_L", (0.01, -0.152, 0.01), 0.024, (0.5, 1.0, 1.0), m_dark_metal, parent=helmet_group)
    create_sphere("VisorPivot_R", (0.01, 0.152, 0.01), 0.024, (0.5, 1.0, 1.0), m_dark_metal, parent=helmet_group)

    # -------------------------------------------------------------
    # 6. EXPORT TO GLTF/GLB
    # -------------------------------------------------------------
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        use_selection=False,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
    )
    print("SUCCESSFULLY EXPORTED SPORTBIKE RIDER TO:", OUTPUT)

if __name__ == "__main__":
    build()
