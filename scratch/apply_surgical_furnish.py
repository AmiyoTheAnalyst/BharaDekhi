import re

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update buildRealisticAdultHead: add headGroup.scale.setScalar(1.25)
old_head_return = """      if (isFemale) {
        const bindi = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), bindiMat);
        bindi.rotation.z = Math.PI / 2;
        bindi.position.set(0.53, 0.15, 0);
        headGroup.add(bindi);

        const khopa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), hairMat);
        khopa.scale.set(0.8, 1.0, 1.1);
        khopa.position.set(-0.52, -0.12, 0);
        headGroup.add(khopa);
      }

      return headGroup;
    }"""

new_head_return = """      if (isFemale) {
        const bindi = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), bindiMat);
        bindi.rotation.z = Math.PI / 2;
        bindi.position.set(0.53, 0.15, 0);
        headGroup.add(bindi);

        const khopa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), hairMat);
        khopa.scale.set(0.8, 1.0, 1.1);
        khopa.position.set(-0.52, -0.12, 0);
        headGroup.add(khopa);
      }

      // Proportional adult scale matching authentic reference illustration
      headGroup.scale.setScalar(1.25);

      return headGroup;
    }"""

assert old_head_return in code, "Could not find old_head_return"
code = code.replace(old_head_return, new_head_return, 1)
print("1. Successfully updated buildRealisticAdultHead with 1.25x scale")

# 2. Update puller torso, neck, collar, shoulder dome, arms, lungi overlap, and seat cap
old_puller_block = """    // LOFTED ATHLETIC TORSO IN PLUM SHIRT (#4a2157)
    const pullerTorsoStations = [
      { center: [-0.40, 6.25, 0], rx: 0.80, rz: 1.05 },
      { center: [-0.28, 6.85, 0], rx: 0.75, rz: 0.95 },
      { center: [-0.05, 7.50, 0], rx: 0.88, rz: 1.15 },
      { center: [0.25, 8.15, 0],  rx: 0.95, rz: 1.30 },
      { center: [0.55, 8.65, 0],  rx: 0.70, rz: 1.38 }
    ];
    pullerGroup.add(createLoftedOrganMesh(pullerTorsoStations, 20, plumShirtMat));

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.24, 14), plumShirtMat);
    collar.position.set(0.68, 8.85, 0);
    collar.rotation.z = -0.35;
    pullerGroup.add(collar);

    const pullerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.48, 12), pullerSkinMat);
    pullerNeck.position.set(0.78, 9.05, 0);
    pullerNeck.rotation.z = -0.28;
    pullerGroup.add(pullerNeck);

    const pullerHead = buildRealisticAdultHead(pullerSkinMat, false, true);
    pullerHead.position.set(0.95, 9.60, 0);
    pullerGroup.add(pullerHead);

    [-1, 1].forEach(side => {
      const shoulderPt = [0.45, 8.55, side * 1.15];
      const sleeveEnd = [0.95, 8.05, side * 1.32];
      const elbowPt = [1.70, 7.30, side * 1.55];
      const wristPt = [2.75, 7.02, side * 1.48];
      const gripPt = [2.95, 6.95, side * 1.45];

      pullerGroup.add(createSplineTube([shoulderPt, sleeveEnd], 0.35, plumShirtMat, 8, 8));
      pullerGroup.add(createSplineTube([sleeveEnd, elbowPt, wristPt, gripPt], 0.22, pullerSkinMat, 18, 8));

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.24, 0.30), pullerSkinMat);
      hand.position.set(2.95, 6.95, side * 1.45);
      hand.rotation.z = -0.15;
      pullerGroup.add(hand);
    });

    // LUNGI: Unified waist wrap & draped central fold panel
    const lenThigh = 2.30;
    const lenShin = 2.35;
    const pullerLegs = [];

    const lungiWrapStations = [
      { center: [-0.50, 6.30, 0], rx: 0.90, rz: 1.15 },
      { center: [-0.50, 5.90, 0], rx: 1.05, rz: 1.25 },
      { center: [-0.45, 5.40, 0], rx: 0.98, rz: 1.20 }
    ];
    pullerGroup.add(createLoftedOrganMesh(lungiWrapStations, 18, lungiMat));"""

