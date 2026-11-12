import re

replacement_code = r'''
    // =========================================================================
    // PARALLEL-TRANSPORT SMOOTH LOFTING FOR CONTINUOUS ORGANIC BODIES
    // =========================================================================
    function createSeamlessLoftedLimb(crossSections, radialSegs, pathSegs, material) {
      radialSegs = radialSegs || 16;
      pathSegs = pathSegs || 20;

      const points = crossSections.map(c => new THREE.Vector3(c.p[0], c.p[1], c.p[2]));
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

      function getInterpolatedRadius(u) {
        const n = crossSections.length - 1;
        const idx = Math.min(Math.floor(u * n), n - 1);
        const t = (u * n) - idx;
        const cA = crossSections[idx];
        const cB = crossSections[idx + 1];
        return {
          rx: THREE.MathUtils.lerp(cA.rx, cB.rx, t),
          ry: THREE.MathUtils.lerp(cA.ry, cB.ry, t)
        };
      }

      const frames = curve.computeFrenetFrames(pathSegs, false);
      const vertices = [];
      const uvs = [];
      const indices = [];

      for (let i = 0; i <= pathSegs; i++) {
        const u = i / pathSegs;
        const P = curve.getPointAt(u);
        const rad = getInterpolatedRadius(u);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        for (let j = 0; j <= radialSegs; j++) {
          const v = j / radialSegs;
          const theta = v * Math.PI * 2;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);

          const vx = P.x + (N.x * cos * rad.rx) + (B.x * sin * rad.ry);
          const vy = P.y + (N.y * cos * rad.rx) + (B.y * sin * rad.ry);
          const vz = P.z + (N.z * cos * rad.rx) + (B.z * sin * rad.ry);

          vertices.push(vx, vy, vz);
          uvs.push(u, v);
        }
      }

      for (let i = 0; i < pathSegs; i++) {
        for (let j = 0; j < radialSegs; j++) {
          const a = i * (radialSegs + 1) + j;
          const b = (i + 1) * (radialSegs + 1) + j;
          const c = (i + 1) * (radialSegs + 1) + (j + 1);
          const d = i * (radialSegs + 1) + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      return mesh;
    }

    function createBoneSegment(pA, pB, rA, rB, material) {
      const vA = (pA && pA.isVector3) ? pA.clone() : new THREE.Vector3(pA[0], pA[1], pA[2]);
      const vB = (pB && pB.isVector3) ? pB.clone() : new THREE.Vector3(pB[0], pB[1], pB[2]);
      const dist = vA.distanceTo(vB);
      if (dist < 0.001) return new THREE.Group();

      const segGroup = new THREE.Group();
      const cylGeo = new THREE.CylinderGeometry(rB, rA, dist, 14, 1, false);
      cylGeo.translate(0, dist / 2, 0);
      const mesh = new THREE.Mesh(cylGeo, material);
      mesh.castShadow = true;

      const jointA = new THREE.Mesh(new THREE.SphereGeometry(rA, 12, 10), material);
      jointA.castShadow = true;
      segGroup.add(jointA);

      const jointB = new THREE.Mesh(new THREE.SphereGeometry(rB, 12, 10), material);
      jointB.position.set(0, dist, 0);
      jointB.castShadow = true;
      segGroup.add(jointB);

      const dir = new THREE.Vector3().subVectors(vB, vA).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      segGroup.position.copy(vA);
      segGroup.quaternion.copy(quat);
      segGroup.add(mesh);
      return segGroup;
    }

    // =========================================================================
    // REALISTIC ANATOMICAL HANDS (GRIPPING & RESTING - NOT BALLS!)
    // =========================================================================
    function buildGrippingHand(skinMat, side) {
      const hGroup = new THREE.Group();
      // Palm
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.30, 0.48), skinMat);
      palm.castShadow = true;
      hGroup.add(palm);

      // Knuckle Bar
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.46), skinMat);
      knuckle.position.set(0.20, 0.12, 0);
      hGroup.add(knuckle);

      // 4 Curled Fingers firmly wrapped around handlebar
      for (let f = 0; f < 4; f++) {
        const fz = -0.16 + f * 0.11;
        const fingerCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 8), skinMat);
        fingerCyl.rotation.z = Math.PI * 0.65;
        fingerCyl.position.set(0.30, -0.06, fz);
        hGroup.add(fingerCyl);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
        tip.position.set(0.30 - Math.sin(Math.PI * 0.65) * 0.20, -0.06 + Math.cos(Math.PI * 0.65) * 0.20, fz);
        hGroup.add(tip);
      }

      // Opposable Thumb
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.35, 8), skinMat);
      thumb.position.set(0.10, 0.15, side > 0 ? -0.22 : 0.22);
      thumb.rotation.x = side > 0 ? 0.45 : -0.45;
      thumb.rotation.z = -0.25;
      hGroup.add(thumb);

      return hGroup;
    }

    function buildRestingHand(skinMat, isFemale) {
      const hGroup = new THREE.Group();
      const s = isFemale ? 0.85 : 1.0;
      // Palm
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.50 * s, 0.18 * s, 0.46 * s), skinMat);
      palm.castShadow = true;
      hGroup.add(palm);

      // Resting Natural Fingers
      for (let f = 0; f < 4; f++) {
        const fz = (-0.15 + f * 0.10) * s;
        const fLen = (f === 1 || f === 2 ? 0.44 : 0.38) * s;
        const fGeo = new THREE.CylinderGeometry(0.052 * s, 0.044 * s, fLen, 8);
        fGeo.translate(0, -fLen / 2, 0);
        const finger = new THREE.Mesh(fGeo, skinMat);
        finger.position.set(0.24 * s, 0.02 * s, fz);
        finger.rotation.z = -0.32;
        hGroup.add(finger);
      }

      // Thumb
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.062 * s, 0.052 * s, 0.30 * s, 8), skinMat);
      thumb.position.set(0.08 * s, 0.04 * s, -0.20 * s);
      thumb.rotation.z = -0.20;
      thumb.rotation.y = 0.25;
      hGroup.add(thumb);

      return hGroup;
    }

    // =========================================================================
    // REALISTIC SCULPTED ANATOMICAL HEAD & DIVERSE FACIAL STRUCTURE
    // =========================================================================
    function buildRealisticSculptedHead(opt) {
      const headGroup = new THREE.Group();
      const sMat = opt.skinMat;
      const hMat = opt.hairMat;
      const r = opt.radius || 0.95;
      const isFemale = !!opt.isFemale;

      // 1. Natural Cranium
      const craniumGeo = new THREE.SphereGeometry(r, 22, 18);
      craniumGeo.scale(0.92, 1.08, 0.96);
      const cranium = new THREE.Mesh(craniumGeo, sMat);
      cranium.castShadow = true;
      headGroup.add(cranium);

      // 2. Sculpted Chin & Defined Jawline
      const chinGeo = new THREE.SphereGeometry(r * 0.32, 12, 10);
      chinGeo.scale(1.1, 0.85, isFemale ? 0.95 : 1.25);
      const chin = new THREE.Mesh(chinGeo, sMat);
      chin.position.set(r * 0.58, -r * 0.46, 0);
      headGroup.add(chin);

      // 3. Realistic Almond Eyes (White Sclera + Dark Iris + Specular Catchlight + Eyelids)
      [-0.26, 0.26].forEach(eyZ => {
        const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), eyeWhiteMat);
        eyeW.scale.set(0.55, 0.80, 1.25);
        eyeW.position.set(r * 0.72, r * 0.12, eyZ);
        headGroup.add(eyeW);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), eyePupilMat);
        pupil.position.set(r * 0.79, r * 0.12, eyZ);
        headGroup.add(pupil);

        // Catchlight
        const specular = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        specular.position.set(r * 0.83, r * 0.15, eyZ + 0.02);
        headGroup.add(specular);

        // Upper Eyelid Crease
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), hMat);
        lid.rotation.x = Math.PI / 2;
        lid.position.set(r * 0.74, r * 0.21, eyZ);
        headGroup.add(lid);

        // 3D Sculpted Eyebrow
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.07, isFemale ? 0.04 : 0.07, 0.26), hMat);
        brow.position.set(r * 0.72, r * 0.27, eyZ);
        brow.rotation.x = eyZ > 0 ? -0.12 : 0.12;
        brow.rotation.y = eyZ > 0 ? 0.08 : -0.08;
        headGroup.add(brow);
      });

      // 4. 3D Sculpted Nose with Bridge, Tip & Nostril Wings
      const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.40, 10), sMat);
      noseBridge.rotation.z = -Math.PI / 2 + 0.18;
      noseBridge.position.set(r * 0.76, -r * 0.02, 0);
      headGroup.add(noseBridge);

      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), sMat);
      noseTip.position.set(r * 0.83, -r * 0.06, 0);
      headGroup.add(noseTip);

      [-0.10, 0.10].forEach(nz => {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), sMat);
        nostril.position.set(r * 0.77, -r * 0.08, nz);
        headGroup.add(nostril);
      });

      // Female Gold Nose-Pin (Nath / Nakphul) on Left Nostril
      if (isFemale) {
        const nosePin = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), goldTrimMat);
        nosePin.position.set(r * 0.80, -r * 0.05, 0.12);
        headGroup.add(nosePin);
      }

      // 5. Natural Sculpted Lips
      const upperLip = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.22, 10), opt.lipMat || lipMat);
      upperLip.rotation.x = Math.PI / 2;
      upperLip.position.set(r * 0.78, -r * 0.24, 0);
      headGroup.add(upperLip);

      const lowerLip = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.20, 10), opt.lipMat || lipMat);
      lowerLip.rotation.x = Math.PI / 2;
      lowerLip.position.set(r * 0.75, -r * 0.30, 0);
      headGroup.add(lowerLip);

      // 6. 3D Contoured Ears
      [-r * 0.84, r * 0.84].forEach(ez => {
        const earHelix = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 8, 14, Math.PI * 1.3), sMat);
        earHelix.scale.set(0.65, 1.15, 0.5);
        earHelix.position.set(0, -0.05, ez);
        earHelix.rotation.y = ez > 0 ? 0.35 : -0.35;
        headGroup.add(earHelix);

        const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), sMat);
        earLobe.position.set(-0.02, -0.22, ez);
        headGroup.add(earLobe);

        // Female Dangling Golden Jhumka Earrings
        if (isFemale) {
          const stud = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), goldTrimMat);
          stud.position.set(-0.02, -0.22, ez + (ez > 0 ? 0.04 : -0.04));
          headGroup.add(stud);

          const jhumkaBell = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.16, 10), goldTrimMat);
          jhumkaBell.position.set(-0.02, -0.34, ez + (ez > 0 ? 0.04 : -0.04));
          headGroup.add(jhumkaBell);
        }
      });

      // 7. Hair & Hairstyle
      if (!isFemale) {
        // Natural adult male hair with clean side-parting and volume
        const hairCapGeo = new THREE.SphereGeometry(r * 1.04, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
        hairCapGeo.scale(0.95, 1.06, 0.98);
        const hairCap = new THREE.Mesh(hairCapGeo, hMat);
        hairCap.position.set(-0.02, 0.06, 0);
        hairCap.castShadow = true;
        headGroup.add(hairCap);

        // Side Parting Ridge
        const partRidge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.22), hMat);
        partRidge.position.set(0.12, r * 0.88, 0.25);
        partRidge.rotation.z = -0.15;
        headGroup.add(partRidge);

        // Sideburns
        [-r * 0.82, r * 0.82].forEach(sz => {
          const sburn = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.12), hMat);
          sburn.position.set(0.12, -0.14, sz);
          headGroup.add(sburn);
        });

        // Nape Hair
        const nape = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, r * 1.2), hMat);
        nape.position.set(-r * 0.65, -0.28, 0);
        headGroup.add(nape);
      } else {
        // Female Sleek Hair with low bun (Khopa) under veil
        const fHairCap = new THREE.Mesh(
          new THREE.SphereGeometry(r * 1.02, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
          hMat
        );
        fHairCap.position.set(-0.02, 0.04, 0);
        headGroup.add(fHairCap);

        const khopa = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), hMat);
        khopa.scale.set(0.85, 1.05, 1.25);
        khopa.position.set(-r * 0.85, -0.12, 0);
        headGroup.add(khopa);
      }

      // 8. Authentic Bangladeshi Mustache
      if (opt.mustache) {
        const stacheCenter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.54), hMat);
        stacheCenter.position.set(r * 0.81, -r * 0.18, 0);
        headGroup.add(stacheCenter);

        [-0.24, 0.24].forEach(mz => {
          const stacheWing = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.18, 8), hMat);
          stacheWing.rotation.x = Math.PI / 2 + (mz > 0 ? 0.35 : -0.35);
          stacheWing.position.set(r * 0.77, -r * 0.20, mz);
          headGroup.add(stacheWing);
        });
      }

      // 9. Crimson Velvet Bindi (Teep)
      if (opt.bindi) {
        const bindiMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 12), bindiMat);
        bindiMesh.rotation.z = Math.PI / 2;
        bindiMesh.position.set(r * 0.81, r * 0.22, 0);
        headGroup.add(bindiMesh);
      }

      return headGroup;
    }

    // -------------------------------------------------------------------------
    // 1. RICKSHAW PULLER (FULL ADULT MAN - HIGH-FIDELITY ORGANIC ANATOMY)
    // -------------------------------------------------------------------------
    const pullerGroup = new THREE.Group();
    const pullerSkinMat = new THREE.MeshStandardMaterial({ color: 0x8d533e, roughness: 0.65 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.85 });
    const plumShirtMat = new THREE.MeshStandardMaterial({ color: 0x5c2d61, roughness: 0.62 });
    const brownSandalMat = new THREE.MeshStandardMaterial({ color: 0x45220c, roughness: 0.85 });
    const gamchaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.75 });

    // Smooth Lofted Athletic Male Torso (Forward lean ~24° toward grips)
    const pullerTorso = createSeamlessLoftedLimb([
      { p: [0.60, 7.20, 0], rx: 1.15, ry: 1.25 },
      { p: [1.10, 8.20, 0], rx: 1.10, ry: 1.20 },
      { p: [1.80, 9.60, 0], rx: 1.35, ry: 1.65 },
      { p: [2.50, 11.00, 0], rx: 1.30, ry: 1.80 },
      { p: [2.80, 11.40, 0], rx: 0.85, ry: 1.05 },
      { p: [3.00, 11.80, 0], rx: 0.48, ry: 0.52 }
    ], 16, 20, plumShirtMat);
    pullerGroup.add(pullerTorso);

    const pullerShoulderPos = { x: 2.50, y: 11.00, z: 1.65 };

    // Folded Shirt Collar & Placket
    const pullerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.40, 14), plumShirtMat);
    pullerCollar.position.set(2.80, 11.45, 0);
    pullerCollar.rotation.z = -0.42;
    pullerGroup.add(pullerCollar);

    const pullerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.70, 12), pullerSkinMat);
    pullerNeck.position.set(2.95, 11.75, 0);
    pullerNeck.rotation.z = -0.32;
    pullerGroup.add(pullerNeck);

    // Traditional Checkered Gamcha Draped Over Shoulder
    const gamchaDrape = createSeamlessLoftedLimb([
      { p: [2.40, 10.40, 0.85], rx: 0.24, ry: 0.55 },
      { p: [2.65, 11.20, 1.10], rx: 0.22, ry: 0.60 },
      { p: [2.35, 10.80, 0.95], rx: 0.20, ry: 0.52 },
      { p: [1.80, 9.60, 0.85], rx: 0.18, ry: 0.45 },
      { p: [1.20, 8.40, 0.80], rx: 0.15, ry: 0.40 }
    ], 10, 14, gamchaMat);
    pullerGroup.add(gamchaDrape);

    // Realistic Sculpted Head
    const pullerHead = buildRealisticSculptedHead({
      skinMat: pullerSkinMat,
      hairMat: hairMat,
      radius: 0.98,
      mustache: true,
      isFemale: false
    });
    pullerHead.position.set(3.40, 12.35, 0);
    pullerGroup.add(pullerHead);

    // Muscular Athletic Arms & Realistic Gripping Hands
    [-1, 1].forEach(side => {
      const shX = pullerShoulderPos.x;
      const shY = pullerShoulderPos.y;
      const shZ = side * pullerShoulderPos.z;
      const gripTarget = [6.2, 9.8, side > 0 ? 2.5 : -2.5];
      const elbowPos = [4.15, 10.05, side * 2.25];

      // Dropped Shoulder Sleeve Cap
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.70, 14, 12), plumShirtMat);
      shoulderCap.scale.set(1.10, 0.95, 1.05);
      shoulderCap.position.set(shX, shY, shZ);
      pullerGroup.add(shoulderCap);

      // Upper Arm Fabric Sleeve
      pullerGroup.add(createBoneSegment([shX, shY, shZ], elbowPos, 0.62, 0.50, plumShirtMat));

      // Muscular Bare Forearm (Elbow -> Wrist)
      const wristPos = [gripTarget[0] - 0.22, gripTarget[1] - 0.05, gripTarget[2]];
      pullerGroup.add(createBoneSegment(elbowPos, wristPos, 0.44, 0.34, pullerSkinMat));

      // Realistic Gripping Hand locked to Handlebar
      const hand = buildGrippingHand(pullerSkinMat, side);
      hand.position.set(gripTarget[0], gripTarget[1], gripTarget[2]);
      hand.rotation.y = side > 0 ? 0.25 : -0.25;
      pullerGroup.add(hand);
    });

    // Traditional Draped Lungi (Sarong) - Smooth Organic Lofts Wrapping Hips & Thighs
    const lungiLoft = createSeamlessLoftedLimb([
      { p: [0.65, 7.20, 0], rx: 1.30, ry: 1.45 },
      { p: [0.85, 6.60, 0], rx: 1.40, ry: 1.55 },
      { p: [1.15, 5.80, 0], rx: 1.55, ry: 1.70 },
      { p: [1.45, 5.00, 0], rx: 1.65, ry: 1.75 }
    ], 16, 16, lungiMat);
    pullerGroup.add(lungiLoft);

    // Front Waist Knot (Lungi Gira)
    const lungiKnot = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), lungiMat);
    lungiKnot.scale.set(0.9, 0.7, 1.2);
    lungiKnot.position.set(1.45, 6.95, 0);
    pullerGroup.add(lungiKnot);

    // Bare Muscular Calves & Leather Strap Sandals on Pedals
    const lenThigh = 3.0;
    const lenShin = 2.8;
    const pullerLegs = [];

    [-1, 1].forEach(side => {
      const hipPt = new THREE.Vector3(0.6, 6.5, side * 1.15);
      const legGroup = new THREE.Group();
      legGroup.position.copy(hipPt);

      // Bare muscular calf with gastrocnemius bulge
      const calfLoft = createSeamlessLoftedLimb([
        { p: [0, 0, 0], rx: 0.48, ry: 0.44 },
        { p: [0, -lenShin * 0.35, 0], rx: 0.46, ry: 0.42 },
        { p: [0, -lenShin * 0.75, 0], rx: 0.36, ry: 0.34 },
        { p: [0, -lenShin, 0], rx: 0.32, ry: 0.30 }
      ], 10, 10, pullerSkinMat);

      // Traditional Brown Leather Strap Sandal (Chappal)
      const footGroup = new THREE.Group();
      const sandalSole = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.22, 0.78), brownSandalMat);
      sandalSole.castShadow = true;
      footGroup.add(sandalSole);

      const strapMain = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.82), brownSandalMat);
      strapMain.position.set(0.20, 0.14, 0);
      footGroup.add(strapMain);

      const toeStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), brownSandalMat);
      toeStrap.position.set(0.52, 0.12, 0);
      footGroup.add(toeStrap);

      legGroup.add(calfLoft);
      legGroup.add(footGroup);
      pullerGroup.add(legGroup);

      pullerLegs.push({
        side: side,
        hip: hipPt,
        shinMesh: calfLoft,
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

        const dx = pedalLocalX - leg.hip.x;
        const dy = pedalLocalY - leg.hip.y;
        const dist = Math.min(lenThigh + lenShin - 0.05, Math.max(0.6, Math.sqrt(dx * dx + dy * dy)));

        const cosAlpha = (lenThigh * lenThigh + dist * dist - lenShin * lenShin) / (2 * lenThigh * dist);
        const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
        const baseAngle = Math.atan2(dy, dx);

        const thighAngle = baseAngle + alpha;
        const kx = leg.hip.x + Math.cos(thighAngle) * lenThigh;
        const ky = leg.hip.y + Math.sin(thighAngle) * lenThigh;
        const kz = leg.hip.z;

        const shinDir = new THREE.Vector3(pedalLocalX - kx, pedalLocalY - ky, pedalLocalZ - kz).normalize();
        const qShin = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), shinDir);

        leg.shinMesh.position.set(kx - leg.hip.x, ky - leg.hip.y, 0);
        leg.shinMesh.quaternion.copy(qShin);

        leg.footGroup.position.set(pedalLocalX - leg.hip.x, pedalLocalY - leg.hip.y, pedalLocalZ - leg.hip.z);
        leg.footGroup.quaternion.identity();
      });
    }

    group.add(pullerGroup);
    group.userData.updatePedaling = updatePullerPedaling;
    updatePullerPedaling(0);

    // -------------------------------------------------------------------------
    // 2. PASSENGERS (FULL ADULT MAN & WOMAN - HIGH-FIDELITY ORGANIC ANATOMY)
    // -------------------------------------------------------------------------
    const mHipX = -8.8, mHipY = 9.0, mZ = -3.4;
    const fHipX = -8.8, fHipY = 9.0, fZ = 3.4;

    // 2.1 MALE PASSENGER (Far Side / Left: z = -3.4)
    const maleShirtMat = new THREE.MeshStandardMaterial({ color: 0x6d559e, roughness: 0.62 });
    const malePantMat = new THREE.MeshStandardMaterial({ color: 0x245a8a, roughness: 0.75 });
    const maleSkinMat = new THREE.MeshStandardMaterial({ color: 0x9e674b, roughness: 0.65 });
    const maleGroup = new THREE.Group();

    // Smooth Lofted Male Torso
    const maleTorso = createSeamlessLoftedLimb([
      { p: [mHipX, mHipY, mZ], rx: 1.15, ry: 1.35 },
      { p: [mHipX + 0.10, mHipY + 1.10, mZ], rx: 1.10, ry: 1.30 },
      { p: [mHipX + 0.20, mHipY + 2.30, mZ], rx: 1.35, ry: 1.70 },
      { p: [mHipX + 0.20, mHipY + 3.40, mZ], rx: 1.30, ry: 1.95 },
      { p: [mHipX + 0.20, mHipY + 3.90, mZ], rx: 0.85, ry: 1.10 },
      { p: [mHipX + 0.20, mHipY + 4.25, mZ], rx: 0.48, ry: 0.52 }
    ], 16, 20, maleShirtMat);
    maleGroup.add(maleTorso);

    // Folded Shirt Collar & Placket
    const mCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 14), maleShirtMat);
    mCollar.position.set(mHipX + 0.20, mHipY + 3.95, mZ);
    maleGroup.add(mCollar);

    const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.65, 12), maleSkinMat);
    mNeck.position.set(mHipX + 0.20, mHipY + 4.25, mZ);
    maleGroup.add(mNeck);

    const maleHead = buildRealisticSculptedHead({
      skinMat: maleSkinMat,
      hairMat: hairMat,
      radius: 0.95,
      mustache: true,
      isFemale: false
    });
    maleHead.position.set(mHipX + 0.25, mHipY + 5.15, mZ);
    maleGroup.add(maleHead);

    // Arms & Relaxed Resting Hands on Knees
    [-1.4, 1.4].forEach(az => {
      const shPt = [mHipX + 0.20, mHipY + 3.40, mZ + az];
      const kneeTarget = [-5.5, mHipY + 0.2, mZ + az * 0.7];
      const elbowPt = [-6.9, mHipY + 1.6, mZ + az * 1.1];

      // Upper Arm Fabric Sleeve
      maleGroup.add(createBoneSegment(shPt, elbowPt, 0.55, 0.46, maleShirtMat));
      // Forearm
      maleGroup.add(createBoneSegment(elbowPt, kneeTarget, 0.44, 0.36, maleSkinMat));

      // Realistic Resting Hand on Knee
      const mHand = buildRestingHand(maleSkinMat, false);
      mHand.position.set(kneeTarget[0], kneeTarget[1], kneeTarget[2]);
      mHand.rotation.y = az > 0 ? 0.35 : -0.35;
      maleGroup.add(mHand);
    });

    // Seated Trousers & Formal Leather Sandals
    [-0.95, 0.95].forEach(tz => {
      const legZ = mZ + tz;
      const hipPt = [mHipX, mHipY, legZ];
      const kneePt = [-5.5, mHipY, legZ];
      const anklePt = [-5.3, 5.65, legZ];

      maleGroup.add(createBoneSegment(hipPt, kneePt, 0.70, 0.60, malePantMat));
      maleGroup.add(createBoneSegment(kneePt, anklePt, 0.60, 0.50, malePantMat));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.24, 0.78), brownSandalMat);
      sandal.position.set(anklePt[0] + 0.4, 5.45, legZ);
      maleGroup.add(sandal);
    });

    group.add(maleGroup);

    // 2.2 FEMALE PASSENGER (Near Side / Right: z = +3.4 - HIGH-FIDELITY ORGANIC ANATOMY)
    const sareeBlouseMat = new THREE.MeshStandardMaterial({ color: 0xdf8830, roughness: 0.52 });
    const sareeSkirtMat = new THREE.MeshStandardMaterial({ color: 0x3d93b3, roughness: 0.62 });
    const sareeTrimRedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 });
    const femaleSkinMat = new THREE.MeshStandardMaterial({ color: 0xeec5a0, roughness: 0.60 });
    const femaleGroup = new THREE.Group();

    // Smooth Lofted Feminine Silhouette in Golden Blouse
    const femaleTorso = createSeamlessLoftedLimb([
      { p: [fHipX, fHipY, fZ], rx: 1.10, ry: 1.28 },
      { p: [fHipX + 0.10, fHipY + 1.10, fZ], rx: 0.92, ry: 1.12 },
      { p: [fHipX + 0.20, fHipY + 2.20, fZ], rx: 1.22, ry: 1.40 },
      { p: [fHipX + 0.20, fHipY + 3.30, fZ], rx: 1.10, ry: 1.55 },
      { p: [fHipX + 0.20, fHipY + 3.80, fZ], rx: 0.65, ry: 0.85 },
      { p: [fHipX + 0.20, fHipY + 4.15, fZ], rx: 0.38, ry: 0.42 }
    ], 16, 20, sareeBlouseMat);
    femaleGroup.add(femaleTorso);

    // Saree Pallu Pleats Draping Diagonally Across Bust
    const palluLoft = createSeamlessLoftedLimb([
      { p: [fHipX + 0.25, fHipY + 0.90, fZ - 0.70], rx: 0.18, ry: 0.55 },
      { p: [fHipX + 0.38, fHipY + 2.10, fZ], rx: 0.16, ry: 0.65 },
      { p: [fHipX + 0.25, fHipY + 3.30, fZ + 0.85], rx: 0.18, ry: 0.75 },
      { p: [fHipX - 0.30, fHipY + 2.20, fZ + 0.95], rx: 0.16, ry: 0.70 }
    ], 10, 16, sareeBlouseMat);
    femaleGroup.add(palluLoft);

    const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.40, 0.65, 12), femaleSkinMat);
    fNeck.position.set(fHipX + 0.20, fHipY + 4.15, fZ);
    femaleGroup.add(fNeck);

    const femaleHead = buildRealisticSculptedHead({
      skinMat: femaleSkinMat,
      hairMat: hairMat,
      radius: 0.90,
      mustache: false,
      bindi: true,
      isFemale: true,
      lipMat: lipMat
    });
    femaleHead.position.set(fHipX + 0.25, fHipY + 5.05, fZ);
    femaleGroup.add(femaleHead);

    // FLOWING AUTHENTIC SAREE AANCHAL / GHOMTA (VEIL)
    // Draped over top and sides of head, framing face, cascading down back
    const veilHoodGeo = new THREE.SphereGeometry(1.06, 26, 20, -Math.PI * 0.46, Math.PI * 1.92, 0, Math.PI * 0.68);
    const veilHood = new THREE.Mesh(veilHoodGeo, sareeBlouseMat);
    veilHood.position.set(fHipX + 0.22, fHipY + 5.10, fZ);
    veilHood.castShadow = true;
    femaleGroup.add(veilHood);

    // Embroidered Crimson Trim Border Framing the Face
    const veilRimGeo = new THREE.TorusGeometry(1.07, 0.075, 8, 28, Math.PI * 0.96);
    const veilRim = new THREE.Mesh(veilRimGeo, sareeTrimRedMat);
    veilRim.position.set(fHipX + 0.38, fHipY + 5.10, fZ);
    veilRim.rotation.y = Math.PI / 2;
    femaleGroup.add(veilRim);

    // Flowing Veil Cascade down back onto seat
    const backVeilCascade = createSeamlessLoftedLimb([
      { p: [fHipX - 0.45, fHipY + 4.90, fZ], rx: 0.35, ry: 1.15 },
      { p: [fHipX - 0.75, fHipY + 3.50, fZ], rx: 0.40, ry: 1.25 },
      { p: [fHipX - 0.85, fHipY + 2.00, fZ], rx: 0.42, ry: 1.35 }
    ], 10, 12, sareeBlouseMat);
    femaleGroup.add(backVeilCascade);

    // Arms with Stacked Golden & Colored Bangles (Churi) & Graceful Hands
    [-1.25, 1.25].forEach(az => {
      const shPt = [fHipX + 0.20, fHipY + 3.30, fZ + az];
      const lapTarget = [-5.5, fHipY + 0.35, fZ + az * 0.35];
      const elbowPt = [-6.9, fHipY + 1.45, fZ + az * 1.05];

      // Saree Blouse Half-Sleeve with Gold Lace Trim
      femaleGroup.add(createBoneSegment(shPt, elbowPt, 0.48, 0.40, sareeBlouseMat));

      const sleeveGoldHem = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 16), goldTrimMat);
      sleeveGoldHem.position.set(elbowPt[0], elbowPt[1], elbowPt[2]);
      femaleGroup.add(sleeveGoldHem);

      // Bare Forearm
      femaleGroup.add(createBoneSegment(elbowPt, lapTarget, 0.36, 0.28, femaleSkinMat));

      // Stacked Traditional Bangles (Churi) on Wrists
      const bangleColors = [0xf59e0b, 0xdc2626, 0x16a34a, 0xf59e0b];
      bangleColors.forEach((bColor, bIdx) => {
        const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.25, metalness: 0.6 });
        const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.042, 8, 16), bMat);
        bangle.position.set(lapTarget[0] - 0.28 + bIdx * 0.09, lapTarget[1] + 0.08, lapTarget[2]);
        bangle.rotation.y = Math.PI / 2;
        femaleGroup.add(bangle);
      });

      // Realistic Delicate Resting Hand
      const fHand = buildRestingHand(femaleSkinMat, true);
      fHand.position.set(lapTarget[0], lapTarget[1], lapTarget[2]);
      fHand.rotation.y = az > 0 ? 0.3 : -0.3;
      femaleGroup.add(fHand);
    });

    // Flowing Draped Saree Skirt Covering Thighs & Knees
    [-0.95, 0.95].forEach(tz => {
      const legZ = fZ + tz;
      const hipPt = [fHipX, fHipY, legZ];
      const kneePt = [-5.5, fHipY, legZ];
      const anklePt = [-5.3, 5.65, legZ];

      femaleGroup.add(createBoneSegment(hipPt, kneePt, 0.68, 0.58, sareeSkirtMat));
      femaleGroup.add(createBoneSegment(kneePt, anklePt, 0.58, 0.48, sareeSkirtMat));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.20, 0.70), brownSandalMat);
      sandal.position.set(anklePt[0] + 0.4, 5.45, legZ);
      femaleGroup.add(sandal);
    });

    // Cascading Saree Lap Fabric & Vertical Front Pleats (Kuchi)
    const skirtLapLoft = createSeamlessLoftedLimb([
      { p: [fHipX, fHipY + 0.35, fZ], rx: 0.65, ry: 1.15 },
      { p: [fHipX + 1.80, fHipY + 0.30, fZ], rx: 0.60, ry: 1.25 },
      { p: [-5.45, fHipY + 0.25, fZ], rx: 0.55, ry: 1.30 }
    ], 12, 12, sareeSkirtMat);
    femaleGroup.add(skirtLapLoft);

    // Cascading Pleats (Kuchi) Falling Straight Down to Footboard
    const kuchiLoft = createSeamlessLoftedLimb([
      { p: [-5.40, fHipY + 0.20, fZ], rx: 0.55, ry: 1.25 },
      { p: [-5.40, fHipY - 1.50, fZ], rx: 0.58, ry: 1.30 },
      { p: [-5.35, 5.65, fZ], rx: 0.62, ry: 1.35 }
    ], 12, 12, sareeSkirtMat);
    femaleGroup.add(kuchiLoft);

    // Broad Golden Hem Border along Bottom of Saree
    const skirtGoldHem = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 2.85), goldTrimMat);
    skirtGoldHem.position.set(-5.35, 5.65, fZ);
    femaleGroup.add(skirtGoldHem);

    group.add(femaleGroup);
'''

with open('scratch/test_adult_rickshaw.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace from `// Helper: Sculpted Human Head with Realistic Facial Features` through `group.add(femaleGroup);`
pattern = r'// Helper: Sculpted Human Head with Realistic Facial Features.*?group\.add\(femaleGroup\);'
match = re.search(pattern, content, flags=re.DOTALL)
if not match:
    print('Pattern not matched!')
else:
    print('Pattern matched! Replacing...')
    new_content = content[:match.start()] + replacement_code.strip() + content[match.end():]
    with open('scratch/test_adult_rickshaw.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully updated scratch/test_adult_rickshaw.html!')
