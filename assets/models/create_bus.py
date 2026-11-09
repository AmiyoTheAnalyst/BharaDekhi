"""
Blender 5.2 Python Script: GTA V-Grade City Transit Bus Digital Twin
Authentic Match to User Reference Photos 2 & 3:
- Exact GTA V Brute / Los Santos Transit Bus Body Silhouette & Proportions
- User Request 3rd Pic Color Combination: Vibrant Crimson Red Upper / Clean White Lower
- Low-Floor White Skirts with Semicircular Wheel Arch Cutouts & Semicircular Fender Lips
- Heavy-Duty 10-Hole Steel Transit Wheels with Dual Rear Wheels
- Aerodynamic Raked Curved Panoramic Windshield with Center Post & Twin Wipers
- Front Destination Sign: Amber LED Matrix "VIP 27 · MIRPUR 10" with 4 Clearance Marker Lights
- Recessed Triple-Beam Round Headlights on Left & Right Lower White Fascia (Bold 18cm Diameter!)
- Heavy-Duty Black Front Bumper Splitter with License Plate
- Right-Side Curbside Folding Bi-Fold Passenger Doors with Glass & Yellow Grab Poles
- 6 Panoramic Passenger Window Bays with Solid Black Pillars & Smoked Tinted Glass
- Aerodynamic White/Silver Rooftop AC Unit Pod with Ventilation Louvers & Rear Exhaust Snorkel
- 3D Embossed "VIP TRANSIT" Header Decals & "bKash" Sponsor Roundel
- Detailed Interior: Low-Floor Deck, Commuter Seats with Blue Upholstery, Yellow Stanchion Poles
- Driver at Steering Wheel & Commuters Seated Comfortably (Strictly Z >= 0.64, Zero Undercarriage Clipping!)
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "dhaka-bus.glb")

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
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
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
                bsdf.inputs["Transmission Weight"].default_value = 0.60
            elif "Transmission" in bsdf.inputs:
                bsdf.inputs["Transmission"].default_value = 0.60
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

def create_cylinder_between(name, p1, p2, radius, mat, verts=14, radius2=None):
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

def create_3d_text(name, text, loc, rot, size, extrude, mat):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = text
    obj.data.size = size
    obj.data.extrude = extrude
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    bpy.ops.object.convert(target='MESH')
    smooth_mesh(obj)
    assign_material(obj, mat)
    return obj

def create_bus_wheel(name, center, radius, width, tire_mat, rim_mat, dark_hole_mat, hub_mat, is_dual=False):
    parts = []
    cx, cy, cz = center

    # Outer tire(s)
    tire_offsets = [-width * 0.26, width * 0.26] if is_dual else [0.0]
    tire_w = width * 0.44 if is_dual else width

    for toff in tire_offsets:
        # Main tire barrel
        bpy.ops.mesh.primitive_cylinder_add(
            radius=radius,
            depth=tire_w * 0.86,
            location=(cx, cy + toff, cz),
            rotation=(math.pi / 2, 0, 0),
            vertices=32
        )
        t_cyl = assign_material(bpy.context.object, tire_mat)
        smooth_mesh(t_cyl)
        parts.append(t_cyl)

        # Rounded tire sidewall shoulders
        for side_sign in [-1, 1]:
            bpy.ops.mesh.primitive_torus_add(
                major_radius=radius - 0.05,
                minor_radius=0.048,
                major_segments=32,
                minor_segments=8,
                location=(cx, cy + toff + side_sign * (tire_w * 0.40), cz),
                rotation=(math.pi / 2, 0, 0)
            )
            t_tor = assign_material(bpy.context.object, tire_mat)
            smooth_mesh(t_tor)
            parts.append(t_tor)

    # Steel Transit Rim with 10 Cooling Holes & Deep Central Dish
    rim_y = cy + (width * 0.52 if cy > 0 else -width * 0.52)
    rim_dir = 1 if cy > 0 else -1

    # Outer rim lip ring
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius * 0.65,
        minor_radius=0.03,
        major_segments=32,
        minor_segments=8,
        location=(cx, rim_y, cz),
        rotation=(math.pi / 2, 0, 0)
    )
    r_lip = assign_material(bpy.context.object, rim_mat)
    smooth_mesh(r_lip)
    parts.append(r_lip)

    # Pressed steel dish face
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius * 0.64,
        depth=0.045,
        location=(cx, rim_y - rim_dir * 0.02, cz),
        rotation=(math.pi / 2, 0, 0),
        vertices=28
    )
    r_dish = assign_material(bpy.context.object, rim_mat)
    smooth_mesh(r_dish)
    parts.append(r_dish)

    # 10 Circular Cooling Vent Holes on Rim Face (GTA V Bus Signature Detail!)
    for i in range(10):
        ang = (2 * math.pi / 10) * i
        hx = cx + math.cos(ang) * (radius * 0.48)
        hz = cz + math.sin(ang) * (radius * 0.48)
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.034,
            depth=0.05,
            location=(hx, rim_y - rim_dir * 0.015, hz),
            rotation=(math.pi / 2, 0, 0),
            vertices=12
        )
        hole = assign_material(bpy.context.object, dark_hole_mat)
        smooth_mesh(hole)
        parts.append(hole)

    # Central Heavy Axle Hub
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius * 0.28,
        depth=0.09,
        location=(cx, rim_y + rim_dir * 0.02, cz),
        rotation=(math.pi / 2, 0, 0),
        vertices=20
    )
    r_hub = assign_material(bpy.context.object, hub_mat)
    smooth_mesh(r_hub)
    parts.append(r_hub)

    # 10 Wheel Lug Nuts around hub perimeter
    for i in range(10):
        ang = (2 * math.pi / 10) * i + (math.pi / 10)
        lx = cx + math.cos(ang) * (radius * 0.35)
        lz = cz + math.sin(ang) * (radius * 0.35)
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.018,
            depth=0.035,
            location=(lx, rim_y + rim_dir * 0.04, lz),
            rotation=(math.pi / 2, 0, 0),
            vertices=8
        )
        lug = assign_material(bpy.context.object, hub_mat)
        parts.append(lug)

    # Join all wheel parts into a single mesh
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    wheel = bpy.context.object
    wheel.name = name
    bpy.context.scene.cursor.location = center
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return wheel

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None, is_female=False):
    x, y, z = center
    create_sphere(f"{name_prefix}_Cranium", (x, y, z), 0.11, (1.05, 0.92, 1.15), skin_mat, segs=14, rings=10)
    create_sphere(f"{name_prefix}_Jaw", (x + 0.03, y, z - 0.04), 0.07, (1.0, 0.78, 0.85), skin_mat, segs=10, rings=8)
    create_sphere(f"{name_prefix}_Hair", (x - 0.015, y, z + 0.035), 0.112, (1.04, 0.96, 1.10), hair_mat, segs=12, rings=8)
    
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = y + sign * 0.038
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (x + 0.095, eye_y, z + 0.012), 0.018, (0.6, 1.0, 0.8), eye_white_mat, segs=8, rings=6)
        create_sphere(f"{name_prefix}_Pupil_{side}", (x + 0.104, eye_y, z + 0.012), 0.009, (0.5, 0.9, 0.9), iris_mat, segs=6, rings=4)
        create_box(f"{name_prefix}_Eyebrow_{side}", (x + 0.098, eye_y, z + 0.032), (0.014, 0.035, 0.009), hair_mat, bevel=0.002)
    
    create_cylinder_between(f"{name_prefix}_NoseBridge", (x + 0.085, y, z + 0.025), (x + 0.115, y, z - 0.01), 0.011, skin_mat, verts=8)
    create_sphere(f"{name_prefix}_NoseTip", (x + 0.118, y, z - 0.012), 0.014, (1.0, 1.0, 0.9), skin_mat, segs=8, rings=6)
    create_box(f"{name_prefix}_LipUpper", (x + 0.102, y, z - 0.036), (0.014, 0.038, 0.008), lip_mat, bevel=0.002)
    create_box(f"{name_prefix}_LipLower", (x + 0.100, y, z - 0.046), (0.014, 0.035, 0.009), lip_mat, bevel=0.002)
    
    if mustache_mat and not is_female:
        create_sphere(f"{name_prefix}_Mustache_L", (x + 0.108, y - 0.018, z - 0.032), 0.013, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6)
        create_sphere(f"{name_prefix}_Mustache_R", (x + 0.108, y + 0.018, z - 0.032), 0.013, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6)
    return None

def build():
    clear_scene()

    # -------------------------------------------------------------
    # 1. MATERIALS (EXACT 3RD PIC RED & WHITE LIVERY + GTA V BUS FINISH)
    # -------------------------------------------------------------
    # Crimson Red Upper Body (Photo 3 Color Combination)
    m_bus_red = create_material("Bus_RedPaint", (0.82, 0.07, 0.12), metallic=0.15, roughness=0.22, clearcoat=1.0)
    # Crisp Clean White Lower Body (Photo 3 Color Combination)
    m_bus_white = create_material("Bus_WhitePaint", (0.96, 0.96, 0.96), metallic=0.05, roughness=0.25, clearcoat=1.0)
    # Satin Charcoal/Black for bumpers, moldings, window frames, rocker panels
    m_dark_trim = create_material("Bus_DarkBumper", (0.08, 0.08, 0.09), metallic=0.15, roughness=0.70)
    # Heavy-duty commercial bus tire rubber
    m_tire = create_material("Bus_TireRubber", (0.035, 0.035, 0.038), metallic=0.0, roughness=0.85)
    # Pressed steel commercial rims
    m_steel_rim = create_material("Bus_SteelRim", (0.78, 0.80, 0.82), metallic=0.85, roughness=0.28)
    m_rim_hole = create_material("Bus_RimVentHole", (0.04, 0.04, 0.05), metallic=0.3, roughness=0.8)
    # Hubcaps & chrome details
    m_chrome = create_material("Bus_ChromeGrille", (0.92, 0.94, 0.96), metallic=0.98, roughness=0.10)
    # Rooftop AC unit pod silver/light grey
    m_ac_pod = create_material("Bus_RoofACPod", (0.90, 0.91, 0.93), metallic=0.35, roughness=0.32)
    
    # Smoked Tinted Passenger Window Glass (Rich tint with sharp glossy specular shine)
    m_glass = create_material("Bus_WindowGlass", (0.05, 0.08, 0.12), metallic=0.20, roughness=0.05, alpha=0.70)
    # Windshield Curved Automotive Glass
    m_windshield = create_material("Bus_WindshieldGlass", (0.06, 0.10, 0.14), metallic=0.15, roughness=0.04, alpha=0.68)

    # Light Emitters
    # Front Electronic Destination Matrix LED Display ("VIP 27 · MIRPUR 10")
    m_dest_display = create_material("Bus_DestSignLED", (1.0, 0.65, 0.05), emission=(1.0, 0.65, 0.05), emission_strength=8.0)
    # Triple-Beam High-Intensity Round Headlights
    m_headlight_lens = create_material("Bus_HeadlightLED", (0.95, 0.98, 1.0), emission=(0.95, 0.98, 1.0), emission_strength=12.0)
    # Amber Turn Signals & Roof Clearance Marker Lights
    m_marker_amber = create_material("Bus_MarkerAmber", (1.0, 0.55, 0.02), emission=(1.0, 0.55, 0.02), emission_strength=6.0)
    # Rear Red Taillight Clusters
    m_taillight_red = create_material("Bus_TaillightLED", (1.0, 0.08, 0.08), emission=(1.0, 0.08, 0.08), emission_strength=7.0)

    # 3D Decal Lettering (Crisp White for "VIP TRANSIT" and "bKash" sponsor emblem)
    m_decal_white = create_material("Bus_DecalWhite", (1.0, 1.0, 1.0), emission=(0.95, 0.95, 0.95), emission_strength=1.2)
    m_bkash_pink = create_material("Bus_BkashPink", (0.88, 0.12, 0.42), metallic=0.1, roughness=0.35)

    # Interior Cabin Materials
    m_floor = create_material("Bus_InteriorFloor", (0.12, 0.13, 0.14), metallic=0.1, roughness=0.85)
    m_seat_blue = create_material("Bus_SeatBlue", (0.08, 0.22, 0.64), metallic=0.05, roughness=0.75)
    m_seat_frame = create_material("Bus_SeatFrame", (0.16, 0.17, 0.19), metallic=0.3, roughness=0.6)
    m_stanchion_yellow = create_material("Bus_StanchionYellow", (0.98, 0.82, 0.04), metallic=0.25, roughness=0.25)

    # Human Character Materials
    m_skin_d = create_material("Bus_DriverSkin", (0.46, 0.28, 0.16), metallic=0.0, roughness=0.75)
    m_skin_p1 = create_material("Bus_PassSkin1", (0.50, 0.32, 0.20), metallic=0.0, roughness=0.75)
    m_skin_p2 = create_material("Bus_PassSkin2", (0.58, 0.36, 0.24), metallic=0.0, roughness=0.75)
    m_hair = create_material("Human_Hair", (0.03, 0.025, 0.02), metallic=0.0, roughness=0.9)
    m_eye_white = create_material("Eye_Sclera", (0.95, 0.95, 0.95), metallic=0.0, roughness=0.2)
    m_iris = create_material("Eye_Iris", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.2)
    m_lip = create_material("Human_Lips", (0.52, 0.22, 0.18), metallic=0.0, roughness=0.5)

    m_shirt_blue = create_material("Shirt_SkyBlue", (0.22, 0.52, 0.82), metallic=0.0, roughness=0.8)
    m_shirt_white = create_material("Shirt_White", (0.92, 0.92, 0.90), metallic=0.0, roughness=0.8)
    m_shirt_green = create_material("Shirt_GreenPolo", (0.12, 0.58, 0.30), metallic=0.0, roughness=0.8)
    m_shirt_yellow = create_material("Shirt_Mustard", (0.88, 0.70, 0.15), metallic=0.0, roughness=0.8)
    m_saree_pink = create_material("Saree_MagentaPink", (0.85, 0.18, 0.48), metallic=0.0, roughness=0.75)
    m_pants_dark = create_material("Pants_DarkNavy", (0.08, 0.10, 0.16), metallic=0.0, roughness=0.85)

    # -------------------------------------------------------------
    # 2. DIMENSIONS & PROPORTIONS
    # -------------------------------------------------------------
    bus_wid = 2.50
    floor_z = 0.64
    skirt_bottom_z = 0.24  # Ground clearance of side skirts (Exact low-floor GTA V stance!)
    beltline_z = 1.58      # Lower window sill height
    wheel_radius = 0.52
    front_width = 0.30
    rear_width = 0.46      # Commercial dual wheels on rear axle!
    front_x = 3.65
    rear_x = -3.25
    track_y = 1.06
    arch_radius = 0.62     # Radius of wheel arch cutout
    body_y = bus_wid * 0.5

    # -------------------------------------------------------------
    # 3. HEAVY-DUTY COMMERCIAL BUS WHEELS (SINGLE JOINED MESHES)
    # -------------------------------------------------------------
    w_fl = create_bus_wheel("wheel_front_left", (front_x, -track_y, wheel_radius), wheel_radius, front_width, m_tire, m_steel_rim, m_rim_hole, m_chrome, is_dual=False)
    w_fr = create_bus_wheel("wheel_front_right", (front_x, track_y, wheel_radius), wheel_radius, front_width, m_tire, m_steel_rim, m_rim_hole, m_chrome, is_dual=False)
    w_rl = create_bus_wheel("wheel_rear_left", (rear_x, -track_y, wheel_radius), wheel_radius, rear_width, m_tire, m_steel_rim, m_rim_hole, m_chrome, is_dual=True)
    w_rr = create_bus_wheel("wheel_rear_right", (rear_x, track_y, wheel_radius), wheel_radius, rear_width, m_tire, m_steel_rim, m_rim_hole, m_chrome, is_dual=True)

    # -------------------------------------------------------------
    # 4. CHASSIS FLOOR & INNER BELLY PAN (ZERO UNDER-FLOOR CLIPPING!)
    # -------------------------------------------------------------
    create_box("ChassisFloorPan", (-0.20, 0, floor_z - 0.06), (11.30, bus_wid - 0.15, 0.12), m_dark_trim)
    create_box("InteriorFloorDeck", (-0.20, 0, floor_z + 0.02), (11.20, bus_wid - 0.20, 0.04), m_floor)

    # Rear Wheel Rubber Mud Flaps (Hanging behind rear wheels to Z=0.12!)
    for sign in [-1, 1]:
        wy = sign * track_y
        create_box(f"MudFlap_{sign}", (rear_x - arch_radius - 0.08, wy, 0.32), (0.04, rear_width * 0.9, 0.38), m_dark_trim, bevel=0.005)

    # -------------------------------------------------------------
    # 5. LOWER WHITE BODY SIDES WITH CLEAN WHEEL ARCH CUTOUTS
    # -------------------------------------------------------------
    # Helper to construct a clean side skirt with arched wheel openings and no full donut covering the wheel!
    def create_side_skirt_mesh(name, y_coord, is_right):
        mesh = bpy.data.meshes.new(name)
        bm = bmesh.new()
        
        # 1. Front section: from X = 5.82 to front_x + arch_radius (4.27)
        # Quad from Z = 0.24 to 1.58
        v_f_bot_f = bm.verts.new((5.82, y_coord, skirt_bottom_z))
        v_f_top_f = bm.verts.new((5.82, y_coord, beltline_z))
        v_f_bot_b = bm.verts.new((front_x + arch_radius, y_coord, skirt_bottom_z))
        v_f_top_b = bm.verts.new((front_x + arch_radius, y_coord, beltline_z))
        bm.faces.new([v_f_bot_f, v_f_bot_b, v_f_top_b, v_f_top_f])

        # 2. Over front wheel arch: from X = 4.27 to 3.03
        # Above the arch: quad from Z = 1.04 to 1.58
        v_wf_top_f = v_f_top_b
        v_wf_top_b = bm.verts.new((front_x - arch_radius, y_coord, beltline_z))
        v_wf_mid_f = bm.verts.new((front_x + arch_radius, y_coord, 1.04))
        v_wf_mid_b = bm.verts.new((front_x - arch_radius, y_coord, 1.04))
        bm.faces.new([v_wf_mid_f, v_wf_mid_b, v_wf_top_b, v_wf_top_f])

        # Semicircular infill triangles around upper front arch
        # Semicircle contour: ang from 0 to pi
        arch_pts_f = []
        n_segs = 8
        for i in range(n_segs + 1):
            ang = i * (math.pi / n_segs)
            ax = front_x + arch_radius * math.cos(ang)
            az = 0.24 + (1.04 - 0.24) * math.sin(ang)
            arch_pts_f.append(bm.verts.new((ax, y_coord, az)))
        
        # Infill between arch contour and horizontal line at Z = 1.04
        for i in range(n_segs):
            bm.faces.new([arch_pts_f[i], arch_pts_f[i + 1], v_wf_mid_b if i >= n_segs // 2 else v_wf_mid_f])

        # 3. Mid-body between wheels: from X = 3.03 to -2.63
        v_m_bot_f = bm.verts.new((front_x - arch_radius, y_coord, skirt_bottom_z))
        v_m_top_f = v_wf_top_b
        v_m_bot_b = bm.verts.new((rear_x + arch_radius, y_coord, skirt_bottom_z))
        v_m_top_b = bm.verts.new((rear_x + arch_radius, y_coord, beltline_z))
        bm.faces.new([v_m_bot_f, v_m_bot_b, v_m_top_b, v_m_top_f])

        # 4. Over rear wheel arch: from X = -2.63 to -3.87
        v_wr_top_f = v_m_top_b
        v_wr_top_b = bm.verts.new((rear_x - arch_radius, y_coord, beltline_z))
        v_wr_mid_f = bm.verts.new((rear_x + arch_radius, y_coord, 1.04))
        v_wr_mid_b = bm.verts.new((rear_x - arch_radius, y_coord, 1.04))
        bm.faces.new([v_wr_mid_f, v_wr_mid_b, v_wr_top_b, v_wr_top_f])

        arch_pts_r = []
        for i in range(n_segs + 1):
            ang = i * (math.pi / n_segs)
            ax = rear_x + arch_radius * math.cos(ang)
            az = 0.24 + (1.04 - 0.24) * math.sin(ang)
            arch_pts_r.append(bm.verts.new((ax, y_coord, az)))
        for i in range(n_segs):
            bm.faces.new([arch_pts_r[i], arch_pts_r[i + 1], v_wr_mid_b if i >= n_segs // 2 else v_wr_mid_f])

        # 5. Rear section: from X = -3.87 to -5.85
        v_r_bot_f = bm.verts.new((rear_x - arch_radius, y_coord, skirt_bottom_z))
        v_r_top_f = v_wr_top_b
        v_r_bot_b = bm.verts.new((-5.85, y_coord, skirt_bottom_z))
        v_r_top_b = bm.verts.new((-5.85, y_coord, beltline_z))
        bm.faces.new([v_r_bot_f, v_r_bot_b, v_r_top_b, v_r_top_f])

        # Extrude panel thickness
        extrude_dir = -0.06 if y_coord < 0 else 0.06
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=extrude_dir)

        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        smooth_mesh(obj)
        assign_material(obj, m_bus_white)
        return obj

    # Create Left and Right side skirts with clean arched wheel wells
    create_side_skirt_mesh("LowerSkirt_L", -body_y, is_right=False)
    create_side_skirt_mesh("LowerSkirt_R", body_y, is_right=True)

    # Horizontal luggage / compartment panel seam lines along lower skirts
    mid_len = (front_x - arch_radius) - (rear_x + arch_radius)
    mid_x = (front_x - arch_radius + rear_x + arch_radius) * 0.5
    for sign in [-1, 1]:
        sy = sign * (body_y + 0.035)
        create_box(f"PanelSeam1_{sign}", (mid_x, sy, 0.72), (mid_len - 0.2, 0.01, 0.018), m_dark_trim)
        create_box(f"PanelSeam2_{sign}", (mid_x, sy, 1.15), (mid_len - 0.2, 0.01, 0.018), m_dark_trim)

    # Semicircular Wheel Arch Lips (ONLY along upper half semicircle, NEVER extending below axle!)
    for wx in [front_x, rear_x]:
        for sign in [-1, 1]:
            wy = sign * (body_y + 0.01)
            n_arch_tubes = 10
            for ai in range(n_arch_tubes):
                ang1 = ai * (math.pi / n_arch_tubes)
                ang2 = (ai + 1) * (math.pi / n_arch_tubes)
                p1 = (wx + arch_radius * math.cos(ang1), wy, 0.24 + (1.04 - 0.24) * math.sin(ang1))
                p2 = (wx + arch_radius * math.cos(ang2), wy, 0.24 + (1.04 - 0.24) * math.sin(ang2))
                create_cylinder_between(f"ArchLip_{wx}_{sign}_{ai}", p1, p2, 0.024, m_dark_trim, verts=8)

    # -------------------------------------------------------------
    # 6. FRONT NOSE FASCIA & RECESSED TRIPLE ROUND HEADLIGHTS (BOLD 18CM!)
    # -------------------------------------------------------------
    fx = 5.82

    # Broad White Front Fascia Panel below windshield (Z = 0.64 to 1.58)
    create_box("FrontNoseFasciaWhite", (fx - 0.04, 0, 1.11), (0.16, bus_wid - 0.04, 0.94), m_bus_white, bevel=0.04)

    # Heavy-Duty Black Front Bumper Splitter (Z = 0.32 to 0.64, projecting forward)
    create_box("FrontBumper", (fx + 0.10, 0, 0.48), (0.24, bus_wid + 0.04, 0.32), m_dark_trim, bevel=0.04)

    # Front License Plate ("DHAKA METRO-BA 11-4290")
    create_box("LicensePlateBorder", (fx + 0.225, 0, 0.48), (0.015, 0.52, 0.17), m_dark_trim)
    create_box("LicensePlateFront", (fx + 0.23, 0, 0.48), (0.015, 0.50, 0.15), m_bus_white, bevel=0.005)

    # RECESSED TRIPLE-BEAM ROUND HEADLIGHTS (EXACT GTA V BUS SIGNATURE!)
    # 3 bold circular round lamps on Left fascia, 3 on Right fascia (18cm diameter!)
    headlight_spacing = [0.58, 0.78, 0.98]
    for side, sign in [("L", -1), ("R", 1)]:
        for h_i, hy_off in enumerate(headlight_spacing):
            hy = sign * hy_off
            is_turn = (h_i == 2)  # Outermost lamp is amber turn signal!
            
            # Recessed black circular bezel socket
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.092,
                depth=0.06,
                location=(fx + 0.04, hy, 1.05),
                rotation=(0, math.pi / 2, 0),
                vertices=20
            )
            h_sock = assign_material(bpy.context.object, m_dark_trim)
            smooth_mesh(h_sock)

            # Chrome reflector ring
            bpy.ops.mesh.primitive_torus_add(
                major_radius=0.082,
                minor_radius=0.014,
                major_segments=20,
                minor_segments=6,
                location=(fx + 0.05, hy, 1.05),
                rotation=(0, math.pi / 2, 0)
            )
            h_ring = assign_material(bpy.context.object, m_chrome)
            smooth_mesh(h_ring)

            # High-intensity round LED projector beam
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.076,
                depth=0.04,
                location=(fx + 0.065, hy, 1.05),
                rotation=(0, math.pi / 2, 0),
                vertices=20
            )
            h_bulb = assign_material(bpy.context.object, m_marker_amber if is_turn else m_headlight_lens)
            smooth_mesh(h_bulb)

    # -------------------------------------------------------------
    # 7. AERODYNAMIC RAKED WINDSHIELD & FRONT DESTINATION DISPLAY
    # -------------------------------------------------------------
    # Raked Panoramic Curved Front Windshield Glass
    # Bottom at X = 5.80, Z = 1.58 -> Top at X = 5.48, Z = 2.65
    create_cylinder_between("A_Pillar_L", (5.80, -body_y + 0.05, 1.58), (5.48, -body_y + 0.05, 2.65), 0.045, m_dark_trim)
    create_cylinder_between("A_Pillar_R", (5.80, body_y - 0.05, 1.58), (5.48, body_y - 0.05, 2.65), 0.045, m_dark_trim)
    create_cylinder_between("WindshieldCenterPost", (5.80, 0, 1.58), (5.48, 0, 2.65), 0.024, m_dark_trim)

    # Raked windshield glass mesh
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(5.64, 0, 2.115))
    ws_obj = bpy.context.object
    ws_obj.name = "WindshieldGlassRaked"
    ws_obj.dimensions = (0.05, bus_wid - 0.12, 1.12)
    ws_obj.rotation_euler = (0, math.radians(-16), 0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth_mesh(ws_obj)
    assign_material(ws_obj, m_windshield)

    # Horizontal wipers resting at windshield base
    create_cylinder_between("WiperArm_L", (5.82, -0.65, 1.62), (5.80, -0.12, 1.65), 0.014, m_dark_trim)
    create_cylinder_between("WiperArm_R", (5.82, 0.12, 1.62), (5.80, 0.65, 1.65), 0.014, m_dark_trim)

    # Front Electronic Destination Matrix Sign ("VIP 27 · MIRPUR 10")
    # Sits directly above windshield (X = 5.48 to 5.45, Z = 2.65 to 2.92)
    create_box("DestSignVisorRed", (5.42, 0, 2.78), (0.24, bus_wid - 0.02, 0.28), m_bus_red, bevel=0.03)
    create_box("DestSignHousing", (5.49, 0, 2.78), (0.06, 1.94, 0.22), m_dark_trim, bevel=0.02)
    create_box("DestSignGlass", (5.525, 0, 2.78), (0.02, 1.86, 0.18), m_dest_display)
    
    # 3D Embossed Amber LED Destination Text: "VIP 27 · MIRPUR 10"
    create_3d_text(
        "DestSignText",
        "VIP 27 · MIRPUR 10",
        (5.54, 0, 2.78),
        (math.pi / 2, 0, math.pi / 2),
        0.125,
        0.015,
        m_dest_display
    )

    # 4 Amber Roof Clearance Marker Lights across front brow
    for mx in [-0.85, -0.30, 0.30, 0.85]:
        create_box(f"MarkerFront_{mx}", (5.46, mx, 2.92), (0.035, 0.08, 0.035), m_marker_amber, bevel=0.005)

    # Aerodynamic Black Side Mirrors on Twin Tubular Brackets
    for side, sign in [("L", -1), ("R", 1)]:
        my = sign * (body_y + 0.20)
        create_cylinder_between(f"MirrorArm1_{side}", (5.55, sign * (body_y - 0.02), 2.55), (5.68, my, 2.45), 0.018, m_dark_trim)
        create_cylinder_between(f"MirrorArm2_{side}", (5.72, sign * (body_y - 0.02), 2.10), (5.68, my, 2.22), 0.018, m_dark_trim)
        create_box(f"MirrorHead_{side}", (5.68, my, 2.34), (0.06, 0.09, 0.32), m_dark_trim, bevel=0.012)
        create_box(f"MirrorGlass_{side}", (5.64, my, 2.34), (0.01, 0.075, 0.30), m_chrome)

    # -------------------------------------------------------------
    # 8. UPPER CRIMSON RED HEADER, ROOF & 3D "VIP TRANSIT" DECALS
    # -------------------------------------------------------------
    # Roof runs from top of destination visor (X = 5.45) back to rear (X = -5.85) - NO OVERHANG!
    roof_len = 5.45 - (-5.85)
    roof_mid_x = (5.45 + -5.85) * 0.5

    # Crimson Red Upper Window Header Band (Running full length on both sides)
    create_box("UpperHeaderRed_L", (roof_mid_x, -body_y, 2.76), (roof_len, 0.08, 0.32), m_bus_red, bevel=0.02)
    create_box("UpperHeaderRed_R", (roof_mid_x, body_y, 2.76), (roof_len, 0.08, 0.32), m_bus_red, bevel=0.02)

    # 3D EMBOSSED "VIP TRANSIT" LETTERING (CORRECTLY ORIENTED LEFT & RIGHT!)
    create_3d_text(
        "VIP_Text_L",
        "- VIP TRANSIT -",
        (0.60, -body_y - 0.045, 2.76),
        (math.pi / 2, 0, 0),
        0.20,
        0.018,
        m_decal_white
    )
    create_3d_text(
        "VIP_Text_R",
        "- VIP TRANSIT -",
        (0.60, body_y + 0.045, 2.76),
        (math.pi / 2, 0, math.pi),
        0.20,
        0.018,
        m_decal_white
    )

    # Rear Side Red Aerodynamic Sweep down across rear quarter panel (Photo 3 Signature!)
    for sign in [-1, 1]:
        sy = sign * (body_y + 0.005)
        create_wedge_mesh(
            f"RedSweep_{sign}",
            Vector((-3.8, sy, 2.62)),
            Vector((-3.8, sy, 1.58)),
            Vector((-5.85, sy, 2.62)),
            Vector((-3.8, sy, 2.62)),
            Vector((-3.8, sy, 0.85)),
            Vector((-5.85, sy, 0.85)),
            m_bus_red
        )
        create_sphere(f"BkashBadge_{sign}", (-4.5, sy + sign * 0.012, 1.35), 0.16, (1.0, 0.1, 1.0), m_bkash_pink)
        create_3d_text(
            f"BkashText_{sign}",
            "bKash",
            (-4.5, sy + sign * 0.025, 1.35),
            (math.pi / 2, 0, 0 if sign < 0 else math.pi),
            0.09,
            0.015,
            m_decal_white
        )

    # Main Roof Slab (Crimson Red with rounded aerodynamic perimeter, perfectly flush with front brow!)
    create_box("RoofStructure", (roof_mid_x, 0, 2.92), (roof_len, bus_wid - 0.02, 0.14), m_bus_red, bevel=0.05)

    # Streamlined Rooftop AC / Climate Control Pod (Light silver/white matching Photo 2 & 3!)
    create_box("ACPodBody", (-0.20, 0, 3.14), (5.40, 1.48, 0.30), m_ac_pod, bevel=0.08)
    create_wedge_mesh(
        "ACPodFrontCap",
        Vector((2.50, -0.74, 2.99)),
        Vector((2.50, 0.74, 2.99)),
        Vector((2.50, 0.0, 3.29)),
        Vector((2.90, -0.62, 2.99)),
        Vector((2.90, 0.62, 2.99)),
        Vector((2.90, 0.0, 3.17)),
        m_ac_pod
    )
    for side, sign in [("L", -1), ("R", 1)]:
        for gi in range(7):
            gx = 1.9 - gi * 0.65
            create_box(f"AC_Louver_{side}_{gi}", (gx, sign * 0.75, 3.15), (0.44, 0.02, 0.14), m_dark_trim)

    create_cylinder_between("RoofExhaustSnorkel", (-5.4, 0.90, 2.95), (-5.4, 0.90, 3.32), 0.045, m_dark_trim)
    create_cylinder_between("RoofExhaustTip", (-5.4, 0.90, 3.32), (-5.55, 0.90, 3.35), 0.042, m_chrome)

    for side, sign in [("L", -1), ("R", 1)]:
        for mx in [4.2, 2.1, 0.0, -2.1, -4.2]:
            create_box(f"RoofMarker_{side}_{mx}", (mx, sign * (body_y + 0.015), 2.88), (0.08, 0.02, 0.035), m_marker_amber, bevel=0.005)

    # -------------------------------------------------------------
    # 9. PASSENGER BI-FOLD DOORS & 6 PANORAMIC TINTED WINDOW BAYS
    # -------------------------------------------------------------
    create_box("DoorFrameOuter", (4.82, body_y, 1.82), (1.10, 0.06, 1.76), m_dark_trim, bevel=0.02)
    create_box("DoorLeaf1_Glass", (5.10, body_y + 0.005, 1.82), (0.48, 0.025, 1.68), m_glass)
    create_box("DoorLeaf2_Glass", (4.54, body_y + 0.005, 1.82), (0.48, 0.025, 1.68), m_glass)
    create_cylinder_between("DoorPole_1", (5.10, body_y - 0.10, floor_z), (5.10, body_y - 0.10, 2.58), 0.025, m_stanchion_yellow)
    create_cylinder_between("DoorPole_2", (4.54, body_y - 0.10, floor_z), (4.54, body_y - 0.10, 2.58), 0.025, m_stanchion_yellow)

    # 6 Panoramic Side Window Bays with Solid Black Vertical Pillars
    bay_centers = [4.8, 3.2, 1.6, 0.0, -1.6, -3.2, -4.8]
    bay_width = 1.48
    window_hgt = 1.02
    window_z = 2.11

    for bi, bx in enumerate(bay_centers):
        create_box(f"WindowFrame_L_{bi}", (bx, -body_y, window_z), (bay_width + 0.08, 0.04, window_hgt + 0.06), m_dark_trim)
        create_box(f"WindowGlass_L_{bi}", (bx, -body_y, window_z), (bay_width, 0.025, window_hgt), m_glass)
        create_box(f"WindowTransom_L_{bi}", (bx, -body_y - 0.015, window_z + 0.34), (bay_width, 0.015, 0.02), m_dark_trim)
        
        if bx <= 4.0:
            create_box(f"WindowFrame_R_{bi}", (bx, body_y, window_z), (bay_width + 0.08, 0.04, window_hgt + 0.06), m_dark_trim)
            create_box(f"WindowGlass_R_{bi}", (bx, body_y, window_z), (bay_width, 0.025, window_hgt), m_glass)
            create_box(f"WindowTransom_R_{bi}", (bx, body_y + 0.015, window_z + 0.34), (bay_width, 0.015, 0.02), m_dark_trim)

    # -------------------------------------------------------------
    # 10. REAR FASCIA & VERTICAL TAILLIGHT CLUSTERS
    # -------------------------------------------------------------
    rx = -5.85
    create_box("RearLowerWhite", (rx + 0.02, 0, 1.11), (0.08, bus_wid - 0.04, 0.94), m_bus_white, bevel=0.04)
    create_box("RearUpperRed", (rx + 0.02, 0, 2.76), (0.08, bus_wid - 0.04, 0.32), m_bus_red, bevel=0.04)
    create_box("RearWindowGlass", (rx + 0.01, 0, 2.11), (0.025, bus_wid - 0.35, 0.88), m_glass)
    create_box("RearWindowFrame", (rx + 0.02, 0, 2.11), (0.04, bus_wid - 0.28, 0.94), m_dark_trim)

    create_box("RearBumper", (rx - 0.10, 0, 0.48), (0.24, bus_wid + 0.04, 0.32), m_dark_trim, bevel=0.04)
    create_box("LicensePlateRear", (rx - 0.23, 0, 0.48), (0.015, 0.50, 0.15), m_bus_white, bevel=0.005)

    for side, sign in [("L", -1), ("R", 1)]:
        ty = sign * (body_y - 0.18)
        create_box(f"Taillight_Brake_{side}", (rx - 0.02, ty, 1.25), (0.02, 0.16, 0.18), m_taillight_red, bevel=0.005)
        create_box(f"Taillight_Turn_{side}", (rx - 0.02, ty, 1.05), (0.02, 0.16, 0.14), m_marker_amber, bevel=0.005)
        create_box(f"Taillight_Rev_{side}", (rx - 0.02, ty, 0.88), (0.02, 0.16, 0.12), m_headlight_lens, bevel=0.005)

    create_cylinder_between("ExhaustPipe", (rx - 0.05, -0.85, 0.38), (rx - 0.25, -0.85, 0.38), 0.055, m_chrome)

    # -------------------------------------------------------------
    # 11. INTERIOR CABIN: SEATING & YELLOW STANCHION POLES
    # -------------------------------------------------------------
    create_cylinder_between("OverheadRail_L", (4.8, -0.35, 2.52), (-4.8, -0.35, 2.52), 0.022, m_stanchion_yellow)
    create_cylinder_between("OverheadRail_R", (4.8, 0.35, 2.52), (-4.8, 0.35, 2.52), 0.022, m_stanchion_yellow)

    for px in [3.2, 1.6, 0.0, -1.6, -3.2, -4.6]:
        create_cylinder_between(f"VerticalPole_L_{px}", (px, -0.35, floor_z), (px, -0.35, 2.70), 0.022, m_stanchion_yellow)
        create_cylinder_between(f"VerticalPole_R_{px}", (px, 0.35, floor_z), (px, 0.35, 2.70), 0.022, m_stanchion_yellow)

    seat_xs = [3.2, 1.6, 0.0, -1.6, -3.2, -4.6]
    for row_i, sx in enumerate(seat_xs):
        for side, sign in [("L", -1), ("R", 1)]:
            sy = sign * 0.78
            create_cylinder_between(f"SeatStand_{row_i}_{side}", (sx, sy, floor_z), (sx, sy, floor_z + 0.35), 0.035, m_seat_frame)
            create_box(f"SeatCushion_{row_i}_{side}", (sx, sy, floor_z + 0.42), (0.48, 0.72, 0.12), m_seat_blue, bevel=0.02)
            create_box(f"SeatBack_{row_i}_{side}", (sx - 0.20, sy, floor_z + 0.78), (0.10, 0.72, 0.60), m_seat_blue, bevel=0.03)
            create_cylinder_between(f"SeatHandle_{row_i}_{side}", (sx - 0.20, sy - 0.25, floor_z + 1.10), (sx - 0.20, sy + 0.25, floor_z + 1.10), 0.015, m_seat_frame)

    # -------------------------------------------------------------
    # 12. FULL-BODIED DRIVER (PROPERLY SEATED IN CABIN!)
    # -------------------------------------------------------------
    dx, dy, dz = 4.60, -0.72, floor_z

    create_box("DriverSeatPedestal", (dx, dy, dz + 0.20), (0.45, 0.45, 0.40), m_seat_frame)
    create_box("DriverSeatCushion", (dx, dy, dz + 0.45), (0.50, 0.50, 0.14), m_seat_blue, bevel=0.02)
    create_box("DriverSeatBack", (dx - 0.22, dy, dz + 0.82), (0.12, 0.50, 0.62), m_seat_blue, bevel=0.03)

    create_box("DashboardConsole", (dx + 0.62, dy, dz + 0.55), (0.42, 0.75, 0.50), m_dark_trim, bevel=0.03)
    create_cylinder_between("SteeringColumn", (dx + 0.52, dy, dz + 0.55), (dx + 0.32, dy, dz + 0.88), 0.035, m_dark_trim)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.22,
        minor_radius=0.022,
        major_segments=24,
        minor_segments=8,
        location=(dx + 0.32, dy, dz + 0.88),
        rotation=(0, math.radians(-50), 0)
    )
    s_wheel = assign_material(bpy.context.object, m_dark_trim)
    s_wheel.name = "BusSteeringWheel"

    create_box("Driver_Pelvis", (dx, dy, dz + 0.55), (0.24, 0.28, 0.16), m_pants_dark, bevel=0.02)
    create_box("Driver_Torso", (dx + 0.02, dy, dz + 0.82), (0.26, 0.36, 0.38), m_shirt_blue, bevel=0.04)
    create_cylinder_between("Driver_Neck", (dx + 0.04, dy, dz + 1.02), (dx + 0.06, dy, dz + 1.12), 0.052, m_skin_d, verts=10)
    build_head_and_face("BusDriver", (dx + 0.08, dy, dz + 1.24), m_skin_d, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair)

    create_cylinder_between("Driver_Arm_L", (dx + 0.04, dy - 0.16, dz + 0.95), (dx + 0.24, dy - 0.18, dz + 0.86), 0.05, m_shirt_blue, verts=10)
    create_cylinder_between("Driver_Forearm_L", (dx + 0.24, dy - 0.18, dz + 0.86), (dx + 0.34, dy - 0.14, dz + 0.88), 0.042, m_skin_d, verts=10)
    create_sphere("Driver_Hand_L", (dx + 0.35, dy - 0.13, dz + 0.88), 0.044, (1.2, 0.9, 0.9), m_skin_d)
    
    create_cylinder_between("Driver_Arm_R", (dx + 0.04, dy + 0.16, dz + 0.95), (dx + 0.24, dy + 0.18, dz + 0.86), 0.05, m_shirt_blue, verts=10)
    create_cylinder_between("Driver_Forearm_R", (dx + 0.24, dy + 0.18, dz + 0.86), (dx + 0.34, dy + 0.14, dz + 0.88), 0.042, m_skin_d, verts=10)
    create_sphere("Driver_Hand_R", (dx + 0.35, dy + 0.13, dz + 0.88), 0.044, (1.2, 0.9, 0.9), m_skin_d)

    for side, sign in [("L", -1), ("R", 1)]:
        ly = dy + sign * 0.10
        create_cylinder_between(f"Driver_Thigh_{side}", (dx + 0.02, ly, dz + 0.55), (dx + 0.32, ly, dz + 0.50), 0.065, m_pants_dark, verts=12)
        create_cylinder_between(f"Driver_Shin_{side}", (dx + 0.32, ly, dz + 0.50), (dx + 0.32, ly, dz + 0.08), 0.055, m_pants_dark, verts=10)
        create_box(f"Driver_Foot_{side}", (dx + 0.38, ly, dz + 0.06), (0.16, 0.08, 0.05), m_dark_trim, bevel=0.01)

    # -------------------------------------------------------------
    # 13. 6 FULL-BODIED PASSENGERS (SEATED COMFORTABLY INSIDE CABIN!)
    # -------------------------------------------------------------
    pass_configs = [
        (3.2, -0.78, m_shirt_white, m_skin_p1, False),  # Row 1 Left: Man in White Panjabi
        (1.6, 0.78, m_saree_pink, m_skin_p2, True),     # Row 2 Right: Woman in Pink Saree
        (0.0, -0.78, m_shirt_green, m_skin_p1, False),  # Row 3 Left: Man in Green Polo
        (-1.6, 0.78, m_shirt_yellow, m_skin_p2, False), # Row 4 Right: Man in Mustard Shirt
        (-3.2, -0.78, m_shirt_blue, m_skin_p1, False),  # Row 5 Left: Man in Blue Shirt
        (-4.6, 0.78, m_saree_pink, m_skin_p2, True),    # Row 6 Right: Woman in Pink Saree
    ]

    for pi, (px, py, p_shirt, p_skin, p_fem) in enumerate(pass_configs):
        pz = floor_z + 0.42
        create_box(f"P_Pelvis_{pi}", (px, py, pz + 0.12), (0.24, 0.28, 0.14), m_pants_dark, bevel=0.02)
        create_box(f"P_Torso_{pi}", (px - 0.02, py, pz + 0.40), (0.24, 0.34, 0.38), p_shirt, bevel=0.04)
        create_cylinder_between(f"P_Neck_{pi}", (px, py, pz + 0.60), (px + 0.02, py, pz + 0.70), 0.048, p_skin, verts=10)
        build_head_and_face(f"P_{pi}", (px + 0.04, py, pz + 0.82), p_skin, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=(m_hair if not p_fem else None), is_female=p_fem)

        create_cylinder_between(f"P_Arm_L_{pi}", (px - 0.02, py - 0.16, pz + 0.52), (px + 0.12, py - 0.14, pz + 0.30), 0.044, p_shirt, verts=10)
        create_cylinder_between(f"P_Forearm_L_{pi}", (px + 0.12, py - 0.14, pz + 0.30), (px + 0.22, py - 0.06, pz + 0.26), 0.036, p_skin, verts=10)
        create_sphere(f"P_Hand_L_{pi}", (px + 0.23, py - 0.05, pz + 0.26), 0.038, (1.2, 0.9, 0.9), p_skin)

        create_cylinder_between(f"P_Arm_R_{pi}", (px - 0.02, py + 0.16, pz + 0.52), (px + 0.12, py + 0.14, pz + 0.30), 0.044, p_shirt, verts=10)
        create_cylinder_between(f"P_Forearm_R_{pi}", (px + 0.12, py + 0.14, pz + 0.30), (px + 0.22, py + 0.06, pz + 0.26), 0.036, p_skin, verts=10)
        create_sphere(f"P_Hand_R_{pi}", (px + 0.23, py + 0.05, pz + 0.26), 0.038, (1.2, 0.9, 0.9), p_skin)

        for side, sign in [("L", -1), ("R", 1)]:
            ply = py + sign * 0.09
            create_cylinder_between(f"P_Thigh_{pi}_{side}", (px + 0.02, ply, pz + 0.12), (px + 0.28, ply, pz + 0.10), 0.06, m_pants_dark, verts=12)
            create_cylinder_between(f"P_Shin_{pi}_{side}", (px + 0.28, ply, pz + 0.10), (px + 0.28, ply, floor_z + 0.08), 0.052, m_pants_dark, verts=10)
            create_box(f"P_Foot_{pi}_{side}", (px + 0.33, ply, floor_z + 0.06), (0.15, 0.075, 0.04), m_dark_trim, bevel=0.01)

    # -------------------------------------------------------------
    # 14. EXPORT TO GLTF/GLB
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
    print("SUCCESSFULLY EXPORTED GTA V-GRADE DHAKA BUS TO:", OUTPUT)

if __name__ == "__main__":
    build()
