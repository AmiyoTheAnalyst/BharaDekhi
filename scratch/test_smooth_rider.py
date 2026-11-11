import bpy
import bmesh
import math

def create_lofted_tube(name, points, radii, mat, segs=12):
    bm = bmesh.new()
    rings = []
    for i, (pt, r) in enumerate(zip(points, radii)):
        # Calculate local tangent
        if i < len(points) - 1:
            tang = [points[i+1][j] - pt[j] for j in range(3)]
        else:
            tang = [pt[j] - points[i-1][j] for j in range(3)]
        # Normalize
        L = math.sqrt(sum(c*c for c in tang))
        if L > 0:
            tang = [c/L for c in tang]
        else:
            tang = [1, 0, 0]
        
        # Find two perpendicular vectors
        up = [0, 0, 1] if abs(tang[2]) < 0.9 else [0, 1, 0]
        # v1 = tang x up
        v1 = [tang[1]*up[2] - tang[2]*up[1], tang[2]*up[0] - tang[0]*up[2], tang[0]*up[1] - tang[1]*up[0]]
        L1 = math.sqrt(sum(c*c for c in v1))
        v1 = [c/L1 for c in v1]
        # v2 = v1 x tang
        v2 = [v1[1]*tang[2] - v1[2]*tang[1], v1[2]*tang[0] - v1[0]*tang[2], v1[0]*tang[1] - v1[1]*tang[0]]

        ring = []
        for s in range(segs):
            ang = 2 * math.pi * s / segs
            cx = math.cos(ang) * r
            cy = math.sin(ang) * r
            vx = pt[0] + cx * v1[0] + cy * v2[0]
            vy = pt[1] + cx * v1[1] + cy * v2[1]
            vz = pt[2] + cx * v1[2] + cy * v2[2]
            ring.append(bm.verts.new((vx, vy, vz)))
        rings.append(ring)

    # Connect rings with quads
    for i in range(len(rings) - 1):
        r1 = rings[i]
        r2 = rings[i+1]
        for s in range(segs):
            s_next = (s + 1) % segs
            bm.faces.new([r1[s], r2[s], r2[s_next], r1[s_next]])

    # Caps
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj
