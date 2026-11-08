import json

data = json.load(open('scene_dump.json', encoding='utf-8'))
for d in data:
    sx, sy, sz = d['size']
    cx, cy, cz = d['center']
    # Check if object is near (135, 100) or (-140, -100) or near the black discs
    if cy > 10 and (sx > 15 or sy > 15 or sz > 15):
        print(f"center={cx:.1f},{cy:.1f},{cz:.1f} size={sx:.1f},{sy:.1f},{sz:.1f} geom={d.get('geom')} mat={d.get('mat')} name='{d.get('name')}' parent='{d.get('parentName')}'")
