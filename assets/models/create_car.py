import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "private-car.glb")

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.actions, bpy.data.armatures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

def create_material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=1.0, clearcoat=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color[:3], alpha)
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
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
        if alpha < 0.99:
            mat.blend_method = 'BLEND'
            if "Transmission Weight" in bsdf.inputs:
                bsdf.inputs["Transmission Weight"].default_value = 0.85
            elif "Transmission" in bsdf.inputs:
                bsdf.inputs["Transmission"].default_value = 0.85
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

def create_wedge_mesh(name, v0, v1, v2, v3, v4, v5, mat):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new(v) for v in [v0, v1, v2, v3, v4, v5]]
    bm.faces.new([verts[0], verts[1], verts[2]])
    bm.faces.new([verts[3], verts[5], verts[4]])
    bm.faces.new([verts[0], verts[3], verts[4], verts[1]])
    bm.faces.new([verts[1], verts[4], verts[5], verts[2]])
    bm.faces.new([verts[2], verts[5], verts[3], verts[0]])
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    smooth_mesh(obj)
    assign_material(obj, mat)
    return obj

def create_car_wheel(name, center, radius, width, tire_mat, rim_mat, hub_mat):
    parts = []
    
    # Outer rubber tire
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.05,
        minor_radius=0.05,
        major_segments=36,
        minor_segments=8,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    tire = assign_material(bpy.context.object, tire_mat)
    smooth_mesh(tire)
    parts.append(tire)
    
    # Silver alloy rim
    rim = create_cylinder_between(f"{name}_rim", (center[0], center[1] - width * 0.45, center[2]), (center[0], center[1] + width * 0.45, center[2]), radius * 0.68, rim_mat, verts=18)
    parts.append(rim)
    
    # Center hub
    hub = create_cylinder_between(f"{name}_hub", (center[0], center[1] - width * 0.52, center[2]), (center[0], center[1] + width * 0.52, center[2]), 0.05, hub_mat, verts=10)
    parts.append(hub)
    
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

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None):
    x, y, z = center
    create_sphere(f"{name_prefix}_Cranium", (x, y, z), 0.11, (1.05, 0.92, 1.18), skin_mat, segs=14, rings=10)
    create_sphere(f"{name_prefix}_Jaw", (x + 0.038, y, z - 0.04), 0.07, (1.0, 0.78, 0.85), skin_mat, segs=10, rings=8)
    create_sphere(f"{name_prefix}_Hair", (x - 0.015, y, z + 0.035), 0.112, (1.04, 0.96, 1.12), hair_mat, segs=12, rings=8)
    
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = y + sign * 0.038
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (x + 0.095, eye_y, z + 0.015), 0.018, (0.6, 1.0, 0.8), eye_white_mat, segs=8, rings=6)
        create_sphere(f"{name_prefix}_Pupil_{side}", (x + 0.105, eye_y, z + 0.015), 0.009, (0.5, 0.9, 0.9), iris_mat, segs=6, rings=4)
        create_box(f"{name_prefix}_Eyebrow_{side}", (x + 0.098, eye_y, z + 0.034), (0.015, 0.034, 0.009), hair_mat)
    
    create_cylinder_between(f"{name_prefix}_NoseBridge", (x + 0.085, y, z + 0.026), (x + 0.118, y, z - 0.01), 0.011, skin_mat, verts=8)
    create_sphere(f"{name_prefix}_NoseTip", (x + 0.12, y, z - 0.012), 0.014, (1.0, 1.0, 0.9), skin_mat, segs=8, rings=6)
    create_box(f"{name_prefix}_LipUpper", (x + 0.105, y, z - 0.038), (0.014, 0.038, 0.008), lip_mat)
    create_box(f"{name_prefix}_LipLower", (x + 0.102, y, z - 0.048), (0.014, 0.034, 0.009), lip_mat)
    return None