new_puller_block = """    // LOFTED ATHLETIC TORSO IN PLUM SHIRT (#4a2157)
    // Untucked flared hem extending down to Y=5.92 naturally overlaps the lungi waist
    const pullerTorsoStations = [
      { center: [-0.45, 5.92, 0], rx: 0.95, rz: 1.20 }, // untucked flared hem covering pelvis
      { center: [-0.40, 6.30, 0], rx: 0.82, rz: 1.08 },
      { center: [-0.28, 6.85, 0], rx: 0.75, rz: 0.95 },
      { center: [-0.05, 7.50, 0], rx: 0.88, rz: 1.15 },
      { center: [0.25, 8.15, 0],  rx: 0.95, rz: 1.30 },
      { center: [0.55, 8.65, 0],  rx: 0.70, rz: 1.38 }
    ];
    pullerGroup.add(createLoftedOrganMesh(pullerTorsoStations, 20, plumShirtMat));

    // Smooth rounded clavicle/shoulder dome sealing upper back & chest seams
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
    pullerNeck.position.set(0.74, 8.85, 0);
    pullerNeck.rotation.z = -0.28;
    pullerGroup.add(pullerNeck);

    const pullerHead = buildRealisticAdultHead(pullerSkinMat, false, true);
    pullerHead.position.set(0.95, 9.60, 0);
    pullerGroup.add(pullerHead);

    [-1, 1].forEach(side => {
      const shoulderPt = [0.45, 8.55, side * 1.15];
      const sleeveEnd = [0.95, 8.05, side * 1.32];
      const elbowPt = [1.70, 7.30, side * 1.55];
      const wristPt = [2.75, 7.02, side * 1.48];
      const gripPt = [2.95, 6.95, side * 1.45];

      // Rounded deltoid shoulder cap sealing sleeve junction
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), plumShirtMat);
      shoulderCap.position.set(shoulderPt[0], shoulderPt[1], shoulderPt[2]);
      pullerGroup.add(shoulderCap);

      pullerGroup.add(createSplineTube([shoulderPt, sleeveEnd], 0.32, plumShirtMat, 8, 8));
      pullerGroup.add(createSplineTube([sleeveEnd, elbowPt, wristPt, gripPt], 0.19, pullerSkinMat, 18, 8));

      // Sculpted hand gripping handlebar
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), pullerSkinMat);
      hand.scale.set(1.2, 0.8, 1.0);
      hand.position.set(2.95, 6.95, side * 1.45);
      hand.rotation.z = -0.15;
      pullerGroup.add(hand);
    });

    // LUNGI: Narrowed waist tucked inside shirt hem + sculpted glutes resting on saddle
    const lenThigh = 2.30;
    const lenShin = 2.35;
    const pullerLegs = [];

    const lungiWrapStations = [
      { center: [-0.48, 6.10, 0], rx: 0.76, rz: 0.98 },
      { center: [-0.50, 5.75, 0], rx: 0.88, rz: 1.12 },
      { center: [-0.48, 5.35, 0], rx: 0.82, rz: 1.05 }
    ];
    pullerGroup.add(createLoftedOrganMesh(lungiWrapStations, 18, lungiMat));

    // Smooth rounded glutes contour resting directly on the saddle
    const lungiSeatCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 14, 12),
      lungiMat
    );
    lungiSeatCap.scale.set(0.95, 0.65, 1.15);
    lungiSeatCap.position.set(-0.50, 5.65, 0);
    pullerGroup.add(lungiSeatCap);"""

assert old_puller_block in code, "Could not find old_puller_block"
code = code.replace(old_puller_block, new_puller_block, 1)
print("2. Successfully updated puller torso, neck, collar, shoulder dome, arms, lungi overlap, and seat cap")

