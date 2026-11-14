import re

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove jaw cylinder from buildRealisticAdultHead
old_jaw = """      const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.20, 0.42, 12), skinMat);
      jaw.position.set(0.12, -0.36, 0);
      jaw.rotation.z = 0.25;
      headGroup.add(jaw);

      const hairGeo = new THREE.SphereGeometry(0.58, 24, 20);"""

new_jaw = """      const hairGeo = new THREE.SphereGeometry(0.58, 24, 20);"""

assert old_jaw in code, "Could not find old_jaw"
code = code.replace(old_jaw, new_jaw, 1)
print("1. Successfully removed jaw cylinder from buildRealisticAdultHead")

# 2. Add solid clavicle bridge, centered continuous neck cylinder, and horizontal collar
old_puller_neck_collar = """    // Collar ring seated flush against the top of the shirt (smooth chest, no protruding lump)
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 10, 18), plumShirtMat);
    collar.position.set(0.65, 8.72, 0);
    collar.rotation.z = -0.32;
    pullerGroup.add(collar);

    // Neck cylinder sunk into torso to eliminate any gaps
    const pullerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12), pullerSkinMat);
    pullerNeck.position.set(0.72, 8.85, 0);
    pullerNeck.rotation.z = -0.28;
    pullerGroup.add(pullerNeck);

    const pullerHead = buildRealisticAdultHead(pullerSkinMat, false, true);
    pullerHead.position.set(0.95, 9.60, 0);
    pullerGroup.add(pullerHead);"""

new_puller_neck_collar = """    // Solid smooth upper-chest / clavicle bridge spanning across shoulders (Z: -1.15 to +1.15)
    const clavicleBridge = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 20, 16),
      plumShirtMat
    );
    clavicleBridge.scale.set(0.66, 0.46, 1.62);
    clavicleBridge.position.set(0.48, 8.62, 0);
    clavicleBridge.rotation.z = -0.32;
    pullerGroup.add(clavicleBridge);

    // Single centered continuous neck column (Z = 0 strictly on symmetry plane)
    const neckAngle = 0.44; // ~25° forward lean
    const pullerNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 1.05, 16),
      pullerSkinMat
    );
    pullerNeck.position.set(0.70, 9.05, 0);
    pullerNeck.rotation.z = -neckAngle;
    pullerGroup.add(pullerNeck);

    // Horizontal collar wrapping around the base of the centered neck cylinder
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 10, 24), plumShirtMat);
    collar.position.set(0.56, 8.76, 0);
    const neckDir = new THREE.Vector3(Math.sin(neckAngle), Math.cos(neckAngle), 0).normalize();
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), neckDir);
    pullerGroup.add(collar);

    const pullerHead = buildRealisticAdultHead(pullerSkinMat, false, true);
    pullerHead.position.set(0.95, 9.60, 0);
    pullerGroup.add(pullerHead);"""

assert old_puller_neck_collar in code, "Could not find old_puller_neck_collar"
code = code.replace(old_puller_neck_collar, new_puller_neck_collar, 1)
print("2. Successfully updated puller clavicle bridge, centered neck, and horizontal collar")

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("ALL CHANGES WRITTEN TO assets/crossroads-3d.js!")
