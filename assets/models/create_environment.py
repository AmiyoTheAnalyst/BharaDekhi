import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "mirpur10-environment.glb")

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.actions, bpy.data.armatures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

def create_material(name, color, metallic=0.0, roughness=0.6, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color[:3], 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
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

def create_sphere(name, loc, radius, scale, mat, segs=14, rings=10, parent=None):
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

def create_cylinder_between(name, p1, p2, radius, mat, verts=10, parent=None, radius2=None):
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
    # Dhaka Concrete & Plaster Facades (Weathered warm tones)
    m_concrete_ochre = create_material("Bldg_WarmOchre", (0.82, 0.68, 0.52), metallic=0.05, roughness=0.88)
    m_concrete_terracotta = create_material("Bldg_Terracotta", (0.72, 0.38, 0.28), metallic=0.05, roughness=0.85)
    m_concrete_teal = create_material("Bldg_MutedTeal", (0.28, 0.55, 0.58), metallic=0.05, roughness=0.82)
    m_concrete_slate = create_material("Bldg_SlateGrey", (0.45, 0.48, 0.52), metallic=0.1, roughness=0.85)

    # Architectural Details
    m_glass = create_material("Bldg_WindowGlass", (0.12, 0.22, 0.30), metallic=0.5, roughness=0.1)
    m_window_warm = create_material("Bldg_WindowWarmLit", (1.0, 0.92, 0.75), emission=(1.0, 0.88, 0.65), emission_strength=1.8)
    m_shutter = create_material("Bldg_CorrugatedShutter", (0.65, 0.68, 0.70), metallic=0.75, roughness=0.45)
    m_awning_green = create_material("Bldg_AwningGreen", (0.05, 0.62, 0.38), metallic=0.0, roughness=0.7)
    m_awning_orange = create_material("Bldg_AwningOrange", (0.92, 0.48, 0.08), metallic=0.0, roughness=0.7)
    m_railing = create_material("Bldg_IronRailing", (0.12, 0.14, 0.16), metallic=0.85, roughness=0.35)
    m_ac_unit = create_material("Bldg_ACCompressor", (0.88, 0.88, 0.86), metallic=0.3, roughness=0.6)
    m_water_tank_blue = create_material("Bldg_WaterTankBlue", (0.05, 0.32, 0.75), metallic=0.1, roughness=0.5)
    m_water_tank_black = create_material("Bldg_WaterTankBlack", (0.08, 0.08, 0.09), metallic=0.1, roughness=0.6)
    m_telecom_tower = create_material("Bldg_TelecomTower", (0.82, 0.85, 0.88), metallic=0.9, roughness=0.25)
    m_beacon_red = create_material("Bldg_TowerBeaconRed", (1.0, 0.05, 0.05), emission=(1.0, 0.05, 0.05), emission_strength=5.0)

    # Bengali Commercial Signboards
    m_sign_pharm = create_material("Sign_JanataPharmacy", (0.04, 0.75, 0.45), emission=(0.04, 0.85, 0.48), emission_strength=2.8)
    m_sign_books = create_material("Sign_MirpurBooks", (0.95, 0.75, 0.10), emission=(0.95, 0.75, 0.10), emission_strength=2.8)
    m_sign_sweets = create_material("Sign_DhakaSweets", (0.88, 0.15, 0.15), emission=(0.88, 0.18, 0.18), emission_strength=3.0)
    m_sign_biryani = create_material("Sign_BoishakhiBiryani", (0.98, 0.52, 0.08), emission=(0.98, 0.52, 0.08), emission_strength=3.0)

    # -------------------------------------------------------------
    # BUILDING 1: MIRPUR COMMERCIAL COMPLEX (NORTHWEST CORNER)
    # -------------------------------------------------------------
    b1_x, b1_y = -35.0, -35.0
    b1_w, b1_d, b1_h = 24.0, 18.0, 32.0
    create_box("Bldg1_MainMass", (b1_x, b1_y, b1_h * 0.5), (b1_w, b1_d, b1_h), m_concrete_ochre, bevel=0.1)

    # Ground floor shopfronts with rollup shutters & Janata Pharmacy Signboard
    create_box("Bldg1_ShopBase", (b1_x, b1_y + b1_d * 0.5 + 0.1, 2.5), (b1_w - 1.0, 0.4, 5.0), m_concrete_slate)
    create_box("Bldg1_Shutter1", (b1_x - 6.0, b1_y + b1_d * 0.5 + 0.2, 2.2), (4.5, 0.1, 4.2), m_shutter)
    create_box("Bldg1_Shutter2", (b1_x + 6.0, b1_y + b1_d * 0.5 + 0.2, 2.2), (4.5, 0.1, 4.2), m_shutter)
    create_box("Bldg1_Awning", (b1_x, b1_y + b1_d * 0.5 + 0.8, 4.8), (b1_w - 2.0, 1.4, 0.15), m_awning_green, bevel=0.04)

    # "জনতা ফার্মেসী" / Janata Pharmacy Backlit Signboard
    create_box("Sign_JanataPharm", (b1_x, b1_y + b1_d * 0.5 + 0.35, 5.8), (12.0, 0.15, 1.4), m_sign_pharm, bevel=0.02)

    # Upper Floor Balconies, AC Compressors & Glazed Windows
    for floor in range(1, 6):
        fz = floor * 5.0 + 3.0
        # Balcony cantilever slab
        create_box(f"Bldg1_BalconySlab_{floor}", (b1_x - 4.5, b1_y + b1_d * 0.5 + 0.6, fz), (6.5, 1.2, 0.25), m_concrete_slate)
        # Balcony wrought iron railing
        create_box(f"Bldg1_Railing_{floor}", (b1_x - 4.5, b1_y + b1_d * 0.5 + 1.15, fz + 0.55), (6.3, 0.08, 0.9), m_railing)
        # AC Outdoor Compressor Unit mounted on wall
        create_box(f"Bldg1_AC_{floor}", (b1_x + 6.5, b1_y + b1_d * 0.5 + 0.45, fz + 0.65), (0.95, 0.55, 0.65), m_ac_unit, bevel=0.02)
        # Glazed Window panels
        create_box(f"Bldg1_Window_{floor}", (b1_x + 1.5, b1_y + b1_d * 0.5 + 0.08, fz + 1.2), (3.2, 0.05, 1.8), m_window_warm if (floor % 2 == 1) else m_glass)

    # Rooftop details: Stairwell Headhouse, Blue Sintex Water Tanks, Telecom Tower
    create_box("Bldg1_Stairwell", (b1_x - 5.0, b1_y - 2.0, b1_h + 1.6), (6.0, 5.0, 3.2), m_concrete_ochre, bevel=0.08)
    # Blue cylindrical water storage tank
    create_cylinder_between("Bldg1_WaterTank1", (b1_x + 4.5, b1_y - 3.0, b1_h + 0.1), (b1_x + 4.5, b1_y - 3.0, b1_h + 2.4), 1.1, m_water_tank_blue, verts=16)
    create_cylinder_between("Bldg1_WaterTank2", (b1_x + 7.2, b1_y - 3.0, b1_h + 0.1), (b1_x + 7.2, b1_y - 3.0, b1_h + 2.4), 1.1, m_water_tank_black, verts=16)
    # Telecom Tower Mast with Red Flashing Warning Beacon
    tower_x, tower_y, tower_base_z = b1_x + 5.0, b1_y + 4.0, b1_h
    create_cylinder_between("Bldg1_TowerMast", (tower_x, tower_y, tower_base_z), (tower_x, tower_y, tower_base_z + 12.0), 0.15, m_telecom_tower, verts=6)
    create_box("Bldg1_TowerAntenna1", (tower_x, tower_y, tower_base_z + 9.5), (0.3, 0.8, 1.8), m_telecom_tower)
    create_box("Bldg1_TowerAntenna2", (tower_x, tower_y, tower_base_z + 11.0), (0.8, 0.3, 1.8), m_telecom_tower)
    create_sphere("Bldg1_RedBeacon", (tower_x, tower_y, tower_base_z + 12.2), 0.22, (1, 1, 1), m_beacon_red)

    # -------------------------------------------------------------
    # BUILDING 2: BOISHAKHI RESTAURANT & RESIDENTIAL (NORTHEAST CORNER)
    # -------------------------------------------------------------
    b2_x, b2_y = 35.0, -35.0
    b2_w, b2_d, b2_h = 22.0, 20.0, 28.0
    create_box("Bldg2_MainMass", (b2_x, b2_y, b2_h * 0.5), (b2_w, b2_d, b2_h), m_concrete_terracotta, bevel=0.1)

    # Boishakhi Restaurant Signboard & Striped Fabric Awning
    create_box("Sign_Boishakhi", (b2_x, b2_y + b2_d * 0.5 + 0.35, 5.6), (14.0, 0.15, 1.5), m_sign_biryani, bevel=0.02)
    create_box("Bldg2_Awning", (b2_x, b2_y + b2_d * 0.5 + 0.8, 4.6), (b2_w - 2.0, 1.5, 0.15), m_awning_orange, bevel=0.04)

    # Upper floor windows & balconies
    for floor in range(1, 5):
        fz = floor * 5.0 + 3.0
        create_box(f"Bldg2_Balcony_{floor}", (b2_x + 4.5, b2_y + b2_d * 0.5 + 0.6, fz), (6.0, 1.2, 0.25), m_concrete_slate)
        create_box(f"Bldg2_Railing_{floor}", (b2_x + 4.5, b2_y + b2_d * 0.5 + 1.15, fz + 0.55), (5.8, 0.08, 0.9), m_railing)
        create_box(f"Bldg2_AC_{floor}", (b2_x - 5.5, b2_y + b2_d * 0.5 + 0.45, fz + 0.65), (0.95, 0.55, 0.65), m_ac_unit, bevel=0.02)
        create_box(f"Bldg2_Window_{floor}", (b2_x - 1.5, b2_y + b2_d * 0.5 + 0.08, fz + 1.2), (3.6, 0.05, 1.8), m_window_warm if (floor % 2 == 0) else m_glass)

    # Rooftop water tanks
    create_cylinder_between("Bldg2_WaterTank1", (b2_x - 4.0, b2_y - 4.0, b2_h + 0.1), (b2_x - 4.0, b2_y - 4.0, b2_h + 2.2), 1.0, m_water_tank_blue, verts=16)

    # -------------------------------------------------------------
    # BUILDING 3: MIRPUR BOOK DEPOT & STATIONERY (SOUTHEAST CORNER)
    # -------------------------------------------------------------
    b3_x, b3_y = 35.0, 35.0
    b3_w, b3_d, b3_h = 24.0, 18.0, 30.0
    create_box("Bldg3_MainMass", (b3_x, b3_y, b3_h * 0.5), (b3_w, b3_d, b3_h), m_concrete_teal, bevel=0.1)
    create_box("Sign_MirpurBooks", (b3_x, b3_y - b3_d * 0.5 - 0.35, 5.6), (13.0, 0.15, 1.4), m_sign_books, bevel=0.02)
    create_box("Bldg3_Awning", (b3_x, b3_y - b3_d * 0.5 - 0.8, 4.6), (b3_w - 2.0, 1.4, 0.15), m_awning_green, bevel=0.04)

    # -------------------------------------------------------------
    # BUILDING 4: DHAKA SWEETS & MISHTI MELA (SOUTHWEST CORNER)
    # -------------------------------------------------------------
    b4_x, b4_y = -35.0, 35.0
    b4_w, b4_d, b4_h = 22.0, 20.0, 26.0
    create_box("Bldg4_MainMass", (b4_x, b4_y, b4_h * 0.5), (b4_w, b4_d, b4_h), m_concrete_slate, bevel=0.1)
    create_box("Sign_DhakaSweets", (b4_x, b4_y - b4_d * 0.5 - 0.35, 5.6), (12.0, 0.15, 1.4), m_sign_sweets, bevel=0.02)

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
    print("SUCCESSFULLY EXPORTED MIRPUR 10 ENVIRONMENT TO:", OUTPUT)

if __name__ == "__main__":
    build()
