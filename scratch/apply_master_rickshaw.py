import sys

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Marker 1: Crankset & Pedals
start_marker_crank = "    // Crankset & Pedals\n    const crankGroup = new THREE.Group();"
end_marker_crank = "    group.userData.pedalCrank = crankGroup;"

idx_c1 = content.find(start_marker_crank)
idx_c2 = content.find(end_marker_crank, idx_c1)
if idx_c1 == -1 or idx_c2 == -1:
    print("Error: Crank markers not found")
    sys.exit(1)

new_crank_code = """    // Crankset & Pedals (Bottom Bracket Center: [1.35, 3.3, 0])
    const crankR = 1.35;
    const crankGroup = new THREE.Group();
    crankGroup.position.set(bottomBracket[0], bottomBracket[1], bottomBracket[2]);

    const crankAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.2, 10), chromeMat);
    crankAxle.rotation.x = Math.PI / 2;
    crankGroup.add(crankAxle);

    const chainring = new THREE.Mesh(new THREE.CylinderGeometry(1.10, 1.10, 0.12, 18), chromeMat);
    chainring.rotation.x = Math.PI / 2;
    chainring.position.z = 1.45;
    crankGroup.add(chainring);

    // Left Crank Arm & Level Pedal Platform
    const crankArmL = new THREE.Mesh(new THREE.BoxGeometry(0.32, crankR, 0.18), chromeMat);
    crankArmL.position.set(0, crankR / 2, -1.55);
    crankGroup.add(crankArmL);

    const pedalLGroup = new THREE.Group();
    pedalLGroup.position.set(0, crankR, -1.55);
    const pedalLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.65), rubberMat);
    pedalLMesh.castShadow = true;
    pedalLGroup.add(pedalLMesh);
    crankGroup.add(pedalLGroup);

    // Right Crank Arm & Level Pedal Platform
    const crankArmR = new THREE.Mesh(new THREE.BoxGeometry(0.32, crankR, 0.18), chromeMat);
    crankArmR.position.set(0, -crankR / 2, 1.55);
    crankGroup.add(crankArmR);

    const pedalRGroup = new THREE.Group();
    pedalRGroup.position.set(0, -crankR, 1.55);
    const pedalRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.65), rubberMat);
    pedalRMesh.castShadow = true;
    pedalRGroup.add(pedalRMesh);
    crankGroup.add(pedalRGroup);

    group.add(crankGroup);
    group.userData.pedalCrank = crankGroup;"""

content = content[:idx_c1] + new_crank_code + content[idx_c2 + len(end_marker_crank):]

# Marker 2: Puller & Passengers
start_marker_people = "    // RICKSHAW PULLER (Picture 3 match)\n    const pullerGroup = new THREE.Group();"
end_marker_people = "    group.add(gentGroup);\n\n    return group;"

idx_p1 = content.find(start_marker_people)
idx_p2 = content.find(end_marker_people, idx_p1)
if idx_p1 == -1 or idx_p2 == -1:
    print("Error: People markers not found")
    sys.exit(1)

