import bpy
import bmesh
import math
import os

# ==============================================================================
# BLENDER 5.2 GTA V-GRADE VEHICLE FACTORY FOR BHARADEKHI
# Generates 4 distinct vehicle models matching reference images:
# 1. Albany V-STR / Cadillac CT5-V (Pearl White Sports Sedan)
# 2. Declasse Tulip / Charger (Midnight Plum Night Muscle with Chrome Blower)
# 3. Imponte Deluxo / DeLorean (Brushed Stainless Wedge with Louvers)
# 4. Ubermacht SC1 / i8 (Acid Lime-Green Hypercar with Glowing Accent Light Strips)
# ==============================================================================

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(REPO_ROOT, "assets", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)

def make_mat(name, color, metallic=0.0, roughness=0.4, coat=0.0, alpha=1.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = coat
        elif "Clearcoat" in bsdf.inputs:
            bsdf.inputs["Clearcoat"].default_value = coat
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            if hasattr(mat, "blend_method"):
                mat.blend_method = 'BLEND'
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        elif emission and "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = emission
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def link_obj(obj, parent=None):
    if parent:
        obj.parent = parent
    for col in obj.users_collection:
        col.objects.unlink(obj)
    bpy.context.collection.objects.link(obj)
    return obj

def add_box(name, size, loc, mat, bevel=0.03, segs=2, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.001:
        bev = obj.modifiers.new(name="Bevel", type='BEVEL')
        bev.width = bevel
        bev.segments = segs
        bpy.ops.object.modifier_apply(modifier=bev.name)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return link_obj(obj, parent)

def add_cyl(name, radius, depth, loc, rot, mat, verts=24, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return link_obj(obj, parent)

# ==============================================================================
# STANDARD FORWARD-ROLLING WHEEL ASSEMBLY
# The Empty pivot has rotation (0, 0, 0).
# All mesh geometries have rotation (pi/2, 0, 0) so axle is transverse (Z in Three.js).
# Rotating w.rotation.z -= forwardRoll in Three.js rolls the wheel FORWARD with ZERO wobble.
# ==============================================================================
def create_wheel(parent_root, w_name, x, y, z, radius, width, rim_mat, tire_mat, chrome_mat, dark_mat, rim_type="spoke5", caliper_mat=None):
    w_pivot = bpy.data.objects.new(w_name, None)
    w_pivot.location = (x, y, z)
    link_obj(w_pivot, parent_root)

    # 1. Outer Radial Rubber Tire
    add_cyl(f"{w_name}_Tire", radius, width, (0, 0, 0), (math.pi / 2, 0, 0), tire_mat, verts=32, parent=w_pivot)

    # 2. Outer Rim Lip (facing outside: if y > 0 outside is +y, if y < 0 outside is -y)
    out_sign = 1 if y > 0 else -1
    rim_y = out_sign * (width * 0.42)
    add_cyl(f"{w_name}_Lip", radius * 0.75, width * 0.15, (0, rim_y, 0), (math.pi / 2, 0, 0), rim_mat, verts=28, parent=w_pivot)

    # 3. Inner Barrel Recess
    add_cyl(f"{w_name}_Barrel", radius * 0.65, width * 0.25, (0, rim_y - out_sign * 0.03, 0), (math.pi / 2, 0, 0), dark_mat, verts=24, parent=w_pivot)

    # 4. Center Hub
    add_cyl(f"{w_name}_Hub", radius * 0.22, width * 0.18, (0, rim_y + out_sign * 0.01, 0), (math.pi / 2, 0, 0), chrome_mat, verts=16, parent=w_pivot)

    # 5. Rim Spokes depending on style
    if rim_type == "spoke5":
        # 5-Twin-Spoke Sports Alloy (10 spokes in 5 pairs)
        for i in range(10):
            ang = (i // 2) * (2 * math.pi / 5) + (i % 2) * 0.14
            sx = radius * 0.44 * math.cos(ang)
            sz = radius * 0.44 * math.sin(ang)
            add_box(f"{w_name}_Spoke_{i}", (0.024, width * 0.10, radius * 0.48), (sx, rim_y, sz), rim_mat, bevel=0.005, parent=w_pivot)
    elif rim_type == "classic5":
        # Classic 5-Spoke Deep-Dish Torq-Thrust Muscle Rim
        for i in range(5):
            ang = i * (2 * math.pi / 5)
            sx = radius * 0.42 * math.cos(ang)
            sz = radius * 0.42 * math.sin(ang)
            add_box(f"{w_name}_Spoke_{i}", (0.045, width * 0.12, radius * 0.45), (sx, rim_y - out_sign * 0.015, sz), chrome_mat, bevel=0.008, parent=w_pivot)
    elif rim_type == "turbine":
        # DeLorean / Deluxo Multi-Fin Turbine Wheel (15 fins)
        for i in range(15):
            ang = i * (2 * math.pi / 15)
            sx = radius * 0.46 * math.cos(ang)
            sz = radius * 0.46 * math.sin(ang)
            add_box(f"{w_name}_Fin_{i}", (0.016, width * 0.12, radius * 0.44), (sx, rim_y, sz), rim_mat, bevel=0.003, parent=w_pivot)
    elif rim_type == "aero_blade":
        # Futuristic 5-Blade Hypercar Aero Wheel with Accent Rim
        add_cyl(f"{w_name}_AccentRing", radius * 0.72, width * 0.04, (0, rim_y + out_sign * 0.01, 0), (math.pi / 2, 0, 0), caliper_mat if caliper_mat else rim_mat, verts=28, parent=w_pivot)
        for i in range(5):
            ang = i * (2 * math.pi / 5)
            sx = radius * 0.42 * math.cos(ang)
            sz = radius * 0.42 * math.sin(ang)
            add_box(f"{w_name}_Blade_{i}", (0.04, width * 0.09, radius * 0.46), (sx, rim_y, sz), rim_mat, bevel=0.006, parent=w_pivot)

    # 6. Stationary Brake Disc & Red Caliper (Parented to car root so it doesn't spin with wheel!)
    if caliper_mat:
        add_cyl(f"{w_name}_BrakeDisc", radius * 0.58, 0.02, (x, y - out_sign * 0.02, z), (math.pi / 2, 0, 0), chrome_mat, verts=20, parent=parent_root)
        add_box(f"{w_name}_Caliper", (0.07, 0.04, 0.11), (x + 0.02, y - out_sign * 0.02, z + radius * 0.38), caliper_mat, bevel=0.01, parent=parent_root)

    return w_pivot

def build_driver(parent_root, x, y, z, shirt_mat, skin_mat, hair_mat, dark_mat):
    h = bpy.data.objects.new("Driver_Seat_Group", None)
    h.location = (x, y, z)
    link_obj(h, parent_root)
    # Hips & Torso
    add_box("Driver_Hips", (0.24, 0.28, 0.12), (0, 0, 0.06), dark_mat, bevel=0.02, parent=h)
    add_box("Driver_Torso", (0.22, 0.30, 0.34), (-0.02, 0, 0.28), shirt_mat, bevel=0.04, parent=h)
    # Head & Hair
    add_box("Driver_Head", (0.16, 0.16, 0.18), (0, 0, 0.52), skin_mat, bevel=0.03, parent=h)
    add_box("Driver_Hair", (0.17, 0.17, 0.08), (-0.02, 0, 0.58), hair_mat, bevel=0.02, parent=h)
    # Arms holding steering wheel
    add_cyl("Driver_Arm_L", 0.035, 0.24, (0.08, -0.14, 0.30), (0, 0.7, 0), shirt_mat, verts=10, parent=h)
    add_cyl("Driver_Arm_R", 0.035, 0.24, (0.08, 0.14, 0.30), (0, 0.7, 0), shirt_mat, verts=10, parent=h)
    # Steering column and wheel
    add_cyl("Steering_Column", 0.025, 0.32, (0.22, 0, 0.26), (0, 0.7, 0), dark_mat, verts=10, parent=h)
    add_cyl("Steering_Wheel", 0.14, 0.022, (0.32, 0, 0.38), (0, 0.7, 0), dark_mat, verts=18, parent=h)
    return h


# ==============================================================================
# CAR 1: ALBANY V-STR / CADILLAC CT5-V (PEARL WHITE MODERN SPORTS SEDAN)
# Reference: White sports sedan with vertical blade LED DRLs and sports alloys
# ==============================================================================
def build_sedan():
    reset_scene()
    root = bpy.data.objects.new("Car_Sedan_Root", None)
    bpy.context.collection.objects.link(root)

    # Materials
    m_body = make_mat("Sedan_White_Pearl", (0.95, 0.96, 0.98, 1.0), metallic=0.25, roughness=0.15, coat=1.0)
    m_trim = make_mat("Sedan_Gloss_Black", (0.03, 0.03, 0.04, 1.0), metallic=0.2, roughness=0.15, coat=0.8)
    m_chrome = make_mat("Sedan_Chrome", (0.92, 0.94, 0.96, 1.0), metallic=0.98, roughness=0.06)
    m_glass = make_mat("Sedan_Tinted_Glass", (0.08, 0.10, 0.14, 1.0), metallic=0.2, roughness=0.05, coat=1.0, alpha=0.45)
    m_drl = make_mat("Sedan_LED_DRL", (0.95, 0.98, 1.0, 1.0), roughness=0.05, emission=(0.95, 0.98, 1.0, 1.0), emission_strength=12.0)
    m_taillight = make_mat("Sedan_LED_Tail", (0.95, 0.02, 0.02, 1.0), roughness=0.1, emission=(0.95, 0.02, 0.02, 1.0), emission_strength=10.0)
    m_headlight = make_mat("Sedan_Headlight", (1.0, 1.0, 0.95, 1.0), roughness=0.05, emission=(1.0, 1.0, 0.95, 1.0), emission_strength=14.0)
    m_tire = make_mat("Sedan_Tire", (0.035, 0.035, 0.04, 1.0), metallic=0.0, roughness=0.85)
    m_rim = make_mat("Sedan_Alloy_Rim", (0.90, 0.92, 0.95, 1.0), metallic=0.85, roughness=0.18, coat=0.8)
    m_caliper = make_mat("Sedan_Brembo_Red", (0.85, 0.04, 0.04, 1.0), metallic=0.2, roughness=0.25, coat=1.0)
    m_dark = make_mat("Sedan_Interior_Dark", (0.08, 0.09, 0.11, 1.0), roughness=0.7)
    m_skin = make_mat("Driver_Skin", (0.55, 0.36, 0.25, 1.0), roughness=0.6)
    m_shirt = make_mat("Driver_Shirt", (0.15, 0.25, 0.45, 1.0), roughness=0.7)

    # 1. Lower Chassis & Aerodynamic Rocker Skirts
    add_box("Sedan_Chassis_Base", (4.80, 1.86, 0.14), (0.0, 0.0, 0.20), m_trim, bevel=0.02, parent=root)
    add_box("Sedan_Front_Splitter", (0.35, 1.88, 0.04), (2.36, 0.0, 0.16), m_trim, bevel=0.01, parent=root)
    add_box("Sedan_Rear_Diffuser", (0.45, 1.86, 0.12), (-2.25, 0.0, 0.22), m_trim, bevel=0.02, parent=root)

    # 2. Main Body Hull (Pearl White)
    # Lower body beltline: X: -2.35 to +2.35, Y: 1.88, Z: 0.24 to 0.78
    add_box("Sedan_Body_Tub", (4.72, 1.88, 0.54), (0.0, 0.0, 0.51), m_body, bevel=0.08, segs=4, parent=root)

    # Wheel Arch Cutout Trim (Front X: 1.42, Rear X: -1.35)
    for wx, side in [(1.42, 1), (1.42, -1), (-1.35, 1), (-1.35, -1)]:
        add_cyl(f"Sedan_Arch_{wx}_{side}", 0.40, 0.04, (wx, side * 0.94, 0.36), (math.pi / 2, 0, 0), m_trim, verts=24, parent=root)

    # 3. Sculpted Hood (Slopes down to nose)
    add_box("Sedan_Hood", (1.65, 1.76, 0.18), (1.50, 0.0, 0.82), m_body, bevel=0.05, parent=root)
    add_box("Sedan_Hood_Power_Bulge", (1.20, 0.75, 0.04), (1.52, 0.0, 0.92), m_body, bevel=0.02, parent=root)

    # 4. Front Fascia: Shield Grille, Triple Projectors & Signature Vertical Blade LED DRLs
    add_box("Sedan_Grille_Mesh", (0.06, 1.10, 0.42), (2.37, 0.0, 0.54), m_trim, bevel=0.02, parent=root)
    add_box("Sedan_Grille_Frame", (0.04, 1.14, 0.46), (2.36, 0.0, 0.54), m_chrome, bevel=0.01, parent=root)
    add_box("Sedan_Emblem", (0.03, 0.14, 0.12), (2.39, 0.0, 0.62), m_chrome, bevel=0.005, parent=root)
    add_box("Sedan_Lower_Intake", (0.05, 1.45, 0.16), (2.37, 0.0, 0.28), m_trim, bevel=0.01, parent=root)

    # Distinctive Vertical LED DRL Blades on outer bumper corners
    for side in [-1, 1]:
        sy = side * 0.86
        # Vertical blade running down the bumper edge
        add_box(f"Sedan_DRL_Blade_{side}", (0.05, 0.035, 0.42), (2.36, sy, 0.56), m_drl, bevel=0.008, parent=root)
        # Horizontal headlight projector cluster
        add_box(f"Sedan_Headlight_{side}", (0.06, 0.28, 0.08), (2.35, side * 0.68, 0.74), m_headlight, bevel=0.01, parent=root)
        add_box(f"Sedan_Headlight_Glass_{side}", (0.02, 0.30, 0.10), (2.37, side * 0.68, 0.74), m_glass, bevel=0.0, parent=root)

    # 5. Cabin & Greenhouse (Pillars, Roof, Tinted Windows)
    # Windshield (raked from X=0.68 to X=0.15)
    add_box("Sedan_Roof", (1.75, 1.42, 0.08), (-0.35, 0.0, 1.38), m_body, bevel=0.04, parent=root)
    add_box("Sedan_Windshield_Glass", (0.95, 1.40, 0.52), (0.42, 0.0, 1.10), m_glass, bevel=0.02, parent=root)
    add_box("Sedan_Rear_Glass", (0.95, 1.38, 0.48), (-1.22, 0.0, 1.10), m_glass, bevel=0.02, parent=root)

    for side in [-1, 1]:
        sy = side * 0.73
        # Side windows (Front + Rear door)
        add_box(f"Sedan_SideGlass_{side}", (1.70, 0.02, 0.44), (-0.35, sy, 1.08), m_glass, bevel=0.01, parent=root)
        # Gloss black B-Pillar
        add_box(f"Sedan_BPillar_{side}", (0.08, 0.04, 0.45), (-0.35, sy, 1.08), m_trim, bevel=0.005, parent=root)
        # Side mirror
        add_box(f"Sedan_Mirror_{side}", (0.16, 0.12, 0.08), (0.62, side * 0.94, 0.88), m_body, bevel=0.015, parent=root)
        add_box(f"Sedan_Mirror_Glass_{side}", (0.14, 0.01, 0.07), (0.61, side * (0.94 - side * 0.05), 0.88), m_chrome, parent=root)

    # 6. Rear Trunk, Decklid Lip Spoiler, LED Taillights & Quad Exhausts
    add_box("Sedan_Trunk", (0.85, 1.72, 0.22), (-1.88, 0.0, 0.82), m_body, bevel=0.04, parent=root)
    add_box("Sedan_Lip_Spoiler", (0.18, 1.62, 0.04), (-2.32, 0.0, 0.94), m_trim, bevel=0.01, parent=root)

    for side in [-1, 1]:
        sy = side * 0.76
        # Vertical blade taillight + horizontal sweep
        add_box(f"Sedan_Taillight_Vert_{side}", (0.04, 0.035, 0.26), (-2.36, side * 0.86, 0.72), m_taillight, bevel=0.005, parent=root)
        add_box(f"Sedan_Taillight_Horiz_{side}", (0.04, 0.35, 0.06), (-2.36, sy, 0.82), m_taillight, bevel=0.005, parent=root)
        # Dual chrome exhaust tips on each side (Quad exhausts total)
        add_cyl(f"Sedan_Exhaust_Outer_{side}", 0.045, 0.12, (-2.36, side * 0.68, 0.24), (0, math.pi / 2, 0), m_chrome, verts=16, parent=root)
        add_cyl(f"Sedan_Exhaust_Inner_{side}", 0.045, 0.12, (-2.36, side * 0.56, 0.24), (0, math.pi / 2, 0), m_chrome, verts=16, parent=root)

    # 7. Interior Driver
    build_driver(root, 0.05, 0.38, 0.62, m_shirt, m_skin, m_trim, m_dark)

    # 8. 4 Forward-Rolling Sports Wheels
    w_rad = 0.34
    w_wid = 0.24
    create_wheel(root, "Wheel_FL", 1.42, 0.88, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_trim, "spoke5", m_caliper)
    create_wheel(root, "Wheel_FR", 1.42, -0.88, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_trim, "spoke5", m_caliper)
    create_wheel(root, "Wheel_RL", -1.35, 0.88, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_trim, "spoke5", m_caliper)
    create_wheel(root, "Wheel_RR", -1.35, -0.88, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_trim, "spoke5", m_caliper)

    # Export
    out_path = os.path.join(MODELS_DIR, "car-sedan.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=False, export_yup=True, export_apply=True)
    print(f"SUCCESS: Exported Sedan to {out_path}")


# ==============================================================================
# CAR 2: DECLASSE TULIP / CHARGER (MIDNIGHT PLUM NIGHT MUSCLE WITH BLOWER)
# Reference: Plum/purple muscle car with massive chrome supercharger blower,
# 3 red round butterfly scoop valves, quad round headlights, chrome bumpers
# ==============================================================================
def build_muscle():
    reset_scene()
    root = bpy.data.objects.new("Car_Muscle_Root", None)
    bpy.context.collection.objects.link(root)

    # Materials
    m_body = make_mat("Muscle_Plum_Purple", (0.32, 0.12, 0.38, 1.0), metallic=0.72, roughness=0.20, coat=0.9)
    m_chrome = make_mat("Muscle_Chrome", (0.95, 0.96, 0.98, 1.0), metallic=0.98, roughness=0.06, emission=(0.3, 0.3, 0.35, 1.0), emission_strength=0.2)
    m_trim = make_mat("Muscle_Black_Trim", (0.04, 0.04, 0.045, 1.0), metallic=0.2, roughness=0.7)
    m_glass = make_mat("Muscle_Glass", (0.08, 0.10, 0.12, 1.0), metallic=0.2, roughness=0.04, coat=1.0, alpha=0.45)
    m_headlight = make_mat("Muscle_Xenon_Headlight", (0.92, 0.96, 1.0, 1.0), roughness=0.05, emission=(0.92, 0.96, 1.0, 1.0), emission_strength=15.0)
    m_taillight = make_mat("Muscle_Taillight", (0.95, 0.02, 0.02, 1.0), roughness=0.08, emission=(0.95, 0.02, 0.02, 1.0), emission_strength=10.0)
    m_red_valve = make_mat("Muscle_Red_Butterfly", (0.90, 0.05, 0.06, 1.0), metallic=0.1, roughness=0.2, emission=(0.9, 0.05, 0.06, 1.0), emission_strength=1.5)
    m_tire = make_mat("Muscle_Tire", (0.035, 0.035, 0.04, 1.0), metallic=0.0, roughness=0.88)
    m_rim = make_mat("Muscle_TorqThrust_Rim", (0.92, 0.94, 0.97, 1.0), metallic=0.92, roughness=0.12, coat=0.9)
    m_dark = make_mat("Muscle_Dark", (0.08, 0.08, 0.09, 1.0), roughness=0.75)
    m_skin = make_mat("Driver_Skin", (0.55, 0.36, 0.25, 1.0), roughness=0.6)
    m_shirt = make_mat("Driver_Shirt", (0.12, 0.12, 0.14, 1.0), roughness=0.7)

    # 1. Heavy American Muscle Steel Chassis
    add_box("Muscle_Chassis", (5.05, 1.94, 0.16), (0.0, 0.0, 0.22), m_dark, bevel=0.02, parent=root)

    # 2. Muscular Lower Body Hull (Midnight Plum Purple)
    # Long hood, wide rear haunches
    add_box("Muscle_Body_Main", (5.00, 1.98, 0.52), (0.0, 0.0, 0.54), m_body, bevel=0.06, segs=3, parent=root)
    # Flared rear quarter panels (wide muscle stance)
    for side in [-1, 1]:
        add_box(f"Muscle_Rear_Flare_{side}", (1.45, 0.08, 0.38), (-1.40, side * 1.01, 0.58), m_body, bevel=0.04, parent=root)

    # Heavy Chrome Front Bumper (Classic wrap-around)
    add_box("Muscle_Front_Bumper", (0.28, 2.06, 0.18), (2.56, 0.0, 0.44), m_chrome, bevel=0.05, parent=root)
    add_box("Muscle_Rear_Bumper", (0.28, 2.06, 0.18), (-2.54, 0.0, 0.44), m_chrome, bevel=0.05, parent=root)

    # 3. Front Fascia: Chrome Horizontal Billet Grille & Quad Round Sealed-Beam Headlights
    add_box("Muscle_Grille_Recess", (0.08, 1.84, 0.28), (2.50, 0.0, 0.62), m_trim, bevel=0.02, parent=root)
    for g_z in [0.54, 0.60, 0.66, 0.70]:
        add_box(f"Muscle_Grille_Billet_{g_z}", (0.02, 1.80, 0.02), (2.52, 0.0, g_z), m_chrome, parent=root)

    # Quad Round Headlights (2 on left, 2 on right)
    for side in [-1, 1]:
        for h_idx, hy_off in enumerate([0.58, 0.80]):
            hy = side * hy_off
            add_cyl(f"Muscle_Bezel_{side}_{h_idx}", 0.082, 0.06, (2.52, hy, 0.62), (0, math.pi / 2, 0), m_chrome, verts=20, parent=root)
            add_cyl(f"Muscle_Lens_{side}_{h_idx}", 0.068, 0.07, (2.53, hy, 0.62), (0, math.pi / 2, 0), m_headlight, verts=20, parent=root)

    # 4. Long Classic Hood with Cutout for Massive Supercharger Blower
    add_box("Muscle_Hood", (1.80, 1.88, 0.14), (1.50, 0.0, 0.80), m_body, bevel=0.04, parent=root)

    # ==========================================================================
    # MASSIVE CHROME SUPERCHARGER / BLOWER ASSEMBLY (The Signature Feature!)
    # Protruding right out of the hood cutout at X = 1.25
    # ==========================================================================
    # Blower main housing (ribbed chrome case)
    add_box("Blower_Housing", (0.75, 0.48, 0.32), (1.25, 0.0, 1.02), m_chrome, bevel=0.04, parent=root)
    for rib_x in [1.02, 1.15, 1.28, 1.40]:
        add_box(f"Blower_Rib_{rib_x}", (0.03, 0.50, 0.33), (rib_x, 0.0, 1.02), m_trim, bevel=0.005, parent=root)

    # Blower Front Drive Pulley & Toothed Belt
    add_cyl("Blower_Pulley_Top", 0.09, 0.06, (1.64, 0.0, 1.04), (math.pi / 2, 0, 0), m_chrome, verts=20, parent=root)
    add_cyl("Blower_Pulley_Bot", 0.11, 0.06, (1.64, 0.0, 0.82), (math.pi / 2, 0, 0), m_chrome, verts=20, parent=root)
    add_box("Blower_Belt", (0.03, 0.055, 0.28), (1.64, 0.0, 0.93), m_trim, bevel=0.005, parent=root)

    # Street Bugcatcher Air Scoop on top of blower
    add_box("Blower_Scoop_Body", (0.65, 0.54, 0.22), (1.28, 0.0, 1.25), m_chrome, bevel=0.05, parent=root)
    # Triangular flare forward
    add_box("Blower_Scoop_Mouth", (0.12, 0.56, 0.24), (1.60, 0.0, 1.25), m_trim, bevel=0.02, parent=root)

    # Triple Red Butterfly Intake Valves facing forward!
    for v_idx, vy in enumerate([-0.16, 0.0, 0.16]):
        # Chrome round bezel
        add_cyl(f"Blower_Valve_Bezel_{v_idx}", 0.075, 0.03, (1.64, vy, 1.25), (0, math.pi / 2, 0), m_chrome, verts=20, parent=root)
        # Red circular butterfly valve plate
        add_cyl(f"Blower_Butterfly_{v_idx}", 0.065, 0.04, (1.65, vy, 1.25), (0, math.pi / 2, 0), m_red_valve, verts=20, parent=root)

    # 5. Classic 2-Door Coupe Greenhouse
    add_box("Muscle_Roof", (1.65, 1.48, 0.08), (-0.45, 0.0, 1.35), m_body, bevel=0.03, parent=root)
    add_box("Muscle_Windshield", (0.80, 1.44, 0.50), (0.42, 0.0, 1.08), m_glass, bevel=0.02, parent=root)
    add_box("Muscle_Rear_Window", (0.85, 1.42, 0.46), (-1.35, 0.0, 1.08), m_glass, bevel=0.02, parent=root)

    for side in [-1, 1]:
        sy = side * 0.76
        add_box(f"Muscle_Side_Glass_{side}", (1.50, 0.02, 0.42), (-0.45, sy, 1.06), m_glass, parent=root)
        add_box(f"Muscle_Drip_Rail_{side}", (1.68, 0.02, 0.02), (-0.45, sy, 1.34), m_chrome, parent=root)
        add_box(f"Muscle_Mirror_{side}", (0.12, 0.08, 0.08), (0.55, side * 0.98, 0.86), m_chrome, bevel=0.01, parent=root)

    # 6. Flat Muscle Trunk Deck, Horizontal Taillights & Dual Chrome Exhausts
    add_box("Muscle_Trunk", (1.05, 1.85, 0.14), (-1.95, 0.0, 0.78), m_body, bevel=0.03, parent=root)
    for side in [-1, 1]:
        add_box(f"Muscle_Taillight_{side}", (0.04, 0.55, 0.12), (-2.52, side * 0.55, 0.62), m_taillight, bevel=0.01, parent=root)
        add_cyl(f"Muscle_Exhaust_{side}", 0.055, 0.22, (-2.54, side * 0.62, 0.28), (0, math.pi / 2, 0), m_chrome, verts=18, parent=root)

    # 7. Driver seated inside
    build_driver(root, 0.0, 0.40, 0.58, m_shirt, m_skin, m_trim, m_dark)

    # 8. 4 Deep-Dish Chrome Muscle Drag Wheels (Wider/taller in rear!)
    w_rad_f = 0.33
    w_rad_r = 0.36
    w_wid_f = 0.24
    w_wid_r = 0.30
    create_wheel(root, "Wheel_FL", 1.55, 0.94, w_rad_f, w_rad_f, w_wid_f, m_rim, m_tire, m_chrome, m_dark, "classic5")
    create_wheel(root, "Wheel_FR", 1.55, -0.94, w_rad_f, w_rad_f, w_wid_f, m_rim, m_tire, m_chrome, m_dark, "classic5")
    create_wheel(root, "Wheel_RL", -1.45, 0.96, w_rad_r, w_rad_r, w_wid_r, m_rim, m_tire, m_chrome, m_dark, "classic5")
    create_wheel(root, "Wheel_RR", -1.45, -0.96, w_rad_r, w_rad_r, w_wid_r, m_rim, m_tire, m_chrome, m_dark, "classic5")

    # Export
    out_path = os.path.join(MODELS_DIR, "car-muscle.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=False, export_yup=True, export_apply=True)
    print(f"SUCCESS: Exported Muscle to {out_path}")


# ==============================================================================
# CAR 3: IMPONTE DELUXO / DELOREAN DMC-12 (BRUSHED STAINLESS STEEL WEDGE)
# Reference: Iconic 80s wedge silhouette, brushed stainless body, black rub-strip,
# black rear window louvers, rectangular headlights, turbine multispoke wheels
# ==============================================================================
def build_delorean():
    reset_scene()
    root = bpy.data.objects.new("Car_Delorean_Root", None)
    bpy.context.collection.objects.link(root)

    # Materials
    m_steel = make_mat("Deluxo_Brushed_Stainless", (0.86, 0.88, 0.90, 1.0), metallic=0.96, roughness=0.28)
    m_strip = make_mat("Deluxo_Black_Rubstrip", (0.05, 0.05, 0.055, 1.0), metallic=0.1, roughness=0.8)
    m_bumper = make_mat("Deluxo_Bumper_Grey", (0.28, 0.29, 0.31, 1.0), metallic=0.2, roughness=0.6)
    m_glass = make_mat("Deluxo_Glass", (0.08, 0.10, 0.12, 1.0), metallic=0.2, roughness=0.04, coat=1.0, alpha=0.45)
    m_headlight = make_mat("Deluxo_Headlight", (1.0, 0.98, 0.92, 1.0), roughness=0.06, emission=(1.0, 0.98, 0.92, 1.0), emission_strength=12.0)
    m_amber = make_mat("Deluxo_Amber", (1.0, 0.52, 0.02, 1.0), roughness=0.1, emission=(1.0, 0.52, 0.02, 1.0), emission_strength=8.0)
    m_taillight = make_mat("Deluxo_Taillight", (0.95, 0.02, 0.02, 1.0), roughness=0.08, emission=(0.95, 0.02, 0.02, 1.0), emission_strength=10.0)
    m_tire = make_mat("Deluxo_Tire", (0.035, 0.035, 0.04, 1.0), metallic=0.0, roughness=0.85)
    m_rim = make_mat("Deluxo_Turbine_Rim", (0.88, 0.90, 0.92, 1.0), metallic=0.88, roughness=0.22)
    m_chrome = make_mat("Deluxo_Chrome", (0.92, 0.94, 0.96, 1.0), metallic=0.96, roughness=0.1)
    m_dark = make_mat("Deluxo_Dark", (0.06, 0.06, 0.07, 1.0), roughness=0.8)
    m_skin = make_mat("Driver_Skin", (0.55, 0.36, 0.25, 1.0), roughness=0.6)
    m_shirt = make_mat("Driver_Shirt", (0.85, 0.25, 0.15, 1.0), roughness=0.7)

    # 1. Low-Slung Chassis & Front Chin Spoiler
    add_box("Deluxo_Chassis", (4.30, 1.82, 0.12), (0.0, 0.0, 0.18), m_dark, bevel=0.02, parent=root)
    add_box("Deluxo_Front_Chin", (0.35, 1.84, 0.08), (2.12, 0.0, 0.14), m_bumper, bevel=0.02, parent=root)

    # 2. Wedge Lower Hull (Lower bumper grey + Continuous Black Rubber Rubstrip)
    add_box("Deluxo_Lower_Sill", (4.25, 1.84, 0.20), (0.0, 0.0, 0.30), m_bumper, bevel=0.03, parent=root)
    # The signature black rubstrip dividing upper and lower body:
    add_box("Deluxo_Rubstrip", (4.32, 1.88, 0.06), (0.0, 0.0, 0.44), m_strip, bevel=0.01, parent=root)

    # 3. Brushed Stainless Upper Body (Sloping Wedge Front to Rear Fastback)
    # Front Wedge Nose (starts razor thin at X = 2.18, Z = 0.48)
    add_box("Deluxo_Front_Nose", (0.45, 1.86, 0.16), (1.98, 0.0, 0.54), m_steel, bevel=0.04, parent=root)
    # Long Flat Sloping Hood
    add_box("Deluxo_Hood", (1.45, 1.78, 0.12), (1.10, 0.0, 0.64), m_steel, bevel=0.03, parent=root)
    # Twin longitudinal hood accent grooves (Signature DeLorean hood lines)
    for side in [-1, 1]:
        add_box(f"Deluxo_Hood_Groove_{side}", (1.15, 0.04, 0.02), (1.12, side * 0.45, 0.71), m_strip, parent=root)

    # 4. Front Fascia: Recessed Dual Rectangular Headlights + Amber Signals
    add_box("Deluxo_Grille_Bar", (0.04, 1.80, 0.14), (2.18, 0.0, 0.52), m_strip, bevel=0.01, parent=root)
    add_box("Deluxo_Grille_Emblem", (0.02, 0.12, 0.06), (2.20, 0.0, 0.52), m_chrome, parent=root)
    for side in [-1, 1]:
        # Dual rectangular headlights
        add_box(f"Deluxo_Headlight_Outer_{side}", (0.04, 0.20, 0.09), (2.19, side * 0.68, 0.52), m_headlight, bevel=0.005, parent=root)
        add_box(f"Deluxo_Headlight_Inner_{side}", (0.04, 0.20, 0.09), (2.19, side * 0.44, 0.52), m_headlight, bevel=0.005, parent=root)
        # Amber turn signal on outer corner
        add_box(f"Deluxo_TurnSignal_{side}", (0.04, 0.10, 0.08), (2.19, side * 0.82, 0.44), m_amber, bevel=0.005, parent=root)

    # 5. Low-Slung Greenhouse with Gullwing Door Lines
    # Raked windshield
    add_box("Deluxo_Windshield", (0.85, 1.48, 0.45), (0.35, 0.0, 0.92), m_glass, bevel=0.02, parent=root)
    add_box("Deluxo_Roof", (1.10, 1.42, 0.06), (-0.40, 0.0, 1.18), m_steel, bevel=0.02, parent=root)

    # Gullwing Door Window Glass & Black Perimeter Trim
    for side in [-1, 1]:
        sy = side * 0.72
        add_box(f"Deluxo_Door_Glass_{side}", (1.05, 0.02, 0.38), (-0.35, sy, 0.96), m_glass, parent=root)
        add_box(f"Deluxo_Door_Cut_{side}", (0.02, 0.02, 0.40), (0.18, sy, 0.96), m_strip, parent=root)
        add_box(f"Deluxo_Mirror_{side}", (0.12, 0.09, 0.07), (0.42, side * 0.92, 0.74), m_strip, bevel=0.01, parent=root)

    # ==========================================================================
    # SIGNATURE REAR WINDOW SUNSHADE LOUVERS (5 Horizontal Stepped Slats)
    # ==========================================================================
    add_box("Deluxo_Rear_Glass", (0.95, 1.36, 0.36), (-1.25, 0.0, 0.90), m_glass, bevel=0.01, parent=root)
    louver_coords = [(-0.85, 1.08), (-1.02, 0.99), (-1.19, 0.90), (-1.36, 0.81), (-1.53, 0.72)]
    for idx, (lx, lz) in enumerate(louver_coords):
        add_box(f"Deluxo_Louver_{idx}", (0.14, 1.32, 0.025), (lx, 0.0, lz), m_strip, bevel=0.004, parent=root)

    # 6. Rear Fascia: 80s Grid Taillights & Stainless Tail Valance
    add_box("Deluxo_Rear_Fascia", (0.10, 1.82, 0.28), (-2.14, 0.0, 0.52), m_strip, bevel=0.02, parent=root)
    for side in [-1, 1]:
        sy = side * 0.62
        # Multi-square retro taillight grid (Orange top, Red bottom)
        add_box(f"Deluxo_Tail_Amber_{side}", (0.03, 0.48, 0.06), (-2.19, sy, 0.58), m_amber, bevel=0.005, parent=root)
        add_box(f"Deluxo_Tail_Red_{side}", (0.03, 0.48, 0.08), (-2.19, sy, 0.48), m_taillight, bevel=0.005, parent=root)
        # Dual stainless exhaust tips
        add_cyl(f"Deluxo_Exhaust_{side}", 0.04, 0.14, (-2.18, side * 0.52, 0.22), (0, math.pi / 2, 0), m_chrome, verts=16, parent=root)

    # 7. Driver seated inside
    build_driver(root, 0.0, 0.36, 0.48, m_shirt, m_skin, m_strip, m_dark)

    # 8. 4 DeLorean Turbine Alloy Wheels (15 Multi-Fins)
    w_rad = 0.32
    w_wid = 0.22
    create_wheel(root, "Wheel_FL", 1.25, 0.84, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_dark, "turbine")
    create_wheel(root, "Wheel_FR", 1.25, -0.84, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_dark, "turbine")
    create_wheel(root, "Wheel_RL", -1.15, 0.86, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_dark, "turbine")
    create_wheel(root, "Wheel_RR", -1.15, -0.86, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_dark, "turbine")

    # Export
    out_path = os.path.join(MODELS_DIR, "car-delorean.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=False, export_yup=True, export_apply=True)
    print(f"SUCCESS: Exported Delorean to {out_path}")


# ==============================================================================
# CAR 4: UBERMACHT SC1 / BMW i8 (ELECTRIC ACID LIME-GREEN HYPERCAR)
# Reference: Acid lime body, glowing neon yellow accent contour lights,
# black roof & aero hood scoop, flying buttresses, futuristic aero blade wheels
# ==============================================================================
def build_hypercar():
    reset_scene()
    root = bpy.data.objects.new("Car_Hypercar_Root", None)
    bpy.context.collection.objects.link(root)

    # Materials
    m_lime = make_mat("Hyper_Acid_Lime", (0.38, 0.90, 0.04, 1.0), metallic=0.18, roughness=0.12, coat=1.0)
    m_black = make_mat("Hyper_Gloss_Black", (0.025, 0.025, 0.03, 1.0), metallic=0.3, roughness=0.10, coat=1.0)
    m_carbon = make_mat("Hyper_Carbon", (0.04, 0.04, 0.05, 1.0), metallic=0.1, roughness=0.6)
    m_neon = make_mat("Hyper_Neon_Yellow", (0.92, 1.0, 0.08, 1.0), roughness=0.05, emission=(0.92, 1.0, 0.08, 1.0), emission_strength=14.0)
    m_headlight = make_mat("Hyper_LED_Headlight", (0.95, 0.98, 1.0, 1.0), roughness=0.05, emission=(0.95, 0.98, 1.0, 1.0), emission_strength=15.0)
    m_taillight = make_mat("Hyper_LED_Taillight", (1.0, 0.04, 0.04, 1.0), roughness=0.05, emission=(1.0, 0.04, 0.04, 1.0), emission_strength=12.0)
    m_glass = make_mat("Hyper_Tinted_Glass", (0.06, 0.08, 0.10, 1.0), metallic=0.2, roughness=0.04, coat=1.0, alpha=0.45)
    m_tire = make_mat("Hyper_Tire", (0.035, 0.035, 0.04, 1.0), metallic=0.0, roughness=0.85)
    m_rim = make_mat("Hyper_Blade_Rim", (0.88, 0.90, 0.94, 1.0), metallic=0.90, roughness=0.15, coat=0.8)
    m_chrome = make_mat("Hyper_Chrome", (0.92, 0.94, 0.96, 1.0), metallic=0.96, roughness=0.08)
    m_dark = make_mat("Hyper_Dark", (0.06, 0.06, 0.08, 1.0), roughness=0.75)
    m_skin = make_mat("Driver_Skin", (0.55, 0.36, 0.25, 1.0), roughness=0.6)
    m_shirt = make_mat("Driver_Shirt", (0.90, 0.90, 0.92, 1.0), roughness=0.7)

    # 1. Carbon-Fiber Undertray & Lower Splitter
    add_box("Hyper_Chassis", (4.65, 1.94, 0.12), (0.0, 0.0, 0.18), m_carbon, bevel=0.02, parent=root)
    add_box("Hyper_Front_Splitter", (0.42, 1.98, 0.04), (2.28, 0.0, 0.14), m_carbon, bevel=0.01, parent=root)
    add_box("Hyper_Rear_Diffuser", (0.50, 1.96, 0.16), (-2.22, 0.0, 0.24), m_carbon, bevel=0.02, parent=root)

    # 2. Sculpted Acid-Lime Lower Body & Side Aerodynamic Air Scoops
    add_box("Hyper_Body_Tub", (4.55, 1.96, 0.44), (0.0, 0.0, 0.44), m_lime, bevel=0.08, segs=4, parent=root)

    # GLOWING NEON-YELLOW ROCKER SKIRT ACCENT STRIPS (Both sides)
    for side in [-1, 1]:
        sy = side * 0.985
        # Neon light piping running along the lower side rocker skirt
        add_box(f"Hyper_Neon_Skirt_{side}", (2.40, 0.025, 0.035), (0.05, sy, 0.22), m_neon, bevel=0.006, parent=root)
        # Deep side scalloped air intake channel
        add_box(f"Hyper_Side_Intake_{side}", (0.85, 0.06, 0.24), (-0.45, side * 0.95, 0.46), m_black, bevel=0.02, parent=root)

    # 3. Two-Tone Front Fascia with GLOWING NEON ACCENT CONTOURS
    add_box("Hyper_Nose_Center", (0.55, 1.20, 0.28), (2.05, 0.0, 0.52), m_lime, bevel=0.06, parent=root)
    # Dual Hexagonal Grilles
    for side in [-1, 1]:
        gy = side * 0.38
        add_box(f"Hyper_Grille_{side}", (0.04, 0.32, 0.16), (2.32, gy, 0.50), m_black, bevel=0.01, parent=root)
        # GLOWING NEON-YELLOW ACCENT CONTOUR PIPING tracing the front air dam!
        add_box(f"Hyper_Neon_Grille_Top_{side}", (0.03, 0.36, 0.025), (2.33, gy, 0.59), m_neon, bevel=0.005, parent=root)
        add_box(f"Hyper_Neon_Grille_Bot_{side}", (0.03, 0.36, 0.025), (2.33, gy, 0.41), m_neon, bevel=0.005, parent=root)
        add_box(f"Hyper_Neon_Grille_Outer_{side}", (0.03, 0.025, 0.18), (2.33, side * 0.56, 0.50), m_neon, bevel=0.005, parent=root)

        # Angled Razor-Thin LED Headlight Blades
        add_box(f"Hyper_Headlight_{side}", (0.06, 0.34, 0.06), (2.28, side * 0.72, 0.64), m_headlight, bevel=0.008, parent=root)

    # 4. Matte Black Hood Aero Heat Extractor Scoop
    add_box("Hyper_Hood_Lime", (1.45, 1.76, 0.12), (1.35, 0.0, 0.72), m_lime, bevel=0.04, parent=root)
    add_box("Hyper_Hood_Aero_Scoop", (0.85, 0.65, 0.04), (1.25, 0.0, 0.78), m_black, bevel=0.015, parent=root)
    for l_x in [1.05, 1.22, 1.38]:
        add_box(f"Hyper_Hood_Louver_{l_x}", (0.04, 0.55, 0.015), (l_x, 0.0, 0.80), m_carbon, parent=root)

    # 5. Contrast Gloss Black Roof & Floating Aerodynamic Flying Buttresses
    add_box("Hyper_Roof_Black", (1.55, 1.38, 0.06), (-0.30, 0.0, 1.22), m_black, bevel=0.03, parent=root)
    add_box("Hyper_Windshield", (0.95, 1.42, 0.46), (0.42, 0.0, 0.98), m_glass, bevel=0.02, parent=root)
    add_box("Hyper_Rear_Deck", (1.25, 1.36, 0.10), (-1.45, 0.0, 0.88), m_black, bevel=0.03, parent=root)

    # Floating Aerodynamic Flying Buttresses (C-Pillar air tunnels)
    for side in [-1, 1]:
        by = side * 0.78
        add_box(f"Hyper_Buttress_{side}", (1.35, 0.16, 0.28), (-1.25, by, 1.04), m_lime, bevel=0.04, parent=root)
        # Open air tunnel beneath buttress
        add_box(f"Hyper_Air_Tunnel_{side}", (1.20, 0.12, 0.18), (-1.25, side * 0.64, 0.94), m_black, parent=root)
        # Side door glass
        add_box(f"Hyper_Side_Glass_{side}", (1.35, 0.02, 0.36), (-0.25, side * 0.72, 0.96), m_glass, parent=root)
        # Aerodynamic wing mirror
        add_box(f"Hyper_Mirror_{side}", (0.16, 0.14, 0.05), (0.55, side * 0.96, 0.82), m_carbon, bevel=0.01, parent=root)

    # 6. Futuristic Rear Fascia: Integrated LED Blade Ribbon Taillights
    add_box("Hyper_Rear_Tail_Center", (0.08, 1.55, 0.26), (-2.26, 0.0, 0.68), m_black, bevel=0.02, parent=root)
    for side in [-1, 1]:
        # Thin U-shaped glowing red LED ribbon taillight integrated into the flying buttress trailing edge
        add_box(f"Hyper_Taillight_Top_{side}", (0.04, 0.48, 0.04), (-2.28, side * 0.62, 0.78), m_taillight, bevel=0.005, parent=root)
        add_box(f"Hyper_Taillight_Bot_{side}", (0.04, 0.38, 0.04), (-2.28, side * 0.55, 0.62), m_taillight, bevel=0.005, parent=root)
        add_box(f"Hyper_Taillight_Vert_{side}", (0.04, 0.04, 0.18), (-2.28, side * 0.85, 0.70), m_taillight, bevel=0.005, parent=root)

    # 7. Interior Driver
    build_driver(root, 0.02, 0.36, 0.52, m_shirt, m_skin, m_black, m_dark)

    # 8. 4 Futuristic Turbine Blade Aero Wheels with Neon Pinstripe
    w_rad = 0.35
    w_wid = 0.25
    create_wheel(root, "Wheel_FL", 1.38, 0.88, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_black, "aero_blade", m_neon)
    create_wheel(root, "Wheel_FR", 1.38, -0.88, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_black, "aero_blade", m_neon)
    create_wheel(root, "Wheel_RL", -1.30, 0.90, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_black, "aero_blade", m_neon)
    create_wheel(root, "Wheel_RR", -1.30, -0.90, w_rad, w_rad, w_wid, m_rim, m_tire, m_chrome, m_black, "aero_blade", m_neon)

    # Export
    out_path = os.path.join(MODELS_DIR, "car-hypercar.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=False, export_yup=True, export_apply=True)
    print(f"SUCCESS: Exported Hypercar to {out_path}")

    # Also export copy to private-car.glb as default fallback
    fallback_path = os.path.join(MODELS_DIR, "private-car.glb")
    bpy.ops.export_scene.gltf(filepath=fallback_path, export_format='GLB', use_selection=False, export_yup=True, export_apply=True)
    print(f"SUCCESS: Exported fallback to {fallback_path}")

# ==============================================================================
# MAIN BATCH EXECUTION
# ==============================================================================
if __name__ == "__main__":
    print("=== 1/4 BUILDING ALBANY V-STR SPORTS SEDAN ===")
    build_sedan()
    print("=== 2/4 BUILDING DECLASSE TULIP NIGHT MUSCLE ===")
    build_muscle()
    print("=== 3/4 BUILDING IMPONTE DELUXO WEDGE ===")
    build_delorean()
    print("=== 4/4 BUILDING UBERMACHT SC1 LIME HYPERCAR ===")
    build_hypercar()
    print("=== ALL 4 CAR GLB ASSETS EXPORTED SUCCESSFULLY ===")
