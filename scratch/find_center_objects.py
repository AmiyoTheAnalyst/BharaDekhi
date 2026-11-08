import json

with open('scene_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Objects near center (X between -80 and 80, Z between -50 and 80):")
for item in data:
    cx, cy, cz = item['center']
    sx, sy, sz = item['size']
    if abs(cx) < 100 and abs(cz) < 100 and sy > 2:
        print(f"Name: {item.get('name') or item.get('parentName')} size={item['size']} center={item['center']} mat={item.get('mat')}")
