import bpy
import bmesh
import math
import os
import shutil

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

# Materials matching the GTA V Los Santos Transit Bus
mat_red = make_mat("GTA_Red_Paint", (0.72, 0.03, 0.04, 1.0), metallic=0.15, roughness=0.14, coat=1.0)
mat_white = make_mat("GTA_White_Paint", (0.92, 0.93, 0.94, 1.0), metallic=0.08, roughness=0.18, coat=0.8)
mat_silver_pod = make_mat("GTA_Silver_Pod", (0.70, 0.72, 0.73, 1.0), metallic=0.45, roughness=0.28, coat=0.4)
mat_black_trim = make_mat("GTA_Black_Trim", (0.05, 0.05, 0.06, 1.0), metallic=0.1, roughness=0.65)
mat_bumper = make_mat("GTA_Bumper_Black", (0.03, 0.03, 0.035, 1.0), metallic=0.05, roughness=0.75)
mat_glass = make_mat("GTA_Tinted_Glass", (0.04, 0.07, 0.09, 1.0), metallic=0.1, roughness=0.05, coat=1.0, alpha=0.38)
mat_chrome = make_mat("GTA_Chrome", (0.85, 0.87, 0.90, 1.0), metallic=0.95, roughness=0.1)
mat_tire = make_mat("GTA_Tire_Rubber", (0.04, 0.04, 0.045, 1.0), metallic=0.0, roughness=0.85)
mat_rim = make_mat("GTA_Steel_Rim", (0.55, 0.58, 0.62, 1.0), metallic=0.85, roughness=0.25)
mat_headlight = make_mat("GTA_Headlight", (1.0, 0.98, 0.90, 1.0), roughness=0.1, emission=(1.0, 0.97, 0.88, 1.0), emission_strength=8.0)
mat_amber = make_mat("GTA_Amber_Light", (1.0, 0.45, 0.0, 1.0), roughness=0.15, emission=(1.0, 0.45, 0.0, 1.0), emission_strength=6.0)
mat_taillight = make_mat("GTA_Taillight", (0.9, 0.02, 0.02, 1.0), roughness=0.15, emission=(1.0, 0.05, 0.05, 1.0), emission_strength=6.0)
mat_led_board = make_mat("GTA_LED_Text", (1.0, 0.55, 0.05, 1.0), roughness=0.2, emission=(1.0, 0.55, 0.05, 1.0), emission_strength=4.5)
mat_seat_blue = make_mat("GTA_Seat_Blue", (0.08, 0.16, 0.45, 1.0), roughness=0.6)
mat_interior_dark = make_mat("GTA_Interior_Floor", (0.12, 0.13, 0.15, 1.0), roughness=0.8)
mat_skin = make_mat("Human_Skin", (0.58, 0.38, 0.26, 1.0), roughness=0.55)
mat_hair = make_mat("Human_Hair", (0.04, 0.03, 0.03, 1.0), roughness=0.7)
mat_eye_white = make_mat("Eye_Sclera", (0.95, 0.95, 0.95, 1.0), roughness=0.1)
mat_shirt_driver = make_mat("Driver_Shirt", (0.15, 0.22, 0.32, 1.0), roughness=0.7)
mat_pants = make_mat("Human_Pants", (0.08, 0.09, 0.12, 1.0), roughness=0.75)

# ==============================================================================
# 3. HELPER GEOMETRY FUNCTIONS
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

def add_cyl(name, radius, depth, location, rotation, mat, vertices=24, parent=bus_root):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return link_to_bus(obj, parent)

# ==============================================================================
# 4. MAIN BUS CHASSIS (TWO-TONE RED & WHITE LIVERY + WINDOW CUTOUTS)
# ==============================================================================
# Bus dimensions: Width (X) = 2.6m, Length (Y) = 11.8m, Height (Z) = 3.1m (bottom at Z=0.42m)
# Lower White Body Skirt (Z = 0.42 to Z = 1.48)
lower_body = add_beveled_box("Bus_Lower_White_Hull", (2.58, 11.76, 1.06), (0, 0, 0.95), mat_white, bevel_width=0.06, segments=3)