def build():
    clear_scene()

    # Materials
    # Premium Platinum Silver Metallic Sedan Paint (Toyota Allion/Premio style)
    m_body_silver = create_material("Car_SilverMetallic", (0.82, 0.84, 0.86), metallic=0.75, roughness=0.25, clearcoat=1.0)
    m_trim_dark = create_material("Car_DarkTrim", (0.08, 0.09, 0.10), metallic=0.3, roughness=0.7)
    m_chrome = create_material("Car_ChromeGrille", (0.90, 0.92, 0.95), metallic=0.98, roughness=0.10)
    m_tire = create_material("Car_TireRubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    m_alloy_rim = create_material("Car_AlloyRim", (0.80, 0.82, 0.85), metallic=0.85, roughness=0.2)
    m_interior = create_material("Car_InteriorDark", (0.12, 0.13, 0.15), metallic=0.05, roughness=0.8)
    # Transparent tinted glass
    m_glass = create_material("Car_WindowGlass", (0.12, 0.22, 0.28), metallic=0.15, roughness=0.05, alpha=0.35)
    
    # Emitters
    m_headlight = create_material("Car_HeadlightLED", (1.0, 1.0, 0.95), emission=(1.0, 1.0, 0.9), emission_strength=5.0)
    m_taillight = create_material("Car_TaillightLED", (0.9, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=4.0)

    # Human Materials
    m_skin_d = create_material("Driver_Skin", (0.48, 0.30, 0.18), metallic=0.0, roughness=0.75)
    m_shirt_white = create_material("Driver_ShirtWhite", (0.94, 0.94, 0.92), metallic=0.0, roughness=0.8)
    m_pants_dark = create_material("Driver_PantsNavy", (0.08, 0.10, 0.15), metallic=0.0, roughness=0.85)
    m_hair = create_material("Human_Hair", (0.03, 0.025, 0.02), metallic=0.0, roughness=0.9)
    m_eye_white = create_material("Eye_Sclera", (0.95, 0.95, 0.95), metallic=0.0, roughness=0.2)
    m_iris = create_material("Eye_Iris", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.2)
    m_lip = create_material("Human_Lips", (0.52, 0.22, 0.18), metallic=0.0, roughness=0.5)

    # -------------------------------------------------------------
    # 1. WHEELS (Single joined meshes named wheel_front_left, etc.)
    # -------------------------------------------------------------
    wheel_radius = 0.33
    wheel_width = 0.18
    front_x, rear_x = 1.35, -1.35
    track_y = 0.82
    w_fl = create_car_wheel("wheel_front_left", (front_x, -track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)
    w_fr = create_car_wheel("wheel_front_right", (front_x, track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)
    w_rl = create_car_wheel("wheel_rear_left", (rear_x, -track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)
    w_rr = create_car_wheel("wheel_rear_right", (rear_x, track_y, wheel_radius), wheel_radius, wheel_width, m_tire, m_alloy_rim, m_chrome)

    # -------------------------------------------------------------
    # 2. AERODYNAMIC SEDAN CHASSIS & SCULPTED BODYWORK
    # -------------------------------------------------------------
    car_len, car_wid = 4.25, 1.82
    # Chassis floor pan
    create_box("ChassisFloor", (0, 0, 0.34), (car_len, car_wid, 0.08), m_trim_dark)

    # Lower Body Main Sill
    create_box("LowerBodyMain", (0, 0, 0.54), (car_len * 0.95, car_wid, 0.36), m_body_silver, bevel=0.04)

    # Sloped Front Hood & Nose (aerodynamic wedge tapering forward)
    create_wedge_mesh(
        "HoodWedge",
        Vector((2.08, -car_wid * 0.48, 0.50)),
        Vector((2.08, car_wid * 0.48, 0.50)),
        Vector((2.08, 0.0, 0.60)),
        Vector((0.85, -car_wid * 0.48, 0.72)),
        Vector((0.85, car_wid * 0.48, 0.72)),
        Vector((0.85, 0.0, 0.80)),
        m_body_silver
    )

    # Front Bumper, Chrome Grille & Angled Headlights
    create_box("FrontBumper", (2.12, 0, 0.44), (0.16, car_wid + 0.04, 0.22), m_body_silver, bevel=0.03)
    create_box("ChromeGrille", (2.14, 0, 0.52), (0.03, 0.85, 0.16), m_chrome, bevel=0.01)
    for side, sign in [("L", -1), ("R", 1)]:
        hy = sign * 0.68
        create_box(f"Headlight_{side}", (2.08, hy, 0.62), (0.08, 0.30, 0.12), m_headlight, bevel=0.01)

    # Rear Trunk & Bumper (sloped sedan decklid)
    create_wedge_mesh(
        "TrunkWedge",
        Vector((-0.95, -car_wid * 0.46, 0.76)),
        Vector((-0.95, car_wid * 0.46, 0.76)),
        Vector((-0.95, 0.0, 0.80)),
        Vector((-2.05, -car_wid * 0.46, 0.68)),
        Vector((-2.05, car_wid * 0.46, 0.68)),
        Vector((-2.05, 0.0, 0.72)),
        m_body_silver
    )
    create_box("RearBumper", (-2.08, 0, 0.46), (0.16, car_wid + 0.04, 0.24), m_body_silver, bevel=0.03)
    create_box("Taillight_L", (-2.07, -0.65, 0.64), (0.05, 0.32, 0.12), m_taillight, bevel=0.01)
    create_box("Taillight_R", (-2.07, 0.65, 0.64), (0.05, 0.32, 0.12), m_taillight, bevel=0.01)

    # -------------------------------------------------------------
    # 3. CABIN GREENHOUSE (CURVED PILLARS & TRANSPARENT GLASS)
    # -------------------------------------------------------------
    # Roof top slab
    create_box("RoofStructure", (-0.05, 0, 1.34), (1.68, car_wid * 0.78, 0.08), m_body_silver, bevel=0.04)

    # A-Pillars (sloping from hood line up to roof)
    create_cylinder_between("A_Pillar_L", (0.85, -car_wid * 0.44, 0.72), (0.45, -car_wid * 0.38, 1.32), 0.026, m_body_silver)
    create_cylinder_between("A_Pillar_R", (0.85, car_wid * 0.44, 0.72), (0.45, car_wid * 0.38, 1.32), 0.026, m_body_silver)
    
    # C-Pillars (sloping from roof down to rear trunk)
    create_cylinder_between("C_Pillar_L", (-0.75, -car_wid * 0.38, 1.32), (-1.25, -car_wid * 0.44, 0.74), 0.030, m_body_silver)
    create_cylinder_between("C_Pillar_R", (-0.75, car_wid * 0.38, 1.32), (-1.25, car_wid * 0.44, 0.74), 0.030, m_body_silver)

    # B-Pillars (vertical center door pillar)
    create_box("B_Pillar_L", (-0.12, -car_wid * 0.44, 1.02), (0.08, 0.03, 0.58), m_trim_dark)
    create_box("B_Pillar_R", (-0.12, car_wid * 0.44, 1.02), (0.08, 0.03, 0.58), m_trim_dark)

    # Transparent Windows (Windshield, Rear, Sides)
    # Windshield (sloped)
    create_cylinder_between("WindshieldGlass", (0.85, 0, 0.74), (0.46, 0, 1.30), 0.55, m_glass, verts=14)
    # Rear Window (sloped)
    create_cylinder_between("RearWindowGlass", (-1.22, 0, 0.76), (-0.76, 0, 1.30), 0.52, m_glass, verts=14)
    # Side Window Panes
    create_box("SideWindows_L", (-0.12, -car_wid * 0.43, 1.02), (1.52, 0.015, 0.54), m_glass)
    create_box("SideWindows_R", (-0.12, car_wid * 0.43, 1.02), (1.52, 0.015, 0.54), m_glass)

    # -------------------------------------------------------------
    # 4. INTERIOR & FULL-BODIED DRIVER (WITH STEERING WHEEL & 3D FACE)
    # -------------------------------------------------------------
    # Dashboard & Front Seats
    create_box("Dashboard", (0.62, 0, 0.74), (0.34, car_wid * 0.82, 0.22), m_interior, bevel=0.03)
    create_box("DriverSeatBase", (0.10, -0.44, 0.52), (0.45, 0.45, 0.16), m_interior, bevel=0.02)
    create_box("DriverSeatBack", (-0.14, -0.44, 0.84), (0.12, 0.44, 0.52), m_interior, bevel=0.02)

    dx, dy, dz = 0.12, -0.44, 0.42
    # Steering column & wheel
    create_cylinder_between("SteeringColumn", (dx + 0.42, dy, dz + 0.22), (dx + 0.28, dy, dz + 0.42), 0.024, m_trim_dark, verts=8)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.15,
        minor_radius=0.018,
        major_segments=24,
        minor_segments=8,
        location=(dx + 0.28, dy, dz + 0.42),
        rotation=(0, math.radians(-65), 0)
    )
    c_wheel = assign_material(bpy.context.object, m_trim_dark)
    c_wheel.name = "CarSteeringWheel"

    # Driver Body
    create_box("Driver_Pelvis", (dx, dy, dz + 0.12), (0.22, 0.28, 0.14), m_pants_dark, bevel=0.02)
    create_box("Driver_Torso", (dx - 0.02, dy, dz + 0.36), (0.24, 0.32, 0.34), m_shirt_white, bevel=0.03)
    create_cylinder_between("Driver_Neck", (dx + 0.01, dy, dz + 0.52), (dx + 0.03, dy, dz + 0.62), 0.046, m_skin_d, verts=10)
    build_head_and_face("CarDriver", (dx + 0.05, dy, dz + 0.74), m_skin_d, m_hair, m_eye_white, m_iris, m_lip)

    # Driver Arms gripping steering wheel
    create_cylinder_between("Driver_Arm_L", (dx, dy - 0.15, dz + 0.48), (dx + 0.20, dy - 0.14, dz + 0.42), 0.044, m_shirt_white, verts=10)
    create_cylinder_between("Driver_Forearm_L", (dx + 0.20, dy - 0.14, dz + 0.42), (dx + 0.30, dy - 0.10, dz + 0.42), 0.036, m_skin_d, verts=10)
    create_sphere("Driver_Hand_L", (dx + 0.31, dy - 0.09, dz + 0.42), 0.038, (1.2, 0.9, 0.9), m_skin_d)

    create_cylinder_between("Driver_Arm_R", (dx, dy + 0.15, dz + 0.48), (dx + 0.20, dy + 0.14, dz + 0.42), 0.044, m_shirt_white, verts=10)
    create_cylinder_between("Driver_Forearm_R", (dx + 0.20, dy + 0.14, dz + 0.42), (dx + 0.30, dy + 0.10, dz + 0.42), 0.036, m_skin_d, verts=10)
    create_sphere("Driver_Hand_R", (dx + 0.31, dy + 0.09, dz + 0.42), 0.038, (1.2, 0.9, 0.9), m_skin_d)

    # Driver Legs extending forward to pedals
    for side, sign in [("L", -1), ("R", 1)]:
        ly = dy + sign * 0.09
        create_cylinder_between(f"Driver_Thigh_{side}", (dx + 0.02, ly, dz + 0.12), (dx + 0.32, ly, dz + 0.12), 0.058, m_pants_dark, verts=12)
        create_cylinder_between(f"Driver_Shin_{side}", (dx + 0.32, ly, dz + 0.12), (dx + 0.42, ly, dz - 0.15), 0.050, m_pants_dark, verts=10)
        create_box(f"Driver_Foot_{side}", (dx + 0.46, ly, dz - 0.16), (0.15, 0.07, 0.035), m_trim_dark, bevel=0.01)

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