new_people_code = """    // -------------------------------------------------------------------------
    // TASK 1: SURGICALLY SCALED RICKSHAW PULLER (1.45x) & 100% PEDAL LOCK
    // -------------------------------------------------------------------------
    const pullerGroup = new THREE.Group();
    const pullerSkinMat = new THREE.MeshStandardMaterial({ color: 0x9a5b3a, roughness: 0.65 });
    const pullerHairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const shirtPalette = [0x581c87, 0x0284c7, 0x15803d, 0xd97706];
    const shirtColor = shirtPalette[Math.abs(appearanceSeed || 0) % shirtPalette.length];
    const pullerShirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const pullerLungiMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.75 });
    const pullerGamchaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });

    // Scaled Athletic Torso (1.45x) with forward athletic lean
    const pullerTorso = createOrganicTorso([
      { y: 6.6, x: 0.85, z: 0, rx: 1.15, rz: 0.95 },
      { y: 7.4, x: 1.30, z: 0, rx: 1.25, rz: 1.05 },
      { y: 8.3, x: 1.85, z: 0, rx: 1.35, rz: 1.15 },
      { y: 9.1, x: 2.35, z: 0, rx: 1.45, rz: 1.25 }
    ], pullerShirtMat);
    pullerGroup.add(pullerTorso);

    // Collar
    const pullerCollar = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.12, 8, 14), pullerShirtMat);
    pullerCollar.position.set(2.4, 9.3, 0);
    pullerCollar.rotation.x = Math.PI / 2;
    pullerGroup.add(pullerCollar);

    // Red gamcha draped around neck and chest
    const gamchaPts = [
      new THREE.Vector3(2.5, 9.2, -1.0),
      new THREE.Vector3(2.1, 9.4, 0),
      new THREE.Vector3(2.5, 9.2, 1.0),
      new THREE.Vector3(2.2, 8.0, 0.5),
      new THREE.Vector3(1.8, 7.2, 0.3)
    ];
    const gamchaCurve = new THREE.CatmullRomCurve3(gamchaPts);
    const gamchaMesh = new THREE.Mesh(new THREE.TubeGeometry(gamchaCurve, 16, 0.32, 8, false), pullerGamchaMat);
    gamchaMesh.castShadow = true;
    pullerGroup.add(gamchaMesh);

    // Proportional Head with neat hair & mustache
    const pullerHead = createSculptedHumanHead(pullerSkinMat, pullerHairMat, { mustache: true });
    pullerHead.position.set(2.8, 10.3, 0);
    pullerHead.scale.set(1.15, 1.15, 1.15);
    pullerGroup.add(pullerHead);

    // Natural Bent Arms reaching forward to grips
    const pullerShoulders = [
      { side: -1, z: -1.45, grip: gripL },
      { side: 1, z: 1.45, grip: gripR }
    ];
    pullerShoulders.forEach(s => {
      const shPos = [2.35, 9.05, s.z];
      const elbPos = [3.45, 8.35, s.z * 1.15];
      const handPos = [s.grip[0], s.grip[1], s.grip[2]];

      const shCap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), pullerShirtMat);
      shCap.position.set(shPos[0], shPos[1], shPos[2]);
      pullerGroup.add(shCap);

      pullerGroup.add(createSmoothBoneSegment(shPos, elbPos, 0.44, 0.36, pullerShirtMat));
      pullerGroup.add(createSmoothBoneSegment(elbPos, handPos, 0.36, 0.28, pullerSkinMat));

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), pullerSkinMat);
      hand.position.set(handPos[0], handPos[1], handPos[2]);
      pullerGroup.add(hand);
    });

    // Lungi Wrap around hips & pelvis
    const lungiWrap = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 1.9, 14), pullerLungiMat);
    lungiWrap.position.set(0.85, 6.4, 0);
    lungiWrap.rotation.z = -0.15;
    lungiWrap.castShadow = true;
    pullerGroup.add(lungiWrap);

    const lungiPleat = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.20, 8, 16), pullerLungiMat);
    lungiPleat.position.set(0.85, 6.7, 0);
    lungiPleat.rotation.x = Math.PI / 2;
    pullerGroup.add(lungiPleat);

    // 2-Joint Pedaling Legs with Complete Analytical Inverse Kinematics
    const lenThigh = 2.65;
    const lenShin = 2.55;
    const pullerLegs = [];

    [-1, 1].forEach(side => {
      const hipX = 0.85;
      const hipY = 6.4;
      const hipZ = side * 1.15;

      const legGroup = new THREE.Group();

      const thighGroup = new THREE.Group();
      const thighLungi = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.44, lenThigh * 0.72, 12), pullerLungiMat);
      thighLungi.position.y = lenThigh * 0.14;
      thighLungi.castShadow = true;
      thighGroup.add(thighLungi);

      const thighCuff = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.10, 8, 14), pullerLungiMat);
      thighCuff.position.y = -lenThigh * 0.22;
      thighCuff.rotation.x = Math.PI / 2;
      thighGroup.add(thighCuff);

      const thighSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, lenThigh * 0.32, 10), pullerSkinMat);
      thighSkin.position.y = -lenThigh * 0.34;
      thighGroup.add(thighSkin);

      const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.40, 10, 8), pullerSkinMat);
      const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, lenShin, 10), pullerSkinMat);
      shinMesh.castShadow = true;

      const footGroup = new THREE.Group();
      const sandalSole = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.20, 1.25), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }));
      sandalSole.castShadow = true;
      footGroup.add(sandalSole);

      const footSkin = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.32, 1.0), pullerSkinMat);
      footSkin.position.set(0, 0.22, 0);
      footGroup.add(footSkin);

      legGroup.add(thighGroup);
      legGroup.add(kneeMesh);
      legGroup.add(shinMesh);
      legGroup.add(footGroup);
      pullerGroup.add(legGroup);

      pullerLegs.push({
        side: side,
        hip: new THREE.Vector3(hipX, hipY, hipZ),
        thighGroup: thighGroup,
        kneeMesh: kneeMesh,
        shinMesh: shinMesh,
        footGroup: footGroup
      });
    });

    function updatePullerPedaling(phase) {
      if (crankGroup) {
        crankGroup.rotation.z = phase;
        pedalLGroup.rotation.z = -phase;
        pedalRGroup.rotation.z = -phase;
      }

      pullerLegs.forEach(leg => {
        const legAngle = leg.side === -1 ? phase : phase + Math.PI;
        const pedalLocalX = bottomBracket[0] - Math.sin(legAngle) * crankR;
        const pedalLocalY = bottomBracket[1] + Math.cos(legAngle) * crankR;
        const pedalLocalZ = leg.side * 1.55;

        const target = new THREE.Vector3(pedalLocalX, pedalLocalY + 0.32, pedalLocalZ);
        const hip = leg.hip;
        const D = hip.distanceTo(target);

        const clampedD = Math.max(Math.abs(lenThigh - lenShin) + 0.05, Math.min(lenThigh + lenShin - 0.05, D));
        const alpha = Math.acos((lenThigh * lenThigh + clampedD * clampedD - lenShin * lenShin) / (2 * lenThigh * clampedD));

        const dir = new THREE.Vector3().subVectors(target, hip).normalize();
        const forwardNormal = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
        if (forwardNormal.x < 0) forwardNormal.negate();

        const kneePos = new THREE.Vector3()
          .copy(hip)
          .addScaledVector(dir, Math.cos(alpha) * lenThigh)
          .addScaledVector(forwardNormal, Math.sin(alpha) * lenThigh);

        const thighMid = new THREE.Vector3().addVectors(hip, kneePos).multiplyScalar(0.5);
        leg.thighGroup.position.copy(thighMid);
        const thighDir = new THREE.Vector3().subVectors(kneePos, hip).normalize();
        leg.thighGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), thighDir);

        leg.kneeMesh.position.copy(kneePos);

        const shinMid = new THREE.Vector3().addVectors(kneePos, target).multiplyScalar(0.5);
        leg.shinMesh.position.copy(shinMid);
        const shinDir = new THREE.Vector3().subVectors(target, kneePos).normalize();
        leg.shinMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shinDir);

        leg.footGroup.position.copy(target);
        leg.footGroup.rotation.set(0, 0, 0);
      });
    }

    group.add(pullerGroup);
    group.userData.updatePedaling = updatePullerPedaling;
    updatePullerPedaling(0);

    // -------------------------------------------------------------------------
    // TASK 2: SURGICALLY SCALED PASSENGERS (1.45x) & COMPLETE SEATED LEGS
    // -------------------------------------------------------------------------
    const ladySkinMat = new THREE.MeshStandardMaterial({ color: 0xb5734e, roughness: 0.6 });
    const sareePalette = [0xd97706, 0xbe185d, 0x0d9488, 0x047857];
    const sareeColor = sareePalette[Math.abs((appearanceSeed || 0) + 1) % sareePalette.length];
    const sareeMat = new THREE.MeshStandardMaterial({ color: sareeColor, roughness: 0.55 });
    const sareeBorderMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 });
    const panjabiPalette = [0x7c3aed, 0x0284c7, 0x4338ca, 0x059669];
    const panjabiColor = panjabiPalette[Math.abs(appearanceSeed || 0) % panjabiPalette.length];
    const panjabiMat = new THREE.MeshStandardMaterial({ color: panjabiColor, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.75 });

    // 1. Lady Passenger (Right Side: z = 3.6, against backrest)
    const ladyGroup = new THREE.Group();
    ladyGroup.position.set(-10.4, 9.8, 3.6);

    const ladyTorso = createOrganicTorso([
      { y: 0.0, x: -0.2, z: 0, rx: 1.15, rz: 1.25 },
      { y: 1.1, x: 0.0, z: 0, rx: 1.05, rz: 1.15 },
      { y: 2.2, x: 0.1, z: 0, rx: 1.20, rz: 1.30 },
      { y: 3.1, x: 0.0, z: 0, rx: 1.05, rz: 1.15 }
    ], sareeMat);
    ladyGroup.add(ladyTorso);

    const palluCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 1.2, -0.9),
      new THREE.Vector3(0.5, 2.1, 0.2),
      new THREE.Vector3(0.1, 3.2, 1.1),
      new THREE.Vector3(-0.3, 2.0, 1.3)
    ]);
    ladyGroup.add(new THREE.Mesh(new THREE.TubeGeometry(palluCurve, 16, 0.42, 8, false), sareeBorderMat));

    const ladyHead = createSculptedHumanHead(ladySkinMat, pullerHairMat, { isVeiled: true, bindi: true });
    ladyHead.position.set(0.0, 4.0, 0);
    ladyHead.scale.set(1.15, 1.15, 1.15);
    ladyGroup.add(ladyHead);

    const ladyVeil = new THREE.Mesh(
      new THREE.SphereGeometry(1.02, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      sareeMat
    );
    ladyVeil.position.set(-0.05, 4.05, 0);
    ladyVeil.castShadow = true;
    ladyGroup.add(ladyVeil);

    // Natural resting arms with gold bangles
    ladyGroup.add(createSmoothBoneSegment([0.1, 3.0, -1.2], [1.1, 1.4, -0.5], 0.36, 0.28, sareeMat));
    ladyGroup.add(createSmoothBoneSegment([1.1, 1.4, -0.5], [2.2, 0.8, -0.2], 0.28, 0.24, ladySkinMat));

    ladyGroup.add(createSmoothBoneSegment([0.1, 3.0, 1.2], [1.2, 1.4, 0.8], 0.36, 0.28, sareeMat));
    ladyGroup.add(createSmoothBoneSegment([1.2, 1.4, 0.8], [2.2, 0.8, 0.2], 0.28, 0.24, ladySkinMat));

    const ladyHands = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), ladySkinMat);
    ladyHands.position.set(2.3, 0.8, 0);
    ladyGroup.add(ladyHands);

    [-0.35, 0.35].forEach(bz => {
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 14), goldTrimMat);
      bangle.position.set(2.0, 0.85, bz);
      ladyGroup.add(bangle);
    });

    // Seated Saree Lap & Thighs
    const ladyLap = createOrganicTorso([
      { y: 0.4, x: 0.2, z: 0, rx: 1.15, rz: 1.35 },
      { y: 0.4, x: 2.2, z: 0, rx: 1.25, rz: 1.45 },
      { y: 0.3, x: 4.2, z: 0, rx: 1.20, rz: 1.40 },
      { y: 0.1, x: 5.8, z: 0, rx: 1.10, rz: 1.35 }
    ], sareeMat);
    ladyGroup.add(ladyLap);

    // Saree Pleats down to footboard
    const ladyPleats = createOrganicTorso([
      { y: 0.1, x: 5.8, z: 0, rx: 1.10, rz: 1.35 },
      { y: -1.6, x: 6.8, z: 0, rx: 1.05, rz: 1.30 },
      { y: -3.8, x: 8.0, z: 0, rx: 1.00, rz: 1.25 }
    ], sareeMat);
    ladyGroup.add(ladyPleats);

    const ladyHem = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 8, 16), sareeBorderMat);
    ladyHem.position.set(8.0, -3.8, 0);
    ladyHem.rotation.y = Math.PI / 2;
    ladyGroup.add(ladyHem);

    [-0.55, 0.55].forEach(sz => {
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.55), new THREE.MeshStandardMaterial({ color: 0x9f513b, roughness: 0.7 }));
      sandal.position.set(8.3, -4.38, sz);
      sandal.castShadow = true;
      ladyGroup.add(sandal);
    });

    group.add(ladyGroup);

    // 2. Gentleman Passenger (Left Side: z = -3.6, against backrest)
    const gentGroup = new THREE.Group();
    gentGroup.position.set(-10.4, 9.8, -3.6);

    const gentTorso = createOrganicTorso([
      { y: 0.0, x: -0.2, z: 0, rx: 1.25, rz: 1.45 },
      { y: 1.2, x: 0.0, z: 0, rx: 1.35, rz: 1.55 },
      { y: 2.3, x: 0.1, z: 0, rx: 1.45, rz: 1.65 },
      { y: 3.3, x: 0.0, z: 0, rx: 1.20, rz: 1.35 }
    ], panjabiMat);
    gentGroup.add(gentTorso);

    const gentHead = createSculptedHumanHead(pullerSkinMat, pullerHairMat, { mustache: true });
    gentHead.position.set(0.0, 4.1, 0);
    gentHead.scale.set(1.15, 1.15, 1.15);
    gentGroup.add(gentHead);

    // Left arm resting along thigh
    gentGroup.add(createSmoothBoneSegment([0.1, 3.2, -1.6], [1.1, 1.5, -2.1], 0.42, 0.34, panjabiMat));
    gentGroup.add(createSmoothBoneSegment([1.1, 1.5, -2.1], [2.8, 0.9, -1.6], 0.34, 0.28, pullerSkinMat));
    const gentHandL = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), pullerSkinMat);
    gentHandL.position.set(2.9, 0.9, -1.6);
    gentGroup.add(gentHandL);

    // Right arm resting across knee
    gentGroup.add(createSmoothBoneSegment([0.1, 3.2, 1.5], [1.3, 1.5, 0.8], 0.42, 0.34, panjabiMat));
    gentGroup.add(createSmoothBoneSegment([1.3, 1.5, 0.8], [3.0, 0.9, 0.2], 0.34, 0.28, pullerSkinMat));
    const gentHandR = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 8), pullerSkinMat);
    gentHandR.position.set(3.1, 0.9, 0.2);
    gentGroup.add(gentHandR);

    // Panjabi hem
    const panjabiHem = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.70, 1.2, 14), panjabiMat);
    panjabiHem.position.set(0.5, 0.4, 0);
    panjabiHem.rotation.z = -0.15;
    gentGroup.add(panjabiHem);

    // Trousered legs
    [-0.75, 0.75].forEach(tz => {
      const thigh = createSmoothBoneSegment([0.3, 0.4, tz], [5.8, 0.4, tz], 0.65, 0.52, pantsMat);
      gentGroup.add(thigh);

      const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8), pantsMat);
      kneeCap.position.set(5.8, 0.4, tz);
      gentGroup.add(kneeCap);

      const calf = createSmoothBoneSegment([5.8, 0.4, tz], [8.1, -4.2, tz], 0.50, 0.40, pantsMat);
      gentGroup.add(calf);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.62), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 }));
      shoe.position.set(8.3, -4.38, tz);
      shoe.castShadow = true;
      gentGroup.add(shoe);
    });

    group.add(gentGroup);

    return group;"""

content = content[:idx_p1] + new_people_code + content[idx_p2 + len(end_marker_people):]

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated assets/crossroads-3d.js!")
