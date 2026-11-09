import bpy
import bmesh
import math
import os

# ==============================================================================
# 1. CLEAN SCENE & INITIALIZE
# ==============================================================================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in bpy.data.meshes:
    if block.users == 0:
        bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0:
        bpy.data.materials.remove(block)

bus_root = bpy.data.objects.new("GTA_Transit_Bus", None)
bpy.context.collection.objects.link(bus_root)

# ==============================================================================
# 2. BLENDER 5.2 SAFE PBR MATERIAL BUILDER
# ==============================================================================
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

# Authentic GTA V VIP Livery Materials
mat_red = make_mat("GTA_Red_Paint", (0.55, 0.05, 0.08, 1.0), metallic=0.22, roughness=0.18, coat=1.0)
mat_white = make_mat("GTA_White_Paint", (0.94, 0.95, 0.96, 1.0), metallic=0.08, roughness=0.22, coat=0.85)
mat_silver_pod = make_mat("GTA_Silver_Pod", (0.75, 0.77, 0.80, 1.0), metallic=0.55, roughness=0.25, coat=0.4)
mat_black_trim = make_mat("GTA_Black_Trim", (0.04, 0.04, 0.05, 1.0), metallic=0.15, roughness=0.6)
mat_bumper = make_mat("GTA_Bumper_Black", (0.03, 0.03, 0.035, 1.0), metallic=0.08, roughness=0.75)
mat_glass = make_mat("GTA_Tinted_Glass", (0.05, 0.08, 0.12, 1.0), metallic=0.15, roughness=0.04, coat=1.0, alpha=0.52)
mat_chrome = make_mat("GTA_Chrome", (0.92, 0.94, 0.96, 1.0), metallic=0.96, roughness=0.08, emission=(0.4, 0.42, 0.45, 1.0), emission_strength=0.25)
mat_tire = make_mat("GTA_Tire_Rubber", (0.035, 0.035, 0.04, 1.0), metallic=0.0, roughness=0.85)

# Ultra-crisp bright steel rims
mat_rim = make_mat("GTA_Steel_Rim", (0.92, 0.94, 0.97, 1.0), metallic=0.70, roughness=0.16, emission=(0.45, 0.48, 0.52, 1.0), emission_strength=0.40)
mat_rim_dark = make_mat("GTA_Rim_Recess", (0.10, 0.11, 0.13, 1.0), metallic=0.75, roughness=0.45)
mat_headlight = make_mat("GTA_Headlight", (1.0, 0.98, 0.92, 1.0), roughness=0.08, emission=(1.0, 0.98, 0.92, 1.0), emission_strength=10.0)
mat_amber = make_mat("GTA_Amber_Light", (1.0, 0.48, 0.02, 1.0), roughness=0.12, emission=(1.0, 0.48, 0.02, 1.0), emission_strength=8.0)
mat_taillight = make_mat("GTA_Taillight", (0.95, 0.02, 0.02, 1.0), roughness=0.12, emission=(0.95, 0.02, 0.02, 1.0), emission_strength=8.0)
mat_led_board = make_mat("GTA_LED_Text", (1.0, 0.55, 0.05, 1.0), roughness=0.2, emission=(1.0, 0.55, 0.05, 1.0), emission_strength=10.0)
mat_seat_blue = make_mat("GTA_Seat_Blue", (0.08, 0.16, 0.45, 1.0), roughness=0.65)
mat_interior_dark = make_mat("GTA_Interior_Floor", (0.12, 0.13, 0.15, 1.0), roughness=0.85)
mat_skin = make_mat("Human_Skin", (0.58, 0.38, 0.26, 1.0), roughness=0.55)
mat_hair = make_mat("Human_Hair", (0.04, 0.03, 0.03, 1.0), roughness=0.7)
mat_eye_white = make_mat("Eye_Sclera", (0.95, 0.95, 0.95, 1.0), roughness=0.1)
mat_shirt_driver = make_mat("Driver_Shirt", (0.15, 0.22, 0.35, 1.0), roughness=0.7)
mat_pants = make_mat("Human_Pants", (0.08, 0.09, 0.12, 1.0), roughness=0.75)
mat_bkash_pink = make_mat("GTA_bKash_Pink", (0.89, 0.10, 0.42, 1.0), metallic=0.1, roughness=0.3, emission=(0.89, 0.10, 0.42, 1.0), emission_strength=1.5)

