with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    code = f.read()

# -----------------------------------------------------------------------------
# Task 1.1: Remove chin sphere from buildRealisticAdultHead
# -----------------------------------------------------------------------------
old_chin = """      const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.20, 0.42, 12), skinMat);
      jaw.position.set(0.12, -0.36, 0);
      jaw.rotation.z = 0.25;
      headGroup.add(jaw);

      const chin = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), skinMat);
      chin.position.set(0.25, -0.50, 0);
      headGroup.add(chin);"""

new_chin = """      const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.20, 0.42, 12), skinMat);
      jaw.position.set(0.12, -0.36, 0);
      jaw.rotation.z = 0.25;
      headGroup.add(jaw);"""

assert old_chin in code, "Could not find old_chin in assets/crossroads-3d.js"
code = code.replace(old_chin, new_chin, 1)
print("1.1 Successfully removed chin sphere from buildRealisticAdultHead")

# -----------------------------------------------------------------------------
# Task 1.2: Smooth puller chest (remove protruding shoulder dome lump) & adjust collar
# -----------------------------------------------------------------------------
old_puller_chest = """    // Smooth rounded clavicle/shoulder dome sealing upper back & chest seams
    const pullerShoulderDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 16, 12),
      plumShirtMat
    );
    pullerShoulderDome.scale.set(1.10, 0.70, 1.35);
    pullerShoulderDome.position.set(0.55, 8.65, 0);
    pullerShoulderDome.rotation.z = -0.32;
    pullerGroup.add(pullerShoulderDome);

    // Collar ring seated flush against the shirt shoulder dome
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 10, 18), plumShirtMat);
    collar.position.set(0.68, 8.78, 0);
    collar.rotation.z = -0.32;
    pullerGroup.add(collar);

    // Neck cylinder sunk deeply into shoulder dome to eliminate any gaps
    const pullerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12), pullerSkinMat);
    pullerNeck.position.set(0.74, 8.85, 0);"""

new_puller_chest = """    // Collar ring seated flush against the top of the shirt (smooth chest, no protruding lump)
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 10, 18), plumShirtMat);
    collar.position.set(0.65, 8.72, 0);
    collar.rotation.z = -0.32;
    pullerGroup.add(collar);

    // Neck cylinder sunk into torso to eliminate any gaps
    const pullerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12), pullerSkinMat);
    pullerNeck.position.set(0.72, 8.85, 0);"""

assert old_puller_chest in code, "Could not find old_puller_chest in assets/crossroads-3d.js"
code = code.replace(old_puller_chest, new_puller_chest, 1)
print("1.2 Successfully smoothed puller chest and adjusted collar/neck")

# -----------------------------------------------------------------------------
# Task 1.3: Lower Male Passenger collar ring flush to top of shirt
# -----------------------------------------------------------------------------
old_male_collar = """    const mCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.22, 14), maleShirtMat);
    mCollar.position.set(0.12, 2.70, 0);
    maleGroup.add(mCollar);"""

new_male_collar = """    // Collar seated flush against top of shirt at Y=2.50
    const mCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.22, 14), maleShirtMat);
    mCollar.position.set(0.12, 2.52, 0);
    maleGroup.add(mCollar);"""

assert old_male_collar in code, "Could not find old_male_collar in assets/crossroads-3d.js"
code = code.replace(old_male_collar, new_male_collar, 1)
print("1.3 Successfully lowered Male Passenger collar ring to Y=2.52")

# -----------------------------------------------------------------------------
# Task 2: Replace tilted cylinder wheel center with clean circular hub
# -----------------------------------------------------------------------------
old_wheel_hub = """      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.9, 14), chromeMat);
      hub.rotation.z = Math.PI / 2;
      hub.castShadow = true;
      wheel.add(hub);"""

new_wheel_hub = """      // Clean circular hub centered at (0, 0, 0)
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), chromeMat);
      hub.scale.set(1.0, 1.0, 1.35);
      hub.castShadow = true;
      wheel.add(hub);"""

assert old_wheel_hub in code, "Could not find old_wheel_hub in assets/crossroads-3d.js"
code = code.replace(old_wheel_hub, new_wheel_hub, 1)
print("2. Successfully replaced tilted cylinder with clean circular hub")

# -----------------------------------------------------------------------------
# Task 3: Fix front and rear mudguard positions matching reference arch
# -----------------------------------------------------------------------------
old_fenders = """    // Fenders
    const fFenderGeo = new THREE.TorusGeometry(wheelRadius + 0.22, 0.22, 8, 28, Math.PI * 0.65);
    const fFender = new THREE.Mesh(fFenderGeo, frameMat);
    fFender.rotation.z = Math.PI * 0.66;
    fFender.position.set(frontAxleX, wheelRadius, 0);
    group.add(fFender);

    [-wheelZ, wheelZ].forEach(z => {
      const rFenderGeo = new THREE.TorusGeometry(wheelRadius + 0.22, 0.22, 8, 28, Math.PI * 0.70);
      const rFender = new THREE.Mesh(rFenderGeo, goldTrimMat);
      rFender.rotation.z = Math.PI * 0.60;
      rFender.position.set(rearAxleX, wheelRadius, z);
      group.add(rFender);
    });"""

new_fenders = """    // Fenders
    // Front mudguard: attaches at fork crown, sweeping over top crest down the rear side facing the frame
    const fFenderGeo = new THREE.TorusGeometry(wheelRadius + 0.16, 0.18, 8, 28, Math.PI * 0.75);
    const fFender = new THREE.Mesh(fFenderGeo, frameMat);
    fFender.rotation.z = Math.PI * 0.38;
    fFender.position.set(frontAxleX, wheelRadius, 0);
    group.add(fFender);

    // Rear mudguards: top-center upper arch centered at 12 o'clock, shielding upper hemisphere of tires
    [-wheelZ, wheelZ].forEach(z => {
      const rFenderGeo = new THREE.TorusGeometry(wheelRadius + 0.18, 0.18, 8, 28, Math.PI * 0.85);
      const rFender = new THREE.Mesh(rFenderGeo, goldTrimMat);
      rFender.rotation.z = Math.PI * 0.075;
      rFender.position.set(rearAxleX, wheelRadius, z);
      group.add(rFender);
    });"""

assert old_fenders in code, "Could not find old_fenders in assets/crossroads-3d.js"
code = code.replace(old_fenders, new_fenders, 1)
print("3. Successfully fixed front and rear mudguard positions")

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("ALL 3 TASKS APPLIED TO assets/crossroads-3d.js SUCCESSFULLY!")
