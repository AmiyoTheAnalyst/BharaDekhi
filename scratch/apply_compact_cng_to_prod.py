import os

with open('scratch/build_compact_cng.py', 'r', encoding='utf-8') as f:
    test_code = f.read()

# Extract createRealisticDhakaCNG function body
fn_start = test_code.find("function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {")
fn_end = test_code.find("// =========================================================================\n    // SCENE & CAMERA INITIALIZATION")

if fn_start == -1 or fn_end == -1:
    print("ERROR: Could not locate function bounds in build_compact_cng.py")
    exit(1)

cng_fn_code = test_code[fn_start:fn_end].strip()

# Also extract helper functions createContinuousSplineLimb and buildRealisticAdultHead
h_start = test_code.find("function createContinuousSplineLimb(")
h_end = fn_start
helpers_code = test_code[h_start:h_end].strip()

# Combine helpers and cng_fn inside the function or together
full_replacement = "  " + helpers_code + "\n\n  " + cng_fn_code

# Read assets/crossroads-3d.js
with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    crossroads = f.read()

target_start = crossroads.find("function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {")
target_end = crossroads.find("function create3DVehicle(type, colorHex, appearanceId, vData) {")

if target_start == -1 or target_end == -1:
    print(f"ERROR: Could not find target boundaries in crossroads-3d.js! start={target_start}, end={target_end}")
    exit(1)

new_crossroads = crossroads[:target_start] + cng_fn_code + "\n\n  " + crossroads[target_end:]

# Wait, we need helpers_code to be available in createRealisticDhakaCNG!
# Let's inspect where helpers_code should go - right inside createRealisticDhakaCNG or right above it!
# Let's place helpers right inside createRealisticDhakaCNG:
cng_with_helpers = "  function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {\n"
cng_body_only = cng_fn_code[cng_fn_code.find("{") + 1 : cng_fn_code.rfind("}")]
full_cng_code = f"""  function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {{
    {helpers_code}

    {cng_body_only.strip()}
  }}"""

new_crossroads = crossroads[:target_start] + full_cng_code + "\n\n  " + crossroads[target_end:]

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(new_crossroads)

print("Successfully updated createRealisticDhakaCNG in assets/crossroads-3d.js")
