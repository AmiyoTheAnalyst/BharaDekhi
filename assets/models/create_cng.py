import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "cng-autorickshaw.glb")

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

def create_cng_wheel(name, center, radius, width, tire_mat, rim_mat, hub_mat, accent_mat):
    pivot = bpy.data.objects.new(name, None)
    pivot.location = center
    bpy.context.collection.objects.link(pivot)

    # Outer rubber radial tire
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.048,
        minor_radius=0.048,
        major_segments=32,
        minor_segments=10,
        location=(0, 0, 0),
        rotation=(math.pi / 2, 0, 0)
    )
    tire = assign_material(bpy.context.object, tire_mat)
    smooth_mesh(tire)
    tire.name = f"{name}_tire"
    tire.parent = pivot

    # Pressed black steel rim
    rim = create_cylinder_between(f"{name}_rim", (0, -width * 0.44, 0), (0, width * 0.44, 0), radius * 0.64, rim_mat, verts=18)
    rim.parent = pivot

    # Vibrant Yellow Inner Rim Accent Ring (Exact Match to Picture 4!)
    ring_l = create_cylinder_between(f"{name}_accent_l", (0, -width * 0.46, 0), (0, -width * 0.44, 0), radius * 0.52, accent_mat, verts=16)
    ring_l.parent = pivot
    ring_r = create_cylinder_between(f"{name}_accent_r", (0, width * 0.44, 0), (0, width * 0.46, 0), radius * 0.52, accent_mat, verts=16)
    ring_r.parent = pivot

    # Chrome axle center hub
    hub = create_cylinder_between(f"{name}_hub", (0, -width * 0.58, 0), (0, width * 0.58, 0), 0.052, hub_mat, verts=12)
    hub.parent = pivot

    return pivot

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
    create_box(f"{name_prefix}_Lips", (x + 0.112, y, z - 0.042), (0.014, 0.044, 0.012), lip_mat, bevel=0.002)

    if mustache_mat:
        create_sphere(f"{name_prefix}_Mustache_L", (x + 0.112, y - 0.018, z - 0.035), 0.014, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6)
        create_sphere(f"{name_prefix}_Mustache_R", (x + 0.112, y + 0.018, z - 0.035), 0.014, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6)

