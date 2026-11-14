import os
import subprocess
import re

with open('scratch/test_proportions.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the female ghomta and saree drape with open-face veil and diagonal anchol drape
old_female_ghomta = """    // Smoothly sculpted Saree Anchol / Ghomta (Golden-Ochre #e69d45)
    // Curving smoothly over the crown, back of head, and shoulders
    const ghomtaHoodGeo = new THREE.SphereGeometry(0.70, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const ghomtaHood = new THREE.Mesh(ghomtaHoodGeo, femaleAncholMat);
    ghomtaHood.position.set(0.02, 3.84, 0);
    ghomtaHood.scale.set(0.92, 1.08, 0.98);
    femaleGroup.add(ghomtaHood);

    // Back & Shoulder drape falling from ghomta over chest and back
    const ghomtaDrapeGeo = new THREE.CylinderGeometry(0.85, 1.10, 1.8, 16, 1, true, -Math.PI * 0.30, Math.PI * 0.60);
    const ghomtaDrape = new THREE.Mesh(ghomtaDrapeGeo, femaleAncholMat);
    ghomtaDrape.position.set(-0.15, 2.70, 0);
    femaleGroup.add(ghomtaDrape);"""

new_female_ghomta = """    // Authentically draped Saree Anchol / Ghomta (Golden-Ochre #e69d45)
    // Veils the crown, temples, and back of neck, framing the face openly (eyes, bindi & lips clearly visible!)
    const ghomtaCrownPts = [
      new THREE.Vector3(-0.35, 3.45, -0.62),
      new THREE.Vector3(-0.15, 4.45, -0.45),
      new THREE.Vector3(0.10, 4.55, 0),       // Apex above forehead
      new THREE.Vector3(-0.15, 4.45, 0.45),
      new THREE.Vector3(-0.35, 3.45, 0.62)
    ];
    const ghomtaCrownCurve = new THREE.CatmullRomCurve3(ghomtaCrownPts);
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(ghomtaCrownCurve, 20, 0.12, 8, false),
      femaleAncholMat
    ));

    // Draped cowl behind head & shoulders (open at front face)
    const ghomtaBackGeo = new THREE.SphereGeometry(0.70, 20, 16, Math.PI * 0.40, Math.PI * 1.20, 0, Math.PI * 0.70);
    const ghomtaBack = new THREE.Mesh(ghomtaBackGeo, femaleAncholMat);
    ghomtaBack.position.set(-0.12, 3.85, 0);
    ghomtaBack.scale.set(0.95, 1.08, 1.00);
    femaleGroup.add(ghomtaBack);

    // Soft drape falling down the back of neck onto shoulders
    const ghomtaDrapeGeo = new THREE.CylinderGeometry(0.82, 1.08, 1.6, 16, 1, true, Math.PI * 0.45, Math.PI * 1.10);
    const ghomtaDrape = new THREE.Mesh(ghomtaDrapeGeo, femaleAncholMat);
    ghomtaDrape.position.set(-0.24, 2.65, 0);
    femaleGroup.add(ghomtaDrape);

    // Diagonal Saree Anchol across chest (from right waist over left shoulder)
    const ancholChestPts = [
      new THREE.Vector3(0.60, 0.85, 0.65),
      new THREE.Vector3(0.70, 1.60, 0.20),
      new THREE.Vector3(0.35, 2.50, -0.45),
      new THREE.Vector3(-0.25, 2.40, -0.65)
    ];
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ancholChestPts), 16, 0.22, 8, false),
      femaleAncholMat
    ));"""

if old_female_ghomta in code:
    code = code.replace(old_female_ghomta, new_female_ghomta)
    print("Replaced female ghomta successfully!")
else:
    print("Error: Could not find old_female_ghomta string!")

with open('scratch/test_proportions.py', 'w', encoding='utf-8') as f:
    f.write(code)
