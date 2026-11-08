import bpy
import math
import os
from mathutils import Vector


ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(ROOT, "cycle-rickshaw.glb")


def material(name, color, metallic=0.0, roughness=0.6):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def uv_sphere(name, location, scale, mat, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return assign(obj, mat)


def cylinder_between(name, start, end, radius, mat, vertices=12, radius_end=None):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius if radius_end is None else radius_end,
        radius2=radius,
        depth=direction.length,
        location=(start_v + end_v) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return assign(obj, mat)


def tube(name, points, radius, mat, resolution=2):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return assign(obj, mat)


def cube(name, location, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Soft formed edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    return assign(obj, mat)


def parent_keep_transform(obj, parent):
    matrix = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = matrix


def wheel(name, x, y, z, radius, tire_mat, steel_mat, hub_mat):
    pivot = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (x, y, z)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.055,
        minor_radius=0.055,
        major_segments=48,
        minor_segments=10,
        location=(x, y, z),
        rotation=(math.pi / 2, 0, 0),
    )
    tire = assign(bpy.context.object, tire_mat)
    tire.name = name + "_rubber_tire"
    parent_keep_transform(tire, pivot)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius - 0.105,
        minor_radius=0.014,
        major_segments=48,
        minor_segments=8,
        location=(x, y, z),
        rotation=(math.pi / 2, 0, 0),
    )
    rim = assign(bpy.context.object, steel_mat)
    rim.name = name + "_rim"
    parent_keep_transform(rim, pivot)

    for side in (-1, 1):
        side_y = y + side * 0.045
        bpy.ops.mesh.primitive_torus_add(
            major_radius=radius - 0.15,
            minor_radius=0.012,
            major_segments=40,
            minor_segments=6,
            location=(x, side_y, z),
            rotation=(math.pi / 2, 0, 0),
        )
        spoke_ring = assign(bpy.context.object, steel_mat)
        spoke_ring.name = name + "_spoke_ring"
        parent_keep_transform(spoke_ring, pivot)

        for index in range(24):
            angle = math.tau * index / 24
            endpoint = (
                x + math.cos(angle) * (radius - 0.12),
                side_y,
                z + math.sin(angle) * (radius - 0.12),
            )
            hub = (x, side_y, z)
            spoke = cylinder_between(
                name + "_spoke",
                hub,
                endpoint,
                0.006,
                steel_mat,
                vertices=5,
            )
            parent_keep_transform(spoke, pivot)

    hub = cylinder_between(
        name + "_hub",
        (x, y - 0.09, z),
        (x, y + 0.09, z),
        0.065,
        hub_mat,
        vertices=16,
    )
    parent_keep_transform(hub, pivot)
    return pivot


