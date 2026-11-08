import json

with open('scene_dump.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    if item['size'][0] > 250 and item['size'][2] > 250:
        print(json.dumps(item, indent=2))