# Upper Red Roof & Pillars Crown (Z = 2.52 to Z = 3.12)
upper_crown = add_beveled_box("Bus_Upper_Red_Crown", (2.56, 11.74, 0.60), (0, 0, 2.82), mat_red, bevel_width=0.12, segments=4)

# Red Beltline Strip below windows (Z = 1.42 to Z = 1.56)
belt_red = add_beveled_box("Bus_Red_Beltline", (2.60, 11.78, 0.16), (0, 0, 1.49), mat_red, bevel_width=0.02, segments=2)

# Rear Diagonal White/Red Sweep Panel (Matches the upward white sweep at rear wheel arch)
for side in [-1, 1]:
    add_beveled_box(f"Bus_Rear_Red_Quarter_{side}", (0.08, 1.55, 1.15), (side * 1.25, 5.05, 2.02), mat_red, bevel_width=0.02)
    # White diagonal wedge at rear lower corner
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 1.265, 4.95, 1.55))
    wedge = bpy.context.active_object
    wedge.name = f"Rear_White_Sweep_{side}"
    wedge.scale = (0.06, 1.7, 0.45)
    wedge.rotation_euler = (-0.22, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    wedge.data.materials.append(mat_white)
    link_to_bus(wedge)

# Rear Solid Cap Wall
add_beveled_box("Bus_Rear_Wall_Red", (2.56, 0.25, 1.65), (0, 5.75, 2.25), mat_red, bevel_width=0.08)
add_beveled_box("Bus_Rear_Wall_White", (2.58, 0.25, 1.06), (0, 5.76, 0.95), mat_white, bevel_width=0.06)

# ==============================================================================
# 5. 7 FRAMED SIDE WINDOWS, PILLARS & TRANSOM BARS (LEFT & RIGHT)
# ==============================================================================
window_y_centers = [-3.9, -2.55, -1.2, 0.15, 1.5, 2.85, 4.05]

for side in [-1, 1]:
    x_pos = side * 1.27
    # Vertical red structural pillars between windows
    pillar_y = [-4.65, -3.22, -1.87, -0.52, 0.82, 2.17, 3.48, 4.55]
    for idx, py in enumerate(pillar_y):
        add_beveled_box(f"Pillar_{side}_{idx}", (0.07, 0.18, 1.08), (x_pos, py, 2.02), mat_red, bevel_width=0.015)

    # 7 Framed Windows with dark gasket, tinted glass, and horizontal upper transom bar
    for idx, wy in enumerate(window_y_centers):
        w_len = 1.12 if idx < 6 else 0.92
        # Outer black rubber gasket frame
        add_beveled_box(f"WinFrame_Top_{side}_{idx}", (0.08, w_len, 0.05), (x_pos, wy, 2.50), mat_black_trim, bevel_width=0.01)
        add_beveled_box(f"WinFrame_Bot_{side}_{idx}", (0.08, w_len, 0.05), (x_pos, wy, 1.54), mat_black_trim, bevel_width=0.01)
        # Horizontal transom bar (upper third of window, matching GTA V bus)
        add_beveled_box(f"WinTransom_{side}_{idx}", (0.075, w_len, 0.03), (x_pos, wy, 2.26), mat_black_trim, bevel_width=0.005)
        # Tinted Glass Pane
        add_beveled_box(f"WinGlass_{side}_{idx}", (0.02, w_len, 0.94), (side * 1.25, wy, 2.02), mat_glass, bevel_width=0.0)

# Folding Front Transit Door (Left side in screenshot / curb side)
for d_side in [-1, 1]:
    door_x = d_side * 1.26
    add_beveled_box(f"DoorFrame_{d_side}", (0.07, 0.92, 1.95), (door_x, -5.18, 1.55), mat_black_trim, bevel_width=0.02)
    # Twin vertical glass slats in the folding door
    for leaf in [-0.21, 0.21]:
        add_beveled_box(f"DoorGlass_{d_side}_{leaf}", (0.03, 0.32, 1.55), (d_side * 1.25, -5.18 + leaf, 1.62), mat_glass, bevel_width=0.0)

# ==============================================================================
# 6. 3-SECTION SILVER ROOFTOP AC / CNG TANK POD (EXACT GTA V ROOF PROFILE)
# ==============================================================================
pod_y_positions = [-2.2, 0.2, 2.6]
for idx, py in enumerate(pod_y_positions):
    pod = add_beveled_box(f"Roof_Pod_{idx}", (1.55, 2.32, 0.36), (0, py, 3.24), mat_silver_pod, bevel_width=0.14, segments=5)
    # Black seam groove between pods
    if idx < 2:
        add_beveled_box(f"Roof_Pod_Seam_{idx}", (1.57, 0.04, 0.37), (0, py + 1.18, 3.24), mat_black_trim, bevel_width=0.005)

# Rear Top Right Curved Exhaust Pipe
add_cyl("Rear_Exhaust_Pipe", 0.055, 0.45, (1.05, 5.65, 3.22), (0.35, 0, 0), mat_black_trim)

# ==============================================================================
# 7. FRONT FASCIA: DESTINATION BOARD, DIVIDED WINDSHIELD, WIPERS & 6 HEADLIGHTS
# ==============================================================================
# Protruding Black Front Bumper & License Plate
add_beveled_box("Front_Bumper", (2.64, 0.36, 0.26), (0, -5.92, 0.52), mat_bumper, bevel_width=0.05)
add_beveled_box("Rear_Bumper", (2.64, 0.32, 0.26), (0, 5.90, 0.52), mat_bumper, bevel_width=0.05)
add_beveled_box("Front_License_Plate", (0.34, 0.04, 0.16), (0, -6.10, 0.50), mat_white, bevel_width=0.005)

# Triple Circular Recessed Headlights on Left & Right (o o o   o o o)
for side in [-1, 1]:
    for h_idx, x_off in enumerate([0.65, 0.85, 1.05]):
        hx = side * x_off
        add_cyl(f"Headlight_Bezel_{side}_{h_idx}", 0.075, 0.06, (hx, -5.88, 0.82), (math.pi / 2, 0, 0), mat_black_trim)
        lens_mat = mat_amber if h_idx == 2 else mat_headlight
        add_cyl(f"Headlight_Lens_{side}_{h_idx}", 0.058, 0.07, (hx, -5.89, 0.82), (math.pi / 2, 0, 0), lens_mat)

# Rear Taillights
for side in [-1, 1]:
    for z_off, l_mat in [(0.95, mat_taillight), (1.15, mat_amber), (0.75, mat_headlight)]:
        add_cyl(f"RearLight_{side}_{z_off}", 0.065, 0.06, (side * 1.02, 5.88, z_off), (math.pi / 2, 0, 0), l_mat)

# Large Panoramic Divided Front Windshield
add_beveled_box("Windshield_Frame", (2.46, 0.10, 1.16), (0, -5.84, 2.02), mat_black_trim, bevel_width=0.03)
add_beveled_box("Windshield_Glass", (2.36, 0.04, 1.06), (0, -5.86, 2.02), mat_glass, bevel_width=0.0)
add_beveled_box("Windshield_Center_Divider", (0.06, 0.08, 1.08), (0, -5.87, 2.02), mat_black_trim, bevel_width=0.01)

# Twin Vertical Windshield Wipers anchored below windshield
for w_x in [-0.35, 0.35]:
    add_cyl(f"Wiper_Pivot_{w_x}", 0.03, 0.06, (w_x, -5.89, 1.36), (math.pi / 2, 0, 0), mat_chrome)
    add_beveled_box(f"Wiper_Arm_{w_x}", (0.025, 0.03, 0.72), (w_x, -5.90, 1.72), mat_black_trim, bevel_width=0.004)

# Upper Recessed Destination Sign Box ("DOWNTOWN" / "MIRPUR 10") + 2 Amber Marker Lights
add_beveled_box("Dest_Sign_Recess", (1.95, 0.12, 0.28), (0, -5.84, 2.82), mat_black_trim, bevel_width=0.03)
add_beveled_box("Dest_LED_Glow_Bar", (1.10, 0.04, 0.12), (0, -5.88, 2.82), mat_led_board, bevel_width=0.005)
for side in [-1, 1]:
    add_beveled_box(f"Dest_Amber_Marker_{side}", (0.09, 0.04, 0.07), (side * 0.78, -5.89, 2.82), mat_amber, bevel_width=0.005)

# Exterior Side Mirrors
for side in [-1, 1]:
    add_cyl(f"Mirror_Arm_{side}", 0.02, 0.35, (side * 1.38, -5.65, 2.32), (0, math.pi / 2, 0.2 * side), mat_black_trim)
    add_beveled_box(f"Mirror_Head_{side}", (0.08, 0.14, 0.32), (side * 1.52, -5.70, 2.18), mat_black_trim, bevel_width=0.02)

# Side "LOS SANTOS TRANSIT" / "DHAKA TRANSIT" 3D Signage Strip above windows
for side in [-1, 1]:
    add_beveled_box(f"Side_Signage_Banner_{side}", (0.03, 4.2, 0.16), (side * 1.28, -1.6, 2.74), mat_white, bevel_width=0.005)

# ==============================================================================
# 8. INTERIOR CABIN: FLOOR, DASHBOARD, BLUE SEATS & STANCHION POLES
# ==============================================================================
add_beveled_box("Interior_Floor", (2.42, 11.4, 0.08), (0, 0, 0.78), mat_interior_dark, bevel_width=0.01)
add_beveled_box("Dashboard_Console", (1.15, 0.65, 0.65), (-0.62, -5.35, 1.12), mat_black_trim, bevel_width=0.05)

# Steering Column & Wheel
add_cyl("Steering_Column", 0.04, 0.55, (-0.65, -5.12, 1.35), (-0.45, 0, 0), mat_black_trim)
bpy.ops.mesh.primitive_torus_add(major_radius=0.22, minor_radius=0.025, location=(-0.65, -4.98, 1.58), rotation=(-0.45, 0, 0))
st_wheel = bpy.context.active_object
st_wheel.name = "Steering_Wheel"
st_wheel.data.materials.append(mat_black_trim)
link_to_bus(st_wheel)

# High-Back Driver Seat
add_beveled_box("Driver_Seat_Base", (0.52, 0.52, 0.14), (-0.65, -4.55, 1.12), mat_black_trim, bevel_width=0.03)
add_beveled_box("Driver_Seat_Back", (0.50, 0.12, 0.78), (-0.65, -4.32, 1.55), mat_black_trim, bevel_width=0.03)

# Rows of Blue Passenger Seats & Vertical Stanchion Handrails
seat_rows_y = [-3.3, -2.1, -0.9, 0.3, 1.5, 2.7, 3.9]
for r_idx, sy in enumerate(seat_rows_y):
    for side in [-1, 1]:
        sx = side * 0.82
        add_beveled_box(f"Seat_Cushion_{r_idx}_{side}", (0.76, 0.46, 0.12), (sx, sy, 1.18), mat_seat_blue, bevel_width=0.03)
        add_beveled_box(f"Seat_Back_{r_idx}_{side}", (0.76, 0.10, 0.58), (sx, sy + 0.18, 1.52), mat_seat_blue, bevel_width=0.03)
        add_beveled_box(f"Seat_Headrest_Trim_{r_idx}_{side}", (0.74, 0.11, 0.12), (sx, sy + 0.18, 1.82), mat_white, bevel_width=0.02)
    # Vertical chrome stanchion pole every second row
    if r_idx % 2 == 0:
        add_cyl(f"Stanchion_Pole_{r_idx}", 0.022, 2.1, (0.38, sy, 1.85), (0, 0, 0), mat_chrome)

# ==============================================================================
# 9. FULL-BODIED HUMANS (DRIVER + SEATED PASSENGERS WITH FACES & FULL LEGS)
# ==============================================================================
def build_seated_human(name_prefix, loc_x, loc_y, loc_z, shirt_mat, is_driver=False):
    h_parent = bpy.data.objects.new(name_prefix, None)
    h_parent.location = (loc_x, loc_y, loc_z)
    link_to_bus(h_parent, bus_root)

    # 1. Pelvis / Hips on Seat Cushion
    add_beveled_box(f"{name_prefix}_Pelvis", (0.34, 0.26, 0.16), (0, 0, 0.08), mat_pants, bevel_width=0.05, parent=h_parent)
    # 2. Full Legs: Thighs extending forward, Knees, Shins going down, Feet on Floor
    for l_side in [-0.10, 0.10]:
        add_cyl(f"{name_prefix}_Thigh_{l_side}", 0.075, 0.42, (l_side, -0.18, 0.08), (math.pi / 2, 0, 0), mat_pants, parent=h_parent)
        add_cyl(f"{name_prefix}_Shin_{l_side}", 0.06, 0.40, (l_side, -0.36, -0.14), (0.1, 0, 0), mat_pants, parent=h_parent)
        add_beveled_box(f"{name_prefix}_Shoe_{l_side}", (0.09, 0.20, 0.07), (l_side, -0.42, -0.34), mat_black_trim, bevel_width=0.02, parent=h_parent)

    # 3. Torso & Neck
    add_beveled_box(f"{name_prefix}_Torso", (0.36, 0.22, 0.48), (0, 0.04, 0.38), shirt_mat, bevel_width=0.06, parent=h_parent)
    add_cyl(f"{name_prefix}_Neck", 0.055, 0.12, (0, 0.02, 0.66), (0, 0, 0), mat_skin, parent=h_parent)

    # 4. Sculpted Head with Face (Eyes, Nose, Mouth, Ears, Hair)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=16, radius=0.115, location=(0, 0.01, 0.78))
    head = bpy.context.active_object
    head.name = f"{name_prefix}_Head"
    head.scale = (0.92, 1.0, 1.12)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    head.data.materials.append(mat_skin)
    link_to_bus(head, h_parent)

    # 3D Nose, Eyes, and Hair Cap
    add_beveled_box(f"{name_prefix}_Nose", (0.028, 0.035, 0.045), (0, -0.105, 0.78), mat_skin, bevel_width=0.008, parent=h_parent)
    for e_side in [-0.042, 0.042]:
        add_cyl(f"{name_prefix}_Eye_{e_side}", 0.016, 0.01, (e_side, -0.098, 0.805), (math.pi / 2, 0, 0), mat_eye_white, parent=h_parent)
        add_cyl(f"{name_prefix}_Pupil_{e_side}", 0.008, 0.012, (e_side, -0.102, 0.805), (math.pi / 2, 0, 0), mat_black_trim, parent=h_parent)
    add_beveled_box(f"{name_prefix}_Hair", (0.22, 0.23, 0.12), (0, 0.02, 0.86), mat_hair, bevel_width=0.05, parent=h_parent)

    # 5. Complete Arms & Hands
    for a_side in [-1, 1]:
        ax = a_side * 0.22
        if is_driver:
            add_cyl(f"{name_prefix}_UpperArm_{a_side}", 0.05, 0.28, (ax, -0.08, 0.48), (0.85, 0, 0), shirt_mat, parent=h_parent)
            add_cyl(f"{name_prefix}_Forearm_{a_side}", 0.042, 0.26, (ax * 0.85, -0.28, 0.40), (1.25, 0, 0), mat_skin, parent=h_parent)
        else:
            add_cyl(f"{name_prefix}_UpperArm_{a_side}", 0.05, 0.28, (ax, 0.02, 0.44), (0.15, 0, 0), shirt_mat, parent=h_parent)
            add_cyl(f"{name_prefix}_Forearm_{a_side}", 0.042, 0.24, (ax * 0.9, -0.10, 0.26), (1.3, 0, 0), mat_skin, parent=h_parent)

# Add Full-Bodied Driver + 6 Seated Passengers
build_seated_human("Bus_Driver", -0.65, -4.52, 1.18, mat_shirt_driver, is_driver=True)
passenger_coords = [(-0.82, -3.32), (0.82, -2.12), (-0.82, -0.92), (0.82, 0.28), (-0.82, 1.48), (0.82, 2.68)]
for p_idx, (px, py) in enumerate(passenger_coords):
    build_seated_human(f"Bus_Passenger_{p_idx}", px, py, 1.24, mat_shirt_driver if p_idx % 2 == 0 else mat_red, is_driver=False)

# ==============================================================================
# 10. HEAVY-DUTY TRANSIT WHEELS WITH NAMED PIVOTS (Wheel_FL, Wheel_FR, Wheel_RL, Wheel_RR)
# ==============================================================================
wheel_specs = [
    ("Wheel_FL", (-1.18, -3.45, 0.52), -1),
    ("Wheel_FR", ( 1.18, -3.45, 0.52),  1),
    ("Wheel_RL", (-1.18,  3.35, 0.52), -1),
    ("Wheel_RR", ( 1.18,  3.35, 0.52),  1),
]

for w_name, w_loc, side_sign in wheel_specs:
    # Dark Wheel Arch Flare
    add_cyl(f"Arch_{w_name}", 0.62, 0.12, (side_sign * 1.25, w_loc[1], w_loc[2] + 0.05), (0, math.pi / 2, 0), mat_black_trim, vertices=32)

    # Named Wheel Pivot Empty for crossroads-3d.js rotation
    w_pivot = bpy.data.objects.new(w_name, None)
    w_pivot.location = w_loc
    link_to_bus(w_pivot, bus_root)

    # Heavy Radial Tire
    add_cyl(f"{w_name}_Tire", 0.52, 0.32, (0, 0, 0), (0, math.pi / 2, 0), mat_tire, vertices=36, parent=w_pivot)
    # Recessed Silver Steel Rim
    add_cyl(f"{w_name}_Rim", 0.31, 0.34, (0, 0, 0), (0, math.pi / 2, 0), mat_rim, vertices=28, parent=w_pivot)
    # Central Axle Hub Cap & Lug Ring
    add_cyl(f"{w_name}_Hub", 0.12, 0.37, (side_sign * 0.02, 0, 0), (0, math.pi / 2, 0), mat_black_trim, vertices=20, parent=w_pivot)
    for b_i in range(8):
        ang = b_i * (2 * math.pi / 8)
        vy = 0.21 * math.cos(ang)
        vz = 0.21 * math.sin(ang)
        add_cyl(f"{w_name}_Vent_{b_i}", 0.028, 0.36, (0, vy, vz), (0, math.pi / 2, 0), mat_black_trim, vertices=12, parent=w_pivot)

# ==============================================================================
# 11. EXPORT OPTIMIZED GLB FOR BHARADEKHI
# ==============================================================================
repo_root = os.path.dirname(os.path.abspath(__file__))
export_target = os.path.join(repo_root, "assets", "models", "dhaka-bus.glb")
os.makedirs(os.path.dirname(export_target), exist_ok=True)

# Also ensure public/models exists and write there as requested in prompt
public_models_dir = os.path.join(repo_root, "public", "models")
os.makedirs(public_models_dir, exist_ok=True)
public_target = os.path.join(public_models_dir, "dhaka-bus.glb")
root_target = os.path.join(repo_root, "dhaka-bus.glb")

bpy.ops.export_scene.gltf(
    filepath=export_target,
    export_format='GLB',
    use_selection=False,
    export_yup=True,
    export_apply=True
)

shutil.copy2(export_target, public_target)
shutil.copy2(export_target, root_target)

print(f"SUCCESS: Exported GTA V Transit Bus to {export_target}")
print(f"SUCCESS: Synchronized to {public_target} and {root_target}")
