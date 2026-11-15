import os
import subprocess

html_content = r'''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rebuilt Biker & Mudguards Verification</title>
  <style>
    body { margin: 0; background: #0c1220; overflow: hidden; }
    #canvas-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <script src="../assets/three.min.js"></script>
  <script>
    // Cached Textures
    let _cachedSidewallTexture = null;
    function getSportTireSidewallTexture() {
      if (_cachedSidewallTexture) return _cachedSidewallTexture;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#16181b';
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = '#22252a';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(256, 256, 240, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(256, 256, 218, -Math.PI * 0.42, -Math.PI * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(256, 256, 218, Math.PI * 0.58, Math.PI * 0.92);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate(-Math.PI * 0.25);
      ctx.fillText('DIABLO ROSSO', 0, -188);
      ctx.restore();

      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate(Math.PI * 0.75);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('200/55 ZR17', 0, -188);
      ctx.restore();

      ctx.strokeStyle = '#2a2d32';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 160, 0, Math.PI * 2);
      ctx.stroke();

      _cachedSidewallTexture = new THREE.CanvasTexture(canvas);
      _cachedSidewallTexture.wrapS = THREE.ClampToEdgeWrapping;
      _cachedSidewallTexture.wrapT = THREE.ClampToEdgeWrapping;
      return _cachedSidewallTexture;
    }

    let _cachedRotorTexture = null;
    function getDiscRotorTexture() {
      if (_cachedRotorTexture) return _cachedRotorTexture;
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.arc(128, 128, 68, 0, Math.PI * 2, true);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      for (let r = 80; r <= 112; r += 9) {
        const count = Math.floor(r * 0.45);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + (r * 0.1);
          const x = 128 + Math.cos(angle) * r;
          const y = 128 + Math.sin(angle) * r;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      _cachedRotorTexture = new THREE.CanvasTexture(canvas);
      return _cachedRotorTexture;
    }

    function createLoftedBodyMesh(stations, radSegs, mat) {
      radSegs = radSegs || 24;
      const numStations = stations.length;
      const pos = [];
      const uvs = [];
      const indices = [];

      for (let s = 0; s < numStations; s++) {
        const st = stations[s];
        const u = s / (numStations - 1);
        const ryTop = st.ryTop !== undefined ? st.ryTop : (st.ry !== undefined ? st.ry : 1.0);
        const ryBot = st.ryBot !== undefined ? st.ryBot : (st.ry !== undefined ? st.ry : 1.0);
        const rz = st.rz !== undefined ? st.rz : 1.0;

        for (let j = 0; j <= radSegs; j++) {
          const theta = (j / radSegs) * Math.PI * 2;
          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          const ry = cosT >= 0 ? ryTop : ryBot;
          const y = st.center[1] + cosT * ry;
          const z = st.center[2] + sinT * rz;
          const x = st.center[0];

          pos.push(x, y, z);
          uvs.push(j / radSegs, u);
        }
      }

      for (let s = 0; s < numStations - 1; s++) {
        for (let j = 0; j < radSegs; j++) {
          const a = s * (radSegs + 1) + j;
          const b = (s + 1) * (radSegs + 1) + j;
          const c = (s + 1) * (radSegs + 1) + j + 1;
          const d = s * (radSegs + 1) + j + 1;
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    // Precise Mathematical Arch Fender (Zero Inversion!)
    function createArchFender(cx, cy, r, width, startDeg, endDeg, segs, mat) {
      segs = segs || 20;
      const geo = new THREE.BufferGeometry();
      const pos = [];
      const uvs = [];
      const indices = [];
      const halfW = width / 2;

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const deg = startDeg + t * (endDeg - startDeg);
        const rad = deg * Math.PI / 180;
        const x = cx + Math.cos(rad) * r;
        const y = cy + Math.sin(rad) * r;

        pos.push(x, y, -halfW);
        uvs.push(0, t);
        pos.push(x, y, halfW);
        uvs.push(1, t);
      }

      for (let i = 0; i < segs; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        // Front & Back double sided
        indices.push(a, c, b);
        indices.push(b, c, d);
        indices.push(a, b, c);
        indices.push(b, d, c);
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      return mesh;
    }

    function createTaperedBone(p0, p1, r0, r1, material) {
      const v0 = new THREE.Vector3(p0[0], p0[1], p0[2]);
      const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
      const dir = new THREE.Vector3().subVectors(v1, v0);
      const len = dir.length();
      if (len < 0.001) return new THREE.Group();
      const mid = new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5);

      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 16), material);
      cyl.position.copy(mid);
      const unitY = new THREE.Vector3(0, 1, 0);
      cyl.quaternion.setFromUnitVectors(unitY, dir.clone().normalize());
      return cyl;
    }

    // Shared Materials
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.90 });
    const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.45, metalness: 0.50 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.22, metalness: 0.82 });
    const gunmetalEngineMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.38, metalness: 0.65 });
    const bronzeCoverMat = new THREE.MeshStandardMaterial({ color: 0x78563a, roughness: 0.30, metalness: 0.60 });
    const goldAnodizedMat = new THREE.MeshStandardMaterial({ color: 0xd4a024, roughness: 0.22, metalness: 0.82 });
    const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.75, metalness: 0.05 });
    const discRotorMat = new THREE.MeshStandardMaterial({ map: getDiscRotorTexture(), roughness: 0.25, metalness: 0.85, transparent: true });

    const pearlWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.18, metalness: 0.15 });
    const matteBlackKneeMat = new THREE.MeshStandardMaterial({ color: 0x1e2124, roughness: 0.85 });
    const smokedVisorMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.10, metalness: 0.20, transparent: true, opacity: 0.80 });

    const glossyBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.15, metalness: 0.30 });
    const crimsonPinstripeMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.20 });
    const redRimStripeMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.30, metalness: 0.10 });

    function createSportWheel(radius, width, isRear, isModelA) {
      const wheel = new THREE.Group();
      const rimRadius = radius * 0.70;

      const tire = new THREE.Mesh(new THREE.TorusGeometry(radius - width * 0.42, width * 0.42, 18, 36), rubberMat);
      wheel.add(tire);

      if (isModelA) {
        [-1, 1].forEach(side => {
          const sidewallGeo = new THREE.RingGeometry(rimRadius * 0.98, radius * 0.98, 32);
          const sidewallMat = new THREE.MeshBasicMaterial({ map: getSportTireSidewallTexture(), transparent: true, side: THREE.DoubleSide });
          const sidewall = new THREE.Mesh(sidewallGeo, sidewallMat);
          sidewall.position.z = side * (width * 0.43);
          wheel.add(sidewall);
        });
      } else {
        [-1, 1].forEach(side => {
          const rimStripe = new THREE.Mesh(new THREE.TorusGeometry(rimRadius + 0.08, 0.07, 8, 36), redRimStripeMat);
          rimStripe.position.z = side * (width * 0.38);
          wheel.add(rimStripe);
        });
      }

      // Clean dark billet hub (ZERO stray tan blocks)
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, width * 0.85, 18), darkFrameMat);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);

      // 5-spoke billet rim (clean darkFrameMat for both models)
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.32, rimRadius * 0.92, width * 0.32), darkFrameMat);
        spoke.rotation.z = (i / 5) * Math.PI * 2;
        spoke.position.set(Math.sin((i / 5) * Math.PI * 2) * (rimRadius * 0.46), Math.cos((i / 5) * Math.PI * 2) * (rimRadius * 0.46), 0);
        wheel.add(spoke);
      }

      const disc = new THREE.Mesh(new THREE.RingGeometry(radius * 0.24, radius * 0.62, 32), discRotorMat);
      disc.position.z = isRear ? -width * 0.36 : width * 0.36;
      wheel.add(disc);

      return wheel;
    }

    // =========================================================================
    // REBUILT 3D BIKER HUMAN ANATOMY BUILDER
    // =========================================================================
    function buildRealisticBiker(isCruiser, saddlePos, gripLeft, gripRight, pegLeft, pegRight) {
      const biker = new THREE.Group();

      // Distinct Outfits
      let jacketHex, pantsHex, bootHex, helmetHex, helmetAccentHex;
      if (isCruiser) {
        // Black Cruiser Rider
        jacketHex = 0x1e242b; // Fitted charcoal-black biker jacket
        pantsHex = 0x1e293b;  // Dark indigo jeans
        bootHex = 0x121417;   // Black combat/riding boots
        helmetHex = 0x111317; // Matte-black helmet
        helmetAccentHex = 0x334155;
      } else {
        // White Streetfighter Rider
        jacketHex = 0x3d4f49; // Olive-slate armored riding jacket
        pantsHex = 0x2b4c7e;  // Dark blue denim jeans
        bootHex = 0x261c14;   // Dark brown/black ankle riding boots
        helmetHex = 0x0f172a; // Glossy black with white accents
        helmetAccentHex = 0xf5f6fa;
      }

      const jacketMat = new THREE.MeshStandardMaterial({ color: jacketHex, roughness: 0.78, metalness: 0.08 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.85, metalness: 0.04 });
      const bootMat = new THREE.MeshStandardMaterial({ color: bootHex, roughness: 0.60, metalness: 0.12 });
      const soleMat = new THREE.MeshStandardMaterial({ color: 0x0d0e12, roughness: 0.90 });
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.65, metalness: 0.15 });
      const helmetMat = new THREE.MeshStandardMaterial({ color: helmetHex, roughness: isCruiser ? 0.85 : 0.25, metalness: 0.35 });
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.04, metalness: 0.95 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8926d, roughness: 0.60 });

      // 1. SCULPTED PELVIS & GLUTES SEATED SQUARELY ON SADDLE
      // Position pelvis directly inside saddle bucket
      const pelvisGroup = new THREE.Group();
      pelvisGroup.position.set(saddlePos[0], saddlePos[1] + 0.35, saddlePos[2]);

      // Rounded pelvis & glutes ellipsoid filling saddle curve
      const glutesMesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 16), pantsMat);
      glutesMesh.scale.set(1.22, 0.88, 1.10);
      glutesMesh.position.set(0, 0, 0);
      pelvisGroup.add(glutesMesh);

      biker.add(pelvisGroup);

      // 2. ANATOMICAL V-TAPERED JACKET TORSO
      // Leaned forward toward handlebars (~28° on streetfighter, ~15° on cruiser)
      const leanAngle = isCruiser ? -0.22 : -0.48; // Radians
      const torsoGroup = new THREE.Group();
      torsoGroup.position.set(saddlePos[0] + 0.15, saddlePos[1] + 0.75, saddlePos[2]);
      torsoGroup.rotation.z = leanAngle;

      // V-tapered lofted jacket stations (Waist -> Ribs -> Broad Chest/Shoulders)
      const torsoStations = [
        { center: [0.0, 0.0, 0],   ryTop: 0.80, ryBot: 0.80, rz: 1.05 }, // Waist
        { center: [0.0, 1.3, 0],   ryTop: 0.95, ryBot: 0.90, rz: 1.25 }, // Mid-torso
        { center: [0.0, 2.7, 0],   ryTop: 1.15, ryBot: 1.05, rz: 1.45 }, // Broad chest
        { center: [0.0, 3.8, 0],   ryTop: 0.95, ryBot: 0.85, rz: 1.35 }  // Shoulder plane
      ];
      torsoGroup.add(createLoftedBodyMesh(torsoStations, 20, jacketMat));

      // Fitted jacket high collar
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.65, 0.45, 18), jacketMat);
      collar.position.set(0, 4.0, 0);
      torsoGroup.add(collar);

      biker.add(torsoGroup);

      // Compute world shoulder positions below collarbone (INSIDE and flush with upper jacket corners!)
      // In local torso coords: shoulder is at (0, 3.5, ±1.35)
      const shLocalL = new THREE.Vector3(0, 3.5, -1.35);
      const shLocalR = new THREE.Vector3(0, 3.5, 1.35);
      shLocalL.applyEuler(new THREE.Euler(0, 0, leanAngle)).add(torsoGroup.position);
      shLocalR.applyEuler(new THREE.Euler(0, 0, leanAngle)).add(torsoGroup.position);

      // Rounded deltoid shoulder joints flush with jacket
      [shLocalL, shLocalR].forEach(shPos => {
        const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), jacketMat);
        deltoid.position.copy(shPos);
        biker.add(deltoid);
      });

      // 3. TAPERED CURVED ARMS & MOTORCYCLE GLOVES
      [[-1, shLocalL, gripLeft], [1, shLocalR, gripRight]].forEach(([side, shPos, gripPos]) => {
        // Natural elbow position with ~22° bend
        const shX = shPos.x;
        const shY = shPos.y;
        const shZ = shPos.z;
        const gx = gripPos[0];
        const gy = gripPos[1];
        const gz = gripPos[2];

        // Elbow positioned between shoulder and grip with slight outward flare
        const elbowX = shX + (gx - shX) * 0.48;
        const elbowY = shY + (gy - shY) * 0.42 - 0.45;
        const elbowZ = side * (Math.abs(shZ) + 0.35);

        const wristX = gx - 0.18;
        const wristY = gy - 0.08;
        const wristZ = gz;

        // Bicep (tapering from 0.34 to 0.28)
        biker.add(createTaperedBone([shX, shY, shZ], [elbowX, elbowY, elbowZ], 0.34, 0.28, jacketMat));

        // Rounded elbow joint
        const elbowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12), jacketMat);
        elbowMesh.position.set(elbowX, elbowY, elbowZ);
        biker.add(elbowMesh);

        // Forearm (tapering from 0.28 to 0.21 at wrist)
        biker.add(createTaperedBone([elbowX, elbowY, elbowZ], [wristX, wristY, wristZ], 0.28, 0.21, jacketMat));

        // Sculpted Motorcycle Riding Glove gripping handlebar
        const handGroup = new THREE.Group();
        handGroup.position.set(gx, gy, gz);

        // Palm & back protector
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.45), gloveMat);
        handGroup.add(palm);

        // Curled fingers wrapped around grip
        const fingers = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.42, 14), gloveMat);
        fingers.rotation.x = Math.PI / 2;
        fingers.position.set(0.16, -0.06, 0);
        handGroup.add(fingers);

        // Lever (clutch / brake)
        const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.90, 8), chromeMat);
        lever.rotation.x = Math.PI / 2 + (side * 0.12);
        lever.position.set(0.32, 0.04, -side * 0.22);
        handGroup.add(lever);

        biker.add(handGroup);
      });

      // 4. CONNECTED THIGHS, KNEES, CALVES & RIDING BOOTS
      [[-1, pegLeft], [1, pegRight]].forEach(([side, pegPos]) => {
        const hipX = saddlePos[0] + 0.35;
        const hipY = saddlePos[1] + 0.25;
        const hipZ = side * 0.78;

        const px = pegPos[0];
        const py = pegPos[1];
        const pz = pegPos[2];

        // Knee position hugging the fuel tank
        let kneeX, kneeY, kneeZ;
        if (isCruiser) {
          kneeX = hipX + 1.8;
          kneeY = hipY - 0.2;
          kneeZ = side * 1.15;
        } else {
          kneeX = hipX + 1.6;
          kneeY = hipY - 0.35;
          kneeZ = side * 1.15;
        }

        // Thigh bone
        biker.add(createTaperedBone([hipX, hipY, hipZ], [kneeX, kneeY, kneeZ], 0.45, 0.38, pantsMat));

        // Knee joint with subtle dark knee-pad contour
        const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 14), pantsMat);
        kneeMesh.position.set(kneeX, kneeY, kneeZ);
        biker.add(kneeMesh);

        // Dark knee armor patch
        const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), gloveMat);
        kneePad.scale.set(0.5, 0.9, 0.8);
        kneePad.position.set(kneeX + 0.22, kneeY, kneeZ);
        biker.add(kneePad);

        // Calf / Shin
        const anklePos = [px, py + 0.45, pz];
        biker.add(createTaperedBone([kneeX, kneeY, kneeZ], anklePos, 0.36, 0.26, pantsMat));

        // Sculpted Motorcycle Riding Boot on footpeg
        const bootGroup = new THREE.Group();
        bootGroup.position.set(px, py, pz);
        if (isCruiser) bootGroup.rotation.z = 0.28;

        // Ankle shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.65, 14), bootMat);
        shaft.position.set(0, 0.32, 0);
        bootGroup.add(shaft);

        // Sole
        const sole = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.68), soleMat);
        sole.position.set(0.30, 0.09, 0);
        bootGroup.add(sole);

        // Upper boot body
        const upper = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.42, 0.64), bootMat);
        upper.position.set(0.12, 0.32, 0);
        bootGroup.add(upper);

        // Reinforced toe cap
        const toe = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.32, 0.62), bootMat);
        toe.position.set(0.68, 0.25, 0);
        bootGroup.add(toe);

        biker.add(bootGroup);
      });

      // 5. PROPORTIONATE FULL-FACE MOTORCYCLE HELMET (+30% LARGER)
      // Neck seal connecting cleanly into jacket collar
      const neckLocal = new THREE.Vector3(0, 4.3, 0);
      neckLocal.applyEuler(new THREE.Euler(0, 0, leanAngle)).add(torsoGroup.position);

      const neckSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.55, 18), gloveMat);
      neckSeal.position.copy(neckLocal);
      neckSeal.rotation.z = leanAngle;
      biker.add(neckSeal);

      const headPos = new THREE.Vector3(0, 4.8, 0);
      headPos.applyEuler(new THREE.Euler(0, 0, leanAngle)).add(torsoGroup.position);

      const helmetGroup = new THREE.Group();
      helmetGroup.position.copy(headPos);
      helmetGroup.rotation.z = isCruiser ? -0.05 : -0.18; // Leveled riding sightline

      // 1.30x Scale Full-Face Helmet Shell (Elongated aerodynamic oval)
      const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(1.05, 36, 28), helmetMat);
      helmetShell.scale.set(1.18, 1.15, 1.02);
      helmetShell.position.set(-0.06, 0.05, 0);
      helmetGroup.add(helmetShell);

      // Full-face chin guard bar
      const chinGuard = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.95, 0.52, 28, 1, false, -Math.PI * 0.36, Math.PI * 0.72), helmetMat);
      chinGuard.scale.set(1.15, 1.0, 1.0);
      chinGuard.position.set(0.20, -0.32, 0);
      helmetGroup.add(chinGuard);

      // Curved tinted full-face shield visor wrapping across eye port
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.02, 0.54, 28, 1, true, -Math.PI * 0.36, Math.PI * 0.72), visorMat);
      visor.scale.set(1.16, 1.0, 1.0);
      visor.position.set(0.22, 0.12, 0);
      helmetGroup.add(visor);

      // Rear aerodynamic spoiler lip (on streetfighter)
      if (!isCruiser) {
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 1.15), helmetMat);
        spoiler.position.set(-1.08, 0.22, 0);
        spoiler.rotation.z = -0.32;
        helmetGroup.add(spoiler);
      }

      biker.add(helmetGroup);

      return biker;
    }

    // =========================================================================
    // MODEL A: STREETFIGHTER
    // =========================================================================
    function buildStreetfighterModelA() {
      const bike = new THREE.Group();
      const frontX = 8.2;
      const rearX = -8.2;
      const wheelY = 3.25;

      const fWheel = createSportWheel(3.25, 1.45, false, true);
      fWheel.position.set(frontX, wheelY, 0);
      bike.add(fWheel);

      const rWheel = createSportWheel(3.25, 1.80, true, true);
      rWheel.position.set(rearX, wheelY, 0);
      bike.add(rWheel);

      // Caliper: dark metallic (ZERO stray tan block on front axle)
      const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.42), darkFrameMat);
      fCaliper.position.set(frontX - 1.25, wheelY + 1.25, 0.65);
      bike.add(fCaliper);

      const rakeAngle = 0.40;
      const tripleTreeX = 5.6;
      const tripleTreeY = 8.2;

      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), darkFrameMat);
      topClamp.position.set(tripleTreeX, tripleTreeY, 0);
      topClamp.rotation.z = rakeAngle;
      bike.add(topClamp);

      const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), darkFrameMat);
      lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.5, tripleTreeY - Math.cos(rakeAngle) * 1.5, 0);
      lowerClamp.rotation.z = rakeAngle;
      bike.add(lowerClamp);

      [-1.15, 1.15].forEach(fz => {
        const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 3.8, 14), chromeMat);
        slider.position.set(frontX - Math.sin(rakeAngle) * 1.8, wheelY + Math.cos(rakeAngle) * 1.8, fz);
        slider.rotation.z = rakeAngle;
        bike.add(slider);

        const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 4.2, 16), pearlWhiteMat);
        shroud.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
        shroud.rotation.z = rakeAngle;
        bike.add(shroud);

        const axleClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), darkFrameMat);
        axleClamp.position.set(frontX, wheelY, fz);
        bike.add(axleClamp);
      });

      // 1. PROPER SCULPTED PEARL-WHITE FRONT MUDGUARD (50° to 135°, centered at 90° over tire crest)
      const frontMudguard = createArchFender(frontX, wheelY, 3.25 + 0.14, 1.65, 50, 135, 20, pearlWhiteMat);
      bike.add(frontMudguard);

      // Slatted Headlight with 4 Prominent Vertical Black Grill Slats & Smoked Flyscreen
      const headlightGroup = new THREE.Group();
      headlightGroup.position.set(tripleTreeX + 1.25, tripleTreeY - 0.35, 0);

      const hlBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.80, 0.85, 20), darkFrameMat);
      hlBucket.rotation.z = Math.PI / 2;
      headlightGroup.add(hlBucket);

      const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.88, 24), new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, emissiveIntensity: 0.95, roughness: 0.10 }));
      hlLens.rotation.y = Math.PI / 2;
      hlLens.position.set(0.44, 0, 0);
      headlightGroup.add(hlLens);

      const hlBezel = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.08, 10, 24), darkFrameMat);
      hlBezel.rotation.y = Math.PI / 2;
      hlBezel.position.set(0.48, 0, 0);
      headlightGroup.add(hlBezel);

      [-0.50, -0.17, 0.17, 0.50].forEach(sz => {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 0.09), darkFrameMat);
        slat.position.set(0.52, 0, sz);
        headlightGroup.add(slat);
      });

      const visorShape = new THREE.Shape();
      visorShape.moveTo(0, 0);
      visorShape.quadraticCurveTo(0.5, 1.4, 0.2, 2.2);
      visorShape.quadraticCurveTo(-0.7, 1.8, -0.6, 0);
      visorShape.closePath();
      const visorGeo = new THREE.ExtrudeGeometry(visorShape, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06 });
      visorGeo.translate(0, 0, -0.8);
      const visorMesh = new THREE.Mesh(visorGeo, smokedVisorMat);
      visorMesh.position.set(-0.25, 0.75, 0);
      visorMesh.rotation.z = -0.42;
      headlightGroup.add(visorMesh);
      bike.add(headlightGroup);

      // Drag Bars with Bar-End Mirrors
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 14), darkFrameMat);
      hBar.rotation.x = Math.PI / 2;
      hBar.position.set(tripleTreeX + 0.15, tripleTreeY + 0.55, 0);
      bike.add(hBar);

      const gripLeft = [tripleTreeX + 0.15, tripleTreeY + 0.55, -1.85];
      const gripRight = [tripleTreeX + 0.15, tripleTreeY + 0.55, 1.85];

      [-2.25, 2.25].forEach(bz => {
        const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.50, 0.08), darkFrameMat);
        mirrorStem.position.set(tripleTreeX + 0.15, tripleTreeY + 0.30, bz);
        bike.add(mirrorStem);
        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), darkFrameMat);
        mirror.rotation.z = Math.PI / 2;
        mirror.position.set(tripleTreeX + 0.15, tripleTreeY + 0.05, bz);
        bike.add(mirror);
      });

      // Tubular Trellis Frame
      const trellisTubes = [
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, 0.95], [2.2, 5.8, 1.25], [-1.2, 4.2, 1.05]],
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, -0.95], [2.2, 5.8, -1.25], [-1.2, 4.2, -1.05]],
        [[3.8, 6.8, 1.05], [1.2, 4.2, 1.15], [-1.2, 4.2, 1.05]],
        [[3.8, 6.8, -1.05], [1.2, 4.2, -1.15], [-1.2, 4.2, -1.05]]
      ];
      trellisTubes.forEach(pts => {
        const vPts = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const curve = new THREE.CatmullRomCurve3(vPts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.18, 8, false), darkFrameMat);
        bike.add(tube);
      });

      const engineBox = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 2.2), gunmetalEngineMat);
      engineBox.position.set(1.4, 4.6, 0);
      bike.add(engineBox);

      for (let y = 3.4; y <= 5.8; y += 0.35) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.45), darkFrameMat);
        fin.position.set(1.4, y, 0);
        bike.add(fin);
      }

      const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 2.0), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.40, metalness: 0.7 }));
      radiator.position.set(3.8, 4.6, 0);
      bike.add(radiator);

      [
        { x: 2.4, y: 4.0, r: 0.70, d: 0.28 },
        { x: 0.9, y: 4.8, r: 0.58, d: 0.24 },
        { x: 1.0, y: 3.6, r: 0.48, d: 0.20 }
      ].forEach(cov => {
        const cMesh = new THREE.Mesh(new THREE.CylinderGeometry(cov.r, cov.r, cov.d, 18), bronzeCoverMat);
        cMesh.rotation.x = Math.PI / 2;
        cMesh.position.set(cov.x, cov.y, 1.15);
        bike.add(cMesh);
      });

      // 2. TIGHTLY CONTOURED PEARL-WHITE BELLY PAN (SHRUNK BY 45%)
      const bellyShape = new THREE.Shape();
      bellyShape.moveTo(3.2, 3.6);
      bellyShape.lineTo(3.4, 2.8);
      bellyShape.lineTo(2.0, 2.3);
      bellyShape.lineTo(0.4, 2.3);
      bellyShape.lineTo(0.2, 3.0);
      bellyShape.lineTo(1.2, 3.6);
      bellyShape.closePath();
      const bellyGeo = new THREE.ExtrudeGeometry(bellyShape, { depth: 1.55, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06 });
      bellyGeo.translate(0, 0, -1.55 / 2);
      const bellyPan = new THREE.Mesh(bellyGeo, pearlWhiteMat);
      bike.add(bellyPan);

      // Sculpted Muscular Pearl-White Humpback Fuel Tank with Knee Cutouts
      const tankStations = [
        { center: [5.4, 7.6, 0],  ryTop: 0.55, ryBot: 0.65, rz: 0.65 },
        { center: [4.4, 8.2, 0],  ryTop: 1.25, ryBot: 1.35, rz: 1.35 },
        { center: [3.2, 8.6, 0],  ryTop: 1.55, ryBot: 1.65, rz: 1.50 },
        { center: [1.8, 8.1, 0],  ryTop: 1.35, ryBot: 1.50, rz: 1.38 },
        { center: [0.4, 7.5, 0],  ryTop: 1.00, ryBot: 1.15, rz: 1.05 },
        { center: [-1.0, 6.9, 0], ryTop: 0.55, ryBot: 0.65, rz: 0.75 }
      ];
      bike.add(createLoftedBodyMesh(tankStations, 24, pearlWhiteMat));

      const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 18), chromeMat);
      gasCap.position.set(2.8, 10.25, 0);
      gasCap.rotation.z = -0.15;
      bike.add(gasCap);

      [-1.22, 1.22].forEach(kz => {
        const padMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), matteBlackKneeMat);
        padMesh.scale.set(1.4, 0.65, 0.14);
        padMesh.position.set(1.0, 7.6, kz);
        padMesh.rotation.z = 0.15;
        bike.add(padMesh);
      });

      // Contoured Saddle
      const saddleStations = [
        { center: [-1.0, 6.9, 0], ryTop: 0.42, ryBot: 0.45, rz: 0.75 },
        { center: [-2.2, 6.5, 0], ryTop: 0.38, ryBot: 0.42, rz: 0.85 },
        { center: [-3.4, 6.8, 0], ryTop: 0.40, ryBot: 0.40, rz: 0.80 },
        { center: [-4.4, 7.4, 0], ryTop: 0.45, ryBot: 0.38, rz: 0.75 }
      ];
      bike.add(createLoftedBodyMesh(saddleStations, 20, darkLeatherMat));

      const tailStations = [
        { center: [-4.4, 7.4, 0], ryTop: 0.48, ryBot: 0.38, rz: 0.78 },
        { center: [-5.6, 7.9, 0], ryTop: 0.45, ryBot: 0.32, rz: 0.68 },
        { center: [-7.0, 8.3, 0], ryTop: 0.35, ryBot: 0.25, rz: 0.50 },
        { center: [-8.2, 8.1, 0], ryTop: 0.18, ryBot: 0.15, rz: 0.25 }
      ];
      bike.add(createLoftedBodyMesh(tailStations, 20, pearlWhiteMat));

      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.65), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 }));
      tailLight.position.set(-8.25, 8.1, 0);
      bike.add(tailLight);

      // 3. REAR WHITE MUDGUARD ROTATED UPWARD (45° to 120° above horizontal axle line)
      const rearMudguard = createArchFender(rearX, wheelY, 3.25 + 0.14, 1.85, 45, 120, 20, pearlWhiteMat);
      bike.add(rearMudguard);

      const headerPts = [
        new THREE.Vector3(3.4, 4.6, 0.3),
        new THREE.Vector3(4.0, 3.2, 0.5),
        new THREE.Vector3(2.6, 2.3, 0.8),
        new THREE.Vector3(0.0, 2.5, 0.9),
        new THREE.Vector3(-1.8, 3.4, 0.9),
        new THREE.Vector3(-3.8, 5.2, 0.5),
        new THREE.Vector3(-5.5, 7.2, 0.0)
      ];
      const headerTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(headerPts), 24, 0.22, 10, false), chromeMat);
      bike.add(headerTube);

      const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.8, 16), darkFrameMat);
      muffler.rotation.z = Math.PI / 2 - 0.15;
      muffler.scale.set(0.85, 1.0, 1.45);
      muffler.position.set(-6.8, 7.6, 0);
      bike.add(muffler);

      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.25, 12), bronzeCoverMat);
      endCap.rotation.z = Math.PI / 2 - 0.15;
      endCap.position.set(-8.2, 7.85, 0);
      bike.add(endCap);

      [-1.05, 1.05].forEach(sz => {
        const swingArm = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.75, 0.42), darkFrameMat);
        swingArm.position.set(-4.6, 3.7, sz);
        swingArm.rotation.z = 0.14;
        bike.add(swingArm);
      });

      // 4. METALLIC BLACK FOOTPEGS FOR BOOTS
      const pegLeft = [0.4, 4.1, -1.45];
      const pegRight = [0.4, 4.1, 1.45];
      [-1, 1].forEach(side => {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 12), darkFrameMat);
        peg.rotation.x = Math.PI / 2;
        peg.position.set(0.4, 3.9, side * 1.45);
        bike.add(peg);
      });

      // 5. ATTACH REBUILT BIKER (Sport Tuck Posture)
      const saddlePos = [-2.2, 6.7, 0];
      const biker = buildRealisticBiker(false, saddlePos, gripLeft, gripRight, pegLeft, pegRight);
      bike.add(biker);

      return bike;
    }

    // =========================================================================
    // MODEL B: CRUISER
    // =========================================================================
    function buildCruiserModelB() {
      const bike = new THREE.Group();
      const frontX = 8.8;
      const rearX = -8.6;
      const wheelY = 3.25;

      const fWheel = createSportWheel(3.25, 1.45, false, false);
      fWheel.position.set(frontX, wheelY, 0);
      bike.add(fWheel);

      const rWheel = createSportWheel(3.10, 2.20, true, false);
      rWheel.position.set(rearX, 3.10, 0);
      bike.add(rWheel);

      const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.45), darkFrameMat);
      fCaliper.position.set(frontX - 1.25, wheelY + 1.20, 0.75);
      bike.add(fCaliper);

      const rakeAngle = 0.52;
      const tripleTreeX = 5.8;
      const tripleTreeY = 8.4;

      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), chromeMat);
      topClamp.position.set(tripleTreeX, tripleTreeY, 0);
      topClamp.rotation.z = rakeAngle;
      bike.add(topClamp);

      const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), chromeMat);
      lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.6, tripleTreeY - Math.cos(rakeAngle) * 1.6, 0);
      lowerClamp.rotation.z = rakeAngle;
      bike.add(lowerClamp);

      [-1.15, 1.15].forEach(fz => {
        const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 4.2, 14), chromeMat);
        slider.position.set(frontX - Math.sin(rakeAngle) * 2.0, wheelY + Math.cos(rakeAngle) * 2.0, fz);
        slider.rotation.z = rakeAngle;
        bike.add(slider);

        const goldTube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 4.8, 16), goldAnodizedMat);
        goldTube.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
        goldTube.rotation.z = rakeAngle;
        bike.add(goldTube);

        const axleClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), darkFrameMat);
        axleClamp.position.set(frontX, wheelY, fz);
        bike.add(axleClamp);
      });

      // 1. RAISED & THICKENED FRONT FENDER (55° to 135°, centered under gold fork bridge)
      const fFender = createArchFender(frontX, wheelY, 3.25 + 0.16, 1.65, 55, 135, 20, glossyBlackMat);
      bike.add(fFender);

      // Continuous crimson pinstripe line along front fender arch (radius = tireRadius + 0.20, NEVER clips)
      const fStripeCurve = new THREE.CatmullRomCurve3();
      for (let d = 55; d <= 135; d += 10) {
        const rad = d * Math.PI / 180;
        fStripeCurve.points.push(new THREE.Vector3(frontX + Math.cos(rad) * (3.25 + 0.20), wheelY + Math.sin(rad) * (3.25 + 0.20), 0));
      }
      const fFenderStripe = new THREE.Mesh(new THREE.TubeGeometry(fStripeCurve, 16, 0.05, 8, false), crimsonPinstripeMat);
      bike.add(fFenderStripe);

      const hlGroup = new THREE.Group();
      hlGroup.position.set(tripleTreeX + 1.2, tripleTreeY - 0.35, 0);

      const hlShell = new THREE.Mesh(new THREE.SphereGeometry(0.90, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), darkFrameMat);
      hlShell.rotation.z = Math.PI / 2;
      hlGroup.add(hlShell);

      const hlRim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.09, 10, 24), chromeMat);
      hlRim.rotation.y = Math.PI / 2;
      hlRim.position.set(0.42, 0, 0);
      hlGroup.add(hlRim);

      const hlGlass = new THREE.Mesh(new THREE.CircleGeometry(0.84, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffedd5, emissiveIntensity: 0.85, roughness: 0.1 }));
      hlGlass.rotation.y = Math.PI / 2;
      hlGlass.position.set(0.45, 0, 0);
      hlGroup.add(hlGlass);

      const cowlShape = new THREE.Shape();
      cowlShape.moveTo(-0.2, 0);
      cowlShape.quadraticCurveTo(0.6, 1.2, 0.2, 1.9);
      cowlShape.quadraticCurveTo(-0.8, 1.6, -0.6, 0);
      cowlShape.closePath();
      const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, { depth: 1.85, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08 });
      cowlGeo.translate(0, 0, -1.85 / 2);
      const miniCowl = new THREE.Mesh(cowlGeo, glossyBlackMat);
      miniCowl.position.set(0.1, 0.45, 0);
      miniCowl.rotation.z = -0.32;
      hlGroup.add(miniCowl);
      bike.add(hlGroup);

      const cBar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.6, 14), darkFrameMat);
      cBar.rotation.x = Math.PI / 2;
      cBar.position.set(tripleTreeX - 0.25, tripleTreeY + 0.65, 0);
      bike.add(cBar);

      const gripLeft = [tripleTreeX - 0.25, tripleTreeY + 0.65, -1.95];
      const gripRight = [tripleTreeX - 0.25, tripleTreeY + 0.65, 1.95];

      [-2.1, 2.1].forEach(mz => {
        const mStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), chromeMat);
        mStem.position.set(tripleTreeX - 0.25, tripleTreeY + 1.05, mz);
        bike.add(mStem);
        const mHead = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), chromeMat);
        mHead.position.set(tripleTreeX - 0.25, tripleTreeY + 1.45, mz);
        mHead.rotation.x = Math.PI / 2;
        bike.add(mHead);
      });

      // Exposed V-Twin Engine in Frame Cradle
      const vTwinGroup = new THREE.Group();
      vTwinGroup.position.set(0.8, 3.8, 0);
      vTwinGroup.add(new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 2.4), gunmetalEngineMat));

      [-0.42, 0.42].forEach(va => {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.90, 1.8, 16), darkFrameMat);
        cyl.rotation.z = va;
        cyl.position.set(Math.sin(va) * 1.35, Math.cos(va) * 1.35, 0);
        vTwinGroup.add(cyl);

        for (let f = -0.7; f <= 0.7; f += 0.28) {
          const cFin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 16), darkFrameMat);
          cFin.rotation.z = va;
          cFin.position.set(Math.sin(va) * (1.35 + f), Math.cos(va) * (1.35 + f), 0);
          vTwinGroup.add(cFin);
        }

        const rockerHead = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 1.95), chromeMat);
        rockerHead.rotation.z = va;
        rockerHead.position.set(Math.sin(va) * 2.35, Math.cos(va) * 2.35, 0);
        vTwinGroup.add(rockerHead);

        [-0.55, 0.55].forEach(pz => {
          const pushRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), chromeMat);
          pushRod.rotation.z = va * 1.08;
          pushRod.position.set(Math.sin(va) * 1.35, Math.cos(va) * 1.35, pz * 1.05);
          vTwinGroup.add(pushRod);
        });
      });

      const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.32, 20), chromeMat);
      airCleaner.rotation.x = Math.PI / 2;
      airCleaner.position.set(0.0, 1.3, 1.32);
      vTwinGroup.add(airCleaner);

      const primaryCover = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 20), chromeMat);
      primaryCover.rotation.x = Math.PI / 2;
      primaryCover.position.set(0.2, -0.2, 1.25);
      vTwinGroup.add(primaryCover);
      bike.add(vTwinGroup);

      [0.95, 1.30].forEach((pz, idx) => {
        const pipeY = 2.7 + idx * 0.45;
        const pipePts = [
          new THREE.Vector3(2.4, 4.4 - idx * 0.4, 0.6),
          new THREE.Vector3(3.0, 3.4, pz),
          new THREE.Vector3(1.2, pipeY, pz),
          new THREE.Vector3(-7.4, pipeY, pz)
        ];
        const pipeCurve = new THREE.CatmullRomCurve3(pipePts);
        const exPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 20, 0.22, 10, false), chromeMat);
        bike.add(exPipe);

        const slashTip = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.8, 12), chromeMat);
        slashTip.rotation.z = Math.PI / 2 + 0.35;
        slashTip.position.set(-7.7, pipeY, pz);
        bike.add(slashTip);
      });

      // 2. CLEAN FUEL TANK (ZERO STRAY TANK BOX)
      const cruiserTankStations = [
        { center: [5.4, 7.5, 0],  ryTop: 0.50, ryBot: 0.65, rz: 0.65 },
        { center: [4.0, 8.4, 0],  ryTop: 1.20, ryBot: 1.45, rz: 1.40 },
        { center: [2.2, 8.2, 0],  ryTop: 1.15, ryBot: 1.35, rz: 1.30 },
        { center: [0.2, 7.3, 0],  ryTop: 0.90, ryBot: 1.10, rz: 1.05 },
        { center: [-1.4, 6.4, 0], ryTop: 0.50, ryBot: 0.65, rz: 0.72 }
      ];
      bike.add(createLoftedBodyMesh(cruiserTankStations, 24, glossyBlackMat));

      // Low-profile flush billet gas cap (ZERO vertical grey bar)
      const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.10, 18), chromeMat);
      gasCap.position.set(3.2, 8.85, 0);
      gasCap.rotation.z = -0.25;
      bike.add(gasCap);

      [-1.38, 1.38].forEach(tz => {
        const pinstripeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-1.2, 6.5, tz * 0.7),
          new THREE.Vector3(0.4, 7.5, tz * 0.95),
          new THREE.Vector3(2.2, 8.6, tz * 1.05),
          new THREE.Vector3(4.0, 8.7, tz * 1.05),
          new THREE.Vector3(5.2, 7.7, tz * 0.6)
        ]);
        const stripeTube = new THREE.Mesh(new THREE.TubeGeometry(pinstripeCurve, 20, 0.05, 8, false), crimsonPinstripeMat);
        bike.add(stripeTube);
      });

      const chinShape = new THREE.Shape();
      chinShape.moveTo(3.6, 4.0);
      chinShape.lineTo(4.6, 2.8);
      chinShape.lineTo(3.2, 1.9);
      chinShape.lineTo(0.8, 1.9);
      chinShape.lineTo(1.8, 3.4);
      chinShape.closePath();
      const chinGeo = new THREE.ExtrudeGeometry(chinShape, { depth: 1.85, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08 });
      chinGeo.translate(0, 0, -1.85 / 2);
      const chinMesh = new THREE.Mesh(chinGeo, glossyBlackMat);
      bike.add(chinMesh);

      const chinStripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.09, 1.95), crimsonPinstripeMat);
      chinStripe.position.set(2.4, 2.2, 0);
      chinStripe.rotation.z = -0.35;
      bike.add(chinStripe);

      // Low Scooped Saddle
      const seatStations = [
        { center: [-1.4, 6.4, 0], ryTop: 0.38, ryBot: 0.35, rz: 0.72 },
        { center: [-2.6, 5.8, 0], ryTop: 0.35, ryBot: 0.35, rz: 0.88 },
        { center: [-3.8, 6.3, 0], ryTop: 0.40, ryBot: 0.32, rz: 0.80 },
        { center: [-4.4, 6.1, 0], ryTop: 0.25, ryBot: 0.22, rz: 0.75 }
      ];
      bike.add(createLoftedBodyMesh(seatStations, 20, darkLeatherMat));

      const fenderStations = [
        { center: [-4.3, 6.08, 0], ryTop: 0.16, ryBot: 0.14, rz: 1.12 },
        { center: [-5.6, 6.35, 0], ryTop: 0.18, ryBot: 0.16, rz: 1.22 },
        { center: [-7.2, 6.55, 0], ryTop: 0.20, ryBot: 0.18, rz: 1.25 },
        { center: [-8.8, 6.50, 0], ryTop: 0.20, ryBot: 0.18, rz: 1.22 },
        { center: [-10.4, 5.75, 0], ryTop: 0.18, ryBot: 0.16, rz: 1.18 },
        { center: [-11.5, 4.40, 0], ryTop: 0.16, ryBot: 0.14, rz: 1.10 }
      ];
      bike.add(createLoftedBodyMesh(fenderStations, 24, glossyBlackMat));

      [-1.18, 1.18].forEach(rz => {
        const rStripeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-4.4, 6.12, rz * 0.75),
          new THREE.Vector3(-6.2, 6.42, rz * 0.95),
          new THREE.Vector3(-8.8, 6.56, rz * 0.98),
          new THREE.Vector3(-10.4, 5.82, rz * 0.95),
          new THREE.Vector3(-11.5, 4.45, rz * 0.80)
        ]);
        const rStripe = new THREE.Mesh(new THREE.TubeGeometry(rStripeCurve, 20, 0.05, 8, false), crimsonPinstripeMat);
        bike.add(rStripe);
      });

      const tombstoneHl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.45), chromeMat);
      tombstoneHl.position.set(-11.5, 4.4, 0);
      tombstoneHl.rotation.z = -0.45;
      bike.add(tombstoneHl);

      const tombstoneLens = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 }));
      tombstoneLens.position.set(-11.65, 4.45, 0);
      tombstoneLens.rotation.z = -0.45;
      bike.add(tombstoneLens);

      [-1.15, 1.15].forEach(sz => {
        const cArm = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.70, 0.38), darkFrameMat);
        cArm.position.set(-4.8, 3.4, sz);
        cArm.rotation.z = 0.08;
        bike.add(cArm);
      });

      // Forward Footpegs
      const pegLeft = [2.8, 3.8, -1.55];
      const pegRight = [2.8, 3.8, 1.55];
      [-1, 1].forEach(side => {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 12), darkFrameMat);
        peg.rotation.x = Math.PI / 2;
        peg.position.set(2.8, 3.6, side * 1.55);
        bike.add(peg);
      });

      // 3. ATTACH REBUILT BIKER (Upright Cruiser Posture)
      const saddlePos = [-2.6, 6.0, 0];
      const biker = buildRealisticBiker(true, saddlePos, gripLeft, gripRight, pegLeft, pegRight);
      bike.add(biker);

      return bike;
    }

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1220);
    const camera = new THREE.PerspectiveCamera(36, 1280 / 720, 0.1, 1000);
    // CAMERA_SETUP_PLACEHOLDER

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(1.5);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.15);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff7ed, 1.45);
    dir.position.set(16, 26, 20);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.75);
    fill.position.set(-18, 14, -14);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffedd5, 0.65);
    rim.position.set(-10, 16, 22);
    scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // CALL_BIKE_PLACEHOLDER

    renderer.render(scene, camera);
    window.__RENDER_DONE__ = true;
  </script>
</body>
</html>'''