# 3. Update Male Passenger: neck sink, deltoid caps, sculpted hands
old_male_block = """    const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.46, 12), maleSkinMat);
    mNeck.position.set(0.12, 2.98, 0);
    maleGroup.add(mNeck);

    const mHead = buildRealisticAdultHead(maleSkinMat, false, true);
    mHead.position.set(0.15, 3.55, 0);
    maleGroup.add(mHead);

    [-0.52, 0.52].forEach(tz => {
      const legPts = [
        [-0.10, 0.0, tz],
        [1.20, 0.05, tz],
        [2.50, 0.0, tz],
        [2.65, -0.75, tz],
        [2.70, -1.55, tz]
      ];
      maleGroup.add(createSplineTube(legPts, 0.30, malePantMat, 20, 8));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.50), brownSandalMat);
      sandal.position.set(2.85, -1.58, tz);
      maleGroup.add(sandal);
    });

    [-0.80, 0.80].forEach(az => {
      const armPts = [
        [0.10, 2.30, az],
        [0.85, 1.25, az * 0.95],
        [1.85, 0.50, az * 0.68],
        [2.45, 0.22, az * 0.65]
      ];
      maleGroup.add(createSplineTube(armPts, 0.19, maleSkinMat, 18, 8));

      const sleevePts = [[0.10, 2.30, az], [0.55, 1.80, az * 0.98]];
      maleGroup.add(createSplineTube(sleevePts, 0.28, maleShirtMat, 8, 8));

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.10, 0.30), maleSkinMat);
      hand.position.set(2.45, 0.26, az * 0.65);
      maleGroup.add(hand);
    });"""

new_male_block = """    // Sunk neck cylinder deep into chest station at Y=2.50
    const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12), maleSkinMat);
    mNeck.position.set(0.12, 2.70, 0);
    maleGroup.add(mNeck);

    const mHead = buildRealisticAdultHead(maleSkinMat, false, true);
    mHead.position.set(0.15, 3.55, 0);
    maleGroup.add(mHead);

    [-0.52, 0.52].forEach(tz => {
      const legPts = [
        [-0.10, 0.0, tz],
        [1.20, 0.05, tz],
        [2.50, 0.0, tz],
        [2.65, -0.75, tz],
        [2.70, -1.55, tz]
      ];
      maleGroup.add(createSplineTube(legPts, 0.30, malePantMat, 20, 8));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.50), brownSandalMat);
      sandal.position.set(2.85, -1.58, tz);
      maleGroup.add(sandal);
    });

    [-0.80, 0.80].forEach(az => {
      // Deltoid shoulder cap
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), maleShirtMat);
      shoulderCap.position.set(0.10, 2.30, az);
      maleGroup.add(shoulderCap);

      const armPts = [
        [0.10, 2.30, az],
        [0.85, 1.25, az * 0.95],
        [1.85, 0.50, az * 0.68],
        [2.45, 0.22, az * 0.65]
      ];
      maleGroup.add(createSplineTube(armPts, 0.17, maleSkinMat, 18, 8));

      const sleevePts = [[0.10, 2.30, az], [0.55, 1.80, az * 0.98]];
      maleGroup.add(createSplineTube(sleevePts, 0.26, maleShirtMat, 8, 8));

      // Sculpted hand resting flat on knee
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), maleSkinMat);
      hand.scale.set(1.1, 0.45, 1.4);
      hand.position.set(2.45, 0.26, az * 0.65);
      maleGroup.add(hand);
    });"""

assert old_male_block in code, "Could not find old_male_block"
code = code.replace(old_male_block, new_male_block, 1)
print("3. Successfully updated Male Passenger: neck sink, deltoid caps, sculpted hands")

