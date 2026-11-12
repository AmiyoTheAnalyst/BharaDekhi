import sys

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "    const saddle = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 2.2), rubberMat);"
end_marker = "    group.add(gentGroup);\n\n    return group;"

idx_start = content.find(start_marker)
idx_end = content.find(end_marker, idx_start)

if idx_start == -1 or idx_end == -1:
    print(f"Error: Markers not found! idx_start={idx_start}, idx_end={idx_end}")
    sys.exit(1)

new_code = """    // Realistic compact saddle under hips
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 1.4), rubberMat);
    saddle.position.set(0.75, 5.85, 0);
    group.add(saddle);

    // -------------------------------------------------------------------------
    // CRANKSET & PEDALS
    // -------------------------------------------------------------------------
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

    const crankArmL = new THREE.Mesh(new THREE.BoxGeometry(0.32, crankR, 0.18), chromeMat);
    crankArmL.position.set(0, crankR / 2, -1.55);
    crankGroup.add(crankArmL);

    const pedalLGroup = new THREE.Group();
    pedalLGroup.position.set(0, crankR, -1.55);
    const pedalLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.65), rubberMat);
    pedalLMesh.castShadow = true;
    pedalLGroup.add(pedalLMesh);
    crankGroup.add(pedalLGroup);

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
    group.userData.pedalCrank = crankGroup;

    // -------------------------------------------------------------------------
    // TASK 1: RECESSED FOOTWELL & LOWERED INNER SEAT BENCH (ZERO WALL CLIPPING)
    // -------------------------------------------------------------------------
    const yellowWallMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.1 });
    const tealTrimMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.35, metalness: 0.1 });

    // Left & Right Yellow Outer Walls (keep full height at z = +-7.3)
    [-1, 1].forEach(side => {
      const sideShape = new THREE.Shape();
      sideShape.moveTo(-12.8, 5.4);
      sideShape.lineTo(-3.6, 5.4);
      sideShape.lineTo(-3.6, 8.2);
      sideShape.lineTo(-6.2, 9.4);
      sideShape.lineTo(-12.8, 9.4);
      sideShape.closePath();

      const sideGeo = new THREE.ExtrudeGeometry(sideShape, {
        depth: 0.5,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.15,
        bevelThickness: 0.15
      });
      sideGeo.translate(0, 0, side === 1 ? 6.9 : -7.4);
      const sideWall = new THREE.Mesh(sideGeo, yellowWallMat);
      sideWall.castShadow = true;
      group.add(sideWall);

      // Gold top rail on each side
      const sideRail = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.35, 0.45), goldTrimMat);
      sideRail.position.set(-8.0, 9.4, side * 7.3);
      group.add(sideRail);

      // Chrome armrest arch
      const armPts = [
        new THREE.Vector3(-12.2, 9.4, side * 7.3),
        new THREE.Vector3(-7.8, 11.2, side * 7.3),
        new THREE.Vector3(-3.8, 9.4, side * 7.3)
      ];
      const armCurve = new THREE.CatmullRomCurve3(armPts);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 14, 0.24, 8, false), chromeMat));
    });

    // Rear outer back wall
    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.0, 14.2), yellowWallMat);
    rearWall.position.set(-12.6, 7.4, 0);
    rearWall.castShadow = true;
    group.add(rearWall);

    // Carriage Floor under seat
    const carriageFloor = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.4, 14.0), yellowWallMat);
    carriageFloor.position.set(-8.0, 5.2, 0);
    group.add(carriageFloor);

    // Extended Brown Wooden Footboard (Platform where shins and sandals land inside footwell)
    const footboard = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.45, 14.0), woodFloorMat);
    footboard.position.set(-3.2, 5.2, 0);
    footboard.castShadow = true;
    group.add(footboard);

    // Recessed Seat Base Riser (Front of the seat box, recessed back at x = -6.2)
    const seatRiser = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 13.8), yellowWallMat);
    seatRiser.position.set(-6.2, 6.2, 0);
    seatRiser.castShadow = true;
    group.add(seatRiser);

    // LOWERED INTERIOR SEAT CUSHION (Lowered by ~35% down to y = 7.45)
    // Seat surface: y = 7.45. Hips sit below armrests/side walls!
    const benchPad = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.7, 13.8), tealTrimMat);
    benchPad.position.set(-8.7, 7.1, 0);
    benchPad.castShadow = true;
    group.add(benchPad);

    // Studded Red Backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.8, 13.8), seatRedMat);
    backrest.position.set(-11.8, 10.4, 0);
    backrest.castShadow = true;
    group.add(backrest);

    for (let bx = -5.5; bx <= 5.5; bx += 2.75) {
      for (let by = 8.4; by <= 12.6; by += 1.4) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), goldTrimMat);
        stud.position.set(-11.15, by, bx);
        group.add(stud);
      }
    }

    // Backboard Art Plate
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.5, 14.8), hoodArtMat);
    backboard.position.set(-12.6, 7.4, 0);
    backboard.castShadow = true;
    group.add(backboard);

    // Folding Canopy Hood
    const canopyCenterX = -7.5;
    const canopyBaseY = 12.5;
    const canopyRx = 6.2;
    const canopyRy = 6.8;
    const canopyWidth = 8.2;

    const segs = 18;
    const posArr = [];
    const uvArr = [];
    const idxArr = [];
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const ang = Math.PI * (0.05 + 0.90 * u);
      const x = canopyCenterX + Math.cos(ang) * canopyRx;
      const y = canopyBaseY + Math.sin(ang) * canopyRy;
      posArr.push(x, y, -canopyWidth);
      posArr.push(x, y, canopyWidth);
      uvArr.push(u, 0);
      uvArr.push(u, 1);
      if (s < segs) {
        const v = s * 2;
        idxArr.push(v, v + 1, v + 2);
        idxArr.push(v + 1, v + 3, v + 2);
      }
    }
    const canopyGeo = new THREE.BufferGeometry();
    canopyGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    canopyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    canopyGeo.setIndex(idxArr);
    canopyGeo.computeVertexNormals();

    const canopyMesh = new THREE.Mesh(canopyGeo, hoodArtMat);
    canopyMesh.castShadow = true;
    group.add(canopyMesh);

    // Canopy Ribs
    for (let r = 0; r <= 5; r++) {
      const ru = r / 5;
      const rang = Math.PI * (0.05 + 0.90 * ru);
      const rx = canopyCenterX + Math.cos(rang) * canopyRx;
      const ry = canopyBaseY + Math.sin(rang) * canopyRy;
      const ribPts = [new THREE.Vector3(rx, ry, -canopyWidth), new THREE.Vector3(rx, ry, canopyWidth)];
      group.add(createSmoothBoneSegment(ribPts[0].toArray(), ribPts[1].toArray(), 0.16, 0.16, chromeMat));
    }

    // Fringe Tassels
    const frontRimX = canopyCenterX + Math.cos(Math.PI * 0.05) * canopyRx;
    const frontRimY = canopyBaseY + Math.sin(Math.PI * 0.05) * canopyRy;
    const tasselCount = 13;
    for (let t = 0; t < tasselCount; t++) {
      const tz = -canopyWidth + 0.6 + (t * (canopyWidth * 2 - 1.2) / (tasselCount - 1));
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.95, 6), goldTrimMat);
      tassel.rotation.z = Math.PI;
      tassel.position.set(frontRimX, frontRimY - 0.55, tz);
      group.add(tassel);
    }

    // -------------------------------------------------------------------------
    // TASK 2.1: RICKSHAW PULLER (NO DONUTS, TAPERED LUNGI, CONNECTED JOINTS)
    // -------------------------------------------------------------------------
    const pullerGroup = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x9e6b55, roughness: 0.68 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const plumShirtMat = new THREE.MeshStandardMaterial({ color: 0x5b2c6f, roughness: 0.65 }); // Dark Plum #5b2c6f
    const blueLungiMat = new THREE.MeshStandardMaterial({ color: 0x3b5998, roughness: 0.75 }); // Blue Checkered #3b5998
    const brownSandalMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });

    // 1. Torso: Single smooth tapered cylinder angled forward ~25°
    const torsoLen = 2.8;
    const torsoGeo = new THREE.CylinderGeometry(1.20, 1.05, torsoLen, 16);
    torsoGeo.translate(0, torsoLen / 2, 0);
    const pullerTorso = new THREE.Mesh(torsoGeo, plumShirtMat);
    pullerTorso.position.set(0.85, 6.3, 0);
    pullerTorso.rotation.z = -0.44; // ~25° forward lean
    pullerTorso.castShadow = true;
    pullerGroup.add(pullerTorso);

    const chestX = 0.85 + Math.sin(0.44) * torsoLen; // ~2.04
    const chestY = 6.3 + Math.cos(0.44) * torsoLen;  // ~8.83

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.35, 14), plumShirtMat);
    collar.position.set(chestX, chestY, 0);
    collar.rotation.z = -0.44;
    pullerGroup.add(collar);

    // 2. Head & Hair Cap: Proportionate sphere with fitted hair cap (zero gap)
    const pullerHead = new THREE.Mesh(new THREE.SphereGeometry(0.70, 16, 14), skinMat);
    pullerHead.position.set(chestX + 0.35, chestY + 0.85, 0);
    pullerHead.castShadow = true;

    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hairMat
    );
    hairCap.position.set(-0.02, 0.05, 0);
    hairCap.castShadow = true;
    pullerHead.add(hairCap);

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.22, 0.22].forEach(ez => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeWhiteMat);
      eye.position.set(0.55, 0.06, ez);
      pullerHead.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), hairMat);
      pupil.position.set(0.60, 0.06, ez);
      pullerHead.add(pupil);
    });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 8), skinMat);
    nose.rotation.z = -Math.PI / 2 + 0.2;
    nose.position.set(0.62, -0.05, 0);
    pullerHead.add(nose);

    const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 8), hairMat);
    stache.rotation.x = Math.PI / 2;
    stache.position.set(0.60, -0.16, 0);
    pullerHead.add(stache);

    pullerGroup.add(pullerHead);

    // 3. Connected Arms (Shoulder joint -> Upper Arm -> Elbow joint -> Forearm -> Hand)
    const shoulders = [
      { side: -1, z: -1.35, grip: gripL },
      { side: 1, z: 1.35, grip: gripR }
    ];
    shoulders.forEach(s => {
      const shPos = [chestX, chestY - 0.1, s.z];
      const elbPos = [3.2, 7.9, s.z * 1.18];
      const handPos = [s.grip[0], s.grip[1], s.grip[2]];

      const shBall = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), plumShirtMat);
      shBall.position.set(shPos[0], shPos[1], shPos[2]);
      shBall.castShadow = true;
      pullerGroup.add(shBall);

      pullerGroup.add(createSmoothBoneSegment(shPos, elbPos, 0.38, 0.32, plumShirtMat));

      const elbBall = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8), plumShirtMat);
      elbBall.position.set(elbPos[0], elbPos[1], elbPos[2]);
      elbBall.castShadow = true;
      pullerGroup.add(elbBall);

      pullerGroup.add(createSmoothBoneSegment(elbPos, handPos, 0.31, 0.25, skinMat));

      const handBall = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skinMat);
      handBall.position.set(handPos[0], handPos[1], handPos[2]);
      handBall.castShadow = true;
      pullerGroup.add(handBall);
    });

    // 4. Lungi: Clean slightly-flared cylinder from waist past knees (NO DONUTS!)
    const lungiLen = 2.5;
    const lungiGeo = new THREE.CylinderGeometry(1.30, 1.60, lungiLen, 16);
    lungiGeo.translate(0, -lungiLen / 2, 0);
    const lungiMesh = new THREE.Mesh(lungiGeo, blueLungiMat);
    lungiMesh.position.set(0.85, 6.3, 0);
    lungiMesh.rotation.z = -0.22;
    lungiMesh.castShadow = true;
    pullerGroup.add(lungiMesh);

    // 5. Pedaling Legs & Flat Brown Sandals (Connected Hierarchy)
    const lenThigh = 2.65;
    const lenShin = 2.55;
    const pullerLegs = [];

    [-1, 1].forEach(side => {
      const hipX = 0.85;
      const hipY = 5.9;
      const hipZ = side * 0.95;

      const legGroup = new THREE.Group();

      const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.30, lenThigh, 12), skinMat);
      thighMesh.castShadow = true;

      const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8), skinMat);
      kneeMesh.castShadow = true;

      const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.22, lenShin, 12), skinMat);
      shinMesh.castShadow = true;

      const footGroup = new THREE.Group();
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.20, 1.25), brownSandalMat);
      sandal.castShadow = true;
      footGroup.add(sandal);

      const footSkin = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.28, 0.95), skinMat);
      footSkin.position.set(0, 0.20, 0);
      footGroup.add(footSkin);

      legGroup.add(thighMesh);
      legGroup.add(kneeMesh);
      legGroup.add(shinMesh);
      legGroup.add(footGroup);
      pullerGroup.add(legGroup);

      pullerLegs.push({
        side: side,
        hip: new THREE.Vector3(hipX, hipY, hipZ),
        thighMesh: thighMesh,
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
        leg.thighMesh.position.copy(thighMid);
        const thighDir = new THREE.Vector3().subVectors(kneePos, hip).normalize();
        leg.thighMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), thighDir);

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
    // TASK 2.2: MALE & FEMALE PASSENGERS (CONNECTED LEGS, ZERO GAPS, INSIDE FOOTWELL)
    // -------------------------------------------------------------------------
    // 1. MALE PASSENGER (Right / Foreground: z = -3.4)
    // Violet collared shirt (#6c5ce7), connected blue trousers (#1e6fd9), hands on knees, dark hair cap.
    const maleShirtMat = new THREE.MeshStandardMaterial({ color: 0x6c5ce7, roughness: 0.65 });
    const malePantMat = new THREE.MeshStandardMaterial({ color: 0x1e6fd9, roughness: 0.75 });
    const maleGroup = new THREE.Group();
    const mHipX = -9.8, mHipY = 7.85, mZ = -3.4;

    const mTorso = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 2.7, 16), maleShirtMat);
    mTorso.position.set(mHipX, mHipY + 1.35, mZ);
    mTorso.castShadow = true;
    maleGroup.add(mTorso);

    const mCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.35, 12), maleShirtMat);
    mCollar.position.set(mHipX, mHipY + 2.7, mZ);
    maleGroup.add(mCollar);

    const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 14), skinMat);
    mHead.position.set(mHipX + 0.1, mHipY + 3.4, mZ);
    mHead.castShadow = true;

    const mHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.70, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hairMat
    );
    mHair.position.set(-0.02, 0.05, 0);
    mHead.add(mHair);

    [-0.20, 0.20].forEach(ez => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), eyeWhiteMat);
      eye.position.set(0.54, 0.05, ez);
      mHead.add(eye);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), hairMat);
      pup.position.set(0.58, 0.05, ez);
      mHead.add(pup);
    });
    const mNose = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 8), skinMat);
    mNose.rotation.z = -Math.PI / 2 + 0.2;
    mNose.position.set(0.60, -0.05, 0);
    mHead.add(mNose);
    maleGroup.add(mHead);

    // Arms: Hands resting squarely on knees at x = -5.8!
    [-1, 1].forEach(s => {
      const sZ = mZ + s * 1.15;
      const shPt = [mHipX, mHipY + 2.4, sZ];
      const elbPt = [mHipX + 1.8, mHipY + 1.2, sZ + s * 0.15];
      const kneePt = [-5.8, mHipY + 0.45, sZ];

      const shBall = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), maleShirtMat);
      shBall.position.set(shPt[0], shPt[1], shPt[2]);
      maleGroup.add(shBall);

      maleGroup.add(createSmoothBoneSegment(shPt, elbPt, 0.34, 0.28, maleShirtMat));

      const elbBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), maleShirtMat);
      elbBall.position.set(elbPt[0], elbPt[1], elbPt[2]);
      maleGroup.add(elbBall);

      maleGroup.add(createSmoothBoneSegment(elbPt, kneePt, 0.28, 0.24, skinMat));

      const handBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), skinMat);
      handBall.position.set(kneePt[0], kneePt[1], kneePt[2]);
      handBall.castShadow = true;
      maleGroup.add(handBall);
    });

    // CONNECTED SEATED LEGS (Hip -> Horizontal Thigh -> Knee -> Vertical Shin -> Footboard)
    [-0.75, 0.75].forEach(tz => {
      const legZ = mZ + tz;
      const hipPt = [mHipX, mHipY, legZ];
      const kneePt = [-5.8, mHipY, legZ]; // Front edge of cushion, strictly shared coordinate
      const anklePt = [-5.4, 5.65, legZ]; // Down inside footwell on brown footboard

      const hipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), malePantMat);
      hipMesh.position.set(hipPt[0], hipPt[1], hipPt[2]);
      maleGroup.add(hipMesh);

      maleGroup.add(createSmoothBoneSegment(hipPt, kneePt, 0.48, 0.42, malePantMat));

      const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), malePantMat);
      kneeBall.position.set(kneePt[0], kneePt[1], kneePt[2]);
      kneeBall.castShadow = true;
      maleGroup.add(kneeBall);

      maleGroup.add(createSmoothBoneSegment(kneePt, anklePt, 0.40, 0.32, malePantMat));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.65), brownSandalMat);
      sandal.position.set(anklePt[0] + 0.25, 5.425 + 0.11, legZ);
      sandal.castShadow = true;
      maleGroup.add(sandal);
    });

    group.add(maleGroup);

    // 2. FEMALE PASSENGER (Left / Background: z = +3.4)
    // Golden-ochre blouse/drape (#e69d45), hood hemisphere on head (#e69d45),
    // sky-blue skirt (#54a0ff) covering seated legs down to sandals on footboard, hands on lap.
    const femaleBlouseMat = new THREE.MeshStandardMaterial({ color: 0xe69d45, roughness: 0.60 });
    const femaleSkirtMat = new THREE.MeshStandardMaterial({ color: 0x54a0ff, roughness: 0.70 });
    const femaleGroup = new THREE.Group();
    const fHipX = -9.8, fHipY = 7.85, fZ = 3.4;

    const fTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.08, 2.6, 16), femaleBlouseMat);
    fTorso.position.set(fHipX, fHipY + 1.3, fZ);
    fTorso.castShadow = true;
    femaleGroup.add(fTorso);

    const fPalluPts = [
      new THREE.Vector3(fHipX + 0.3, fHipY + 0.6, fZ - 0.7),
      new THREE.Vector3(fHipX + 0.5, fHipY + 1.5, fZ),
      new THREE.Vector3(fHipX + 0.2, fHipY + 2.4, fZ + 0.8)
    ];
    const fPalluCurve = new THREE.CatmullRomCurve3(fPalluPts);
    femaleGroup.add(new THREE.Mesh(new THREE.TubeGeometry(fPalluCurve, 12, 0.32, 8, false), femaleBlouseMat));

    const fHead = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 14), skinMat);
    fHead.position.set(fHipX + 0.1, fHipY + 3.3, fZ);
    fHead.castShadow = true;

    const fHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.67, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat
    );
    fHair.position.set(-0.02, 0.04, 0);
    fHead.add(fHair);

    const fHood = new THREE.Mesh(
      new THREE.SphereGeometry(0.78, 16, 14, -Math.PI * 0.5, Math.PI, 0, Math.PI * 0.75),
      femaleBlouseMat
    );
    fHood.position.set(-0.04, 0.05, 0);
    fHood.castShadow = true;
    fHead.add(fHood);

    const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    bindi.position.set(0.58, 0.16, 0);
    fHead.add(bindi);

    [-0.18, 0.18].forEach(ez => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeWhiteMat);
      eye.position.set(0.52, 0.04, ez);
      fHead.add(eye);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), hairMat);
      pup.position.set(0.56, 0.04, ez);
      fHead.add(pup);
    });
    femaleGroup.add(fHead);

    // Arms: Resting together on lap
    [-1, 1].forEach(s => {
      const sZ = fZ + s * 1.0;
      const shPt = [fHipX, fHipY + 2.3, sZ];
      const elbPt = [fHipX + 1.4, fHipY + 1.1, sZ + s * 0.1];
      const lapPt = [fHipX + 2.4, fHipY + 0.6, fZ + s * 0.25];

      const shBall = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), femaleBlouseMat);
      shBall.position.set(shPt[0], shPt[1], shPt[2]);
      femaleGroup.add(shBall);

      femaleGroup.add(createSmoothBoneSegment(shPt, elbPt, 0.30, 0.25, femaleBlouseMat));

      const elbBall = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), femaleBlouseMat);
      elbBall.position.set(elbPt[0], elbPt[1], elbPt[2]);
      femaleGroup.add(elbBall);

      femaleGroup.add(createSmoothBoneSegment(elbPt, lapPt, 0.25, 0.22, skinMat));

      const handBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), skinMat);
      handBall.position.set(lapPt[0], lapPt[1], lapPt[2]);
      femaleGroup.add(handBall);

      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 12), goldTrimMat);
      bangle.position.set(lapPt[0] - 0.2, lapPt[1] + 0.05, lapPt[2]);
      femaleGroup.add(bangle);
    });

    // CONNECTED SKY-BLUE SEATED LEGS & LOWER SKIRT
    [-0.75, 0.75].forEach(tz => {
      const legZ = fZ + tz;
      const hipPt = [fHipX, fHipY, legZ];
      const kneePt = [-5.8, fHipY, legZ];
      const anklePt = [-5.4, 5.65, legZ];

      const hipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), femaleSkirtMat);
      hipMesh.position.set(hipPt[0], hipPt[1], hipPt[2]);
      femaleGroup.add(hipMesh);

      femaleGroup.add(createSmoothBoneSegment(hipPt, kneePt, 0.48, 0.42, femaleSkirtMat));

      const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), femaleSkirtMat);
      kneeBall.position.set(kneePt[0], kneePt[1], kneePt[2]);
      kneeBall.castShadow = true;
      femaleGroup.add(kneeBall);

      femaleGroup.add(createSmoothBoneSegment(kneePt, anklePt, 0.40, 0.32, femaleSkirtMat));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 0.55), brownSandalMat);
      sandal.position.set(anklePt[0] + 0.25, 5.425 + 0.09, legZ);
      sandal.castShadow = true;
      femaleGroup.add(sandal);
    });

    // Draped skirt cloth between the thighs and down the front to footboard
    const skirtCenterLap = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.65, 1.4), femaleSkirtMat);
    skirtCenterLap.position.set(fHipX + 1.9, fHipY - 0.08, fZ);
    femaleGroup.add(skirtCenterLap);

    const skirtCenterFall = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.1, 1.4), femaleSkirtMat);
    skirtCenterFall.position.set(-5.6, fHipY - 1.05, fZ);
    femaleGroup.add(skirtCenterFall);

    const skirtHem = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 2.3), goldTrimMat);
    skirtHem.position.set(-5.5, 5.6, fZ);
    femaleGroup.add(skirtHem);

    group.add(femaleGroup);

    return group;"""

content = content[:idx_start] + new_code + content[idx_end + len(end_marker):]

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully replaced rickshaw code in assets/crossroads-3d.js!")
