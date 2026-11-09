import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "cycle-rickshaw.glb")

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.actions, bpy.data.armatures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

def create_material(name, color, metallic=0.0, roughness=0.6, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color[:3], 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
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

def create_sphere(name, loc, radius, scale, mat, segs=16, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth_mesh(obj)
    assign_material(obj, mat)
    return obj

def create_box(name, loc, dimensions, mat, bevel=0.0):
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
    return obj

def create_cylinder_between(name, p1, p2, radius, mat, verts=12, radius2=None):
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
    return obj

def create_bone_cylinder(name, p1, p2, radius, mat, verts=12):
    p1_v = Vector(p1)
    p2_v = Vector(p2)
    dir_v = p2_v - p1_v
    length = dir_v.length
    if length < 1e-5:
        length = 1e-4
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts,
        radius1=radius,
        radius2=radius,
        depth=length,
        location=(0, 0, length * 0.5)
    )
    obj = bpy.context.object
    obj.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    obj.location = p1_v
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = dir_v.to_track_quat("Z", "Y")
    smooth_mesh(obj)
    assign_material(obj, mat)
    return obj

def create_spoked_wheel(name, center, radius, width, tire_mat, rim_mat, spoke_mat, hub_mat):
    parts = []
    
    # Outer rubber tire
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.045,
        minor_radius=0.045,
        major_segments=36,
        minor_segments=10,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    tire = assign_material(bpy.context.object, tire_mat)
    smooth_mesh(tire)
    parts.append(tire)
    
    # Chrome rim
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.08,
        minor_radius=0.015,
        major_segments=36,
        minor_segments=8,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    rim = assign_material(bpy.context.object, rim_mat)
    smooth_mesh(rim)
    parts.append(rim)
    
    # Center brass hub
    hub = create_cylinder_between(f"{name}_hub", (center[0], center[1] - width * 0.8, center[2]), (center[0], center[1] + width * 0.8, center[2]), 0.055, hub_mat, verts=14)
    parts.append(hub)
    
    # 24 Wire Spokes (laced in cross pattern)
    spoke_count = 24
    for i in range(spoke_count):
        angle = (i / spoke_count) * math.tau
        rim_x = center[0] + (radius - 0.09) * math.cos(angle)
        rim_z = center[2] + (radius - 0.09) * math.sin(angle)
        side = 0.035 if (i % 2 == 0) else -0.035
        spoke = create_cylinder_between(
            f"{name}_spoke_{i}",
            (center[0], center[1] + side, center[2]),
            (rim_x, center[1] + side * 0.2, rim_z),
            0.0035,
            spoke_mat,
            verts=4
        )
        parts.append(spoke)
        
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = tire
    bpy.ops.object.join()
    wheel = bpy.context.object
    wheel.name = name
    bpy.context.scene.cursor.location = center
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return wheel

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None, is_female=False):
    x, y, z = center
    create_sphere(f"{name_prefix}_Cranium", (x, y, z), 0.12, (1.05, 0.92, 1.18), skin_mat, segs=14, rings=10)
    create_sphere(f"{name_prefix}_Jaw", (x + 0.04, y, z - 0.045), 0.075, (1.0, 0.78, 0.85), skin_mat, segs=10, rings=8)
    create_sphere(f"{name_prefix}_Hair", (x - 0.015, y, z + 0.04), 0.122, (1.04, 0.96, 1.12), hair_mat, segs=12, rings=8)
    
    if is_female:
        create_sphere(f"{name_prefix}_HairBun", (x - 0.12, y, z + 0.02), 0.07, (0.8, 1.1, 1.1), hair_mat, segs=10, rings=8)

    # Left & Right Ears
    create_sphere(f"{name_prefix}_Ear_L", (x, y - 0.11, z - 0.01), 0.03, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6)
    create_sphere(f"{name_prefix}_Ear_R", (x, y + 0.11, z - 0.01), 0.03, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6)
    
    # Eyes & Pupils
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = y + sign * 0.04
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (x + 0.105, eye_y, z + 0.015), 0.02, (0.6, 1.0, 0.8), eye_white_mat, segs=8, rings=6)
        create_sphere(f"{name_prefix}_Pupil_{side}", (x + 0.115, eye_y, z + 0.015), 0.01, (0.5, 0.9, 0.9), iris_mat, segs=6, rings=4)
        create_box(f"{name_prefix}_Eyebrow_{side}", (x + 0.108, eye_y, z + 0.036), (0.015, 0.038, 0.01), hair_mat, bevel=0.002)
    
    # Nose
    create_cylinder_between(f"{name_prefix}_NoseBridge", (x + 0.095, y, z + 0.03), (x + 0.13, y, z - 0.012), 0.012, skin_mat, verts=8)
    create_sphere(f"{name_prefix}_NoseTip", (x + 0.132, y, z - 0.015), 0.016, (1.0, 1.0, 0.9), skin_mat, segs=8, rings=6)
    
    # Lips
    create_box(f"{name_prefix}_LipUpper", (x + 0.115, y, z - 0.042), (0.015, 0.042, 0.009), lip_mat, bevel=0.002)
    create_box(f"{name_prefix}_LipLower", (x + 0.112, y, z - 0.054), (0.015, 0.038, 0.01), lip_mat, bevel=0.002)
    
    if mustache_mat and not is_female:
        create_sphere(f"{name_prefix}_Mustache_L", (x + 0.122, y - 0.02, z - 0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6)
        create_sphere(f"{name_prefix}_Mustache_R", (x + 0.122, y + 0.02, z - 0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6)
    return None

def build():
    clear_scene()

    # Traditional Rickshaw Color Palette
    m_frame = create_material("Frame_BlackGloss", (0.04, 0.04, 0.05), metallic=0.3, roughness=0.3)
    m_chrome = create_material("Metal_Chrome", (0.85, 0.88, 0.90), metallic=0.95, roughness=0.15)
    m_brass = create_material("Metal_BrassBell", (0.95, 0.82, 0.25), metallic=0.85, roughness=0.25)
    m_rubber = create_material("Tire_Rubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    m_leather = create_material("Leather_DarkBrown", (0.18, 0.10, 0.06), metallic=0.05, roughness=0.7)
    
    # Folk Art Colors (authentic Dhaka Rickshaw Art!)
    m_red = create_material("Rickshaw_CrimsonRed", (0.88, 0.08, 0.12), metallic=0.1, roughness=0.4)
    m_teal = create_material("Rickshaw_TealTurquoise", (0.05, 0.65, 0.68), metallic=0.1, roughness=0.4)
    m_yellow = create_material("Rickshaw_BrightYellow", (0.98, 0.82, 0.08), metallic=0.1, roughness=0.35)
    m_green = create_material("Rickshaw_EmeraldGreen", (0.08, 0.62, 0.22), metallic=0.1, roughness=0.4)
    m_blue = create_material("Rickshaw_CobaltBlue", (0.10, 0.35, 0.85), metallic=0.1, roughness=0.4)
    m_wood = create_material("Wood_Floorboard", (0.42, 0.26, 0.16), metallic=0.0, roughness=0.8)
    m_cushion_red = create_material("Cushion_RedVinyl", (0.82, 0.10, 0.12), metallic=0.1, roughness=0.5)
    m_dark = create_material("Metal_DarkTrim", (0.06, 0.06, 0.07), metallic=0.4, roughness=0.6)
    m_sandal = create_material("Sandal_Leather", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.8)

    # Characters Materials
    m_puller_skin = create_material("Puller_Skin", (0.44, 0.26, 0.15), metallic=0.0, roughness=0.78)
    m_puller_shirt = create_material("Puller_BlueShirt", (0.18, 0.42, 0.82), metallic=0.0, roughness=0.8)
    m_puller_lungi = create_material("Puller_LungiPlaid", (0.85, 0.32, 0.18), metallic=0.0, roughness=0.85)
    m_gamcha = create_material("Puller_GamchaRed", (0.92, 0.22, 0.25), metallic=0.0, roughness=0.85)

    m_pass_m_skin = create_material("PassMale_Skin", (0.50, 0.30, 0.18), metallic=0.0, roughness=0.75)
    m_pass_m_shirt = create_material("PassMale_Panjabi", (0.92, 0.90, 0.85), metallic=0.0, roughness=0.8)
    m_pass_m_pants = create_material("PassMale_Pajama", (0.85, 0.85, 0.82), metallic=0.0, roughness=0.85)
    
    m_pass_f_skin = create_material("PassFem_Skin", (0.55, 0.34, 0.22), metallic=0.0, roughness=0.72)
    m_pass_f_saree = create_material("PassFem_Saree", (0.85, 0.18, 0.45), metallic=0.0, roughness=0.75)
    m_pass_f_orna = create_material("PassFem_Orna", (0.95, 0.75, 0.12), metallic=0.0, roughness=0.65)
    
    m_hair = create_material("Human_Hair", (0.03, 0.025, 0.02), metallic=0.0, roughness=0.9)
    m_eye_white = create_material("Eye_Sclera", (0.95, 0.95, 0.95), metallic=0.0, roughness=0.2)
    m_iris = create_material("Eye_Iris", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.2)
    m_lip = create_material("Human_Lips", (0.52, 0.22, 0.18), metallic=0.0, roughness=0.5)

    # -------------------------------------------------------------
    # 1. THREE HIGH-SPOKE WHEELS (Single joined meshes with centered origins)
    # -------------------------------------------------------------
    wheel_radius = 0.56
    w_front = create_spoked_wheel("wheel_front", (1.38, 0.0, wheel_radius), wheel_radius, 0.07, m_rubber, m_chrome, m_chrome, m_brass)
    w_rear_l = create_spoked_wheel("wheel_rear_left", (-1.13, -0.78, wheel_radius), wheel_radius, 0.07, m_rubber, m_chrome, m_chrome, m_brass)
    w_rear_r = create_spoked_wheel("wheel_rear_right", (-1.13, 0.78, wheel_radius), wheel_radius, 0.07, m_rubber, m_chrome, m_chrome, m_brass)

    # -------------------------------------------------------------
    # 2. CHASSIS, FRAME & DRIVETRAIN
    # -------------------------------------------------------------
    # Front bicycle fork & crown
    create_cylinder_between("Fork_L", (1.38, -0.06, wheel_radius), (1.0, -0.06, 1.48), 0.024, m_chrome)
    create_cylinder_between("Fork_R", (1.38, 0.06, wheel_radius), (1.0, 0.06, 1.48), 0.024, m_chrome)
    create_box("ForkCrown", (1.0, 0, 1.48), (0.08, 0.16, 0.05), m_chrome, bevel=0.01)
    create_cylinder_between("HeadTube", (1.0, 0, 1.48), (0.95, 0, 1.62), 0.032, m_frame)
    create_cylinder_between("Stem", (0.95, 0, 1.62), (0.98, 0, 1.68), 0.028, m_chrome)
    
    # Wide curved handlebars
    create_cylinder_between("BarCenter", (0.98, -0.36, 1.68), (0.98, 0.36, 1.68), 0.022, m_chrome)
    create_sphere("Grip_L", (0.98, -0.36, 1.68), 0.034, (1.4, 1.0, 1.0), m_rubber)
    create_sphere("Grip_R", (0.98, 0.36, 1.68), 0.034, (1.4, 1.0, 1.0), m_rubber)
    create_sphere("Bell", (0.98, -0.25, 1.72), 0.038, (1.0, 1.0, 0.7), m_brass)
    
    # Headlamp with lens
    create_box("HeadlampHousing", (1.12, 0, 1.44), (0.16, 0.16, 0.14), m_chrome, bevel=0.02)
    m_lens = create_material("HeadlampLens", (1.0, 0.95, 0.8), metallic=0.2, roughness=0.1, emission=(1.0, 0.9, 0.6), emission_strength=2.0)
    create_sphere("HeadlampGlass", (1.20, 0, 1.44), 0.065, (0.4, 1.0, 1.0), m_lens)

    # Front mudguard
    create_cylinder_between("MudguardFront", (1.15, 0, 0.88), (1.62, 0, 0.82), 0.08, m_red, verts=8)

    # Diamond cycle frame
    create_cylinder_between("TopTube", (0.95, 0, 1.55), (0.0, 0, 1.15), 0.028, m_frame)
    create_cylinder_between("DownTube", (0.95, 0, 1.50), (0.12, 0, 0.76), 0.032, m_frame)
    create_cylinder_between("SeatTube", (0.0, 0, 1.15), (0.12, 0, 0.76), 0.032, m_frame)
    create_cylinder_between("ChainStay_L", (0.12, 0, 0.76), (-0.70, -0.25, 0.60), 0.026, m_frame)
    create_cylinder_between("ChainStay_R", (0.12, 0, 0.76), (-0.70, 0.25, 0.60), 0.026, m_frame)
    create_cylinder_between("SeatStay_L", (0.0, 0, 1.15), (-0.70, -0.25, 0.60), 0.024, m_frame)
    create_cylinder_between("SeatStay_R", (0.0, 0, 1.15), (-0.70, 0.25, 0.60), 0.024, m_frame)

    # Puller saddle
    create_box("SaddleBase", (0.0, 0, 1.17), (0.34, 0.28, 0.08), m_leather, bevel=0.03)
    create_cylinder_between("SaddlePost", (0.0, 0, 1.15), (0.04, 0, 0.95), 0.026, m_chrome)
    create_sphere("Spring_L", (-0.10, -0.09, 1.14), 0.035, (1.0, 1.0, 1.2), m_chrome)
    create_sphere("Spring_R", (-0.10, 0.09, 1.14), 0.035, (1.0, 1.0, 1.2), m_chrome)

    # -------------------------------------------------------------
    # 3. PEDAL CRANKSET (Single joined mesh named pedal_crank with origin at axle)
    # -------------------------------------------------------------
    crank_center = (0.12, 0.0, 0.76)
    crank_parts = []
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=20,
        radius=0.14,
        depth=0.015,
        location=(0.12, 0.04, 0.76),
        rotation=(math.pi / 2, 0, 0)
    )
    chainring = assign_material(bpy.context.object, m_yellow)
    crank_parts.append(chainring)
    
    crank_radius = 0.17
    c_arm_l = create_cylinder_between("CrankArm_L", (0.12, -0.13, 0.76), (0.12 + crank_radius, -0.13, 0.76), 0.018, m_chrome)
    c_arm_r = create_cylinder_between("CrankArm_R", (0.12, 0.13, 0.76), (0.12 - crank_radius, 0.13, 0.76), 0.018, m_chrome)
    crank_parts.extend([c_arm_l, c_arm_r])
    
    pedal_l = create_box("Pedal_L", (0.12 + crank_radius, -0.17, 0.76), (0.12, 0.08, 0.035), m_dark, bevel=0.008)
    pedal_r = create_box("Pedal_R", (0.12 - crank_radius, 0.17, 0.76), (0.12, 0.08, 0.035), m_dark, bevel=0.008)
    crank_parts.extend([pedal_l, pedal_r])

    bpy.ops.object.select_all(action='DESELECT')
    for p in crank_parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = chainring
    bpy.ops.object.join()
    crank_obj = bpy.context.object
    crank_obj.name = "pedal_crank"
    bpy.context.scene.cursor.location = crank_center
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    # -------------------------------------------------------------
    # 4. CARRIAGE, PASSENGER CABIN & FOLK ART
    # -------------------------------------------------------------
    create_box("CarriageFloor", (-0.72, 0, 0.78), (1.10, 1.56, 0.06), m_wood)
    create_box("FootrestBoard", (-0.36, 0, 0.76), (0.42, 1.48, 0.04), m_wood)
    
    # Red vinyl seat cushion & backrest
    create_box("SeatCushion", (-0.72, 0, 1.08), (0.54, 1.42, 0.16), m_cushion_red, bevel=0.03)
    create_box("SeatBackrest", (-0.98, 0, 1.42), (0.12, 1.42, 0.54), m_cushion_red, bevel=0.03)
    create_box("SeatCushionBorder", (-0.72, 0, 1.00), (0.58, 1.46, 0.04), m_yellow)
    
    # Folk Art Tin Side Panels
    create_box("SidePanel_L", (-0.72, -0.74, 1.18), (0.88, 0.02, 0.56), m_teal, bevel=0.01)
    create_box("SidePanel_R", (-0.72, 0.74, 1.18), (0.88, 0.02, 0.56), m_teal, bevel=0.01)
    create_cylinder_between("ArmrestRail_L", (-0.28, -0.74, 1.25), (-0.98, -0.74, 1.45), 0.022, m_chrome)
    create_cylinder_between("ArmrestRail_R", (-0.28, 0.74, 1.25), (-0.98, 0.74, 1.45), 0.022, m_chrome)
    
    # Folding Hood Canopy Structure
    create_cylinder_between("HoodBow_Front", (-0.24, -0.76, 1.35), (-0.24, -0.76, 2.25), 0.016, m_frame)
    create_cylinder_between("HoodBow_FrontTop", (-0.24, -0.76, 2.25), (-0.24, 0.76, 2.25), 0.018, m_frame)
    create_cylinder_between("HoodBow_FrontR", (-0.24, 0.76, 1.35), (-0.24, 0.76, 2.25), 0.016, m_frame)

    create_cylinder_between("HoodBow_Mid", (-0.72, -0.76, 1.40), (-0.72, -0.76, 2.38), 0.016, m_frame)
    create_cylinder_between("HoodBow_MidTop", (-0.72, -0.76, 2.38), (-0.72, 0.76, 2.38), 0.018, m_frame)
    create_cylinder_between("HoodBow_MidR", (-0.72, 0.76, 1.40), (-0.72, 0.76, 2.38), 0.016, m_frame)

    create_cylinder_between("HoodBow_Rear", (-1.18, -0.76, 1.35), (-1.18, -0.76, 2.15), 0.016, m_frame)
    create_cylinder_between("HoodBow_RearTop", (-1.18, -0.76, 2.15), (-1.18, 0.76, 2.15), 0.018, m_frame)
    create_cylinder_between("HoodBow_RearR", (-1.18, 0.76, 1.35), (-1.18, 0.76, 2.15), 0.016, m_frame)

    # Curved Canopy Hood Skin (Rich crimson canopy with folk borders)
    create_box("HoodCanopyTop", (-0.70, 0, 2.30), (1.05, 1.54, 0.08), m_red, bevel=0.03)
    create_box("HoodCanopyBack", (-1.12, 0, 1.80), (0.16, 1.54, 0.88), m_red, bevel=0.03)
    create_box("HoodFringeYellow", (-0.22, 0, 2.24), (0.04, 1.56, 0.06), m_yellow)
    create_box("HoodFringeGreen", (-1.19, 0, 1.36), (0.04, 1.56, 0.06), m_green)

    # Rear Folk Art Tin Plate ("রিকশা আর্ট" emblem plate)
    create_box("RearArtBoard", (-1.28, 0, 1.05), (0.04, 1.40, 0.48), m_yellow, bevel=0.01)
    create_box("RearArtEmblem", (-1.31, 0, 1.05), (0.02, 0.85, 0.28), m_red, bevel=0.008)
    create_sphere("RearRosetteCenter", (-1.33, 0, 1.05), 0.045, (0.4, 1.0, 1.0), m_teal, segs=10, rings=8)
    create_box("RearSafetyReflector", (-1.33, 0, 0.78), (0.03, 0.24, 0.08), m_red, bevel=0.005)

    # -------------------------------------------------------------
    # 5. RICKSHAW PULLER (FULL BODY: HEAD, FACE, ARMS, TORSO, PELVIS, LEGS, FEET)
    # -------------------------------------------------------------
    # Pelvis
    create_box("Puller_Pelvis", (0.02, 0.0, 1.22), (0.24, 0.28, 0.16), m_puller_lungi, bevel=0.02)
    # Torso (leaning forward toward handlebars)
    create_box("Puller_Torso", (0.16, 0.0, 1.44), (0.26, 0.36, 0.38), m_puller_shirt, bevel=0.04)
    
    # Gamcha scarf draped around neck & chest
    create_cylinder_between("Puller_Gamcha_L", (0.24, -0.12, 1.62), (0.18, -0.06, 1.34), 0.042, m_gamcha, verts=8)
    create_cylinder_between("Puller_Gamcha_R", (0.24, 0.12, 1.62), (0.18, 0.06, 1.34), 0.042, m_gamcha, verts=8)
    create_sphere("Puller_GamchaKnot", (0.24, 0.0, 1.42), 0.05, (1.0, 1.2, 1.0), m_gamcha, segs=10, rings=8)

    # Neck & 3D Face
    create_cylinder_between("Puller_Neck", (0.22, 0.0, 1.58), (0.26, 0.0, 1.70), 0.055, m_puller_skin, verts=10)
    build_head_and_face("Puller", (0.28, 0.0, 1.82), m_puller_skin, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair, is_female=False)

    # Arms reaching forward to grip handlebars
    create_cylinder_between("Puller_UpperArm_L", (0.20, -0.18, 1.56), (0.54, -0.26, 1.50), 0.052, m_puller_shirt, verts=10)
    create_cylinder_between("Puller_Forearm_L", (0.54, -0.26, 1.50), (0.95, -0.34, 1.66), 0.042, m_puller_skin, verts=10)
    create_sphere("Puller_Hand_L", (0.96, -0.35, 1.67), 0.048, (1.2, 0.9, 0.9), m_puller_skin, segs=10, rings=8)
    
    create_cylinder_between("Puller_UpperArm_R", (0.20, 0.18, 1.56), (0.54, 0.26, 1.50), 0.052, m_puller_shirt, verts=10)
    create_cylinder_between("Puller_Forearm_R", (0.54, 0.26, 1.50), (0.95, 0.34, 1.66), 0.042, m_puller_skin, verts=10)
    create_sphere("Puller_Hand_R", (0.96, 0.35, 1.67), 0.048, (1.2, 0.9, 0.9), m_puller_skin, segs=10, rings=8)

    # Articulated Pedaling Legs (Bone origins at hip joint for Three.js pedaling kinetics!)
    hip_l = (0.05, -0.12, 1.18)
    knee_l = (0.26, -0.16, 0.98)
    ankle_l = (0.28, -0.17, 0.78)
    create_bone_cylinder("Puller_Thigh_L", hip_l, knee_l, 0.068, m_puller_lungi, verts=12)
    create_bone_cylinder("Puller_Shin_L", knee_l, ankle_l, 0.052, m_puller_skin, verts=10)
    create_box("Puller_Foot_L", (ankle_l[0] + 0.04, ankle_l[1], ankle_l[2] - 0.02), (0.16, 0.075, 0.04), m_sandal, bevel=0.01)

    hip_r = (0.05, 0.12, 1.18)
    knee_r = (0.02, 0.16, 0.94)
    ankle_r = (-0.05, 0.17, 0.78)
    create_bone_cylinder("Puller_Thigh_R", hip_r, knee_r, 0.068, m_puller_lungi, verts=12)
    create_bone_cylinder("Puller_Shin_R", knee_r, ankle_r, 0.052, m_puller_skin, verts=10)
    create_box("Puller_Foot_R", (ankle_r[0] + 0.04, ankle_r[1], ankle_r[2] - 0.02), (0.16, 0.075, 0.04), m_sandal, bevel=0.01)

    # -------------------------------------------------------------
    # 6. PASSENGER LEFT: MALE IN PANJABI (100% COMPLETE ANATOMY & SEATED ON CUSHION)
    # -------------------------------------------------------------
    mx, my = -0.72, -0.28
    # Pelvis resting on seat cushion
    create_box("PassM_Pelvis", (mx, my, 1.18), (0.28, 0.32, 0.16), m_pass_m_pants, bevel=0.02)
    # Torso leaning back against upholstered backrest
    create_box("PassM_Torso", (mx - 0.04, my, 1.44), (0.24, 0.36, 0.40), m_pass_m_shirt, bevel=0.03)
    # Panjabi button placket
    create_box("PassM_Placket", (mx + 0.09, my, 1.48), (0.02, 0.04, 0.26), m_frame)
    # Neck & 3D Face
    create_cylinder_between("PassM_Neck", (mx - 0.02, my, 1.62), (mx, my, 1.72), 0.05, m_pass_m_skin, verts=10)
    build_head_and_face("PassM", (mx, my, 1.84), m_pass_m_skin, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair, is_female=False)

    # Arms resting on lap
    create_cylinder_between("PassM_Arm_L", (mx - 0.02, my - 0.18, 1.56), (mx + 0.16, my - 0.16, 1.30), 0.05, m_pass_m_shirt, verts=10)
    create_cylinder_between("PassM_Forearm_L", (mx + 0.16, my - 0.16, 1.30), (mx + 0.26, my - 0.06, 1.24), 0.042, m_pass_m_skin, verts=10)
    create_sphere("PassM_Hand_L", (mx + 0.27, my - 0.05, 1.24), 0.045, (1.2, 0.9, 0.9), m_pass_m_skin, segs=8, rings=6)
    
    create_cylinder_between("PassM_Arm_R", (mx - 0.02, my + 0.18, 1.56), (mx + 0.16, my + 0.16, 1.30), 0.05, m_pass_m_shirt, verts=10)
    create_cylinder_between("PassM_Forearm_R", (mx + 0.16, my + 0.16, 1.30), (mx + 0.26, my + 0.06, 1.24), 0.042, m_pass_m_skin, verts=10)
    create_sphere("PassM_Hand_R", (mx + 0.27, my + 0.05, 1.24), 0.045, (1.2, 0.9, 0.9), m_pass_m_skin, segs=8, rings=6)

    # LOWER BODY: Thighs extending horizontally forward over cushion, shins down to footboard!
    for side, sign in [("L", -1), ("R", 1)]:
        leg_y = my + sign * 0.10
        create_cylinder_between(f"PassM_Thigh_{side}", (mx + 0.02, leg_y, 1.18), (mx + 0.36, leg_y, 1.18), 0.065, m_pass_m_pants, verts=12)
        create_cylinder_between(f"PassM_Shin_{side}", (mx + 0.36, leg_y, 1.18), (mx + 0.36, leg_y, 0.82), 0.054, m_pass_m_pants, verts=10)
        create_box(f"PassM_Foot_{side}", (mx + 0.42, leg_y, 0.80), (0.16, 0.075, 0.038), m_sandal, bevel=0.01)

    # -------------------------------------------------------------
    # 7. PASSENGER RIGHT: FEMALE IN SAREE (100% COMPLETE ANATOMY & SEATED ON CUSHION)
    # -------------------------------------------------------------
    fx, fy = -0.72, 0.28
    # Pelvis on seat cushion
    create_box("PassF_Pelvis", (fx, fy, 1.18), (0.28, 0.32, 0.16), m_pass_f_saree, bevel=0.02)
    # Torso
    create_box("PassF_Torso", (fx - 0.04, fy, 1.42), (0.22, 0.34, 0.38), m_pass_f_saree, bevel=0.03)
    # Orna / Saree pallu drape across chest
    create_cylinder_between("PassF_OrnaDrape", (fx + 0.06, fy - 0.14, 1.54), (fx - 0.02, fy + 0.14, 1.30), 0.046, m_pass_f_orna, verts=8)
    create_box("PassF_PalluTail", (fx - 0.12, fy + 0.16, 1.18), (0.06, 0.14, 0.35), m_pass_f_orna, bevel=0.02)
    # Neck & 3D Face
    create_cylinder_between("PassF_Neck", (fx - 0.02, fy, 1.60), (fx, fy, 1.70), 0.045, m_pass_f_skin, verts=10)
    build_head_and_face("PassF", (fx, fy, 1.82), m_pass_f_skin, m_hair, m_eye_white, m_iris, m_lip, is_female=True)
    create_sphere("PassF_Earring_L", (fx, fy - 0.12, 1.79), 0.016, (1.0, 1.0, 1.5), m_yellow, segs=8, rings=6)
    create_sphere("PassF_Earring_R", (fx, fy + 0.12, 1.79), 0.016, (1.0, 1.0, 1.5), m_yellow, segs=8, rings=6)

    # Arms folded gracefully in lap
    create_cylinder_between("PassF_Arm_L", (fx - 0.02, fy - 0.17, 1.52), (fx + 0.14, fy - 0.14, 1.28), 0.045, m_pass_f_saree, verts=10)
    create_cylinder_between("PassF_Forearm_L", (fx + 0.14, fy - 0.14, 1.28), (fx + 0.24, fy - 0.04, 1.22), 0.038, m_pass_f_skin, verts=10)
    create_sphere("PassF_Hand_L", (fx + 0.25, fy - 0.03, 1.22), 0.04, (1.2, 0.9, 0.9), m_pass_f_skin, segs=8, rings=6)
    
    create_cylinder_between("PassF_Arm_R", (fx - 0.02, fy + 0.17, 1.52), (fx + 0.14, fy + 0.14, 1.28), 0.045, m_pass_f_saree, verts=10)
    create_cylinder_between("PassF_Forearm_R", (fx + 0.14, fy + 0.14, 1.28), (fx + 0.24, fy + 0.04, 1.22), 0.038, m_pass_f_skin, verts=10)
    create_sphere("PassF_Hand_R", (fx + 0.25, fy + 0.03, 1.22), 0.04, (1.2, 0.9, 0.9), m_pass_f_skin, segs=8, rings=6)

    # LOWER BODY: Saree-draped thighs extending forward, shins down to footboard!
    for side, sign in [("L", -1), ("R", 1)]:
        leg_y = fy + sign * 0.09
        create_cylinder_between(f"PassF_Thigh_{side}", (fx + 0.02, leg_y, 1.18), (fx + 0.35, leg_y, 1.18), 0.068, m_pass_f_saree, verts=12)
        create_cylinder_between(f"PassF_Shin_{side}", (fx + 0.35, leg_y, 1.18), (fx + 0.35, leg_y, 0.82), 0.056, m_pass_f_saree, verts=10)
        create_box(f"PassF_Foot_{side}", (fx + 0.41, leg_y, 0.80), (0.15, 0.07, 0.035), m_sandal, bevel=0.01)

    # -------------------------------------------------------------
    # 8. EXPORT TO GLTF/GLB
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
    print("SUCCESSFULLY EXPORTED CYCLE RICKSHAW TO:", OUTPUT)

if __name__ == "__main__":
    build()
