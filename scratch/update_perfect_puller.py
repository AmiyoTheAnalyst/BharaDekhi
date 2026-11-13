import os
import subprocess
import re

html_code = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dhaka Rickshaw Puller Perfection Test</title>
  <style> body { margin: 0; background: #0b0f19; overflow: hidden; } #canvas-container { width: 100vw; height: 100vh; } </style>
</head>
<body>
<div id="canvas-container"></div>
<script src="../assets/three.min.js"></script>
<script>
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  // Default camera matching screenshot
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 500);
  camera.position.set(9.5, 14.5, 10.5);
  camera.lookAt(3.0, 9.0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  // Lighting - Identical to Crossroads 3D Daylight
  const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 1.05);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffedd5, 1.35);
  sunLight.position.set(20, 35, 25);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.75);
  keyLight.position.set(15, 20, 35);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
  fillLight.position.set(-25, 25, -25);
  scene.add(fillLight);

  // Road plane
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  // Textures
  function getRickshawArtTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#7c3aed');
    grad.addColorStop(1, '#db2777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 492, 492);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function getLungiTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#172554';
    ctx.lineWidth = 8;
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    for (let x = 16; x < 256; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let y = 16; y < 256; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    for (let x = 8; x < 256; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  function getGamchaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#fee2e2';
    ctx.lineWidth = 6;
    for (let x = 0; x < 128; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
    }
    for (let y = 0; y < 128; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
    }
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    for (let x = 12; x < 128; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4);
    return tex;
  }

  // High-Resolution Procedural Bengali Puller Face Texture
  function createPullerFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Base Warm Authentic Bengali Bronze Skin Tone
    const skinGrad = ctx.createLinearGradient(0, 0, 0, 512);
    skinGrad.addColorStop(0, '#75402c');
    skinGrad.addColorStop(0.3, '#8e523b');
    skinGrad.addColorStop(0.7, '#854b35');
    skinGrad.addColorStop(1, '#663724');
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Culturally Authentic Haircut (natural hairline, neat sideburns, clean neck)
    ctx.fillStyle = '#141416';
    // Crown and top of head (y: 0-180)
    ctx.fillRect(0, 0, 512, 180);
    // Back of head down to nape of neck (y: 180-350)
    ctx.fillRect(0, 180, 148, 170);
    ctx.fillRect(364, 180, 148, 170);

    // Natural curved hairline & sideburns (ends cleanly at mid-ear level y = 255)
    ctx.beginPath();
    ctx.moveTo(148, 350);
    ctx.lineTo(150, 255); // Right sideburn
    ctx.bezierCurveTo(175, 192, 215, 182, 256, 186); // Right forehead arch
    ctx.bezierCurveTo(297, 182, 337, 192, 362, 255); // Left forehead arch
    ctx.lineTo(364, 350); // Left sideburn
    ctx.lineTo(512, 350);
    ctx.lineTo(512, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 350);
    ctx.closePath();
    ctx.fill();

    // 3. Eyebrows (masculine, defined, slightly angled)
    ctx.strokeStyle = '#141416';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';

    // Left eyebrow (viewer right)
    ctx.beginPath();
    ctx.moveTo(270, 226);
    ctx.quadraticCurveTo(292, 215, 318, 223);
    ctx.stroke();

    // Right eyebrow (viewer left)
    ctx.beginPath();
    ctx.moveTo(242, 226);
    ctx.quadraticCurveTo(220, 215, 194, 223);
    ctx.stroke();

    // 4. Realistic Almond Eyes with warm brown iris and specular catchlight
    [-38, 38].forEach(ox => {
      const ex = 256 + ox;
      const ey = 246;

      // Soft Eye Socket Shadow
      ctx.fillStyle = 'rgba(40, 20, 12, 0.40)';
      ctx.beginPath();
      ctx.ellipse(ex, ey - 2, 20, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sclera (soft natural off-white)
      ctx.fillStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 16, 8.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm Brown Iris
      ctx.fillStyle = '#3a2014';
      ctx.beginPath();
      ctx.arc(ex, ey, 7.0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Specular Catchlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 1.8, ey - 1.8, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Upper Eyelid crease
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 16.5, 8.0, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.stroke();
    });

    // 5. Soft Nose Bridge & Nostril Shading (subtle highlight and contour)
    ctx.strokeStyle = 'rgba(70, 35, 20, 0.28)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(253, 230);
    ctx.lineTo(252, 282);
    ctx.stroke();

    // Nostril shadow dots
    ctx.fillStyle = '#381a10';
    ctx.beginPath();
    ctx.ellipse(246, 288, 4.0, 2.2, -0.2, 0, Math.PI * 2);
    ctx.ellipse(266, 288, 4.0, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Authentic Bengali Rickshaw Puller Mustache (full, curved, elegant, matching Image 2)
    ctx.fillStyle = '#141416';
    ctx.beginPath();
    ctx.moveTo(206, 316);
    ctx.quadraticCurveTo(232, 296, 256, 301);
    ctx.quadraticCurveTo(280, 296, 306, 316);
    ctx.quadraticCurveTo(282, 311, 256, 313);
    ctx.quadraticCurveTo(230, 311, 206, 316);
    ctx.closePath();
    ctx.fill();

    // 7. Lips
    ctx.fillStyle = '#7a3c30';
    ctx.beginPath();
    ctx.ellipse(256, 319, 15, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8f4a3d';
    ctx.beginPath();
    ctx.ellipse(256, 327, 13, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft diffused chin crease (zero hard dots!)
    ctx.strokeStyle = 'rgba(60, 30, 18, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(256, 336, 12, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  function buildMasterRickshaw() {
    const group = new THREE.Group();

    // Standard materials
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.85 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.95 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.7 });
    const seatRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45, metalness: 0.1 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const yellowWallMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.15 });
    const tealTrimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });

    // CALIBRATED AUTHENTIC PULLER MATERIALS
    // Sun-tanned South Asian bronze
    const pullerSkinMat = new THREE.MeshStandardMaterial({
      color: 0x854d37,
      roughness: 0.65,
      metalness: 0.04
    });
    // High-resolution textured head material
    const pullerHeadMat = new THREE.MeshStandardMaterial({
      map: createPullerFaceTexture(),
      roughness: 0.65,
      metalness: 0.04
    });
    // Deep Traditional Violet-Indigo Cotton Tunic matching Image 2
    const plumShirtMat = new THREE.MeshStandardMaterial({
      color: 0x3d1b46,
      roughness: 0.78
    });
    // Traditional Dark Brown Leather Strap Sandal Material
    const brownSandalMat = new THREE.MeshStandardMaterial({
      color: 0x26140b,
      roughness: 0.85
    });
    // Soft Natural Black Hair
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      roughness: 0.88
    });
    // Authentic Draped Lungi & Gamcha
    const lungiMat = new THREE.MeshStandardMaterial({
      map: getLungiTexture(),
      roughness: 0.78
    });
    const gamchaMat = new THREE.MeshStandardMaterial({
      map: getGamchaTexture(),
      roughness: 0.82
    });

    const hoodArtMat = new THREE.MeshStandardMaterial({
      map: getRickshawArtTexture(),
      roughness: 0.45,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    function buildSpokedWheel(radius, width) {
      const wheelGroup = new THREE.Group();
      const tireGeo = new THREE.TorusGeometry(radius, width * 0.45, 14, 36);
      const tireMesh = new THREE.Mesh(tireGeo, rubberMat);
      tireMesh.castShadow = true;
      wheelGroup.add(tireMesh);

      const rimGeo = new THREE.TorusGeometry(radius * 0.92, width * 0.22, 10, 36);
      wheelGroup.add(new THREE.Mesh(rimGeo, chromeMat));

      const hubGeo = new THREE.CylinderGeometry(0.55, 0.55, width * 1.8, 14);
      hubGeo.rotateX(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(hubGeo, chromeMat));

      const spokeCount = 18;
      for (let i = 0; i < spokeCount; i++) {
        const ang = (i * Math.PI * 2) / spokeCount;
        const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, radius * 1.84, 4);
        spokeGeo.rotateZ(ang);
        wheelGroup.add(new THREE.Mesh(spokeGeo, chromeMat));
      }
      return wheelGroup;
    }

    const wheelRadius = 4.1;
    const wheelWidth = 0.55;

    // Wheels
    const frontWheel = buildSpokedWheel(wheelRadius, wheelWidth);
    frontWheel.position.set(13.6, 4.1, 0);
    group.add(frontWheel);

    const rearWheelL = buildSpokedWheel(wheelRadius, wheelWidth);
    rearWheelL.position.set(-10.0, 4.1, -7.5);
    group.add(rearWheelL);

    const rearWheelR = buildSpokedWheel(wheelRadius, wheelWidth);
    rearWheelR.position.set(-10.0, 4.1, 7.5);
    group.add(rearWheelR);

    group.userData.wheels = [frontWheel, rearWheelL, rearWheelR];
    group.userData.wheelRadius = 4.1;

    // Rear Fenders
    [-7.5, 7.5].forEach(z => {
      const fenderGeo = new THREE.TorusGeometry(wheelRadius * 1.08, 0.45, 10, 24, Math.PI * 0.72);
      const fenderMesh = new THREE.Mesh(fenderGeo, yellowWallMat);
      fenderMesh.position.set(-10.0, 4.1, z);
      fenderMesh.rotation.z = Math.PI * 0.64;
      group.add(fenderMesh);
    });

    // Helper: Bone connector
    function createBone(pA, pB, rA, rB, material) {
      const vA = (pA && pA.isVector3) ? pA.clone() : new THREE.Vector3(pA[0], pA[1], pA[2]);
      const vB = (pB && pB.isVector3) ? pB.clone() : new THREE.Vector3(pB[0], pB[1], pB[2]);
      const dist = vA.distanceTo(vB);
      if (dist < 0.001) return new THREE.Group();

      const segGroup = new THREE.Group();
      const cylGeo = new THREE.CylinderGeometry(rB, rA, dist, 14, 1, false);
      cylGeo.translate(0, dist / 2, 0);
      const mesh = new THREE.Mesh(cylGeo, material);
      mesh.castShadow = true;

      const dir = new THREE.Vector3().subVectors(vB, vA).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      segGroup.position.copy(vA);
      segGroup.quaternion.copy(quat);
      segGroup.add(mesh);
      return segGroup;
    }

    // Chassis tubes
    const rearAxlePts = [new THREE.Vector3(-10.0, 4.1, -7.5), new THREE.Vector3(-10.0, 4.1, 7.5)];
    group.add(createBone(rearAxlePts[0].toArray(), rearAxlePts[1].toArray(), 0.38, 0.38, frameMat));

    group.add(createBone([-10.0, 4.1, -5.5], [1.6, 3.6, 0], 0.32, 0.32, frameMat));
    group.add(createBone([-10.0, 4.1, 5.5], [1.6, 3.6, 0], 0.32, 0.32, frameMat));
    group.add(createBone([1.6, 3.6, 0], [0.5, 6.4, 0], 0.36, 0.36, frameMat));
    group.add(createBone([1.6, 3.6, 0], [10.2, 8.8, 0], 0.38, 0.38, frameMat));
    group.add(createBone([0.5, 6.4, 0], [10.2, 8.8, 0], 0.34, 0.34, frameMat));
    group.add(createBone([0.5, 6.4, 0], [0.5, 5.6, 0], 0.32, 0.32, frameMat));

    const headTube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.2, 14), frameMat);
    headTube.position.set(10.2, 8.8, 0);
    headTube.rotation.z = -0.42;
    group.add(headTube);

    const forkStem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.8, 12), chromeMat);
    forkStem.position.set(10.6, 9.8, 0);
    forkStem.rotation.z = -0.42;
    group.add(forkStem);

    group.add(createBone([10.2, 8.0, -0.65], [13.6, 4.1, -0.65], 0.28, 0.24, chromeMat));
    group.add(createBone([10.2, 8.0, 0.65], [13.6, 4.1, 0.65], 0.28, 0.24, chromeMat));

    // Handlebars
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(9.2, 10.4, -3.2),
      new THREE.Vector3(10.4, 10.7, -1.8),
      new THREE.Vector3(10.8, 10.8, 0),
      new THREE.Vector3(10.4, 10.7, 1.8),
      new THREE.Vector3(9.2, 10.4, 3.2)
    ]);
    const handleTube = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 20, 0.18, 10, false), chromeMat);
    group.add(handleTube);

    [-3.0, 3.0].forEach(gz => {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.95, 12), rubberMat);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(9.2, 10.4, gz);
      group.add(grip);
    });

    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), goldTrimMat);
    bell.position.set(10.2, 10.95, 1.4);
    group.add(bell);

    const headLight = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.85, 16), chromeMat);
    headLight.rotation.z = Math.PI / 2;
    headLight.position.set(11.4, 8.6, 0);
    group.add(headLight);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 1.6), rubberMat);
    saddle.position.set(0.5, 6.6, 0);
    group.add(saddle);

    // Carriage Body
    [-6.8, 6.8].forEach(sz => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(11.2, 3.4, 0.35), yellowWallMat);
      sideWall.position.set(-7.0, 7.1, sz);
      sideWall.castShadow = true;
      group.add(sideWall);

      const armPts = [
        new THREE.Vector3(-12.4, 8.8, sz * 0.98),
        new THREE.Vector3(-7.0, 9.4, sz * 0.98),
        new THREE.Vector3(-1.8, 7.4, sz * 0.98)
      ];
      const armCurve = new THREE.CatmullRomCurve3(armPts);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 16, 0.22, 8, false), chromeMat));
    });

    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, 14.2), yellowWallMat);
    rearWall.position.set(-12.6, 7.5, 0);
    rearWall.castShadow = true;
    group.add(rearWall);

    const carriageFloor = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.4, 14.0), yellowWallMat);
    carriageFloor.position.set(-8.8, 5.2, 0);
    group.add(carriageFloor);

    const footboard = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.45, 14.0), woodFloorMat);
    footboard.position.set(-3.2, 5.2, 0);
    footboard.castShadow = true;
    group.add(footboard);

    const seatRiser = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 13.8), yellowWallMat);
    seatRiser.position.set(-6.2, 7.0, 0);
    seatRiser.castShadow = true;
    group.add(seatRiser);

    const benchPad = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.75, 13.8), tealTrimMat);
    benchPad.position.set(-8.8, 8.55, 0);
    benchPad.castShadow = true;
    group.add(benchPad);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.8, 13.8), seatRedMat);
    backrest.position.set(-11.8, 11.4, 0);
    backrest.castShadow = true;
    group.add(backrest);

    for (let bx = -5.5; bx <= 5.5; bx += 2.75) {
      for (let by = 9.4; by <= 13.6; by += 1.4) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), goldTrimMat);
        stud.position.set(-11.15, by, bx);
        group.add(stud);
      }
    }

    const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.5, 14.8), hoodArtMat);
    backboard.position.set(-12.6, 8.4, 0);
    backboard.castShadow = true;
    group.add(backboard);

    // Canopy Hood
    const canopyCenterX = -7.5;
    const canopyBaseY = 12.8;
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

    for (let r = 0; r <= 5; r++) {
      const ru = r / 5;
      const rang = Math.PI * (0.05 + 0.90 * ru);
      const rx = canopyCenterX + Math.cos(rang) * canopyRx;
      const ry = canopyBaseY + Math.sin(rang) * canopyRy;
      const ribPts = [new THREE.Vector3(rx, ry, -canopyWidth), new THREE.Vector3(rx, ry, canopyWidth)];
      group.add(createBone(ribPts[0].toArray(), ribPts[1].toArray(), 0.16, 0.16, chromeMat));
    }

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

    // Crankset
    const bottomBracket = [1.6, 3.6, 0];
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

    // Parallel-Transport Smooth Lofting
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

    // Static Connected Bone Segment (between pA and pB)
    function createSmoothBoneSegment(pA, pB, rA, rB, material) {
      const vA = (pA && pA.isVector3) ? pA.clone() : new THREE.Vector3(pA[0], pA[1], pA[2]);
      const vB = (pB && pB.isVector3) ? pB.clone() : new THREE.Vector3(pB[0], pB[1], pB[2]);
      const dist = vA.distanceTo(vB);
      if (dist < 0.001) return new THREE.Group();

      const segGroup = new THREE.Group();
      const cylGeo = new THREE.CylinderGeometry(rB, rA, dist, 16, 1, false);
      cylGeo.translate(0, dist / 2, 0);
      const mesh = new THREE.Mesh(cylGeo, material);
      mesh.castShadow = true;

      const dir = new THREE.Vector3().subVectors(vB, vA).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      segGroup.position.copy(vA);
      segGroup.quaternion.copy(quat);
      segGroup.add(mesh);
      return segGroup;
    }

    // Hands
    function buildGrippingHand(skinMat, side) {
      const hGroup = new THREE.Group();
      // Back of hand / palm resting naturally over handlebar grip
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.52), skinMat);
      palm.castShadow = true;
      hGroup.add(palm);

      // Knuckle ridge
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.48), skinMat);
      knuckle.position.set(0.18, 0.04, 0);
      hGroup.add(knuckle);

      // 4 Fingers curling under the rubber grip
      for (let f = 0; f < 4; f++) {
        const fz = -0.16 + f * 0.11;
        const fingerCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.38, 8), skinMat);
        fingerCyl.rotation.z = Math.PI * 0.55;
        fingerCyl.position.set(0.18, -0.14, fz);
        hGroup.add(fingerCyl);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 8), skinMat);
        tip.position.set(0.18 - Math.sin(Math.PI * 0.55) * 0.19, -0.14 - Math.cos(Math.PI * 0.55) * 0.19, fz);
        hGroup.add(tip);
      }

      // Thumb wrapping from top/side
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.32, 8), skinMat);
      thumb.position.set(-0.06, -0.06, side > 0 ? -0.22 : 0.22);
      thumb.rotation.x = side > 0 ? 0.40 : -0.40;
      thumb.rotation.z = 0.25;
      hGroup.add(thumb);
      return hGroup;
    }

    function buildRestingHand(skinMat, isFemale) {
      const hGroup = new THREE.Group();
      const s = isFemale ? 0.85 : 1.0;
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.52 * s, 0.20 * s, 0.48 * s), skinMat);
      palm.castShadow = true;
      hGroup.add(palm);

      for (let f = 0; f < 4; f++) {
        const fz = (-0.16 + f * 0.11) * s;
        const fLen = (f === 1 || f === 2 ? 0.46 : 0.40) * s;
        const fGeo = new THREE.CylinderGeometry(0.055 * s, 0.046 * s, fLen, 8);
        fGeo.translate(0, -fLen / 2, 0);
        const finger = new THREE.Mesh(fGeo, skinMat);
        finger.position.set(0.24 * s, 0.02 * s, fz);
        finger.rotation.z = -0.35;
        hGroup.add(finger);
      }

      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.068 * s, 0.055 * s, 0.32 * s, 8), skinMat);
      thumb.position.set(0.08 * s, 0.05 * s, -0.22 * s);
      thumb.rotation.z = -0.22;
      thumb.rotation.y = 0.28;
      hGroup.add(thumb);
      return hGroup;
    }

    // =========================================================================
    // DIGNIFIED ANATOMICAL BANGLADESHI PULLER HEAD (CANVAS TEXTURE + 3D DEPTH)
    // =========================================================================
    function buildPerfectPullerHead() {
      const headGroup = new THREE.Group();

      // 1. Natural Athletic Head Mesh with Painted Lifelike Bangladeshi Features
      const skullGeo = new THREE.SphereGeometry(0.82, 32, 28);
      skullGeo.scale(0.85, 1.04, 0.85);
      const skullMesh = new THREE.Mesh(skullGeo, pullerHeadMat);
      skullMesh.castShadow = true;
      headGroup.add(skullMesh);

      // 2. Smooth Volumetric Hair (recessed back so forehead & hairline stay pristine)
      const hairGeo = new THREE.SphereGeometry(0.835, 24, 20);
      hairGeo.scale(0.86, 1.05, 0.86);
      const hairMesh = new THREE.Mesh(hairGeo, hairMat);
      hairMesh.position.set(-0.10, 0.04, 0);
      hairMesh.castShadow = true;
      headGroup.add(hairMesh);

      // 3. Anatomical Nose Bridge (flush along midline of face between eyes down to tip)
      const noseBridge = createSmoothBoneSegment([0.695, 0.05, 0], [0.730, -0.05, 0], 0.035, 0.045, pullerSkinMat);
      headGroup.add(noseBridge);

      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), pullerSkinMat);
      noseTip.position.set(0.730, -0.05, 0);
      headGroup.add(noseTip);

      // 4. Symmetrical 3D Ears with realistic helix and soft lobe
      [-0.72, 0.72].forEach(ez => {
        const earHelix = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 8, 14, Math.PI * 1.3), pullerSkinMat);
        earHelix.scale.set(0.65, 1.10, 0.5);
        earHelix.position.set(-0.02, -0.02, ez);
        earHelix.rotation.y = ez > 0 ? 0.35 : -0.35;
        headGroup.add(earHelix);

        const earLobe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pullerSkinMat);
        earLobe.position.set(-0.04, -0.13, ez);
        headGroup.add(earLobe);
      });

      return headGroup;
    }

    // -------------------------------------------------------------------------
    // 1. RICKSHAW PULLER (FULL ADULT MAN - NATURAL RIDING POSTURE MATCHING IMAGE 2)
    // -------------------------------------------------------------------------
    const pullerGroup = new THREE.Group();

    // Natural athletic riding posture leaning forward ~32° towards handlebars
    const pullerTorso = createSeamlessLoftedLimb([
      { p: [0.65,  7.10, 0], rx: 1.15, ry: 1.25 }, // Pelvis/waist on saddle
      { p: [1.35,  8.05, 0], rx: 1.12, ry: 1.20 }, // Lower back
      { p: [2.15,  9.25, 0], rx: 1.22, ry: 1.35 }, // Mid back/chest
      { p: [3.10, 10.45, 0], rx: 1.18, ry: 1.45 }, // Broad shoulders
      { p: [3.45, 10.90, 0], rx: 0.65, ry: 0.80 }, // Base of neck
      { p: [3.68, 11.30, 0], rx: 0.38, ry: 0.42 }  // Neck seam
    ], 16, 20, plumShirtMat);
    pullerGroup.add(pullerTorso);

    const pullerShoulderPos = { x: 3.10, y: 10.45, z: 1.35 };

    // Clean Shirt Collar (Zero vampire fins, flat round polo collar)
    const collarBand = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.20, 18), plumShirtMat);
    collarBand.position.set(3.50, 10.95, 0);
    collarBand.rotation.z = -0.38;
    pullerGroup.add(collarBand);

    // Front Placket lying flat on chest
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.05), plumShirtMat);
    placket.position.set(3.60, 10.65, 0);
    placket.rotation.z = -0.38;
    pullerGroup.add(placket);

    // Neck
    const pullerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.65, 14), pullerSkinMat);
    pullerNeck.position.set(3.70, 11.35, 0);
    pullerNeck.rotation.z = -0.34;
    pullerGroup.add(pullerNeck);

    // AUTHENTIC DHAKA GAMCHA (Draped naturally over Left Shoulder!)
    const gamchaDrape = createSeamlessLoftedLimb([
      { p: [2.70,  9.65, 0.70], rx: 0.12, ry: 0.36 },
      { p: [3.10, 10.30, 0.82], rx: 0.12, ry: 0.38 },
      { p: [3.35, 10.70, 0.85], rx: 0.12, ry: 0.36 },
      { p: [3.05, 10.55, 0.80], rx: 0.12, ry: 0.36 },
      { p: [2.50,  9.75, 0.68], rx: 0.12, ry: 0.36 }
    ], 12, 16, gamchaMat);
    pullerGroup.add(gamchaDrape);

    // Perfect Sculpted Head
    const pullerHead = buildPerfectPullerHead();
    pullerHead.position.set(4.05, 11.95, 0);
    pullerHead.rotation.z = -0.06;
    pullerGroup.add(pullerHead);

    // Proportional Athletic Arms with natural ~110° elbow bend matching Image 2
    [-1, 1].forEach(side => {
      const shX = pullerShoulderPos.x;
      const shY = pullerShoulderPos.y;
      const shZ = side * pullerShoulderPos.z;
      const gripTarget = [9.20, 10.55, side * 2.95];
      // Balanced Elbow Drop (upper arm ~3.4, forearm ~4.0)
      const elbowPos = [5.70, 8.50, side * 2.25];

      // Upper arm in shirt sleeve (Shoulder -> Elbow)
      pullerGroup.add(createSmoothBoneSegment([shX, shY, shZ], elbowPos, 0.48, 0.40, plumShirtMat));

      // Rolled Sleeve Cuff at Elbow
      const cuffHem = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.42, 0.22, 16), plumShirtMat);
      cuffHem.position.set(elbowPos[0], elbowPos[1], elbowPos[2]);
      pullerGroup.add(cuffHem);

      // Muscular Bare Forearm extending upward & forward to wrist
      const wristPos = [gripTarget[0] - 0.25, gripTarget[1] - 0.02, gripTarget[2]];
      pullerGroup.add(createSmoothBoneSegment(elbowPos, wristPos, 0.35, 0.26, pullerSkinMat));

      // Realistic Gripping Hand wrapping directly around Handlebar Grip
      const hand = buildGrippingHand(pullerSkinMat, side);
      hand.position.set(gripTarget[0], gripTarget[1], gripTarget[2]);
      hand.rotation.order = 'YXZ';
      hand.rotation.y = side > 0 ? 0.30 : -0.30;
      hand.rotation.z = -0.15;
      pullerGroup.add(hand);
    });

    // -------------------------------------------------------------------------
    // THE AUTHENTIC LUNGI (SARONG) & ARTICULATED PEDALING LEGS
    // -------------------------------------------------------------------------
    // Main Draped Waist & Pelvis Lungi Wrap (covers hips, pelvis, buttocks, and saddle)
    const lungiWaist = createSeamlessLoftedLimb([
      { p: [0.65, 7.30, 0], rx: 1.15, ry: 1.30 },
      { p: [0.75, 6.60, 0], rx: 1.28, ry: 1.45 },
      { p: [0.90, 5.80, 0], rx: 1.35, ry: 1.50 }
    ], 16, 16, lungiMat);
    pullerGroup.add(lungiWaist);

    // Front Waist Knot / Fold (Lungi Gira)
    const lungiKnot = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), lungiMat);
    lungiKnot.scale.set(0.9, 0.7, 1.2);
    lungiKnot.position.set(1.40, 6.90, 0);
    pullerGroup.add(lungiKnot);

    // Dynamic Pedaling Legs
    const lenThigh = 2.8;
    const lenShin = 2.6;
    const pullerLegs = [];

    // Helper: Dynamic bone segment where mesh vertices start at (0, 0, 0) and extend along +Y to (0, len, 0)
    function createPedalLimb(radiusBottom, radiusTop, length, material) {
      const g = new THREE.Group();
      const cylGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 16, 1, false);
      cylGeo.translate(0, length / 2, 0);
      const mesh = new THREE.Mesh(cylGeo, material);
      mesh.castShadow = true;
      g.add(mesh);
      return g;
    }

    [-1, 1].forEach(side => {
      const hipPt = new THREE.Vector3(0.65, 6.8, side * 0.95);
      const legGroup = new THREE.Group();

      // Thigh Limb (wrapped in authentic lungi fabric down to knee!)
      const thighGroup = createPedalLimb(0.56, 0.48, lenThigh, lungiMat);

      // Fabric Knee Hem / Cuff
      const kneeHem = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.22, 16), lungiMat);
      kneeHem.position.set(0, lenThigh, 0);
      thighGroup.add(kneeHem);

      // Calf Limb (bare bronze muscle from knee to ankle)
      const calfGroup = createPedalLimb(0.44, 0.30, lenShin, pullerSkinMat);

      // Traditional Bengali Brown Leather Strap Sandal (Chappal)
      const footGroup = new THREE.Group();
      const sandalSole = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.22, 0.78), brownSandalMat);
      sandalSole.castShadow = true;
      footGroup.add(sandalSole);

      const strapCross = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.82), brownSandalMat);
      strapCross.position.set(0.20, 0.14, 0);
      footGroup.add(strapCross);

      const strapToe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), brownSandalMat);
      strapToe.position.set(0.52, 0.12, 0);
      footGroup.add(strapToe);

      legGroup.add(thighGroup);
      legGroup.add(calfGroup);
      legGroup.add(footGroup);
      pullerGroup.add(legGroup);

      pullerLegs.push({
        side: side,
        hip: hipPt,
        thighGroup: thighGroup,
        calfGroup: calfGroup,
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

        // Thigh: extends from leg.hip towards knee (kx, ky, kz)
        const thighDir = new THREE.Vector3(kx - leg.hip.x, ky - leg.hip.y, 0).normalize();
        const qThigh = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), thighDir);
        leg.thighGroup.position.copy(leg.hip);
        leg.thighGroup.quaternion.copy(qThigh);

        // Calf: extends from knee (kx, ky, kz) towards pedal (pedalLocalX, pedalLocalY, pedalLocalZ)
        const shinDir = new THREE.Vector3(pedalLocalX - kx, pedalLocalY - ky, pedalLocalZ - kz).normalize();
        const qShin = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), shinDir);
        leg.calfGroup.position.set(kx, ky, kz);
        leg.calfGroup.quaternion.copy(qShin);

        // Lock Sandal onto Pedal
        leg.footGroup.position.set(pedalLocalX, pedalLocalY, pedalLocalZ);
        leg.footGroup.quaternion.identity();
      });
    }

    group.add(pullerGroup);
    group.userData.updatePedaling = updatePullerPedaling;
    updatePullerPedaling(0);

    // -------------------------------------------------------------------------
    // 2. PASSENGERS (FULL ADULT MAN & WOMAN)
    // -------------------------------------------------------------------------
    const mHipX = -8.8, mHipY = 9.0, mZ = -3.4;
    const fHipX = -8.8, fHipY = 9.0, fZ = 3.4;

    const maleShirtMat = new THREE.MeshStandardMaterial({ color: 0x6d559e, roughness: 0.62 });
    const malePantMat = new THREE.MeshStandardMaterial({ color: 0x245a8a, roughness: 0.75 });
    const maleSkinMat = new THREE.MeshStandardMaterial({ color: 0xa46b52, roughness: 0.62 });
    const maleGroup = new THREE.Group();

    const maleTorso = createSeamlessLoftedLimb([
      { p: [mHipX, mHipY, mZ], rx: 1.15, ry: 1.35 },
      { p: [mHipX + 0.10, mHipY + 1.10, mZ], rx: 1.10, ry: 1.30 },
      { p: [mHipX + 0.20, mHipY + 2.30, mZ], rx: 1.35, ry: 1.70 },
      { p: [mHipX + 0.20, mHipY + 3.40, mZ], rx: 1.30, ry: 1.95 },
      { p: [mHipX + 0.20, mHipY + 3.90, mZ], rx: 0.85, ry: 1.10 },
      { p: [mHipX + 0.20, mHipY + 4.25, mZ], rx: 0.48, ry: 0.52 }
    ], 16, 20, maleShirtMat);
    maleGroup.add(maleTorso);

    const mCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 14), maleShirtMat);
    mCollar.position.set(mHipX + 0.20, mHipY + 3.95, mZ);
    maleGroup.add(mCollar);

    const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.80, 12), maleSkinMat);
    mNeck.position.set(mHipX + 0.20, mHipY + 4.40, mZ);
    maleGroup.add(mNeck);

    const mHeadGeo = new THREE.SphereGeometry(0.95, 22, 18);
    mHeadGeo.scale(0.90, 1.06, 0.94);
    const mHeadMesh = new THREE.Mesh(mHeadGeo, maleSkinMat);
    mHeadMesh.position.set(mHipX + 0.25, mHipY + 5.15, mZ);
    maleGroup.add(mHeadMesh);

    const mHair = new THREE.Mesh(new THREE.SphereGeometry(0.97, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    mHair.position.set(mHipX + 0.22, mHipY + 5.25, mZ);
    maleGroup.add(mHair);

    [-1.4, 1.4].forEach(az => {
      const shPt = [mHipX + 0.20, mHipY + 3.40, mZ + az * 1.05];
      const kneeTarget = [-5.6, mHipY + 0.3, mZ + az * 0.7];
      const elbowPt = [-7.6, mHipY + 1.4, mZ + az * 1.15];

      maleGroup.add(createSmoothBoneSegment(shPt, elbowPt, 0.54, 0.46, maleShirtMat));
      maleGroup.add(createSmoothBoneSegment(elbowPt, kneeTarget, 0.44, 0.36, maleSkinMat));

      const mHand = buildRestingHand(maleSkinMat, false);
      mHand.position.set(kneeTarget[0], kneeTarget[1], kneeTarget[2]);
      mHand.rotation.y = az > 0 ? 0.35 : -0.35;
      maleGroup.add(mHand);
    });

    [-0.95, 0.95].forEach(tz => {
      const legZ = mZ + tz;
      const hipPt = [mHipX, mHipY, legZ];
      const kneePt = [-5.5, mHipY, legZ];
      const anklePt = [-5.3, 5.65, legZ];

      maleGroup.add(createSmoothBoneSegment(hipPt, kneePt, 0.70, 0.60, malePantMat));
      maleGroup.add(createSmoothBoneSegment(kneePt, anklePt, 0.60, 0.50, malePantMat));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.24, 0.78), brownSandalMat);
      sandal.position.set(anklePt[0] + 0.4, 5.45, legZ);
      maleGroup.add(sandal);
    });

    group.add(maleGroup);

    // 2.2 FEMALE PASSENGER
    const femaleSareeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
    const femaleSkinMat = new THREE.MeshStandardMaterial({ color: 0xb5735b, roughness: 0.55 });
    const femaleGroup = new THREE.Group();

    const femaleTorso = createSeamlessLoftedLimb([
      { p: [fHipX, fHipY, fZ], rx: 1.05, ry: 1.25 },
      { p: [fHipX + 0.10, fHipY + 1.10, fZ], rx: 0.98, ry: 1.18 },
      { p: [fHipX + 0.18, fHipY + 2.20, fZ], rx: 1.15, ry: 1.45 },
      { p: [fHipX + 0.18, fHipY + 3.20, fZ], rx: 1.10, ry: 1.65 },
      { p: [fHipX + 0.18, fHipY + 3.75, fZ], rx: 0.72, ry: 0.95 },
      { p: [fHipX + 0.18, fHipY + 4.10, fZ], rx: 0.42, ry: 0.46 }
    ], 16, 20, femaleSareeMat);
    femaleGroup.add(femaleTorso);

    const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.75, 12), femaleSkinMat);
    fNeck.position.set(fHipX + 0.18, fHipY + 4.25, fZ);
    femaleGroup.add(fNeck);

    const aanchal = createSeamlessLoftedLimb([
      { p: [fHipX + 0.10, fHipY + 1.20, fZ - 0.75], rx: 0.16, ry: 0.65 },
      { p: [fHipX + 0.22, fHipY + 2.40, fZ - 0.20], rx: 0.18, ry: 0.70 },
      { p: [fHipX + 0.22, fHipY + 3.40, fZ + 0.65], rx: 0.20, ry: 0.75 },
      { p: [fHipX - 0.15, fHipY + 3.20, fZ + 0.85], rx: 0.22, ry: 0.80 },
      { p: [fHipX - 0.35, fHipY + 1.80, fZ + 0.95], rx: 0.25, ry: 0.85 }
    ], 14, 18, femaleSareeMat);
    femaleGroup.add(aanchal);

    const fHeadGeo = new THREE.SphereGeometry(0.88, 22, 18);
    fHeadGeo.scale(0.88, 1.05, 0.92);
    const fHeadMesh = new THREE.Mesh(fHeadGeo, femaleSkinMat);
    fHeadMesh.position.set(fHipX + 0.22, fHipY + 4.95, fZ);
    femaleGroup.add(fHeadMesh);

    const fGhomta = new THREE.Mesh(
      new THREE.SphereGeometry(1.02, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.68),
      femaleSareeMat
    );
    fGhomta.position.set(fHipX + 0.16, fHipY + 5.12, fZ);
    femaleGroup.add(fGhomta);

    [-1.3, 1.3].forEach(az => {
      const shPt = [fHipX + 0.18, fHipY + 3.20, fZ + az * 0.95];
      const kneeTarget = [-5.6, fHipY + 0.2, fZ + az * 0.65];
      const elbowPt = [-7.4, fHipY + 1.3, fZ + az * 1.05];

      femaleGroup.add(createSmoothBoneSegment(shPt, elbowPt, 0.48, 0.40, femaleSareeMat));
      femaleGroup.add(createSmoothBoneSegment(elbowPt, kneeTarget, 0.38, 0.30, femaleSkinMat));

      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 16), goldTrimMat);
      bangle.position.set(kneeTarget[0] - 0.4, kneeTarget[1] + 0.2, kneeTarget[2]);
      femaleGroup.add(bangle);

      const fHand = buildRestingHand(femaleSkinMat, true);
      fHand.position.set(kneeTarget[0], kneeTarget[1], kneeTarget[2]);
      fHand.rotation.y = az > 0 ? 0.35 : -0.35;
      femaleGroup.add(fHand);
    });

    const skirtLoft = createSeamlessLoftedLimb([
      { p: [fHipX, fHipY + 0.1, fZ], rx: 1.35, ry: 1.55 },
      { p: [-5.6, fHipY + 0.05, fZ], rx: 1.45, ry: 1.65 },
      { p: [-5.4, 5.7, fZ], rx: 1.55, ry: 1.75 }
    ], 16, 16, femaleSareeMat);
    femaleGroup.add(skirtLoft);

    [-0.75, 0.75].forEach(tz => {
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.68), brownSandalMat);
      sandal.position.set(-5.0, 5.45, fZ + tz);
      femaleGroup.add(sandal);
    });

    group.add(femaleGroup);

    return group;
  }

  const rickshaw = buildMasterRickshaw();
  scene.add(rickshaw);

  let pedalingAngle = 0;
  function animate() {
    requestAnimationFrame(animate);
    pedalingAngle -= 0.035;
    if (rickshaw.userData.updatePedaling) {
      rickshaw.userData.updatePedaling(pedalingAngle);
    }
    renderer.render(scene, camera);
  }
  animate();