def canopy_panel(name, x_start, x_end, y_center, y_edge, half_width, mat):
    verts = []
    faces = []
    length_steps = 8
    width_steps = 12
    for row in range(length_steps + 1):
        x = x_start + (x_end - x_start) * row / length_steps
        for column in range(width_steps + 1):
            lateral = -half_width + 2 * half_width * column / width_steps
            arch = (1 - (lateral / half_width) ** 2)
            verts.append((x, lateral, y_edge + (y_center - y_edge) * arch))
    for row in range(length_steps):
        for column in range(width_steps):
            lower = row * (width_steps + 1) + column
            faces.append((lower, lower + width_steps + 1, lower + width_steps + 2, lower + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    solidify = obj.modifiers.new("Canvas thickness", "SOLIDIFY")
    solidify.thickness = 0.018
    return obj


def consolidate_meshes():
    for obj in list(bpy.context.scene.objects):
        if obj.type != "CURVE":
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")

    pivots = [
        obj for obj in bpy.context.scene.objects
        if obj.type == "EMPTY" and (obj.name.startswith("wheel_") or obj.name == "pedal_crank")
    ]
    for parent in [None] + pivots:
        meshes = [
            obj for obj in bpy.context.scene.objects
            if obj.type == "MESH" and obj.parent is parent
        ]
        by_material = {}
        for obj in meshes:
            for modifier in list(obj.modifiers):
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            key = obj.data.materials[0] if obj.data.materials else None
            by_material.setdefault(key, []).append(obj)

        for mat, objects in by_material.items():
            if len(objects) < 2:
                continue
            bpy.ops.object.select_all(action="DESELECT")
            for obj in objects:
                obj.select_set(True)
            active = objects[0]
            bpy.context.view_layer.objects.active = active
            bpy.ops.object.join()
            parent_name = parent.name if parent else "Rickshaw"
            active.name = parent_name + "_" + (mat.name if mat else "detail")


def person(name, center, skin, shirt, trousers, hair, seated=False, scarf=None, cycling=False):
    x, y, z = center
    torso = uv_sphere(name + "_torso", (x, y, z + 0.36), (0.25, 0.19, 0.39), shirt)
    head = uv_sphere(name + "_head", (x + 0.05, y, z + 0.91), (0.17, 0.155, 0.21), skin)
    uv_sphere(name + "_hair", (x + 0.02, y, z + 1.055), (0.18, 0.16, 0.12), hair)
    uv_sphere(name + "_ear_l", (x + 0.05, y - 0.16, z + 0.91), (0.045, 0.04, 0.065), skin)
    uv_sphere(name + "_ear_r", (x + 0.05, y + 0.16, z + 0.91), (0.045, 0.04, 0.065), skin)
    # Eyes and nose face the travel direction (+X).
    eye = material(name + "_eye", (0.055, 0.035, 0.025), roughness=0.4)
    for side in (-1, 1):
        uv_sphere(name + "_eye", (x + 0.196, y + side * 0.055, z + 0.94), (0.025, 0.023, 0.025), eye, 12, 8)
    uv_sphere(name + "_nose", (x + 0.215, y, z + 0.89), (0.045, 0.04, 0.055), skin, 16, 10)

    if seated:
        leg_pairs = [
            ((x + 0.02, y - 0.1, z + 0.13), (x + 0.34, y - 0.1, z + 0.08)),
            ((x + 0.02, y + 0.1, z + 0.13), (x + 0.38, y + 0.1, z + 0.19)),
        ]
    else:
        leg_pairs = [
            ((x + 0.02, y - 0.1, z + 0.1), (x + 0.16, y - 0.11, z - 0.27)),
            ((x + 0.02, y + 0.1, z + 0.1), (x - 0.08, y + 0.11, z - 0.27)),
        ]
    for index, (hip, ankle) in enumerate(leg_pairs):
        if cycling:
            knee = (
                (x - 0.18, y - 0.1, z + 0.02)
                if index == 0
                else (x + 0.1, y + 0.1, z + 0.02)
            )
            ankle = (
                (x - 0.5, y - 0.1, z - 0.38)
                if index == 0
                else (x + 0.18, y + 0.1, z - 0.38)
            )
        else:
            knee = ((hip[0] + ankle[0]) * 0.5, (hip[1] + ankle[1]) * 0.5, z + 0.02)
        cylinder_between(name + "_trouser_leg", hip, knee, 0.09, trousers, 16, 0.12)
        cylinder_between(name + "_trouser_shin", knee, ankle, 0.07, trousers, 16, 0.09)
        uv_sphere(name + "_shoe", (ankle[0] + 0.08, ankle[1], ankle[2] - 0.04), (0.14, 0.075, 0.065), hair)

    if cycling:
        arms = []
    elif seated:
        arms = [
            ((x + 0.04, y - 0.17, z + 0.62), (x + 0.52, y - 0.36, z + 0.45)),
            ((x + 0.04, y + 0.17, z + 0.62), (x + 0.52, y + 0.36, z + 0.45)),
        ]
    else:
        arms = [
            ((x + 0.05, y - 0.2, z + 0.63), (x + 0.21, y - 0.27, z + 0.12)),
            ((x + 0.05, y + 0.2, z + 0.63), (x + 0.21, y + 0.27, z + 0.12)),
        ]
    for shoulder, hand in arms:
        elbow = ((shoulder[0] + hand[0]) * 0.5, (shoulder[1] + hand[1]) * 0.5, (shoulder[2] + hand[2]) * 0.5)
        cylinder_between(name + "_sleeve", shoulder, elbow, 0.07, shirt, 16, 0.09)
        cylinder_between(name + "_forearm", elbow, hand, 0.05, skin, 16, 0.065)
        uv_sphere(name + "_hand", hand, (0.065, 0.06, 0.065), skin, 16, 10)
    if scarf:
        wrap = uv_sphere(name + "_scarf", (x - 0.03, y, z + 0.56), (0.23, 0.22, 0.1), scarf)
        tail = uv_sphere(name + "_scarf_tail", (x - 0.15, y + 0.1, z + 0.33), (0.09, 0.08, 0.28), scarf)
    return torso, head


def build():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    steel = material("Frame | enamelled graphite", (0.055, 0.075, 0.08), 0.72, 0.28)
    chrome = material("Bright nickel and spokes", (0.65, 0.72, 0.7), 0.82, 0.23)
    rubber = material("Road rubber", (0.018, 0.021, 0.024), 0.0, 0.88)
    hub_gold = material("Brass hub caps", (0.66, 0.34, 0.07), 0.72, 0.3)
    teal = material("Hand-painted deep teal", (0.015, 0.29, 0.27), 0.12, 0.45)
    teal_light = material("Hand-painted turquoise", (0.04, 0.68, 0.59), 0.08, 0.45)
    red = material("Vermilion lacquer", (0.78, 0.105, 0.065), 0.1, 0.35)
    gold = material("Folk-art gold", (0.95, 0.57, 0.09), 0.38, 0.32)
    ivory = material("Warm ivory trim", (0.95, 0.83, 0.56), 0.12, 0.38)
    blue = material("Canopy indigo", (0.025, 0.17, 0.7), 0.0, 0.82)
    sky = material("Canopy blue", (0.035, 0.38, 0.92), 0.0, 0.82)
    cyan = material("Canopy turquoise", (0.02, 0.58, 0.65), 0.0, 0.8)
    white = material("Canopy ivory", (0.94, 0.87, 0.71), 0.0, 0.78)
    leather = material("Ox-blood leather", (0.22, 0.055, 0.035), 0.0, 0.54)
    dark = material("Darkened steel", (0.03, 0.04, 0.045), 0.42, 0.38)

    tire_radius = 0.56
    wheel("wheel_front", 1.38, 0, tire_radius, tire_radius, rubber, chrome, hub_gold)
    wheel("wheel_rear_left", -1.13, -0.78, tire_radius, tire_radius, rubber, chrome, hub_gold)
    wheel("wheel_rear_right", -1.13, 0.78, tire_radius, tire_radius, rubber, chrome, hub_gold)

    # Diamond bicycle frame and fork.
    frame = [
        ((1.38, 0, 0.56), (0.12, 0, 0.76)),
        ((0.12, 0, 0.76), (-0.62, 0, 0.62)),
        ((-0.62, 0, 0.62), (-1.13, 0, 0.56)),
        ((-0.62, 0, 0.62), (-0.52, 0, 1.06)),
        ((-0.52, 0, 1.06), (0.12, 0, 0.76)),
        ((0.12, 0, 0.76), (-0.52, 0, 1.06)),
        ((1.38, -0.06, 0.56), (0.91, -0.06, 1.48)),
        ((1.38, 0.06, 0.56), (0.91, 0.06, 1.48)),
    ]
    for start, end in frame:
        tube("Brazed cycle frame", [start, end], 0.035, steel)
    cylinder_between("Front fork crown", (0.91, -0.07, 1.43), (0.91, 0.07, 1.43), 0.065, chrome, 16)

    # Pedal crank and chain ring.
    crank = bpy.data.objects.new("pedal_crank", None)
    bpy.context.collection.objects.link(crank)
    crank.location = (0.12, 0, 0.76)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.13,
        minor_radius=0.018,
        major_segments=32,
        minor_segments=8,
        location=(0.12, 0, 0.76),
        rotation=(math.pi / 2, 0, 0),
    )
    chainring = assign(bpy.context.object, gold)
    parent_keep_transform(chainring, crank)
    for side in (-1, 1):
        crank_arm = cylinder_between(
            "Crank arm",
            (0.12, side * 0.12, 0.76),
            (0.12 + (0.34 if side > 0 else -0.34), side * 0.12, 0.76),
            0.025,
            chrome,
            10,
        )
        parent_keep_transform(crank_arm, crank)
        pedal = cube(
            "Rubber pedal",
            (0.12 + (0.34 if side > 0 else -0.34), side * 0.12, 0.76),
            (0.2, 0.09, 0.035),
            dark,
            0.025,
        )
        parent_keep_transform(pedal, crank)

    # Chain runs on both sides of the rear sprocket.
    for side in (-1, 1):
        tube(
            "Drive chain",
            [
                (0.12, side * 0.16, 0.76),
                (-0.94, side * 0.16, 0.61),
                (-1.02, side * 0.16, 0.59),
            ],
            0.012,
            chrome,
            1,
        )

    # Handlebar, grips, lamps and rear reflector.
    tube("Handlebar stem", [(0.92, 0, 1.45), (1.0, 0, 1.66)], 0.035, chrome)
    tube("Wide handlebar", [(1.0, -0.38, 1.66), (1.0, 0.38, 1.66)], 0.028, steel)
    for side in (-1, 1):
        uv_sphere("Handlebar grip", (1.0, side * 0.36, 1.66), (0.11, 0.045, 0.045), dark)
    lamp = material("Glass headlamp", (0.98, 0.82, 0.48), 0.12, 0.16)
    cube("Headlamp shell", (1.08, 0, 1.34), (0.19, 0.21, 0.18), chrome, 0.055)
    uv_sphere("Headlamp lens", (1.18, 0, 1.34), (0.055, 0.075, 0.075), lamp, 24, 16)
    cube("Rear reflector", (-1.25, 0, 1.06), (0.055, 0.23, 0.1), red, 0.025)

    # Rear passenger carriage frame, suspension and detailed body panels.
    tube("Carriage lower rail left", [(-1.32, -0.88, 0.58), (-0.97, -0.88, 0.77), (-0.23, -0.88, 0.74), (0.02, -0.88, 0.58)], 0.05, steel)
    tube("Carriage lower rail right", [(-1.32, 0.88, 0.58), (-0.97, 0.88, 0.77), (-0.23, 0.88, 0.74), (0.02, 0.88, 0.58)], 0.05, steel)
    for side in (-1, 1):
        y = side * 0.88
        tube("Carriage upright", [(-1.12, y, 0.6), (-1.05, y, 1.15)], 0.035, chrome)
        tube("Carriage front upright", [(-0.2, y, 0.64), (-0.2, y, 1.18)], 0.035, chrome)
        cube("Painted passenger side", (-0.67, y, 0.92), (0.98, 0.045, 0.43), teal, 0.08)
        tube("Gold pinstripe", [(-1.1, y + side * 0.03, 0.75), (-0.95, y + side * 0.03, 0.81), (-0.4, y + side * 0.03, 0.81), (-0.22, y + side * 0.03, 0.73)], 0.018, gold, 1)
        tube("Vermilion pinstripe", [(-1.07, y + side * 0.035, 1.08), (-0.88, y + side * 0.035, 1.13), (-0.43, y + side * 0.035, 1.13), (-0.23, y + side * 0.035, 1.08)], 0.016, red, 1)
        for motif_x in (-0.92, -0.66, -0.4):
            uv_sphere("Hand-painted jewel", (motif_x, y + side * 0.04, 0.92), (0.055, 0.025, 0.055), ivory, 16, 10)
            for petal in range(6):
                angle = petal * math.tau / 6
                uv_sphere(
                    "Painted floral rosette",
                    (motif_x + math.cos(angle) * 0.075, y + side * 0.045, 0.92 + math.sin(angle) * 0.075),
                    (0.027, 0.014, 0.04),
                    gold if petal % 2 == 0 else red,
                    12,
                    8,
                )

    cube("Carriage floor", (-0.67, 0, 0.79), (1.0, 1.62, 0.12), steel, 0.05)
    cube("Passenger seat base", (-0.68, 0, 1.04), (0.73, 1.48, 0.15), leather, 0.08)
    cube("Upholstered seat cushion", (-0.65, 0, 1.14), (0.64, 1.38, 0.13), red, 0.08)
    cube("Carriage backrest", (-1.15, 0, 1.28), (0.13, 1.5, 0.52), teal_light, 0.06)
    cube("Backrest upholstery", (-1.07, 0, 1.29), (0.08, 1.3, 0.34), teal, 0.04)

    # Driver's sprung seat and curved back support.
    cylinder_between("Driver seat post", (-0.2, 0, 0.8), (-0.03, 0, 1.17), 0.035, chrome, 12)
    cube("Driver saddle", (-0.02, 0, 1.18), (0.38, 0.34, 0.11), leather, 0.07)
    tube("Driver back rest", [(-0.2, -0.24, 1.16), (-0.34, -0.28, 1.4), (-0.34, 0.28, 1.4), (-0.2, 0.24, 1.16)], 0.03, chrome)

    # Sculpted curved canopy with stitched segmented panels and a scalloped edge.
    half_width = 1.02
    x_start, x_end = -1.62, 0.08
    panel_mats = [sky, cyan, white, sky, blue, cyan, sky, white]
    for index, panel_mat in enumerate(panel_mats):
        panel_start = x_start + (x_end - x_start) * index / len(panel_mats)
        panel_end = x_start + (x_end - x_start) * (index + 1) / len(panel_mats)
        canopy_panel("Hand-stitched canopy panel", panel_start, panel_end, 2.385, 2.19, half_width, panel_mat)
    tube("Canopy crown seam", [(x_start, 0, 2.405), (x_end, 0, 2.405)], 0.018, ivory, 1)
    for side in (-1, 1):
        y = side * half_width
        tube("Canopy gold piping", [(x_start - 0.02, y, 2.19), (x_end + 0.02, y, 2.19)], 0.027, gold)
        for index in range(13):
            x = x_start + (x_end - x_start) * index / 12
            uv_sphere("Canopy scalloped tassel", (x, y, 2.16), (0.045, 0.028, 0.065), gold, 12, 8)
        tube("Canopy support bow", [(x_start + 0.17, -half_width, 1.32), (x_start + 0.17, -0.55, 2.31), (x_start + 0.17, 0, 2.42), (x_start + 0.17, 0.55, 2.31), (x_start + 0.17, half_width, 1.32)], 0.025, steel)
        tube("Canopy rear bow", [(x_end - 0.08, -half_width, 1.42), (x_end - 0.08, -0.55, 2.31), (x_end - 0.08, 0, 2.42), (x_end - 0.08, 0.55, 2.31), (x_end - 0.08, half_width, 1.42)], 0.025, steel)
        cylinder_between("Canopy post", (-1.02, side * 0.88, 1.12), (-1.02, side * 0.88, 2.18), 0.025, chrome, 10)
        cylinder_between("Canopy front post", (-0.15, side * 0.88, 1.18), (-0.15, side * 0.88, 2.19), 0.025, chrome, 10)

    # Hand-painted flower medallions on the passenger back and rear valance.
    cube("Rear decorative valance", (-1.3, 0, 0.91), (0.08, 1.64, 0.32), red, 0.04)
    for side in (-1, 1):
        y = side * 0.055
        for z_offset in (-0.42, 0, 0.42):
            uv_sphere("Rear gold rosette center", (-1.35, y, 0.91 + z_offset), (0.025, 0.055, 0.055), gold, 16, 10)
            for petal in range(8):
                angle = petal * math.tau / 8
                uv_sphere(
                    "Rear hand-painted petal",
                    (-1.35, y + math.cos(angle) * 0.07, 0.91 + z_offset + math.sin(angle) * 0.07),
                    (0.022, 0.028, 0.05),
                    ivory if petal % 2 == 0 else gold,
                    12,
                    8,
                )

    # Seated occupants are shaped and layered as separate, textured meshes.
    driver_skin = material("Driver | warm brown skin", (0.37, 0.18, 0.1), 0.0, 0.72)
    driver_shirt = material("Driver | indigo cotton shirt", (0.12, 0.22, 0.52), 0.0, 0.86)
    driver_trousers = material("Driver | charcoal trousers", (0.075, 0.09, 0.13), 0.0, 0.87)
    passenger_skin_a = material("Passenger | medium brown skin", (0.47, 0.25, 0.14), 0.0, 0.73)
    passenger_skin_b = material("Passenger | warm brown skin", (0.32, 0.14, 0.08), 0.0, 0.75)
    passenger_shirt_a = material("Passenger | saffron cotton", (0.76, 0.3, 0.07), 0.0, 0.86)
    passenger_shirt_b = material("Passenger | rose cotton", (0.52, 0.08, 0.2), 0.0, 0.86)
    passenger_trousers = material("Passenger | dark cotton", (0.08, 0.1, 0.15), 0.0, 0.88)
    hair = material("Natural dark hair", (0.025, 0.018, 0.014), 0.0, 0.88)
    scarf = material("Passenger | saffron orna", (0.92, 0.49, 0.08), 0.0, 0.82)

    person("Driver", (0.28, 0, 1.14), driver_skin, driver_shirt, driver_trousers, hair, seated=True, cycling=True)
    person("Passenger left", (-0.69, -0.36, 1.18), passenger_skin_a, passenger_shirt_a, passenger_trousers, hair, seated=False)
    person("Passenger right", (-0.69, 0.36, 1.18), passenger_skin_b, passenger_shirt_b, passenger_trousers, hair, seated=False, scarf=scarf)

    # The driver reaches and holds the handlebar grips.
    for side in (-1, 1):
        tube("Driver sleeve", [(0.44, side * 0.13, 1.75), (0.82, side * 0.28, 1.65)], 0.08, driver_shirt)
        tube("Driver forearm", [(0.82, side * 0.28, 1.65), (1.0, side * 0.34, 1.66)], 0.05, driver_skin)
        uv_sphere("Driver hand on grip", (1.0, side * 0.36, 1.66), (0.075, 0.055, 0.06), driver_skin, 16, 10)

    # Front and rear mudguards, with rolled edges and structural stays.
    for side in (-1, 1):
        y = side * 0.82
        tube("Rear wheel mudguard", [(-1.72, y, 0.6), (-1.62, y, 0.93), (-1.3, y, 1.12), (-0.96, y, 0.99), (-0.68, y, 0.68)], 0.035, teal_light)
        tube("Rear mudguard stay", [(-1.13, y, 0.6), (-1.42, y, 0.79)], 0.018, chrome)
    tube("Front mudguard", [(1.05, -0.13, 0.58), (1.18, -0.13, 0.91), (1.42, -0.13, 1.05), (1.63, -0.13, 0.88), (1.72, -0.13, 0.58)], 0.035, red)

    # Keep animation pivots while merging static meshes into material batches.
    consolidate_meshes()
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = None
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_lights=False,
        export_cameras=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    print("EXPORTED", OUTPUT)
    print("OBJECTS", len(bpy.context.scene.objects))


build()
