"""
Blender 5.2 Python Script: GTA V-Grade City Transit Bus Digital Twin
Authentic Match to User Reference Photos 2 & 3:
- Exact GTA V Brute / Los Santos Transit Bus Body Silhouette & Details
- User Request 3rd Pic Color Combination: Vibrant Crimson Red Upper / Clean White Lower
- Front Destination Matrix Sign: Amber LED "VIP - MIRPUR 10"
- 4 Amber Clearance Marker Lights on Front Roof Visor
- Curved Panoramic Front Windshield with Center Divider & Twin Wipers
- Recessed Triple-Beam Round Headlights on Left & Right Lower White Fascia
- Black Front Bumper Splitter with License Plate
- Right-Side Folding Bi-Fold Passenger Doors with Glass & Yellow Grab Poles
- 6 Panoramic Passenger Window Bays with Flush Black Gaskets & Tinted Glass
- Aerodynamic White/Silver Rooftop AC Unit Pod with Ventilation Louvers
- 3D Embossed "VIP TRANSIT" Header Decals & "bKash" Digital Fare Emblem
- Commercial Transit Wheels (Radial Tires, Steel 10-Hole Rims, Axle Hubs)
- Detailed Interior: Low-Floor Deck, Commuter Seats with Blue Upholstery, Yellow Stanchion Poles
- Driver at Steering Wheel & Commuters Seated Properly (Zero Under-Floor Clipping!)
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

def create_bus_wheel(name, center, radius, width, tire_mat, rim_mat, hub_mat, is_dual=False):
    parts = []
    cx, cy, cz = center

    # Outer tire(s)
    tire_offsets = [-width * 0.25, width * 0.25] if is_dual else [0.0]
    tire_w = width * 0.45 if is_dual else width

    for toff in tire_offsets:
        bpy.ops.mesh.primitive_cylinder_add(
            radius=radius,
            depth=tire_w * 0.90,
            location=(cx, cy + toff, cz),
            rotation=(math.pi / 2, 0, 0),
            vertices=32
        )
        t_cyl = assign_material(bpy.context.object, tire_mat)
        smooth_mesh(t_cyl)
        parts.append(t_cyl)

        # Beveled tire shoulders
        bpy.ops.mesh.primitive_torus_add(
            major_radius=radius - 0.05,
            minor_radius=0.05,
            major_segments=32,
            minor_segments=8,
            location=(cx, cy + toff, cz),
            rotation=(math.pi / 2, 0, 0)
        )
        t_tor = assign_material(bpy.context.object, tire_mat)
        smooth_mesh(t_tor)
        parts.append(t_tor)

    # Steel transit rim with cooling vent holes & central dish
    rim_y = cy + (width * 0.52 if cy > 0 else -width * 0.52)
    rim_dir = 1 if cy > 0 else -1

    # Outer rim lip
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius * 0.65,
        minor_radius=0.025,
        major_segments=32,
        minor_segments=8,
        location=(cx, rim_y, cz),
        rotation=(math.pi / 2, 0, 0)
    )
    r_lip = assign_material(bpy.context.object, rim_mat)
    smooth_mesh(r_lip)
    parts.append(r_lip)

    # Pressed steel dish
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius * 0.64,
        depth=0.04,
        location=(cx, rim_y - rim_dir * 0.02, cz),
        rotation=(math.pi / 2, 0, 0),
        vertices=24
    )
    r_dish = assign_material(bpy.context.object, rim_mat)
    smooth_mesh(r_dish)
    parts.append(r_dish)

    # Central heavy axle hub
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius * 0.25,
        depth=0.08,
        location=(cx, rim_y + rim_dir * 0.02, cz),
        rotation=(math.pi / 2, 0, 0),
        vertices=18
    )
    r_hub = assign_material(bpy.context.object, hub_mat)
    smooth_mesh(r_hub)
    parts.append(r_hub)

    # 10 Wheel Lug Nuts around hub perimeter
    for i in range(10):
        ang = (2 * math.pi / 10) * i
        lx = cx + math.cos(ang) * (radius * 0.38)
        lz = cz + math.sin(ang) * (radius * 0.38)
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.016,
            depth=0.03,
            location=(lx, rim_y + rim_dir * 0.03, lz),
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
    m_bus_red = create_material("Bus_RedPaint", (0.78, 0.08, 0.12), metallic=0.15, roughness=0.25, clearcoat=1.0)
    # Crisp Clean White Lower Body (Photo 3 Color Combination)
    m_bus_white = create_material("Bus_WhitePaint", (0.95, 0.95, 0.94), metallic=0.05, roughness=0.30, clearcoat=1.0)
    # Satin Charcoal/Black for bumpers, moldings, window frames, rocker panels
    m_dark_trim = create_material("Bus_DarkBumper", (0.08, 0.08, 0.09), metallic=0.15, roughness=0.75)
    # Heavy-duty commercial bus tire rubber
    m_tire = create_material("Bus_TireRubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    # Pressed steel commercial rims
    m_steel_rim = create_material("Bus_SteelRim", (0.76, 0.78, 0.80), metallic=0.85, roughness=0.25)
    # Hubcaps & chrome details
    m_chrome = create_material("Bus_ChromeGrille", (0.90, 0.92, 0.94), metallic=0.98, roughness=0.10)
    # Rooftop AC unit pod silver/light grey
    m_ac_pod = create_material("Bus_RoofACPod", (0.88, 0.89, 0.91), metallic=0.35, roughness=0.35)
    
    # Panoramic Tinted Passenger Window Glass (Smooth transmission & reflections)
    m_glass = create_material("Bus_WindowGlass", (0.08, 0.12, 0.16), metallic=0.15, roughness=0.05, alpha=0.35)
    # Windshield Curved Automotive Glass
    m_windshield = create_material("Bus_WindshieldGlass", (0.07, 0.11, 0.15), metallic=0.10, roughness=0.04, alpha=0.32)

    # Light Emitters
    # Front Electronic Destination Matrix LED Display ("VIP - MIRPUR 10")
    m_dest_display = create_material("Bus_DestSignLED", (1.0, 0.68, 0.08), emission=(1.0, 0.68, 0.08), emission_strength=7.0)
    # Triple-Beam High-Intensity Round Headlights
    m_headlight_triple = create_material("Bus_HeadlightLED", (1.0, 1.0, 1.0), emission=(0.95, 0.98, 1.0), emission_strength=12.0)
    # Amber Turn Signals & Roof Clearance Marker Lights
    m_marker_amber = create_material("Bus_MarkerAmber", (1.0, 0.55, 0.02), emission=(1.0, 0.55, 0.02), emission_strength=5.5)
    # Rear Red Taillight Clusters
    m_taillight_red = create_material("Bus_TaillightLED", (0.95, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=6.0)

    # 3D Decal Lettering (Crisp White for "VIP TRANSIT" and "bKash" sponsor emblem)
    m_decal_white = create_material("Bus_DecalWhite", (0.98, 0.98, 0.98), emission=(0.98, 0.98, 0.98), emission_strength=1.5)
    m_bkash_pink = create_material("Bus_BkashPink", (0.88, 0.12, 0.42), metallic=0.1, roughness=0.4)

    # Interior Cabin Materials
    m_floor = create_material("Bus_InteriorFloor", (0.14, 0.14, 0.15), metallic=0.1, roughness=0.85)
    # Commuter transit seats with blue patterned upholstery (Exact GTA V Bus interior in Photos 2 & 3!)
    m_seat_blue = create_material("Bus_SeatBlue", (0.08, 0.22, 0.62), metallic=0.05, roughness=0.75)
    m_seat_frame = create_material("Bus_SeatFrame", (0.16, 0.17, 0.19), metallic=0.3, roughness=0.6)
    # High-Visibility Safety Yellow Grab Stanchion Poles (Prominent in Photos 2 & 3!)
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
    # 2. HEAVY-DUTY COMMERCIAL BUS WHEELS (SINGLE JOINED MESHES!)
    # -------------------------------------------------------------
    wheel_radius = 0.52
    front_width = 0.28
    rear_width = 0.42
    front_x = 3.60
    rear_x = -3.20
    track_y = 1.12

    # Front wheels
    w_fl = create_bus_wheel("wheel_front_left", (front_x, -track_y, wheel_radius), wheel_radius, front_width, m_tire, m_steel_rim, m_chrome, is_dual=False)
    w_fr = create_bus_wheel("wheel_front_right", (front_x, track_y, wheel_radius), wheel_radius, front_width, m_tire, m_steel_rim, m_chrome, is_dual=False)
    
    # Dual rear wheels
    w_rl = create_bus_wheel("wheel_rear_left", (rear_x, -track_y, wheel_radius), wheel_radius, rear_width, m_tire, m_steel_rim, m_chrome, is_dual=True)
    w_rr = create_bus_wheel("wheel_rear_right", (rear_x, track_y, wheel_radius), wheel_radius, rear_width, m_tire, m_steel_rim, m_chrome, is_dual=True)

    # -------------------------------------------------------------
    # 3. CHASSIS FLOOR & UNDERCARRIAGE (NO CLIPPING THROUGH BOTTOM!)
    # -------------------------------------------------------------
    bus_len = 11.60
    bus_wid = 2.50
    floor_z = 0.68

    # Solid undercarriage belly pan & interior floor deck
    create_box("ChassisFloorPan", (0, 0, floor_z - 0.06), (bus_len - 0.4, bus_wid - 0.1, 0.12), m_dark_trim)
    create_box("InteriorFloorDeck", (0, 0, floor_z + 0.02), (bus_len - 0.5, bus_wid - 0.14, 0.04), m_floor)

    # Protective lower black rocker panel skirts (Along bottom of body)
    create_box("RockerSkirt_L", (0, -bus_wid * 0.5 - 0.01, floor_z - 0.08), (bus_len - 0.2, 0.04, 0.16), m_dark_trim)
    create_box("RockerSkirt_R", (0, bus_wid * 0.5 + 0.01, floor_z - 0.08), (bus_len - 0.2, 0.04, 0.16), m_dark_trim)

    # -------------------------------------------------------------
    # 4. LOWER BODYWORK (CLEAN WHITE - EXACT MATCH TO PHOTO 3!)
    # -------------------------------------------------------------
    # Lower white side body panels below window beltline (from Z=0.68 to Z=1.62)
    # Left side (Driver side Y = -1.25)
    create_box("LowerBodyWhite_L", (0, -bus_wid * 0.5, 1.15), (bus_len - 0.3, 0.06, 0.92), m_bus_white, bevel=0.03)
    # Right side (Door side Y = +1.25)
    create_box("LowerBodyWhite_R", (-0.75, bus_wid * 0.5, 1.15), (bus_len - 1.8, 0.06, 0.92), m_bus_white, bevel=0.03)

    # Front wheel arch moldings (Black rubber surround)
    for sign in [-1, 1]:
        wy = sign * (bus_wid * 0.5 + 0.02)
        create_cylinder_between(f"WheelArchFront_{sign}", (front_x - 0.62, wy, wheel_radius), (front_x + 0.62, wy, wheel_radius), 0.035, m_dark_trim)
        create_cylinder_between(f"WheelArchRear_{sign}", (rear_x - 0.65, wy, wheel_radius), (rear_x + 0.65, wy, wheel_radius), 0.035, m_dark_trim)

    # -------------------------------------------------------------
    # 5. FRONT NOSE FASCIA & TRIPLE-BEAM ROUND HEADLIGHTS (PHOTO 2 & 3!)
    # -------------------------------------------------------------
    fx = bus_len * 0.5 - 0.10

    # Aerodynamic sloped front white nose cowl
    create_wedge_mesh(
        "FrontNoseCowlWhite",
        Vector((fx - 0.40, -bus_wid * 0.5, 0.68)),
        Vector((fx - 0.40, bus_wid * 0.5, 0.68)),
        Vector((fx - 0.40, 0.0, 1.62)),
        Vector((fx + 0.18, -bus_wid * 0.5 + 0.08, 0.68)),
        Vector((fx + 0.18, bus_wid * 0.5 - 0.08, 0.68)),
        Vector((fx + 0.05, 0.0, 1.62)),
        m_bus_white
    )

    # Lower Front Heavy-Duty Bumper Splitter
    create_box("FrontBumper", (fx + 0.14, 0, 0.54), (0.22, bus_wid + 0.06, 0.22), m_dark_trim, bevel=0.04)

    # Front Center License Plate ("DHAKA METRO-BA 11-4290")
    create_box("LicensePlateFront", (fx + 0.26, 0, 0.54), (0.02, 0.48, 0.14), m_bus_white, bevel=0.005)
    create_box("LicensePlateBorder", (fx + 0.255, 0, 0.54), (0.015, 0.50, 0.16), m_dark_trim)

    # RECESSED TRIPLE-BEAM ROUND HEADLIGHTS (EXACT GTA V BUS SIGNATURE!)
    # 3 circular round lights on the Left, 3 on the Right!
    headlight_spacing = [0.60, 0.76, 0.92]
    for side, sign in [("L", -1), ("R", 1)]:
        for h_i, hy_off in enumerate(headlight_spacing):
            hy = sign * hy_off
            # Recessed black housing socket
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.065,
                depth=0.06,
                location=(fx + 0.11 - h_i * 0.02, hy, 1.05),
                rotation=(0, math.pi / 2, 0),
                vertices=16
            )
            h_sock = assign_material(bpy.context.object, m_dark_trim)
            smooth_mesh(h_sock)

            # High-intensity round LED projector beam
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.052,
                depth=0.04,
                location=(fx + 0.13 - h_i * 0.02, hy, 1.05),
                rotation=(0, math.pi / 2, 0),
                vertices=16
            )
            h_bulb = assign_material(bpy.context.object, m_headlight_triple)
            smooth_mesh(h_bulb)

        # Front amber indicator blinker strip beneath outer headlight
        create_box(f"Indicator_{side}", (fx + 0.08, sign * 1.05, 0.88), (0.03, 0.12, 0.06), m_marker_amber, bevel=0.005)

    # -------------------------------------------------------------
    # 6. FRONT DESTINATION SIGN BOX & PANORAMIC WINDSHIELD
    # -------------------------------------------------------------
    # Aerodynamic Crimson Red Upper Brow & Destination Box Visor
    create_wedge_mesh(
        "DestSignVisorRed",
        Vector((fx - 0.70, -bus_wid * 0.5, 2.62)),
        Vector((fx - 0.70, bus_wid * 0.5, 2.62)),
        Vector((fx - 0.70, 0.0, 3.02)),
        Vector((fx - 0.10, -bus_wid * 0.5 + 0.06, 2.62)),
        Vector((fx - 0.10, bus_wid * 0.5 - 0.06, 2.62)),
        Vector((fx - 0.15, 0.0, 3.02)),
        m_bus_red
    )

    # Electronic LED Destination Matrix Display Board ("VIP - MIRPUR 10")
    create_box("DestSignHousing", (fx - 0.12, 0, 2.80), (0.08, 1.85, 0.30), m_dark_trim, bevel=0.02)
    create_box("DestSignGlass", (fx - 0.07, 0, 2.80), (0.02, 1.78, 0.24), m_dest_display)
    
    # 3D Embossed Amber LED Destination Text: "VIP 27 · MIRPUR 10"
    create_3d_text(
        "DestSignText",
        "VIP 27 · MIRPUR 10",
        (fx - 0.055, 0, 2.80),
        (math.pi / 2, 0, math.pi / 2),
        0.14,
        0.015,
        m_dest_display
    )

    # 4 Amber Roof Clearance Marker Lights across front brow
    for mx in [-0.75, -0.25, 0.25, 0.75]:
        create_box(f"MarkerFront_{mx}", (fx - 0.12, mx, 2.98), (0.025, 0.08, 0.035), m_marker_amber, bevel=0.005)

    # Panoramic Curved Front Windshield
    create_wedge_mesh(
        "WindshieldGlass",
        Vector((fx - 0.40, -bus_wid * 0.5 + 0.06, 1.62)),
        Vector((fx - 0.40, bus_wid * 0.5 - 0.06, 1.62)),
        Vector((fx - 0.40, 0.0, 1.64)),
        Vector((fx - 0.12, -bus_wid * 0.5 + 0.08, 2.62)),
        Vector((fx - 0.12, bus_wid * 0.5 - 0.08, 2.62)),
        Vector((fx - 0.12, 0.0, 2.64)),
        m_windshield
    )
    # Center black vertical wiper/pillar divider
    create_cylinder_between("WindshieldCenterPost", (fx - 0.40, 0, 1.62), (fx - 0.12, 0, 2.62), 0.025, m_dark_trim)
    # Twin Windshield Wipers resting horizontally at bottom
    create_cylinder_between("Wiper_L", (fx - 0.35, -0.65, 1.66), (fx - 0.32, -0.15, 1.68), 0.012, m_dark_trim)
    create_cylinder_between("Wiper_R", (fx - 0.35, 0.15, 1.66), (fx - 0.32, 0.65, 1.68), 0.012, m_dark_trim)

    # Aerodynamic Black Side Mirrors
    for side, sign in [("L", -1), ("R", 1)]:
        my = sign * (bus_wid * 0.5 + 0.18)
        create_cylinder_between(f"MirrorArm1_{side}", (fx - 0.35, sign * (bus_wid * 0.5 - 0.02), 2.55), (fx - 0.20, my, 2.45), 0.018, m_dark_trim)
        create_cylinder_between(f"MirrorArm2_{side}", (fx - 0.35, sign * (bus_wid * 0.5 - 0.02), 2.10), (fx - 0.20, my, 2.20), 0.018, m_dark_trim)
        create_box(f"MirrorHead_{side}", (fx - 0.20, my, 2.32), (0.06, 0.08, 0.32), m_dark_trim, bevel=0.01)

    # -------------------------------------------------------------
    # 7. UPPER BODYWORK, ROOF & AC POD (CRIMSON RED + WHITE SWEEP)
    # -------------------------------------------------------------
    # Crimson Red Upper Window Header Band (Running full length on both sides)
    create_box("UpperHeaderRed_L", (0, -bus_wid * 0.5, 2.74), (bus_len - 0.4, 0.06, 0.28), m_bus_red, bevel=0.02)
    create_box("UpperHeaderRed_R", (0, bus_wid * 0.5, 2.74), (bus_len - 0.4, 0.06, 0.28), m_bus_red, bevel=0.02)

    # 3D EMBOSSED "VIP TRANSIT" LETTERING ON RED HEADER (BOTH SIDES!)
    # Left side (+Y looking outward)
    create_3d_text(
        "VIP_Text_L",
        "VIP TRANSIT",
        (0.60, -bus_wid * 0.5 - 0.035, 2.74),
        (math.pi / 2, 0, -math.pi),
        0.22,
        0.018,
        m_decal_white
    )
    # Right side (-Y looking outward)
    create_3d_text(
        "VIP_Text_R",
        "VIP TRANSIT",
        (0.60, bus_wid * 0.5 + 0.035, 2.74),
        (math.pi / 2, 0, 0),
        0.22,
        0.018,
        m_decal_white
    )

    # Rear side red aerodynamic sweep down towards rear wheel arch (Photo 3 Signature!)
    for sign in [-1, 1]:
        sy = sign * (bus_wid * 0.5 + 0.005)
        create_wedge_mesh(
            f"RedSweep_{sign}",
            Vector((-3.8, sy, 2.60)),
            Vector((-3.8, sy, 1.60)),
            Vector((-5.4, sy, 2.60)),
            Vector((-3.8, sy, 2.60)),
            Vector((-3.8, sy, 1.15)),
            Vector((-5.4, sy, 1.15)),
            m_bus_red
        )
        # 3D bKash sponsor roundel emblem on rear white quarter panel
        create_sphere(f"BkashBadge_{sign}", (-4.4, sy + sign * 0.01, 1.35), 0.16, (1.0, 0.1, 1.0), m_bkash_pink)
        create_3d_text(
            f"BkashText_{sign}",
            "bKash",
            (-4.4, sy + sign * 0.025, 1.35),
            (math.pi / 2, 0, 0 if sign > 0 else -math.pi),
            0.10,
            0.015,
            m_decal_white
        )

    # Main Roof Slab (Crimson Red with rounded aerodynamic perimeter)
    create_box("RoofStructure", (0, 0, 2.90), (bus_len - 0.2, bus_wid - 0.06, 0.14), m_bus_red, bevel=0.06)

    # Streamlined Rooftop AC / Climate Control Pod (Light silver/white matching Photo 2 & 3!)
    create_box("ACPodBody", (-0.20, 0, 3.12), (5.20, 1.45, 0.32), m_ac_pod, bevel=0.08)
    # Aerodynamic front nose cap on AC pod
    create_wedge_mesh(
        "ACPodFrontCap",
        Vector((2.40, -0.725, 2.96)),
        Vector((2.40, 0.725, 2.96)),
        Vector((2.40, 0.0, 3.28)),
        Vector((2.80, -0.60, 2.96)),
        Vector((2.80, 0.60, 2.96)),
        Vector((2.80, 0.0, 3.16)),
        m_ac_pod
    )
    # AC Side Ventilation Grilles / Louvers
    for side, sign in [("L", -1), ("R", 1)]:
        for gi in range(6):
            gx = 1.6 - gi * 0.65
            create_box(f"AC_Louver_{side}_{gi}", (gx, sign * 0.74, 3.14), (0.45, 0.02, 0.16), m_dark_trim)

    # Amber Side Clearance Marker Lights along roof rim
    for side, sign in [("L", -1), ("R", 1)]:
        for mx in [3.6, 1.2, -1.2, -3.6]:
            create_box(f"RoofMarker_{side}_{mx}", (mx, sign * (bus_wid * 0.5 + 0.01), 2.85), (0.08, 0.02, 0.035), m_marker_amber, bevel=0.005)

    # -------------------------------------------------------------
    # 8. PASSENGER BI-FOLD DOORS & 6 PANORAMIC WINDOW BAYS
    # -------------------------------------------------------------
    # Front Right Passenger Door (Curb side Y = +1.25, between X = 4.10 and X = 5.15)
    # Bi-fold glass passenger doors with black frames & yellow grab poles inside
    create_box("DoorFrameOuter", (4.62, bus_wid * 0.5, 1.82), (1.10, 0.05, 1.76), m_dark_trim, bevel=0.02)
    # Left door leaf & right door leaf
    create_box("DoorLeaf1_Glass", (4.88, bus_wid * 0.5 + 0.005, 1.82), (0.48, 0.02, 1.68), m_glass)
    create_box("DoorLeaf2_Glass", (4.36, bus_wid * 0.5 + 0.005, 1.82), (0.48, 0.02, 1.68), m_glass)
    # Vertical yellow door grab poles
    create_cylinder_between("DoorPole_1", (4.88, bus_wid * 0.5 - 0.08, 0.70), (4.88, bus_wid * 0.5 - 0.08, 2.55), 0.025, m_stanchion_yellow)
    create_cylinder_between("DoorPole_2", (4.36, bus_wid * 0.5 - 0.08, 0.70), (4.36, bus_wid * 0.5 - 0.08, 2.55), 0.025, m_stanchion_yellow)

    # 6 Panoramic Side Passenger Windows on Left and Right Sides!
    # Left side bays (from X = +3.6 to X = -4.6)
    bay_centers = [3.6, 2.0, 0.4, -1.2, -2.8, -4.4]
    bay_width = 1.45
    window_hgt = 0.94
    window_z = 2.12

    for bi, bx in enumerate(bay_centers):
        # Left Window Bay (Driver Side)
        create_box(f"WindowFrame_L_{bi}", (bx, -bus_wid * 0.5, window_z), (bay_width + 0.08, 0.04, window_hgt + 0.06), m_dark_trim)
        create_box(f"WindowGlass_L_{bi}", (bx, -bus_wid * 0.5, window_z), (bay_width, 0.02, window_hgt), m_glass)
        
        # Right Window Bay (Door side - bays 2 to 6, since bay 1 has the door)
        if bi > 0:
            create_box(f"WindowFrame_R_{bi}", (bx, bus_wid * 0.5, window_z), (bay_width + 0.08, 0.04, window_hgt + 0.06), m_dark_trim)
            create_box(f"WindowGlass_R_{bi}", (bx, bus_wid * 0.5, window_z), (bay_width, 0.02, window_hgt), m_glass)

    # -------------------------------------------------------------
    # 9. REAR FASCIA & VERTICAL TAILLIGHT CLUSTERS
    # -------------------------------------------------------------
    rx = -bus_len * 0.5 + 0.10

    # Flat rear white tailgate & red upper cap
    create_box("RearLowerWhite", (rx, 0, 1.15), (0.08, bus_wid - 0.1, 0.92), m_bus_white, bevel=0.03)
    create_box("RearUpperRed", (rx, 0, 2.68), (0.08, bus_wid - 0.1, 0.42), m_bus_red, bevel=0.03)
    # Rear panoramic tinted window
    create_box("RearWindowGlass", (rx, 0, 2.12), (0.02, bus_wid - 0.35, 0.85), m_glass)
    create_box("RearWindowFrame", (rx, 0, 2.12), (0.04, bus_wid - 0.28, 0.92), m_dark_trim)

    # Rear Bumper & Step
    create_box("RearBumper", (rx - 0.12, 0, 0.54), (0.22, bus_wid + 0.06, 0.22), m_dark_trim, bevel=0.04)
    create_box("LicensePlateRear", (rx - 0.24, 0, 0.54), (0.02, 0.48, 0.14), m_bus_white, bevel=0.005)

    # Vertical Taillight Clusters (Red brake, amber turn, white reverse)
    for side, sign in [("L", -1), ("R", 1)]:
        ty = sign * (bus_wid * 0.5 - 0.18)
        # Red Brake Light
        create_box(f"Taillight_Brake_{side}", (rx - 0.05, ty, 1.25), (0.02, 0.16, 0.18), m_taillight_red, bevel=0.005)
        # Amber Turn Signal
        create_box(f"Taillight_Turn_{side}", (rx - 0.05, ty, 1.05), (0.02, 0.16, 0.14), m_marker_amber, bevel=0.005)
        # White Reverse Light
        create_box(f"Taillight_Rev_{side}", (rx - 0.05, ty, 0.88), (0.02, 0.16, 0.12), m_headlight_triple, bevel=0.005)

    # Chrome Exhaust Tailpipe
    create_cylinder_between("ExhaustPipe", (rx - 0.05, -0.85, 0.45), (rx - 0.25, -0.85, 0.45), 0.055, m_chrome)

    # -------------------------------------------------------------
    # 10. INTERIOR CABIN: SEATING & YELLOW STANCHION POLES
    # -------------------------------------------------------------
    # Overhead Safety Yellow Grab Rails running full length along aisle
    create_cylinder_between("OverheadRail_L", (4.4, -0.35, 2.50), (-4.8, -0.35, 2.50), 0.022, m_stanchion_yellow)
    create_cylinder_between("OverheadRail_R", (4.4, 0.35, 2.50), (-4.8, 0.35, 2.50), 0.022, m_stanchion_yellow)

    # Vertical Stanchion Grab Poles (Floor to ceiling - ZERO CLIPPING!)
    for px in [3.0, 1.4, -0.2, -1.8, -3.4]:
        create_cylinder_between(f"VerticalPole_L_{px}", (px, -0.35, floor_z), (px, -0.35, 2.70), 0.022, m_stanchion_yellow)
        create_cylinder_between(f"VerticalPole_R_{px}", (px, 0.35, floor_z), (px, 0.35, 2.70), 0.022, m_stanchion_yellow)

    # Commuter Transit Seats (6 Rows of 2x2 seats with blue patterned upholstery!)
    seat_xs = [3.0, 1.4, -0.2, -1.8, -3.4, -4.8]
    for row_i, sx in enumerate(seat_xs):
        for side, sign in [("L", -1), ("R", 1)]:
            sy = sign * 0.78
            # Seat pedestal stand
            create_cylinder_between(f"SeatStand_{row_i}_{side}", (sx, sy, floor_z), (sx, sy, floor_z + 0.35), 0.035, m_seat_frame)
            # Seat cushion
            create_box(f"SeatCushion_{row_i}_{side}", (sx, sy, floor_z + 0.42), (0.48, 0.72, 0.12), m_seat_blue, bevel=0.02)
            # Ergonomic seat back with blue upholstery
            create_box(f"SeatBack_{row_i}_{side}", (sx - 0.20, sy, floor_z + 0.78), (0.10, 0.72, 0.60), m_seat_blue, bevel=0.03)
            # Seat grab handle on top
            create_cylinder_between(f"SeatHandle_{row_i}_{side}", (sx - 0.20, sy - 0.25, floor_z + 1.10), (sx - 0.20, sy + 0.25, floor_z + 1.10), 0.015, m_seat_frame)

    # -------------------------------------------------------------
    # 11. FULL-BODIED DRIVER (PROPERLY SEATED IN CABIN!)
    # -------------------------------------------------------------
    dx, dy, dz = 4.40, -0.72, floor_z

    # Driver Seat & Console
    create_box("DriverSeatPedestal", (dx, dy, dz + 0.20), (0.45, 0.45, 0.40), m_seat_frame)
    create_box("DriverSeatCushion", (dx, dy, dz + 0.45), (0.50, 0.50, 0.14), m_seat_blue, bevel=0.02)
    create_box("DriverSeatBack", (dx - 0.22, dy, dz + 0.82), (0.12, 0.50, 0.62), m_seat_blue, bevel=0.03)

    # Dashboard & Large Angled Steering Wheel
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

    # Driver Body (Pelvis, Torso, Neck, 3D Face with Mustache)
    create_box("Driver_Pelvis", (dx, dy, dz + 0.55), (0.24, 0.28, 0.16), m_pants_dark, bevel=0.02)
    create_box("Driver_Torso", (dx + 0.02, dy, dz + 0.82), (0.26, 0.36, 0.38), m_shirt_blue, bevel=0.04)
    create_cylinder_between("Driver_Neck", (dx + 0.04, dy, dz + 1.02), (dx + 0.06, dy, dz + 1.12), 0.052, m_skin_d, verts=10)
    build_head_and_face("BusDriver", (dx + 0.08, dy, dz + 1.24), m_skin_d, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair)

    # Driver Arms Gripping Steering Wheel
    create_cylinder_between("Driver_Arm_L", (dx + 0.04, dy - 0.16, dz + 0.95), (dx + 0.24, dy - 0.18, dz + 0.86), 0.05, m_shirt_blue, verts=10)
    create_cylinder_between("Driver_Forearm_L", (dx + 0.24, dy - 0.18, dz + 0.86), (dx + 0.34, dy - 0.14, dz + 0.88), 0.042, m_skin_d, verts=10)
    create_sphere("Driver_Hand_L", (dx + 0.35, dy - 0.13, dz + 0.88), 0.044, (1.2, 0.9, 0.9), m_skin_d)
    
    create_cylinder_between("Driver_Arm_R", (dx + 0.04, dy + 0.16, dz + 0.95), (dx + 0.24, dy + 0.18, dz + 0.86), 0.05, m_shirt_blue, verts=10)
    create_cylinder_between("Driver_Forearm_R", (dx + 0.24, dy + 0.18, dz + 0.86), (dx + 0.34, dy + 0.14, dz + 0.88), 0.042, m_skin_d, verts=10)
    create_sphere("Driver_Hand_R", (dx + 0.35, dy + 0.13, dz + 0.88), 0.044, (1.2, 0.9, 0.9), m_skin_d)

    # Driver Legs (Comfortably reaching floor pedals - NO CLIPPING THROUGH FLOOR!)
    for side, sign in [("L", -1), ("R", 1)]:
        ly = dy + sign * 0.10
        create_cylinder_between(f"Driver_Thigh_{side}", (dx + 0.02, ly, dz + 0.55), (dx + 0.32, ly, dz + 0.50), 0.065, m_pants_dark, verts=12)
        create_cylinder_between(f"Driver_Shin_{side}", (dx + 0.32, ly, dz + 0.50), (dx + 0.32, ly, dz + 0.08), 0.055, m_pants_dark, verts=10)
        create_box(f"Driver_Foot_{side}", (dx + 0.38, ly, dz + 0.06), (0.16, 0.08, 0.05), m_dark_trim, bevel=0.01)

    # -------------------------------------------------------------
    # 12. 6 FULL-BODIED PASSENGERS (SEATED COMFORTABLY INSIDE CABIN!)
    # -------------------------------------------------------------
    pass_configs = [
        (3.0, -0.78, m_shirt_white, m_skin_p1, False),  # Row 1 Left: Man in White Panjabi
        (1.4, 0.78, m_saree_pink, m_skin_p2, True),     # Row 2 Right: Woman in Pink Saree
        (-0.2, -0.78, m_shirt_green, m_skin_p1, False), # Row 3 Left: Man in Green Polo
        (-1.8, 0.78, m_shirt_yellow, m_skin_p2, False), # Row 4 Right: Man in Mustard Shirt
        (-3.4, -0.78, m_shirt_blue, m_skin_p1, False),  # Row 5 Left: Man in Blue Shirt
        (-4.8, 0.78, m_saree_pink, m_skin_p2, True),    # Row 6 Right: Woman in Pink Saree
    ]

    for pi, (px, py, p_shirt, p_skin, p_fem) in enumerate(pass_configs):
        pz = floor_z + 0.42
        # Pelvis on seat cushion
        create_box(f"P_Pelvis_{pi}", (px, py, pz + 0.12), (0.24, 0.28, 0.14), m_pants_dark, bevel=0.02)
        create_box(f"P_Torso_{pi}", (px - 0.02, py, pz + 0.40), (0.24, 0.34, 0.38), p_shirt, bevel=0.04)
        create_cylinder_between(f"P_Neck_{pi}", (px, py, pz + 0.60), (px + 0.02, py, pz + 0.70), 0.048, p_skin, verts=10)
        build_head_and_face(f"P_{pi}", (px + 0.04, py, pz + 0.82), p_skin, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=(m_hair if not p_fem else None), is_female=p_fem)

        # Arms resting on lap
        create_cylinder_between(f"P_Arm_L_{pi}", (px - 0.02, py - 0.16, pz + 0.52), (px + 0.12, py - 0.14, pz + 0.30), 0.044, p_shirt, verts=10)
        create_cylinder_between(f"P_Forearm_L_{pi}", (px + 0.12, py - 0.14, pz + 0.30), (px + 0.22, py - 0.06, pz + 0.26), 0.036, p_skin, verts=10)
        create_sphere(f"P_Hand_L_{pi}", (px + 0.23, py - 0.05, pz + 0.26), 0.038, (1.2, 0.9, 0.9), p_skin)

        create_cylinder_between(f"P_Arm_R_{pi}", (px - 0.02, py + 0.16, pz + 0.52), (px + 0.12, py + 0.14, pz + 0.30), 0.044, p_shirt, verts=10)
        create_cylinder_between(f"P_Forearm_R_{pi}", (px + 0.12, py + 0.14, pz + 0.30), (px + 0.22, py + 0.06, pz + 0.26), 0.036, p_skin, verts=10)
        create_sphere(f"P_Hand_R_{pi}", (px + 0.23, py + 0.05, pz + 0.26), 0.038, (1.2, 0.9, 0.9), p_skin)

        # Lower Body (Legs resting on floor inside cabin - STRICTLY Z >= floor_z!)
        for side, sign in [("L", -1), ("R", 1)]:
            ply = py + sign * 0.09
            create_cylinder_between(f"P_Thigh_{pi}_{side}", (px + 0.02, ply, pz + 0.12), (px + 0.28, ply, pz + 0.10), 0.06, m_pants_dark, verts=12)
            create_cylinder_between(f"P_Shin_{pi}_{side}", (px + 0.28, ply, pz + 0.10), (px + 0.28, ply, floor_z + 0.08), 0.052, m_pants_dark, verts=10)
            create_box(f"P_Foot_{pi}_{side}", (px + 0.33, ply, floor_z + 0.06), (0.15, 0.075, 0.04), m_dark_trim, bevel=0.01)

    # -------------------------------------------------------------
    # 13. EXPORT TO GLTF/GLB
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
