import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "dhaka-bus.glb")

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
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

def create_bus_wheel(name, center, radius, width, tire_mat, rim_mat, hub_mat):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = center
    
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.08,
        minor_radius=0.08,
        major_segments=32,
        minor_segments=8,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    tire = assign_material(bpy.context.object, tire_mat)
    tire.name = name + "_tire"
    tire.parent = pivot
    smooth_mesh(tire)
    
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=radius * 0.65,
        depth=width * 0.88,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    rim = assign_material(bpy.context.object, rim_mat)
    rim.name = name + "_rim"
    rim.parent = pivot
    smooth_mesh(rim)
    
    create_cylinder_between(f"{name}_hub", (center[0], center[1] - width * 0.5, center[2]), (center[0], center[1] + width * 0.5, center[2]), 0.065, hub_mat, verts=10, parent=pivot)
    return pivot

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None, parent=None, is_female=False):
    x, y, z = center
    head_group = bpy.data.objects.new(f"{name_prefix}_HeadGroup", None)
    bpy.context.collection.objects.link(head_group)
    head_group.location = (x, y, z)
    if parent:
        head_group.parent = parent
        
    create_sphere(f"{name_prefix}_Cranium", (0, 0, 0), 0.12, (1.05, 0.92, 1.18), skin_mat, segs=14, rings=10, parent=head_group)
    create_sphere(f"{name_prefix}_Jaw", (0.04, 0, -0.045), 0.075, (1.0, 0.78, 0.85), skin_mat, segs=10, rings=8, parent=head_group)
    create_sphere(f"{name_prefix}_Hair", (-0.015, 0, 0.04), 0.122, (1.04, 0.96, 1.12), hair_mat, segs=12, rings=8, parent=head_group)
    
    # Left & Right Ears
    create_sphere(f"{name_prefix}_Ear_L", (0.0, -0.11, -0.01), 0.03, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6, parent=head_group)
    create_sphere(f"{name_prefix}_Ear_R", (0.0, 0.11, -0.01), 0.03, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6, parent=head_group)
    
    # Eyes & Pupils
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = sign * 0.04
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (0.105, eye_y, 0.015), 0.02, (0.6, 1.0, 0.8), eye_white_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Pupil_{side}", (0.115, eye_y, 0.015), 0.01, (0.5, 0.9, 0.9), iris_mat, segs=6, rings=4, parent=head_group)
        create_box(f"{name_prefix}_Eyebrow_{side}", (0.108, eye_y, 0.036), (0.015, 0.038, 0.01), hair_mat, bevel=0.002, parent=head_group)
    
    # Nose
    create_cylinder_between(f"{name_prefix}_NoseBridge", (0.095, 0, 0.03), (0.13, 0, -0.012), 0.012, skin_mat, verts=8, parent=head_group)
    create_sphere(f"{name_prefix}_NoseTip", (0.132, 0, -0.015), 0.016, (1.0, 1.0, 0.9), skin_mat, segs=8, rings=6, parent=head_group)
    
    # Lips
    create_box(f"{name_prefix}_LipUpper", (0.115, 0, -0.042), (0.015, 0.042, 0.009), lip_mat, bevel=0.002, parent=head_group)
    create_box(f"{name_prefix}_LipLower", (0.112, 0, -0.054), (0.015, 0.038, 0.01), lip_mat, bevel=0.002, parent=head_group)
    
    if mustache_mat and not is_female:
        create_sphere(f"{name_prefix}_Mustache_L", (0.122, -0.02, -0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Mustache_R", (0.122, 0.02, -0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
    return head_group

def build():
    clear_scene()

    # Materials
    # Authentic Dhaka Red Bus Paint with Clearcoat
    m_bus_red = create_material("Bus_RedPaint", (0.85, 0.12, 0.12), metallic=0.2, roughness=0.3, clearcoat=0.9)
    m_bus_green = create_material("Bus_GreenStripe", (0.05, 0.65, 0.35), metallic=0.1, roughness=0.35)
    m_bus_yellow = create_material("Bus_YellowStripe", (0.95, 0.75, 0.10), metallic=0.1, roughness=0.35)
    m_roof_white = create_material("Bus_RoofIvory", (0.92, 0.92, 0.90), metallic=0.05, roughness=0.5)
    m_bumper_dark = create_material("Bus_DarkBumper", (0.08, 0.09, 0.10), metallic=0.2, roughness=0.8)
    m_tire = create_material("Bus_TireRubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    m_steel_rim = create_material("Bus_SteelRim", (0.75, 0.78, 0.80), metallic=0.85, roughness=0.25)
    m_chrome = create_material("Bus_ChromeGrille", (0.85, 0.88, 0.90), metallic=0.95, roughness=0.15)
    m_interior = create_material("Bus_InteriorFloor", (0.18, 0.18, 0.20), metallic=0.1, roughness=0.8)
    m_seat_fabric = create_material("Bus_SeatBlue", (0.12, 0.25, 0.65), metallic=0.05, roughness=0.8)
    m_glass = create_material("Bus_WindowGlass", (0.12, 0.22, 0.28), metallic=0.15, roughness=0.05)
    m_dest_sign = create_material("Bus_DestSignLED", (0.95, 0.95, 0.85), emission=(0.95, 0.95, 0.85), emission_strength=3.5)
    m_headlight = create_material("Bus_HeadlightLED", (1.0, 1.0, 0.9), emission=(1.0, 1.0, 0.8), emission_strength=4.5)
    m_taillight = create_material("Bus_TaillightLED", (0.9, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=4.0)

    # Human Materials
    m_skin_d = create_material("Bus_DriverSkin", (0.46, 0.28, 0.16), metallic=0.0, roughness=0.75)
    m_skin_p1 = create_material("Bus_PassSkin1", (0.50, 0.32, 0.20), metallic=0.0, roughness=0.75)
    m_skin_p2 = create_material("Bus_PassSkin2", (0.58, 0.36, 0.24), metallic=0.0, roughness=0.75)
    m_hair = create_material("Human_Hair", (0.03, 0.025, 0.02), metallic=0.0, roughness=0.9)
    m_eye_white = create_material("Eye_Sclera", (0.95, 0.95, 0.95), metallic=0.0, roughness=0.2)
    m_iris = create_material("Eye_Iris", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.2)
    m_lip = create_material("Human_Lips", (0.52, 0.22, 0.18), metallic=0.0, roughness=0.5)

    # Colorful Dhaka attire for passengers
    m_shirt_blue = create_material("Shirt_SkyBlue", (0.22, 0.58, 0.85), metallic=0.0, roughness=0.8)
    m_shirt_orange = create_material("Shirt_Orange", (0.92, 0.42, 0.12), metallic=0.0, roughness=0.8)
    m_shirt_teal = create_material("Shirt_Teal", (0.10, 0.62, 0.55), metallic=0.0, roughness=0.8)
    m_shirt_purple = create_material("Shirt_Purple", (0.55, 0.20, 0.65), metallic=0.0, roughness=0.8)
    m_shirt_yellow = create_material("Shirt_Yellow", (0.95, 0.80, 0.15), metallic=0.0, roughness=0.8)
    m_pants_dark = create_material("Pants_Charcoal", (0.10, 0.12, 0.15), metallic=0.0, roughness=0.85)

    # -------------------------------------------------------------
    # 1. WHEELS (4 Distinct Wheels with Named Pivots)
    # -------------------------------------------------------------
    wheel_radius = 0.52
    wheel_width = 0.24
    front_x, rear_x = 2.45, -2.15
    track_y = 1.05
    w_fl = create_bus_wheel("wheel_front_left", (front_x, -track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome)
    w_fr = create_bus_wheel("wheel_front_right", (front_x, track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome)
    w_rl = create_bus_wheel("wheel_rear_left", (rear_x, -track_y, wheel_radius), wheel_radius, wheel_width * 1.3, m_tire, m_steel_rim, m_chrome)
    w_rr = create_bus_wheel("wheel_rear_right", (rear_x, track_y, wheel_radius), wheel_radius, wheel_width * 1.3, m_tire, m_steel_rim, m_chrome)

    # -------------------------------------------------------------
    # 2. BUS BODYWORK & EXTENDED PANELS
    # -------------------------------------------------------------
    bus_len, bus_wid, bus_hgt = 8.6, 2.42, 2.85
    # Chassis floor pan
    create_box("ChassisFloor", (0, 0, 0.65), (bus_len, bus_wid, 0.12), m_interior)

    # Lower Red Body Shell (below window waistline)
    create_box("LowerBodyRed", (0, 0, 1.15), (bus_len, bus_wid, 0.90), m_bus_red, bevel=0.06)

    # Bangladesh Green & Yellow Waist Stripes
    create_box("GreenStripe", (0, 0, 1.48), (bus_len + 0.02, bus_wid + 0.02, 0.12), m_bus_green)
    create_box("YellowStripe", (0, 0, 1.36), (bus_len + 0.02, bus_wid + 0.02, 0.06), m_bus_yellow)

    # Front Sloped Face & Radiator Grille
    create_box("FrontNoseCowl", (bus_len * 0.5 - 0.20, 0, 1.25), (0.45, bus_wid, 1.0), m_bus_red, bevel=0.08)
    create_box("RadiatorGrille", (bus_len * 0.5 + 0.02, 0, 1.05), (0.04, 1.45, 0.44), m_chrome, bevel=0.02)
    create_box("FrontBumper", (bus_len * 0.5 + 0.04, 0, 0.68), (0.16, bus_wid + 0.08, 0.22), m_bumper_dark, bevel=0.03)

    # Dual Headlights & Indicators
    for side, sign in [("L", -1), ("R", 1)]:
        hy = sign * 0.88
        create_box(f"Headlight_{side}", (bus_len * 0.5 + 0.03, hy, 1.05), (0.04, 0.24, 0.18), m_headlight, bevel=0.02)
        create_box(f"Indicator_{side}", (bus_len * 0.5 + 0.03, hy + sign * 0.18, 1.05), (0.03, 0.08, 0.14), m_bus_yellow)

    # Illuminated Destination Sign ("মিরপুর ১০ ➔ ফার্মগেট ➔ মতিঝিল")
    create_box("DestSignHousing", (bus_len * 0.5 - 0.15, 0, 2.68), (0.15, 1.85, 0.32), m_bumper_dark, bevel=0.02)
    create_box("DestSignGlass", (bus_len * 0.5 - 0.06, 0, 2.68), (0.02, 1.75, 0.24), m_dest_sign)

    # Panoramic Glass Windows (Left, Right, Front & Rear)
    # Front Windshield
    create_box("Windshield", (bus_len * 0.5 - 0.10, 0, 2.05), (0.06, bus_wid - 0.15, 0.95), m_glass)
    # Left & Right Passenger Windows (Continuous Tinted Panoramic Ribbon)
    create_box("Windows_L", (-0.15, -bus_wid * 0.5, 2.05), (bus_len - 1.2, 0.04, 0.85), m_glass)
    create_box("Windows_R", (-0.15, bus_wid * 0.5, 2.05), (bus_len - 1.2, 0.04, 0.85), m_glass)
    # Rear Window
    create_box("RearWindow", (-bus_len * 0.5 + 0.05, 0, 2.05), (0.04, bus_wid - 0.30, 0.75), m_glass)

    # White Curved Roof with AC pods & Emergency Hatches
    create_box("RoofStructure", (0, 0, 2.72), (bus_len, bus_wid, 0.22), m_roof_white, bevel=0.08)
    create_box("RoofHatch_1", (1.2, 0, 2.85), (0.85, 0.85, 0.08), m_roof_white, bevel=0.02)
    create_box("RoofHatch_2", (-1.8, 0, 2.85), (0.85, 0.85, 0.08), m_roof_white, bevel=0.02)

    # Rear Bumper & Taillights
    create_box("RearBumper", (-bus_len * 0.5 - 0.04, 0, 0.68), (0.16, bus_wid + 0.08, 0.22), m_bumper_dark, bevel=0.03)
    create_box("Taillight_L", (-bus_len * 0.5 - 0.03, -0.92, 1.15), (0.04, 0.16, 0.32), m_taillight)
    create_box("Taillight_R", (-bus_len * 0.5 - 0.03, 0.92, 1.15), (0.04, 0.16, 0.32), m_taillight)

    # -------------------------------------------------------------
    # 3. INTERIOR SEATING & CABIN DETAILS
    # -------------------------------------------------------------
    # Passenger Seats (Rows of paired blue seats visible through panoramic glass)
    seat_xs = [2.2, 1.1, 0.0, -1.1, -2.2, -3.3]
    for row_i, sx in enumerate(seat_xs):
        # Left pair
        create_box(f"Seat_L_{row_i}", (sx, -0.72, 1.05), (0.55, 0.70, 0.12), m_seat_fabric, bevel=0.02)
        create_box(f"Backrest_L_{row_i}", (sx - 0.24, -0.72, 1.35), (0.08, 0.68, 0.50), m_seat_fabric, bevel=0.02)
        # Right pair
        create_box(f"Seat_R_{row_i}", (sx, 0.72, 1.05), (0.55, 0.70, 0.12), m_seat_fabric, bevel=0.02)
        create_box(f"Backrest_R_{row_i}", (sx - 0.24, 0.72, 1.35), (0.08, 0.68, 0.50), m_seat_fabric, bevel=0.02)

    # Handrails & Stanchion grab poles
    create_cylinder_between("OverheadRail_L", (3.2, -0.35, 2.45), (-3.6, -0.35, 2.45), 0.02, m_chrome)
    create_cylinder_between("OverheadRail_R", (3.2, 0.35, 2.45), (-3.6, 0.35, 2.45), 0.02, m_chrome)

    # -------------------------------------------------------------
    # 4. FULL-BODIED DRIVER (SEATED WITH STEERING WHEEL & 3D FACE)
    # -------------------------------------------------------------
    driver_group = bpy.data.objects.new("Bus_Driver", None)
    bpy.context.collection.objects.link(driver_group)
    driver_group.location = (3.25, -0.65, 0.70)

    # Driver seat
    create_box("DriverSeat", (0, 0, 0.35), (0.48, 0.48, 0.14), m_seat_fabric, bevel=0.02, parent=driver_group)
    # Large angled bus steering wheel
    create_cylinder_between("SteeringColumn", (0.55, 0, 0.30), (0.42, 0, 0.78), 0.035, m_bumper_dark, verts=8, parent=driver_group)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.22,
        minor_radius=0.022,
        major_segments=24,
        minor_segments=8,
        location=(3.25 + 0.38, -0.65, 0.70 + 0.82),
        rotation=(math.radians(35), 0, 0)
    )
    s_wheel = assign_material(bpy.context.object, m_bumper_dark)
    s_wheel.name = "BusSteeringWheel"
    s_wheel.parent = driver_group

    # Driver Body
    create_box("Driver_Pelvis", (0, 0, 0.45), (0.24, 0.30, 0.16), m_pants_dark, bevel=0.02, parent=driver_group)
    create_box("Driver_Torso", (0.02, 0, 0.74), (0.26, 0.36, 0.38), m_shirt_blue, bevel=0.04, parent=driver_group)
    create_cylinder_between("Driver_Neck", (0.05, 0, 0.94), (0.08, 0, 1.06), 0.052, m_skin_d, verts=10, parent=driver_group)
    build_head_and_face("BusDriver", (0.10, 0, 1.18), m_skin_d, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair, parent=driver_group)

    # Driver Arms gripping steering wheel
    create_cylinder_between("Driver_Arm_L", (0.05, -0.16, 0.88), (0.28, -0.18, 0.82), 0.05, m_shirt_blue, verts=10, parent=driver_group)
    create_cylinder_between("Driver_Forearm_L", (0.28, -0.18, 0.82), (0.40, -0.14, 0.84), 0.042, m_skin_d, verts=10, parent=driver_group)
    create_sphere("Driver_Hand_L", (0.41, -0.13, 0.84), 0.044, (1.2, 0.9, 0.9), m_skin_d, parent=driver_group)
    
    create_cylinder_between("Driver_Arm_R", (0.05, 0.16, 0.88), (0.28, 0.18, 0.82), 0.05, m_shirt_blue, verts=10, parent=driver_group)
    create_cylinder_between("Driver_Forearm_R", (0.28, 0.18, 0.82), (0.40, 0.14, 0.84), 0.042, m_skin_d, verts=10, parent=driver_group)
    create_sphere("Driver_Hand_R", (0.41, 0.13, 0.84), 0.044, (1.2, 0.9, 0.9), m_skin_d, parent=driver_group)

    # Driver Legs & Feet
    for side, sign in [("L", -1), ("R", 1)]:
        ly = sign * 0.11
        create_cylinder_between(f"Driver_Thigh_{side}", (0.02, ly, 0.45), (0.34, ly, 0.45), 0.065, m_pants_dark, verts=12, parent=driver_group)
        create_cylinder_between(f"Driver_Shin_{side}", (0.34, ly, 0.45), (0.34, ly, 0.10), 0.055, m_pants_dark, verts=10, parent=driver_group)
        create_box(f"Driver_Foot_{side}", (0.39, ly, 0.08), (0.16, 0.08, 0.04), m_bumper_dark, bevel=0.01, parent=driver_group)

    # -------------------------------------------------------------
    # 5. 6 FULL-BODIED PASSENGERS VISIBLE THROUGH WINDOWS
    # -------------------------------------------------------------
    pass_configs = [
        # x, y, shirt_mat, skin_mat, is_female
        (1.1, -0.72, m_shirt_orange, m_skin_p1, False),
        (0.0, -0.72, m_shirt_teal, m_skin_p2, True),
        (-1.1, -0.72, m_shirt_purple, m_skin_p1, False),
        (2.2, 0.72, m_shirt_yellow, m_skin_p2, False),
        (0.0, 0.72, m_shirt_blue, m_skin_p1, False),
        (-2.2, 0.72, m_shirt_orange, m_skin_p2, True),
    ]

    for pi, (px, py, p_shirt, p_skin, p_fem) in enumerate(pass_configs):
        p_grp = bpy.data.objects.new(f"Passenger_{pi}", None)
        bpy.context.collection.objects.link(p_grp)
        p_grp.location = (px, py, 1.05)

        # Pelvis & Torso
        create_box(f"P_Pelvis_{pi}", (0, 0, 0.10), (0.24, 0.28, 0.14), m_pants_dark, bevel=0.02, parent=p_grp)
        create_box(f"P_Torso_{pi}", (-0.02, 0, 0.36), (0.24, 0.34, 0.36), p_shirt, bevel=0.04, parent=p_grp)
        create_cylinder_between(f"P_Neck_{pi}", (0.0, 0, 0.54), (0.02, 0, 0.65), 0.048, p_skin, verts=10, parent=p_grp)
        build_head_and_face(f"P_{pi}", (0.04, 0, 0.78), p_skin, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=(m_hair if not p_fem else None), parent=p_grp, is_female=p_fem)

        # Arms
        create_cylinder_between(f"P_Arm_L_{pi}", (-0.02, -0.16, 0.48), (0.12, -0.14, 0.26), 0.044, p_shirt, verts=10, parent=p_grp)
        create_cylinder_between(f"P_Forearm_L_{pi}", (0.12, -0.14, 0.26), (0.22, -0.06, 0.22), 0.036, p_skin, verts=10, parent=p_grp)
        create_sphere(f"P_Hand_L_{pi}", (0.23, -0.05, 0.22), 0.038, (1.2, 0.9, 0.9), p_skin, parent=p_grp)

        create_cylinder_between(f"P_Arm_R_{pi}", (-0.02, 0.16, 0.48), (0.12, 0.14, 0.26), 0.044, p_shirt, verts=10, parent=p_grp)
        create_cylinder_between(f"P_Forearm_R_{pi}", (0.12, 0.14, 0.26), (0.22, 0.06, 0.22), 0.036, p_skin, verts=10, parent=p_grp)
        create_sphere(f"P_Hand_R_{pi}", (0.23, 0.05, 0.22), 0.038, (1.2, 0.9, 0.9), p_skin, parent=p_grp)

        # Complete Lower Body: Thighs forward, shins down, feet on floor!
        for side, sign in [("L", -1), ("R", 1)]:
            ply = sign * 0.09
            create_cylinder_between(f"P_Thigh_{pi}_{side}", (0.02, ply, 0.10), (0.30, ply, 0.10), 0.06, m_pants_dark, verts=12, parent=p_grp)
            create_cylinder_between(f"P_Shin_{pi}_{side}", (0.30, ply, 0.10), (0.30, ply, -0.35), 0.052, m_pants_dark, verts=10, parent=p_grp)
            create_box(f"P_Foot_{pi}_{side}", (0.35, ply, -0.37), (0.15, 0.075, 0.038), m_bumper_dark, bevel=0.01, parent=p_grp)

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
    print("SUCCESSFULLY EXPORTED DHAKA BUS TO:", OUTPUT)

if __name__ == "__main__":
    build()
