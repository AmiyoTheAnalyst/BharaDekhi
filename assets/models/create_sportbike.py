import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "sportbike-rider.glb")

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
    # 6-vertex triangular prism / aerodynamic wedge
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

def create_alloy_wheel(name, center, radius, width, tire_mat, rim_mat, disc_mat, hub_mat):
    parts = []
    
    # Outer sport tire with grooved tread
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.055,
        minor_radius=0.055,
        major_segments=36,
        minor_segments=10,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    tire = assign_material(bpy.context.object, tire_mat)
    smooth_mesh(tire)
    parts.append(tire)
    
    # Cast alloy rim lip
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.08,
        minor_radius=0.018,
        major_segments=36,
        minor_segments=8,
        location=center,
        rotation=(math.pi / 2, 0, 0)
    )
    rim = assign_material(bpy.context.object, rim_mat)
    smooth_mesh(rim)
    parts.append(rim)

    # 5-split Y-spoke cast alloy wheel
    spoke_count = 5
    for i in range(spoke_count):
        angle = (i / spoke_count) * math.tau
        sx = center[0] + (radius - 0.09) * math.cos(angle)
        sz = center[2] + (radius - 0.09) * math.sin(angle)
        sp = create_cylinder_between(f"{name}_spoke_{i}", center, (sx, center[1], sz), 0.016, rim_mat, verts=6)
        parts.append(sp)

    # Center Hub
    hub = create_cylinder_between(f"{name}_hub", (center[0], center[1] - width * 0.5, center[2]), (center[0], center[1] + width * 0.5, center[2]), 0.045, hub_mat, verts=14)
    parts.append(hub)

    # Drilled Disc Brake
    for side in [-0.038, 0.038]:
        d = create_cylinder_between(f"{name}_disc_{side}", (center[0], center[1] + side - 0.005, center[2]), (center[0], center[1] + side + 0.005, center[2]), radius * 0.65, disc_mat, verts=20)
        parts.append(d)

    # Join all rotating parts into one single wheel mesh named 'name' with origin at 'center'
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = tire
    bpy.ops.object.join()
    wheel_obj = bpy.context.object
    wheel_obj.name = name
    bpy.context.scene.cursor.location = center
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return wheel_obj