# ==============================================================================
# 3. HELPER GEOMETRY FUNCTIONS
# Native Three.js Vehicle Orientation:
# - Length: along X (+X is front, -X is rear)
# - Height: along Z (+Z is up, 0 is ground)
# - Width: along Y (+Y is left/driver side, -Y is right/curb door side)
# ==============================================================================
def link_to_bus(obj, parent=bus_root):
    obj.parent = parent
    for col in obj.users_collection:
        col.objects.unlink(obj)
    bpy.context.collection.objects.link(obj)
    return obj

def add_beveled_box(name, size, location, mat, bevel_width=0.04, segments=3, parent=bus_root):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel_width > 0:
        bev = obj.modifiers.new(name="Bevel", type='BEVEL')
        bev.width = bevel_width
        bev.segments = segments
        bpy.ops.object.modifier_apply(modifier=bev.name)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return link_to_bus(obj, parent)

def add_cyl(name, radius, depth, location, rotation, mat, vertices=28, parent=bus_root):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return link_to_bus(obj, parent)

def add_3d_text(name, text, location, rotation, size, extrude, mat, parent=bus_root):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.body = text
    obj.data.size = size
    obj.data.extrude = extrude
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    bpy.ops.object.convert(target='MESH')
    obj.data.materials.append(mat)
    return link_to_bus(obj, parent)

# ==============================================================================
# 4. MAIN BUS CHASSIS (TWO-TONE RED & WHITE LIVERY + SWEEPING REAR LINES)
# Total length: 11.9m (from X = -5.95 to +5.95)
# Total width: 2.56m (from Y = -1.28 to +1.28)
# Total height: 3.12m (from Z = 0.35 to 3.12, ground at Z=0)
# ==============================================================================

# Lower White Hull (Skirt) from Z = 0.42 to Z = 1.48
add_beveled_box("Bus_Lower_White_Hull", (11.70, 2.56, 1.06), (0, 0, 0.95), mat_white, bevel_width=0.08, segments=3)

# Upper Red Roof Crown from Z = 2.50 to Z = 3.12
add_beveled_box("Bus_Upper_Red_Crown", (11.68, 2.54, 0.62), (0, 0, 2.81), mat_red, bevel_width=0.10, segments=4)

# Red Beltline Band below windows from Z = 1.42 to Z = 1.56
add_beveled_box("Bus_Red_Beltline", (11.72, 2.58, 0.16), (0, 0, 1.49), mat_red, bevel_width=0.02, segments=2)

# Rear Cap Panels
add_beveled_box("Bus_Rear_Wall_Red", (0.22, 2.52, 1.62), (-5.85, 0, 2.26), mat_red, bevel_width=0.08)
add_beveled_box("Bus_Rear_Wall_White", (0.22, 2.54, 1.04), (-5.85, 0, 0.95), mat_white, bevel_width=0.06)

# Signature GTA V Upward Diagonal White Sweep at Rear Quarter
for side in [-1, 1]:
    y_pos = side * 1.282
    # Red quarter wall
    add_beveled_box(f"Bus_Rear_Quarter_Red_{side}", (1.80, 0.04, 1.08), (-4.75, y_pos, 2.02), mat_red, bevel_width=0.02)

    # Flush Diagonal White Sweep (Custom bmesh polygon on the outer skin)
    bm = bmesh.new()
    v1 = bm.verts.new((-3.30, y_pos + side * 0.005, 1.52))
    v2 = bm.verts.new((-5.82, y_pos + side * 0.005, 2.75))
    v3 = bm.verts.new((-5.82, y_pos + side * 0.005, 1.52))
    bm.faces.new([v1, v2, v3] if side > 0 else [v1, v3, v2])
    mesh = bpy.data.meshes.new(f"Rear_White_Sweep_Mesh_{side}")
    bm.to_mesh(mesh)
    bm.free()
    sweep_obj = bpy.data.objects.new(f"Rear_White_Sweep_{side}", mesh)
    bpy.context.collection.objects.link(sweep_obj)
    sweep_obj.data.materials.append(mat_white)
    link_to_bus(sweep_obj)

    # bKash Sponsor Roundel & Logo on the White Sweep
    add_cyl(f"Rear_bKash_Disc_{side}", 0.22, 0.02, (-5.15, side * 1.295, 2.35), (math.pi / 2, 0, 0), mat_bkash_pink, vertices=32)
    add_3d_text(f"Rear_bKash_Text_{side}", "bKash", (-5.15, side * 1.308, 2.35), (math.pi / 2, 0, 0 if side > 0 else math.pi), 0.10, 0.015, mat_white)

    # "VIP 27" Route Badge on lower rear skirt
    add_3d_text(f"Rear_VIP_Route_{side}", "VIP 27", (-4.65, side * 1.295, 1.15), (math.pi / 2, 0, 0 if side > 0 else math.pi), 0.12, 0.015, mat_red)

