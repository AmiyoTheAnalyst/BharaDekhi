import json

data = json.load(open('bike_debug_info.txt', encoding='utf-8'))
for idx, hit in enumerate(data.get('hitsAtScreenCenter', [])):
    print(f"--- HIT {idx}: {hit['name']} mat={hit['mat']} dist={hit['distance']:.2f} point={[round(p,2) for p in hit['point'].values()]} ---")
    for node in hit.get('chain', []):
        print(f"   node: {node['name']} ({node['type']}) pos={[round(p,2) for p in node['pos'].values()]}")
