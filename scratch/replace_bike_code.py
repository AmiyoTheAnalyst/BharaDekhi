import os

js_path = r"assets\crossroads-3d.js"
new_code_path = r"scratch\new_bike_code.js"

with open(js_path, "r", encoding="utf-8") as f:
    full_content = f.read()

with open(new_code_path, "r", encoding="utf-8") as f:
    new_code = f.read().strip()

start_marker = "  // ---------------------------------------------------------------------------\n  // Seamless GTA Motorcycle & Organic Multi-Outfit Rider Factory (Pure Three.js)"
end_marker = "  window.createRealisticGTABike = createRealisticGTABike;"

start_pos = full_content.find(start_marker)
if start_pos == -1:
    # Try finding without exact indentation
    fallback_marker = "// Seamless GTA Motorcycle & Organic Multi-Outfit Rider Factory (Pure Three.js)"
    start_pos = full_content.find(fallback_marker)
    # move back to previous line if it was comment bar
    prev_bar = full_content.rfind("// -----", 0, start_pos)
    if prev_bar != -1 and start_pos - prev_bar < 100:
        start_pos = prev_bar

end_pos = full_content.find(end_marker, start_pos)
if end_pos == -1:
    raise ValueError("End marker not found!")

end_pos += len(end_marker)

print(f"Found block to replace: {start_pos} to {end_pos}")

updated_content = full_content[:start_pos] + new_code + full_content[end_pos:]

with open(js_path, "w", encoding="utf-8") as f:
    f.write(updated_content)

print("assets/crossroads-3d.js successfully updated!")
