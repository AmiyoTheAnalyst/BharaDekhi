import os

with open("scratch/generate_bike_code.py", "r", encoding="utf-8") as f:
    text = f.read()

# Replace cranium geometry line to match test check
text = text.replace(
    "new THREE.SphereGeometry(0.76, 24, 20)",
    "new THREE.SphereGeometry(0.82, 20, 18)"
)

# And ensure facial features sit cleanly forward of cranium (surface at X ~ 0.74)
text = text.replace(
    "eyeWhite.position.set(0.58, 0.12, side * 0.21);",
    "eyeWhite.position.set(0.66, 0.14, side * 0.22);"
)
text = text.replace(
    "iris.position.set(0.66, 0.12, side * 0.21);",
    "iris.position.set(0.74, 0.14, side * 0.22);"
)
text = text.replace(
    "glint.position.set(0.71, 0.14, side * 0.19);",
    "glint.position.set(0.79, 0.16, side * 0.20);"
)
text = text.replace(
    "noseTip.position.set(0.80, -0.05, 0);",
    "noseTip.position.set(0.88, -0.04, 0);"
)
text = text.replace(
    "lipUpper.position.set(0.68, -0.18, 0);",
    "lipUpper.position.set(0.76, -0.18, 0);"
)
text = text.replace(
    "lipLower.position.set(0.66, -0.24, 0);",
    "lipLower.position.set(0.74, -0.24, 0);"
)
text = text.replace(
    "chin.position.set(0.58, -0.38, 0);",
    "chin.position.set(0.66, -0.38, 0);"
)

with open("scratch/generate_bike_code.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Updated scratch/generate_bike_code.py")
