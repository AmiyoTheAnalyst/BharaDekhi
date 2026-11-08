import json
import math

data = json.load(open('scene_dump.json', encoding='utf-8'))

cam_pos = [-19.617, 11.484, 25.16]
cam_look = [0, 5.563, 18.0]

print("Meshes close to cam_pos or cam_look (within 25 units):")
for d in data:
    cx, cy, cz = d['center']
    sx, sy, sz = d['size']
    dist_cam = math.sqrt((cx - cam_pos[0])**2 + (cy - cam_pos[1])**2 + (cz - cam_pos[2])**2)
    dist_look = math.sqrt((cx - cam_look[0])**2 + (cy - cam_look[1])**2 + (cz - cam_look[2])**2)
    if dist_cam < 35 or dist_look < 35:
        # Check if size is significant
        if sx > 2 or sy > 2 or sz > 2:
            print(f"distCam={dist_cam:.1f} distLook={dist_look:.1f} center=[{cx:.1f},{cy:.1f},{cz:.1f}] size=[{sx:.1f},{sy:.1f},{sz:.1f}] name='{d.get('name')}' mat={d.get('mat')}")