# ==============================================================================
# 5. 7 FRAMED SIDE WINDOWS, PILLARS & "VIP TRANSIT" HEADER
# ==============================================================================
window_x_centers = [3.95, 2.65, 1.35, 0.05, -1.25, -2.55, -3.75]

for side in [-1, 1]:
    y_pos = side * 1.28
    # Vertical Red Structural Pillars between windows
    pillar_xs = [4.60, 3.30, 2.00, 0.70, -0.60, -1.90, -3.15, -4.35]
    for idx, px in enumerate(pillar_xs):
        add_beveled_box(f"Pillar_{side}_{idx}", (0.16, 0.06, 1.08), (px, y_pos, 2.02), mat_red, bevel_width=0.015)

    # 7 Framed Windows with black gasket, tinted glass, and horizontal transom bar
    for idx, wx in enumerate(window_x_centers):
        w_len = 1.12 if idx < 6 else 0.95
        add_beveled_box(f"WinFrame_Top_{side}_{idx}", (w_len, 0.06, 0.05), (wx, y_pos, 2.50), mat_black_trim, bevel_width=0.01)
        add_beveled_box(f"WinFrame_Bot_{side}_{idx}", (w_len, 0.06, 0.05), (wx, y_pos, 1.54), mat_black_trim, bevel_width=0.01)
        add_beveled_box(f"WinTransom_{side}_{idx}", (w_len, 0.055, 0.032), (wx, y_pos, 2.27), mat_black_trim, bevel_width=0.005)
        add_beveled_box(f"WinGlass_{side}_{idx}", (w_len, 0.02, 0.94), (wx, side * 1.265, 2.02), mat_glass, bevel_width=0.0)

    # Side White Banner Backplate & Embossed "VIP TRANSIT" 3D Typography
    add_beveled_box(f"Banner_Backplate_{side}", (4.50, 0.02, 0.18), (0.45, side * 1.29, 2.74), mat_white, bevel_width=0.005)
    add_3d_text(f"Banner_Text_{side}", "VIP TRANSIT", (0.45, side * 1.305, 2.74), (math.pi / 2, 0, 0 if side > 0 else math.pi), 0.13, 0.015, mat_red)

# Front Bi-Fold Passenger Door (Curb Side at Y = -1.28)
door_side = -1
door_y = door_side * 1.28
add_beveled_box("Front_Door_Frame", (0.92, 0.06, 1.96), (5.15, door_y, 1.55), mat_black_trim, bevel_width=0.02)
for leaf_x in [-0.22, 0.22]:
    add_beveled_box(f"Door_Glass_Leaf_{leaf_x}", (0.34, 0.025, 1.55), (5.15 + leaf_x, door_side * 1.265, 1.62), mat_glass, bevel_width=0.0)
    add_beveled_box(f"Door_Gasket_Seal_{leaf_x}", (0.04, 0.03, 1.55), (5.15 + leaf_x, door_y, 1.62), mat_black_trim, bevel_width=0.005)

# ==============================================================================
# 6. STREAMLINED AERODYNAMIC ROOFTOP AC POD
# ==============================================================================
add_beveled_box("Roof_AC_Main_Pod", (6.40, 1.55, 0.30), (-0.15, 0, 3.22), mat_silver_pod, bevel_width=0.12, segments=5)

