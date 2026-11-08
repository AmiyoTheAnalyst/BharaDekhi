import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "cng-autorickshaw.glb")

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

def create_cng_wheel(name, center, radius, width, tire_mat, rim_mat, hub_mat):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = center
    
    # Outer rubber tire
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.045,
        minor_radius=0.045,
        major_segments=32,
        minor_segments=8,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    tire = assign_material(bpy.context.object, tire_mat)
    tire.name = name + "_tire"
    tire.parent = pivot
    smooth_mesh(tire)
    
    # Pressed steel wheel rim
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=radius * 0.72,
        depth=width * 0.85,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    rim = assign_material(bpy.context.object, rim_mat)
    rim.name = name + "_rim"
    rim.parent = pivot
    smooth_mesh(rim)
    
    # Hub & Lug Nuts
    create_cylinder_between(f"{name}_hub", (center[0], center[1] - width * 0.5, center[2]), (center[0], center[1] + width * 0.5, center[2]), 0.04, hub_mat, verts=10, parent=pivot)
    return pivot

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None, parent=None):
    x, y, z = center
    head_group = bpy.data.objects.new(f"{name_prefix}_HeadGroup", None)
    bpy.context.collection.objects.link(head_group)
    head_group.location = (x, y, z)
    if parent:
        head_group.parent = parent
        
    head = create_sphere(f"{name_prefix}_Cranium", (0, 0, 0), 0.12, (1.05, 0.92, 1.18), skin_mat, segs=16, rings=12, parent=head_group)
    create_sphere(f"{name_prefix}_Jaw", (0.04, 0, -0.045), 0.075, (1.0, 0.78, 0.85), skin_mat, segs=12, rings=8, parent=head_group)
    create_sphere(f"{name_prefix}_Hair", (-0.015, 0, 0.04), 0.122, (1.04, 0.96, 1.12), hair_mat, segs=14, rings=10, parent=head_group)
    
    # Left & Right Ears
    create_sphere(f"{name_prefix}_Ear_L", (0.0, -0.11, -0.01), 0.032, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6, parent=head_group)
    create_sphere(f"{name_prefix}_Ear_R", (0.0, 0.11, -0.01), 0.032, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6, parent=head_group)
    
    # Eyes & Pupils (facing forward +X)
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = sign * 0.042
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (0.105, eye_y, 0.015), 0.02, (0.6, 1.0, 0.8), eye_white_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Pupil_{side}", (0.116, eye_y, 0.015), 0.01, (0.5, 0.9, 0.9), iris_mat, segs=6, rings=4, parent=head_group)
        create_box(f"{name_prefix}_Eyebrow_{side}", (0.108, eye_y, 0.038), (0.015, 0.038, 0.01), hair_mat, bevel=0.002, parent=head_group)
    
    # Nose & Nostrils
    create_cylinder_between(f"{name_prefix}_NoseBridge", (0.095, 0, 0.03), (0.13, 0, -0.012), 0.012, skin_mat, verts=8, parent=head_group)
    create_sphere(f"{name_prefix}_NoseTip", (0.132, 0, -0.015), 0.016, (1.0, 1.0, 0.9), skin_mat, segs=8, rings=6, parent=head_group)
    
    # Lips / Mouth
    create_box(f"{name_prefix}_LipUpper", (0.115, 0, -0.042), (0.015, 0.042, 0.009), lip_mat, bevel=0.002, parent=head_group)
    create_box(f"{name_prefix}_LipLower", (0.112, 0, -0.054), (0.015, 0.038, 0.01), lip_mat, bevel=0.002, parent=head_group)
    
    # Mustache
    if mustache_mat:
        create_sphere(f"{name_prefix}_Mustache_L", (0.122, -0.02, -0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Mustache_R", (0.122, 0.02, -0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
    return head_group

def build():
    clear_scene()

    # Materials
    # Authentic Dhaka Emerald Green Sheet Metal with Clearcoat (matches photo!)
    m_cng_green = create_material("CNG_ChassisGreen", (0.02, 0.58, 0.41), metallic=0.15, roughness=0.35, clearcoat=0.8)
    m_cng_yellow = create_material("CNG_AccentYellow", (0.98, 0.76, 0.12), metallic=0.1, roughness=0.4)
    m_canvas_black = create_material("CNG_BlackCanvas", (0.08, 0.08, 0.09), metallic=0.0, roughness=0.92)
    m_wire_mesh = create_material("CNG_WireMeshDoor", (0.02, 0.48, 0.32), metallic=0.6, roughness=0.45)
    m_tire = create_material("CNG_TireRubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    m_steel_rim = create_material("CNG_SteelRim", (0.75, 0.78, 0.80), metallic=0.8, roughness=0.3)
    m_chrome = create_material("CNG_ChromeBumper", (0.85, 0.88, 0.90), metallic=0.95, roughness=0.15)
    m_dark = create_material("CNG_DarkInterior", (0.10, 0.11, 0.12), metallic=0.2, roughness=0.7)
    m_glass = create_material("CNG_WindshieldGlass", (0.10, 0.18, 0.22), metallic=0.2, roughness=0.08)
    m_seat_vinyl = create_material("CNG_SeatVinyl", (0.14, 0.14, 0.15), metallic=0.0, roughness=0.75)
    
    # Festive Bunting Flag Materials (Red, Yellow, Blue, Green across door tops!)
    m_flag_red = create_material("Flag_Red", (0.90, 0.12, 0.10), metallic=0.0, roughness=0.8)
    m_flag_yellow = create_material("Flag_Yellow", (0.98, 0.82, 0.10), metallic=0.0, roughness=0.8)
    m_flag_blue = create_material("Flag_Blue", (0.10, 0.45, 0.92), metallic=0.0, roughness=0.8)
    m_flag_green = create_material("Flag_Green", (0.08, 0.75, 0.35), metallic=0.0, roughness=0.8)

    # Lighting & Fare Meter Emitters
    m_headlight = create_material("CNG_Headlight", (1.0, 0.95, 0.85), emission=(1.0, 0.92, 0.7), emission_strength=4.0)
    m_taillight = create_material("CNG_Taillight", (0.9, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=4.0)
    m_fare_meter = create_material("CNG_FareMeterLED", (0.1, 1.0, 0.2), emission=(0.1, 1.0, 0.2), emission_strength=3.0)

    # Human Materials
    m_skin_driver = create_material("Driver_Skin", (0.45, 0.28, 0.16), metallic=0.0, roughness=0.75)
    m_skin_pass = create_material("Passenger_Skin", (0.52, 0.32, 0.20), metallic=0.0, roughness=0.75)
    m_driver_shirt = create_material("Driver_Shirt", (0.85, 0.82, 0.75), metallic=0.0, roughness=0.85)
    m_driver_pants = create_material("Driver_Pants", (0.12, 0.15, 0.22), metallic=0.0, roughness=0.85)
    m_pass_shirt = create_material("Pass_Shirt", (0.85, 0.25, 0.15), metallic=0.0, roughness=0.85)
    m_pass_pants = create_material("Pass_Pants", (0.10, 0.12, 0.15), metallic=0.0, roughness=0.85)
    m_hair = create_material("Human_Hair", (0.03, 0.025, 0.02), metallic=0.0, roughness=0.9)
    m_eye_white = create_material("Eye_Sclera", (0.95, 0.95, 0.95), metallic=0.0, roughness=0.2)
    m_iris = create_material("Eye_Iris", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.2)
    m_lip = create_material("Human_Lips", (0.52, 0.22, 0.18), metallic=0.0, roughness=0.5)

    # -------------------------------------------------------------
    # 1. WHEELS (1 Front, 2 Rear)
    # -------------------------------------------------------------
    wheel_radius = 0.26
    wheel_width = 0.11
    # Front wheel
    w_front = create_cng_wheel("wheel_front", (1.05, 0.0, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome)
    # Rear Left & Right wheels
    w_rear_l = create_cng_wheel("wheel_rear_left", (-0.75, -0.58, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome)
    w_rear_r = create_cng_wheel("wheel_rear_right", (-0.75, 0.58, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome)

    # -------------------------------------------------------------
    # 2. CHASSIS & LOWER BODY
    # -------------------------------------------------------------
    # Main floor pan
    create_box("FloorPan", (0.0, 0, 0.32), (2.35, 1.25, 0.08), m_dark)
    # Lower Green Sheet Metal Tub
    create_box("LowerTub", (-0.05, 0, 0.52), (2.30, 1.28, 0.36), m_cng_green, bevel=0.04)
    # Yellow Rocker Bottom Accent Stripe
    create_box("YellowStripe", (-0.05, 0, 0.36), (2.32, 1.30, 0.06), m_cng_yellow)

    # Sloped Front Nose Apron
    create_box("FrontNose", (0.92, 0, 0.62), (0.42, 0.88, 0.44), m_cng_green, bevel=0.05)
    create_cylinder_between("FrontMudguard", (0.85, 0, 0.44), (1.20, 0, 0.42), 0.16, m_cng_green, verts=8)

    # Round Chrome Headlamp & Turn Signals
    create_sphere("HeadlampShell", (1.15, 0, 0.64), 0.085, (0.4, 1.0, 1.0), m_chrome)
    create_sphere("HeadlampLens", (1.18, 0, 0.64), 0.075, (0.3, 1.0, 1.0), m_headlight)
    create_box("Indicator_L", (1.08, -0.38, 0.64), (0.04, 0.06, 0.04), m_cng_yellow)
    create_box("Indicator_R", (1.08, 0.38, 0.64), (0.04, 0.06, 0.04), m_cng_yellow)

    # Laminated Windshield & Frame
    create_box("WindshieldFrame", (0.64, 0, 1.15), (0.08, 1.18, 0.68), m_cng_green, bevel=0.02)
    create_box("WindshieldGlass", (0.65, 0, 1.15), (0.03, 1.08, 0.58), m_glass)
    create_cylinder_between("WiperArm", (0.67, 0, 0.90), (0.68, 0.18, 1.25), 0.012, m_dark)

    # Handlebar Steering & Digital Fare Meter
    create_cylinder_between("SteeringStem", (0.52, 0, 0.68), (0.46, 0, 0.94), 0.028, m_chrome)
    create_cylinder_between("Handlebar", (0.46, -0.32, 0.94), (0.46, 0.32, 0.94), 0.018, m_chrome)
    create_cylinder_between("Grip_L", (0.46, -0.24, 0.94), (0.46, -0.32, 0.94), 0.024, m_tire)
    create_cylinder_between("Grip_R", (0.46, 0.24, 0.94), (0.46, 0.32, 0.94), 0.024, m_tire)
    
    # Digital Fare Meter Console ("ডিজিটাল মিটার")
    create_box("FareMeterBox", (0.54, 0.18, 0.96), (0.08, 0.14, 0.08), m_dark, bevel=0.005)
    create_box("FareMeterScreen", (0.51, 0.18, 0.96), (0.01, 0.10, 0.04), m_fare_meter)

    # -------------------------------------------------------------
    # 3. BLACK CANVAS SOFT-TOP CANOPY ROOF
    # -------------------------------------------------------------
    # Overhead roof frame & curved canvas
    create_box("CanvasRoof", (-0.18, 0, 1.62), (1.82, 1.28, 0.12), m_canvas_black, bevel=0.06)
    create_box("CanopyBackCurve", (-1.10, 0, 1.34), (0.24, 1.26, 0.52), m_canvas_black, bevel=0.05)
    # Rear window cut-out
    create_box("RearWindowGlass", (-1.22, 0, 1.36), (0.02, 0.72, 0.32), m_glass)

    # -------------------------------------------------------------
    # 4. DIAMOND WIRE-MESH SAFETY GATES & BUNTING FLAGS (AUTHENTIC DHAKA!)
    # -------------------------------------------------------------
    door_start_x, door_end_x = -0.55, 0.42
    door_z_bottom, door_z_top = 0.52, 1.48
    for side, sign in [("L", -1), ("R", 1)]:
        door_y = sign * 0.64
        # Outer gate perimeter frame
        create_box(f"DoorFrame_{side}", ((door_start_x + door_end_x) * 0.5, door_y, (door_z_bottom + door_z_top) * 0.5), (door_end_x - door_start_x, 0.03, door_z_top - door_z_bottom), m_wire_mesh, bevel=0.01)
        # Diamond Wire-Mesh Grille Bars
        bar_count = 8
        for b in range(bar_count):
            bx = door_start_x + (b / float(bar_count - 1)) * (door_end_x - door_start_x)
            create_cylinder_between(f"MeshBarV_{side}_{b}", (bx, door_y, door_z_bottom + 0.04), (bx, door_y, door_z_top - 0.04), 0.007, m_wire_mesh, verts=6)
        
        # Colorful Triangular Bunting Flags strung across top door frame!
        flag_colors = [m_flag_red, m_flag_yellow, m_flag_blue, m_flag_green, m_flag_red, m_flag_yellow]
        flag_count = len(flag_colors)
        f_step = (door_end_x - door_start_x) / flag_count
        for fi, f_mat in enumerate(flag_colors):
            fx = door_start_x + (fi + 0.5) * f_step
            create_box(f"BuntingFlag_{side}_{fi}", (fx, door_y + sign * 0.01, door_z_top - 0.04), (f_step * 0.85, 0.01, 0.06), f_mat, bevel=0.003)

    # -------------------------------------------------------------
    # 5. REAR SPARE TIRE & BUMPER
    # -------------------------------------------------------------
    create_cylinder_between("RearSpareTire", (-1.26, 0, 0.72), (-1.38, 0, 0.72), wheel_radius * 0.95, m_tire, verts=18)
    create_cylinder_between("RearSpareRim", (-1.35, 0, 0.72), (-1.40, 0, 0.72), wheel_radius * 0.55, m_steel_rim, verts=12)
    # Rear bumper bar
    create_cylinder_between("RearBumper", (-1.22, -0.66, 0.38), (-1.22, 0.66, 0.38), 0.03, m_chrome)
    create_box("Taillight_L", (-1.21, -0.52, 0.52), (0.04, 0.12, 0.06), m_taillight)
    create_box("Taillight_R", (-1.21, 0.52, 0.52), (0.04, 0.12, 0.06), m_taillight)

    # -------------------------------------------------------------
    # 6. FULL-BODIED CNG DRIVER (HEAD, 3D FACE, ARMS, LEGS, FEET)
    # -------------------------------------------------------------
    driver_group = bpy.data.objects.new("CNG_Driver", None)
    bpy.context.collection.objects.link(driver_group)
    driver_group.location = (0.24, 0.0, 0.0)

    # Front driver bench seat
    create_box("DriverBench", (0.0, 0, 0.58), (0.34, 0.65, 0.14), m_seat_vinyl, bevel=0.02, parent=driver_group)
    
    # Driver Pelvis
    create_box("Driver_Pelvis", (0.02, 0, 0.68), (0.22, 0.28, 0.14), m_driver_pants, bevel=0.02, parent=driver_group)
    # Torso
    create_box("Driver_Torso", (0.04, 0, 0.92), (0.24, 0.34, 0.34), m_driver_shirt, bevel=0.03, parent=driver_group)
    # Neck
    create_cylinder_between("Driver_Neck", (0.06, 0, 1.08), (0.08, 0, 1.18), 0.05, m_skin_driver, verts=10, parent=driver_group)
    # 3D Face with Mustache & Hair
    build_head_and_face("Driver", (0.10, 0, 1.28), m_skin_driver, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair, parent=driver_group)

    # Arms reaching forward to handlebar grips
    create_cylinder_between("Driver_Arm_L", (0.06, -0.16, 1.02), (0.22, -0.22, 0.94), 0.048, m_driver_shirt, verts=10, parent=driver_group)
    create_cylinder_between("Driver_Forearm_L", (0.22, -0.22, 0.94), (0.36, -0.24, 0.94), 0.040, m_skin_driver, verts=10, parent=driver_group)
    create_sphere("Driver_Hand_L", (0.37, -0.24, 0.94), 0.042, (1.2, 0.9, 0.9), m_skin_driver, parent=driver_group)

    create_cylinder_between("Driver_Arm_R", (0.06, 0.16, 1.02), (0.22, 0.22, 0.94), 0.048, m_driver_shirt, verts=10, parent=driver_group)
    create_cylinder_between("Driver_Forearm_R", (0.22, 0.22, 0.94), (0.36, 0.24, 0.94), 0.040, m_skin_driver, verts=10, parent=driver_group)
    create_sphere("Driver_Hand_R", (0.37, 0.24, 0.94), 0.042, (1.2, 0.9, 0.9), m_skin_driver, parent=driver_group)

    # Legs & Feet (Full lower body!)
    for side, sign in [("L", -1), ("R", 1)]:
        dy = sign * 0.10
        create_cylinder_between(f"Driver_Thigh_{side}", (0.04, dy, 0.68), (0.32, dy, 0.68), 0.062, m_driver_pants, verts=12, parent=driver_group)
        create_cylinder_between(f"Driver_Shin_{side}", (0.32, dy, 0.68), (0.32, dy, 0.38), 0.052, m_driver_pants, verts=10, parent=driver_group)
        create_box(f"Driver_Foot_{side}", (0.36, dy, 0.36), (0.15, 0.07, 0.038), m_dark, bevel=0.01, parent=driver_group)

    # -------------------------------------------------------------
    # 7. FULL-BODIED REAR PASSENGER (SEATED IN CABIN)
    # -------------------------------------------------------------
    pass_group = bpy.data.objects.new("CNG_Passenger", None)
    bpy.context.collection.objects.link(pass_group)
    pass_group.location = (-0.62, 0.18, 0.0)

    # Rear Bench Seat
    create_box("RearBench", (-0.68, 0, 0.58), (0.52, 1.18, 0.16), m_seat_vinyl, bevel=0.03)
    create_box("RearBackrest", (-0.94, 0, 0.88), (0.10, 1.16, 0.44), m_seat_vinyl, bevel=0.03)

    # Passenger Pelvis & Torso
    create_box("Pass_Pelvis", (0, 0, 0.68), (0.24, 0.28, 0.14), m_pass_pants, bevel=0.02, parent=pass_group)
    create_box("Pass_Torso", (-0.02, 0, 0.94), (0.22, 0.32, 0.36), m_pass_shirt, bevel=0.03, parent=pass_group)
    create_cylinder_between("Pass_Neck", (0.0, 0, 1.10), (0.02, 0, 1.20), 0.048, m_skin_pass, verts=10, parent=pass_group)
    build_head_and_face("CNGPass", (0.04, 0, 1.30), m_skin_pass, m_hair, m_eye_white, m_iris, m_lip, parent=pass_group)

    # Arms folded in lap
    create_cylinder_between("Pass_Arm_L", (-0.02, -0.16, 1.04), (0.12, -0.12, 0.82), 0.045, m_pass_shirt, verts=10, parent=pass_group)
    create_cylinder_between("Pass_Forearm_L", (0.12, -0.12, 0.82), (0.22, -0.04, 0.78), 0.038, m_skin_pass, verts=10, parent=pass_group)
    create_sphere("Pass_Hand_L", (0.23, -0.03, 0.78), 0.04, (1.2, 0.9, 0.9), m_skin_pass, parent=pass_group)

    create_cylinder_between("Pass_Arm_R", (-0.02, 0.16, 1.04), (0.12, 0.12, 0.82), 0.045, m_pass_shirt, verts=10, parent=pass_group)
    create_cylinder_between("Pass_Forearm_R", (0.12, 0.12, 0.82), (0.22, 0.04, 0.78), 0.038, m_skin_pass, verts=10, parent=pass_group)
    create_sphere("Pass_Hand_R", (0.23, 0.03, 0.78), 0.04, (1.2, 0.9, 0.9), m_skin_pass, parent=pass_group)

    # Lower Body: Thighs forward, shins down, feet on floor!
    for side, sign in [("L", -1), ("R", 1)]:
        py = sign * 0.09
        create_cylinder_between(f"Pass_Thigh_{side}", (0.02, py, 0.68), (0.30, py, 0.68), 0.06, m_pass_pants, verts=12, parent=pass_group)
        create_cylinder_between(f"Pass_Shin_{side}", (0.30, py, 0.68), (0.30, py, 0.38), 0.05, m_pass_pants, verts=10, parent=pass_group)
        create_box(f"Pass_Foot_{side}", (0.34, py, 0.36), (0.15, 0.07, 0.038), m_dark, bevel=0.01, parent=pass_group)

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
    print("SUCCESSFULLY EXPORTED CNG AUTO-RICKSHAW TO:", OUTPUT)

if __name__ == "__main__":
    build()
