import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "pedestrians.glb")

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.actions, bpy.data.armatures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

def create_material(name, color, metallic=0.0, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color[:3], 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
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

def build_head_and_face(name_prefix, center, skin_mat, hair_mat, eye_white_mat, iris_mat, lip_mat, mustache_mat=None, parent=None, is_female=False):
    x, y, z = center
    head_group = bpy.data.objects.new(f"{name_prefix}_HeadGroup", None)
    bpy.context.collection.objects.link(head_group)
    head_group.location = (x, y, z)
    if parent:
        head_group.parent = parent
        
    create_sphere(f"{name_prefix}_Cranium", (0, 0, 0), 0.12, (1.05, 0.92, 1.18), skin_mat, segs=14, rings=10, parent=head_group)
    create_sphere(f"{name_prefix}_Jaw", (0.04, 0, -0.045), 0.075, (1.0, 0.78, 0.85), skin_mat, segs=10, rings=8, parent=head_group)
    
    if is_female:
        create_sphere(f"{name_prefix}_Hair", (-0.02, 0, 0.04), 0.125, (1.05, 0.98, 1.15), hair_mat, segs=12, rings=8, parent=head_group)
        create_sphere(f"{name_prefix}_HairBun", (-0.13, 0, 0.02), 0.06, (0.85, 0.95, 0.95), hair_mat, segs=10, rings=8, parent=head_group)
    else:
        create_sphere(f"{name_prefix}_Hair", (-0.015, 0, 0.04), 0.122, (1.04, 0.96, 1.12), hair_mat, segs=12, rings=8, parent=head_group)
    
    create_sphere(f"{name_prefix}_Ear_L", (0.0, -0.11, -0.01), 0.03, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6, parent=head_group)
    create_sphere(f"{name_prefix}_Ear_R", (0.0, 0.11, -0.01), 0.03, (0.6, 0.35, 1.1), skin_mat, segs=8, rings=6, parent=head_group)
    
    for side, sign in [("L", -1), ("R", 1)]:
        eye_y = sign * 0.04
        create_sphere(f"{name_prefix}_EyeWhite_{side}", (0.105, eye_y, 0.015), 0.02, (0.6, 1.0, 0.8), eye_white_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Pupil_{side}", (0.115, eye_y, 0.015), 0.01, (0.5, 0.9, 0.9), iris_mat, segs=6, rings=4, parent=head_group)
        create_box(f"{name_prefix}_Eyebrow_{side}", (0.108, eye_y, 0.036), (0.015, 0.038, 0.01), hair_mat, bevel=0.002, parent=head_group)
    
    create_cylinder_between(f"{name_prefix}_NoseBridge", (0.095, 0, 0.03), (0.13, 0, -0.012), 0.012, skin_mat, verts=8, parent=head_group)
    create_sphere(f"{name_prefix}_NoseTip", (0.132, 0, -0.015), 0.016, (1.0, 1.0, 0.9), skin_mat, segs=8, rings=6, parent=head_group)
    create_box(f"{name_prefix}_LipUpper", (0.115, 0, -0.042), (0.015, 0.042, 0.009), lip_mat, bevel=0.002, parent=head_group)
    create_box(f"{name_prefix}_LipLower", (0.112, 0, -0.054), (0.015, 0.038, 0.01), lip_mat, bevel=0.002, parent=head_group)
    
    if mustache_mat and not is_female:
        create_sphere(f"{name_prefix}_Mustache_L", (0.122, -0.02, -0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
        create_sphere(f"{name_prefix}_Mustache_R", (0.122, 0.02, -0.038), 0.015, (0.8, 1.8, 0.5), mustache_mat, segs=8, rings=6, parent=head_group)
    return head_group

def build():
    clear_scene()

    # Materials
    m_skin_m = create_material("PedMale_Skin", (0.48, 0.30, 0.18), metallic=0.0, roughness=0.75)
    m_panjabi = create_material("PedMale_Panjabi", (0.92, 0.90, 0.85), metallic=0.0, roughness=0.8)
    m_pajama = create_material("PedMale_Pajama", (0.85, 0.85, 0.82), metallic=0.0, roughness=0.85)

    m_skin_f = create_material("PedFem_Skin", (0.54, 0.34, 0.22), metallic=0.0, roughness=0.72)
    m_saree = create_material("PedFem_Saree", (0.88, 0.15, 0.42), metallic=0.0, roughness=0.75)
    m_saree_gold = create_material("PedFem_GoldBorder", (0.95, 0.78, 0.12), metallic=0.3, roughness=0.5)

    m_hair = create_material("Human_Hair", (0.03, 0.025, 0.02), metallic=0.0, roughness=0.9)
    m_eye_white = create_material("Eye_Sclera", (0.95, 0.95, 0.95), metallic=0.0, roughness=0.2)
    m_iris = create_material("Eye_Iris", (0.12, 0.08, 0.05), metallic=0.0, roughness=0.2)
    m_lip = create_material("Human_Lips", (0.52, 0.22, 0.18), metallic=0.0, roughness=0.5)
    m_sandal = create_material("Sandal_Leather", (0.18, 0.12, 0.08), metallic=0.0, roughness=0.8)

    # -------------------------------------------------------------
    # 1. MALE PEDESTRIAN IN DHAKA PANJABI (FULL BODY & ARTICULATED LIMBS)
    # -------------------------------------------------------------
    ped_m_root = bpy.data.objects.new("Pedestrian_Male", None)
    bpy.context.collection.objects.link(ped_m_root)
    ped_m_root.location = (0.0, -0.6, 0.0)

    # Pelvis
    create_box("PedM_Pelvis", (0, 0, 0.96), (0.22, 0.30, 0.16), m_pajama, bevel=0.02, parent=ped_m_root)
    # Torso (Panjabi)
    create_box("PedM_Torso", (0, 0, 1.25), (0.24, 0.36, 0.44), m_panjabi, bevel=0.04, parent=ped_m_root)
    # Panjabi skirt/skirt hem extending down to knees
    create_box("PedM_Skirt", (0, 0, 0.85), (0.26, 0.34, 0.25), m_panjabi, bevel=0.02, parent=ped_m_root)
    # Neck
    create_cylinder_between("PedM_Neck", (0, 0, 1.48), (0, 0, 1.58), 0.05, m_skin_m, verts=10, parent=ped_m_root)
    # 3D Face with mustache
    build_head_and_face("PedM", (0, 0, 1.70), m_skin_m, m_hair, m_eye_white, m_iris, m_lip, mustache_mat=m_hair, parent=ped_m_root, is_female=False)

    # Arms (Articulated swinging nodes)
    for side, sign in [("L", -1), ("R", 1)]:
        ay = sign * 0.22
        swing = 0.08 if sign == -1 else -0.08
        create_cylinder_between(f"PedM_UpperArm_{side}", (0, ay, 1.44), (swing, ay, 1.15), 0.05, m_panjabi, verts=10, parent=ped_m_root)
        create_cylinder_between(f"PedM_Forearm_{side}", (swing, ay, 1.15), (swing * 1.5, ay, 0.88), 0.04, m_skin_m, verts=10, parent=ped_m_root)
        create_sphere(f"PedM_Hand_{side}", (swing * 1.5, ay, 0.86), 0.042, (1.2, 0.9, 0.9), m_skin_m, parent=ped_m_root)

    # Legs (Articulated walking nodes)
    stride_m = 0.16
    for side, sign in [("L", -1), ("R", 1)]:
        ly = sign * 0.10
        stride = stride_m * sign
        create_cylinder_between(f"PedM_Thigh_{side}", (0, ly, 0.94), (stride * 0.6, ly, 0.52), 0.065, m_pajama, verts=12, parent=ped_m_root)
        create_cylinder_between(f"PedM_Shin_{side}", (stride * 0.6, ly, 0.52), (stride, ly, 0.08), 0.052, m_pajama, verts=10, parent=ped_m_root)
        create_box(f"PedM_Foot_{side}", (stride + 0.04, ly, 0.05), (0.18, 0.08, 0.04), m_sandal, bevel=0.01, parent=ped_m_root)

    # -------------------------------------------------------------
    # 2. FEMALE PEDESTRIAN IN SAREE (FULL BODY & ARTICULATED LIMBS)
    # -------------------------------------------------------------
    ped_f_root = bpy.data.objects.new("Pedestrian_Female", None)
    bpy.context.collection.objects.link(ped_f_root)
    ped_f_root.location = (0.0, 0.6, 0.0)

    # Pelvis
    create_box("PedF_Pelvis", (0, 0, 0.92), (0.22, 0.30, 0.16), m_saree, bevel=0.02, parent=ped_f_root)
    # Torso (Blouse + Saree Drape)
    create_box("PedF_Torso", (0, 0, 1.20), (0.22, 0.34, 0.42), m_saree, bevel=0.04, parent=ped_f_root)
    # Orna / Pallu drape over shoulder
    create_cylinder_between("PedF_Pallu", (0.08, -0.12, 1.35), (-0.08, 0.14, 0.95), 0.05, m_saree_gold, verts=8, parent=ped_f_root)
    # Saree pleats / skirt down to ankles
    create_box("PedF_SareeSkirt", (0, 0, 0.54), (0.26, 0.32, 0.72), m_saree, bevel=0.04, parent=ped_f_root)
    create_box("PedF_GoldHem", (0, 0, 0.20), (0.27, 0.33, 0.06), m_saree_gold, parent=ped_f_root)
    # Neck
    create_cylinder_between("PedF_Neck", (0, 0, 1.42), (0, 0, 1.52), 0.045, m_skin_f, verts=10, parent=ped_f_root)
    # 3D Face with earrings & hair bun
    build_head_and_face("PedF", (0, 0, 1.64), m_skin_f, m_hair, m_eye_white, m_iris, m_lip, parent=ped_f_root, is_female=True)

    # Arms
    for side, sign in [("L", -1), ("R", 1)]:
        ay = sign * 0.20
        swing = -0.07 if sign == -1 else 0.07
        create_cylinder_between(f"PedF_UpperArm_{side}", (0, ay, 1.38), (swing, ay, 1.10), 0.045, m_saree, verts=10, parent=ped_f_root)
        create_cylinder_between(f"PedF_Forearm_{side}", (swing, ay, 1.10), (swing * 1.4, ay, 0.85), 0.038, m_skin_f, verts=10, parent=ped_f_root)
        create_sphere(f"PedF_Hand_{side}", (swing * 1.4, ay, 0.83), 0.04, (1.2, 0.9, 0.9), m_skin_f, parent=ped_f_root)

    # Feet wearing sandals
    create_box("PedF_Foot_L", (0.08, -0.09, 0.05), (0.16, 0.07, 0.035), m_sandal, bevel=0.01, parent=ped_f_root)
    create_box("PedF_Foot_R", (-0.08, 0.09, 0.05), (0.16, 0.07, 0.035), m_sandal, bevel=0.01, parent=ped_f_root)

    # -------------------------------------------------------------
    # 3. EXPORT TO GLTF/GLB
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
    print("SUCCESSFULLY EXPORTED PEDESTRIANS TO:", OUTPUT)

if __name__ == "__main__":
    build()
