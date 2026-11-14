import re

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Replace cone tassels with decorative golden beads
old_tassels = """    const tasselCount = 13;
    for (let t = 0; t < tasselCount; t++) {
      const tz = -canopyHalfW + 0.25 + (t * (canopyHalfW * 2 - 0.50) / (tasselCount - 1));
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.20, 8), goldTrimMat);
      tassel.rotation.z = Math.PI;
      tassel.position.set(frontRimX, frontRimY - 0.10, tz);
      group.add(tassel);
    }"""

new_tassels = """    // Smooth decorative golden bead trim along front canopy rim (authentic, no downward spikes)
    const tasselCount = 15;
    for (let t = 0; t < tasselCount; t++) {
      const tz = -canopyHalfW + 0.20 + (t * (canopyHalfW * 2 - 0.40) / (tasselCount - 1));
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), goldTrimMat);
      bead.position.set(frontRimX, frontRimY - 0.05, tz);
      group.add(bead);
    }"""

assert old_tassels in code, "Could not find old_tassels"
code = code.replace(old_tassels, new_tassels, 1)
print("1. Replaced cone tassels with elegant golden beads")

# 2. Add white eye sclera in buildRealisticAdultHead for expressive lifelike gaze
old_eyes = """      [-0.20, 0.20].forEach(ez => {
        const eyeLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.15), hairMat);
        eyeLine.position.set(0.48, 0.08, ez);
        headGroup.add(eyeLine);

        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.038, 0.17), hairMat);
        brow.position.set(0.46, 0.18, ez);
        brow.rotation.z = -0.15;
        headGroup.add(brow);
      });"""

new_eyes = """      [-0.20, 0.20].forEach(ez => {
        // Expressive white sclera
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        eyeWhite.scale.set(0.65, 0.85, 1.30);
        eyeWhite.position.set(0.48, 0.08, ez);
        headGroup.add(eyeWhite);

        // Dark pupil & lash contour
        const eyeLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.09), hairMat);
        eyeLine.position.set(0.50, 0.08, ez);
        headGroup.add(eyeLine);

        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.038, 0.17), hairMat);
        brow.position.set(0.46, 0.18, ez);
        brow.rotation.z = -0.15;
        headGroup.add(brow);
      });"""

assert old_eyes in code, "Could not find old_eyes"
code = code.replace(old_eyes, new_eyes, 1)
print("2. Added lifelike eye sclera and pupils")

# 3. Add seamless hip sphere cap at puller hipPivot so thigh-lungi connection is seamless
old_hip = """      const hipPivot = new THREE.Group();
      hipPivot.position.set(hipX, hipY, legZ);
      pullerGroup.add(hipPivot);

      const lungiThigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.38, lenThigh, 14),
        lungiMat
      );"""

new_hip = """      const hipPivot = new THREE.Group();
      hipPivot.position.set(hipX, hipY, legZ);
      pullerGroup.add(hipPivot);

      // Seamless rounded hip joint cap in lungi fabric
      const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.40, 12, 10), lungiMat);
      hipPivot.add(hipCap);

      const lungiThigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.38, lenThigh, 14),
        lungiMat
      );"""

assert old_hip in code, "Could not find old_hip"
code = code.replace(old_hip, new_hip, 1)
print("3. Added seamless hip sphere cap for puller lungi")

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("ALL FINISHING TOUCHES APPLIED SUCCESSFULLY!")