def build():
    clear_scene()

    # -------------------------------------------------------------
    # AUTHENTIC DHAKA CNG COLOR PALETTE (MATCHING PICTURE 4)
    # -------------------------------------------------------------
    m_cng_green = create_material("CNG_EmeraldGreen", (0.06, 0.64, 0.35), metallic=0.15, roughness=0.30, clearcoat=0.9)
    m_cng_yellow = create_material("CNG_StripeYellow", (0.96, 0.78, 0.08), metallic=0.1, roughness=0.35)
    m_cng_white = create_material("CNG_DecalWhite", (0.95, 0.96, 0.98), metallic=0.05, roughness=0.4)
    m_canvas_black = create_material("CNG_CanvasRoof", (0.10, 0.11, 0.13), metallic=0.05, roughness=0.88)
    m_scallop_gold = create_material("CNG_ScallopGold", (0.95, 0.72, 0.12), metallic=0.2, roughness=0.45)
    m_scallop_red = create_material("CNG_ScallopRed", (0.88, 0.15, 0.15), metallic=0.1, roughness=0.5)

    m_tire = create_material("CNG_TireRubber", (0.035, 0.035, 0.04), metallic=0.0, roughness=0.85)
    m_steel_rim = create_material("CNG_SteelRim", (0.12, 0.13, 0.15), metallic=0.6, roughness=0.4)
    m_chrome = create_material("CNG_ChromeTrim", (0.90, 0.92, 0.94), metallic=0.96, roughness=0.12)
    m_dark = create_material("CNG_DarkChassis", (0.07, 0.07, 0.08), metallic=0.3, roughness=0.7)
    m_glass = create_material("CNG_ClearGlass", (0.2, 0.35, 0.4), metallic=0.1, roughness=0.05, alpha=0.35)
    m_wire_mesh = create_material("CNG_SecurityMesh", (0.05, 0.45, 0.24), metallic=0.4, roughness=0.35)
    m_seat_vinyl = create_material("CNG_SeatVinyl", (0.10, 0.10, 0.12), metallic=0.05, roughness=0.75)

    # Tricolor Decorative Stripes below windshield (Picture 4)
    m_stripe_red = create_material("CNG_StripeRed", (0.88, 0.12, 0.14), metallic=0.1, roughness=0.4)
    m_stripe_blue = create_material("CNG_StripeBlue", (0.10, 0.38, 0.88), metallic=0.1, roughness=0.4)

    # Festive Bunting Flag Materials (Red, Yellow, Blue, Green, Orange)
    m_flag_red = create_material("Flag_Red", (0.92, 0.12, 0.12), metallic=0.0, roughness=0.8)
    m_flag_yellow = create_material("Flag_Yellow", (0.98, 0.82, 0.10), metallic=0.0, roughness=0.8)
    m_flag_blue = create_material("Flag_Blue", (0.10, 0.45, 0.92), metallic=0.0, roughness=0.8)
    m_flag_green = create_material("Flag_Green", (0.08, 0.75, 0.35), metallic=0.0, roughness=0.8)
    m_flag_orange = create_material("Flag_Orange", (0.95, 0.48, 0.10), metallic=0.0, roughness=0.8)

    # Lighting Emitters
    m_headlight = create_material("CNG_Headlight", (1.0, 0.96, 0.88), emission=(1.0, 0.95, 0.8), emission_strength=5.0)
    m_taillight = create_material("CNG_Taillight", (0.95, 0.05, 0.05), emission=(1.0, 0.08, 0.08), emission_strength=4.0)
    m_fare_meter = create_material("CNG_FareMeterLED", (0.1, 1.0, 0.2), emission=(0.1, 1.0, 0.2), emission_strength=3.0)

    # Human Characters Materials
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
    # 1. THREE WHEELS WITH YELLOW ACCENT RIMS (PICTURE 4)
    # -------------------------------------------------------------
    wheel_radius = 0.26
    wheel_width = 0.11
    create_cng_wheel("wheel_front", (1.05, 0.0, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome, m_cng_yellow)
    create_cng_wheel("wheel_rear_left", (-0.75, -0.58, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome, m_cng_yellow)
    create_cng_wheel("wheel_rear_right", (-0.75, 0.58, wheel_radius), wheel_radius, wheel_width, m_tire, m_steel_rim, m_chrome, m_cng_yellow)

    # -------------------------------------------------------------
    # 2. CHASSIS & LOWER EMERALD GREEN BODY
    # -------------------------------------------------------------
    create_box("FloorPan", (0.0, 0, 0.32), (2.35, 1.25, 0.08), m_dark)

    # Lower Emerald Green Sheet Metal Tub
    create_box("LowerTub", (-0.05, 0, 0.52), (2.30, 1.28, 0.36), m_cng_green, bevel=0.04)

    # Side Banners: Lower Yellow Band ("ONE PARIBAHAN") and Upper White Band ("★ FOR HIRE ★")
    for side, sign in [("L", -1), ("R", 1)]:
        sy = sign * 0.645
        # Yellow "ONE PARIBAHAN" Band
        create_box(f"YellowStripe_{side}", (-0.05, sy, 0.44), (2.10, 0.02, 0.09), m_cng_yellow)
        # White "★ FOR HIRE ★" Band with Red Star Accents
        create_box(f"WhiteStripe_{side}", (-0.05, sy, 0.54), (2.10, 0.02, 0.08), m_cng_white)
        create_box(f"StarLeft_{side}", (0.85, sy + sign * 0.005, 0.54), (0.04, 0.015, 0.04), m_stripe_red)
        create_box(f"StarRight_{side}", (-0.95, sy + sign * 0.005, 0.54), (0.04, 0.015, 0.04), m_stripe_red)

    # Front Nose Cowl & Mudguard
    create_box("FrontNose", (0.92, 0, 0.62), (0.42, 0.88, 0.44), m_cng_green, bevel=0.05)
    create_cylinder_between("FrontMudguard", (0.85, 0, 0.44), (1.20, 0, 0.42), 0.16, m_cng_green, verts=8)

    # Front Eyebrow Visor & Round Chrome Headlamp (Picture 4)
    create_box("HeadlampVisor", (1.14, 0, 0.72), (0.12, 0.22, 0.04), m_cng_green, bevel=0.01)
    create_sphere("HeadlampShell", (1.15, 0, 0.64), 0.085, (0.4, 1.0, 1.0), m_chrome)
    create_sphere("HeadlampLens", (1.18, 0, 0.64), 0.075, (0.3, 1.0, 1.0), m_headlight)
    create_box("Indicator_L", (1.08, -0.38, 0.64), (0.04, 0.06, 0.04), m_cng_yellow)
    create_box("Indicator_R", (1.08, 0.38, 0.64), (0.04, 0.06, 0.04), m_cng_yellow)

    # Tricolor Decorative Bands below Windshield (Yellow, Red, Blue - Picture 4)
    create_box("TricolorYellow", (0.78, 0, 0.80), (0.10, 0.84, 0.025), m_cng_yellow)
    create_box("TricolorRed", (0.76, 0, 0.83), (0.10, 0.84, 0.025), m_stripe_red)
    create_box("TricolorBlue", (0.74, 0, 0.86), (0.10, 0.84, 0.025), m_stripe_blue)

    # Windshield Frame with Slanted Glass (Picture 4)
    create_cylinder_between("A_Pillar_L", (0.70, -0.56, 0.84), (0.48, -0.56, 1.48), 0.026, m_cng_green)
    create_cylinder_between("A_Pillar_R", (0.70, 0.56, 0.84), (0.48, 0.56, 1.48), 0.026, m_cng_green)
    create_cylinder_between("WindshieldHeader", (0.48, -0.56, 1.48), (0.48, 0.56, 1.48), 0.028, m_cng_green)
    create_cylinder_between("WindshieldCowl", (0.70, -0.56, 0.86), (0.70, 0.56, 0.86), 0.026, m_cng_green)
    create_box("WindshieldGlass", (0.59, 0, 1.17), (0.02, 1.10, 0.62), m_glass)
    # Windshield Wiper
    create_cylinder_between("WiperArm", (0.64, 0, 0.90), (0.58, 0.20, 1.34), 0.010, m_dark)

    # Handlebar Steering & Digital Fare Meter
    create_cylinder_between("SteeringStem", (0.52, 0, 0.68), (0.46, 0, 0.94), 0.028, m_chrome)
    create_cylinder_between("Handlebar", (0.46, -0.32, 0.94), (0.46, 0.32, 0.94), 0.018, m_chrome)
    create_cylinder_between("Grip_L", (0.46, -0.24, 0.94), (0.46, -0.32, 0.94), 0.024, m_tire)
    create_cylinder_between("Grip_R", (0.46, 0.24, 0.94), (0.46, 0.32, 0.94), 0.024, m_tire)
    # Chrome Side Mirrors
    create_cylinder_between("Mirror_L", (0.54, -0.40, 1.05), (0.58, -0.56, 1.20), 0.012, m_chrome)
    create_box("MirrorHousing_L", (0.58, -0.58, 1.22), (0.03, 0.08, 0.05), m_cng_green)
    create_cylinder_between("Mirror_R", (0.54, 0.40, 1.05), (0.58, 0.56, 1.20), 0.012, m_chrome)
    create_box("MirrorHousing_R", (0.58, 0.58, 1.22), (0.03, 0.08, 0.05), m_cng_green)
    # Digital Meter Box
    create_box("FareMeterBox", (0.54, 0.18, 0.96), (0.08, 0.14, 0.08), m_dark, bevel=0.005)
    create_box("FareMeterScreen", (0.51, 0.18, 0.96), (0.01, 0.10, 0.04), m_fare_meter)

    # -------------------------------------------------------------
    # 3. ENCLOSED CURVED CANVAS SOFT-TOP CANOPY ROOF (PICTURE 4)
    # -------------------------------------------------------------
    # Main domed canvas roof shell
    create_box("CanvasRoofTop", (-0.28, 0, 1.60), (1.68, 1.30, 0.12), m_canvas_black, bevel=0.08)
    # Curved downward roof eaves (Left & Right overhang)
    create_box("RoofEave_L", (-0.28, -0.63, 1.50), (1.66, 0.06, 0.14), m_canvas_black, bevel=0.02)
    create_box("RoofEave_R", (-0.28, 0.63, 1.50), (1.66, 0.06, 0.14), m_canvas_black, bevel=0.02)
    # Front curved canopy slope meeting the windshield
    create_box("CanopyFrontSlope", (0.35, 0, 1.52), (0.42, 1.22, 0.10), m_canvas_black, bevel=0.04)
    # Rear curved canopy cowl dropping down behind passenger seat
    create_box("CanopyRearCowl", (-1.08, 0, 1.34), (0.30, 1.28, 0.52), m_canvas_black, bevel=0.06)
    # Rear window transparent glass
    create_box("RearWindowGlass", (-1.22, 0, 1.36), (0.02, 0.72, 0.32), m_glass)

    # Traditional Scalloped Rickshaw Art Border Trim along Canopy Rim (Picture 4)
    for side, sign in [("L", -1), ("R", 1)]:
        ey = sign * 0.66
        create_box(f"ScallopGold_{side}", (-0.28, ey, 1.45), (1.62, 0.02, 0.035), m_scallop_gold)
        create_box(f"ScallopRed_{side}", (-0.28, ey, 1.47), (1.62, 0.02, 0.020), m_scallop_red)
    # Rear canopy trim
    create_box("RearScallopGold", (-1.18, 0, 1.10), (0.02, 1.22, 0.035), m_scallop_gold)

    # -------------------------------------------------------------
    # 4. SIGNATURE DHAKA CNG WIRE-MESH CAGE DOORS & BUNTING FLAGS (PICTURE 4)
    # -------------------------------------------------------------
    door_start_x, door_end_x = -0.58, 0.40
    door_z_bottom, door_z_mid, door_z_top = 0.52, 0.96, 1.45

    for side, sign in [("L", -1), ("R", 1)]:
        dy = sign * 0.645
        # Slender perimeter tube frame for the door
        create_cylinder_between(f"DoorBottom_{side}", (door_start_x, dy, door_z_bottom), (door_end_x, dy, door_z_bottom), 0.016, m_cng_green)
        create_cylinder_between(f"DoorTop_{side}", (door_start_x, dy, door_z_top), (door_end_x, dy, door_z_top), 0.016, m_cng_green)
        create_cylinder_between(f"DoorRear_{side}", (door_start_x, dy, door_z_bottom), (door_start_x, dy, door_z_top), 0.016, m_cng_green)
        create_cylinder_between(f"DoorFront_{side}", (door_end_x, dy, door_z_bottom), (door_end_x, dy, door_z_top), 0.016, m_cng_green)
        create_cylinder_between(f"DoorMidBar_{side}", (door_start_x, dy, door_z_mid), (door_end_x, dy, door_z_mid), 0.015, m_cng_green)

        # Lower Sheet Metal Door Panel with White Decorative Crest (Picture 4)
        create_box(f"LowerDoorSheet_{side}", ((door_start_x + door_end_x) * 0.5, dy, (door_z_bottom + door_z_mid) * 0.5), (door_end_x - door_start_x - 0.02, 0.015, door_z_mid - door_z_bottom - 0.02), m_cng_green)
        create_box(f"DoorWhiteCrest_{side}", ((door_start_x + door_end_x) * 0.5, dy + sign * 0.01, (door_z_bottom + door_z_mid) * 0.5), (0.24, 0.01, 0.24), m_cng_white, bevel=0.01)

        # Upper Protective Wire Mesh / Diamond Safety Grille (Picture 4)
        bar_count = 7
        for b in range(bar_count):
            bx = door_start_x + 0.04 + (b / float(bar_count - 1)) * (door_end_x - door_start_x - 0.08)
            create_cylinder_between(f"MeshBarV_{side}_{b}", (bx, dy, door_z_mid + 0.02), (bx, dy, door_z_top - 0.02), 0.007, m_wire_mesh, verts=6)
        # Horizontal reinforcement grille wire
        create_cylinder_between(f"MeshBarH_{side}", (door_start_x + 0.04, dy, (door_z_mid + door_z_top) * 0.5), (door_end_x - 0.04, dy, (door_z_mid + door_z_top) * 0.5), 0.007, m_wire_mesh, verts=6)

        # Colorful Triangular Bunting Pennant Flags Hanging Below Roof Brow (Picture 4)
        flag_colors = [m_flag_red, m_flag_yellow, m_flag_blue, m_flag_green, m_flag_orange, m_flag_red, m_flag_yellow]
        flag_count = len(flag_colors)
        f_step = (door_end_x - door_start_x) / flag_count
        for fi, f_mat in enumerate(flag_colors):
            fx = door_start_x + (fi + 0.5) * f_step
            # Triangular flag pointing down
            p_top1 = (fx - f_step * 0.42, dy + sign * 0.008, door_z_top - 0.01)
            p_top2 = (fx + f_step * 0.42, dy + sign * 0.008, door_z_top - 0.01)
            p_tip = (fx, dy + sign * 0.008, door_z_top - 0.10)
            create_cylinder_between(f"Flag_{side}_{fi}", p_top1, p_tip, 0.018, f_mat, radius2=0.002, verts=4)
            create_cylinder_between(f"FlagB_{side}_{fi}", p_top2, p_tip, 0.018, f_mat, radius2=0.002, verts=4)

    # Rear Mounted Spare Tire & Heavy Bumper (Picture 4)
    create_cylinder_between("RearSpareTire", (-1.26, 0, 0.72), (-1.38, 0, 0.72), wheel_radius * 0.95, m_tire, verts=18)
    create_cylinder_between("RearSpareRim", (-1.34, 0, 0.72), (-1.39, 0, 0.72), wheel_radius * 0.55, m_steel_rim, verts=12)
    create_cylinder_between("RearSpareYellowRing", (-1.37, 0, 0.72), (-1.40, 0, 0.72), wheel_radius * 0.42, m_cng_yellow, verts=12)
    create_cylinder_between("RearBumper", (-1.22, -0.66, 0.38), (-1.22, 0.66, 0.38), 0.032, m_chrome)
    create_box("Taillight_L", (-1.21, -0.52, 0.52), (0.04, 0.12, 0.06), m_taillight)
    create_box("Taillight_R", (-1.21, 0.52, 0.52), (0.04, 0.12, 0.06), m_taillight)

    # -------------------------------------------------------------
    # 5. FULL-BODIED CNG DRIVER (SEATED WITH HANDLEBARS & 3D FACE)
    # -------------------------------------------------------------
    dx, dy, dz = 0.20, 0.0, 0.0
    create_box("DriverBench", (dx, 0, 0.58), (0.34, 0.65, 0.14), m_seat_vinyl, bevel=0.02)
    create_box("Driver_Pelvis", (dx + 0.02, 0, 0.68), (0.22, 0.28, 0.14), m_driver_pants, bevel=0.02)
    create_box("Driver_Torso", (dx + 0.04, 0, 0.92), (0.24, 0.34, 0.34), m_driver_shirt, bevel=0.03)
    create_cylinder_between("Driver_Neck", (dx + 0.06, 0, 1.08), (dx + 0.08, 0, 1.18), 0.05, m_skin_driver, verts=10)
    build_head_and_face("Driver", (dx + 0.10, 0, 1.28), m_skin_driver, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair)

    create_cylinder_between("Driver_Arm_L", (dx + 0.06, -0.16, 1.02), (dx + 0.18, -0.22, 0.94), 0.048, m_driver_shirt, verts=10)
    create_cylinder_between("Driver_Forearm_L", (dx + 0.18, -0.22, 0.94), (0.44, -0.24, 0.94), 0.040, m_skin_driver, verts=10)
    create_sphere("Driver_Hand_L", (0.45, -0.24, 0.94), 0.042, (1.2, 0.9, 0.9), m_skin_driver)

    create_cylinder_between("Driver_Arm_R", (dx + 0.06, 0.16, 1.02), (dx + 0.18, 0.22, 0.94), 0.048, m_driver_shirt, verts=10)
    create_cylinder_between("Driver_Forearm_R", (dx + 0.18, 0.22, 0.94), (0.44, 0.24, 0.94), 0.040, m_skin_driver, verts=10)
    create_sphere("Driver_Hand_R", (0.45, 0.24, 0.94), 0.042, (1.2, 0.9, 0.9), m_skin_driver)

    for side, sign in [("L", -1), ("R", 1)]:
        ly = dy + sign * 0.10
        create_cylinder_between(f"Driver_Thigh_{side}", (dx + 0.04, ly, 0.68), (dx + 0.32, ly, 0.68), 0.062, m_driver_pants, verts=12)
        create_cylinder_between(f"Driver_Shin_{side}", (dx + 0.32, ly, 0.68), (dx + 0.32, ly, 0.38), 0.052, m_driver_pants, verts=10)
        create_box(f"Driver_Foot_{side}", (dx + 0.36, ly, 0.36), (0.15, 0.07, 0.038), m_dark, bevel=0.01)

    # -------------------------------------------------------------
    # 6. FULL-BODIED REAR PASSENGERS (SEATED IN CABIN)
    # -------------------------------------------------------------
    create_box("RearBench", (-0.68, 0, 0.58), (0.52, 1.18, 0.16), m_seat_vinyl, bevel=0.03)
    create_box("RearBackrest", (-0.94, 0, 0.88), (0.10, 1.16, 0.44), m_seat_vinyl, bevel=0.03)

    gx, gy = -0.62, 0.18
    create_box("Pass_Pelvis", (gx, gy, 0.68), (0.24, 0.28, 0.14), m_pass_pants, bevel=0.02)
    create_box("Pass_Torso", (gx - 0.02, gy, 0.94), (0.22, 0.32, 0.36), m_pass_shirt, bevel=0.03)
    create_cylinder_between("Pass_Neck", (gx, gy, 1.10), (gx + 0.02, gy, 1.20), 0.048, m_skin_pass, verts=10)
    build_head_and_face("CNGPass", (gx + 0.04, gy, 1.30), m_skin_pass, m_hair, m_eye_white, m_iris, m_lip)

    create_cylinder_between("Pass_Arm_L", (gx - 0.02, gy - 0.16, 1.04), (gx + 0.12, gy - 0.12, 0.82), 0.045, m_pass_shirt, verts=10)
    create_cylinder_between("Pass_Forearm_L", (gx + 0.12, gy - 0.12, 0.82), (gx + 0.22, gy - 0.04, 0.78), 0.038, m_skin_pass, verts=10)
    create_sphere("Pass_Hand_L", (gx + 0.23, gy - 0.03, 0.78), 0.04, (1.2, 0.9, 0.9), m_skin_pass)

    create_cylinder_between("Pass_Arm_R", (gx - 0.02, gy + 0.16, 1.04), (gx + 0.12, gy + 0.12, 0.82), 0.045, m_pass_shirt, verts=10)
    create_cylinder_between("Pass_Forearm_R", (gx + 0.12, gy + 0.12, 0.82), (gx + 0.22, gy + 0.04, 0.78), 0.038, m_skin_pass, verts=10)
    create_sphere("Pass_Hand_R", (gx + 0.23, gy + 0.03, 0.78), 0.04, (1.2, 0.9, 0.9), m_skin_pass)

    for side, sign in [("L", -1), ("R", 1)]:
        py = gy + sign * 0.09
        create_cylinder_between(f"Pass_Thigh_{side}", (gx + 0.02, py, 0.68), (gx + 0.30, py, 0.68), 0.06, m_pass_pants, verts=12)
        create_cylinder_between(f"Pass_Shin_{side}", (gx + 0.30, py, 0.68), (gx + 0.30, py, 0.38), 0.05, m_pass_pants, verts=10)
        create_box(f"Pass_Foot_{side}", (gx + 0.34, py, 0.36), (0.15, 0.07, 0.038), m_dark, bevel=0.01)

    # -------------------------------------------------------------
    # 7. EXPORT TO GLB
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
    print("SUCCESSFULLY BUILT AUTHENTIC DHAKA CNG AUTO-RICKSHAW GLB:", OUTPUT)

if __name__ == "__main__":
    build()