views = [
    # Model A: Streetfighter
    ('scratch/rebuilt_bike_a_isometric.png', "scene.add(buildStreetfighterModelA());", (15.0, 9.5, 16.0), (0.0, 5.0, 0.0)),
    ('scratch/rebuilt_bike_a_side.png', "scene.add(buildStreetfighterModelA());", (0.0, 5.2, 19.0), (0.0, 5.2, 0.0)),
    ('scratch/rebuilt_bike_a_front_close.png', "scene.add(buildStreetfighterModelA());", (12.0, 7.5, 6.0), (5.5, 7.5, 0.0)),
    # Model B: Cruiser
    ('scratch/rebuilt_bike_b_isometric.png', "scene.add(buildCruiserModelB());", (15.0, 9.5, 16.0), (0.0, 5.0, 0.0)),
    ('scratch/rebuilt_bike_b_side.png', "scene.add(buildCruiserModelB());", (0.0, 5.2, 19.0), (0.0, 5.2, 0.0)),
    ('scratch/rebuilt_bike_b_front_close.png', "scene.add(buildCruiserModelB());", (12.0, 7.5, 6.0), (5.5, 7.5, 0.0)),
]

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_rebuilt_motorcycles')
os.makedirs(user_data, exist_ok=True)

for out_name, call_code, cam_pos, look_at in views:
    cam_setup = f'camera.position.set({cam_pos[0]}, {cam_pos[1]}, {cam_pos[2]});\n    camera.lookAt({look_at[0]}, {look_at[1]}, {look_at[2]});'
    content = html_content.replace('// CAMERA_SETUP_PLACEHOLDER', cam_setup)
    content = content.replace('// CALL_BIKE_PLACEHOLDER', call_code)

    temp_html_path = os.path.abspath(f'scratch/temp_{os.path.basename(out_name)}.html')
    with open(temp_html_path, 'w', encoding='utf-8') as f:
        f.write(content)

    out_png = os.path.abspath(out_name)
    if os.path.exists(out_png):
        try: os.remove(out_png)
        except: pass

    cmd = [
        chrome_path,
        '--headless=new',
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--enable-webgl',
        '--use-gl=angle',
        '--window-size=1280,720',
        f'--user-data-dir={user_data}',
        f'--screenshot={out_png}',
        f'file:///{temp_html_path.replace(os.sep, "/")}'
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
        print(f'{out_name}: exists={os.path.exists(out_png)}, size={os.path.getsize(out_png) if os.path.exists(out_png) else 0}')
    except Exception as e:
        print(f'Error for {out_name}: {e}')