</script>
</body>
</html>
'''

with open('scratch/test_perfect_puller.html', 'w', encoding='utf-8') as f:
    f.write(html_code)

print("Saved scratch/test_perfect_puller.html")

views = [
    ('scratch/puller_screenshot_match.png', (9.5, 14.5, 10.5), (3.0, 9.0, 0)),
    ('scratch/puller_front_view.png', (8.6, 12.1, 0), (4.05, 11.95, 0)),
    ('scratch/puller_side_view.png', (3.0, 9.5, 22.0), (3.0, 9.5, 0)),
    ('scratch/puller_face_close.png', (6.4, 12.3, 1.6), (4.05, 11.95, 0))
]

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_perfect_puller')
os.makedirs(user_data, exist_ok=True)

cam_regex = r'camera\.position\.set\([^)]+\);\s*camera\.lookAt\([^)]+\);'

for out_name, cam_pos, look_at in views:
    cam_setup = f'camera.position.set({cam_pos[0]}, {cam_pos[1]}, {cam_pos[2]});\n  camera.lookAt({look_at[0]}, {look_at[1]}, {look_at[2]});'
    content = re.sub(cam_regex, cam_setup, html_code)

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
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        print(f'{out_name}: exists={os.path.exists(out_png)}, size={os.path.getsize(out_png) if os.path.exists(out_png) else 0}')
    except Exception as e:
        print(f'Error for {out_name}: {e}')
