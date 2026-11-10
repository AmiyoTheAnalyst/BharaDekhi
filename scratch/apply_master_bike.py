with open("assets/crossroads-3d.js", "r", encoding="utf-8") as f:
    text = f.read()

marker_start = "window.createCurvedSportsCar = createCurvedSportsCar;\n"
marker_end = "window.createRealisticGTABike = createRealisticGTABike;\n"

pos_start = text.find(marker_start)
if pos_start == -1:
    # maybe it was already cut off
    marker_start_alt = "function createCurvedSportsCar(archetypeIdx) {\n    return createAerodynamicCar(archetypeIdx);\n"
    pos_alt = text.find(marker_start_alt)
    if pos_alt != -1:
        prefix = text[:pos_alt + len(marker_start_alt)] + "  }\n  window.createCurvedSportsCar = createCurvedSportsCar;\n\n"
    else:
        raise ValueError("Could not find start marker!")
else:
    prefix = text[:pos_start + len(marker_start)] + "\n"

pos_end = text.find(marker_end)
if pos_end == -1:
    raise ValueError("Could not find end marker!")
suffix = text[pos_end + len(marker_end):]

with open("scratch/master_bike_code.js", "r", encoding="utf-8") as f:
    bike_code = f.read()

final_text = prefix + bike_code + "\n" + suffix

with open("assets/crossroads-3d.js", "w", encoding="utf-8") as f:
    f.write(final_text)

print("SUCCESS: Perfectly patched assets/crossroads-3d.js!")
