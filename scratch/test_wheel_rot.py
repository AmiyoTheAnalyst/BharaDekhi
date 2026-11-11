import math
from mathutils import Euler, Matrix, Vector, Quaternion

# Initial transform in Three.js:
# Node has rotation quaternion q0 corresponding to Euler(pi/2, 0, 0)
q0 = Euler((math.pi / 2, 0, 0), 'XYZ').to_quaternion()
m0 = q0.to_matrix()

# In Three.js:
# w.rotateOnAxis(axis, angle) multiplies the local quaternion by Quaternion().setFromAxisAngle(axis, angle) from the RIGHT:
# q_new = q * q_rot
# Let's test rotating around local X, local Y, and local Z:
for axis_name, axis_vec in [('local X', Vector((1, 0, 0))), ('local Y', Vector((0, 1, 0))), ('local Z', Vector((0, 0, 1)))]:
    q_rot = Quaternion(axis_vec, 0.2)
    q_new = q0 @ q_rot
    m_new = q_new.to_matrix()
    
    # Front of wheel in world (initially (1, 0, 0)):
    # In local coords, front was (1, 0, 0)
    p_front_world = m_new @ Vector((1, 0, 0))
    # Top of wheel in world (initially (0, 1, 0)):
    # In local coords, top was (0, 0, -1) because m0 @ (0, 0, -1) = (0, 1, 0)
    p_top_world = m_new @ Vector((0, 0, -1))
    
    print(f"Rotate 0.2 around {axis_name}:")
    print(f"  Front in world: {p_front_world.x:.4f}, {p_front_world.y:.4f}, {p_front_world.z:.4f}")
    print(f"  Top in world:   {p_top_world.x:.4f}, {p_top_world.y:.4f}, {p_top_world.z:.4f}")
