import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "private-car.glb")

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

def create_car_wheel(name, center, radius, width, tire_mat, rim_mat, hub_mat):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = center
    
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.055,
        minor_radius=0.055,
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
        radius=radius * 0.72,
        depth=width * 0.85,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    rim = assign_material(bpy.context.object, rim_mat)
    rim.name = name + "_rim"
    rim.parent = pivot
    smooth_mesh(rim)
    
    create_cylinder_between(f"{name}_hub", (center[0], center[1] - width * 0.5, center[2]), (center[0], center[1] + width * 0.5, center[2]), 0.045, hub_mat, verts=10, parent=pivot)
    return pivot

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None, parent=None):
    x, y, z = center
    head_group = bpy.data.objects.new(f"{name_prefix}_HeadGroup", None)
    bpy.context.collection.objects.link(head_group)
    head_group.location = (x, y, z)
    if parent:
        head_group.parent = parent
        
    create_sphere(f"{name_prefix}_Cranium", (0, 0, 0), 0.11, (1.05, 0.92, 1.18), skin_mat, segs=14, rings=10, parent=head_group)
    create_sphere(f"{name_prefix}_Jaw", (0.038, 0, -0.04), 0.07, (1.0, 0.78, 0.85), skin_mat, segs=10, rings=8, parent=head_group)
    create_sphere(f"{name_prefix}_Hair", (-0.015, 0, 0.035), 0.112, (1.04, 0.96, 1.12), hair_mat, segs=12, rings=8, parent=head_group)
    
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = sign * 0.038
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (0.095, eye_y, 0.015), 0.018, (0.6, 1.0, 0.8), eye_white_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Pupil_{side}", (0.105, eye_y, 0.015), 0.009, (0.5, 0.9, 0.9), iris_mat, segs=6, rings=4, parent=head_group)
        create_box(f"{name_prefix}_Eyebrow_{side}", (0.098, eye_y, 0.034), (0.015, 0.034, 0.009), hair_mat, parent=head_group)
    
    create_cylinder_between(f"{name_prefix}_NoseBridge", (0.085, 0, 0.026), (0.118, 0, -0.01), 0.011, skin_mat, verts=8, parent=head_group)
    create_sphere(f"{name_prefix}_NoseTip", (0.12, 0, -0.012), 0.014, (1.0, 1.0, 0.9), skin_mat, segs=8, rings=6, parent=head_group)
    create_box(f"{name_prefix}_LipUpper", (0.105, 0, -0.038), (0.014, 0.038, 0.008), lip_mat, parent=head_group)
    create_box(f"{name_prefix}_LipLower", (0.102, 0, -0.048), (0.014, 0.034, 0.009), lip_mat, parent=head_group)
    return head_group

def build():
    clear_scene()

    # Materials
    # Premium Silver-Platinum Metallic Clearcoat (Clearcoat 1.0)
    m_car_paint = create_material("Car_PaintPlatinum", (0.82, 0.84, 0.86), metallic=0.75, roughness=0.18, clearcoat=1.0)
    m_trim_dark = create_material("Car_TrimAnthracite", (0.08, 0.09, 0.10), metallic=0.6, roughness=0.4)
    m_tire = create_material("Car_TireRubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    m_alloy_rim = create_material("Car_AlloyRim", (0.78, 0.80, 0.82), metallic=0.85, roughness=0.25)
    m_chrome = create_material("Car_ChromeAccent", (0.88, 0.90, 0.92), metallic=0.95, roughness=0.15)
    m_glass = create_material("Car_WindshieldGlass", (0.10, 0.18, 0.24), metallic=0.3, roughness=0.05)
    m_interior = create_material("Car_InteriorDark", (0.08, 0.09, 0.10), metallic=0.1, roughness=0.8)
    m_seat_leather = create_material("Car_SeatLeather", (0.14, 0.14, 0.15), metallic=0.05, roughness=0.7)
    
    # LED Lights
    m_headlight = create_material("Car_HeadlightLED", (1.0, 1.0, 1.0), emission=(0.8, 0.95, 1.0), emission_strength=5.0)
    m_taillight = create_material("Car_TaillightLED", (0.95, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=4.5)

    # Driver Materials
    m_skin_d = create_material("Car_DriverSkin", (0.50, 0.32, 0.20), metallic=0.0, roughness=0.75)
    m_shirt_white = create_material("Car_DriverShirt", (0.92, 0.92, 0.90), metallic=0.0, roughness=0.8)
    m_pants_dark = create_material("Car_DriverPants", (0.10, 0.12, 0.15), metallic=0.0, roughness=0.85)
    m_hair = create_material("Human_Hair", (0.03, 0.025, 0.02), metallic=0.0, roughness=0.9)
    m_eye_white = create_material("Eye_Sclera", (0.95, 0.95, 0.95), metallic=0.0, roughness=0.2)
    m_iris = create_material("Eye_Iris", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.2)
    m_lip = create_material("Human_Lips", (0.52, 0.22, 0.18), metallic=0.0, roughness=0.5)

    # -------------------------------------------------------------
    # 1. WHEELS (4 Distinct Wheels with Named Pivots)
    # -------------------------------------------------------------
    wheel_radius = 0.33
    wheel_width = 0.20
    front_x, rear_x = 1.35, -1.35
    track_y = 0.85
    w_fl = create_car_wheel("wheel_front_left", (front_x, -track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)
    w_fr = create_car_wheel("wheel_front_right", (front_x, track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)
    w_rl = create_car_wheel("wheel_rear_left", (rear_x, -track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)
    w_rr = create_car_wheel("wheel_rear_right", (rear_x, track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)

    # -------------------------------------------------------------
    # 2. CHASSIS & AERODYNAMIC BODYWORK
    # -------------------------------------------------------------
    car_len, car_wid, car_hgt = 4.65, 1.88, 1.42
    # Floor pan
    create_box("ChassisFloor", (0, 0, 0.35), (car_len, car_wid, 0.10), m_interior)

    # Lower body sill & rockers
    create_box("LowerSill", (0, 0, 0.52), (car_len, car_wid, 0.32), m_car_paint, bevel=0.05)

    # Front Hood & Fenders (Aerodynamic sculpted slope)
    create_box("FrontHood", (1.42, 0, 0.76), (1.45, car_wid, 0.22), m_car_paint, bevel=0.06)
    create_box("FrontBumper", (2.22, 0, 0.54), (0.24, car_wid - 0.08, 0.34), m_car_paint, bevel=0.04)
    create_box("FrontGrille", (2.32, 0, 0.52), (0.04, 1.15, 0.22), m_trim_dark, bevel=0.01)

    # Dual Sharp LED Headlights
    for side, sign in [("L", -1), ("R", 1)]:
        hy = sign * 0.72
        create_box(f"Headlight_{side}", (2.18, hy, 0.72), (0.16, 0.32, 0.12), m_headlight, bevel=0.02)
        create_box(f"Foglight_{side}", (2.28, hy, 0.42), (0.04, 0.16, 0.08), m_headlight, bevel=0.01)

    # Passenger Cabin Greenhouse (A, B, C Pillars + Roof)
    create_box("CabinRoof", (-0.12, 0, 1.36), (2.15, 1.48, 0.12), m_car_paint, bevel=0.06)
    # Windshield (sloped at ~40 deg)
    create_box("Windshield", (0.82, 0, 1.12), (0.08, 1.42, 0.52), m_glass)
    # Rear Windshield
    create_box("RearWindshield", (-1.18, 0, 1.14), (0.08, 1.38, 0.48), m_glass)
    # Side Windows
    create_box("SideWindows_L", (-0.12, -0.74, 1.12), (1.82, 0.04, 0.42), m_glass)
    create_box("SideWindows_R", (-0.12, 0.74, 1.12), (1.82, 0.04, 0.42), m_glass)

    # Rear Trunk & Taillight Bar
    create_box("RearTrunk", (-1.75, 0, 0.82), (1.05, car_wid, 0.28), m_car_paint, bevel=0.05)
    create_box("RearBumper", (-2.22, 0, 0.54), (0.22, car_wid - 0.08, 0.34), m_car_paint, bevel=0.04)
    # Continuous Sleek LED Taillight Bar
    create_box("TaillightBar", (-2.28, 0, 0.82), (0.04, car_wid - 0.15, 0.08), m_taillight, bevel=0.01)
    # Dual Chrome Exhaust Outlets
    create_cylinder_between("Exhaust_L", (-2.25, -0.55, 0.34), (-2.34, -0.55, 0.34), 0.038, m_chrome)
    create_cylinder_between("Exhaust_R", (-2.25, 0.55, 0.34), (-2.34, 0.55, 0.34), 0.038, m_chrome)

    # -------------------------------------------------------------
    # 3. INTERIOR CABIN & SEATING
    # -------------------------------------------------------------
    # Dashboard & Instrument Cluster
    create_box("Dashboard", (0.72, 0, 0.82), (0.35, 1.45, 0.22), m_interior, bevel=0.02)
    create_box("CenterConsole", (0.15, 0, 0.58), (0.85, 0.26, 0.22), m_interior, bevel=0.02)
    # Front Seats
    create_box("Seat_Driver", (0.12, -0.42, 0.54), (0.48, 0.48, 0.16), m_seat_leather, bevel=0.03)
    create_box("Backrest_Driver", (-0.10, -0.42, 0.85), (0.10, 0.46, 0.48), m_seat_leather, bevel=0.03)
    create_box("Seat_Pass", (0.12, 0.42, 0.54), (0.48, 0.48, 0.16), m_seat_leather, bevel=0.03)
    create_box("Backrest_Pass", (-0.10, 0.42, 0.85), (0.10, 0.46, 0.48), m_seat_leather, bevel=0.03)
    # Rear Bench Seat
    create_box("RearBenchSeat", (-0.85, 0, 0.54), (0.52, 1.35, 0.16), m_seat_leather, bevel=0.03)
    create_box("RearBackrest", (-1.08, 0, 0.85), (0.10, 1.32, 0.48), m_seat_leather, bevel=0.03)

    # -------------------------------------------------------------
    # 4. FULL-BODIED DRIVER (SEATED WITH STEERING WHEEL & 3D FACE)
    # -------------------------------------------------------------
    driver_group = bpy.data.objects.new("Car_Driver", None)
    bpy.context.collection.objects.link(driver_group)
    driver_group.location = (0.12, -0.42, 0.54)

    # Steering Wheel on Steering Column
    create_cylinder_between("SteeringColumn", (0.45, 0, 0.18), (0.32, 0, 0.38), 0.025, m_trim_dark, verts=8, parent=driver_group)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.16,
        minor_radius=0.018,
        major_segments=24,
        minor_segments=8,
        location=(0.12 + 0.30, -0.42, 0.54 + 0.40),
        rotation=(math.radians(25), 0, 0)
    )
    c_wheel = assign_material(bpy.context.object, m_trim_dark)
    c_wheel.name = "CarSteeringWheel"
    c_wheel.parent = driver_group

    # Driver Pelvis & Torso
    create_box("Driver_Pelvis", (0, 0, 0.12), (0.22, 0.28, 0.14), m_pants_dark, bevel=0.02, parent=driver_group)
    create_box("Driver_Torso", (-0.02, 0, 0.36), (0.24, 0.32, 0.34), m_shirt_white, bevel=0.03, parent=driver_group)
    create_cylinder_between("Driver_Neck", (0.01, 0, 0.52), (0.03, 0, 0.62), 0.046, m_skin_d, verts=10, parent=driver_group)
    build_head_and_face("CarDriver", (0.05, 0, 0.74), m_skin_d, m_hair, m_eye_white, m_iris, m_lip, parent=driver_group)

    # Driver Arms gripping steering wheel
    create_cylinder_between("Driver_Arm_L", (0.0, -0.15, 0.48), (0.20, -0.14, 0.42), 0.044, m_shirt_white, verts=10, parent=driver_group)
    create_cylinder_between("Driver_Forearm_L", (0.20, -0.14, 0.42), (0.30, -0.10, 0.42), 0.036, m_skin_d, verts=10, parent=driver_group)
    create_sphere("Driver_Hand_L", (0.31, -0.09, 0.42), 0.038, (1.2, 0.9, 0.9), m_skin_d, parent=driver_group)

    create_cylinder_between("Driver_Arm_R", (0.0, 0.15, 0.48), (0.20, 0.14, 0.42), 0.044, m_shirt_white, verts=10, parent=driver_group)
    create_cylinder_between("Driver_Forearm_R", (0.20, 0.14, 0.42), (0.30, 0.10, 0.42), 0.036, m_skin_d, verts=10, parent=driver_group)
    create_sphere("Driver_Hand_R", (0.31, 0.09, 0.42), 0.038, (1.2, 0.9, 0.9), m_skin_d, parent=driver_group)

    # Driver Legs extending forward to pedals
    for side, sign in [("L", -1), ("R", 1)]:
        ly = sign * 0.09
        create_cylinder_between(f"Driver_Thigh_{side}", (0.02, ly, 0.12), (0.32, ly, 0.12), 0.058, m_pants_dark, verts=12, parent=driver_group)
        create_cylinder_between(f"Driver_Shin_{side}", (0.32, ly, 0.12), (0.42, ly, -0.15), 0.050, m_pants_dark, verts=10, parent=driver_group)
        create_box(f"Driver_Foot_{side}", (0.46, ly, -0.16), (0.15, 0.07, 0.035), m_trim_dark, bevel=0.01, parent=driver_group)

    # -------------------------------------------------------------
    # 5. EXPORT TO GLTF/GLB
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
    print("SUCCESSFULLY EXPORTED PRIVATE CAR TO:", OUTPUT)

if __name__ == "__main__":
    build()
