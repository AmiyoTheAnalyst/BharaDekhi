import re
import os

with open("assets/crossroads-3d.js", "r", encoding="utf-8") as f:
    content = f.read()

# Check start and end of createRealisticGTABike
start_marker = "  function createRealisticGTABike(colorHex, appearanceSeed, vData) {"
end_marker = "  window.createRealisticGTABike = createRealisticGTABike;"

if start_marker not in content:
    print("ERROR: start_marker not found")
    exit(1)

if end_marker not in content:
    print("ERROR: end_marker not found")
    exit(1)

print("Found markers successfully.")