def build():
    clear_scene()

    # Materials
    # Vibrant Electric Blue Sportbike Body Paint (User Reference Photo 1!)
    m_body_blue = create_material("Fairing_Blue", (0.05, 0.42, 0.98), metallic=0.35, roughness=0.18, clearcoat=1.0)
    m_rim_blue = create_material("Rim_BlueAlloy", (0.04, 0.38, 0.92), metallic=0.70, roughness=0.25)
    m_dark_metal = create_material("Engine_DarkGunmetal", (0.08, 0.09, 0.11), metallic=0.88, roughness=0.35)
    m_chrome = create_material("Exhaust_Chrome", (0.90, 0.92, 0.95), metallic=0.98, roughness=0.10)
    m_gold_fork = create_material("Suspension_InvertedGold", (0.88, 0.68, 0.16), metallic=0.90, roughness=0.20)
    m_tire = create_material("Tire_SportRubber", (0.03, 0.03, 0.035), metallic=0.0, roughness=0.85)
    m_disc = create_material("Brake_DiscSteel", (0.70, 0.72, 0.74), metallic=0.92, roughness=0.25)
    m_seat_leather = create_material("Seat_BlackLeather", (0.06, 0.06, 0.07), metallic=0.05, roughness=0.7)
    m_windshield = create_material("Windshield_SmokeGlass", (0.10, 0.20, 0.30), metallic=0.1, roughness=0.05, alpha=0.35)
    
    # Lighting Emitters
    m_headlight = create_material("Headlight_LED", (1.0, 1.0, 1.0), emission=(0.80, 0.95, 1.0), emission_strength=8.0)
    m_taillight = create_material("Taillight_LED", (0.95, 0.05, 0.05), emission=(1.0, 0.1, 0.1), emission_strength=5.0)

    # Rider Attire (Exact Match to User Reference: Orange hoodie, dark denim jeans, skate sneakers!)
    m_hoodie_orange = create_material("Rider_OrangeHoodie", (0.98, 0.38, 0.02), metallic=0.0, roughness=0.80)
    m_jeans_dark = create_material("Rider_DarkDenim", (0.08, 0.10, 0.15), metallic=0.0, roughness=0.85)
    m_sneaker_gray = create_material("Rider_SneakerUpper", (0.50, 0.52, 0.54), metallic=0.0, roughness=0.75)
    m_sneaker_white = create_material("Rider_SneakerSole", (0.94, 0.94, 0.92), metallic=0.0, roughness=0.45)
    m_skin = create_material("Rider_Skin", (0.52, 0.34, 0.22), metallic=0.0, roughness=0.75)
    m_sunglasses = create_material("Rider_Sunglasses", (0.02, 0.02, 0.02), metallic=0.9, roughness=0.05)
    
    # Helmet Materials (Sleek full-face racing helmet with dark panoramic visor & white stripes!)
    m_helmet_shell = create_material("Helmet_BlueGloss", (0.05, 0.42, 0.98), metallic=0.35, roughness=0.15, clearcoat=1.0)
    m_helmet_visor = create_material("Helmet_VisorSmoke", (0.02, 0.025, 0.04), metallic=0.85, roughness=0.05, clearcoat=1.0)
    m_helmet_trim = create_material("Helmet_RubberGasket", (0.05, 0.05, 0.06), metallic=0.1, roughness=0.6)
    m_helmet_stripe = create_material("Helmet_WhiteDecal", (0.96, 0.96, 0.96), metallic=0.1, roughness=0.2)

    # -------------------------------------------------------------
    # 1. WHEELS (Single joined meshes named wheel_front & wheel_rear)
    # -------------------------------------------------------------
    wheel_radius = 0.32
    wheel_width = 0.12
    # Front wheel at X = 0.88, Z = 0.32
    w_front = create_alloy_wheel("wheel_front", (0.88, 0.0, wheel_radius), wheel_radius, wheel_width, m_tire, m_rim_blue, m_disc, m_dark_metal)
    # Rear wheel at X = -0.78, Z = 0.32
    w_rear = create_alloy_wheel("wheel_rear", (-0.78, 0.0, wheel_radius), wheel_radius, wheel_width * 1.25, m_tire, m_rim_blue, m_disc, m_dark_metal)

    # -------------------------------------------------------------
    # 2. CHASSIS, FORKS, ENGINE & EXHAUST
    # -------------------------------------------------------------
    # Front Mudguard / Hugger
    create_cylinder_between("FrontFender", (0.76, 0, 0.44), (0.96, 0, 0.44), 0.16, m_body_blue, verts=10)

    # Inverted Gold USD Front Forks
    create_cylinder_between("Fork_L", (0.88, -0.09, wheel_radius), (0.58, -0.09, 0.88), 0.024, m_gold_fork)
    create_cylinder_between("Fork_R", (0.88, 0.09, wheel_radius), (0.58, 0.09, 0.88), 0.024, m_gold_fork)
    create_cylinder_between("ForkLower_L", (0.88, -0.09, wheel_radius), (0.76, -0.09, 0.54), 0.028, m_dark_metal)
    create_cylinder_between("ForkLower_R", (0.88, 0.09, wheel_radius), (0.76, 0.09, 0.54), 0.028, m_dark_metal)
    
    # Front Brake Calipers
    create_box("FrontCaliper_L", (0.76, -0.11, 0.42), (0.07, 0.035, 0.08), m_gold_fork, bevel=0.005)
    create_box("FrontCaliper_R", (0.76, 0.11, 0.42), (0.07, 0.035, 0.08), m_gold_fork, bevel=0.005)

    # Triple Tree Clamp & Clip-on Handlebars
    create_box("TripleTreeUpper", (0.57, 0, 0.90), (0.08, 0.24, 0.035), m_dark_metal, bevel=0.005)
    create_box("TripleTreeLower", (0.64, 0, 0.78), (0.08, 0.24, 0.04), m_dark_metal, bevel=0.005)
    create_cylinder_between("ClipOn_L", (0.57, -0.08, 0.90), (0.52, -0.26, 0.86), 0.015, m_dark_metal)
    create_cylinder_between("ClipOn_R", (0.57, 0.08, 0.90), (0.52, 0.26, 0.86), 0.015, m_dark_metal)
    create_cylinder_between("BarGrip_L", (0.53, -0.20, 0.87), (0.51, -0.28, 0.85), 0.022, m_tire)
    create_cylinder_between("BarGrip_R", (0.53, 0.20, 0.87), (0.51, 0.28, 0.85), 0.022, m_tire)
    create_box("DigitalDash", (0.60, 0, 0.93), (0.07, 0.14, 0.04), m_dark_metal, bevel=0.005)

    # Aluminum Twin-Spar Perimeter Frame
    create_cylinder_between("FrameSpar_L", (0.58, -0.12, 0.82), (0.02, -0.16, 0.62), 0.045, m_dark_metal)
    create_cylinder_between("FrameSpar_R", (0.58, 0.12, 0.82), (0.02, 0.16, 0.62), 0.045, m_dark_metal)
    create_cylinder_between("FrameDown_L", (0.02, -0.16, 0.62), (-0.05, -0.14, 0.36), 0.042, m_dark_metal)
    create_cylinder_between("FrameDown_R", (0.02, 0.16, 0.62), (-0.05, 0.14, 0.36), 0.042, m_dark_metal)

    # Exposed Engine Block & Crankcase
    create_box("EngineBlock", (0.12, 0, 0.42), (0.36, 0.28, 0.24), m_dark_metal, bevel=0.02)
    create_sphere("ClutchCover", (0.08, 0.15, 0.38), 0.075, (0.5, 1.0, 1.0), m_dark_metal)
    create_sphere("AlternatorCover", (0.08, -0.15, 0.38), 0.07, (0.5, 1.0, 1.0), m_dark_metal)

    # Rear Aluminum Swingarm & Monoshock
    create_cylinder_between("Swingarm_L", (-0.08, -0.12, 0.36), (-0.78, -0.08, wheel_radius), 0.038, m_dark_metal)
    create_cylinder_between("Swingarm_R", (-0.08, 0.12, 0.36), (-0.78, 0.08, wheel_radius), 0.038, m_dark_metal)
    create_cylinder_between("Monoshock", (-0.02, 0, 0.58), (-0.28, 0, 0.38), 0.032, m_gold_fork)

    # Upswept Chrome Canister Exhaust Pipe (Exact match to Photo 1!)
    create_cylinder_between("ExhaustHeader", (0.28, 0.08, 0.32), (0.05, 0.14, 0.22), 0.025, m_chrome)
    create_cylinder_between("ExhaustMidPipe", (0.05, 0.14, 0.22), (-0.26, 0.18, 0.30), 0.03, m_chrome)
    create_cylinder_between("ExhaustMuffler", (-0.26, 0.18, 0.30), (-0.72, 0.22, 0.48), 0.055, m_chrome, radius2=0.045)
    create_cylinder_between("ExhaustTip", (-0.72, 0.22, 0.48), (-0.78, 0.23, 0.51), 0.038, m_dark_metal)

    # Footpegs
    create_cylinder_between("Footpeg_L", (-0.14, -0.14, 0.42), (-0.14, -0.26, 0.42), 0.016, m_dark_metal)
    create_cylinder_between("Footpeg_R", (-0.14, 0.14, 0.42), (-0.14, 0.26, 0.42), 0.016, m_dark_metal)

    # -------------------------------------------------------------
    # 3. AERODYNAMIC FAIRINGS & SCULPTED BODYWORK
    # -------------------------------------------------------------
    # Aerodynamic Front Cowl (Angled Nose wedge)
    create_wedge_mesh(
        "FrontNoseWedge",
        Vector((0.92, 0.0, 0.74)),       # Front sharp nose tip
        Vector((0.65, -0.19, 0.88)),      # Upper left cowl
        Vector((0.65, 0.19, 0.88)),       # Upper right cowl
        Vector((0.85, 0.0, 0.60)),       # Lower front beak
        Vector((0.65, -0.17, 0.64)),      # Lower left cowl
        Vector((0.65, 0.17, 0.64)),       # Lower right cowl
        m_body_blue
    )
    # Slit-eyed aggressive LED headlights
    create_box("Headlight_L", (0.80, -0.09, 0.76), (0.06, 0.08, 0.028), m_headlight, bevel=0.005)
    create_box("Headlight_R", (0.80, 0.09, 0.76), (0.06, 0.08, 0.028), m_headlight, bevel=0.005)
    
    # Curved Transparent Smoked Windshield
    create_cylinder_between("WindshieldRake", (0.58, 0, 0.86), (0.76, 0, 0.98), 0.15, m_windshield, verts=14)

    # Side Fairings with Air Extractors
    create_wedge_mesh(
        "SideFairing_L",
        Vector((0.65, -0.19, 0.88)),
        Vector((0.15, -0.22, 0.76)),
        Vector((0.15, -0.20, 0.46)),
        Vector((0.65, -0.17, 0.64)),
        Vector((0.15, -0.22, 0.76)),
        Vector((0.15, -0.20, 0.46)),
        m_body_blue
    )
    create_wedge_mesh(
        "SideFairing_R",
        Vector((0.65, 0.19, 0.88)),
        Vector((0.15, 0.22, 0.76)),
        Vector((0.15, 0.20, 0.46)),
        Vector((0.65, 0.17, 0.64)),
        Vector((0.15, 0.22, 0.76)),
        Vector((0.15, 0.20, 0.46)),
        m_body_blue
    )

    # Sculpted Fuel Tank with Knee Recesses
    create_box("FuelTank", (0.22, 0, 0.78), (0.44, 0.32, 0.24), m_body_blue, bevel=0.05)
    create_cylinder_between("FuelFillerCap", (0.30, 0, 0.91), (0.30, 0, 0.93), 0.038, m_chrome)
    create_box("TankPad_L", (0.20, -0.165, 0.76), (0.22, 0.015, 0.12), m_dark_metal)
    create_box("TankPad_R", (0.20, 0.165, 0.76), (0.22, 0.015, 0.12), m_dark_metal)

    # Rider & Pillion Seat
    create_box("RiderSeat", (-0.08, 0, 0.70), (0.30, 0.24, 0.07), m_seat_leather, bevel=0.03)
    create_box("PillionSeatCowl", (-0.34, 0, 0.78), (0.32, 0.20, 0.11), m_body_blue, bevel=0.04)

    # Sharp Upswept Tail Cowl & License Plate Hanger
    create_wedge_mesh(
        "TailCowlWedge",
        Vector((-0.34, -0.10, 0.78)),
        Vector((-0.34, 0.10, 0.78)),
        Vector((-0.34, 0.0, 0.86)),
        Vector((-0.68, -0.06, 0.78)),
        Vector((-0.68, 0.06, 0.78)),
        Vector((-0.68, 0.0, 0.84)),
        m_body_blue
    )
    create_box("TailLEDLight", (-0.68, 0, 0.80), (0.03, 0.12, 0.035), m_taillight, bevel=0.005)
    create_box("LicensePlateHanger", (-0.72, 0, 0.65), (0.10, 0.14, 0.07), m_dark_metal)

    # -------------------------------------------------------------
    # 4. FULL-BODIED RIDER IN SPORTS TUCK (PHOTO 1 AUTHENTICITY!)
    # -------------------------------------------------------------
    # Pelvis in seat
    create_box("Rider_Pelvis", (-0.07, 0, 0.74), (0.22, 0.24, 0.14), m_jeans_dark, bevel=0.03)

    # Torso leaning forward in aerodynamic sport tuck (~35 deg forward incline)
    create_box("Rider_Torso", (0.14, 0, 0.90), (0.34, 0.28, 0.24), m_hoodie_orange, bevel=0.04)
    create_sphere("Rider_HoodDrape", (0.04, 0, 1.00), 0.095, (1.2, 1.1, 0.8), m_hoodie_orange)
    create_box("Rider_HoodiePocket", (0.21, 0, 0.84), (0.10, 0.20, 0.08), m_hoodie_orange, bevel=0.02)
    
    # Neck
    create_cylinder_between("Rider_Neck", (0.26, 0, 1.00), (0.36, 0, 1.12), 0.052, m_skin, verts=10)

    # Arms extending forward in low tuck to grip handlebars
    create_cylinder_between("Rider_UpperArm_L", (0.22, -0.15, 0.96), (0.36, -0.21, 0.88), 0.048, m_hoodie_orange, verts=10)
    create_cylinder_between("Rider_Forearm_L", (0.36, -0.21, 0.88), (0.50, -0.21, 0.84), 0.040, m_hoodie_orange, verts=10)
    create_sphere("Rider_Glove_L", (0.51, -0.21, 0.84), 0.038, (1.2, 0.9, 0.9), m_dark_metal)

    create_cylinder_between("Rider_UpperArm_R", (0.22, 0.15, 0.96), (0.36, 0.21, 0.88), 0.048, m_hoodie_orange, verts=10)
    create_cylinder_between("Rider_Forearm_R", (0.36, 0.21, 0.88), (0.50, 0.21, 0.84), 0.040, m_hoodie_orange, verts=10)
    create_sphere("Rider_Glove_R", (0.51, 0.21, 0.84), 0.038, (1.2, 0.9, 0.9), m_dark_metal)

    # Legs hugging fuel tank, knees bent back to rearset footpegs!
    hip_l = (-0.05, -0.10, 0.73)
    knee_l = (0.16, -0.17, 0.62)
    ankle_l = (-0.10, -0.19, 0.44)
    create_cylinder_between("Rider_Thigh_L", hip_l, knee_l, 0.065, m_jeans_dark, verts=12)
    create_cylinder_between("Rider_Shin_L", knee_l, ankle_l, 0.052, m_jeans_dark, verts=10)
    create_box("Rider_Sneaker_L", (-0.10, -0.19, 0.44), (0.17, 0.08, 0.065), m_sneaker_gray, bevel=0.015)
    create_box("Rider_Sole_L", (-0.10, -0.19, 0.405), (0.18, 0.085, 0.02), m_sneaker_white)

    hip_r = (-0.05, 0.10, 0.73)
    knee_r = (0.16, 0.17, 0.62)
    ankle_r = (-0.10, 0.19, 0.44)
    create_cylinder_between("Rider_Thigh_R", hip_r, knee_r, 0.065, m_jeans_dark, verts=12)
    create_cylinder_between("Rider_Shin_R", knee_r, ankle_r, 0.052, m_jeans_dark, verts=10)
    create_box("Rider_Sneaker_R", (-0.10, 0.19, 0.44), (0.17, 0.08, 0.065), m_sneaker_gray, bevel=0.015)
    create_box("Rider_Sole_R", (-0.10, 0.19, 0.405), (0.18, 0.085, 0.02), m_sneaker_white)

    # -------------------------------------------------------------
    # 5. AERODYNAMIC FULL-FACE HELMET WITH PANORAMIC VISOR & SUNGLASSES
    # -------------------------------------------------------------
    hx, hy, hz = 0.38, 0.0, 1.20

    # Face inside helmet with stylish dark sunglasses
    create_sphere("Rider_FaceCranium", (hx + 0.01, hy, hz - 0.01), 0.10, (1.0, 0.85, 1.05), m_skin, segs=12, rings=8)
    create_box("Rider_GlassesFrame", (hx + 0.095, hy, hz + 0.018), (0.018, 0.10, 0.02), m_sunglasses, bevel=0.003)
    create_box("Rider_Lens_L", (hx + 0.105, hy - 0.032, hz + 0.018), (0.012, 0.034, 0.018), m_sunglasses, bevel=0.002)
    create_box("Rider_Lens_R", (hx + 0.105, hy + 0.032, hz + 0.018), (0.012, 0.034, 0.018), m_sunglasses, bevel=0.002)

    # 100% Full-Coverage Aerodynamic Blue Helmet Shell
    create_sphere("HelmetShell", (hx, hy, hz + 0.01), 0.138, (1.12, 0.95, 1.05), m_helmet_shell, segs=28, rings=20)
    
    # Back Neck Collar Guard (100% full coverage at the back so ZERO skin/hair is exposed from behind!)
    create_cylinder_between("HelmetBackCollar", (hx - 0.09, hy, hz + 0.02), (hx - 0.07, hy, hz - 0.09), 0.120, m_helmet_shell, verts=18, radius2=0.130)

    # Aerodynamic Chin Bar (covers jaw, mouth, and chin in front)
    create_box("HelmetChinBar", (hx + 0.09, hy, hz - 0.055), (0.12, 0.16, 0.075), m_helmet_shell, bevel=0.02)
    create_box("HelmetChinVent", (hx + 0.155, hy, hz - 0.055), (0.018, 0.07, 0.03), m_dark_metal, bevel=0.005)

    # Aerodynamic Brow Ridge above eye port
    create_box("HelmetBrowRidge", (hx + 0.09, hy, hz + 0.075), (0.09, 0.15, 0.035), m_helmet_shell, bevel=0.015)

    # Aerodynamic Rear Ducktail Diffuser
    create_box("HelmetRearSpoiler", (hx - 0.12, hy, hz + 0.035), (0.06, 0.14, 0.03), m_helmet_shell, bevel=0.01)

    # White Racing Stripes on Crown (Matches User Reference Photo 1!)
    create_cylinder_between("HelmetStripe_L", (hx - 0.14, hy - 0.045, hz + 0.08), (hx + 0.10, hy - 0.045, hz + 0.105), 0.011, m_helmet_stripe)
    create_cylinder_between("HelmetStripe_R", (hx - 0.14, hy + 0.045, hz + 0.08), (hx + 0.10, hy + 0.045, hz + 0.105), 0.011, m_helmet_stripe)
    create_cylinder_between("HelmetStripe_Top", (hx - 0.13, hy, hz + 0.142), (hx + 0.07, hy, hz + 0.145), 0.015, m_helmet_stripe)

    # PROMINENT SLEEK TINTED VISOR (Curved panoramic dark visor projecting forward from eye aperture)
    create_sphere("HelmetVisor", (hx + 0.075, hy, hz + 0.02), 0.125, (0.85, 1.05, 0.65), m_helmet_visor, segs=24, rings=16)
    create_sphere("VisorPivot_L", (hx + 0.015, hy - 0.132, hz + 0.02), 0.022, (0.5, 1.0, 1.0), m_dark_metal)
    create_sphere("VisorPivot_R", (hx + 0.015, hy + 0.132, hz + 0.02), 0.022, (0.5, 1.0, 1.0), m_dark_metal)

    # -------------------------------------------------------------
    # 6. EXPORT TO GLTF/GLB
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
    print("SUCCESSFULLY EXPORTED SPORTBIKE RIDER TO:", OUTPUT)

if __name__ == "__main__":
    build()