# 4. Update Female Passenger: neck sink, forward ghomta cowl, deltoid caps, sculpted hands
old_female_block = """    const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.46, 12), femaleSkinMat);
    fNeck.position.set(0.10, 2.90, 0);
    femaleGroup.add(fNeck);

    const fHead = buildRealisticAdultHead(femaleSkinMat, true, false);
    fHead.position.set(0.12, 3.48, 0);
    femaleGroup.add(fHead);

    // ELEGANT SAREE VEIL (GHOMTA): Framing black hair, crown, and shoulders
    const ghomtaRimPts = [
      new THREE.Vector3(-0.25, 2.40, 0.60),
      new THREE.Vector3(-0.15, 3.35, 0.52),
      new THREE.Vector3(0.05, 4.15, 0.25),
      new THREE.Vector3(0.12, 4.22, 0),
      new THREE.Vector3(0.05, 4.15, -0.25),
      new THREE.Vector3(-0.15, 3.35, -0.52),
      new THREE.Vector3(-0.25, 2.40, -0.60)
    ];
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ghomtaRimPts), 24, 0.08, 8, false),
      femaleSareeMat
    ));

    const ghomtaCowlPts = [
      new THREE.Vector3(-0.10, 4.10, 0),
      new THREE.Vector3(-0.35, 3.60, 0),
      new THREE.Vector3(-0.45, 2.80, 0),
      new THREE.Vector3(-0.40, 2.10, 0)
    ];
    const cowlTube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ghomtaCowlPts), 16, 0.45, 12, false),
      femaleSareeMat
    );
    cowlTube.scale.set(0.8, 1.0, 1.15);
    femaleGroup.add(cowlTube);

    const ancholChestPts = [
      new THREE.Vector3(0.55, 0.80, 0.58),
      new THREE.Vector3(0.65, 1.50, 0.18),
      new THREE.Vector3(0.32, 2.30, -0.40),
      new THREE.Vector3(-0.25, 2.20, -0.58)
    ];
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ancholChestPts), 16, 0.18, 8, false),
      femaleSareeMat
    ));

    const sareeCurvePts = [
      [-0.10, 0.0, 0],
      [1.20, 0.05, 0],
      [2.50, 0.0, 0],
      [2.65, -0.75, 0],
      [2.70, -1.55, 0]
    ];
    const sareeSkirtTube = createSplineTube(sareeCurvePts, 0.84, femaleSkirtMat, 20, 14);
    sareeSkirtTube.scale.set(1.0, 0.70, 1.05);
    femaleGroup.add(sareeSkirtTube);

    const hemBorder = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 1.75), goldTrimMat);
    hemBorder.position.set(2.60, -1.50, 0);
    femaleGroup.add(hemBorder);

    [-0.42, 0.42].forEach(tz => {
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.15, 0.45), pinkSandalMat);
      sandal.position.set(2.75, -1.58, tz);
      femaleGroup.add(sandal);
    });

    [-0.75, 0.75].forEach(az => {
      const armPts = [
        [0.10, 2.25, az],
        [0.80, 1.20, az * 0.85],
        [1.65, 0.50, az * 0.38],
        [2.20, 0.35, 0]
      ];
      femaleGroup.add(createSplineTube(armPts, 0.17, femaleSkinMat, 18, 8));

      femaleGroup.add(createSplineTube([[0.10, 2.25, az], [0.50, 1.75, az * 0.90]], 0.26, femaleSareeMat, 8, 8));

      [0xdc2626, 0xf59e0b, 0x16a34a].forEach((bColor, bIdx) => {
        const bangle = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.028, 6, 14),
          new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.25, metalness: 0.6 })
        );
        bangle.position.set(1.80 + bIdx * 0.07, 0.44, az * 0.24);
        bangle.rotation.y = Math.PI / 2;
        femaleGroup.add(bangle);
      });
    });

    const fHands = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.42), femaleSkinMat);
    fHands.position.set(2.25, 0.36, 0);
    femaleGroup.add(fHands);"""

