import json

data = json.load(open('bike_debug_info.txt', encoding='utf-8'))
children = data.get('bikeChildren', [])
print(f"Total bike children: {len(children)}")
for c in children:
    print(f"name={c['name']:25s} mat={c['mat']:20s} col={c['color']} sz={[round(x,2) for x in c['size']]} cnt={[round(x,2) for x in c['center']]}")
