import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "cycle-rickshaw.glb")

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
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

def create_spoked_wheel(name, center, radius, width, tire_mat, rim_mat, spoke_mat, hub_mat):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = center
    
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
    tire.name = name + "_tire"
    tire.parent = pivot
    smooth_mesh(tire)
    
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
    rim.name = name + "_rim"
    rim.parent = pivot
    smooth_mesh(rim)
    
    # Center brass hub
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=0.055,
        depth=width * 1.6,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    hub = assign_material(bpy.context.object, hub_mat)
    hub.name = name + "_hub"
    hub.parent = pivot
    smooth_mesh(hub)
    
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
            verts=4,
            parent=pivot
        )
    return pivot

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None, parent=None, is_female=False):
    x, y, z = center
    head_group = bpy.data.objects.new(f"{name_prefix}_HeadGroup", None)
    bpy.context.collection.objects.link(head_group)
    head_group.location = (x, y, z)
    if parent:
        head_group.parent = parent
        
    # Cranium / Head base (facing +X)
    head = create_sphere(f"{name_prefix}_Cranium", (0, 0, 0), 0.13, (1.05, 0.92, 1.18), skin_mat, segs=20, rings=16, parent=head_group)
    
    # Jaw and Chin
    create_sphere(f"{name_prefix}_Jaw", (0.045, 0, -0.05), 0.08, (1.0, 0.78, 0.85), skin_mat, segs=14, rings=10, parent=head_group)
    
    # Hair
    if is_female:
        create_sphere(f"{name_prefix}_Hair", (-0.02, 0, 0.04), 0.135, (1.05, 0.98, 1.15), hair_mat, segs=16, rings=12, parent=head_group)
        # Hair bun on back of head
        create_sphere(f"{name_prefix}_HairBun", (-0.14, 0, 0.02), 0.065, (0.85, 0.95, 0.95), hair_mat, segs=14, rings=10, parent=head_group)
    else:
        create_sphere(f"{name_prefix}_Hair", (-0.015, 0, 0.045), 0.132, (1.04, 0.96, 1.12), hair_mat, segs=16, rings=12, parent=head_group)
        # Sideburns
        create_box(f"{name_prefix}_Sideburn_L", (0.01, -0.11, -0.02), (0.035, 0.015, 0.08), hair_mat, parent=head_group)
        create_box(f"{name_prefix}_Sideburn_R", (0.01, 0.11, -0.02), (0.035, 0.015, 0.08), hair_mat, parent=head_group)
    
    # Left & Right Ears
    create_sphere(f"{name_prefix}_Ear_L", (0.0, -0.12, -0.01), 0.035, (0.6, 0.35, 1.1), skin_mat, segs=10, rings=8, parent=head_group)
    create_sphere(f"{name_prefix}_Ear_R", (0.0, 0.12, -0.01), 0.035, (0.6, 0.35, 1.1), skin_mat, segs=10, rings=8, parent=head_group)
    
    # Eyeballs & Pupils (facing forward +X)
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = sign * 0.046
        # Eye white
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (0.115, eye_y, 0.015), 0.022, (0.6, 1.0, 0.8), eye_white_mat, segs=10, rings=8, parent=head_group)
        # Dark Iris / Pupil
        create_sphere(f"{name_prefix}_Pupil_{side}", (0.128, eye_y, 0.015), 0.011, (0.5, 0.9, 0.9), iris_mat, segs=8, rings=6, parent=head_group)
        # Eyebrow arch
        create_box(f"{name_prefix}_Eyebrow_{side}", (0.118, eye_y, 0.042), (0.015, 0.042, 0.01), hair_mat, bevel=0.003, parent=head_group)
    
    # Nose (bridge, tip, and nostrils)
    create_cylinder_between(f"{name_prefix}_NoseBridge", (0.105, 0, 0.035), (0.142, 0, -0.015), 0.014, skin_mat, verts=8, parent=head_group)
    create_sphere(f"{name_prefix}_NoseTip", (0.145, 0, -0.018), 0.018, (1.0, 1.0, 0.9), skin_mat, segs=10, rings=8, parent=head_group)
    create_sphere(f"{name_prefix}_Nostril_L", (0.136, -0.02, -0.022), 0.011, (1.0, 0.9, 0.8), skin_mat, segs=8, rings=6, parent=head_group)
    create_sphere(f"{name_prefix}_Nostril_R", (0.136, 0.02, -0.022), 0.011, (1.0, 0.9, 0.8), skin_mat, segs=8, rings=6, parent=head_group)
    
    # Lips / Mouth
    create_box(f"{name_prefix}_LipUpper", (0.126, 0, -0.048), (0.016, 0.048, 0.01), lip_mat, bevel=0.002, parent=head_group)
    create_box(f"{name_prefix}_LipLower", (0.122, 0, -0.062), (0.016, 0.042, 0.011), lip_mat, bevel=0.002, parent=head_group)
    
    # Authentic Mustache for Male characters
    if mustache_mat and not is_female:
        create_sphere(f"{name_prefix}_Mustache_L", (0.133, -0.022, -0.042), 0.016, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Mustache_R", (0.133, 0.022, -0.042), 0.016, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
        
    return head_group

def build():
    clear_scene()
    
    # Materials
    m_frame = create_material("Rickshaw_Frame", (0.08, 0.10, 0.12), metallic=0.75, roughness=0.3)
    m_chrome = create_material("Rickshaw_Chrome", (0.88, 0.90, 0.92), metallic=0.95, roughness=0.15)
    m_rubber = create_material("Rickshaw_TireRubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    m_brass = create_material("Rickshaw_Brass", (0.85, 0.65, 0.18), metallic=0.88, roughness=0.25)
    m_teal = create_material("Rickshaw_TealArt", (0.03, 0.52, 0.48), metallic=0.1, roughness=0.45)
    m_yellow = create_material("Rickshaw_YellowGold", (0.96, 0.72, 0.08), metallic=0.2, roughness=0.4)
    m_red = create_material("Rickshaw_VermilionRed", (0.88, 0.12, 0.08), metallic=0.1, roughness=0.4)
    m_blue = create_material("Rickshaw_IndigoBlue", (0.06, 0.22, 0.75), metallic=0.05, roughness=0.6)
    m_cyan = create_material("Rickshaw_CyanStripe", (0.10, 0.78, 0.88), metallic=0.05, roughness=0.5)
    m_white = create_material("Rickshaw_IvoryWhite", (0.95, 0.93, 0.88), metallic=0.05, roughness=0.5)
    m_wood = create_material("Rickshaw_FloorboardWood", (0.35, 0.20, 0.10), metallic=0.0, roughness=0.75)
    m_leather = create_material("Rickshaw_SeatLeather", (0.45, 0.08, 0.06), metallic=0.05, roughness=0.65)
    m_dark = create_material("Rickshaw_DarkPedal", (0.05, 0.05, 0.06), metallic=0.3, roughness=0.7)
    
    # Human Materials
    m_puller_skin = create_material("Puller_Skin", (0.42, 0.24, 0.14), metallic=0.0, roughness=0.75)
    m_puller_shirt = create_material("Puller_FatuaShirt", (0.15, 0.35, 0.68), metallic=0.0, roughness=0.85)
    m_puller_lungi = create_material("Puller_Lungi", (0.12, 0.48, 0.42), metallic=0.0, roughness=0.85)
    m_gamcha = create_material("Puller_GamchaScarf", (0.85, 0.22, 0.18), metallic=0.0, roughness=0.9)
    m_sandal = create_material("Sandal_Leather", (0.18, 0.12, 0.08), metallic=0.0, roughness=0.8)
    
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
    # 1. THREE WHEELS (Named pivots for Three.js rotation)
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
    # Brass bell on left bar
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

    # Driver saddle
    create_box("SaddleBase", (0.0, 0, 1.17), (0.34, 0.28, 0.08), m_leather, bevel=0.03)
    create_cylinder_between("SaddlePost", (0.0, 0, 1.15), (0.04, 0, 0.95), 0.026, m_chrome)
    create_sphere("Spring_L", (-0.10, -0.09, 1.14), 0.035, (1.0, 1.0, 1.2), m_chrome)
    create_sphere("Spring_R", (-0.10, 0.09, 1.14), 0.035, (1.0, 1.0, 1.2), m_chrome)

    # -------------------------------------------------------------
    # 3. PEDAL CRANK & ARTICULATED PEDALS
    # -------------------------------------------------------------
    crank_pivot = bpy.data.objects.new("pedal_crank", None)
    bpy.context.collection.objects.link(crank_pivot)
    crank_pivot.location = (0.12, 0, 0.76)
    
    # Gold chainring
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.14,
        depth=0.015,
        location=(0.12, 0.04, 0.76),
        rotation=(math.pi / 2, 0, 0)
    )
    chainring = assign_material(bpy.context.object, m_yellow)
    chainring.name = "Chainring"
    chainring.parent = crank_pivot
    
    # Crank arms (180 deg offset)
    crank_radius = 0.17
    # Left crank arm pointing forward-up (+X)
    c_arm_l = create_cylinder_between("CrankArm_L", (0.12, -0.13, 0.76), (0.12 + crank_radius, -0.13, 0.76), 0.018, m_chrome, parent=crank_pivot)
    # Right crank arm pointing backward-down (-X)
    c_arm_r = create_cylinder_between("CrankArm_R", (0.12, 0.13, 0.76), (0.12 - crank_radius, 0.13, 0.76), 0.018, m_chrome, parent=crank_pivot)
    
    # Left Pedal
    pedal_l = create_box("Pedal_L", (0.12 + crank_radius, -0.17, 0.76), (0.12, 0.08, 0.035), m_dark, bevel=0.008, parent=crank_pivot)
    # Right Pedal
    pedal_r = create_box("Pedal_R", (0.12 - crank_radius, 0.17, 0.76), (0.12, 0.08, 0.035), m_dark, bevel=0.008, parent=crank_pivot)

    # -------------------------------------------------------------
    # 4. CARRIAGE, PASSENGER CABIN & FOLK ART
    # -------------------------------------------------------------
    # Main carriage chassis frame
    create_box("CarriageFloor", (-0.72, 0, 0.78), (1.10, 1.56, 0.06), m_wood)
    create_box("FloorboardFrame", (-0.72, 0, 0.74), (1.12, 1.58, 0.04), m_frame)
    create_cylinder_between("RearAxle", (-1.13, -0.78, wheel_radius), (-1.13, 0.78, wheel_radius), 0.035, m_frame)
    # Leaf springs
    create_box("LeafSpring_L", (-1.13, -0.65, 0.68), (0.45, 0.08, 0.05), m_frame)
    create_box("LeafSpring_R", (-1.13, 0.65, 0.68), (0.45, 0.08, 0.05), m_frame)

    # Passenger Footrest
    create_box("FootrestBoard", (-0.28, 0, 0.72), (0.36, 1.30, 0.04), m_wood, bevel=0.01)

    # Rear seat base & cushion
    create_box("SeatBaseBox", (-0.85, 0, 0.94), (0.64, 1.44, 0.32), m_teal, bevel=0.02)
    create_box("SeatCushion", (-0.80, 0, 1.14), (0.58, 1.40, 0.12), m_leather, bevel=0.04)
    create_box("SeatBackrest", (-1.18, 0, 1.42), (0.12, 1.40, 0.48), m_leather, bevel=0.04)

    # Carriage Painted Side Panels with Dhaka Folk Art
    for side, sign in [("L", -1), ("R", 1)]:
        y = sign * 0.76
        # Side wall
        create_box(f"CarriageWall_{side}", (-0.82, y, 1.05), (0.84, 0.04, 0.44), m_teal, bevel=0.01)
        # Gold accent trim
        create_box(f"CarriageTrim_{side}", (-0.82, y + sign * 0.022, 1.05), (0.80, 0.01, 0.03), m_yellow)
        # Brass armrest rail
        create_cylinder_between(f"ArmrestRail_{side}", (-1.18, y, 1.32), (-0.42, y, 1.18), 0.018, m_brass)
        create_cylinder_between(f"ArmrestPost_{side}", (-0.42, y, 0.78), (-0.42, y, 1.18), 0.018, m_brass)
        # Rear mudguard
        create_cylinder_between(f"RearMudguard_{side}", (-1.45, y, 0.88), (-0.80, y, 0.88), 0.08, m_teal, verts=8)

    # Scalloped Canopy Roof & Folding Bows
    canopy_start_x, canopy_end_x = -1.48, -0.15
    canopy_z_top = 2.24
    canopy_width = 1.62
    create_cylinder_between("CanopyBowFront", (-0.35, -0.78, 1.25), (-0.35, -0.78, canopy_z_top - 0.2), 0.022, m_chrome)
    create_cylinder_between("CanopyBowFront_R", (-0.35, 0.78, 1.25), (-0.35, 0.78, canopy_z_top - 0.2), 0.022, m_chrome)
    create_cylinder_between("CanopyBowRear_L", (-1.25, -0.78, 1.25), (-1.25, -0.78, canopy_z_top - 0.1), 0.022, m_chrome)
    create_cylinder_between("CanopyBowRear_R", (-1.25, 0.78, 1.25), (-1.25, 0.78, canopy_z_top - 0.1), 0.022, m_chrome)

    # Canopy arched roof segments (colorful stitched panels)
    panel_colors = [m_blue, m_cyan, m_white, m_yellow, m_red, m_cyan, m_blue]
    panel_count = len(panel_colors)
    step_x = (canopy_end_x - canopy_start_x) / panel_count
    for i, p_mat in enumerate(panel_colors):
        px = canopy_start_x + (i + 0.5) * step_x
        create_box(f"CanopyPanel_{i}", (px, 0, canopy_z_top), (step_x * 0.96, canopy_width, 0.03), p_mat, bevel=0.01)

    # Hanging decorative tassels along side rim
    for i in range(10):
        tx = canopy_start_x + (i / 9.0) * (canopy_end_x - canopy_start_x)
        for sign in [-1, 1]:
            ty = sign * (canopy_width * 0.5 + 0.01)
            t_mat = m_yellow if (i % 2 == 0) else m_red
            create_sphere(f"Tassel_{i}_{sign}", (tx, ty, canopy_z_top - 0.08), 0.032, (0.8, 0.8, 1.8), t_mat, segs=8, rings=6)

    # Rear Folk Art Tin Plate ("আল্লাহর দান" / peacock folk art plate)
    create_box("RearTinPlate", (-1.28, 0, 1.05), (0.04, 1.25, 0.42), m_yellow, bevel=0.01)
    create_box("RearArtEmblem", (-1.31, 0, 1.05), (0.02, 0.85, 0.28), m_red, bevel=0.008)
    create_sphere("RearRosetteCenter", (-1.33, 0, 1.05), 0.045, (0.4, 1.0, 1.0), m_teal, segs=10, rings=8)
    create_box("RearSafetyReflector", (-1.33, 0, 0.78), (0.03, 0.24, 0.08), m_red, bevel=0.005)

    # -------------------------------------------------------------
    # 5. RICKSHAW PULLER (FULL BODY: HEAD, FACE, ARMS, TORSO, PELVIS, LEGS, FEET)
    # -------------------------------------------------------------
    puller_group = bpy.data.objects.new("RickshawPuller", None)
    bpy.context.collection.objects.link(puller_group)
    puller_group.location = (0.0, 0.0, 0.0)

    # Saddle / Pelvis
    puller_pelvis = create_box("Puller_Pelvis", (0.02, 0.0, 1.22), (0.24, 0.28, 0.16), m_puller_lungi, bevel=0.02, parent=puller_group)
    
    # Torso (leaning forward toward handlebars)
    create_box("Puller_Torso", (0.16, 0.0, 1.44), (0.26, 0.36, 0.38), m_puller_shirt, bevel=0.04, parent=puller_group)
    
    # Gamcha scarf draped around neck & chest
    create_cylinder_between("Puller_Gamcha_L", (0.24, -0.12, 1.62), (0.18, -0.06, 1.34), 0.042, m_gamcha, verts=8, parent=puller_group)
    create_cylinder_between("Puller_Gamcha_R", (0.24, 0.12, 1.62), (0.18, 0.06, 1.34), 0.042, m_gamcha, verts=8, parent=puller_group)
    create_sphere("Puller_GamchaKnot", (0.24, 0.0, 1.42), 0.05, (1.0, 1.2, 1.0), m_gamcha, segs=10, rings=8, parent=puller_group)

    # Neck
    create_cylinder_between("Puller_Neck", (0.22, 0.0, 1.58), (0.26, 0.0, 1.70), 0.055, m_puller_skin, verts=10, parent=puller_group)

    # Full Realistic 3D Face
    build_head_and_face("Puller", (0.28, 0.0, 1.82), m_puller_skin, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair, parent=puller_group, is_female=False)

    # Arms reaching forward to grip handlebars
    # Left Arm
    create_cylinder_between("Puller_UpperArm_L", (0.20, -0.18, 1.56), (0.54, -0.26, 1.50), 0.052, m_puller_shirt, verts=10, parent=puller_group)
    create_cylinder_between("Puller_Forearm_L", (0.54, -0.26, 1.50), (0.95, -0.34, 1.66), 0.042, m_puller_skin, verts=10, parent=puller_group)
    create_sphere("Puller_Hand_L", (0.96, -0.35, 1.67), 0.048, (1.2, 0.9, 0.9), m_puller_skin, segs=10, rings=8, parent=puller_group)
    
    # Right Arm
    create_cylinder_between("Puller_UpperArm_R", (0.20, 0.18, 1.56), (0.54, 0.26, 1.50), 0.052, m_puller_shirt, verts=10, parent=puller_group)
    create_cylinder_between("Puller_Forearm_R", (0.54, 0.26, 1.50), (0.95, 0.34, 1.66), 0.042, m_puller_skin, verts=10, parent=puller_group)
    create_sphere("Puller_Hand_R", (0.96, 0.35, 1.67), 0.048, (1.2, 0.9, 0.9), m_puller_skin, segs=10, rings=8, parent=puller_group)

    # Articulated Pedaling Legs (Named for Three.js kinetics & live pedaling loop)
    # Left Leg (pedal at forward position: X = 0.12 + 0.17 = 0.29, Y = -0.17, Z = 0.76)
    hip_l = (0.05, -0.12, 1.18)
    knee_l = (0.26, -0.16, 0.98)
    ankle_l = (0.28, -0.17, 0.78)
    create_cylinder_between("Puller_Thigh_L", hip_l, knee_l, 0.068, m_puller_lungi, verts=12, parent=puller_group)
    create_cylinder_between("Puller_Shin_L", knee_l, ankle_l, 0.052, m_puller_skin, verts=10, parent=puller_group)
    create_box("Puller_Foot_L", (ankle_l[0] + 0.04, ankle_l[1], ankle_l[2] - 0.02), (0.16, 0.075, 0.04), m_sandal, bevel=0.01, parent=puller_group)

    # Right Leg (pedal at rear position: X = 0.12 - 0.17 = -0.05, Y = 0.17, Z = 0.76)
    hip_r = (0.05, 0.12, 1.18)
    knee_r = (0.02, 0.16, 0.94)
    ankle_r = (-0.05, 0.17, 0.78)
    create_cylinder_between("Puller_Thigh_R", hip_r, knee_r, 0.068, m_puller_lungi, verts=12, parent=puller_group)
    create_cylinder_between("Puller_Shin_R", knee_r, ankle_r, 0.052, m_puller_skin, verts=10, parent=puller_group)
    create_box("Puller_Foot_R", (ankle_r[0] + 0.04, ankle_r[1], ankle_r[2] - 0.02), (0.16, 0.075, 0.04), m_sandal, bevel=0.01, parent=puller_group)

    # -------------------------------------------------------------
    # 6. PASSENGER LEFT: MALE IN PANJABI (100% COMPLETE ANATOMY)
    # -------------------------------------------------------------
    pass_m_group = bpy.data.objects.new("Passenger_Male", None)
    bpy.context.collection.objects.link(pass_m_group)
    pass_m_group.location = (-0.72, -0.32, 0.0)

    # Pelvis resting on seat cushion
    create_box("PassM_Pelvis", (0, 0, 1.18), (0.28, 0.32, 0.16), m_pass_m_pants, bevel=0.02, parent=pass_m_group)
    # Torso leaning slightly back against upholstered backrest
    create_box("PassM_Torso", (-0.04, 0, 1.44), (0.24, 0.36, 0.40), m_pass_m_shirt, bevel=0.03, parent=pass_m_group)
    # Panjabi button placket
    create_box("PassM_Placket", (0.09, 0, 1.48), (0.02, 0.04, 0.26), m_frame, parent=pass_m_group)
    # Neck
    create_cylinder_between("PassM_Neck", (-0.02, 0, 1.62), (0.0, 0, 1.72), 0.05, m_pass_m_skin, verts=10, parent=pass_m_group)
    # 3D Face
    build_head_and_face("PassM", (0.02, 0, 1.84), m_pass_m_skin, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair, parent=pass_m_group, is_female=False)

    # Arms resting on lap
    create_cylinder_between("PassM_Arm_L", (-0.02, -0.18, 1.56), (0.16, -0.16, 1.30), 0.05, m_pass_m_shirt, verts=10, parent=pass_m_group)
    create_cylinder_between("PassM_Forearm_L", (0.16, -0.16, 1.30), (0.26, -0.06, 1.24), 0.042, m_pass_m_skin, verts=10, parent=pass_m_group)
    create_sphere("PassM_Hand_L", (0.27, -0.05, 1.24), 0.045, (1.2, 0.9, 0.9), m_pass_m_skin, segs=8, rings=6, parent=pass_m_group)
    
    create_cylinder_between("PassM_Arm_R", (-0.02, 0.18, 1.56), (0.16, 0.16, 1.30), 0.05, m_pass_m_shirt, verts=10, parent=pass_m_group)
    create_cylinder_between("PassM_Forearm_R", (0.16, 0.16, 1.30), (0.26, 0.06, 1.24), 0.042, m_pass_m_skin, verts=10, parent=pass_m_group)
    create_sphere("PassM_Hand_R", (0.27, 0.05, 1.24), 0.045, (1.2, 0.9, 0.9), m_pass_m_skin, segs=8, rings=6, parent=pass_m_group)

    # LOWER BODY: Thighs extending horizontally forward over cushion, knees bent 90 deg, shins down to floorboard!
    for side, sign in [("L", -1), ("R", 1)]:
        leg_y = sign * 0.10
        # Horizontal thigh
        create_cylinder_between(f"PassM_Thigh_{side}", (0.02, leg_y, 1.18), (0.36, leg_y, 1.18), 0.065, m_pass_m_pants, verts=12, parent=pass_m_group)
        # Vertical shin down to floorboard
        create_cylinder_between(f"PassM_Shin_{side}", (0.36, leg_y, 1.18), (0.36, leg_y, 0.82), 0.054, m_pass_m_pants, verts=10, parent=pass_m_group)
        # Foot wearing sandal resting on floorboard
        create_box(f"PassM_Foot_{side}", (0.42, leg_y, 0.80), (0.16, 0.075, 0.038), m_sandal, bevel=0.01, parent=pass_m_group)

    # -------------------------------------------------------------
    # 7. PASSENGER RIGHT: FEMALE IN SAREE (100% COMPLETE ANATOMY)
    # -------------------------------------------------------------
    pass_f_group = bpy.data.objects.new("Passenger_Female", None)
    bpy.context.collection.objects.link(pass_f_group)
    pass_f_group.location = (-0.72, 0.32, 0.0)

    # Pelvis on seat cushion
    create_box("PassF_Pelvis", (0, 0, 1.18), (0.28, 0.32, 0.16), m_pass_f_saree, bevel=0.02, parent=pass_f_group)
    # Torso
    create_box("PassF_Torso", (-0.04, 0, 1.42), (0.22, 0.34, 0.38), m_pass_f_saree, bevel=0.03, parent=pass_f_group)
    # Orna / Saree pallu drape across chest
    create_cylinder_between("PassF_OrnaDrape", (0.06, -0.14, 1.54), (-0.02, 0.14, 1.30), 0.046, m_pass_f_orna, verts=8, parent=pass_f_group)
    create_box("PassF_PalluTail", (-0.12, 0.16, 1.18), (0.06, 0.14, 0.35), m_pass_f_orna, bevel=0.02, parent=pass_f_group)
    # Neck
    create_cylinder_between("PassF_Neck", (-0.02, 0, 1.60), (0.0, 0, 1.70), 0.045, m_pass_f_skin, verts=10, parent=pass_f_group)
    # 3D Face with earrings & hair bun
    build_head_and_face("PassF", (0.02, 0, 1.82), m_pass_f_skin, m_hair, m_eye_white, m_iris, m_lip, parent=pass_f_group, is_female=True)
    # Gold Earrings
    create_sphere("PassF_Earring_L", (0.02, -0.13, 1.79), 0.016, (1.0, 1.0, 1.5), m_yellow, segs=8, rings=6, parent=pass_f_group)
    create_sphere("PassF_Earring_R", (0.02, 0.13, 1.79), 0.016, (1.0, 1.0, 1.5), m_yellow, segs=8, rings=6, parent=pass_f_group)

    # Arms folded gracefully in lap
    create_cylinder_between("PassF_Arm_L", (-0.02, -0.17, 1.52), (0.14, -0.14, 1.28), 0.045, m_pass_f_saree, verts=10, parent=pass_f_group)
    create_cylinder_between("PassF_Forearm_L", (0.14, -0.14, 1.28), (0.24, -0.04, 1.22), 0.038, m_pass_f_skin, verts=10, parent=pass_f_group)
    create_sphere("PassF_Hand_L", (0.25, -0.03, 1.22), 0.04, (1.2, 0.9, 0.9), m_pass_f_skin, segs=8, rings=6, parent=pass_f_group)
    
    create_cylinder_between("PassF_Arm_R", (-0.02, 0.17, 1.52), (0.14, 0.14, 1.28), 0.045, m_pass_f_saree, verts=10, parent=pass_f_group)
    create_cylinder_between("PassF_Forearm_R", (0.14, 0.14, 1.28), (0.24, 0.04, 1.22), 0.038, m_pass_f_skin, verts=10, parent=pass_f_group)
    create_sphere("PassF_Hand_R", (0.25, 0.03, 1.22), 0.04, (1.2, 0.9, 0.9), m_pass_f_skin, segs=8, rings=6, parent=pass_f_group)

    # LOWER BODY: Saree-draped thighs extending forward, shins down, sandals on floorboard!
    for side, sign in [("L", -1), ("R", 1)]:
        leg_y = sign * 0.09
        create_cylinder_between(f"PassF_Thigh_{side}", (0.02, leg_y, 1.18), (0.35, leg_y, 1.18), 0.068, m_pass_f_saree, verts=12, parent=pass_f_group)
        create_cylinder_between(f"PassF_Shin_{side}", (0.35, leg_y, 1.18), (0.35, leg_y, 0.82), 0.056, m_pass_f_saree, verts=10, parent=pass_f_group)
        create_box(f"PassF_Foot_{side}", (0.41, leg_y, 0.80), (0.15, 0.07, 0.035), m_sandal, bevel=0.01, parent=pass_f_group)

    # -------------------------------------------------------------
    # 8. EXPORT TO GLTF/GLB
    # -------------------------------------------------------------
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        use_selection=False,
        export_apply=False, # Preserve pivots and parent transforms!
        export_yup=True,
        export_materials="EXPORT",
    )
    print("SUCCESSFULLY EXPORTED CYCLE RICKSHAW TO:", OUTPUT)

if __name__ == "__main__":
    build()