for e_idx, ex, rot in [("Front", 3.10, 0.25), ("Rear", -3.40, -0.25)]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(ex, 0, 3.18))
    cowl = bpy.context.active_object
    cowl.name = f"AC_{e_idx}_Cowl"
    cowl.scale = (0.75, 1.52, 0.26)
    cowl.rotation_euler = (0, rot, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    cowl.data.materials.append(mat_silver_pod)
    link_to_bus(cowl)

for seam_x in [-1.5, 0.0, 1.5]:
    add_beveled_box(f"AC_Seam_{seam_x}", (0.05, 1.57, 0.31), (seam_x, 0, 3.22), mat_black_trim, bevel_width=0.005)

for louver_x in [-2.2, -0.7, 0.8, 2.2]:
    add_beveled_box(f"AC_Louver_{louver_x}", (0.70, 0.95, 0.04), (louver_x, 0, 3.38), mat_black_trim, bevel_width=0.01)

add_cyl("Rear_Exhaust_Snorkel", 0.055, 0.42, (-5.65, 1.05, 3.22), (0, 0.35, 0), mat_black_trim)

# ==============================================================================
# 7. FRONT FASCIA: WINDSHIELD, DESTINATION DISPLAY "VIP 27 · MIRPUR 10" & HEADLIGHTS
# ==============================================================================
add_beveled_box("Bus_Front_Apron_White", (0.35, 2.54, 0.94), (5.75, 0, 0.92), mat_white, bevel_width=0.10, segments=3)
add_beveled_box("Front_Bumper", (0.36, 2.62, 0.28), (5.96, 0, 0.52), mat_bumper, bevel_width=0.06)
add_beveled_box("Rear_Bumper", (0.32, 2.62, 0.28), (-5.96, 0, 0.52), mat_bumper, bevel_width=0.06)

add_beveled_box("Front_License_Plate", (0.04, 0.38, 0.18), (6.16, 0, 0.52), mat_white, bevel_width=0.005)
add_beveled_box("Front_License_Frame", (0.03, 0.40, 0.20), (6.15, 0, 0.52), mat_black_trim, bevel_width=0.005)

for grille_z in [0.72, 0.80, 0.88]:
    add_beveled_box(f"Front_Grille_Slat_{grille_z}", (0.03, 1.40, 0.035), (5.92, 0, grille_z), mat_black_trim, bevel_width=0.005)

# Triple Headlights on Left & Right
for side in [-1, 1]:
    for h_idx, y_off in enumerate([0.62, 0.84, 1.06]):
        hy = side * y_off
        add_cyl(f"Headlight_Bezel_{side}_{h_idx}", 0.075, 0.08, (5.90, hy, 0.82), (0, math.pi / 2, 0), mat_black_trim)
        add_cyl(f"Headlight_Ring_{side}_{h_idx}", 0.072, 0.085, (5.91, hy, 0.82), (0, math.pi / 2, 0), mat_chrome)
        lens_mat = mat_amber if h_idx == 2 else mat_headlight
        add_cyl(f"Headlight_Lens_{side}_{h_idx}", 0.058, 0.095, (5.92, hy, 0.82), (0, math.pi / 2, 0), lens_mat)

for side in [-1, 1]:
    for z_off, l_mat in [(0.96, mat_taillight), (1.16, mat_amber), (0.76, mat_headlight)]:
        add_cyl(f"RearLight_{side}_{z_off}", 0.065, 0.06, (-5.88, side * 1.02, z_off), (0, math.pi / 2, 0), l_mat)

# Panoramic Raked Windshield & Center Post
add_beveled_box("Windshield_Frame", (0.10, 2.44, 1.16), (5.72, 0, 2.02), mat_black_trim, bevel_width=0.03)
add_beveled_box("Windshield_Glass", (0.04, 2.36, 1.08), (5.74, 0, 2.02), mat_glass, bevel_width=0.0)
add_beveled_box("Windshield_Center_Post", (0.08, 0.06, 1.10), (5.75, 0, 2.02), mat_black_trim, bevel_width=0.01)

# Twin Windshield Wipers
for wy_off in [-0.42, 0.42]:
    add_cyl(f"Wiper_Pivot_{wy_off}", 0.03, 0.06, (5.78, wy_off, 1.38), (0, math.pi / 2, 0), mat_chrome)
    add_beveled_box(f"Wiper_Arm_{wy_off}", (0.03, 0.025, 0.72), (5.79, wy_off, 1.74), mat_black_trim, bevel_width=0.004)

# Upper Destination Sign Box with "VIP 27 · MIRPUR 10" Glowing LED
add_beveled_box("Dest_Sign_Housing", (0.22, 2.05, 0.28), (5.78, 0, 2.82), mat_black_trim, bevel_width=0.03)
add_beveled_box("Dest_LED_Board", (0.04, 1.95, 0.22), (5.90, 0, 2.82), mat_black_trim, bevel_width=0.005)
add_3d_text("Dest_LED_Text", "VIP 27 · MIRPUR 10", (5.93, 0, 2.82), (math.pi / 2, 0, math.pi / 2), 0.10, 0.01, mat_led_board)

for side in [-1, 1]:
    add_beveled_box(f"Dest_Amber_Marker_{side}", (0.04, 0.09, 0.07), (5.90, side * 0.95, 2.82), mat_amber, bevel_width=0.005)

for cab_y in [-0.8, -0.4, 0.0, 0.4, 0.8]:
    add_beveled_box(f"Cab_Marker_{cab_y}", (0.05, 0.06, 0.035), (5.86, cab_y, 3.12), mat_amber, bevel_width=0.005)

for side in [-1, 1]:
    add_cyl(f"Mirror_Stem_{side}", 0.02, 0.38, (5.55, side * 1.38, 2.32), (0.2 * side, 0, math.pi / 2), mat_black_trim)
    add_beveled_box(f"Mirror_Head_{side}", (0.14, 0.08, 0.34), (5.60, side * 1.54, 2.18), mat_black_trim, bevel_width=0.02)
    add_beveled_box(f"Mirror_Glass_{side}", (0.12, 0.01, 0.30), (5.59, side * (1.54 - 0.035 * side), 2.18), mat_chrome, bevel_width=0.0)

# ==============================================================================
# 8. INTERIOR CABIN: CABIN FLOOR, DASHBOARD, PASSENGER SEATS & GRAB STANCHIONS
# ==============================================================================
add_beveled_box("Interior_Floor", (11.4, 2.40, 0.08), (0, 0, 0.78), mat_interior_dark, bevel_width=0.01)

# Driver Workstation
add_beveled_box("Dashboard_Console", (0.65, 1.10, 0.65), (5.25, 0.62, 1.12), mat_black_trim, bevel_width=0.05)
add_cyl("Steering_Column", 0.035, 0.45, (5.00, 0.65, 1.32), (0, 0.45, 0), mat_black_trim)
add_cyl("Steering_Wheel", 0.18, 0.025, (4.88, 0.65, 1.58), (0, 0.45, 0), mat_black_trim)

for pole_x in [3.8, 2.4, 1.0, -0.4, -1.8, -3.2]:
    add_cyl(f"Stanchion_Pole_{pole_x}", 0.022, 1.85, (pole_x, 0.22, 1.76), (0, 0, 0), mat_chrome)
    add_cyl(f"Stanchion_Crossbar_{pole_x}", 0.018, 0.55, (pole_x, 0.22, 2.42), (math.pi / 2, 0, 0), mat_chrome)

seat_xs = [3.4, 2.1, 0.8, -0.5, -1.8, -3.1, -4.4]
for s_idx, sx in enumerate(seat_xs):
    for side in [-1, 1]:
        sy = side * 0.82
        add_beveled_box(f"Seat_Base_{s_idx}_{side}", (0.44, 0.52, 0.38), (sx, sy, 0.98), mat_black_trim, bevel_width=0.02)
        add_beveled_box(f"Seat_Cushion_{s_idx}_{side}", (0.42, 0.50, 0.08), (sx, sy, 1.18), mat_seat_blue, bevel_width=0.03)
        add_beveled_box(f"Seat_Back_{s_idx}_{side}", (0.08, 0.50, 0.54), (sx - 0.18, sy, 1.48), mat_seat_blue, bevel_width=0.03)
        add_cyl(f"Seat_Handle_{s_idx}_{side}", 0.014, 0.45, (sx - 0.18, sy, 1.78), (math.pi / 2, 0, 0), mat_black_trim)

# Driver + Passengers
def build_seated_human(name_prefix, x, y, z, shirt_mat, is_driver=False):
    h_parent = bpy.data.objects.new(name_prefix, None)
    h_parent.location = (x, y, z)
    link_to_bus(h_parent, bus_root)

    add_beveled_box(f"{name_prefix}_Hips", (0.28, 0.34, 0.18), (0, 0, 0.09), mat_pants, bevel_width=0.03, parent=h_parent)

    for l_side in [-0.10, 0.10]:
        add_cyl(f"{name_prefix}_Thigh_{l_side}", 0.055, 0.32, (0.16, l_side, 0.08), (0, math.pi / 2, 0), mat_pants, parent=h_parent)
        add_cyl(f"{name_prefix}_Shin_{l_side}", 0.048, 0.34, (0.32, l_side, -0.10), (0, 0, 0), mat_pants, parent=h_parent)
        add_beveled_box(f"{name_prefix}_Shoe_{l_side}", (0.14, 0.075, 0.06), (0.36, l_side, -0.27), mat_black_trim, bevel_width=0.015, parent=h_parent)

    add_beveled_box(f"{name_prefix}_Torso", (0.26, 0.36, 0.42), (0, 0, 0.38), shirt_mat, bevel_width=0.05, parent=h_parent)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.115, location=(0, 0, 0.72))
    head = bpy.context.active_object
    head.name = f"{name_prefix}_Head"
    head.scale = (1.0, 0.95, 1.15)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    head.data.materials.append(mat_skin)
    link_to_bus(head, h_parent)

    add_beveled_box(f"{name_prefix}_Nose", (0.035, 0.028, 0.045), (0.105, 0, 0.72), mat_skin, bevel_width=0.008, parent=h_parent)
    for e_side in [-0.042, 0.042]:
        add_cyl(f"{name_prefix}_Eye_{e_side}", 0.016, 0.01, (0.098, e_side, 0.745), (0, math.pi / 2, 0), mat_eye_white, parent=h_parent)
        add_cyl(f"{name_prefix}_Pupil_{e_side}", 0.008, 0.012, (0.102, e_side, 0.745), (0, math.pi / 2, 0), mat_black_trim, parent=h_parent)
    add_beveled_box(f"{name_prefix}_Hair", (0.23, 0.22, 0.12), (-0.02, 0, 0.80), mat_hair, bevel_width=0.05, parent=h_parent)

    for a_side in [-1, 1]:
        ay = a_side * 0.22
        if is_driver:
            add_cyl(f"{name_prefix}_UpperArm_{a_side}", 0.05, 0.28, (0.08, ay, 0.44), (0, -0.65, 0), shirt_mat, parent=h_parent)
            add_cyl(f"{name_prefix}_Forearm_{a_side}", 0.042, 0.26, (0.28, ay * 0.85, 0.38), (0, -1.15, 0), mat_skin, parent=h_parent)
        else:
            add_cyl(f"{name_prefix}_UpperArm_{a_side}", 0.05, 0.28, (-0.02, ay, 0.40), (0, -0.15, 0), shirt_mat, parent=h_parent)
            add_cyl(f"{name_prefix}_Forearm_{a_side}", 0.042, 0.24, (0.10, ay * 0.90, 0.24), (0, -1.25, 0), mat_skin, parent=h_parent)

build_seated_human("Bus_Driver", 4.42, 0.65, 1.18, mat_shirt_driver, is_driver=True)
passenger_coords = [(3.22, -0.82), (2.02, 0.82), (0.82, -0.82), (-0.38, 0.82), (-1.58, -0.82), (-2.78, 0.82)]
for p_idx, (px, py) in enumerate(passenger_coords):
    build_seated_human(f"Bus_Passenger_{p_idx}", px, py, 1.24, mat_shirt_driver if p_idx % 2 == 0 else mat_red, is_driver=False)

# ==============================================================================
# 10. REALISTIC TRANSIT WHEELS: DIFFERENTIATED FRONT VS REAR (DUALLY DEEP-DISH)
# FRONT: Single tire, convex silver rim with 10 ventilation cutouts and chrome hub
# REAR: DUAL TIRES (Dually) with deep-dish concave inset rim and heavy axle drum
# ==============================================================================

# Front Left & Right (Single wheel, convex rim)
for w_name, w_x, side_sign in [("Wheel_FL", 3.45, 1), ("Wheel_FR", 3.45, -1)]:
    add_cyl(f"Arch_{w_name}", 0.62, 0.08, (w_x, side_sign * 1.27, 0.57), (math.pi / 2, 0, 0), mat_black_trim, vertices=32)

    w_pivot = bpy.data.objects.new(w_name, None)
    w_pivot.location = (w_x, side_sign * 1.18, 0.52)
    link_to_bus(w_pivot, bus_root)

    # Single radial tire
    add_cyl(f"{w_name}_Tire", 0.52, 0.30, (0, 0, 0), (math.pi / 2, 0, 0), mat_tire, vertices=36, parent=w_pivot)

    # Front convex silver rim lip
    rim_y = side_sign * 0.14
    add_cyl(f"{w_name}_Rim_Lip", 0.38, 0.06, (0, rim_y, 0), (math.pi / 2, 0, 0), mat_rim, vertices=32, parent=w_pivot)
    # Shallow dish
    add_cyl(f"{w_name}_Dish", 0.30, 0.08, (0, rim_y - side_sign * 0.02, 0), (math.pi / 2, 0, 0), mat_rim_dark, vertices=28, parent=w_pivot)
    # Protruding chrome center hub
    add_cyl(f"{w_name}_Hub", 0.12, 0.10, (0, rim_y + side_sign * 0.02, 0), (math.pi / 2, 0, 0), mat_chrome, vertices=20, parent=w_pivot)
    # 10 Circular ventilation holes
    for b_i in range(10):
        ang = b_i * (2 * math.pi / 10)
        vx = 0.22 * math.cos(ang)
        vz = 0.22 * math.sin(ang)
        add_cyl(f"{w_name}_Vent_{b_i}", 0.028, 0.08, (vx, rim_y - side_sign * 0.01, vz), (math.pi / 2, 0, 0), mat_black_trim, vertices=12, parent=w_pivot)

