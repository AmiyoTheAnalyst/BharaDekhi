import json

with open('scene_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total meshes dumped: {len(data)}")
data.sort(key=lambda x: x['size'][0] * x['size'][1] * x['size'][2], reverse=True)
for item in data[:60]:
    name = item.get('name') or item.get('parentName') or 'unnamed'
    print(f"{name:30} size={item['size']} center={item['center']} mat={item.get('mat', '')}")
