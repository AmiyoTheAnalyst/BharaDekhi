import bpy
import bmesh
import math
import os

# ==============================================================================
# GTA V MOTORCYCLE & ORGANIC MULTI-OUTFIT RIDER BUILDER (BLENDER 5.2)
# ==============================================================================

REPO_ROOT = r"c:\Users\HP\Desktop\commute-dhaka-web"
OUTPUT_GLB = os.path.join(REPO_ROOT, "assets", "models", "sportbike-rider.glb")

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

def apply_crisp_edges(obj, split_angle_deg=35.0):
    bpy.ops.object.shade_smooth()
    mod = obj.modifiers.new("EdgeSplit", 'EDGE_SPLIT')
    mod.split_angle = math.radians(split_angle_deg)
    mod.use_edge_angle = True
    return obj

def add_box(name, size, loc, mat, bevel=0.0, segs=2, parent=None, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0.001:
        bev = obj.modifiers.new(name="Bevel", type='BEVEL')
        bev.width = bevel
        bev.segments = segs
        bpy.ops.object.modifier_apply(modifier=bev.name)
    apply_crisp_edges(obj, 35)
    obj.data.materials.append(mat)
    return link_obj(obj, parent)

def add_cyl(name, radius, depth, loc, rot, mat, verts=24, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    apply_crisp_edges(obj, 30)
    obj.data.materials.append(mat)
    return link_obj(obj, parent)

def add_torus(name, major_rad, minor_rad, loc, rot, mat, segs_maj=48, segs_min=20, parent=None):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_rad,
        minor_radius=minor_rad,
        major_segments=segs_maj,
        minor_segments=segs_min,
        location=loc,
        rotation=rot
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return link_obj(obj, parent)

def add_sphere(name, radius, loc, mat, segs_u=24, segs_v=18, parent=None, scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=segs_u, ring_count=segs_v, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return link_obj(obj, parent)

def build_sportbike_and_rider():
    reset_scene()

    # Materials
    mat_fairing_red = make_mat("Fairing_YamahaBlue", (0.85, 0.08, 0.12, 1.0), metallic=0.35, roughness=0.18, coat=1.0)
    mat_gloss_black = make_mat("Fairing_GlossBlack", (0.04, 0.04, 0.05, 1.0), metallic=0.15, roughness=0.25, coat=0.8)
    mat_dark_frame = make_mat("Frame_DarkAlloy", (0.08, 0.09, 0.11, 1.0), metallic=0.75, roughness=0.38)
    mat_billet_silver = make_mat("Engine_BilletSilver", (0.75, 0.78, 0.82, 1.0), metallic=0.85, roughness=0.22)
    mat_chrome = make_mat("Exhaust_Chrome", (0.92, 0.94, 0.96, 1.0), metallic=0.96, roughness=0.08)
    mat_gold_caliper = make_mat("Brake_BremboGold", (0.92, 0.65, 0.12, 1.0), metallic=0.88, roughness=0.22)
    mat_gold_fork = make_mat("Fork_KashimaGold", (0.88, 0.60, 0.10, 1.0), metallic=0.90, roughness=0.16)
    mat_disc_steel = make_mat("Brake_RotorSteel", (0.78, 0.80, 0.84, 1.0), metallic=0.82, roughness=0.24)
    mat_tire_rubber = make_mat("Tire_PirelliRubber", (0.025, 0.025, 0.03, 1.0), metallic=0.02, roughness=0.92)
    mat_rim_alloy = make_mat("Rim_YamahaBlue", (0.70, 0.73, 0.78, 1.0), metallic=0.85, roughness=0.20)
    mat_leather_seat = make_mat("Seat_PerforatedLeather", (0.05, 0.05, 0.06, 1.0), roughness=0.62)
    mat_radiator_fins = make_mat("Radiator_Fins", (0.45, 0.48, 0.52, 1.0), metallic=0.80, roughness=0.35)
    mat_windscreen = make_mat("Windscreen_DarkSmoked", (0.05, 0.07, 0.10, 1.0), roughness=0.05, metallic=0.2, alpha=0.35)
    mat_headlight = make_mat("Headlight_ProjectorLED", (1.0, 1.0, 1.0, 1.0), roughness=0.05, emission=(1.0, 1.0, 1.0, 1.0), emission_strength=12.0)
    mat_taillight = make_mat("Taillight_NeonRed", (1.0, 0.02, 0.02, 1.0), roughness=0.08, emission=(1.0, 0.02, 0.02, 1.0), emission_strength=10.0)

    # Rider Materials
    mat_skin = make_mat("Rider_NaturalSkin", (0.72, 0.46, 0.32, 1.0), roughness=0.52)
    mat_lips = make_mat("Rider_Lips", (0.62, 0.28, 0.24, 1.0), roughness=0.45)
    mat_eye_white = make_mat("Eye_Sclera", (0.96, 0.96, 0.98, 1.0), roughness=0.10)
    mat_dark_iris = make_mat("Eye_Iris", (0.08, 0.09, 0.12, 1.0), roughness=0.15)
    mat_hair_brow = make_mat("Rider_Hair", (0.04, 0.04, 0.04, 1.0), roughness=0.85)
    mat_leather_jacket = make_mat("Rider_LeatherJacket", (0.05, 0.05, 0.06, 1.0), roughness=0.38)
    mat_white_tshirt = make_mat("Rider_CrewTShirt", (0.92, 0.94, 0.96, 1.0), roughness=0.65)
    mat_dark_jeans = make_mat("Rider_IndigoJeans", (0.08, 0.11, 0.18, 1.0), roughness=0.72)
    mat_sneaker_black = make_mat("Rider_SneakerBlack", (0.04, 0.04, 0.05, 1.0), roughness=0.45)
    mat_sneaker_white = make_mat("Rider_SneakerWhite", (0.94, 0.95, 0.96, 1.0), roughness=0.40)
    mat_helmet_shell = make_mat("Helmet_GlossBlack", (0.03, 0.03, 0.035, 1.0), metallic=0.3, roughness=0.18, coat=1.0)
    mat_helmet_liner = make_mat("Helmet_Liner", (0.04, 0.04, 0.04, 1.0), roughness=0.90)
    mat_helmet_visor = make_mat("Helmet_SmokedVisor", (0.08, 0.10, 0.14, 1.0), roughness=0.04, metallic=0.35, alpha=0.38)

    # Master Root
    bike_root = bpy.data.objects.new("GTA_Sportbike", None)
    bpy.context.collection.objects.link(bike_root)

    # ==========================================================================
    # 1. WHEEL HARDWARE: HOLLOW 5-SPOKE ALLOY WHEELS (CLEAR EMPTY GAPS)
    # Native Orientation: X=Front/Back, Y=Width (Axle), Z=Height
    # ==========================================================================
    def build_wheel(name, wx, wz, radius, tire_w, is_rear=False):
        w_pivot = bpy.data.objects.new(name, None)
        w_pivot.location = (wx, 0.0, wz)
        link_obj(w_pivot, bike_root)

        # Deep black tire
        add_torus(
            f"{name}_Tire",
            radius - tire_w * 0.48,
            tire_w * 0.48,
            (0, 0, 0),
            (math.pi / 2, 0, 0),
            mat_tire_rubber,
            parent=w_pivot
        )

        # Alloy Rim Hoop
        add_torus(
            f"{name}_RimHoop",
            radius - tire_w * 0.95,
            0.016,
            (0, 0, 0),
            (math.pi / 2, 0, 0),
            mat_rim_alloy,
            parent=w_pivot
        )

        # Central Hub
        add_cyl(
            f"{name}_Hub",
            0.042,
            tire_w * 0.85,
            (0, 0, 0),
            (math.pi / 2, 0, 0),
            mat_rim_alloy,
            verts=20,
            parent=w_pivot
        )

        # 5 Star Spokes with open empty gaps
        spoke_r = radius - tire_w * 0.95
        for i in range(5):
            ang = i * (2 * math.pi / 5)
            spk_len = spoke_r * 0.92
            cx = (spk_len / 2) * math.cos(ang)
            cz = (spk_len / 2) * math.sin(ang)
            rot_y = -ang + math.pi / 2
            add_cyl(
                f"{name}_Spoke_{i}",
                0.012,
                spk_len,
                (cx, 0, cz),
                (0, rot_y, 0),
                mat_rim_alloy,
                verts=10,
                parent=w_pivot
            )

        # Perforated Stainless Steel Brake Disc Rotors
        disc_r = radius * 0.64
        disc_inner = radius * 0.42
        disc_sides = [-1, 1] if not is_rear else [1]
        for side in disc_sides:
            dy = side * (tire_w * 0.44)
            # Annular disc
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=32,
                radius=disc_r,
                depth=0.006,
                location=(0, dy, 0),
                rotation=(math.pi / 2, 0, 0)
            )
            disc = bpy.context.active_object
            disc.name = f"{name}_Disc_{side}"
            apply_crisp_edges(disc, 30)
            disc.data.materials.append(mat_disc_steel)
            link_obj(disc, w_pivot)

            # Brembo Gold Caliper
            cal_x = wx - 0.08 if not is_rear else wx + 0.08
            cal_z = wz + radius * 0.48
            add_box(
                f"{name}_Caliper_{side}",
                (0.085, 0.038, 0.12),
                (cal_x, dy, cal_z),
                mat_gold_caliper,
                bevel=0.008,
                parent=bike_root,
                rot=(0, -0.38 if not is_rear else 0.35, 0)
            )

        return w_pivot

    wheel_f = build_wheel("Wheel_F", 0.85, 0.325, 0.325, 0.11, is_rear=False)
    wheel_r = build_wheel("Wheel_R", -0.75, 0.325, 0.325, 0.15, is_rear=True)

    # ==========================================================================
    # 2. INVERTED USD FRONT FORKS & HANDLEBARS
    # ==========================================================================
    fork_angle = 0.38
    for side in [-1, 1]:
        fy = side * 0.095
        add_cyl(f"Fork_Upper_{side}", 0.026, 0.38, (0.68, fy, 0.72), (0, fork_angle, 0), mat_gold_fork, verts=18, parent=bike_root)
        add_cyl(f"Fork_Lower_{side}", 0.021, 0.32, (0.78, fy, 0.46), (0, fork_angle, 0), mat_chrome, verts=18, parent=bike_root)
        add_box(f"Fork_Axle_{side}", (0.06, 0.04, 0.07), (0.85, fy, 0.33), mat_dark_frame, bevel=0.005, parent=bike_root)

    add_box("TripleTree_Upper", (0.09, 0.26, 0.035), (0.58, 0.0, 0.88), mat_dark_frame, bevel=0.008, parent=bike_root)
    add_box("TripleTree_Lower", (0.09, 0.26, 0.045), (0.65, 0.0, 0.74), mat_dark_frame, bevel=0.008, parent=bike_root)

    for side in [-1, 1]:
        ey = side * 0.22
        add_cyl(f"Bar_Grip_{side}", 0.016, 0.12, (0.55, ey, 0.86), (0.15 * side, 0.25, math.pi / 2), mat_leather_seat, verts=14, parent=bike_root)
        add_box(f"Lever_{side}", (0.08, 0.012, 0.015), (0.58, ey, 0.86), mat_chrome, bevel=0.003, parent=bike_root)

    # ==========================================================================
    # 3. RADIATOR, ENGINE & EXHAUST
    # ==========================================================================
    add_box("Radiator", (0.06, 0.26, 0.22), (0.46, 0.0, 0.54), mat_radiator_fins, bevel=0.01, parent=bike_root)
    add_box("Engine_Crankcase", (0.34, 0.24, 0.22), (0.08, 0.0, 0.42), mat_dark_frame, bevel=0.02, parent=bike_root)
    add_cyl("Clutch_Cover", 0.075, 0.04, (0.08, -0.13, 0.40), (math.pi / 2, 0, 0), mat_billet_silver, verts=20, parent=bike_root)
    add_cyl("Alternator_Cover", 0.065, 0.04, (0.08, 0.13, 0.40), (math.pi / 2, 0, 0), mat_billet_silver, verts=20, parent=bike_root)

    # 4 Chrome Header Pipes
    for idx, py in enumerate([-0.075, -0.025, 0.025, 0.075]):
        add_cyl(f"Header_{idx}", 0.016, 0.28, (0.28, py, 0.45), (0, 0.55, 0), mat_chrome, verts=12, parent=bike_root)

    # Dual Upswept Brushed Aluminum Rear Exhausts
    for side in [-1, 1]:
        ey = side * 0.16
        add_cyl(f"Muffler_{side}", 0.048, 0.42, (-0.56, ey + side * 0.03, 0.50), (0.12 * side, -0.55, 0), mat_billet_silver, verts=18, parent=bike_root)

    # Rear Swingarm
    for side in [-1, 1]:
        sy = side * 0.09
        add_box(f"Swingarm_{side}", (0.62, 0.035, 0.06), (-0.40, sy, 0.36), mat_dark_frame, bevel=0.01, parent=bike_root)
        add_cyl(f"Footpeg_{side}", 0.015, 0.08, (-0.14, side * 0.18, 0.38), (math.pi / 2, 0, 0), mat_billet_silver, verts=12, parent=bike_root)

    # ==========================================================================
    # 4. SCULPTED FAIRINGS & FUEL TANK
    # ==========================================================================
    # Fuel Tank with Knee Indents
    add_box("Fuel_Tank", (0.38, 0.26, 0.22), (0.26, 0.0, 0.84), mat_fairing_red, bevel=0.05, segs=3, parent=bike_root)
    add_cyl("Fuel_Cap", 0.038, 0.012, (0.30, 0.0, 0.955), (0, 0, 0), mat_chrome, verts=18, parent=bike_root)
    for side in [-1, 1]:
        add_box(f"Tank_Pad_{side}", (0.20, 0.012, 0.10), (0.22, side * 0.135, 0.82), mat_leather_seat, bevel=0.005, parent=bike_root)

    # Front Cowl & Smoked Windscreen
    add_box("Nose_Cowl", (0.32, 0.26, 0.22), (0.68, 0.0, 0.78), mat_fairing_red, bevel=0.035, segs=3, parent=bike_root, rot=(0, -0.22, 0))
    add_box("Windscreen", (0.26, 0.22, 0.18), (0.62, 0.0, 0.94), mat_windscreen, bevel=0.02, parent=bike_root, rot=(0, -0.45, 0))

    # Cat-Eye Projector Headlights
    for side in [-1, 1]:
        add_box(f"Headlight_{side}", (0.04, 0.06, 0.03), (0.81, side * 0.08, 0.78), mat_headlight, parent=bike_root)

    # Rider & Pillion Seat
    add_box("Rider_Saddle", (0.28, 0.20, 0.06), (-0.06, 0.0, 0.74), mat_leather_seat, bevel=0.022, parent=bike_root)
    add_box("Tail_Cowl", (0.36, 0.16, 0.10), (-0.48, 0.0, 0.80), mat_fairing_red, bevel=0.025, parent=bike_root, rot=(0, -0.15, 0))
    add_box("Taillight_LED", (0.02, 0.12, 0.025), (-0.68, 0.0, 0.82), mat_taillight, bevel=0.004, parent=bike_root)
    add_box("License_Plate", (0.012, 0.13, 0.07), (-0.72, 0.0, 0.68), mat_white_tshirt, bevel=0.002, parent=bike_root)

    # ==========================================================================
    # 5. REALISTIC ANATOMICAL HUMAN RIDER (SCULPTED FACE & OPEN HELMET)
    # ==========================================================================
    rider_root = bpy.data.objects.new("Rider_Root", None)
    rider_root.location = (0.0, 0.0, 0.0)
    link_obj(rider_root, bike_root)

    # Pelvis
    add_box("Rider_Pelvis", (0.22, 0.20, 0.13), (-0.06, 0.0, 0.77), mat_dark_jeans, bevel=0.028, parent=rider_root)

    # Torso (Natural 35° forward sport tuck)
    add_box("Rider_Torso", (0.26, 0.28, 0.32), (0.12, 0.0, 0.94), mat_leather_jacket, bevel=0.045, segs=3, parent=rider_root, rot=(0, 0.42, 0))
    add_box("Rider_Collar", (0.12, 0.14, 0.08), (0.22, 0.0, 1.04), mat_leather_jacket, bevel=0.015, parent=rider_root, rot=(0, 0.42, 0))

    # Neck
    add_cyl("Rider_Neck", 0.048, 0.11, (0.25, 0.0, 1.08), (0, -0.32, 0), mat_skin, verts=18, parent=rider_root)

    # Shoulders (Smooth Deltoid Spheres - ZERO sharp spikes!)
    for side in [-1, 1]:
        sy = side * 0.15
        end_y = side * 0.22
        add_sphere(f"Rider_Shoulder_{side}", 0.062, (0.16, sy, 1.00), mat_leather_jacket, parent=rider_root)
        # Upper Arm
        add_cyl(f"Rider_UpperArm_{side}", 0.044, 0.22, (0.27, (sy + end_y) / 2, 0.96), (0.16 * side, 0.65, 0), mat_leather_jacket, verts=14, parent=rider_root)
        # Elbow Sphere
        add_sphere(f"Rider_Elbow_{side}", 0.046, (0.35, end_y, 0.92), mat_leather_jacket, parent=rider_root)
        # Forearm
        add_cyl(f"Rider_Forearm_{side}", 0.038, 0.20, (0.45, end_y, 0.88), (0, 0.95, 0), mat_leather_jacket, verts=14, parent=rider_root)
        # Glove & Knuckle Armor
        add_box(f"Rider_Glove_{side}", (0.075, 0.055, 0.045), (0.54, end_y, 0.86), mat_gloss_black, bevel=0.008, parent=rider_root)
        add_box(f"Rider_Knuckle_{side}", (0.035, 0.04, 0.012), (0.54, end_y, 0.885), mat_white_tshirt, bevel=0.003, parent=rider_root)

    # Legs & Boots
    for side in [-1, 1]:
        sy = side * 0.13
        add_sphere(f"Rider_Hip_{side}", 0.065, (-0.04, sy + side * 0.02, 0.74), mat_dark_jeans, parent=rider_root)
        add_cyl(f"Rider_Thigh_{side}", 0.058, 0.26, (0.08, sy + side * 0.025, 0.66), (0.14 * side, 0.85, 0), mat_dark_jeans, verts=14, parent=rider_root)
        add_sphere(f"Rider_Knee_{side}", 0.054, (0.19, sy + side * 0.025, 0.54), mat_dark_jeans, parent=rider_root)
        add_box(f"Rider_KneeSlider_{side}", (0.04, 0.03, 0.04), (0.21, sy + side * 0.05, 0.54), mat_white_tshirt, bevel=0.005, parent=rider_root)
        add_cyl(f"Rider_Shin_{side}", 0.046, 0.28, (0.03, sy + side * 0.02, 0.44), (0, -0.65, 0), mat_dark_jeans, verts=14, parent=rider_root)
        add_box(f"Rider_Boot_{side}", (0.15, 0.07, 0.06), (-0.14, sy + side * 0.02, 0.40), mat_sneaker_black, bevel=0.01, parent=rider_root)
        add_box(f"Rider_Sole_{side}", (0.16, 0.075, 0.018), (-0.14, sy + side * 0.02, 0.37), mat_sneaker_white, bevel=0.003, parent=rider_root)

    # Head & Sculpted Face
    hx, hy, hz = 0.34, 0.0, 1.20

    # 1. Skin Cranium
    add_sphere("Head_Cranium", 0.095, (hx, hy, hz), mat_skin, scale=(1.05, 0.92, 1.02), parent=rider_root)

    # 2. Brow Ridge & Eyebrows
    add_box("Face_Brow", (0.035, 0.08, 0.02), (hx + 0.075, hy, hz + 0.022), mat_skin, bevel=0.004, parent=rider_root)
    for side in [-1, 1]:
        add_box(f"Eyebrow_{side}", (0.015, 0.032, 0.006), (hx + 0.086, side * 0.026, hz + 0.026), mat_hair_brow, rot=(0, -0.1, side * 0.08), parent=rider_root)

    # 3. Almond Eyes (Forward Facing)
    for side in [-1, 1]:
        ey = side * 0.026
        add_sphere(f"Eye_White_{side}", 0.014, (hx + 0.075, ey, hz + 0.012), mat_eye_white, parent=rider_root)
        add_sphere(f"Eye_Iris_{side}", 0.009, (hx + 0.085, ey, hz + 0.012), mat_dark_iris, parent=rider_root)

    # 4. Sculpted 3D Nose
    add_box("Nose_Bridge", (0.028, 0.016, 0.035), (hx + 0.084, hy, hz + 0.004), mat_skin, bevel=0.004, rot=(0, -0.32, 0), parent=rider_root)
    add_sphere("Nose_Tip", 0.012, (hx + 0.102, hy, hz - 0.012), mat_skin, parent=rider_root)

    # 5. Cheekbones & Lips & Chin
    for side in [-1, 1]:
        add_box(f"Cheek_{side}", (0.035, 0.028, 0.035), (hx + 0.065, side * 0.045, hz - 0.015), mat_skin, bevel=0.006, parent=rider_root)
    add_box("Lips_Upper", (0.014, 0.034, 0.008), (hx + 0.085, hy, hz - 0.030), mat_lips, bevel=0.002, parent=rider_root)
    add_box("Lips_Lower", (0.013, 0.032, 0.009), (hx + 0.082, hy, hz - 0.038), mat_lips, bevel=0.002, parent=rider_root)
    add_box("Chin", (0.032, 0.044, 0.030), (hx + 0.072, hy, hz - 0.055), mat_skin, bevel=0.008, parent=rider_root)

    # 6. CONTOURED HELMET SHELL (FRAMING FACE WITH OPEN EYE PORT)
    # Outer Helmet Crown
    add_sphere("Helmet_Crown", 0.112, (hx - 0.01, hy, hz + 0.012), mat_helmet_shell, scale=(1.06, 0.94, 1.04), parent=rider_root)
    # Chin Bar sitting strictly BELOW the mouth
    add_box("Helmet_Chin_Bar", (0.055, 0.105, 0.038), (hx + 0.075, hy, hz - 0.065), mat_helmet_shell, bevel=0.010, parent=rider_root)
    # Padded Liner Rim framing the face
    add_torus("Helmet_Face_Liner", 0.072, 0.008, (hx + 0.045, hy, hz - 0.015), (0, math.pi / 2, 0), mat_helmet_liner, parent=rider_root)

    # Translucent Visor (Flipped UP above brow)
    add_cyl("Helmet_Visor_Raised", 0.114, 0.055, (hx + 0.02, hy, hz + 0.065), (math.pi / 2, 0.45, 0), mat_helmet_visor, verts=24, parent=rider_root)
    for side in [-1, 1]:
        add_cyl(f"Visor_Pivot_{side}", 0.010, 0.015, (hx + 0.015, side * 0.060, hz + 0.020), (math.pi / 2, 0, 0), mat_chrome, verts=14, parent=rider_root)

    # Export Production GLB
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_apply=True
    )
    print(f"SUCCESS: Exported Realistic GTA V Sportbike & Rider to {OUTPUT_GLB}")

if __name__ == "__main__":
    build_sportbike_and_rider()
