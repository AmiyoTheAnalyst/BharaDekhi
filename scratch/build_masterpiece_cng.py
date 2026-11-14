import os
import subprocess

html_content = """<!DOCTYPE html>
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

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff7ed, 1.45);
    dir.position.set(16, 26, 20);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.7);
    fill.position.set(-18, 14, -14);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffedd5, 0.6);
    rim.position.set(-10, 16, 22);
    scene.add(rim);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // =========================================================================
    // PROCEDURAL TEXTURE GENERATORS
    // =========================================================================
    function createCNGRearLiveryTexture() {
      const cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 512;
      const ctx = cv.getContext('2d');

      // Authentic Dhaka Emerald Green
      ctx.fillStyle = '#008744';
      ctx.fillRect(0, 0, 1024, 512);

      // Yellow Dashed Stitching along borders
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 12]);
      ctx.strokeRect(16, 16, 992, 480);

      // Wheel arch outline stitch
      ctx.beginPath();
      ctx.arc(480, 512, 220, Math.PI, 0, false);
      ctx.stroke();

      // Slanted Upper White Banner: "★ FOR HIRE ★"
      ctx.save();
      ctx.translate(500, 140);
      ctx.rotate(-0.05);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(-380, -48, 760, 96);
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.strokeRect(-376, -44, 752, 88);

      ctx.fillStyle = '#ea580c'; // Bold Orange-Red
      ctx.font = '900 60px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ FOR HIRE ★', 0, 4);
      ctx.restore();

      // Slanted Lower Yellow-Lime Banner: "ONE PARIBAHAN"
      ctx.save();
      ctx.translate(500, 255);
      ctx.rotate(-0.05);

      ctx.fillStyle = '#d4ff00';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(-380, -44, 760, 88);
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 4;
      ctx.strokeRect(-376, -40, 752, 80);

      ctx.fillStyle = '#dc2626'; // Bold Red
      ctx.font = '900 54px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ONE PARIBAHAN', 0, 4);
      ctx.restore();

      // Black circular fuel cap near top-rear corner
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(880, 75, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 4;
      ctx.stroke();

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 8;
      return tex;
    }

    function createCNGFrontNoseTexture() {
      const cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 512;
      const ctx = cv.getContext('2d');

      ctx.fillStyle = '#008744';
      ctx.fillRect(0, 0, 1024, 512);

      // Yellow Dashed border
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 12]);
      ctx.strokeRect(20, 20, 984, 472);

      // Tricolor horizontal band across center
      const bandY = 220;
      ctx.fillStyle = '#dc2626'; // Red
      ctx.fillRect(30, bandY, 964, 42);
      ctx.fillStyle = '#2563eb'; // Blue
      ctx.fillRect(30, bandY + 42, 964, 42);
      ctx.fillStyle = '#facc15'; // Yellow
      ctx.fillRect(30, bandY + 84, 964, 42);

      // Row of decorative yellow dots above band
      ctx.fillStyle = '#fef08a';
      const numDots = 20;
      for (let i = 0; i < numDots; i++) {
        const dx = 65 + (i * 894) / (numDots - 1);
        ctx.beginPath();
        ctx.arc(dx, bandY - 26, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 8;
      return tex;
    }

    function createCNGGarlandStripTexture() {
      const cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 128;
      const ctx = cv.getContext('2d');

      ctx.clearRect(0, 0, 1024, 128);

      const scallops = 16;
      const sw = 1024 / scallops;
      const garlandY = 40;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < scallops; i++) {
        const cx = i * sw + sw / 2;
        ctx.arc(cx, garlandY, sw / 2, Math.PI, 0, true);
      }
      ctx.stroke();

      for (let i = 0; i < scallops; i++) {
        const cx = i * sw + sw / 2;
        ctx.fillStyle = (i % 2 === 0) ? '#ea580c' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, garlandY + 28, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 8;
      return tex;
    }

    // =========================================================================
    // 3D MODEL BUILDER
    // =========================================================================
    function createAuthenticBangladeshiCNG() {
      const cngGroup = new THREE.Group();

      const cngGreenMat = new THREE.MeshStandardMaterial({
        color: 0x008744, // Vibrant Emerald Green
        roughness: 0.28,
        metalness: 0.22
      });
      const cngDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
      const cngSeatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.9 });
      const rubberMat = new THREE.MeshStandardMaterial({ color: 0x2d2926, roughness: 0.90 });
      const yellowStitchMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      const hoodMat = new THREE.MeshStandardMaterial({
        color: 0x1d3549, // Dark Slate-Blue Canvas
        roughness: 0.85
      });
      const rearLiveryMat = new THREE.MeshStandardMaterial({
        map: createCNGRearLiveryTexture(),
        roughness: 0.32,
        metalness: 0.18
      });
      const frontNoseMat = new THREE.MeshStandardMaterial({
        map: createCNGFrontNoseTexture(),
        roughness: 0.30,
        metalness: 0.20
      });
      const garlandMat = new THREE.MeshStandardMaterial({
        map: createCNGGarlandStripTexture(),
        transparent: true,
        roughness: 0.4
      });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xdcfce7,
        transparent: true,
        opacity: 0.40,
        roughness: 0.08,
        transmission: 0.90,
        ior: 1.52,
        metalness: 0.1
      });

      const driverSkinMat = new THREE.MeshStandardMaterial({ color: 0x9a5c40, roughness: 0.65 });
      const driverShirtMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.70 });
      const malePassShirt = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.68 });
      const femaleSareeMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.65 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.9 });

      const FRONT_X = 9.80;
      const REAR_X = -7.40;
      const TRACK_W = 13.80;
      const WHEEL_R = 2.85;

      // 1. THREE COMPACT SCOOTER WHEELS
      function buildScooterWheel(x, y, z) {
        const wGroup = new THREE.Group();
        wGroup.position.set(x, y, z);

        const tire = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R, 0.62, 12, 32), rubberMat);
        tire.castShadow = true;
        wGroup.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R - 0.55, WHEEL_R - 0.55, 1.15, 20), cngDarkMat);
        rim.rotation.x = Math.PI / 2;
        wGroup.add(rim);

        const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.25, 16), cngDarkMat);
        hubCap.rotation.x = Math.PI / 2;
        wGroup.add(hubCap);

        const numStuds = 6;
        for (let i = 0; i < numStuds; i++) {
          const ang = (i / numStuds) * Math.PI * 2;
          const stud = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), yellowStitchMat);
          stud.position.set(Math.cos(ang) * 1.35, Math.sin(ang) * 1.35, 0.58);
          wGroup.add(stud);
          const studIn = stud.clone();
          studIn.position.z = -0.58;
          wGroup.add(studIn);
        }

        cngGroup.add(wGroup);
        return wGroup;
      }

      const frontWheel = buildScooterWheel(FRONT_X, WHEEL_R, 0);
      const rearWheelL = buildScooterWheel(REAR_X, WHEEL_R, -TRACK_W / 2);
      const rearWheelR = buildScooterWheel(REAR_X, WHEEL_R, TRACK_W / 2);
      cngGroup.userData.wheels = [frontWheel, rearWheelL, rearWheelR];
      cngGroup.userData.wheelRadius = WHEEL_R;

      // 2. FRONT MUDGUARD & TEARDROP POD HEADLIGHT
      const fMudguardGeo = new THREE.TorusGeometry(WHEEL_R + 0.35, 0.32, 8, 24, Math.PI * 0.72);
      const fMudguard = new THREE.Mesh(fMudguardGeo, cngGreenMat);
      fMudguard.rotation.z = Math.PI * 0.35;
      fMudguard.position.set(FRONT_X, WHEEL_R, 0);
      cngGroup.add(fMudguard);

      const fStitchGeo = new THREE.TorusGeometry(WHEEL_R + 0.38, 0.05, 6, 24, Math.PI * 0.70);
      const fStitch = new THREE.Mesh(fStitchGeo, yellowStitchMat);
      fStitch.rotation.z = Math.PI * 0.36;
      fStitch.position.set(FRONT_X, WHEEL_R, 0);
      cngGroup.add(fStitch);

      // Teardrop pod headlight mounted on the front mudguard/lower nose
      const podGroup = new THREE.Group();
      podGroup.position.set(FRONT_X + 1.25, WHEEL_R + 1.85, 0);

      const podHousing = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 14), cngGreenMat);
      podHousing.scale.set(1.4, 0.95, 0.95);
      podGroup.add(podHousing);

      const podBezel = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 8, 20), chromeMat);
      podBezel.rotation.y = Math.PI / 2;
      podBezel.position.set(1.15, 0, 0);
      podGroup.add(podBezel);

      const podLens = new THREE.Mesh(
        new THREE.SphereGeometry(0.80, 16, 12),
        new THREE.MeshStandardMaterial({
          color: 0xfff7ed,
          emissive: 0xffedd5,
          emissiveIntensity: 0.95,
          roughness: 0.1
        })
      );
      podLens.scale.set(0.28, 0.95, 0.95);
      podLens.position.set(1.22, 0, 0);
      podGroup.add(podLens);

      cngGroup.add(podGroup);

      // 3. CHASSIS FLOORPAN & INTERIOR FLOOR
      const floorShape = new THREE.Shape();
      floorShape.moveTo(-13.8, -7.4);
      floorShape.lineTo(2.0, -7.4);
      floorShape.lineTo(9.5, -2.8);
      floorShape.lineTo(9.5, 2.8);
      floorShape.lineTo(2.0, 7.4);
      floorShape.lineTo(-13.8, 7.4);
      floorShape.closePath();

      const floorGeo = new THREE.ExtrudeGeometry(floorShape, { depth: 1.8, bevelEnabled: false });
      floorGeo.rotateX(Math.PI / 2);
      floorGeo.translate(0, 3.6, 0);
      const floorMesh = new THREE.Mesh(floorGeo, cngGreenMat);
      floorMesh.castShadow = true;
      cngGroup.add(floorMesh);

      const matMesh = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.15, 13.8), cngSeatMat);
      matMesh.position.set(-5.5, 3.75, 0);
      cngGroup.add(matMesh);

      // 4. STREAMLINED FRONT APRON & SLOPED WINDSHIELD (~68°)
      // Aerodynamic sloped front cowl
      const cowlShape = new THREE.Shape();
      cowlShape.moveTo(4.8, 4.2);
      cowlShape.lineTo(10.8, 5.2);
      cowlShape.lineTo(9.5, 9.2);
      cowlShape.lineTo(6.8, 10.6);
      cowlShape.lineTo(4.8, 10.4);
      cowlShape.closePath();

      const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, {
        depth: 13.6,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.45,
        bevelThickness: 0.45
      });
      cowlGeo.translate(0, 0, -6.8);
      const cowlMesh = new THREE.Mesh(cowlGeo, cngGreenMat);
      cowlMesh.castShadow = true;
      cngGroup.add(cowlMesh);

      // Front nose panel displaying Tricolor band (Red, Blue, Yellow) & Dots across front slope
      const noseDecal = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 5.2), frontNoseMat);
      noseDecal.rotation.y = Math.PI / 2;
      noseDecal.rotation.x = -0.38; // Matches front slope angle
      noseDecal.position.set(10.3, 7.2, 0);
      cngGroup.add(noseDecal);

      // Sloped Windshield Frame & Glass
      const winW = 14.0;
      const winH = 5.2;
      const winAngle = -0.38;

      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), glassMat);
      windshield.rotation.y = Math.PI / 2;
      windshield.rotation.x = winAngle;
      windshield.position.set(7.5, 12.8, 0);
      cngGroup.add(windshield);

      const winGlassGlaze = new THREE.Mesh(
        new THREE.PlaneGeometry(winW * 0.92, 0.45),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
      );
      winGlassGlaze.rotation.y = Math.PI / 2;
      winGlassGlaze.rotation.x = winAngle;
      winGlassGlaze.position.set(7.48, 14.6, 0);
      cngGroup.add(winGlassGlaze);

      const winTrimTop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, winW + 0.4), cngDarkMat);
      winTrimTop.rotation.z = winAngle;
      winTrimTop.position.set(6.5, 15.2, 0);
      cngGroup.add(winTrimTop);

      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.16), cngDarkMat);
      wiper.rotation.z = winAngle + 0.45;
      wiper.position.set(7.8, 12.4, 0);
      cngGroup.add(wiper);

      [-1, 1].forEach(side => {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), chromeMat);
        stalk.position.set(7.8, 13.2, side * 7.8);
        stalk.rotation.z = 0.45;
        stalk.rotation.x = side * 0.55;
        cngGroup.add(stalk);

        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.5, 0.95), cngDarkMat);
        mirror.position.set(8.4, 13.8, side * 8.6);
        cngGroup.add(mirror);
      });

      // 5. TWO OPEN DOORLESS COMPARTMENTS & CENTRAL GREEN B-PILLAR
      [-1, 1].forEach(side => {
        const bPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.8, 0.45), cngGreenMat);
        bPillar.position.set(0.0, 8.8, side * 7.42);
        cngGroup.add(bPillar);

        const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.4, 0.45), cngGreenMat);
        aPillar.position.set(6.2, 13.2, side * 7.42);
        aPillar.rotation.z = winAngle;
        cngGroup.add(aPillar);

        const stepSill = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.65, 0.45), cngGreenMat);
        stepSill.position.set(-2.8, 4.2, side * 7.42);
        cngGroup.add(stepSill);

        const stepStitch = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 0.50), yellowStitchMat);
        stepStitch.position.set(-2.8, 4.55, side * 7.42);
        cngGroup.add(stepStitch);

        const topRail = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.45, 0.45), cngGreenMat);
        topRail.position.set(-2.5, 13.1, side * 7.42);
        cngGroup.add(topRail);

        // Colorful Triangular Bunting Flags hanging along the top doorway rim!
        const numFlags = 16;
        const flagColors = [0xef4444, 0xfacc15, 0x10b981, 0x3b82f6, 0xf97316];
        for (let f = 0; f < numFlags; f++) {
          const fx = -8.2 + (f * 13.4) / (numFlags - 1);
          const flagGeo = new THREE.ConeGeometry(0.38, 0.65, 3);
          flagGeo.rotateZ(Math.PI);
          const flagMesh = new THREE.Mesh(
            flagGeo,
            new THREE.MeshStandardMaterial({ color: flagColors[f % flagColors.length], roughness: 0.6 })
          );
          flagMesh.position.set(fx, 12.65, side * 7.46);
          cngGroup.add(flagMesh);
        }

        // Orange & Gold Floral Garland Strip along canvas roof bottom edge
        const garlandMesh = new THREE.Mesh(new THREE.PlaneGeometry(16.2, 1.4), garlandMat);
        garlandMesh.position.set(-2.5, 13.4, side * 7.82);
        if (side < 0) garlandMesh.rotation.y = Math.PI;
        cngGroup.add(garlandMesh);
      });

      // 6. SOLID GREEN REAR QUARTER PANEL WITH "★ FOR HIRE ★" & "ONE PARIBAHAN"
      [-1, 1].forEach(side => {
        const rpShape = new THREE.Shape();
        rpShape.moveTo(-13.8, 4.0);
        rpShape.lineTo(-13.8, 12.8);
        rpShape.lineTo(-4.8, 12.8);
        rpShape.lineTo(-4.8, 5.2);
        rpShape.lineTo(-5.0, 4.0);
        rpShape.absarc(-7.4, 3.2, 3.5, 0, Math.PI, false);
        rpShape.lineTo(-10.9, 4.0);
        rpShape.closePath();

        const rpGeo = new THREE.ExtrudeGeometry(rpShape, { depth: 0.35, bevelEnabled: false });
        rpGeo.translate(0, 0, side > 0 ? 7.25 : -7.60);
        const rpMesh = new THREE.Mesh(rpGeo, cngGreenMat);
        cngGroup.add(rpMesh);

        const decalMesh = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 5.6), rearLiveryMat);
        decalMesh.position.set(-9.4, 9.6, side * 7.62);
        if (side < 0) decalMesh.rotation.y = Math.PI;
        cngGroup.add(decalMesh);
      });

      // Solid rear back wall with rear window & garlands
      const rearWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.8, 14.8), cngGreenMat);
      rearWall.position.set(-13.6, 8.6, 0);
      cngGroup.add(rearWall);

      const rearWin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.2, 8.6), glassMat);
      rearWin.position.set(-13.6, 10.4, 0);
      cngGroup.add(rearWin);

      // Rear garland strip beneath window
      const rearGarland = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 1.4), garlandMat);
      rearGarland.rotation.y = -Math.PI / 2;
      rearGarland.position.set(-13.85, 12.6, 0);
      cngGroup.add(rearGarland);

      [-5.5, 5.5].forEach(tz => {
        const tailLight = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 1.1, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xb91c1c, emissiveIntensity: 0.65 })
        );
        tailLight.position.set(-13.7, 6.2, tz);
        cngGroup.add(tailLight);
      });

      // 7. FITTED DARK SLATE-BLUE CANVAS HOOD
      const hoodShape = new THREE.Shape();
      hoodShape.moveTo(-13.8, 12.8);
      hoodShape.lineTo(-13.8, 15.6);
      hoodShape.bezierCurveTo(-11.5, 16.8, -5.0, 17.2, 0.0, 17.2);
      hoodShape.bezierCurveTo(4.2, 17.2, 6.5, 16.2, 6.2, 14.8);
      hoodShape.lineTo(6.2, 13.0);
      hoodShape.closePath();

      const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
        depth: 15.6,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.35,
        bevelThickness: 0.35
      });
      hoodGeo.translate(0, 0, -7.8);
      const hoodMesh = new THREE.Mesh(hoodGeo, hoodMat);
      hoodMesh.castShadow = true;
      cngGroup.add(hoodMesh);

      // 8. INTERIOR CABIN & CHARACTERS
      const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 4.4), cngSeatMat);
      driverSeat.position.set(1.4, 4.6, 0);
      cngGroup.add(driverSeat);

      const driverBackrest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.8, 4.2), cngSeatMat);
      driverBackrest.position.set(-0.2, 6.8, 0);
      cngGroup.add(driverBackrest);

      const steerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8), chromeMat);
      steerColumn.rotation.z = -0.45;
      steerColumn.position.set(4.2, 6.5, 0);
      cngGroup.add(steerColumn);

      const steerBar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.6, 10), cngDarkMat);
      steerBar.rotation.x = Math.PI / 2;
      steerBar.position.set(5.2, 8.2, 0);
      cngGroup.add(steerBar);

      const meter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.4), cngDarkMat);
      meter.position.set(5.5, 9.1, 1.5);
      cngGroup.add(meter);

      // 8.1 3D CNG DRIVER
      const driverGroup = new THREE.Group();
      driverGroup.position.set(1.5, 5.8, 0);

      const dTorsoGeo = new THREE.CylinderGeometry(0.85, 0.95, 2.8, 14);
      dTorsoGeo.scale(0.85, 1.0, 1.2);
      const dTorso = new THREE.Mesh(dTorsoGeo, driverShirtMat);
      dTorso.position.set(0, 1.4, 0);
      dTorso.rotation.z = -0.18;
      driverGroup.add(dTorso);

      const dNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.6, 10), driverSkinMat);
      dNeck.position.set(0.18, 2.9, 0);
      driverGroup.add(dNeck);

      const dHeadGeo = new THREE.SphereGeometry(0.68, 16, 14);
      dHeadGeo.scale(0.88, 1.08, 0.92);
      const dHead = new THREE.Mesh(dHeadGeo, driverSkinMat);
      dHead.position.set(0.25, 3.6, 0);
      driverGroup.add(dHead);

      const dHair = new THREE.Mesh(new THREE.SphereGeometry(0.70, 16, 14), hairMat);
      dHair.scale.set(0.90, 1.10, 0.95);
      dHair.position.set(0.18, 3.75, 0);
      driverGroup.add(dHair);

      const dMustache = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.45, 8), hairMat);
      dMustache.rotation.x = Math.PI / 2;
      dMustache.position.set(0.82, 3.42, 0);
      driverGroup.add(dMustache);

      [-1.15, 1.15].forEach(az => {
        const armGeo = new THREE.CylinderGeometry(0.22, 0.18, 2.8, 8);
        const arm = new THREE.Mesh(armGeo, driverSkinMat);
        arm.position.set(1.6, 2.0, az * 1.35);
        arm.rotation.z = -0.95;
        arm.rotation.y = az > 0 ? -0.32 : 0.32;
        driverGroup.add(arm);
      });
      cngGroup.add(driverGroup);

      // 8.2 REAR PASSENGER BENCH & 2 PASSENGERS
      const passSeat = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 13.8), cngSeatMat);
      passSeat.position.set(-7.5, 4.6, 0);
      cngGroup.add(passSeat);

      const passBackrest = new THREE.Mesh(new THREE.BoxGeometry(0.95, 4.6, 13.6), cngSeatMat);
      passBackrest.position.set(-10.2, 7.2, 0);
      cngGroup.add(passBackrest);

      // Passenger 1: Male Passenger (Left: Z = -3.4)
      const p1Group = new THREE.Group();
      p1Group.position.set(-7.5, 5.8, -3.4);

      const p1Torso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 2.6, 12), malePassShirt);
      p1Torso.scale.set(0.85, 1.0, 1.15);
      p1Torso.position.set(0, 1.3, 0);
      p1Group.add(p1Torso);

      const p1Head = new THREE.Mesh(new THREE.SphereGeometry(0.66, 14, 12), driverSkinMat);
      p1Head.position.set(0.1, 3.2, 0);
      p1Group.add(p1Head);

      const p1Hair = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12), hairMat);
      p1Hair.position.set(0.05, 3.32, 0);
      p1Group.add(p1Hair);

      cngGroup.add(p1Group);

      // Passenger 2: Female Passenger with Saree Veil (Right: Z = +3.4)
      const p2Group = new THREE.Group();
      p2Group.position.set(-7.5, 5.8, 3.4);

      const p2Torso = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.88, 2.5, 12), femaleSareeMat);
      p2Torso.scale.set(0.82, 1.0, 1.10);
      p2Torso.position.set(0, 1.25, 0);
      p2Group.add(p2Torso);

      const p2Head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 12), driverSkinMat);
      p2Head.position.set(0.1, 3.1, 0);
      p2Group.add(p2Head);

      const ghomta = new THREE.Mesh(new THREE.SphereGeometry(0.74, 14, 12), femaleSareeMat);
      ghomta.scale.set(0.95, 1.15, 1.05);
      ghomta.position.set(-0.05, 3.25, 0);
      p2Group.add(ghomta);

      cngGroup.add(p2Group);

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
    f.write(html_content)

print('Updated scratch/test_cng_overhaul.html with masterpiece CNG')
