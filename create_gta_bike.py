import bpy
import bmesh
import math
import os

REPO_ROOT = r"c:\Users\HP\Desktop\commute-dhaka-web"
MODELS_DIR = os.path.join(REPO_ROOT, "assets", "models")
OUTPUT_GLB = os.path.join(MODELS_DIR, "sportbike-rider.glb")

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

def add_torus(name, major_rad, minor_rad, loc, rot, mat, segs_maj=36, segs_min=14, parent=None):
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

def add_annular_disc(name, r_outer, r_inner, depth, loc, rot, mat, segs=32, parent=None):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts_out = []
    verts_in = []
    for i in range(segs):
        ang = i * 2 * math.pi / segs
        co = math.cos(ang)
        so = math.sin(ang)
        verts_out.append(bm.verts.new((co * r_outer, so * r_outer, -depth / 2)))
        verts_in.append(bm.verts.new((co * r_inner, so * r_inner, -depth / 2)))
    for i in range(segs):
        next_i = (i + 1) % segs
        bm.faces.new([verts_out[i], verts_out[next_i], verts_in[next_i], verts_in[i]])

    geom = bm.faces[:] + bm.verts[:] + bm.edges[:]
    ret = bmesh.ops.extrude_face_region(bm, geom=geom)
    for elem in ret['geom']:
        if isinstance(elem, bmesh.types.BMVert):
            elem.co.z += depth

    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    obj.rotation_euler = rot
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    apply_crisp_edges(obj, 30)
    obj.data.materials.append(mat)
    return link_obj(obj, parent)

