import json

data = json.load(open('scene_dump.json', encoding='utf-8'))
south = [d for d in data if d['center'][2] > 50 and (d['size'][0] > 20 or d['size'][1] > 20 or d['size'][2] > 20)]
print(f"Total south large objects: {len(south)}")
for d in south:
    print(f"name='{d.get('name')}' parent='{d.get('parentName')}' center={d['center']} size={d['size']} mat={d.get('mat')} col={d.get('color')}")
