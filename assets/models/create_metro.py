import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "dhaka-metro.glb")

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

def build():
    clear_scene()

    # Materials
    # Brushed Stainless Steel Body (MRT Line-6 signature finish)
    m_steel_body = create_material("Metro_StainlessSteel", (0.85, 0.88, 0.90), metallic=0.92, roughness=0.22, clearcoat=0.8)
    m_green_stripe = create_material("Metro_BDGreen", (0.02, 0.58, 0.35), metallic=0.2, roughness=0.35)
    m_red_stripe = create_material("Metro_BDRed", (0.88, 0.12, 0.10), metallic=0.2, roughness=0.35)
    m_bogie_dark = create_material("Metro_BogieDark", (0.10, 0.11, 0.12), metallic=0.85, roughness=0.4)
    m_wheel_steel = create_material("Metro_WheelSteel", (0.75, 0.78, 0.80), metallic=0.95, roughness=0.18)
    m_glass = create_material("Metro_WindowGlass", (0.10, 0.20, 0.25), metallic=0.3, roughness=0.05)
    m_interior_glow = create_material("Metro_InteriorGlow", (0.95, 0.98, 1.0), emission=(0.95, 0.98, 1.0), emission_strength=2.5)
    m_headlight = create_material("Metro_HeadlightLED", (1.0, 1.0, 1.0), emission=(0.8, 0.95, 1.0), emission_strength=5.0)
    m_red_taillight = create_material("Metro_TailLED", (0.95, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=4.5)
    m_pantograph = create_material("Metro_PantographOrange", (0.92, 0.45, 0.08), metallic=0.8, roughness=0.3)

    coach_len, coach_wid, coach_hgt = 13.8, 2.85, 3.25

    # -------------------------------------------------------------
    # 1. BOGIES & STEEL WHEELS (Front & Rear 2-axle Bogies)
    # -------------------------------------------------------------
    bogie_xs = [4.2, -4.2]
    wheel_radius = 0.44
    wheel_width = 0.14
    for bi, bx in enumerate(bogie_xs):
        create_box(f"BogieFrame_{bi}", (bx, 0, 0.42), (2.8, 2.2, 0.24), m_bogie_dark, bevel=0.03)
        for ax_off in [-0.95, 0.95]:
            wx = bx + ax_off
            # Axle
            create_cylinder_between(f"Axle_{bi}_{ax_off}", (wx, -1.1, wheel_radius), (wx, 1.1, wheel_radius), 0.065, m_bogie_dark)
            # Left & Right Steel Wheels
            for side, sign in [("L", -1), ("R", 1)]:
                wy = sign * 1.15
                create_cylinder_between(f"TrainWheel_{bi}_{ax_off}_{side}", (wx, wy - wheel_width * 0.5, wheel_radius), (wx, wy + wheel_width * 0.5, wheel_radius), wheel_radius, m_wheel_steel, verts=20)

    # -------------------------------------------------------------
    # 2. MAIN CAR BODY (STAINLESS STEEL + BD STRIPES)
    # -------------------------------------------------------------
    # Main coach shell
    create_box("MetroShell", (0, 0, 2.15), (coach_len, coach_wid, 2.65), m_steel_body, bevel=0.08)

    # Bangladesh Green & Red Speed Ribbon Stripes along lower side waist
    create_box("StripeGreen", (0, 0, 1.25), (coach_len + 0.02, coach_wid + 0.02, 0.16), m_green_stripe)
    create_box("StripeRed", (0, 0, 1.10), (coach_len + 0.02, coach_wid + 0.02, 0.08), m_red_stripe)

    # Sloped Aerodynamic Driver Cab (+X)
    create_box("CabNose", (coach_len * 0.5 + 0.45, 0, 1.95), (0.95, coach_wid - 0.12, 2.25), m_steel_body, bevel=0.12)
    # Panoramic Front Windshield
    create_box("CabWindshield", (coach_len * 0.5 + 0.82, 0, 2.35), (0.12, coach_wid - 0.35, 0.95), m_glass)
    # Dual LED Headlights
    create_box("CabHeadlight_L", (coach_len * 0.5 + 0.92, -0.95, 1.45), (0.05, 0.28, 0.14), m_headlight, bevel=0.02)
    create_box("CabHeadlight_R", (coach_len * 0.5 + 0.92, 0.95, 1.45), (0.05, 0.28, 0.14), m_headlight, bevel=0.02)

    # Rear Coupler & Red Tail Marker Lights (-X)
    create_box("RearCoupler", (-coach_len * 0.5 - 0.35, 0, 0.85), (0.75, 0.35, 0.25), m_bogie_dark, bevel=0.02)
    create_box("TailLED_L", (-coach_len * 0.5 - 0.02, -1.05, 1.45), (0.04, 0.18, 0.12), m_red_taillight)
    create_box("TailLED_R", (-coach_len * 0.5 - 0.02, 1.05, 1.45), (0.04, 0.18, 0.12), m_red_taillight)

    # -------------------------------------------------------------
    # 3. PASSENGER DOORS & TINTED WINDOWS (BOTH SIDES)
    # -------------------------------------------------------------
    # 4 Pairs of Sliding Passenger Doors along each side
    door_xs = [4.5, 1.5, -1.5, -4.5]
    for di, dx in enumerate(door_xs):
        for side, sign in [("L", -1), ("R", 1)]:
            dy = sign * (coach_wid * 0.5 + 0.01)
            create_box(f"Door_{di}_{side}", (dx, dy, 2.05), (1.35, 0.03, 1.95), m_steel_body, bevel=0.02)
            create_box(f"DoorGlass_{di}_{side}", (dx, dy + sign * 0.01, 2.25), (0.95, 0.02, 0.95), m_glass)

    # Tinted Side Windows between doors
    window_xs = [3.0, 0.0, -3.0]
    for wi, wx in enumerate(window_xs):
        for side, sign in [("L", -1), ("R", 1)]:
            wy = sign * (coach_wid * 0.5 + 0.01)
            create_box(f"SideWindow_{wi}_{side}", (wx, wy, 2.30), (1.25, 0.02, 0.85), m_glass)

    # Glowing Warm Interior visible through glass
    create_box("InteriorCabin", (0, 0, 2.20), (coach_len - 1.2, coach_wid - 0.4, 2.0), m_interior_glow)

    # -------------------------------------------------------------
    # 4. ROOF STRUCTURE, HVAC UNITS & PANTOGRAPH
    # -------------------------------------------------------------
    # Dual Rooftop HVAC AC Pods
    create_box("HVAC_1", (3.2, 0, 3.65), (2.8, 2.1, 0.42), m_steel_body, bevel=0.04)
    create_box("HVAC_2", (-3.2, 0, 3.65), (2.8, 2.1, 0.42), m_steel_body, bevel=0.04)

    # Diamond Pantograph Mechanism (MRT Line-6 Overhead Catenary Power)
    p_base_x = 0.0
    p_z = 3.65
    create_box("PantographBase", (p_base_x, 0, p_z), (1.4, 1.2, 0.12), m_bogie_dark, bevel=0.02)
    # Lower diamond arms
    create_cylinder_between("PantoArm1", (p_base_x - 0.5, 0, p_z + 0.1), (p_base_x, 0, p_z + 0.85), 0.028, m_pantograph)
    create_cylinder_between("PantoArm2", (p_base_x + 0.5, 0, p_z + 0.1), (p_base_x, 0, p_z + 0.85), 0.028, m_pantograph)
    # Upper diamond arms
    create_cylinder_between("PantoArm3", (p_base_x, 0, p_z + 0.85), (p_base_x - 0.35, 0, p_z + 1.55), 0.024, m_pantograph)
    create_cylinder_between("PantoArm4", (p_base_x, 0, p_z + 0.85), (p_base_x + 0.35, 0, p_z + 1.55), 0.024, m_pantograph)
    # Contact collector bow (carbon slider)
    create_box("PantoCollector", (p_base_x, 0, p_z + 1.58), (0.28, 2.1, 0.06), m_pantograph, bevel=0.01)

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
    print("SUCCESSFULLY EXPORTED DHAKA METRO TRAIN TO:", OUTPUT)

if __name__ == "__main__":
    build()
