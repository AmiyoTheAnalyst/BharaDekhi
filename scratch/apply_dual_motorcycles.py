import re

with open("assets/crossroads-3d.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add getSportTireSidewallTexture right after getDiscRotorTexture
sidewall_code = r'''
  // 3b. Diablo Rosso Sport Tire Sidewall Decal Texture Generator (Cached for 60/90/120 FPS)
  function getSportTireSidewallTexture() {
    if (bikeTextureCache.sidewall) return bikeTextureCache.sidewall;
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

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    bikeTextureCache.sidewall = tex;
    return tex;
  }
'''

target_disc_end = "    bikeTextureCache.discRotor = tex;\n    return tex;\n  }"
if target_disc_end not in content:
    raise ValueError("Target disc rotor end not found")

content = content.replace(target_disc_end, target_disc_end + "\n" + sidewall_code, 1)

# 2. Add createLoftedBodyMesh and module-level material cache right before createSeamlessLoftedLimb
lofted_body_code = r'''
  // Accurate Station-by-Station Y-Z Cross-Section Lofted Mesh Generator (Zero Frenet Twisting!)
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

  // Solid Articulated Bone Generator (Never twists or inverts!)
  function createBoneSegment(p0, p1, r0, r1, material) {
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

  // Cached High-Performance Materials for Dual Motorcycles (60/90/120 FPS Rule)
  let _bikeSharedMats = null;
  function getBikeSharedMaterials() {
    if (_bikeSharedMats) return _bikeSharedMats;
    _bikeSharedMats = {
      rubberMat: new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.90 }),
      darkFrameMat: new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.45, metalness: 0.50 }),
      chromeMat: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.22, metalness: 0.82 }),
      gunmetalEngineMat: new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.38, metalness: 0.65 }),
      bronzeCoverMat: new THREE.MeshStandardMaterial({ color: 0x78563a, roughness: 0.30, metalness: 0.60 }),
      goldAnodizedMat: new THREE.MeshStandardMaterial({ color: 0xd4a024, roughness: 0.22, metalness: 0.82 }),
      darkLeatherMat: new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.75, metalness: 0.05 }),
      discRotorMat: new THREE.MeshStandardMaterial({ map: getDiscRotorTexture(), roughness: 0.25, metalness: 0.85, transparent: true }),
      pearlWhiteMat: new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.18, metalness: 0.15 }),
      matteBlackKneeMat: new THREE.MeshStandardMaterial({ color: 0x1e2124, roughness: 0.85 }),
      smokedVisorMat: new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.10, metalness: 0.20, transparent: true, opacity: 0.80 }),
      glossyBlackMat: new THREE.MeshStandardMaterial({ color: 0x0f1115, roughness: 0.15, metalness: 0.30 }),
      crimsonPinstripeMat: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.20 }),
      redRimStripeMat: new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.30, metalness: 0.10 }),
      skinMat: new THREE.MeshStandardMaterial({ color: 0xc8926d, roughness: 0.60, metalness: 0.04 }),
      soleMat: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55, metalness: 0.02 }),
      treadMat: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.05 }),
      whiteMat: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 })
    };
    return _bikeSharedMats;
  }
'''

target_parallel = "  // Parallel-Transport Lofting Helper for Organic Limbs & Torso"
if target_parallel not in content:
    raise ValueError("Target parallel lofting comment not found")

content = content.replace(target_parallel, lofted_body_code + "\n" + target_parallel, 1)

# 3. Replace createRealisticGTABike entirely
new_bike_factory = r'''  // Master Canonical Dual 3D Motorcycle Factory (Pure Three.js - Zero Blender!)
  // Alternates between Model A (White Streetfighter/Cafe Racer) and Model B (Black/Gold/Red Muscle Cruiser)
  function createRealisticGTABike(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const isCruiser = (vData && vData.modelType === 'cruiser')
      ? true
      : ((vData && vData.modelType === 'streetfighter')
        ? false
        : (Math.abs(appearanceSeed || 0) % 2 === 1));

    const mats = getBikeSharedMaterials();

    // -------------------------------------------------------------------------
    // Helper: Wheel Builder (Diablo Rosso Sidewalls on A, Red Rim Stripes on B)
    // -------------------------------------------------------------------------
    function createSportWheel(radius, width, isRear, isModelA) {
      const wheel = new THREE.Group();
      const rimRadius = radius * 0.70;

      const tire = new THREE.Mesh(new THREE.TorusGeometry(radius - width * 0.42, width * 0.42, 18, 36), mats.rubberMat);
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
          const rimStripe = new THREE.Mesh(new THREE.TorusGeometry(rimRadius + 0.08, 0.07, 8, 36), mats.redRimStripeMat);
          rimStripe.position.z = side * (width * 0.38);
          wheel.add(rimStripe);
        });
      }

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, width * 0.85, 18), mats.darkFrameMat);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);

      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.32, rimRadius * 0.92, width * 0.32), isModelA ? mats.bronzeCoverMat : mats.darkFrameMat);
        spoke.rotation.z = (i / 5) * Math.PI * 2;
        spoke.position.set(Math.sin((i / 5) * Math.PI * 2) * (rimRadius * 0.46), Math.cos((i / 5) * Math.PI * 2) * (rimRadius * 0.46), 0);
        wheel.add(spoke);
      }

      const disc = new THREE.Mesh(new THREE.RingGeometry(radius * 0.24, radius * 0.62, 32), mats.discRotorMat);
      disc.position.z = isRear ? -width * 0.36 : width * 0.36;
      wheel.add(disc);

      return wheel;
    }

    let leftGripPos, rightGripPos;
    let saddleAnchor = [-1.8, 6.7, 0];
    let pegPosL, pegPosR;

    if (!isCruiser) {
      // =======================================================================
      // MODEL A: BLACK & PEARL-WHITE MUSCULAR STREETFIGHTER / CAFE RACER
      // =======================================================================
      const frontX = 8.2;
      const rearX = -8.2;
      const wheelY = 3.25;

      const fWheel = createSportWheel(3.25, 1.45, false, true);
      fWheel.position.set(frontX, wheelY, 0);
      group.add(fWheel);
      group.userData.wheels.push(fWheel);

      const rWheel = createSportWheel(3.25, 1.80, true, true);
      rWheel.position.set(rearX, wheelY, 0);
      group.add(rWheel);
      group.userData.wheels.push(rWheel);

      const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.45), mats.bronzeCoverMat);
      fCaliper.position.set(frontX - 1.25, wheelY + 1.25, 0.65);
      group.add(fCaliper);

      const rakeAngle = 0.40;
      const tripleTreeX = 5.6;
      const tripleTreeY = 8.2;

      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), mats.darkFrameMat);
      topClamp.position.set(tripleTreeX, tripleTreeY, 0);
      topClamp.rotation.z = rakeAngle;
      group.add(topClamp);

      const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), mats.darkFrameMat);
      lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.5, tripleTreeY - Math.cos(rakeAngle) * 1.5, 0);
      lowerClamp.rotation.z = rakeAngle;
      group.add(lowerClamp);

      [-1.15, 1.15].forEach(fz => {
        const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 3.8, 14), mats.chromeMat);
        slider.position.set(frontX - Math.sin(rakeAngle) * 1.8, wheelY + Math.cos(rakeAngle) * 1.8, fz);
        slider.rotation.z = rakeAngle;
        group.add(slider);

        const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 4.2, 16), mats.pearlWhiteMat);
        shroud.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
        shroud.rotation.z = rakeAngle;
        group.add(shroud);

        const axleClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), mats.darkFrameMat);
        axleClamp.position.set(frontX, wheelY, fz);
        group.add(axleClamp);
      });

      const fenderMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.65, 3.65, 1.60, 24, 1, true, Math.PI * 0.16, Math.PI * 0.68), mats.pearlWhiteMat);
      fenderMesh.rotation.x = Math.PI / 2;
      fenderMesh.position.set(frontX, wheelY, 0);
      group.add(fenderMesh);

      // Slatted Headlight with 4 Prominent Vertical Black Grill Slats & Smoked Flyscreen
      const headlightGroup = new THREE.Group();
      headlightGroup.position.set(tripleTreeX + 1.25, tripleTreeY - 0.35, 0);

      const hlBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.80, 0.85, 20), mats.darkFrameMat);
      hlBucket.rotation.z = Math.PI / 2;
      headlightGroup.add(hlBucket);

      const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.88, 24), new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, emissiveIntensity: 0.95, roughness: 0.10 }));
      hlLens.rotation.y = Math.PI / 2;
      hlLens.position.set(0.44, 0, 0);
      headlightGroup.add(hlLens);

      const hlBezel = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.08, 10, 24), mats.darkFrameMat);
      hlBezel.rotation.y = Math.PI / 2;
      hlBezel.position.set(0.48, 0, 0);
      headlightGroup.add(hlBezel);

      [-0.50, -0.17, 0.17, 0.50].forEach(sz => {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 0.09), mats.darkFrameMat);
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
      const visorMesh = new THREE.Mesh(visorGeo, mats.smokedVisorMat);
      visorMesh.position.set(-0.25, 0.75, 0);
      visorMesh.rotation.z = -0.42;
      headlightGroup.add(visorMesh);
      group.add(headlightGroup);

      // Drag Bars with Bar-End Mirrors
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 14), mats.darkFrameMat);
      hBar.rotation.x = Math.PI / 2;
      hBar.position.set(tripleTreeX + 0.15, tripleTreeY + 0.55, 0);
      group.add(hBar);

      leftGripPos = [tripleTreeX + 0.15, tripleTreeY + 0.55, -1.85];
      rightGripPos = [tripleTreeX + 0.15, tripleTreeY + 0.55, 1.85];

      [-2.25, 2.25].forEach(bz => {
        const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.50, 0.08), mats.darkFrameMat);
        mirrorStem.position.set(tripleTreeX + 0.15, tripleTreeY + 0.30, bz);
        group.add(mirrorStem);
        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), mats.darkFrameMat);
        mirror.rotation.z = Math.PI / 2;
        mirror.position.set(tripleTreeX + 0.15, tripleTreeY + 0.05, bz);
        group.add(mirror);
      });

      // Tubular Trellis Frame
      const trellisTubes = [
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, 0.95], [2.2, 5.8, 1.25], [-1.2, 4.2, 1.05]],
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, -0.95], [2.2, 5.8, -1.25], [-1.2, 4.2, -1.05]],
        [[3.8, 6.8, 1.05], [1.2, 4.2, 1.15], [-1.2, 4.2, 1.05]],
        [[3.8, 6.8, -1.05], [1.2, 4.2, -1.15], [-1.2, 4.2, -1.05]],
        [[1.8, 6.4, 1.15], [0.4, 5.0, 1.15]],
        [[1.8, 6.4, -1.15], [0.4, 5.0, -1.15]]
      ];
      trellisTubes.forEach(pts => {
        const vPts = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const curve = new THREE.CatmullRomCurve3(vPts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.18, 8, false), mats.darkFrameMat);
        group.add(tube);
      });

      const engineBox = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 2.2), mats.gunmetalEngineMat);
      engineBox.position.set(1.4, 4.6, 0);
      group.add(engineBox);

      for (let y = 3.4; y <= 5.8; y += 0.35) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.45), mats.darkFrameMat);
        fin.position.set(1.4, y, 0);
        group.add(fin);
      }

      const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 2.0), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.40, metalness: 0.7 }));
      radiator.position.set(3.8, 4.6, 0);
      group.add(radiator);

      [
        { x: 2.4, y: 4.0, r: 0.70, d: 0.28 },
        { x: 0.9, y: 4.8, r: 0.58, d: 0.24 },
        { x: 1.0, y: 3.6, r: 0.48, d: 0.20 }
      ].forEach(cov => {
        const cMesh = new THREE.Mesh(new THREE.CylinderGeometry(cov.r, cov.r, cov.d, 18), mats.bronzeCoverMat);
        cMesh.rotation.x = Math.PI / 2;
        cMesh.position.set(cov.x, cov.y, 1.15);
        group.add(cMesh);
      });

      const bellyShape = new THREE.Shape();
      bellyShape.moveTo(3.6, 4.4);
      bellyShape.lineTo(4.6, 3.2);
      bellyShape.lineTo(3.4, 2.1);
      bellyShape.lineTo(-0.6, 2.1);
      bellyShape.lineTo(-1.0, 3.2);
      bellyShape.lineTo(0.5, 3.8);
      bellyShape.closePath();
      const bellyGeo = new THREE.ExtrudeGeometry(bellyShape, { depth: 2.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12 });
      bellyGeo.translate(0, 0, -2.35 / 2);
      const bellyPan = new THREE.Mesh(bellyGeo, mats.pearlWhiteMat);
      group.add(bellyPan);

      const skidPlate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 2.2), mats.darkFrameMat);
      skidPlate.position.set(1.4, 2.05, 0);
      group.add(skidPlate);

      // Sculpted Muscular Pearl-White Humpback Fuel Tank with Knee Cutouts
      const tankStations = [
        { center: [5.4, 7.6, 0],  ryTop: 0.55, ryBot: 0.65, rz: 0.65 },
        { center: [4.4, 8.2, 0],  ryTop: 1.25, ryBot: 1.35, rz: 1.35 },
        { center: [3.2, 8.6, 0],  ryTop: 1.55, ryBot: 1.65, rz: 1.50 },
        { center: [1.8, 8.1, 0],  ryTop: 1.35, ryBot: 1.50, rz: 1.38 },
        { center: [0.4, 7.5, 0],  ryTop: 1.00, ryBot: 1.15, rz: 1.05 },
        { center: [-1.0, 6.9, 0], ryTop: 0.55, ryBot: 0.65, rz: 0.75 }
      ];
      group.add(createLoftedBodyMesh(tankStations, 24, mats.pearlWhiteMat));

      const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 18), mats.chromeMat);
      gasCap.position.set(2.8, 10.25, 0);
      gasCap.rotation.z = -0.15;
      group.add(gasCap);

      [-1.22, 1.22].forEach(kz => {
        const padMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), mats.matteBlackKneeMat);
        padMesh.scale.set(1.4, 0.65, 0.14);
        padMesh.position.set(1.0, 7.6, kz);
        padMesh.rotation.z = 0.15;
        group.add(padMesh);
      });

      const saddleStations = [
        { center: [-1.0, 6.9, 0], ryTop: 0.42, ryBot: 0.45, rz: 0.75 },
        { center: [-2.2, 6.5, 0], ryTop: 0.38, ryBot: 0.42, rz: 0.85 },
        { center: [-3.4, 6.8, 0], ryTop: 0.40, ryBot: 0.40, rz: 0.80 },
        { center: [-4.4, 7.4, 0], ryTop: 0.45, ryBot: 0.38, rz: 0.75 }
      ];
      group.add(createLoftedBodyMesh(saddleStations, 20, mats.darkLeatherMat));

      const tailStations = [
        { center: [-4.4, 7.4, 0], ryTop: 0.48, ryBot: 0.38, rz: 0.78 },
        { center: [-5.6, 7.9, 0], ryTop: 0.45, ryBot: 0.32, rz: 0.68 },
        { center: [-7.0, 8.3, 0], ryTop: 0.35, ryBot: 0.25, rz: 0.50 },
        { center: [-8.2, 8.1, 0], ryTop: 0.18, ryBot: 0.15, rz: 0.25 }
      ];
      group.add(createLoftedBodyMesh(tailStations, 20, mats.pearlWhiteMat));

      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.65), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 }));
      tailLight.position.set(-8.25, 8.1, 0);
      group.add(tailLight);

      const huggerMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.60, 3.60, 1.95, 20, 1, true, Math.PI * 0.40, Math.PI * 0.55), mats.pearlWhiteMat);
      huggerMesh.rotation.x = Math.PI / 2;
      huggerMesh.position.set(rearX, wheelY, 0);
      group.add(huggerMesh);

      const headerPts = [
        new THREE.Vector3(3.4, 4.6, 0.3),
        new THREE.Vector3(4.0, 3.2, 0.5),
        new THREE.Vector3(2.6, 2.3, 0.8),
        new THREE.Vector3(0.0, 2.5, 0.9),
        new THREE.Vector3(-1.8, 3.4, 0.9),
        new THREE.Vector3(-3.8, 5.2, 0.5),
        new THREE.Vector3(-5.5, 7.2, 0.0)
      ];
      const headerTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(headerPts), 24, 0.22, 10, false), mats.chromeMat);
      group.add(headerTube);

      const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.8, 16), mats.darkFrameMat);
      muffler.rotation.z = Math.PI / 2 - 0.15;
      muffler.scale.set(0.85, 1.0, 1.45);
      muffler.position.set(-6.8, 7.6, 0);
      group.add(muffler);

      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.25, 12), mats.bronzeCoverMat);
      endCap.rotation.z = Math.PI / 2 - 0.15;
      endCap.position.set(-8.2, 7.85, 0);
      group.add(endCap);

      [-1.05, 1.05].forEach(sz => {
        const swingArm = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.75, 0.42), mats.darkFrameMat);
        swingArm.position.set(-4.6, 3.7, sz);
        swingArm.rotation.z = 0.14;
        group.add(swingArm);
      });

      saddleAnchor = [-1.8, 6.7, 0];
      pegPosL = [0.4, 4.1, -1.45];
      pegPosR = [0.4, 4.1, 1.45];

    } else {
      // =======================================================================
      // MODEL B: BLACK, GOLD & RED-PINSTRIPE MUSCLE CRUISER
      // =======================================================================
      const frontX = 8.8;
      const rearX = -8.6;
      const wheelY = 3.25;

      const fWheel = createSportWheel(3.25, 1.45, false, false);
      fWheel.position.set(frontX, wheelY, 0);
      group.add(fWheel);
      group.userData.wheels.push(fWheel);

      const rWheel = createSportWheel(3.10, 2.20, true, false);
      rWheel.position.set(rearX, 3.10, 0);
      group.add(rWheel);
      group.userData.wheels.push(rWheel);

      const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.45), mats.darkFrameMat);
      fCaliper.position.set(frontX - 1.25, wheelY + 1.20, 0.75);
      group.add(fCaliper);

      const rakeAngle = 0.52;
      const tripleTreeX = 5.8;
      const tripleTreeY = 8.4;

      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), mats.chromeMat);
      topClamp.position.set(tripleTreeX, tripleTreeY, 0);
      topClamp.rotation.z = rakeAngle;
      group.add(topClamp);

      const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), mats.chromeMat);
      lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.6, tripleTreeY - Math.cos(rakeAngle) * 1.6, 0);
      lowerClamp.rotation.z = rakeAngle;
      group.add(lowerClamp);

      [-1.15, 1.15].forEach(fz => {
        const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 4.2, 14), mats.chromeMat);
        slider.position.set(frontX - Math.sin(rakeAngle) * 2.0, wheelY + Math.cos(rakeAngle) * 2.0, fz);
        slider.rotation.z = rakeAngle;
        group.add(slider);

        const goldTube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 4.8, 16), mats.goldAnodizedMat);
        goldTube.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
        goldTube.rotation.z = rakeAngle;
        group.add(goldTube);

        const axleClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.55), mats.darkFrameMat);
        axleClamp.position.set(frontX, wheelY, fz);
        group.add(axleClamp);
      });

      const fFender = new THREE.Mesh(new THREE.CylinderGeometry(3.60, 3.60, 1.55, 24, 1, true, Math.PI * 0.18, Math.PI * 0.65), mats.glossyBlackMat);
      fFender.rotation.x = Math.PI / 2;
      fFender.position.set(frontX, wheelY, 0);
      group.add(fFender);

      const fFenderStripe = new THREE.Mesh(new THREE.TorusGeometry(3.64, 0.045, 6, 24, Math.PI * 0.65), mats.crimsonPinstripeMat);
      fFenderStripe.position.set(frontX, wheelY, 0);
      fFenderStripe.rotation.z = Math.PI * 0.18;
      group.add(fFenderStripe);

      const hlGroup = new THREE.Group();
      hlGroup.position.set(tripleTreeX + 1.2, tripleTreeY - 0.35, 0);

      const hlShell = new THREE.Mesh(new THREE.SphereGeometry(0.90, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.darkFrameMat);
      hlShell.rotation.z = Math.PI / 2;
      hlGroup.add(hlShell);

      const hlRim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.09, 10, 24), mats.chromeMat);
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
      const miniCowl = new THREE.Mesh(cowlGeo, mats.glossyBlackMat);
      miniCowl.position.set(0.1, 0.45, 0);
      miniCowl.rotation.z = -0.32;
      hlGroup.add(miniCowl);
      group.add(hlGroup);

      const cBar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.6, 14), mats.darkFrameMat);
      cBar.rotation.x = Math.PI / 2;
      cBar.position.set(tripleTreeX - 0.25, tripleTreeY + 0.65, 0);
      group.add(cBar);

      leftGripPos = [tripleTreeX - 0.25, tripleTreeY + 0.65, -1.95];
      rightGripPos = [tripleTreeX - 0.25, tripleTreeY + 0.65, 1.95];

      [-2.1, 2.1].forEach(mz => {
        const mStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), mats.chromeMat);
        mStem.position.set(tripleTreeX - 0.25, tripleTreeY + 1.05, mz);
        group.add(mStem);
        const mHead = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16), mats.chromeMat);
        mHead.position.set(tripleTreeX - 0.25, tripleTreeY + 1.45, mz);
        mHead.rotation.x = Math.PI / 2;
        group.add(mHead);
      });

      // Exposed V-Twin Engine in Frame Cradle
      const vTwinGroup = new THREE.Group();
      vTwinGroup.position.set(0.8, 3.8, 0);
      vTwinGroup.add(new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 2.4), mats.gunmetalEngineMat));

      [-0.42, 0.42].forEach(va => {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.90, 1.8, 16), mats.darkFrameMat);
        cyl.rotation.z = va;
        cyl.position.set(Math.sin(va) * 1.35, Math.cos(va) * 1.35, 0);
        vTwinGroup.add(cyl);

        for (let f = -0.7; f <= 0.7; f += 0.28) {
          const cFin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 16), mats.darkFrameMat);
          cFin.rotation.z = va;
          cFin.position.set(Math.sin(va) * (1.35 + f), Math.cos(va) * (1.35 + f), 0);
          vTwinGroup.add(cFin);
        }

        const rockerHead = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.55, 1.95), mats.chromeMat);
        rockerHead.rotation.z = va;
        rockerHead.position.set(Math.sin(va) * 2.35, Math.cos(va) * 2.35, 0);
        vTwinGroup.add(rockerHead);

        [-0.55, 0.55].forEach(pz => {
          const pushRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), mats.chromeMat);
          pushRod.rotation.z = va * 1.08;
          pushRod.position.set(Math.sin(va) * 1.35, Math.cos(va) * 1.35, pz * 1.05);
          vTwinGroup.add(pushRod);
        });
      });

      const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.32, 20), mats.chromeMat);
      airCleaner.rotation.x = Math.PI / 2;
      airCleaner.position.set(0.0, 1.3, 1.32);
      vTwinGroup.add(airCleaner);

      const primaryCover = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 20), mats.chromeMat);
      primaryCover.rotation.x = Math.PI / 2;
      primaryCover.position.set(0.2, -0.2, 1.25);
      vTwinGroup.add(primaryCover);
      group.add(vTwinGroup);

      [0.95, 1.30].forEach((pz, idx) => {
        const pipeY = 2.7 + idx * 0.45;
        const pipePts = [
          new THREE.Vector3(2.4, 4.4 - idx * 0.4, 0.6),
          new THREE.Vector3(3.0, 3.4, pz),
          new THREE.Vector3(1.2, pipeY, pz),
          new THREE.Vector3(-7.4, pipeY, pz)
        ];
        const pipeCurve = new THREE.CatmullRomCurve3(pipePts);
        const exPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 20, 0.22, 10, false), mats.chromeMat);
        group.add(exPipe);

        const slashTip = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.8, 12), mats.chromeMat);
        slashTip.rotation.z = Math.PI / 2 + 0.35;
        slashTip.position.set(-7.7, pipeY, pz);
        group.add(slashTip);
      });

      const cruiserTankStations = [
        { center: [5.4, 7.5, 0],  ryTop: 0.50, ryBot: 0.65, rz: 0.65 },
        { center: [4.0, 8.4, 0],  ryTop: 1.20, ryBot: 1.45, rz: 1.40 },
        { center: [2.2, 8.2, 0],  ryTop: 1.15, ryBot: 1.35, rz: 1.30 },
        { center: [0.2, 7.3, 0],  ryTop: 0.90, ryBot: 1.10, rz: 1.05 },
        { center: [-1.4, 6.4, 0], ryTop: 0.50, ryBot: 0.65, rz: 0.72 }
      ];
      group.add(createLoftedBodyMesh(cruiserTankStations, 24, mats.glossyBlackMat));

      const tankConsole = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.55), mats.chromeMat);
      tankConsole.position.set(2.4, 8.95, 0);
      tankConsole.rotation.z = -0.32;
      group.add(tankConsole);

      const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16), mats.chromeMat);
      gasCap.position.set(3.4, 9.45, 0);
      gasCap.rotation.z = -0.32;
      group.add(gasCap);

      [-1.38, 1.38].forEach(tz => {
        const pinstripeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-1.2, 6.5, tz * 0.7),
          new THREE.Vector3(0.4, 7.5, tz * 0.95),
          new THREE.Vector3(2.2, 8.6, tz * 1.05),
          new THREE.Vector3(4.0, 8.7, tz * 1.05),
          new THREE.Vector3(5.2, 7.7, tz * 0.6)
        ]);
        const stripeTube = new THREE.Mesh(new THREE.TubeGeometry(pinstripeCurve, 20, 0.05, 8, false), mats.crimsonPinstripeMat);
        group.add(stripeTube);
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
      const chinMesh = new THREE.Mesh(chinGeo, mats.glossyBlackMat);
      group.add(chinMesh);

      const chinStripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.09, 1.95), mats.crimsonPinstripeMat);
      chinStripe.position.set(2.4, 2.2, 0);
      chinStripe.rotation.z = -0.35;
      group.add(chinStripe);

      const seatStations = [
        { center: [-1.4, 6.4, 0], ryTop: 0.38, ryBot: 0.35, rz: 0.72 },
        { center: [-2.6, 5.8, 0], ryTop: 0.35, ryBot: 0.35, rz: 0.88 },
        { center: [-4.2, 6.1, 0], ryTop: 0.38, ryBot: 0.32, rz: 0.85 },
        { center: [-5.6, 6.4, 0], ryTop: 0.40, ryBot: 0.28, rz: 0.80 },
        { center: [-6.8, 6.6, 0], ryTop: 0.42, ryBot: 0.25, rz: 0.75 }
      ];
      group.add(createLoftedBodyMesh(seatStations, 20, mats.darkLeatherMat));

      const rFender = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 2.30, 24, 1, true, Math.PI * 0.28, Math.PI * 0.72), mats.glossyBlackMat);
      rFender.rotation.x = Math.PI / 2;
      rFender.position.set(rearX, 3.10, 0);
      group.add(rFender);

      [-1.18, 1.18].forEach(rz => {
        const rStripeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-6.6, 6.4, rz),
          new THREE.Vector3(-8.6, 6.6, rz),
          new THREE.Vector3(-11.2, 4.6, rz)
        ]);
        const rStripe = new THREE.Mesh(new THREE.TubeGeometry(rStripeCurve, 16, 0.05, 8, false), mats.crimsonPinstripeMat);
        group.add(rStripe);
      });

      const tombstoneHl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.45), mats.chromeMat);
      tombstoneHl.position.set(-11.2, 4.4, 0);
      tombstoneHl.rotation.z = -0.45;
      group.add(tombstoneHl);

      const tombstoneLens = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 }));
      tombstoneLens.position.set(-11.35, 4.45, 0);
      tombstoneLens.rotation.z = -0.45;
      group.add(tombstoneLens);

      [-1.15, 1.15].forEach(sz => {
        const cArm = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.70, 0.38), mats.darkFrameMat);
        cArm.position.set(-4.8, 3.4, sz);
        cArm.rotation.z = 0.08;
        group.add(cArm);
      });

      saddleAnchor = [-2.4, 6.2, 0];
      pegPosL = [2.8, 3.8, -1.55];
      pegPosR = [2.8, 3.8, 1.55];
    }

    // -------------------------------------------------------------------------
    // CONTINUOUS WATERTIGHT HUMAN RIDER (STEP 1: CLEAN SADDLE & GRIP LOCK)
    // -------------------------------------------------------------------------
    const OUTFIT_PRESETS = [
      { hoodieHex: 0x18181b, legHex: 0x27272a, shoeHex: 0x18181b, glovesHex: 0x18181b, helmetHex: 0x111827 },
      { hoodieHex: 0x475569, legHex: 0x1e293b, shoeHex: 0x580b18, glovesHex: 0x1e293b, helmetHex: 0x1e293b },
      { hoodieHex: 0x334138, legHex: 0x374151, shoeHex: 0xd97706, glovesHex: 0x451a03, helmetHex: 0x090d16 },
      { hoodieHex: 0x4c0519, legHex: 0x18181b, shoeHex: 0x991b1b, glovesHex: 0x18181b, helmetHex: 0x1d4ed8 }
    ];
    const outfit = OUTFIT_PRESETS[Math.abs(appearanceSeed || 0) % OUTFIT_PRESETS.length];

    const riderHoodieMat = new THREE.MeshStandardMaterial({ color: outfit.hoodieHex, roughness: 0.85, metalness: 0.02 });
    const riderRibbedMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(outfit.hoodieHex).multiplyScalar(0.72), roughness: 0.90 });
    const riderPantsMat = new THREE.MeshStandardMaterial({ color: outfit.legHex, roughness: 0.82 });
    const riderShoeMat = new THREE.MeshStandardMaterial({ color: outfit.shoeHex, roughness: 0.45 });
    const riderGlovesMat = new THREE.MeshStandardMaterial({ color: outfit.glovesHex, roughness: 0.55 });
    const riderHelmetMat = new THREE.MeshStandardMaterial({ color: outfit.helmetHex, roughness: 0.15, metalness: 0.45 });
    const riderVisorMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.05, metalness: 0.95 });

    let headPos, shoulderPos, torsoCrossSections;
    let kneePosL, kneePosR;

    if (isCruiser) {
      headPos = [0.45, 12.20, 0];
      shoulderPos = { x: -0.15, y: 10.85, z: 1.80 };
      kneePosL = [1.2, 5.8, -1.65];
      kneePosR = [1.2, 5.8, 1.65];

      torsoCrossSections = [
        { p: [-2.4, 6.2, 0], rx: 1.15, ry: 1.45 },
        { p: [-1.8, 7.6, 0], rx: 1.25, ry: 1.65 },
        { p: [-1.0, 9.2, 0], rx: 1.35, ry: 1.95 },
        { p: [-0.15, 10.85, 0], rx: 1.30, ry: 2.10 },
        { p: [0.15, 11.45, 0], rx: 1.05, ry: 1.55 },
        { p: [0.35, 11.85, 0], rx: 0.75, ry: 0.95 },
        { p: [0.45, 12.20, 0], rx: 0.65, ry: 0.75 }
      ];
    } else {
      headPos = [2.25, 11.25, 0];
      shoulderPos = { x: 1.35, y: 10.25, z: 1.80 };
      kneePosL = [1.1, 6.15, -1.60];
      kneePosR = [1.1, 6.15, 1.60];

      torsoCrossSections = [
        { p: [-1.8, 6.7, 0], rx: 1.10, ry: 1.40 },
        { p: [-0.9, 7.9, 0], rx: 1.20, ry: 1.65 },
        { p: [0.25, 9.2, 0], rx: 1.30, ry: 1.95 },
        { p: [1.35, 10.25, 0], rx: 1.25, ry: 2.10 },
        { p: [1.80, 10.65, 0], rx: 1.00, ry: 1.50 },
        { p: [2.05, 10.95, 0], rx: 0.72, ry: 0.90 },
        { p: [2.25, 11.25, 0], rx: 0.65, ry: 0.75 }
      ];
    }

    group.add(createSeamlessLoftedLimb(torsoCrossSections, 16, 24, riderHoodieMat));

    const solidNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.55, 16), mats.skinMat);
    solidNeck.position.set(headPos[0] - 0.12, headPos[1] - 0.45, 0);
    solidNeck.rotation.z = isCruiser ? -0.15 : -0.28;
    group.add(solidNeck);

    const collarRim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 0.30, 18), riderRibbedMat);
    collarRim.position.set(headPos[0] - 0.18, headPos[1] - 0.58, 0);
    collarRim.rotation.z = isCruiser ? -0.15 : -0.28;
    group.add(collarRim);

    // Head / Aerodynamic Helmet
    const headGroup = new THREE.Group();
    headGroup.position.set(headPos[0], headPos[1], 0);

    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.88, 36, 28), riderHelmetMat);
    shell.scale.set(1.22, 1.05, 0.90);
    shell.position.set(-0.04, 0.04, 0);
    headGroup.add(shell);

    const chinBar = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.80, 0.42, 28, 1, false, -Math.PI * 0.35, Math.PI * 0.70), riderHelmetMat);
    chinBar.scale.set(1.18, 1.0, 0.88);
    chinBar.position.set(0.18, -0.26, 0);
    headGroup.add(chinBar);

    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.91, 0.88, 0.46, 28, 1, true, -Math.PI * 0.35, Math.PI * 0.70), riderVisorMat);
    visor.scale.set(1.18, 1.0, 0.88);
    visor.position.set(0.19, 0.10, 0);
    headGroup.add(visor);

    group.add(headGroup);

    // Arms & Hands (Firm Handlebar Grip)
    [-1, 1].forEach(side => {
      const grip = side === -1 ? leftGripPos : rightGripPos;
      const shX = shoulderPos.x;
      const shY = shoulderPos.y;
      const shZ = side * shoulderPos.z;

      const elbow = isCruiser
        ? [shX + (grip[0] - shX) * 0.44, shY - 1.10, side * 2.35]
        : [shX + (grip[0] - shX) * 0.46, shY - 1.25, side * 2.35];

      const wrist = [grip[0] - 0.22, grip[1] - 0.08, grip[2] - side * 0.08];

      const shCap = new THREE.Mesh(new THREE.SphereGeometry(0.76, 16, 14), riderHoodieMat);
      shCap.position.set(shX, shY, shZ);
      group.add(shCap);

      group.add(createBoneSegment([shX, shY, shZ], elbow, 0.74, 0.62, riderHoodieMat));

      const elFold = new THREE.Mesh(new THREE.SphereGeometry(0.63, 16, 14), riderHoodieMat);
      elFold.position.set(elbow[0], elbow[1], elbow[2]);
      group.add(elFold);

      group.add(createBoneSegment(elbow, wrist, 0.62, 0.48, riderHoodieMat));

      const handGroup = new THREE.Group();
      handGroup.position.set(grip[0], grip[1], grip[2]);
      handGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.50), riderGlovesMat));

      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.46), mats.whiteMat);
      knuckle.position.set(-0.02, 0.19, 0);
      handGroup.add(knuckle);

      const fingers = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.46, 14), riderGlovesMat);
      fingers.rotation.x = Math.PI / 2;
      fingers.position.set(0.18, -0.08, 0);
      handGroup.add(fingers);

      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), mats.chromeMat);
      lever.rotation.x = Math.PI / 2 + (side * 0.12);
      lever.position.set(0.35, 0.05, -side * 0.25);
      handGroup.add(lever);

      group.add(handGroup);
    });

    // Legs & Sneakers (Footpeg Contact)
    [-1, 1].forEach(side => {
      const peg = side === -1 ? pegPosL : pegPosR;
      const knee = side === -1 ? kneePosL : kneePosR;
      const hipX = isCruiser ? -1.8 : -1.2;
      const hipY = isCruiser ? 6.2 : 6.6;
      const hipZ = side * 1.05;

      group.add(createBoneSegment([hipX, hipY, hipZ], knee, 0.85, 0.72, riderPantsMat));

      const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), riderPantsMat);
      kneeMesh.position.set(knee[0], knee[1], knee[2]);
      group.add(kneeMesh);

      group.add(createBoneSegment(knee, [peg[0], peg[1] + 0.35, peg[2]], 0.70, 0.52, riderPantsMat));

      const pegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 10), mats.darkFrameMat);
      pegMesh.rotation.x = Math.PI / 2;
      pegMesh.position.set(peg[0], peg[1] - 0.22, peg[2]);
      group.add(pegMesh);

      const shoe = new THREE.Group();
      shoe.position.set(peg[0], peg[1], peg[2]);
      if (isCruiser) shoe.rotation.z = 0.28;

      const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.75, 14), riderShoeMat);
      collarMesh.position.set(0, 0.36, 0);
      shoe.add(collarMesh);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.26, 0.88), mats.soleMat);
      sole.position.set(0.38, -0.25, 0);
      shoe.add(sole);

      const quarter = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.84), riderShoeMat);
      quarter.position.set(0.08, 0.05, 0);
      shoe.add(quarter);

      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.80), riderShoeMat);
      toe.position.set(0.74, -0.02, 0);
      shoe.add(toe);

      group.add(shoe);
    });

    // Zero-Lag Additive Headlight Ground Light Pool
    const headGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const headPool = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), headGlowMat);
    headPool.rotation.x = -Math.PI / 2;
    headPool.position.set((isCruiser ? 8.8 : 8.2) + 18, 0.08, 0);
    group.add(headPool);

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(group);
    }
    return group;
  }
'''

# Find boundaries of createRealisticGTABike in content
pattern = r"  // Master Canonical GTA V Motorcycle & Rider Builder\n  function createRealisticGTABike\(colorHex, appearanceSeed, vData\) \{[\s\S]*?  window\.createRealisticGTABike = createRealisticGTABike;"

match = re.search(pattern, content)
if not match:
    raise ValueError("Could not find createRealisticGTABike block via regex")

content = content[:match.start()] + new_bike_factory + "\n  window.createRealisticGTABike = createRealisticGTABike;" + content[match.end():]

# 4. Remove sportbikePrototypeModel check in create3DVehicle
target_bike_create = """    if (type === 'bike') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      if (sportbikePrototypeModel) {
        const bikeGroup = new THREE.Group();
        replaceBikeWithModel(bikeGroup, sportbikePrototypeModel, colorHex, appearanceSeed);
        if (typeof scene !== 'undefined' && scene && scene.add) scene.add(bikeGroup);
        return bikeGroup;
      }
      const bike = createRealisticGTABike(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) {
        scene.add(bike);
      }
      return bike;
    }"""

replacement_bike_create = """    if (type === 'bike') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      const bike = createRealisticGTABike(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) {
        scene.add(bike);
      }
      return bike;
    }"""

if target_bike_create not in content:
    raise ValueError("target_bike_create not found")
content = content.replace(target_bike_create, replacement_bike_create, 1)

# 5. Disable GLB sportbike replacement
target_replace_bike = "  function replaceBikeWithModel(vehicle, prototype, bikeColor, seed) {"
if target_replace_bike in content:
    content = content.replace(target_replace_bike, target_replace_bike + "\n    // Pure Three.js procedural dual motorcycles are authoritative\n    return;", 1)

# 6. Disable sportbikePrototypeModel assignment in loadSportbikeModel.then
target_load_sportbike = """    loadSportbikeModel().then(prototype => {
      sportbikePrototypeModel = prototype;
      Object.values(vehicleMeshMap).forEach(vehicle => {
        if (vehicle.data && vehicle.data.type === 'bike') {
          const colorHex = (vehicle.data.color || vehicle.data.bikeColor) ? parseInt((vehicle.data.bikeColor || vehicle.data.color).replace('#', '0x'), 16) : null;
          const appearanceSeed = getAppearanceSeed(vehicle.data.id || vehicle.data.type);
          replaceBikeWithModel(vehicle.mesh, prototype, colorHex, appearanceSeed);
        }
      });
    }).catch(err => console.warn('Sportbike GLB fallback:', err));"""

replacement_load_sportbike = """    loadSportbikeModel().then(prototype => {
      // Disabled: Pure Three.js procedural dual motorcycles are authoritative
    }).catch(err => console.warn('Sportbike GLB fallback:', err));"""

if target_load_sportbike in content:
    content = content.replace(target_load_sportbike, replacement_load_sportbike, 1)

with open("assets/crossroads-3d.js", "w", encoding="utf-8") as f:
    f.write(content)

print("crossroads-3d.js successfully updated with dual motorcycles!")
