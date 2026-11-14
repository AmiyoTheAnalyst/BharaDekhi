import os
import subprocess
import math

html_template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authentic Dhaka Rickshaw - Matching Reference Art</title>
  <style>
    body { margin: 0; background: #0c1220; overflow: hidden; }
    #canvas-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
<div id="canvas-container"></div>
<script src="../assets/three.min.js"></script>
<script>
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1220);

  const camera = new THREE.PerspectiveCamera(36, 1280 / 720, 0.1, 1000);
  camera.position.set(0.5, 6.2, 17.5);
  camera.lookAt(0.5, 5.8, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(1280, 720);
  renderer.setPixelRatio(1.5);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting matching rich outdoor daytime diorama
  const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.05);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
  keyLight.position.set(12, 24, 16);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
  fillLight.position.set(-15, 12, -12);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffedd5, 0.6);
  rimLight.position.set(-8, 14, 18);
  scene.add(rimLight);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(120, 120);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // Helper function: Smooth lofted organic mesh
  function createLoftedOrganMesh(stations, radSegs = 24, mat, capTop = true, capBottom = true) {
    const numStations = stations.length;
    const pos = [];
    const uvs = [];
    const indices = [];

    for (let s = 0; s < numStations; s++) {
      const st = stations[s];
      const u = s / (numStations - 1);
      const cx = st.center[0], cy = st.center[1], cz = st.center[2];
      const rx = st.rx, rz = st.rz;
      const rotY = st.rotY || 0;
      const cosR = Math.cos(rotY), sinR = Math.sin(rotY);

      for (let j = 0; j <= radSegs; j++) {
        const theta = (j / radSegs) * Math.PI * 2;
        const lx = Math.cos(theta) * rx;
        const lz = Math.sin(theta) * rz;
        // apply local rotation
        const wx = cx + (lx * cosR - lz * sinR);
        const wy = cy;
        const wz = cz + (lx * sinR + lz * cosR);

        pos.push(wx, wy, wz);
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

    // Top cap
    if (capTop) {
      const topIdx = pos.length / 3;
      const topSt = stations[numStations - 1];
      pos.push(topSt.center[0], topSt.center[1], topSt.center[2]);
      uvs.push(0.5, 1);
      const ringStart = (numStations - 1) * (radSegs + 1);
      for (let j = 0; j < radSegs; j++) {
        indices.push(topIdx, ringStart + j, ringStart + j + 1);
      }
    }

    // Bottom cap
    if (capBottom) {
      const botIdx = pos.length / 3;
      const botSt = stations[0];
      pos.push(botSt.center[0], botSt.center[1], botSt.center[2]);
      uvs.push(0.5, 0);
      for (let j = 0; j < radSegs; j++) {
        indices.push(botIdx, j + 1, j);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  }

  // Helper function: Smooth Spline Tube
  function createSplineTube(pts, r, mat, segs = 20, radSegs = 10) {
    const vPts = pts.map(p => Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p);
    const curve = new THREE.CatmullRomCurve3(vPts);
    const geo = new THREE.TubeGeometry(curve, segs, r, radSegs, false);
    return new THREE.Mesh(geo, mat);
  }

  // Adult Sculpted Head Function matching Reference Art
  function buildArtisticAdultHead(isFemale, skinMat, hairMat, options = {}) {
    const headGroup = new THREE.Group();

    // 1. Cranium & Chin sculpt
    const craniumGeo = new THREE.SphereGeometry(0.70, 20, 16);
    craniumGeo.scale(0.88, 1.10, 0.95);
    const cranium = new THREE.Mesh(craniumGeo, skinMat);
    cranium.position.set(0, 0.12, 0);
    headGroup.add(cranium);

    // Chin & Jaw definition
    const jawGeo = new THREE.CylinderGeometry(0.38, 0.22, 0.55, 12);
    jawGeo.scale(0.9, 1.0, 0.9);
    const jaw = new THREE.Mesh(jawGeo, skinMat);
    jaw.position.set(0.18, -0.45, 0);
    jaw.rotation.z = -0.32;
    headGroup.add(jaw);

    // 2. Sculpted Nose
    const noseGeo = new THREE.ConeGeometry(0.10, 0.34, 8);
    noseGeo.rotateZ(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0.72, 0.05, 0);
    nose.rotation.y = Math.PI / 2;
    headGroup.add(nose);

    // 3. Eyes (left & right)
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const browMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    [-0.26, 0.26].forEach(zPos => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), eyeWhiteMat);
      eyeWhite.scale.set(0.65, 0.85, 1.3);
      eyeWhite.position.set(0.55, 0.18, zPos);
      headGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pupilMat);
      pupil.position.set(0.60, 0.18, zPos + (zPos > 0 ? 0.015 : -0.015));
      headGroup.add(pupil);

      // Eyebrow
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.08), browMat);
      brow.position.set(0.54, 0.32, zPos);
      brow.rotation.z = -0.15;
      brow.rotation.y = zPos > 0 ? -0.15 : 0.15;
      headGroup.add(brow);

      // Ear
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
      ear.scale.set(0.65, 1.15, 0.45);
      ear.position.set(-0.16, 0.08, zPos > 0 ? 0.72 : -0.72);
      headGroup.add(ear);
    });

    // 4. Lips / Mouth
    const lipMat = options.lipMat || new THREE.MeshStandardMaterial({ color: 0xa84343, roughness: 0.5 });
    const upperLip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 8), lipMat);
    upperLip.rotation.x = Math.PI / 2;
    upperLip.position.set(0.60, -0.20, 0);
    headGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), lipMat);
    lowerLip.scale.set(0.8, 0.5, 1.4);
    lowerLip.position.set(0.58, -0.27, 0);
    headGroup.add(lowerLip);

    // 5. Gender Specifics
    if (isFemale) {
      // Red Bindi (Teep) on forehead
      const teepMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f });
      const teep = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 12), teepMat);
      teep.rotation.z = Math.PI / 2;
      teep.position.set(0.68, 0.34, 0);
      headGroup.add(teep);

      // Gold hoop earrings
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });
      [-0.72, 0.72].forEach(zPos => {
        const earring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 12), goldMat);
        earring.position.set(-0.16, -0.04, zPos);
        earring.rotation.y = Math.PI / 2;
        headGroup.add(earring);
      });

      // Female Hair (smooth dark hair bun and front parting)
      const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), hairMat);
      hairCrown.scale.set(0.92, 1.05, 0.98);
      hairCrown.position.set(-0.06, 0.22, 0);
      headGroup.add(hairCrown);

      const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), hairMat);
      hairBun.scale.set(0.8, 0.9, 1.0);
      hairBun.position.set(-0.66, 0.08, 0);
      headGroup.add(hairBun);
    } else {
      // Male Hair (neat side trim and back volume)
      const maleHair = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), hairMat);
      maleHair.scale.set(0.94, 1.06, 0.98);
      maleHair.position.set(-0.08, 0.24, 0);
      headGroup.add(maleHair);

      // Mustache
      const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.9 });
      const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.035, 0.36, 8), mustacheMat);
      stache.rotation.x = Math.PI / 2;
      stache.rotation.z = -0.15;
      stache.position.set(0.66, -0.12, 0);
      headGroup.add(stache);
    }

    return headGroup;
  }

  // Master Dhaka Rickshaw Constructor
  function buildAuthenticDhakaRickshaw() {
    const rickGroup = new THREE.Group();

    // 1. Materials strictly matching Reference Art
    const pullerSkinMat = new THREE.MeshStandardMaterial({ color: 0x8d533e, roughness: 0.60 });
    const maleSkinMat = new THREE.MeshStandardMaterial({ color: 0xb87352, roughness: 0.60 });
    const femaleSkinMat = new THREE.MeshStandardMaterial({ color: 0xf2c19f, roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.90 });

    const pullerShirtMat = new THREE.MeshStandardMaterial({ color: 0x5a2d52, roughness: 0.72 });
    const pullerLungiMat = new THREE.MeshStandardMaterial({ color: 0x484ea2, roughness: 0.70 });
    const pullerSandalMat = new THREE.MeshStandardMaterial({ color: 0x502812, roughness: 0.85 });

    const maleShirtMat = new THREE.MeshStandardMaterial({ color: 0x7350a4, roughness: 0.68 });
    const malePantMat = new THREE.MeshStandardMaterial({ color: 0x1d76c8, roughness: 0.70 });

    const femaleSareeMat = new THREE.MeshStandardMaterial({ color: 0xf1972b, roughness: 0.65 });
    const femaleSkirtMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.62 });
    const femaleSandalMat = new THREE.MeshStandardMaterial({ color: 0xe0407a, roughness: 0.75 });

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.9 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const tealCarriageMat = new THREE.MeshStandardMaterial({ color: 0x429b90, roughness: 0.40 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const armrestWoodMat = new THREE.MeshStandardMaterial({ color: 0xb2793e, roughness: 0.45 });
    const canopyBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d78d6, roughness: 0.55 });
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.8 });
    const saddleMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 });
    const seatCushionMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.50 });

    // Wheel dimensions
    const WHEEL_R = 2.80;
    const REAR_X = -4.35;
    const FRONT_X = 6.45;
    const TRACK_W = 4.70;

    // Build Wheels Function
    function makeSpokedWheel(radius, width = 0.22, numSpokes = 28) {
      const wGroup = new THREE.Group();
      // Tire
      const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.16, 12, 40), rubberMat);
      wGroup.add(tire);
      // Rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.08, 0.085, 10, 40), chromeMat);
      wGroup.add(rim);
      // Hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, width * 1.8, 12), chromeMat);
      hub.rotation.x = Math.PI / 2;
      wGroup.add(hub);
      // Spokes
      const spokeGeo = new THREE.CylinderGeometry(0.018, 0.018, radius * 1.86, 4);
      for (let i = 0; i < numSpokes; i++) {
        const sp = new THREE.Mesh(spokeGeo, chromeMat);
        const ang = (i / numSpokes) * Math.PI;
        sp.rotation.z = ang;
        sp.position.z = (i % 2 === 0 ? 0.04 : -0.04);
        wGroup.add(sp);
      }
      return wGroup;
    }

    // 1. FRONT WHEEL & FORK
    const frontWheel = makeSpokedWheel(WHEEL_R, 0.22, 32);
    frontWheel.position.set(FRONT_X, WHEEL_R, 0);
    rickGroup.add(frontWheel);

    // Front mudguard
    const frontFender = new THREE.Mesh(
      new THREE.TorusGeometry(WHEEL_R + 0.18, 0.16, 8, 24, Math.PI * 0.72),
      frameMat
    );
    frontFender.rotation.z = Math.PI * 0.55;
    frontFender.position.set(FRONT_X, WHEEL_R, 0);
    rickGroup.add(frontFender);

    // Front Fork
    [-0.32, 0.32].forEach(fz => {
      const forkBlade = createSplineTube(
        [[FRONT_X, WHEEL_R, fz], [FRONT_X - 0.45, WHEEL_R + 2.85, fz * 0.4], [FRONT_X - 0.55, WHEEL_R + 3.45, 0]],
        0.11, frameMat
      );
      rickGroup.add(forkBlade);
    });

    // Head tube & Handlebar Stem
    const headTube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), frameMat);
    headTube.position.set(FRONT_X - 0.65, WHEEL_R + 3.85, 0);
    headTube.rotation.z = 0.24;
    rickGroup.add(headTube);

    // Chrome Handlebars matching reference
    const barPts = [
      [FRONT_X - 1.25, WHEEL_R + 4.35, -1.35],
      [FRONT_X - 0.95, WHEEL_R + 4.45, -0.75],
      [FRONT_X - 0.68, WHEEL_R + 4.52, 0],
      [FRONT_X - 0.95, WHEEL_R + 4.45, 0.75],
      [FRONT_X - 1.25, WHEEL_R + 4.35, 1.35]
    ];
    const handlebar = createSplineTube(barPts, 0.08, chromeMat, 24, 10);
    rickGroup.add(handlebar);

    // Black Grips
    [-1.32, 1.32].forEach(gz => {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.45, 10), rubberMat);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(FRONT_X - 1.25, WHEEL_R + 4.35, gz);
      rickGroup.add(grip);
    });

    // Brass Bell on handlebar
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 }));
    bell.position.set(FRONT_X - 0.95, WHEEL_R + 4.65, -0.65);
    rickGroup.add(bell);

    // 2. REAR WHEELS & AXLE
    [-TRACK_W / 2, TRACK_W / 2].forEach(rz => {
      const rearWheel = makeSpokedWheel(WHEEL_R, 0.22, 32);
      rearWheel.position.set(REAR_X, WHEEL_R, rz);
      rickGroup.add(rearWheel);

      // Curved rear mudguards matching reference
      const rearFender = new THREE.Mesh(
        new THREE.TorusGeometry(WHEEL_R + 0.22, 0.18, 8, 24, Math.PI * 0.75),
        armrestWoodMat
      );
      rearFender.rotation.z = Math.PI * 0.45;
      rearFender.position.set(REAR_X, WHEEL_R, rz);
      rickGroup.add(rearFender);
    });

    // Rear axle
    const rearAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, TRACK_W, 12), frameMat);
    rearAxle.rotation.x = Math.PI / 2;
    rearAxle.position.set(REAR_X, WHEEL_R, 0);
    rickGroup.add(rearAxle);

    // 3. CLASSIC BLACK BICYCLE CHASSIS (Double Top Tube Roadster Frame)
    const CRANK_X = 1.15;
    const CRANK_Y = 1.85;
    const SADDLE_X = -0.55;
    const SADDLE_Y = 5.25;

    // Bottom bracket & Chainring
    const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20), chromeMat);
    chainring.rotation.x = Math.PI / 2;
    chainring.position.set(CRANK_X, CRANK_Y, 0.42);
    rickGroup.add(chainring);

    // Frame tubes
    // Seat tube: Bottom bracket up to saddle
    const seatTube = createSplineTube([[CRANK_X, CRANK_Y, 0], [SADDLE_X, SADDLE_Y - 0.2, 0]], 0.12, frameMat);
    rickGroup.add(seatTube);

    // Down tube: Head tube to Bottom bracket
    const downTube = createSplineTube([[FRONT_X - 0.65, WHEEL_R + 3.3, 0], [CRANK_X, CRANK_Y, 0]], 0.12, frameMat);
    rickGroup.add(downTube);

    // Double Top tubes: Head tube to seat tube
    const topTubeUpper = createSplineTube([[FRONT_X - 0.65, WHEEL_R + 3.75, 0], [SADDLE_X, SADDLE_Y - 0.35, 0]], 0.11, frameMat);
    rickGroup.add(topTubeUpper);
    const topTubeLower = createSplineTube([[FRONT_X - 0.65, WHEEL_R + 3.15, 0], [SADDLE_X + 0.3, SADDLE_Y - 1.25, 0]], 0.10, frameMat);
    rickGroup.add(topTubeLower);

    // Chainstay tubes running back to rear axle
    [-1.2, 1.2].forEach(az => {
      const stay = createSplineTube([[CRANK_X, CRANK_Y, 0], [REAR_X + 1.2, WHEEL_R - 0.8, az], [REAR_X, WHEEL_R, az]], 0.10, frameMat);
      rickGroup.add(stay);
      // Upper diagonal brace from seat tube to rear carriage
      const upperBrace = createSplineTube([[SADDLE_X, SADDLE_Y - 0.4, 0], [REAR_X + 0.8, WHEEL_R + 0.8, az]], 0.09, frameMat);
      rickGroup.add(upperBrace);
    });

    // Spring Bicycle Saddle matching reference
    const saddleGroup = new THREE.Group();
    saddleGroup.position.set(SADDLE_X, SADDLE_Y, 0);

    const saddleTop = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.35, 12), saddleMat);
    saddleTop.rotation.z = -Math.PI / 2;
    saddleTop.scale.set(0.45, 1.0, 0.75);
    saddleGroup.add(saddleTop);

    // Saddle springs
    [-0.22, 0.22].forEach(sz => {
      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.35, 8), chromeMat);
      spring.position.set(-0.35, -0.22, sz);
      saddleGroup.add(spring);
    });
    rickGroup.add(saddleGroup);

    // Pedals and Crank Arms (left & right)
    const CRANK_R = 1.05;
    const crankAngle = 0.55; // Angle for authentic forward riding posture

    // Right pedal (forward & up)
    const rPedalX = CRANK_X + Math.cos(crankAngle) * CRANK_R;
    const rPedalY = CRANK_Y + Math.sin(crankAngle) * CRANK_R;
    const rPedalZ = 0.65;
    const rCrank = createSplineTube([[CRANK_X, CRANK_Y, 0.45], [rPedalX, rPedalY, rPedalZ]], 0.08, chromeMat);
    rickGroup.add(rCrank);
    const rPedal = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.28), frameMat);
    rPedal.position.set(rPedalX, rPedalY, rPedalZ + 0.12);
    rickGroup.add(rPedal);

    // Left pedal (backward & down)
    const lPedalX = CRANK_X + Math.cos(crankAngle + Math.PI) * CRANK_R;
    const lPedalY = CRANK_Y + Math.sin(crankAngle + Math.PI) * CRANK_R;
    const lPedalZ = -0.65;
    const lCrank = createSplineTube([[CRANK_X, CRANK_Y, -0.45], [lPedalX, lPedalY, lPedalZ]], 0.08, chromeMat);
    rickGroup.add(lCrank);
    const lPedal = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.28), frameMat);
    lPedal.position.set(lPedalX, lPedalY, lPedalZ - 0.12);
    rickGroup.add(lPedal);

    // 4. ELEGANT SEAFOAM TEAL CARRIAGE TUB (Curved Bucket with Wooden Armrests)
    const carriageGroup = new THREE.Group();
    carriageGroup.position.set(REAR_X + 0.3, WHEEL_R + 0.2, 0);

    // Carriage Tub Side Profile (Smooth Extruded Curved Shape)
    const tubShape = new THREE.Shape();
    tubShape.moveTo(2.4, 0.1);    // front footboard tip
    tubShape.lineTo(2.4, 0.55);
    tubShape.bezierCurveTo(1.4, 0.65, 0.8, 1.45, 0.3, 2.15); // curved side swoop
    tubShape.lineTo(-1.35, 2.15); // top rear rim
    tubShape.bezierCurveTo(-1.55, 2.15, -1.65, 1.85, -1.65, 1.35); // back curve
    tubShape.lineTo(-1.65, 0.1);
    tubShape.closePath();

    const tubGeo = new THREE.ExtrudeGeometry(tubShape, {
      depth: 3.40,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 2,
      bevelSize: 0.08,
      bevelThickness: 0.08
    });
    // Center extrusion along Z
    tubGeo.translate(0, 0, -1.70);
    const carriageTubMesh = new THREE.Mesh(tubGeo, tealCarriageMat);
    carriageGroup.add(carriageTubMesh);

    // Curved Wooden Armrests on top of both side rims
    [-1.72, 1.72].forEach(az => {
      const armCurvePts = [
        [0.4, 2.22, az],
        [-0.4, 2.24, az],
        [-1.35, 2.22, az]
      ];
      const armrest = createSplineTube(armCurvePts, 0.12, armrestWoodMat, 12, 8);
      carriageGroup.add(armrest);
    });

    // Wooden Footboard at front
    const footboard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 3.25), woodFloorMat);
    footboard.position.set(1.65, 0.18, 0);
    carriageGroup.add(footboard);

    // Lowered Recessed Passenger Seat Cushion
    const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.45, 3.20), seatCushionMat);
    seatCushion.position.set(-0.35, 0.85, 0);
    carriageGroup.add(seatCushion);

    // Curved Passenger Backrest
    const backrestGeo = new THREE.BoxGeometry(0.35, 1.85, 3.20);
    const backrest = new THREE.Mesh(backrestGeo, seatCushionMat);
    backrest.position.set(-1.15, 1.95, 0);
    backrest.rotation.z = -0.15;
    carriageGroup.add(backrest);

    rickGroup.add(carriageGroup);

    // 5. ACCORDION PLEATED BLUE CANOPY HOOD MATCHING REFERENCE ART (NO SPIKES!)
    const hoodGroup = new THREE.Group();
    hoodGroup.position.set(REAR_X - 0.75, WHEEL_R + 2.35, 0);

    // Ribbed pleated folding canopy shape
    const numPleats = 5;
    const pleatPts = [];
    for (let p = 0; p <= numPleats; p++) {
      const frac = p / numPleats;
      const ang = Math.PI * 0.45 - frac * Math.PI * 0.75;
      const r = 2.65;
      const hx = Math.sin(ang) * r;
      const hy = Math.cos(ang) * r;
      pleatPts.push(new THREE.Vector3(hx, hy, 0));
    }

    // Lofted pleated canopy surface
    const canopyStations = [];
    const canopyW = 3.65;
    for (let i = 0; i < pleatPts.length; i++) {
      canopyStations.push({
        center: [pleatPts[i].x, pleatPts[i].y, 0],
        rx: 0.14,
        rz: canopyW / 2
      });
    }
    const canopySkin = createLoftedOrganMesh(canopyStations, 20, canopyBlueMat, true, true);
    hoodGroup.add(canopySkin);

    // Rear fabric drape hanging down at back
    const drapeGeo = new THREE.PlaneGeometry(canopyW * 0.95, 1.55);
    const drapeMesh = new THREE.Mesh(drapeGeo, canopyBlueMat);
    drapeMesh.position.set(-1.35, 0.35, 0);
    drapeMesh.rotation.y = -Math.PI / 2;
    hoodGroup.add(drapeMesh);

    // Metallic Scissor Struts on both sides (authentic folding scissors mechanism)
    [-canopyW / 2 - 0.08, canopyW / 2 + 0.08].forEach(sz => {
      // Pivot joint at base
      const pivotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.15, 10), strutMat);
      pivotBase.rotation.x = Math.PI / 2;
      pivotBase.position.set(-0.2, 0.1, sz);
      hoodGroup.add(pivotBase);

      // Scissor crossing bars
      const strut1 = createSplineTube([[-0.2, 0.1, sz], [0.8, 1.6, sz], [1.3, 2.2, sz]], 0.045, strutMat);
      hoodGroup.add(strut1);
      const strut2 = createSplineTube([[0.1, 0.4, sz], [-0.5, 1.5, sz], [-0.8, 2.2, sz]], 0.045, strutMat);
      hoodGroup.add(strut2);
      const strut3 = createSplineTube([[0.4, 0.9, sz], [0.9, 1.9, sz]], 0.045, strutMat);
      hoodGroup.add(strut3);
    });
    rickGroup.add(hoodGroup);

    // =========================================================================
    // 6. RICKSHAW PULLER (TRUE ADULT ANATOMICAL MODEL MATCHING REFERENCE ART)
    // =========================================================================
    const pullerGroup = new THREE.Group();

    // Puller Seated Torso & Dark Plum Shirt
    // Stations leaning forward ~24° towards handlebars
    const pullerTorsoStations = [
      { center: [-0.60, 5.25, 0], rx: 0.82, rz: 1.05 }, // Hem flared over pelvis
      { center: [-0.35, 5.75, 0], rx: 0.78, rz: 0.98 }, // Mid waist
      { center: [-0.05, 6.45, 0], rx: 0.86, rz: 1.15 }, // Chest & ribs
      { center: [0.35, 7.15, 0],  rx: 0.94, rz: 1.28 }, // Deltoid shoulders
      { center: [0.65, 7.55, 0],  rx: 0.65, rz: 0.85 }  // Neck base / Clavicle
    ];
    const pullerShirt = createLoftedOrganMesh(pullerTorsoStations, 24, pullerShirtMat, true, true);
    pullerGroup.add(pullerShirt);

    // Folded Shirt Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.10, 10, 20), pullerShirtMat);
    collar.position.set(0.68, 7.62, 0);
    collar.rotation.z = -0.38;
    pullerGroup.add(collar);

    // Puller Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.75, 14), pullerSkinMat);
    neck.position.set(0.78, 7.82, 0);
    neck.rotation.z = -0.25;
    pullerGroup.add(neck);

    // Puller Head (Scaled & Sculpted Adult Male with Mustache)
    const pullerHead = buildArtisticAdultHead(false, pullerSkinMat, hairMat);
    pullerHead.scale.setScalar(1.22);
    pullerHead.position.set(1.02, 8.55, 0);
    pullerHead.rotation.z = -0.08; // Looking forward
    pullerGroup.add(pullerHead);

    // Puller Arms (Left & Right) gripping handlebars
    [-1.05, 1.05].forEach(az => {
      // Deltoid sleeve cuff
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.35, 0.65, 12), pullerShirtMat);
      sleeve.position.set(0.45, 7.10, az * 1.15);
      sleeve.rotation.z = -0.65;
      sleeve.rotation.x = az > 0 ? 0.35 : -0.35;
      pullerGroup.add(sleeve);

      // Arm spline from shoulder to handlebar grip
      const gripTargetZ = az > 0 ? 1.25 : -1.25;
      const armPts = [
        [0.45, 7.05, az * 1.10],                       // Shoulder
        [1.85, 6.65, az * 1.05],                       // Bicep
        [3.15, 6.25, az * 0.95],                       // Bent Elbow
        [4.25, WHEEL_R + 4.55, gripTargetZ * 0.98],   // Forearm
        [FRONT_X - 1.25, WHEEL_R + 4.35, gripTargetZ]  // Hand at grip
      ];
      const armTube = createSplineTube(armPts, 0.20, pullerSkinMat, 20, 10);
      pullerGroup.add(armTube);

      // Closed sculpted hand with curled fingers around grip
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), pullerSkinMat);
      hand.scale.set(1.15, 0.85, 1.0);
      hand.position.set(FRONT_X - 1.25, WHEEL_R + 4.35, gripTargetZ);
      pullerGroup.add(hand);
    });

    // Puller Lungi (Traditional Dhaka *Mal-Kocha* Cycling Tuck)
    // Lofted Pelvic Lungi Wrap
    const lungiPelvisStations = [
      { center: [-0.60, 5.22, 0], rx: 0.84, rz: 1.06 },
      { center: [-0.55, 4.75, 0], rx: 0.88, rz: 1.10 },
      { center: [-0.40, 4.25, 0], rx: 0.86, rz: 1.05 }
    ];
    const lungiPelvis = createLoftedOrganMesh(lungiPelvisStations, 20, pullerLungiMat, true, true);
    pullerGroup.add(lungiPelvis);

    // Left Thigh Lungi Wrap (angled down & backward towards left pedal)
    const lThighLungiStations = [
      { center: [-0.35, 4.20, -0.42], rx: 0.52, rz: 0.48 },
      { center: [-0.15, 3.65, -0.46], rx: 0.48, rz: 0.45 },
      { center: [0.10, 3.10, -0.50],  rx: 0.44, rz: 0.40 } // Knee cuff
    ];
    const lThighLungi = createLoftedOrganMesh(lThighLungiStations, 16, pullerLungiMat, true, true);
    pullerGroup.add(lThighLungi);

    // Right Thigh Lungi Wrap (angled forward & up towards right pedal)
    const rThighLungiStations = [
      { center: [-0.35, 4.20, 0.42], rx: 0.52, rz: 0.48 },
      { center: [0.25, 4.05, 0.48],  rx: 0.50, rz: 0.46 },
      { center: [0.85, 3.75, 0.54],  rx: 0.45, rz: 0.42 } // Knee cuff
    ];
    const rThighLungi = createLoftedOrganMesh(rThighLungiStations, 16, pullerLungiMat, true, true);
    pullerGroup.add(rThighLungi);

    // Left Muscular Leg & Foot on Left Pedal
    const lLegPts = [
      [0.10, 3.10, -0.50],          // Knee
      [0.45, 2.35, -0.55],          // Calf muscle
      [lPedalX + 0.15, lPedalY + 0.55, lPedalZ], // Ankle
      [lPedalX, lPedalY + 0.12, lPedalZ]         // Foot on pedal
    ];
    const lLeg = createSplineTube(lLegPts, 0.19, pullerSkinMat, 16, 10);
    pullerGroup.add(lLeg);

    // Left Brown Leather Sandal on Pedal
    const lSandal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.28), pullerSandalMat);
    lSandal.position.set(lPedalX, lPedalY + 0.10, lPedalZ);
    lSandal.rotation.z = -0.12;
    pullerGroup.add(lSandal);

    // Right Muscular Leg & Foot on Right Pedal
    const rLegPts = [
      [0.85, 3.75, 0.54],          // Knee
      [1.35, 2.95, 0.58],          // Calf muscle
      [rPedalX - 0.15, rPedalY + 0.45, rPedalZ], // Ankle
      [rPedalX, rPedalY + 0.12, rPedalZ]         // Foot on pedal
    ];
    const rLeg = createSplineTube(rLegPts, 0.19, pullerSkinMat, 16, 10);
    pullerGroup.add(rLeg);

    // Right Brown Leather Sandal on Pedal
    const rSandal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.28), pullerSandalMat);
    rSandal.position.set(rPedalX, rPedalY + 0.10, rPedalZ);
    rSandal.rotation.z = 0.18;
    pullerGroup.add(rSandal);

    rickGroup.add(pullerGroup);

    // =========================================================================
    // 7. PASSENGERS (MATCHING REFERENCE ART)
    // =========================================================================
    const PASSENGER_SEAT_X = REAR_X + 0.25;
    const PASSENGER_SEAT_Y = WHEEL_R + 1.25;

    // A. FEMALE PASSENGER (NEAR SIDE: Z = +1.20)
    const femaleGroup = new THREE.Group();
    femaleGroup.position.set(PASSENGER_SEAT_X, PASSENGER_SEAT_Y, 1.20);

    // Female Torso in Saffron Saree Blouse
    const fTorsoStations = [
      { center: [-0.25, 0.2, 0], rx: 0.65, rz: 0.72 },
      { center: [-0.15, 0.8, 0], rx: 0.58, rz: 0.65 },
      { center: [-0.05, 1.4, 0], rx: 0.62, rz: 0.70 },
      { center: [0.02, 1.95, 0], rx: 0.52, rz: 0.60 }
    ];
    const fTorso = createLoftedOrganMesh(fTorsoStations, 20, femaleSareeMat, true, true);
    femaleGroup.add(fTorso);

    // Female Neck
    const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.55, 12), femaleSkinMat);
    fNeck.position.set(0.04, 2.15, 0);
    femaleGroup.add(fNeck);

    // Female Sculpted Head
    const fHead = buildArtisticAdultHead(true, femaleSkinMat, hairMat, {
      lipMat: new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 })
    });
    fHead.scale.setScalar(1.18);
    fHead.position.set(0.12, 2.82, 0);
    femaleGroup.add(fHead);

    // Saree Ghomta (Veil) draped over head and shoulders
    const ghomtaStations = [
      { center: [-0.35, 1.45, 0], rx: 0.95, rz: 1.10 }, // Draped on shoulders & back
      { center: [-0.25, 2.15, 0], rx: 0.88, rz: 0.98 },
      { center: [-0.05, 2.85, 0], rx: 0.84, rz: 0.92 }, // Framing crown of head
      { center: [0.05, 3.45, 0],  rx: 0.62, rz: 0.75 }  // Top crest
    ];
    const ghomta = createLoftedOrganMesh(ghomtaStations, 20, femaleSareeMat, true, true);
    femaleGroup.add(ghomta);

    // Female Lower Body: Sky-Blue Pleated Saree Skirt draped over lap to footboard
    const fSkirtStations = [
      { center: [-0.25, 0.20, 0], rx: 0.72, rz: 0.78 },
      { center: [0.45, 0.15, 0],  rx: 0.70, rz: 0.75 }, // Thighs on seat
      { center: [1.25, -0.25, 0], rx: 0.65, rz: 0.70 }, // Knees forward
      { center: [1.45, -0.85, 0], rx: 0.58, rz: 0.65 }  // Hem at footboard
    ];
    const fSkirt = createLoftedOrganMesh(fSkirtStations, 20, femaleSkirtMat, true, true);
    femaleGroup.add(fSkirt);

    // Female Delicate Arms with Hands Folded in Lap
    [-0.52, 0.52].forEach(az => {
      const fArmPts = [
        [0.0, 1.85, az],
        [0.55, 1.25, az * 0.9],
        [0.95, 0.45, az * 0.4],
        [1.15, 0.35, 0] // Hands together in lap
      ];
      const fArm = createSplineTube(fArmPts, 0.15, femaleSkinMat, 16, 8);
      femaleGroup.add(fArm);
    });

    // Female Pink Sandals on Footboard
    [-0.28, 0.28].forEach(sz => {
      const fSandal = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.10, 0.24), femaleSandalMat);
      fSandal.position.set(1.52, -1.02, sz);
      femaleGroup.add(fSandal);
    });

    rickGroup.add(femaleGroup);

    // B. MALE PASSENGER (FAR SIDE: Z = -1.20)
    const maleGroup = new THREE.Group();
    maleGroup.position.set(PASSENGER_SEAT_X, PASSENGER_SEAT_Y, -1.20);

    // Male Torso in Lavender/Purple Shirt
    const mTorsoStations = [
      { center: [-0.25, 0.2, 0], rx: 0.72, rz: 0.82 },
      { center: [-0.15, 0.8, 0], rx: 0.68, rz: 0.78 },
      { center: [-0.05, 1.4, 0], rx: 0.75, rz: 0.88 },
      { center: [0.05, 2.05, 0], rx: 0.62, rz: 0.72 }
    ];
    const mTorso = createLoftedOrganMesh(mTorsoStations, 20, maleShirtMat, true, true);
    maleGroup.add(mTorso);

    // Male Shirt Collar
    const mCollar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 16), maleShirtMat);
    mCollar.position.set(0.06, 2.05, 0);
    maleGroup.add(mCollar);

    // Male Neck
    const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.30, 0.55, 12), maleSkinMat);
    mNeck.position.set(0.06, 2.22, 0);
    maleGroup.add(mNeck);

    // Male Head
    const mHead = buildArtisticAdultHead(false, maleSkinMat, hairMat);
    mHead.scale.setScalar(1.22);
    mHead.position.set(0.12, 2.92, 0);
    maleGroup.add(mHead);

    // Male Lower Body in Blue Pants
    const mLegsStations = [
      { center: [-0.25, 0.20, 0], rx: 0.74, rz: 0.84 },
      { center: [0.55, 0.15, 0],  rx: 0.72, rz: 0.80 },
      { center: [1.35, -0.25, 0], rx: 0.68, rz: 0.75 },
      { center: [1.55, -0.85, 0], rx: 0.58, rz: 0.68 }
    ];
    const mLegs = createLoftedOrganMesh(mLegsStations, 20, malePantMat, true, true);
    maleGroup.add(mLegs);

    // Male Arms resting on Knees
    [-0.65, 0.65].forEach(az => {
      const mArmPts = [
        [0.02, 1.95, az],
        [0.65, 1.35, az],
        [1.15, 0.45, az * 0.85],
        [1.35, 0.15, az * 0.65] // Hands on knees
      ];
      const mArm = createSplineTube(mArmPts, 0.17, maleSkinMat, 16, 8);
      maleGroup.add(mArm);

      const mHand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), maleSkinMat);
      mHand.scale.set(1.2, 0.6, 1.0);
      mHand.position.set(1.35, 0.15, az * 0.65);
      maleGroup.add(mHand);
    });

    // Male Blue Sandals on Footboard
    [-0.32, 0.32].forEach(sz => {
      const mSandal = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 }));
      mSandal.position.set(1.62, -1.02, sz);
      maleGroup.add(mSandal);
    });

    rickGroup.add(maleGroup);

    return rickGroup;
  }

  const rickshaw = buildAuthenticDhakaRickshaw();
  scene.add(rickshaw);

  renderer.render(scene, camera);
  window.__RENDER_DONE__ = true;
</script>
</body>
</html>
"""

with open('scratch/test_artistic_rickshaw.html', 'w', encoding='utf-8') as f:
    f.write(html_template)

print('Wrote scratch/test_artistic_rickshaw.html')
