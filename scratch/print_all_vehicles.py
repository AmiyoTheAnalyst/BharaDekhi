import json

data = json.load(open('bike_debug_info.txt', encoding='utf-8'))
vehicles = data.get('vehicles', [])
for v in vehicles:
    print(f"id={v['id']:15s} type={v['type']:10s} pos={v.get('pos')} meshPos={v['meshPos']}")