# Rear Left & Right (DUAL TIRES / DUALLY DEEP-DISH)
for w_name, w_x, side_sign in [("Wheel_RL", -3.35, 1), ("Wheel_RR", -3.35, -1)]:
    add_cyl(f"Arch_{w_name}", 0.62, 0.08, (w_x, side_sign * 1.27, 0.57), (math.pi / 2, 0, 0), mat_black_trim, vertices=32)

    w_pivot = bpy.data.objects.new(w_name, None)
    w_pivot.location = (w_x, side_sign * 1.18, 0.52)
    link_to_bus(w_pivot, bus_root)

    # Dual Tires: Outer Tire + Inner Tire
    add_cyl(f"{w_name}_Tire_Outer", 0.52, 0.24, (0, side_sign * 0.14, 0), (math.pi / 2, 0, 0), mat_tire, vertices=36, parent=w_pivot)
    add_cyl(f"{w_name}_Tire_Inner", 0.52, 0.24, (0, side_sign * -0.14, 0), (math.pi / 2, 0, 0), mat_tire, vertices=36, parent=w_pivot)

    # Deep Inset Steel Rim Lip (Recessed 16cm inward into the wheel barrel!)
    rim_y = side_sign * 0.04
    add_cyl(f"{w_name}_Rim_Lip", 0.38, 0.06, (0, rim_y, 0), (math.pi / 2, 0, 0), mat_rim, vertices=32, parent=w_pivot)
    # Concave deep dish recess
    add_cyl(f"{w_name}_Deep_Dish", 0.32, 0.12, (0, rim_y - side_sign * 0.05, 0), (math.pi / 2, 0, 0), mat_rim_dark, vertices=28, parent=w_pivot)
    # Heavy cylindrical axle hub drum
    add_cyl(f"{w_name}_Axle_Drum", 0.16, 0.16, (0, rim_y - side_sign * 0.02, 0), (math.pi / 2, 0, 0), mat_chrome, vertices=20, parent=w_pivot)
    # 10 Ventilation cutouts in the deep dish
    for b_i in range(10):
        ang = b_i * (2 * math.pi / 10)
        vx = 0.24 * math.cos(ang)
        vz = 0.24 * math.sin(ang)
        add_cyl(f"{w_name}_Vent_{b_i}", 0.030, 0.10, (vx, rim_y - side_sign * 0.03, vz), (math.pi / 2, 0, 0), mat_black_trim, vertices=12, parent=w_pivot)

# ==============================================================================
# 11. EXPORT PRODUCTION GLB FOR BHARADEKHI
# ==============================================================================
repo_root = os.path.dirname(os.path.abspath(__file__))
export_target = os.path.join(repo_root, "assets", "models", "dhaka-bus.glb")
os.makedirs(os.path.dirname(export_target), exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=export_target,
    export_format='GLB',
    use_selection=False,
    export_yup=True,
    export_apply=True
)

print(f"SUCCESS: Exported GTA V Transit Bus to {export_target}")