def build_sportbike_and_rider():
    reset_scene()
    bike_root = bpy.data.objects.new("GTA_Sportbike_Root", None)
    bpy.context.collection.objects.link(bike_root)

    # ==========================================================================
    # PBR MATERIALS
    # ==========================================================================
    mat_blue_paint = make_mat("Fairing_YamahaBlue", (0.015, 0.28, 0.92, 1.0), metallic=0.75, roughness=0.18, coat=1.0)
    mat_gloss_black = make_mat("Fairing_GlossBlack", (0.02, 0.022, 0.025, 1.0), metallic=0.40, roughness=0.15, coat=0.8)
    mat_dark_frame = make_mat("Frame_DarkAlloy", (0.065, 0.07, 0.08, 1.0), metallic=0.90, roughness=0.35)
    mat_billet_silver = make_mat("Engine_BilletSilver", (0.80, 0.82, 0.86, 1.0), metallic=0.92, roughness=0.22)
    mat_chrome = make_mat("Exhaust_Chrome", (0.95, 0.96, 0.98, 1.0), metallic=0.98, roughness=0.05)
    mat_gold_caliper = make_mat("Brake_BremboGold", (0.92, 0.72, 0.12, 1.0), metallic=0.88, roughness=0.20)
    mat_gold_fork = make_mat("Fork_KashimaGold", (0.88, 0.68, 0.14, 1.0), metallic=0.92, roughness=0.16)
    mat_disc_steel = make_mat("Brake_RotorSteel", (0.78, 0.80, 0.83, 1.0), metallic=0.95, roughness=0.25)
    mat_radiator_fins = make_mat("Radiator_Fins", (0.55, 0.58, 0.62, 1.0), metallic=0.88, roughness=0.45)
    mat_tire = make_mat("Tire_PirelliRubber", (0.03, 0.03, 0.035, 1.0), metallic=0.0, roughness=0.88)
    mat_rim = make_mat("Rim_YamahaBlue", (0.015, 0.28, 0.92, 1.0), metallic=0.85, roughness=0.20, coat=0.8)
    mat_leather_seat = make_mat("Seat_PerforatedLeather", (0.035, 0.035, 0.04, 1.0), metallic=0.04, roughness=0.72)
    mat_windscreen = make_mat("Windscreen_DarkSmoked", (0.03, 0.05, 0.08, 1.0), metallic=0.15, roughness=0.03, coat=1.0, alpha=0.35)
    mat_headlight = make_mat("Headlight_ProjectorLED", (1.0, 1.0, 0.98, 1.0), roughness=0.05, emission=(1.0, 1.0, 0.98, 1.0), emission_strength=18.0)
    mat_taillight = make_mat("Taillight_NeonRed", (0.98, 0.02, 0.02, 1.0), roughness=0.08, emission=(0.98, 0.02, 0.02, 1.0), emission_strength=14.0)

    # Rider Materials (Outfit A: Streetfighter Biker)
    mat_leather_jacket = make_mat("Rider_LeatherJacket", (0.035, 0.035, 0.04, 1.0), metallic=0.15, roughness=0.42)
    mat_white_tshirt = make_mat("Rider_CrewTShirt", (0.96, 0.96, 0.95, 1.0), roughness=0.85)
    mat_dark_jeans = make_mat("Rider_IndigoJeans", (0.04, 0.06, 0.10, 1.0), roughness=0.85)
    mat_sneaker_black = make_mat("Rider_SneakerBlack", (0.04, 0.04, 0.045, 1.0), roughness=0.70)
    mat_sneaker_white = make_mat("Rider_SneakerWhite", (0.96, 0.96, 0.95, 1.0), roughness=0.35)
    mat_skin = make_mat("Rider_NaturalSkin", (0.58, 0.38, 0.26, 1.0), roughness=0.65)
    mat_helmet_shell = make_mat("Helmet_GlossBlack", (0.02, 0.022, 0.026, 1.0), metallic=0.55, roughness=0.10, coat=1.0)
    mat_helmet_visor = make_mat("Helmet_SmokedVisor", (0.015, 0.018, 0.025, 1.0), metallic=0.95, roughness=0.03, coat=1.0)
    mat_helmet_decal = make_mat("Helmet_CyanStripe", (0.0, 0.85, 1.0, 1.0), roughness=0.2, emission=(0.0, 0.85, 1.0, 1.0), emission_strength=2.0)

    # ==========================================================================
    # 1. HOLLOW 5-SPOKE ALLOY WHEELS (Front & Rear)
    # ==========================================================================
    def build_hollow_wheel(w_name, x, z, radius, tire_width, is_rear=False):
        w_pivot = bpy.data.objects.new(w_name, None)
        w_pivot.location = (x, 0.0, z)
        link_obj(w_pivot, bike_root)

        tire_minor = tire_width * 0.42
        tire_major = radius - tire_minor
        add_torus(f"{w_name}_Tire", tire_major, tire_minor, (0, 0, 0), (math.pi / 2, 0, 0), mat_tire, 40, 16, w_pivot)

        rim_minor = 0.018
        rim_major = tire_major - tire_minor - 0.004
        add_torus(f"{w_name}_RimHoop", rim_major, rim_minor, (0, 0, 0), (math.pi / 2, 0, 0), mat_rim, 40, 12, w_pivot)

        hub_rad = 0.042
        hub_width = tire_width * 0.78
        add_cyl(f"{w_name}_Hub", hub_rad, hub_width, (0, 0, 0), (math.pi / 2, 0, 0), mat_rim, 20, w_pivot)

        spoke_count = 5
        for i in range(spoke_count):
            ang = i * (2 * math.pi / spoke_count)
            spoke_len = rim_major - hub_rad + 0.012
            mid_dist = hub_rad + spoke_len * 0.50
            sx = mid_dist * math.cos(ang)
            sz = mid_dist * math.sin(ang)

            bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.013, depth=spoke_len, location=(sx, 0, sz))
            spoke_obj = bpy.context.active_object
            spoke_obj.name = f"{w_name}_Spoke_{i}"
            spoke_obj.rotation_euler = (0, -ang + math.pi / 2, 0)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            apply_crisp_edges(spoke_obj, 30)
            spoke_obj.data.materials.append(mat_rim)
            link_obj(spoke_obj, w_pivot)

        disc_sides = [-1, 1] if not is_rear else [1]
        disc_outer_r = radius * 0.62
        disc_inner_r = radius * 0.44
        disc_thickness = 0.006

        for d_side in disc_sides:
            dy = d_side * (tire_width * 0.42)
            add_annular_disc(
                f"{w_name}_DiscRotor_{d_side}",
                disc_outer_r,
                disc_inner_r,
                disc_thickness,
                (0, dy, 0),
                (math.pi / 2, 0, 0),
                mat_disc_steel,
                parent=w_pivot
            )
            for b_idx in range(5):
                b_ang = b_idx * (2 * math.pi / 5)
                bx = disc_inner_r * math.cos(b_ang)
                bz = disc_inner_r * math.sin(b_ang)
                add_cyl(
                    f"{w_name}_CarrierBobbin_{d_side}_{b_idx}",
                    0.007,
                    disc_thickness * 1.8,
                    (bx, dy, bz),
                    (math.pi / 2, 0, 0),
                    mat_dark_frame,
                    verts=10,
                    parent=w_pivot
                )

        for d_side in disc_sides:
            cy = d_side * (tire_width * 0.45)
            caliper_x = x - 0.09 if not is_rear else x + 0.085
            caliper_z = z + radius * 0.46
            add_box(
                f"{w_name}_BremboCaliper_{d_side}",
                (0.08, 0.036, 0.12),
                (caliper_x, cy, caliper_z),
                mat_gold_caliper,
                bevel=0.008,
                parent=bike_root,
                rot=(0, -0.38 if not is_rear else 0.35, 0)
            )

        return w_pivot

    build_hollow_wheel("Wheel_F", 0.82, 0.32, 0.32, 0.11, is_rear=False)
    build_hollow_wheel("Wheel_R", -0.74, 0.32, 0.32, 0.15, is_rear=True)

    # ==========================================================================
    # 2. INVERTED FRONT USD FORKS & TRIPLE TREES
    # ==========================================================================
    fork_angle = 0.38

    for side in [-1, 1]:
        fy = side * 0.095
        add_cyl(f"Fork_Upper_{side}", 0.026, 0.36, (0.64, fy, 0.72), (0, fork_angle, 0), mat_dark_frame, verts=18, parent=bike_root)
        add_cyl(f"Fork_Cap_{side}", 0.028, 0.02, (0.55, fy, 0.90), (0, fork_angle, 0), mat_gold_fork, verts=16, parent=bike_root)
        add_cyl(f"Fork_Lower_{side}", 0.021, 0.30, (0.75, fy, 0.46), (0, fork_angle, 0), mat_chrome, verts=18, parent=bike_root)
        add_box(f"Fork_AxleBracket_{side}", (0.06, 0.04, 0.07), (0.82, fy, 0.33), mat_dark_frame, bevel=0.005, parent=bike_root)

    add_box("TripleTree_Upper", (0.09, 0.26, 0.035), (0.55, 0.0, 0.88), mat_dark_frame, bevel=0.008, parent=bike_root)
    add_box("TripleTree_Lower", (0.09, 0.26, 0.045), (0.62, 0.0, 0.74), mat_dark_frame, bevel=0.008, parent=bike_root)
    add_cyl("Steering_Stem", 0.018, 0.18, (0.585, 0.0, 0.81), (0, fork_angle, 0), mat_dark_frame, verts=14, parent=bike_root)

    for side in [-1, 1]:
        hy = side * 0.11
        end_y = side * 0.25
        add_cyl(f"Handlebar_{side}", 0.012, 0.15, (0.54, (hy + end_y) / 2, 0.87), (0.15 * side, 0.25, math.pi / 2), mat_dark_frame, verts=12, parent=bike_root)
        add_cyl(f"BarGrip_{side}", 0.016, 0.10, (0.53, end_y - side * 0.04, 0.86), (0.15 * side, 0.25, math.pi / 2), mat_leather_seat, verts=14, parent=bike_root)
        add_box(f"ControlLever_{side}", (0.09, 0.012, 0.015), (0.56, end_y - side * 0.03, 0.86), mat_chrome, bevel=0.003, parent=bike_root)
        add_cyl(f"BarWeight_{side}", 0.015, 0.025, (0.525, end_y + side * 0.015, 0.86), (0.15 * side, 0.25, math.pi / 2), mat_dark_frame, verts=12, parent=bike_root)

    # Slender curved front mudguard
    add_box("Front_Fender_Crown", (0.24, 0.13, 0.03), (0.80, 0.0, 0.47), mat_blue_paint, bevel=0.012, parent=bike_root)

    # ==========================================================================
    # 3. RADIATOR, ENGINE BLOCK & EXHAUST SYSTEM
    # ==========================================================================
    add_box("Radiator_Frame", (0.05, 0.26, 0.22), (0.44, 0.0, 0.52), mat_dark_frame, bevel=0.01, parent=bike_root)
    add_box("Radiator_Core_Fins", (0.035, 0.24, 0.20), (0.45, 0.0, 0.52), mat_radiator_fins, bevel=0.005, parent=bike_root)

    add_box("Engine_Crankcase", (0.34, 0.22, 0.20), (0.08, 0.0, 0.40), mat_dark_frame, bevel=0.02, parent=bike_root)
    add_cyl("Clutch_Cover_Right", 0.075, 0.04, (0.08, -0.12, 0.38), (math.pi / 2, 0, 0), mat_billet_silver, verts=20, parent=bike_root)
    add_cyl("Alternator_Cover_Left", 0.065, 0.04, (0.08, 0.12, 0.38), (math.pi / 2, 0, 0), mat_billet_silver, verts=20, parent=bike_root)

    # 4 Chrome Exhaust Header Pipes
    for p_idx, py in enumerate([-0.075, -0.025, 0.025, 0.075]):
        add_cyl(f"Exhaust_Header_{p_idx}", 0.016, 0.28, (0.27, py, 0.44), (0, 0.55, 0), mat_chrome, verts=12, parent=bike_root)
        add_cyl(f"Exhaust_Underbelly_{p_idx}", 0.016, 0.20, (0.12, py * 0.75, 0.26), (0, 1.45, 0), mat_chrome, verts=12, parent=bike_root)

    add_box("Exhaust_Collector", (0.20, 0.14, 0.09), (-0.08, 0.0, 0.26), mat_dark_frame, bevel=0.01, parent=bike_root)

    # Dual Upswept Brushed Aluminum Rear Exhaust Mufflers
    for side in [-1, 1]:
        ey = side * 0.16
        add_cyl(f"Exhaust_MidPipe_{side}", 0.022, 0.28, (-0.28, ey, 0.36), (0.14 * side, -0.55, 0), mat_chrome, verts=14, parent=bike_root)
        add_cyl(f"Muffler_Canister_{side}", 0.048, 0.36, (-0.54, ey + side * 0.03, 0.48), (0.12 * side, -0.55, 0), mat_billet_silver, verts=18, parent=bike_root)
        add_cyl(f"Muffler_Tip_{side}", 0.028, 0.04, (-0.72, ey + side * 0.045, 0.57), (0.12 * side, -0.55, 0), mat_dark_frame, verts=16, parent=bike_root)
        add_box(f"Muffler_Hanger_{side}", (0.02, 0.04, 0.10), (-0.52, ey + side * 0.03, 0.54), mat_chrome, parent=bike_root)

    # Swingarm & Footpegs
    for side in [-1, 1]:
        sy = side * 0.085
        add_box(f"Swingarm_Arm_{side}", (0.60, 0.035, 0.06), (-0.38, sy, 0.36), mat_dark_frame, bevel=0.01, parent=bike_root)
        fy = side * 0.16
        add_cyl(f"Footpeg_{side}", 0.015, 0.075, (-0.14, fy, 0.38), (math.pi / 2, 0, 0), mat_billet_silver, verts=12, parent=bike_root)

    # ==========================================================================
    # 4. SCULPTED AERODYNAMIC SPORTBIKE BODYWORK (BMESH NOSE & FAIRINGS)
    # ==========================================================================
    # Aerodynamic Front Cowl: Tapered forward, swept back to handlebars
    cowl_mesh = bpy.data.meshes.new("Nose_Cowl_Mesh")
    bm_c = bmesh.new()
    # Define wedge-shaped nose vertices
    v_tip_top = bm_c.verts.new((0.88, 0.0, 0.82))
    v_tip_bot = bm_c.verts.new((0.84, 0.0, 0.70))
    v_l_top = bm_c.verts.new((0.68, 0.15, 0.88))
    v_r_top = bm_c.verts.new((0.68, -0.15, 0.88))
    v_l_mid = bm_c.verts.new((0.72, 0.14, 0.76))
    v_r_mid = bm_c.verts.new((0.72, -0.14, 0.76))
    v_l_bot = bm_c.verts.new((0.65, 0.11, 0.65))
    v_r_bot = bm_c.verts.new((0.65, -0.11, 0.65))
    v_back_l_top = bm_c.verts.new((0.50, 0.15, 0.88))
    v_back_r_top = bm_c.verts.new((0.50, -0.15, 0.88))
    v_back_l_bot = bm_c.verts.new((0.48, 0.12, 0.65))
    v_back_r_bot = bm_c.verts.new((0.48, -0.12, 0.65))

    bm_c.faces.new([v_tip_top, v_l_top, v_l_mid])
    bm_c.faces.new([v_tip_top, v_r_mid, v_r_top])
    bm_c.faces.new([v_tip_top, v_tip_bot, v_l_mid])
    bm_c.faces.new([v_tip_top, v_r_mid, v_tip_bot])
    bm_c.faces.new([v_tip_bot, v_l_bot, v_l_mid])
    bm_c.faces.new([v_tip_bot, v_r_mid, v_r_bot])
    bm_c.faces.new([v_l_top, v_back_l_top, v_back_l_bot, v_l_bot])
    bm_c.faces.new([v_r_top, v_r_bot, v_back_r_bot, v_back_r_top])
    bm_c.faces.new([v_l_top, v_r_top, v_back_r_top, v_back_l_top])
    bm_c.faces.new([v_l_bot, v_back_l_bot, v_back_r_bot, v_r_bot])

    bm_c.to_mesh(cowl_mesh)
    bm_c.free()
    cowl_obj = bpy.data.objects.new("Nose_Cowl", cowl_mesh)
    bpy.context.collection.objects.link(cowl_obj)
    apply_crisp_edges(cowl_obj, 35)
    cowl_obj.data.materials.append(mat_blue_paint)
    link_obj(cowl_obj, bike_root)

    # Sleek Twin Projector Headlight slits (recessed in nose)
    for side in [-1, 1]:
        hy = side * 0.08
        add_box(f"Headlight_Bezel_{side}", (0.04, 0.06, 0.035), (0.78, hy, 0.78), mat_gloss_black, bevel=0.005, parent=bike_root, rot=(0, -0.2, 0.25 * side))
        add_box(f"Headlight_LED_{side}", (0.02, 0.05, 0.025), (0.795, hy, 0.78), mat_headlight, parent=bike_root, rot=(0, -0.2, 0.25 * side))

    # Dark Smoked Aerodynamic Swept Bubble Windscreen
    ws_mesh = bpy.data.meshes.new("Windscreen_Mesh")
    bm_ws = bmesh.new()
    w1 = bm_ws.verts.new((0.84, 0.0, 0.83))
    w2 = bm_ws.verts.new((0.70, 0.13, 0.90))
    w3 = bm_ws.verts.new((0.70, -0.13, 0.90))
    w4 = bm_ws.verts.new((0.55, 0.11, 1.02))
    w5 = bm_ws.verts.new((0.55, -0.11, 1.02))
    w6 = bm_ws.verts.new((0.52, 0.0, 1.04))
    bm_ws.faces.new([w1, w2, w4, w6])
    bm_ws.faces.new([w1, w6, w5, w3])
    bm_ws.faces.new([w1, w3, w2])

    geom_ws = bm_ws.faces[:] + bm_ws.verts[:] + bm_ws.edges[:]
    ret_ws = bmesh.ops.extrude_face_region(bm_ws, geom=geom_ws)
    for elem in ret_ws['geom']:
        if isinstance(elem, bmesh.types.BMVert):
            elem.co.z -= 0.008

    bm_ws.to_mesh(ws_mesh)
    bm_ws.free()
    ws_obj = bpy.data.objects.new("Windscreen", ws_mesh)
    bpy.context.collection.objects.link(ws_obj)
    apply_crisp_edges(ws_obj, 35)
    ws_obj.data.materials.append(mat_windscreen)
    link_obj(ws_obj, bike_root)

    # Side Fairings with Aerodynamic Louver Vents
    for side in [-1, 1]:
        sy = side * 0.155
        add_box(f"Fairing_Upper_{side}", (0.35, 0.03, 0.22), (0.36, sy, 0.65), mat_blue_paint, bevel=0.02, parent=bike_root)
        add_box(f"Fairing_Vent_{side}", (0.16, 0.035, 0.04), (0.34, sy, 0.62), mat_gloss_black, bevel=0.005, parent=bike_root)

    add_box("Lower_Belly_Pan", (0.38, 0.20, 0.10), (0.15, 0.0, 0.30), mat_gloss_black, bevel=0.02, parent=bike_root)

    # Muscular Contoured Fuel Tank
    add_box("Fuel_Tank_Main", (0.36, 0.26, 0.20), (0.24, 0.0, 0.83), mat_blue_paint, bevel=0.05, segs=3, parent=bike_root)
    add_cyl("Fuel_Cap", 0.038, 0.012, (0.28, 0.0, 0.94), (0, 0, 0), mat_chrome, verts=18, parent=bike_root)
    for side in [-1, 1]:
        add_box(f"Tank_Knee_Grip_{side}", (0.20, 0.012, 0.10), (0.20, side * 0.135, 0.81), mat_leather_seat, bevel=0.005, parent=bike_root)

    # Ergonomic Rider & Pillion Saddle
    add_box("Rider_Saddle", (0.28, 0.20, 0.06), (-0.06, 0.0, 0.74), mat_leather_seat, bevel=0.022, parent=bike_root)
    add_box("Pillion_Saddle", (0.24, 0.16, 0.05), (-0.30, 0.0, 0.79), mat_leather_seat, bevel=0.018, parent=bike_root)

    # Sharp Upswept Tail Cowl & Integrated Taillight Strip
    add_box("Tail_Cowl", (0.34, 0.14, 0.09), (-0.50, 0.0, 0.78), mat_blue_paint, bevel=0.025, parent=bike_root, rot=(0, -0.15, 0))
    add_box("Tail_LED_Light", (0.02, 0.10, 0.025), (-0.68, 0.0, 0.80), mat_taillight, bevel=0.004, parent=bike_root)
    add_box("Tail_Bracket", (0.07, 0.05, 0.07), (-0.68, 0.0, 0.70), mat_dark_frame, bevel=0.005, parent=bike_root)
    add_box("License_Plate", (0.012, 0.13, 0.07), (-0.72, 0.0, 0.67), mat_white_tshirt, bevel=0.002, parent=bike_root)

    # ==========================================================================
    # 5. REALISTIC GTA V-GRADE HUMAN RIDER (OUTFIT A: STREETFIGHTER BIKER)
    # ==========================================================================
    rider_root = bpy.data.objects.new("Rider_Root", None)
    rider_root.location = (0.0, 0.0, 0.0)
    link_obj(rider_root, bike_root)

    # Pelvis seated squarely on saddle
    add_box("Rider_Pelvis", (0.22, 0.20, 0.13), (-0.06, 0.0, 0.77), mat_dark_jeans, bevel=0.028, parent=rider_root)

    # Torso angled forward naturally in 35° sport tuck (NO giant box behind back!)
    add_box(
        "Rider_Torso_Jacket",
        (0.24, 0.26, 0.28),
        (0.10, 0.0, 0.93),
        mat_leather_jacket,
        bevel=0.035,
        segs=3,
        parent=rider_root,
        rot=(0, 0.45, 0)
    )
    # Open collar showing white crew-neck t-shirt
    add_box(
        "Rider_Inner_TShirt",
        (0.10, 0.11, 0.14),
        (0.18, 0.0, 0.98),
        mat_white_tshirt,
        bevel=0.012,
        parent=rider_root,
        rot=(0, 0.45, 0)
    )
    # Natural skin neck
    add_cyl("Rider_Neck_Skin", 0.052, 0.11, (0.23, 0.0, 1.06), (0, -0.35, 0), mat_skin, verts=16, parent=rider_root)

    # Organic Arms & Riding Gloves Gripping Handlebars
    for side in [-1, 1]:
        sy = side * 0.14
        end_y = side * 0.21
        # Shoulder
        add_box(f"Rider_Shoulder_{side}", (0.11, 0.08, 0.11), (0.14, sy, 0.99), mat_leather_jacket, bevel=0.02, parent=rider_root)
        # Upper Arm
        add_cyl(f"Rider_UpperArm_{side}", 0.044, 0.22, (0.25, (sy + end_y) / 2, 0.95), (0.16 * side, 0.65, 0), mat_leather_jacket, verts=14, parent=rider_root)
        # Forearm extending to handlebar
        add_cyl(f"Rider_Forearm_{side}", 0.038, 0.22, (0.40, end_y, 0.90), (0, 0.95, 0), mat_leather_jacket, verts=14, parent=rider_root)
        # Black leather riding glove with white knuckle protector
        add_box(f"Rider_Glove_{side}", (0.075, 0.055, 0.045), (0.50, end_y, 0.87), mat_dark_frame, bevel=0.008, parent=rider_root)
        add_box(f"Rider_KnuckleProtector_{side}", (0.035, 0.04, 0.012), (0.50, end_y, 0.895), mat_white_tshirt, bevel=0.003, parent=rider_root)

    # Anatomical Legs & Athletic Sneakers on Footpegs
    for side in [-1, 1]:
        sy = side * 0.13
        # Thigh hugging fuel tank
        add_cyl(f"Rider_Thigh_{side}", 0.058, 0.26, (0.06, sy + side * 0.025, 0.67), (0.14 * side, 0.85, 0), mat_dark_jeans, verts=14, parent=rider_root)
        # Knee
        add_box(f"Rider_Knee_{side}", (0.09, 0.08, 0.09), (0.17, sy + side * 0.025, 0.55), mat_dark_jeans, bevel=0.018, parent=rider_root)
        # Shin angling back to footpeg
        add_cyl(f"Rider_Shin_{side}", 0.046, 0.28, (0.02, sy + side * 0.02, 0.45), (0, -0.65, 0), mat_dark_jeans, verts=14, parent=rider_root)
        # Sneaker resting squarely on footpeg
        add_box(f"Rider_Sneaker_Upper_{side}", (0.14, 0.07, 0.055), (-0.14, sy + side * 0.02, 0.40), mat_sneaker_black, bevel=0.01, parent=rider_root)
        add_box(f"Rider_Sneaker_Sole_{side}", (0.15, 0.075, 0.018), (-0.14, sy + side * 0.02, 0.372), mat_sneaker_white, bevel=0.003, parent=rider_root)

    # Aerodynamic Full-Face Racing Helmet (Smooth contoured shell + curved visor)
    hx, hy, hz = 0.31, 0.0, 1.18

    # Oval aerodynamic shell
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=0.12, location=(hx, hy, hz))
    h_shell = bpy.context.active_object
    h_shell.name = "Helmet_Shell"
    h_shell.scale = (1.08, 0.92, 1.02)
    bpy.ops.object.transform_apply(scale=True)
    apply_crisp_edges(h_shell, 35)
    h_shell.data.materials.append(mat_helmet_shell)
    link_obj(h_shell, rider_root)

    # Sleek chin bar
    add_box("Helmet_Chin_Bar", (0.10, 0.14, 0.07), (hx + 0.07, hy, hz - 0.045), mat_helmet_shell, bevel=0.018, parent=rider_root)

    # Flush Wrap-Around Dark Visor
    add_box(
        "Helmet_Visor",
        (0.08, 0.16, 0.06),
        (hx + 0.08, hy, hz + 0.01),
        mat_helmet_visor,
        bevel=0.012,
        parent=rider_root,
        rot=(0, -0.12, 0)
    )

    # Rear aerodynamic spoiler ridge
    add_box("Helmet_Rear_Spoiler", (0.05, 0.10, 0.03), (hx - 0.10, hy, hz + 0.04), mat_helmet_shell, bevel=0.008, parent=rider_root)

    # Cyan racing graphic decal
    for side in [-1, 1]:
        add_box(f"Helmet_Decal_{side}", (0.12, 0.004, 0.018), (hx - 0.01, side * 0.112, hz + 0.02), mat_helmet_decal, parent=rider_root)

    # ==========================================================================
    # 6. EXPORT PRODUCTION GLB
    # ==========================================================================
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_apply=True
    )
    print(f"SUCCESS: Exported GTA V Sportbike & Rider to {OUTPUT_GLB}")

if __name__ == "__main__":
    build_sportbike_and_rider()
