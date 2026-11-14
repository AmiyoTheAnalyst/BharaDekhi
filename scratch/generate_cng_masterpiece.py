import os

html_code = """<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Masterpiece Authentic Bangladeshi CNG Auto-Rickshaw</title>
  <style>
    body { margin: 0; background: #070b14; overflow: hidden; }
    #canvas-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id='canvas-container'></div>
  <script src='../assets/three.min.js'></script>
  <script>
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1220);

    const camera = new THREE.PerspectiveCamera(36, 1280 / 720, 0.1, 1000);
    camera.position.set(0.5, 7.5, 34.0);
    camera.lookAt(0.5, 6.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(1.5);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.15);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff7ed, 1.45);
    dir.position.set(16, 26, 20);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.75);
    fill.position.set(-18, 14, -14);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffedd5, 0.65);
    rim.position.set(-10, 16, 22);
    scene.add(rim);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(140, 140);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Road markings
    const lineGeo = new THREE.PlaneGeometry(140, 0.6);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.01, -12);
    scene.add(line);

    // =========================================================================
    // PROCEDURAL TEXTURE GENERATORS
    // =========================================================================
    function getCNGLiveryTexture(isLeft) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Emerald green base
      ctx.fillStyle = '#00a65a';
      ctx.fillRect(0, 0, 1024, 512);

      // Subtle metallic highlight sheen
      const grad = ctx.createLinearGradient(0, 0, 1024, 512);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.04)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Yellow dashed perimeter stitching
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 7;
      ctx.setLineDash([16, 12]);
      ctx.strokeRect(24, 24, 976, 464);

      // Arched wheel cutout stitching guide
      ctx.beginPath();
      ctx.arc(512, 512, 280, Math.PI, 0, false);
      ctx.stroke();

      // Slanted banners
      ctx.save();
      const slantAngle = isLeft ? -0.06 : 0.06;
      ctx.translate(isLeft ? 512 : 512, 160);
      ctx.rotate(slantAngle);

      // Upper Banner: White strip with ★ FOR HIRE ★
      const bW = 620;
      const bH = 82;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bW / 2, -bH / 2, bW, bH);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#dc2626';
      ctx.setLineDash([]);
      ctx.strokeRect(-bW / 2, -bH / 2, bW, bH);

      ctx.fillStyle = '#dc2626';
      ctx.font = '900 46px "Arial Black", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ FOR HIRE ★', 0, 2);

      // Lower Banner: Bright Neon-Yellow strip with ONE PARIBAHAN
      ctx.translate(0, 96);
      const b2W = 600;
      const b2H = 76;
      ctx.fillStyle = '#d4ff00';
      ctx.fillRect(-b2W / 2, -b2H / 2, b2W, b2H);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#b91c1c';
      ctx.strokeRect(-b2W / 2, -b2H / 2, b2W, b2H);

      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 44px "Arial Black", "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ONE PARIBAHAN', 0, 2);

      ctx.restore();

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      return tex;
    }

    function getCNGFrontNoseTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Emerald green
      ctx.fillStyle = '#00a65a';
      ctx.fillRect(0, 0, 512, 512);

      // Yellow dashed border stitching
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 8;
      ctx.setLineDash([18, 12]);
      ctx.strokeRect(20, 20, 472, 472);

      // Horizontal Tricolor Band (Middle): Red, Blue, Yellow stripes
      const bandY = 240;
      const bandH = 34;

      // Yellow decorative dots on top of band
      ctx.fillStyle = '#facc15';
      const numDots = 14;
      for (let i = 0; i < numDots; i++) {
        const dx = 50 + (i * (512 - 100) / (numDots - 1));
        ctx.beginPath();
        ctx.arc(dx, bandY - 20, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. Red Stripe
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(30, bandY, 452, bandH);

      // 2. Royal Blue Stripe
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(30, bandY + bandH, 452, bandH);

      // 3. Bright Yellow Stripe
      ctx.fillStyle = '#facc15';
      ctx.fillRect(30, bandY + bandH * 2, 452, bandH);

      // Thin white separation pinstripes
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.strokeRect(30, bandY, 452, bandH * 3);

      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      return tex;
    }

    function getCNGGarlandTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, 1024, 128);

      // Traditional Bangladeshi orange & gold scalloped garlands
      const scallops = 16;
      const sW = 1024 / scallops;
      for (let i = 0; i < scallops; i++) {
        const cx = i * sW + sW / 2;
        // Outer orange scallop
        ctx.beginPath();
        ctx.arc(cx, 20, sW / 2, 0, Math.PI, false);
        ctx.fillStyle = '#ea580c';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#facc15';
        ctx.stroke();

        // Inner gold scallop
        ctx.beginPath();
        ctx.arc(cx, 20, sW / 3, 0, Math.PI, false);
        ctx.fillStyle = '#facc15';
        ctx.fill();

        // Little red floral dot in center
        ctx.beginPath();
        ctx.arc(cx, 48, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(2, 1);
      return tex;
    }

    // =========================================================================
    // HELPER BUILDERS: Human Anatomy & Limbs
    // =========================================================================
    function createContinuousSplineLimb(pts, radii, material, tubSteps = 16, radSteps = 10) {
      const curvePts = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(curvePts);
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const normals = [];
      const uvs = [];
      const indices = [];

      const frames = curve.computeFrenetFrames(tubSteps, false);

      for (let i = 0; i <= tubSteps; i++) {
        const u = i / tubSteps;
        const pt = curve.getPoint(u);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        const segIdx = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
        const segFrac = (u * (pts.length - 1)) - segIdx;
        const r0 = Array.isArray(radii) ? radii[segIdx] : radii;
        const r1 = Array.isArray(radii) ? radii[segIdx + 1] : radii;
        const r = r0 + (r1 - r0) * segFrac;

        for (let j = 0; j <= radSteps; j++) {
          const v = j / radSteps;
          const theta = v * Math.PI * 2;
          const sin = Math.sin(theta);
          const cos = -Math.cos(theta);

          const normal = new THREE.Vector3()
            .addScaledVector(N, cos)
            .addScaledVector(B, sin)
            .normalize();

          const vertex = new THREE.Vector3().copy(pt).addScaledVector(normal, r);

          positions.push(vertex.x, vertex.y, vertex.z);
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(u, v);
        }
      }

      for (let i = 0; i < tubSteps; i++) {
        for (let j = 0; j < radSteps; j++) {
          const a = i * (radSteps + 1) + j;
          const b = (i + 1) * (radSteps + 1) + j;
          const c = (i + 1) * (radSteps + 1) + (j + 1);
          const d = i * (radSteps + 1) + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      return mesh;
    }

    function buildRealisticAdultHead(skinMat, hairMat, isFemale, mustache) {
      const headGroup = new THREE.Group();

      const craniumGeo = new THREE.SphereGeometry(0.56, 20, 18);
      craniumGeo.scale(0.85, 1.08, 0.90);
      const cranium = new THREE.Mesh(craniumGeo, skinMat);
      cranium.castShadow = true;
      headGroup.add(cranium);

      const hairGeo = new THREE.SphereGeometry(0.58, 20, 18);
      hairGeo.scale(0.87, 1.10, 0.92);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(-0.06, 0.06, 0);
      headGroup.add(hair);

      [-0.50, 0.50].forEach(ez => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
        ear.scale.set(0.35, 0.75, 0.45);
        ear.position.set(-0.02, -0.04, ez);
        headGroup.add(ear);
      });

      const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.26, 8), skinMat);
      noseBridge.rotation.z = -Math.PI / 2 + 0.18;
      noseBridge.position.set(0.50, 0.02, 0);
      headGroup.add(noseBridge);

      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.050, 8, 8), skinMat);
      noseTip.position.set(0.56, -0.04, 0);
      headGroup.add(noseTip);

      [-0.07, 0.07].forEach(nz => {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 6), skinMat);
        nostril.position.set(0.52, -0.06, nz);
        headGroup.add(nostril);
      });

      [-0.20, 0.20].forEach(ez => {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        eyeWhite.scale.set(0.65, 0.85, 1.30);
        eyeWhite.position.set(0.48, 0.08, ez);
        headGroup.add(eyeWhite);

        const eyeLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.09), hairMat);
        eyeLine.position.set(0.50, 0.08, ez);
        headGroup.add(eyeLine);

        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.038, 0.17), hairMat);
        brow.position.set(0.46, 0.18, ez);
        brow.rotation.z = -0.15;
        headGroup.add(brow);
      });

      const lipMat = isFemale
        ? new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 })
        : new THREE.MeshStandardMaterial({ color: 0x8a4734, roughness: 0.6 });
      const lips = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.046, 0.17), lipMat);
      lips.position.set(0.50, -0.18, 0);
      headGroup.add(lips);

      if (mustache) {
        const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.40, 8), hairMat);
        stache.rotation.x = Math.PI / 2;
        stache.position.set(0.53, -0.11, 0);
        headGroup.add(stache);
      }

      if (isFemale) {
        const bindiMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
        const bindi = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), bindiMat);
        bindi.rotation.z = Math.PI / 2;
        bindi.position.set(0.53, 0.15, 0);
        headGroup.add(bindi);

        const khopa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), hairMat);
        khopa.scale.set(0.8, 1.0, 1.1);
        khopa.position.set(-0.52, -0.12, 0);
        headGroup.add(khopa);
      }

      headGroup.scale.setScalar(1.25);
      return headGroup;
    }

    // =========================================================================
    // MASTERPIECE BANGLADESHI CNG AUTO-RICKSHAW FACTORY
    // =========================================================================
    function createAuthenticBangladeshiCNG() {
      const cngGroup = new THREE.Group();
      cngGroup.userData.wheels = [];
      cngGroup.userData.wheelRadius = 2.85;

      // Materials
      const cngGreenMat = new THREE.MeshStandardMaterial({
        color: 0x00a65a,
        roughness: 0.32,
        metalness: 0.22
      });

      const chassisMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.85,
        metalness: 0.4
      });

      const softTopMat = new THREE.MeshStandardMaterial({
        color: 0x1d3549,
        roughness: 0.85
      });

      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.15,
        metalness: 0.92
      });

      const rubberTireMat = new THREE.MeshStandardMaterial({
        color: 0x2d2926,
        roughness: 0.92
      });

      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.7
      });

      const yellowStudMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.3,
        metalness: 0.1
      });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xdcfce7,
        transparent: true,
        opacity: 0.48,
        roughness: 0.08,
        transmission: 0.88,
        ior: 1.52,
        reflectivity: 0.6
      });

      const garlandMat = new THREE.MeshStandardMaterial({
        map: getCNGGarlandTexture(),
        transparent: true,
        roughness: 0.4
      });

      const leftLiveryMat = new THREE.MeshStandardMaterial({
        map: getCNGLiveryTexture(true),
        roughness: 0.35,
        metalness: 0.15
      });

      const rightLiveryMat = new THREE.MeshStandardMaterial({
        map: getCNGLiveryTexture(false),
        roughness: 0.35,
        metalness: 0.15
      });

      const frontNoseMat = new THREE.MeshStandardMaterial({
        map: getCNGFrontNoseTexture(),
        roughness: 0.35,
        metalness: 0.15
      });

      // -----------------------------------------------------------------------
      // 1. WHEELS (1 Front + 2 Rear)
      // -----------------------------------------------------------------------
      const wheelRadius = 2.85;
      const frontAxleX = 9.80;
      const rearAxleX = -7.40;
      const rearTrackHalfW = 6.90;

      function buildCNGWheel(pos) {
        const w = new THREE.Group();
        w.position.set(pos[0], pos[1], pos[2]);

        // Rubber tire
        const tire = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius - 0.75, 0.75, 14, 30), rubberTireMat);
        tire.castShadow = true;
        w.add(tire);

        // Dark circular center rim
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.10, 2.10, 1.25, 20), rimMat);
        rim.rotation.x = Math.PI / 2;
        w.add(rim);

        // Circular black center hub cap
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.35, 16), chassisMat);
        hub.rotation.x = Math.PI / 2;
        w.add(hub);

        // Ring of 6 bright yellow studs/dots
        const numStuds = 6;
        for (let i = 0; i < numStuds; i++) {
          const angle = (i * Math.PI * 2) / numStuds;
          const studR = 1.45;
          const studL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), yellowStudMat);
          studL.position.set(Math.cos(angle) * studR, Math.sin(angle) * studR, 0.65);
          w.add(studL);

          const studRMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), yellowStudMat);
          studRMesh.position.set(Math.cos(angle) * studR, Math.sin(angle) * studR, -0.65);
          w.add(studRMesh);
        }

        cngGroup.userData.wheels.push(w);
        return w;
      }

      const frontWheel = buildCNGWheel([frontAxleX, wheelRadius, 0]);
      cngGroup.add(frontWheel);

      const rearWheelL = buildCNGWheel([rearAxleX, wheelRadius, -rearTrackHalfW]);
      cngGroup.add(rearWheelL);

      const rearWheelR = buildCNGWheel([rearAxleX, wheelRadius, rearTrackHalfW]);
      cngGroup.add(rearWheelR);

      // -----------------------------------------------------------------------
      // 2. LOWER CHASSIS & FLOOR PAN
      // -----------------------------------------------------------------------
      // Main floor pan spanning passenger and driver cabin
      const floorPan = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.45, 13.8), chassisMat);
      floorPan.position.set(-4.3, 2.60, 0);
      cngGroup.add(floorPan);

      // Tapered driver floor extension
      const frontFloor = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.45, 10.6), chassisMat);
      frontFloor.position.set(6.8, 2.60, 0);
      cngGroup.add(frontFloor);

      // Yellow step sill borders on left and right open doorways
      [-6.95, 6.95].forEach(sz => {
        const sill = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.18, 0.35), yellowStudMat);
        sill.position.set(-0.5, 2.85, sz);
        cngGroup.add(sill);

        // Lower chassis guard rail
        const rail = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.25, 0.25), chassisMat);
        rail.position.set(-1.0, 2.15, sz);
        cngGroup.add(rail);
      });

      // Rear bumper
      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 14.4), chassisMat);
      rearBumper.position.set(-14.1, 2.65, 0);
      cngGroup.add(rearBumper);

      // -----------------------------------------------------------------------
      // 3. REAR QUARTER PANELS (SOLID GREEN WITH FOR HIRE & ONE PARIBAHAN BANNERS)
      // -----------------------------------------------------------------------
      // Panels span from X = -13.8 to X = -4.5 (length 9.3), height Y = 2.8 to 8.8 (height 6.0)
      const panelLen = 9.3;
      const panelH = 6.0;
      const panelMidX = -9.15;
      const panelMidY = 5.80;

      // Left Quarter Panel (Z = -6.95)
      const leftPanelGeo = new THREE.PlaneGeometry(panelLen, panelH);
      const leftPanel = new THREE.Mesh(leftPanelGeo, leftLiveryMat);
      leftPanel.position.set(panelMidX, panelMidY, -6.96);
      leftPanel.rotation.y = Math.PI; // Face outward (-Z)
      cngGroup.add(leftPanel);

      // Left inner wall (green)
      const leftInner = new THREE.Mesh(new THREE.PlaneGeometry(panelLen, panelH), cngGreenMat);
      leftInner.position.set(panelMidX, panelMidY, -6.94);
      cngGroup.add(leftInner);

      // Right Quarter Panel (Z = +6.95)
      const rightPanelGeo = new THREE.PlaneGeometry(panelLen, panelH);
      const rightPanel = new THREE.Mesh(rightPanelGeo, rightLiveryMat);
      rightPanel.position.set(panelMidX, panelMidY, 6.96);
      cngGroup.add(rightPanel);

      // Right inner wall (green)
      const rightInner = new THREE.Mesh(new THREE.PlaneGeometry(panelLen, panelH), cngGreenMat);
      rightInner.position.set(panelMidX, panelMidY, 6.94);
      rightInner.rotation.y = Math.PI;
      cngGroup.add(rightInner);

      // Wheel-arch cutouts: green fender skirts over the rear wheels
      [-6.95, 6.95].forEach(sz => {
        const archGeo = new THREE.TorusGeometry(3.6, 0.35, 10, 24, Math.PI);
        const archMesh = new THREE.Mesh(archGeo, cngGreenMat);
        archMesh.position.set(rearAxleX, wheelRadius, sz);
        archMesh.rotation.y = sz > 0 ? 0 : Math.PI;
        cngGroup.add(archMesh);

        // Small black fuel cap near top-rear corner
        const fuelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.15, 16), chassisMat);
        fuelCap.rotation.x = Math.PI / 2;
        fuelCap.position.set(-12.4, 7.8, sz + (sz > 0 ? 0.08 : -0.08));
        cngGroup.add(fuelCap);
      });

      // Solid Rear Wall (X = -13.8)
      const rearWallGeo = new THREE.BoxGeometry(0.45, 6.2, 13.8);
      const rearWall = new THREE.Mesh(rearWallGeo, cngGreenMat);
      rearWall.position.set(-13.8, 5.85, 0);
      cngGroup.add(rearWall);

      // Tail lights on rear wall
      [-5.2, 5.2].forEach(tz => {
        // Red brake light
        const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 1.2), new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          emissive: 0x991b1b,
          emissiveIntensity: 0.6
        }));
        rLight.position.set(-14.05, 5.8, tz);
        cngGroup.add(rLight);

        // Amber turn signal
        const aLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.8), new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xb45309,
          emissiveIntensity: 0.5
        }));
        aLight.position.set(-14.05, 5.2, tz);
        cngGroup.add(aLight);
      });

      // Rear number plate (Dhaka Metro license)
      const plateGeo = new THREE.BoxGeometry(0.12, 1.2, 3.6);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x047857 });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(-14.05, 4.2, 0);
      cngGroup.add(plate);

      // -----------------------------------------------------------------------
      // 4. CENTRAL B-PILLAR & OPEN DOORLESS COMPARTMENTS (ZERO DOORS / ZERO BARS)
      // -----------------------------------------------------------------------
      // Vertical B-Pillars separating Driver and Passenger cabins at X = 0
      [-6.95, 6.95].forEach(sz => {
        const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 9.8, 0.45), cngGreenMat);
        bPillar.position.set(0, 7.6, sz);
        cngGroup.add(bPillar);

        // Yellow dashed accent strip on B-pillar
        const bAccent = new THREE.Mesh(new THREE.BoxGeometry(0.67, 9.2, 0.12), yellowStudMat);
        bAccent.position.set(0, 7.6, sz + (sz > 0 ? 0.20 : -0.20));
        cngGroup.add(bAccent);
      });

      // Horizontal roof rail connecting A-pillar, B-pillar, and rear panel along doorway top
      [-6.95, 6.95].forEach(sz => {
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.45, 0.45), cngGreenMat);
        topRail.position.set(-2.5, 12.35, sz);
        cngGroup.add(topRail);
      });

      // FESTIVE BUNTING FLAGS: Strung along the top of both open doorways!
      [-6.95, 6.95].forEach(sz => {
        const flagColors = [0xef4444, 0xfacc15, 0x22c55e, 0x3b82f6, 0xf97316];
        const numFlags = 18;
        const spanStart = -11.0;
        const spanEnd = 4.2;
        const flagStep = (spanEnd - spanStart) / (numFlags - 1);

        for (let f = 0; f < numFlags; f++) {
          const fx = spanStart + f * flagStep;
          const fColor = flagColors[f % flagColors.length];
          const flagMat = new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.5, side: THREE.DoubleSide });

          // Hanging triangular bunting flag
          const triShape = new THREE.Shape();
          triShape.moveTo(-0.25, 0);
          triShape.lineTo(0.25, 0);
          triShape.lineTo(0, -0.65);
          triShape.closePath();

          const triGeo = new THREE.ShapeGeometry(triShape);
          const triMesh = new THREE.Mesh(triGeo, flagMat);
          triMesh.position.set(fx, 12.15, sz + (sz > 0 ? 0.05 : -0.05));
          if (sz < 0) triMesh.rotation.y = Math.PI;
          cngGroup.add(triMesh);
        }
      });

      // -----------------------------------------------------------------------
      // 5. FRONT NOSE, COWL & WINDSHIELD (AERODYNAMIC ~65° SLOPE)
      // -----------------------------------------------------------------------
      // Front Cowl: Streamlined green shell extending from firewall X = 4.8 to front nose X = 10.8
      // Width tapers from 10.8 (Z = ±5.4) at firewall to 5.2 (Z = ±2.6) at front nose
      const noseShape = new THREE.Shape();
      noseShape.moveTo(4.8, 2.6);
      noseShape.lineTo(10.8, 3.4);
      noseShape.lineTo(10.8, 4.4);
      noseShape.lineTo(4.8, 7.6);
      noseShape.closePath();

      // Side cheeks of the cowl
      [-1, 1].forEach(side => {
        const cheekPts = [
          [4.8, 2.6, side * 5.4],
          [10.8, 3.4, side * 2.6],
          [10.8, 4.4, side * 2.6],
          [4.8, 7.6, side * 5.4]
        ];
        const cheekGeom = new THREE.BufferGeometry();
        const verts = new Float32Array([
          cheekPts[0][0], cheekPts[0][1], cheekPts[0][2],
          cheekPts[1][0], cheekPts[1][1], cheekPts[1][2],
          cheekPts[2][0], cheekPts[2][1], cheekPts[2][2],

          cheekPts[0][0], cheekPts[0][1], cheekPts[0][2],
          cheekPts[2][0], cheekPts[2][1], cheekPts[2][2],
          cheekPts[3][0], cheekPts[3][1], cheekPts[3][2]
        ]);
        cheekGeom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        cheekGeom.computeVertexNormals();
        const cheekMesh = new THREE.Mesh(cheekGeom, cngGreenMat);
        cngGroup.add(cheekMesh);
      });

      // Sloped front hood surface carrying the TRICOLOR BAND & STITCHING
      // Top hood runs from (X=4.8, Y=7.6) down to (X=10.8, Y=4.4)
      const hoodLen = Math.hypot(10.8 - 4.8, 4.4 - 7.6); // ~6.8
      const hoodAngle = Math.atan2(4.4 - 7.6, 10.8 - 4.8); // ~ -28 deg (slope ~62° from vertical)
      const hoodGeo = new THREE.PlaneGeometry(hoodLen, 8.2);
      const hoodMesh = new THREE.Mesh(hoodGeo, frontNoseMat);
      hoodMesh.position.set((4.8 + 10.8) / 2, (7.6 + 4.4) / 2, 0);
      hoodMesh.rotation.y = Math.PI / 2;
      hoodMesh.rotation.x = -hoodAngle;
      cngGroup.add(hoodMesh);

      // Lower front nose apron (under the hood slope, down to front bumper)
      const frontApron = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.6, 5.4), cngGreenMat);
      frontApron.position.set(10.8, 3.8, 0);
      cngGroup.add(frontApron);

      // FRONT MUDGUARD / FENDER: Curved emerald-green mudguard over front wheel
      const fFenderGeo = new THREE.TorusGeometry(3.35, 0.42, 12, 24, Math.PI * 0.72);
      const fFender = new THREE.Mesh(fFenderGeo, cngGreenMat);
      fFender.position.set(frontAxleX, wheelRadius, 0);
      fFender.rotation.y = Math.PI / 2;
      fFender.rotation.z = Math.PI * 0.18;
      cngGroup.add(fFender);

      // Yellow stitching ring on front mudguard rim
      const fStitchGeo = new THREE.TorusGeometry(3.45, 0.08, 8, 24, Math.PI * 0.72);
      const fStitch = new THREE.Mesh(fStitchGeo, yellowStudMat);
      fStitch.position.set(frontAxleX, wheelRadius, 0);
      fStitch.rotation.y = Math.PI / 2;
      fStitch.rotation.z = Math.PI * 0.18;
      cngGroup.add(fStitch);

      // POD HEADLIGHT: Sculpted green teardrop housing with glowing warm lens
      const podHousing = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 16), cngGreenMat);
      podHousing.rotation.z = -Math.PI / 2;
      podHousing.position.set(10.8, 4.6, 0);
      cngGroup.add(podHousing);

      const podBezel = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.12, 10, 24), chromeMat);
      podBezel.position.set(11.6, 4.6, 0);
      podBezel.rotation.y = Math.PI / 2;
      cngGroup.add(podBezel);

      const podLens = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 16), new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xffdf80,
        emissiveIntensity: 0.90,
        roughness: 0.1
      }));
      podLens.scale.set(0.35, 1.0, 1.0);
      podLens.position.set(11.62, 4.6, 0);
      cngGroup.add(podLens);

      // WINDSHIELD & A-PILLARS:
      // Slopes backward from cowl brow (X=4.6, Y=7.6) up to roof brow (X=1.0, Y=12.4)
      const windLen = Math.hypot(4.6 - 1.0, 12.4 - 7.6); // ~6.0
      const windAngle = Math.atan2(12.4 - 7.6, 1.0 - 4.6); // ~127 deg
      const windMidX = (4.6 + 1.0) / 2;
      const windMidY = (7.6 + 12.4) / 2;

      // Curved / Planar glass windshield
      const glassGeo = new THREE.PlaneGeometry(10.2, windLen - 0.4);
      const glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(windMidX, windMidY, 0);
      glassMesh.rotation.y = Math.PI / 2;
      glassMesh.rotation.x = Math.PI / 2 - Math.atan2(12.4 - 7.6, 4.6 - 1.0);
      cngGroup.add(glassMesh);

      // Black rubber weatherstrip frame around glass
      const glassFrame = new THREE.Mesh(new THREE.BoxGeometry(0.25, windLen, 10.6), chassisMat);
      glassFrame.position.copy(glassMesh.position);
      glassFrame.rotation.copy(glassMesh.rotation);
      glassFrame.scale.set(1, 1.02, 1.02);
      cngGroup.add(glassFrame);

      // Green A-Pillars on left and right
      [-5.3, 5.3].forEach(az => {
        const aPillarPts = [[4.6, 7.6, az], [1.0, 12.4, az]];
        cngGroup.add(createContinuousSplineLimb(aPillarPts, [0.32, 0.28], cngGreenMat, 8, 8));

        // Side rearview mirrors mounted on A-pillars
        const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), chromeMat);
        mirrorArm.position.set(3.2, 9.6, az + (az > 0 ? 0.45 : -0.45));
        mirrorArm.rotation.z = Math.PI / 2;
        cngGroup.add(mirrorArm);

        const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.8), chassisMat);
        mirrorHousing.position.set(3.2, 9.6, az + (az > 0 ? 0.95 : -0.95));
        cngGroup.add(mirrorHousing);

        const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), chromeMat);
        mirrorGlass.position.set(3.02, 9.6, az + (az > 0 ? 0.95 : -0.95));
        mirrorGlass.rotation.y = -Math.PI / 2;
        cngGroup.add(mirrorGlass);
      });

      // Windshield Wiper Arm on glass
      const wiperBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8), chassisMat);
      wiperBase.position.set(4.3, 7.9, 0);
      cngGroup.add(wiperBase);

      const wiperPts = [[4.3, 7.9, 0], [2.8, 10.6, 1.2]];
      cngGroup.add(createContinuousSplineLimb(wiperPts, [0.08, 0.06], chassisMat, 6, 6));

      const wiperBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 0.15), chassisMat);
      wiperBlade.position.set(2.8, 10.6, 1.2);
      wiperBlade.rotation.z = -0.42;
      cngGroup.add(wiperBlade);

      // -----------------------------------------------------------------------
      // 6. FITTED DARK SLATE-BLUE CANVAS SOFT-TOP HOOD (#1d3549)
      // -----------------------------------------------------------------------
      // Contoured canvas soft-top arches smoothly from roof brow X = 1.0 back to X = -13.8
      // Width = 14.2 (matching body width), smoothly arched over compartments
      const roofCurvePts = [
        [1.0, 12.4, 0],
        [-1.5, 13.8, 0],
        [-6.5, 14.1, 0],
        [-11.5, 13.6, 0],
        [-13.8, 11.2, 0],
        [-13.8, 8.8, 0]
      ];
      const roofCurve = new THREE.CatmullRomCurve3(roofCurvePts.map(p => new THREE.Vector3(p[0], p[1], p[2])));

      const roofSteps = 24;
      const roofWSteps = 16;
      const roofGeo = new THREE.BufferGeometry();
      const roofPos = [];
      const roofNorm = [];
      const roofUvs = [];
      const roofIdx = [];

      const halfW = 7.1;

      for (let i = 0; i <= roofSteps; i++) {
        const u = i / roofSteps;
        const centerPt = roofCurve.getPoint(u);
        const tan = roofCurve.getTangent(u);

        // Smooth arch curvature across width Z
        for (let j = 0; j <= roofWSteps; j++) {
          const v = j / roofWSteps;
          const z = -halfW + v * (halfW * 2);
          const archDrop = Math.cos((v - 0.5) * Math.PI) * 0.95;
          const y = centerPt.y + archDrop;
          const x = centerPt.x;

          roofPos.push(x, y, z);
          // Simplified upward/outward normal
          roofNorm.push(tan.y * 0.3, 0.95, (v - 0.5) * 0.4);
          roofUvs.push(u * 3, v);
        }
      }

      for (let i = 0; i < roofSteps; i++) {
        for (let j = 0; j < roofWSteps; j++) {
          const a = i * (roofWSteps + 1) + j;
          const b = (i + 1) * (roofWSteps + 1) + j;
          const c = (i + 1) * (roofWSteps + 1) + (j + 1);
          const d = i * (roofWSteps + 1) + (j + 1);
          roofIdx.push(a, b, d);
          roofIdx.push(b, c, d);
        }
      }

      roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
      roofGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roofNorm, 3));
      roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roofUvs, 2));
      roofGeo.setIndex(roofIdx);
      roofGeo.computeVertexNormals();

      const roofMesh = new THREE.Mesh(roofGeo, softTopMat);
      roofMesh.castShadow = true;
      cngGroup.add(roofMesh);

      // Rear Canvas Curtain with small oval rear window
      const rearCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 13.8), softTopMat);
      rearCurtain.position.set(-13.8, 10.6, 0);
      cngGroup.add(rearCurtain);

      // Oval rear window
      const rearWin = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 16), glassMat);
      rearWin.scale.set(1.8, 1.0, 0.7);
      rearWin.rotation.z = Math.PI / 2;
      rearWin.position.set(-13.8, 11.2, 0);
      cngGroup.add(rearWin);

      // SCALLOPED FLORAL GARLANDS ALONG ROOF SEAMS & REAR BOTTOM BORDER
      [-7.12, 7.12].forEach(sz => {
        const sideGarland = new THREE.Mesh(new THREE.PlaneGeometry(16.5, 1.2), garlandMat);
        sideGarland.position.set(-3.5, 12.8, sz);
        if (sz < 0) sideGarland.rotation.y = Math.PI;
        cngGroup.add(sideGarland);
      });

      const rearGarland = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 1.2), garlandMat);
      rearGarland.position.set(-13.98, 8.8, 0);
      rearGarland.rotation.y = -Math.PI / 2;
      cngGroup.add(rearGarland);

      // -----------------------------------------------------------------------
      // 7. INTERIOR SEATING & STEERING CONTROLS
      // -----------------------------------------------------------------------
      // Driver Seat
      const driverSeatBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 3.2), chassisMat);
      driverSeatBase.position.set(2.0, 3.7, 0);
      cngGroup.add(driverSeatBase);

      const driverCushion = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 3.4), new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.8
      }));
      driverCushion.position.set(2.0, 4.8, 0);
      cngGroup.add(driverCushion);

      // Steering Handlebars & Column
      const steerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), chassisMat);
      steerColumn.rotation.z = -0.45;
      steerColumn.position.set(4.4, 5.2, 0);
      cngGroup.add(steerColumn);

      // Horizontal black handlebars
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.8, 12), chassisMat);
      hBar.rotation.x = Math.PI / 2;
      hBar.position.set(5.2, 6.7, 0);
      cngGroup.add(hBar);

      // Left and right rubber grips
      [-1.8, 1.8].forEach(gz => {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 10), rubberTireMat);
        grip.rotation.x = Math.PI / 2;
        grip.position.set(5.2, 6.7, gz);
        cngGroup.add(grip);
      });

      // Rear Passenger Bench Seat
      const benchBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 13.0), chassisMat);
      benchBase.position.set(-7.5, 3.7, 0);
      cngGroup.add(benchBase);

      const benchCushion = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.7, 13.2), new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.82
      }));
      benchCushion.position.set(-7.5, 4.85, 0);
      cngGroup.add(benchCushion);

      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 13.2), new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.82
      }));
      backrest.position.set(-9.4, 7.2, 0);
      cngGroup.add(backrest);

      // -----------------------------------------------------------------------
      // 8. 3D ANATOMICAL DRIVER & PASSENGERS
      // -----------------------------------------------------------------------
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
      const femaleSkinMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.62 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });

      // DRIVER: Seated at X = 2.0, Y = 4.8, Z = 0
      const driverGroup = new THREE.Group();
      driverGroup.position.set(2.0, 4.8, 0);

      const driverShirtMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.72 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

      // Torso
      const dTorsoPts = [
        [0.0, 0.2, 0],
        [0.15, 1.2, 0],
        [0.35, 2.4, 0]
      ];
      driverGroup.add(createContinuousSplineLimb(dTorsoPts, [0.85, 0.95, 0.90], driverShirtMat, 10, 10));

      // Collar & Clavicle bridge
      const dCollar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 16), driverShirtMat);
      dCollar.position.set(0.40, 2.45, 0);
      dCollar.rotation.x = Math.PI / 2;
      driverGroup.add(dCollar);

      // Neck
      const dNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 10), skinMat);
      dNeck.position.set(0.40, 2.65, 0);
      driverGroup.add(dNeck);

      // Head
      const dHead = buildRealisticAdultHead(skinMat, hairMat, false, true);
      dHead.position.set(0.42, 3.45, 0);
      driverGroup.add(dHead);

      // Driver Arms gripping the handlebars
      [-1.3, 1.3].forEach(az => {
        // Shoulder cap
        const sCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), driverShirtMat);
        sCap.position.set(0.35, 2.30, az * 0.95);
        driverGroup.add(sCap);

        // Upper arm & forearm to handlebars (X = 5.2, Y = 6.7, Z = ±1.8)
        // Local relative: X = 3.2, Y = 1.9, Z = ±1.8
        const armPts = [
          [0.35, 2.30, az * 0.95],
          [1.60, 1.80, az * 1.35],
          [3.10, 1.90, az * 1.38]
        ];
        driverGroup.add(createContinuousSplineLimb(armPts, [0.26, 0.22, 0.18], driverShirtMat, 10, 8));

        // Hand closed around grip
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 8), skinMat);
        hand.scale.set(1.2, 0.8, 0.8);
        hand.position.set(3.18, 1.90, az * 1.38);
        driverGroup.add(hand);
      });

      // Driver Seated Thighs
      [-0.65, 0.65].forEach(lz => {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.8, 10), pantsMat);
        thigh.rotation.z = Math.PI / 2 - 0.2;
        thigh.position.set(1.0, 0.1, lz);
        driverGroup.add(thigh);

        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.9, 10), pantsMat);
        shin.position.set(1.85, -0.9, lz);
        driverGroup.add(shin);

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.45), chassisMat);
        shoe.position.set(2.1, -1.9, lz);
        driverGroup.add(shoe);
      });

      cngGroup.add(driverGroup);

      // --- PASSENGERS (REAR BENCH AT X = -7.5, Y = 4.85) ---
      // Male Passenger (Left: Z = -3.2)
      const maleGroup = new THREE.Group();
      maleGroup.position.set(-7.5, 4.85, -3.2);

      const maleShirtMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.75 }); // Burgundy

      const mTorsoPts = [
        [0.0, 0.2, 0],
        [0.05, 1.2, 0],
        [0.10, 2.4, 0]
      ];
      maleGroup.add(createContinuousSplineLimb(mTorsoPts, [0.82, 0.90, 0.86], maleShirtMat, 10, 10));

      const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 10), skinMat);
      mNeck.position.set(0.12, 2.65, 0);
      maleGroup.add(mNeck);

      const mHead = buildRealisticAdultHead(skinMat, hairMat, false, true);
      mHead.position.set(0.14, 3.45, 0);
      maleGroup.add(mHead);

      // Male Arms resting on knees
      [-0.95, 0.95].forEach(az => {
        const mArmPts = [
          [0.10, 2.30, az],
          [0.90, 1.40, az * 0.95],
          [1.80, 0.60, az * 0.55]
        ];
        maleGroup.add(createContinuousSplineLimb(mArmPts, [0.24, 0.20, 0.16], maleShirtMat, 10, 8));

        const mHand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skinMat);
        mHand.position.set(1.90, 0.55, az * 0.55);
        maleGroup.add(mHand);
      });

      // Seated legs
      [-0.55, 0.55].forEach(lz => {
        const mThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.40, 1.8, 10), pantsMat);
        mThigh.rotation.z = Math.PI / 2;
        mThigh.position.set(0.9, 0.05, lz);
        maleGroup.add(mThigh);

        const mShin = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.26, 1.9, 10), pantsMat);
        mShin.position.set(1.8, -0.95, lz);
        maleGroup.add(mShin);
      });

      cngGroup.add(maleGroup);

      // Female Passenger with Saree & Veil (Ghomta) (Right: Z = +3.2)
      const femaleGroup = new THREE.Group();
      femaleGroup.position.set(-7.5, 4.85, 3.2);

      const femaleSareeMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.65 }); // Teal
      const goldBorderMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.4 });

      const fTorsoPts = [
        [0.0, 0.2, 0],
        [0.05, 1.2, 0],
        [0.08, 2.35, 0]
      ];
      femaleGroup.add(createContinuousSplineLimb(fTorsoPts, [0.75, 0.85, 0.80], femaleSareeMat, 10, 10));

      const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.65, 10), femaleSkinMat);
      fNeck.position.set(0.10, 2.62, 0);
      femaleGroup.add(fNeck);

      const fHead = buildRealisticAdultHead(femaleSkinMat, hairMat, true, false);
      fHead.position.set(0.12, 3.45, 0);
      femaleGroup.add(fHead);

      // Elegant Saree Veil (Ghomta) framing head and shoulders
      const ghomtaRimPts = [
        [-0.15, 2.40, 0.60],
        [-0.05, 3.35, 0.52],
        [0.12, 4.15, 0.25],
        [0.18, 4.22, 0],
        [0.12, 4.15, -0.25],
        [-0.05, 3.35, -0.52],
        [-0.15, 2.40, -0.60]
      ];
      femaleGroup.add(createContinuousSplineLimb(ghomtaRimPts, 0.10, goldBorderMat, 18, 8));

      // Cowl hood covering back of head
      const ghomtaCowlPts = [
        [0.02, 4.10, 0],
        [-0.23, 3.60, 0],
        [-0.33, 2.80, 0],
        [-0.28, 2.10, 0]
      ];
      const cowlMesh = createContinuousSplineLimb(ghomtaCowlPts, [0.45, 0.50, 0.52, 0.48], femaleSareeMat, 12, 10);
      cowlMesh.scale.set(0.85, 1.0, 1.2);
      femaleGroup.add(cowlMesh);

      // Anchol across chest
      const ancholPts = [
        [0.45, 0.80, 0.55],
        [0.55, 1.50, 0.18],
        [0.28, 2.30, -0.38]
      ];
      femaleGroup.add(createContinuousSplineLimb(ancholPts, 0.18, femaleSareeMat, 10, 8));

      // Saree skirt over knees
      const skirtPts = [
        [-0.10, 0.05, 0],
        [1.10, 0.05, 0],
        [1.85, -0.85, 0]
      ];
      const skirtMesh = createContinuousSplineLimb(skirtPts, [0.85, 0.88, 0.75], femaleSareeMat, 12, 10);
      femaleGroup.add(skirtMesh);

      // Female Arms & Bangles
      [-0.75, 0.75].forEach(az => {
        const fArmPts = [
          [0.10, 2.25, az],
          [0.75, 1.30, az * 0.85],
          [1.50, 0.45, az * 0.28]
        ];
        femaleGroup.add(createContinuousSplineLimb(fArmPts, [0.18, 0.15, 0.13], femaleSkinMat, 10, 8));

        // Bangles
        [0xdc2626, 0xfacc15, 0x16a34a].forEach((bColor, bIdx) => {
          const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12), new THREE.MeshStandardMaterial({
            color: bColor,
            roughness: 0.3
          }));
          bangle.position.set(1.25 + bIdx * 0.08, 0.65, az * 0.42);
          bangle.rotation.y = Math.PI / 2;
          femaleGroup.add(bangle);
        });
      });

      // Hands in lap
      const fHands = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), femaleSkinMat);
      fHands.scale.set(1.2, 0.5, 1.3);
      fHands.position.set(1.55, 0.42, 0);
      femaleGroup.add(fHands);

      cngGroup.add(femaleGroup);

      return cngGroup;
    }

    const cng = createAuthenticBangladeshiCNG();
    scene.add(cng);

    renderer.render(scene, camera);
    window.__RENDER_DONE__ = true;
  </script>
</body>
</html>
"""

with open('scratch/test_cng_overhaul.html', 'w', encoding='utf-8') as f:
    f.write(html_code)

print('Successfully written test_cng_overhaul.html')
