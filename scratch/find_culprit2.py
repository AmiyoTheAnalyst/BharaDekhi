import json

with open('scene_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    if abs(item['center'][1] - 47) < 5 and abs(item['center'][0]) < 20:
        print(json.dumps(item, indent=2))
