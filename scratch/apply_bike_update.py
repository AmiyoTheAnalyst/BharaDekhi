import re

with open("assets/crossroads-3d.js", "r", encoding="utf-8") as f:
    original = f.read()

with open("scratch/new_bike_code.js", "r", encoding="utf-8") as f:
    new_code = f.read().strip()

start_marker = "function createRealisticGTABike(colorHex, appearanceSeed, vData) {"
end_marker = "window.createRealisticGTABike = createRealisticGTABike;"

idx_start = original.find(start_marker)
if idx_start == -1:
    idx_start = original.find("  " + start_marker)

if idx_start == -1:
    print("ERROR: start_marker not found")
    exit(1)

idx_end = original.find(end_marker, idx_start)
if idx_end == -1:
    print("ERROR: end_marker not found")
    exit(1)

updated = original[:idx_start] + "  " + new_code + "\n\n  " + original[idx_end:]

with open("assets/crossroads-3d.js", "w", encoding="utf-8") as f:
    f.write(updated)

print("SUCCESS: Replaced createRealisticGTABike in assets/crossroads-3d.js")