new_female_block = """    // Sunk neck cylinder deep into chest station at Y=2.40
    const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.65, 12), femaleSkinMat);
    fNeck.position.set(0.10, 2.62, 0);
    femaleGroup.add(fNeck);

    const fHead = buildRealisticAdultHead(femaleSkinMat, true, false);
    fHead.position.set(0.12, 3.48, 0);
    femaleGroup.add(fHead);

    // ELEGANT SAREE VEIL (GHOMTA): Framing black hair, crown, and shoulders snugly
    const ghomtaRimPts = [
      new THREE.Vector3(-0.15, 2.40, 0.60),
      new THREE.Vector3(-0.05, 3.35, 0.52),
      new THREE.Vector3(0.12, 4.15, 0.25),
      new THREE.Vector3(0.18, 4.22, 0),
      new THREE.Vector3(0.12, 4.15, -0.25),
      new THREE.Vector3(-0.05, 3.35, -0.52),
      new THREE.Vector3(-0.15, 2.40, -0.60)
    ];
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ghomtaRimPts), 24, 0.08, 8, false),
      femaleSareeMat
    ));

    // Shifted cowl forward (+0.12) to seal snug against hair bun and crown
    const ghomtaCowlPts = [
      new THREE.Vector3(0.02, 4.10, 0),
      new THREE.Vector3(-0.23, 3.60, 0),
      new THREE.Vector3(-0.33, 2.80, 0),
      new THREE.Vector3(-0.28, 2.10, 0)
    ];
    const cowlTube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ghomtaCowlPts), 16, 0.45, 12, false),
      femaleSareeMat
    );
    cowlTube.scale.set(0.8, 1.0, 1.15);
    femaleGroup.add(cowlTube);

    const ancholChestPts = [
      new THREE.Vector3(0.55, 0.80, 0.58),
      new THREE.Vector3(0.65, 1.50, 0.18),
      new THREE.Vector3(0.32, 2.30, -0.40),
      new THREE.Vector3(-0.25, 2.20, -0.58)
    ];
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ancholChestPts), 16, 0.18, 8, false),
      femaleSareeMat
    ));

    const sareeCurvePts = [
      [-0.10, 0.0, 0],
      [1.20, 0.05, 0],
      [2.50, 0.0, 0],
      [2.65, -0.75, 0],
      [2.70, -1.55, 0]
    ];
    const sareeSkirtTube = createSplineTube(sareeCurvePts, 0.84, femaleSkirtMat, 20, 14);
    sareeSkirtTube.scale.set(1.0, 0.70, 1.05);
    femaleGroup.add(sareeSkirtTube);

    const hemBorder = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 1.75), goldTrimMat);
    hemBorder.position.set(2.60, -1.50, 0);
    femaleGroup.add(hemBorder);

    [-0.42, 0.42].forEach(tz => {
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.15, 0.45), pinkSandalMat);
      sandal.position.set(2.75, -1.58, tz);
      femaleGroup.add(sandal);
    });

    [-0.75, 0.75].forEach(az => {
      // Deltoid saree blouse shoulder cap
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), femaleSareeMat);
      shoulderCap.position.set(0.10, 2.25, az);
      femaleGroup.add(shoulderCap);

      const armPts = [
        [0.10, 2.25, az],
        [0.80, 1.20, az * 0.85],
        [1.65, 0.50, az * 0.38],
        [2.20, 0.35, 0]
      ];
      femaleGroup.add(createSplineTube(armPts, 0.15, femaleSkinMat, 18, 8));

      femaleGroup.add(createSplineTube([[0.10, 2.25, az], [0.50, 1.75, az * 0.90]], 0.24, femaleSareeMat, 8, 8));

      [0xdc2626, 0xf59e0b, 0x16a34a].forEach((bColor, bIdx) => {
        const bangle = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.028, 6, 14),
          new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.25, metalness: 0.6 })
        );
        bangle.position.set(1.80 + bIdx * 0.07, 0.44, az * 0.24);
        bangle.rotation.y = Math.PI / 2;
        femaleGroup.add(bangle);
      });
    });

    // Sculpted delicate hands resting gently in lap
    const fHands = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), femaleSkinMat);
    fHands.scale.set(1.2, 0.45, 1.4);
    fHands.position.set(2.25, 0.36, 0);
    femaleGroup.add(fHands);"""

assert old_female_block in code, "Could not find old_female_block"
code = code.replace(old_female_block, new_female_block, 1)
print("4. Successfully updated Female Passenger: neck sink, forward ghomta cowl, deltoid caps, sculpted hands")

# Write out the updated file
with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("ALL SURGICAL FIXES APPLIED TO assets/crossroads-3d.js SUCCESSFULLY!")
