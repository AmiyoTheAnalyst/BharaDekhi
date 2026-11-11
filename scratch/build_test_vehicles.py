import os
import subprocess

html_content = """<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #0b0f19; overflow: hidden; }
    #canvas-container { width: 100vw; height: 100vh; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <div id="canvas-container"></div>
  <script>
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(40, 22, 38);
    camera.lookAt(0, 8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    dirLight.position.set(50, 70, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    backLight.position.set(-40, 30, -40);
    scene.add(backLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 1. Shared Canvas Textures
    let sharedRickshawArtTexture = null;
    function getRickshawArtTexture() {
      if (sharedRickshawArtTexture) return sharedRickshawArtTexture;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 300);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.45, '#1e1b4b');
      grad.addColorStop(0.85, '#831843');
      grad.addColorStop(1, '#db2777');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      function drawScallopedBorder(inset, radius, color1, color2) {
        const step = radius * 1.8;
        ctx.fillStyle = color1;
        ctx.strokeStyle = color2;
        ctx.lineWidth = 2.5;
        for (let x = inset; x <= 512 - inset; x += step) {
          ctx.beginPath(); ctx.arc(x, inset, radius, 0, Math.PI); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, 512 - inset, radius, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        for (let y = inset; y <= 512 - inset; y += step) {
          ctx.beginPath(); ctx.arc(inset, y, radius, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(512 - inset, y, radius, Math.PI / 2, Math.PI * 1.5); ctx.fill(); ctx.stroke();
        }
      }
      drawScallopedBorder(16, 12, '#facc15', '#dc2626');
      drawScallopedBorder(32, 8, '#38bdf8', '#ffffff');

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(44, 44, 424, 424);

      function drawCornerLotus(cx, cy, rot) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        const petalColors = ['#ec4899', '#f43f5e', '#fbbf24', '#34d399'];
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 6);
          ctx.fillStyle = petalColors[i];
          ctx.beginPath();
          ctx.ellipse(22, 0, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      drawCornerLotus(54, 54, 0);
      drawCornerLotus(458, 54, Math.PI / 2);
      drawCornerLotus(458, 458, Math.PI);
      drawCornerLotus(54, 458, -Math.PI / 2);

      ctx.save();
      ctx.translate(256, 230);
      const numFeathers = 18;
      for (let f = 0; f < numFeathers; f++) {
        const angle = Math.PI + (f * Math.PI) / (numFeathers - 1);
        const fx = Math.cos(angle) * 110;
        const fy = Math.sin(angle) * 95;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = f % 2 === 0 ? '#10b981' : '#06b6d4';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, -8, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(0, -8, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(0, 30, 36, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.moveTo(-10, 20);
      ctx.quadraticCurveTo(-24, -20, -12, -45);
      ctx.quadraticCurveTo(-6, -60, 6, -55);
      ctx.quadraticCurveTo(8, -35, 12, 20);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-12, -50);
      ctx.lineTo(-24, -48);
      ctx.lineTo(-10, -42);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4, -48, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-4, -48, 2, 0, Math.PI * 2);
      ctx.fill();

      for (let c = -1; c <= 1; c++) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -56);
        ctx.lineTo(c * 12, -72);
        ctx.stroke();
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(c * 12, -74, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      const lotusColors = ['#f43f5e', '#fb7185', '#fda4af', '#facc15'];
      for (let layer = 0; layer < 3; layer++) {
        const petals = 7;
        ctx.fillStyle = lotusColors[layer];
        for (let p = 0; p < petals; p++) {
          const pAng = (p - (petals - 1) / 2) * 0.28;
          ctx.save();
          ctx.translate(0, 70 + layer * 6);
          ctx.rotate(pAng);
          ctx.beginPath();
          ctx.ellipse(0, 25 - layer * 5, 14 - layer * 2, 32 - layer * 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(70, 420, 372, 54);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.strokeRect(70, 420, 372, 54);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ DHAKA RICKSHAW ART ★', 256, 447);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      sharedRickshawArtTexture = texture;
      return sharedRickshawArtTexture;
    }

    let sharedCNGAlponaTexture = null;
    function getCNGAlponaTexture() {
      if (sharedCNGAlponaTexture) return sharedCNGAlponaTexture;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#047857');
      grad.addColorStop(1, '#065f46');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      function drawAlponaVine(y, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x <= 512; x += 32) {
          ctx.quadraticCurveTo(x + 16, y - 18, x + 32, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        for (let x = 16; x < 512; x += 32) {
          ctx.beginPath();
          ctx.arc(x, y - 14, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(x - 8, y - 6, 7, 3, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + 8, y - 6, 7, 3, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      drawAlponaVine(40, '#f8fafc');
      drawAlponaVine(470, '#f8fafc');

      ctx.save();
      ctx.translate(256, 210);

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.stroke();

      const numAlponaPetals = 16;
      for (let p = 0; p < numAlponaPetals; p++) {
        const angle = (p * Math.PI * 2) / numAlponaPetals;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = p % 2 === 0 ? '#fef08a' : '#ffffff';
        ctx.beginPath();
        ctx.ellipse(65, 0, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (let p = 0; p < 8; p++) {
        const angle = (p * Math.PI * 2) / 8 + Math.PI / 8;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(32, 0, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(106, 360, 300, 72);
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 4;
      ctx.strokeRect(106, 360, 300, 72);

      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(136, 396, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(136, 396, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DHAKA METRO - THA', 280, 380);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('11-2468', 280, 412);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      sharedCNGAlponaTexture = texture;
      return sharedCNGAlponaTexture;
    }

    // Cylindrical bone helper
    function createBoneSegment(p1, p2, r1, r2, material) {
      const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
      const v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
      const dir = new THREE.Vector3().subVectors(v2, v1);
      const len = dir.length();
      if (len < 0.001) return new THREE.Group();

      const geom = new THREE.CylinderGeometry(r2 !== undefined ? r2 : r1, r1, len, 12);
      geom.translate(0, len / 2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.copy(v1);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      mesh.castShadow = true;
      return mesh;
    }

    // 2. REALISTIC DHAKA CYCLE RICKSHAW
    function createRealisticDhakaRickshaw() {
      const group = new THREE.Group();
      group.userData.wheels = [];
      group.userData.wheelRadius = 4.1;

      // Shared Materials
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.5 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.95 });
      const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
      const tealMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.35, metalness: 0.2 });
      const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });
      const seatRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45, metalness: 0.1 });
      const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });

      const rickshawArtTexture = getRickshawArtTexture();
      const hoodArtMat = new THREE.MeshStandardMaterial({
        map: rickshawArtTexture,
        roughness: 0.45,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      // A. 3x Realistic Spoked Wheels
      function buildRickshawWheel(pos) {
        const wGroup = new THREE.Group();
        wGroup.position.set(pos[0], pos[1], pos[2]);

        // Rounded Rubber Tire
        const tire = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.40, 12, 32), rubberMat);
        tire.castShadow = true;
        wGroup.add(tire);

        // Chrome Outer Rim
        const rim = new THREE.Mesh(new THREE.TorusGeometry(3.72, 0.09, 8, 32), chromeMat);
        wGroup.add(rim);

        // Center Chrome Hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.65, 12), chromeMat);
        hub.rotation.x = Math.PI / 2;
        wGroup.add(hub);

        const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.75, 10), goldTrimMat);
        hubCap.rotation.x = Math.PI / 2;
        wGroup.add(hubCap);

        // 24 Wire Spokes (Crossing Pattern)
        const spokeCount = 24;
        for (let i = 0; i < spokeCount; i++) {
          const ang = (i * Math.PI * 2) / spokeCount;
          const rimPt = [Math.cos(ang) * 3.65, Math.sin(ang) * 3.65, (i % 2 === 0 ? 0.22 : -0.22)];
          const hubPt = [0, 0, (i % 2 === 0 ? 0.28 : -0.28)];
          wGroup.add(createBoneSegment(hubPt, rimPt, 0.035, 0.035, chromeMat));
        }

        group.userData.wheels.push(wGroup);
        group.add(wGroup);
        return wGroup;
      }

      const wheelF = buildRickshawWheel([10.5, 4.1, 0]);
      const wheelRL = buildRickshawWheel([-7.8, 4.1, -7.3]);
      const wheelRR = buildRickshawWheel([-7.8, 4.1, 7.3]);

      // Rear Pinstriped Mudguards (Yellow & Red)
      [-1, 1].forEach(side => {
        const guardPts = [];
        const mgRadius = 4.75;
        const cx = -7.8, cy = 4.1, cz = side * 7.3;
        for (let a = 0; a <= 16; a++) {
          const rad = Math.PI * a / 16;
          guardPts.push(new THREE.Vector3(cx + Math.cos(rad) * mgRadius, cy + Math.sin(rad) * mgRadius, cz));
        }
        const curve = new THREE.CatmullRomCurve3(guardPts);
        const guardGeom = new THREE.TubeGeometry(curve, 20, 0.55, 8, false);
        const mudguard = new THREE.Mesh(guardGeom, new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.35,
          metalness: 0.2
        }));
        mudguard.castShadow = true;
        group.add(mudguard);

        // Chrome Mudguard Stays connecting to rear axle
        group.add(createBoneSegment([cx, cy, cz + side * 0.4], [cx - 2.8, cy + 3.4, cz], 0.12, 0.12, chromeMat));
        group.add(createBoneSegment([cx, cy, cz + side * 0.4], [cx + 2.8, cy + 3.4, cz], 0.12, 0.12, chromeMat));
      });

      // Front Mudguard
      const fGuardPts = [];
      for (let a = 0; a <= 12; a++) {
        const rad = Math.PI * (0.2 + 0.6 * a / 12);
        fGuardPts.push(new THREE.Vector3(10.5 + Math.cos(rad) * 4.65, 4.1 + Math.sin(rad) * 4.65, 0));
      }
      const fCurve = new THREE.CatmullRomCurve3(fGuardPts);
      const fMudguard = new THREE.Mesh(new THREE.TubeGeometry(fCurve, 16, 0.48, 8, false), chromeMat);
      group.add(fMudguard);

      // B. Tubular Steel Diamond Frame & Subframe
      const forkCrown = [9.2, 8.4, 0];
      const bottomBracket = [1.35, 3.3, 0];
      const saddlePost = [0.55, 5.75, 0];
      const rearAxleMid = [-7.8, 4.1, 0];

      // Dual Front Fork Blades
      group.add(createBoneSegment([10.5, 4.1, -0.6], forkCrown, 0.32, 0.28, chromeMat));
      group.add(createBoneSegment([10.5, 4.1, 0.6], forkCrown, 0.32, 0.28, chromeMat));

      // Head Tube
      const handlePivot = [9.0, 9.6, 0];
      group.add(createBoneSegment(forkCrown, handlePivot, 0.38, 0.38, steelMat));

      // Top Tube & Down Tube
      group.add(createBoneSegment(forkCrown, saddlePost, 0.32, 0.32, steelMat));
      group.add(createBoneSegment(forkCrown, bottomBracket, 0.32, 0.32, steelMat));
      group.add(createBoneSegment(saddlePost, bottomBracket, 0.32, 0.32, steelMat));

      // Rear Carriage Subframe Trusses
      group.add(createBoneSegment(bottomBracket, rearAxleMid, 0.36, 0.36, steelMat));
      group.add(createBoneSegment(saddlePost, [-6.5, 6.8, 0], 0.36, 0.36, steelMat));
      group.add(createBoneSegment([-6.5, 6.8, 0], rearAxleMid, 0.36, 0.36, steelMat));

      // Rear Cross Axle Tube (Connecting Left and Right Rear Wheels)
      group.add(createBoneSegment([-7.8, 4.1, -7.3], [-7.8, 4.1, 7.3], 0.42, 0.42, chromeMat));

      // Handlebars & Vintage Headlight
      const barCenter = [8.8, 9.7, 0];
      const gripL = [6.8, 8.8, -2.4];
      const gripR = [6.8, 8.8, 2.4];
      group.add(createBoneSegment(barCenter, gripL, 0.24, 0.22, chromeMat));
      group.add(createBoneSegment(barCenter, gripR, 0.24, 0.22, chromeMat));

      // Black Rubber Handgrips
      group.add(createBoneSegment([7.4, 9.0, -2.1], gripL, 0.34, 0.32, rubberMat));
      group.add(createBoneSegment([7.4, 9.0, 2.1], gripR, 0.34, 0.32, rubberMat));

      // Brass Bell on Left Handlebar
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), goldTrimMat);
      bell.position.set(7.6, 9.3, -1.9);
      group.add(bell);

      // Vintage Round Headlight
      const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.1, 14), chromeMat);
      lampHousing.rotation.z = Math.PI / 2;
      lampHousing.position.set(9.7, 7.8, 0);
      group.add(lampHousing);

      const lampLens = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 14, 12),
        new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xffedd5, emissiveIntensity: 0.65, roughness: 0.15 })
      );
      lampLens.scale.set(0.3, 1.0, 1.0);
      lampLens.position.set(10.25, 7.8, 0);
      group.add(lampLens);

      // Sprung Leather Puller Saddle
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 2.2), rubberMat);
      saddle.position.set(0.55, 6.1, 0);
      group.add(saddle);

      // Dual Chrome Springs under saddle
      [-0.6, 0.6].forEach(sz => {
        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.65, 10), chromeMat);
        spring.position.set(0.35, 5.65, sz);
        group.add(spring);
      });

      // Crank & Pedals
      const crankGroup = new THREE.Group();
      crankGroup.position.set(bottomBracket[0], bottomBracket[1], bottomBracket[2]);
      const crankAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.8, 10), chromeMat);
      crankAxle.rotation.x = Math.PI / 2;
      crankGroup.add(crankAxle);

      const pedalL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.65), rubberMat);
      pedalL.position.set(0, -1.15, -1.35);
      crankGroup.add(pedalL);

      const pedalR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.65), rubberMat);
      pedalR.position.set(0, 1.15, 1.35);
      crankGroup.add(pedalR);

      group.add(crankGroup);
      group.userData.pedalCrank = crankGroup;

      // C. Passenger Carriage & Footboard
      // Wooden Footboard Platform
      const footboard = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.45, 14.5), woodFloorMat);
      footboard.position.set(-2.5, 5.8, 0);
      footboard.castShadow = true;
      group.add(footboard);

      // Slanted Footrest Board
      const footrest = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 13.8), woodFloorMat);
      footrest.rotation.z = -0.32;
      footrest.position.set(1.4, 5.2, 0);
      group.add(footrest);

      // Turquoise Carriage Tub Body
      const tub = new THREE.Mesh(new THREE.BoxGeometry(11.5, 2.4, 15.2), tealMat);
      tub.position.set(-6.8, 7.2, 0);
      tub.castShadow = true;
      group.add(tub);

      // Ornate Gold Filigree Side Panels & Armrest Rails
      [-1, 1].forEach(side => {
        const sideRail = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.35, 0.45), goldTrimMat);
        sideRail.position.set(-6.8, 8.5, side * 7.7);
        group.add(sideRail);

        // Curved Chrome Armrest
        const armPts = [
          new THREE.Vector3(-11.5, 8.5, side * 7.7),
          new THREE.Vector3(-6.8, 10.4, side * 7.7),
          new THREE.Vector3(-2.2, 8.5, side * 7.7)
        ];
        const armCurve = new THREE.CatmullRomCurve3(armPts);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 14, 0.24, 8, false), chromeMat));
      });

      // Plush Cushioned Passenger Bench
      const benchPad = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.95, 14.2), tealMat);
      benchPad.position.set(-6.8, 8.7, 0);
      group.add(benchPad);

      // Crimson Tufted High Backrest
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.8, 14.2), seatRedMat);
      backrest.position.set(-11.8, 11.2, 0);
      backrest.castShadow = true;
      group.add(backrest);

      // Button Tuft Studs
      for (let bx = -6; bx <= 6; bx += 3) {
        for (let by = 9.8; by <= 12.8; by += 1.5) {
          const stud = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), goldTrimMat);
          stud.position.set(-11.15, by, bx);
          group.add(stud);
        }
      }

      // Traditional Rickshaw Art Tinplate Backboard (Mounted Vertically on Rear)
      const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.5, 14.8), hoodArtMat);
      backboard.position.set(-12.6, 7.4, 0);
      backboard.castShadow = true;
      group.add(backboard);

      // D. Curved Folding Canopy (Hood) with Rickshaw Art & Golden Fringe Tassels
      const canopyCenterX = -6.5;
      const canopyBaseY = 12.5;
      const canopyRx = 7.5;
      const canopyRy = 7.2;
      const canopyWidth = 8.2;

      // Curved Canopy Shell Geometry (Lofted Arc Mesh)
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

      // Structural Canopy Steel Ribs
      for (let r = 0; r <= 5; r++) {
        const ru = r / 5;
        const rang = Math.PI * (0.05 + 0.90 * ru);
        const rx = canopyCenterX + Math.cos(rang) * canopyRx;
        const ry = canopyBaseY + Math.sin(rang) * canopyRy;
        const ribPts = [new THREE.Vector3(rx, ry, -canopyWidth), new THREE.Vector3(rx, ry, canopyWidth)];
        group.add(createBoneSegment(ribPts[0].toArray(), ribPts[1].toArray(), 0.16, 0.16, chromeMat));
      }

      // Golden Fringe Tassels along Front Awning Rim
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

      // E. ANIMATED AUTHENTIC RICKSHAW PULLER (Picture 3 Reference Match)
      const pullerGroup = new THREE.Group();
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x9a5b3a, roughness: 0.72 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.65 }); // Traditional violet tunic shirt
      const lungiMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.75 }); // Authentic folded blue lungi
      const gamchaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 }); // Red/white gamcha

      // 1. Contoured Forward-Leaning Torso & Neck
      const torso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 2.6), shirtMat);
      torso.position.set(1.4, 7.2, 0);
      torso.rotation.z = -0.32;
      pullerGroup.add(torso);

      // Red Gamcha Draped over Right Shoulder
      const gamcha = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.4, 0.8), gamchaMat);
      gamcha.position.set(1.45, 7.3, 1.2);
      gamcha.rotation.z = -0.32;
      pullerGroup.add(gamcha);

      // Neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.9, 10), skinMat);
      neck.position.set(2.4, 8.4, 0);
      neck.rotation.z = -0.25;
      pullerGroup.add(neck);

      // 2. Head with Facial Features & Mustache
      const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 14), skinMat);
      head.position.set(2.7, 9.25, 0);
      pullerGroup.add(head);

      // Black Hair Cap
      const hair = new THREE.Mesh(new THREE.SphereGeometry(1.10, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), hairMat);
      hair.position.set(2.65, 9.35, 0);
      pullerGroup.add(hair);

      // Almond Eyes, Nose & Bengali Mustache
      const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      [-0.4, 0.4].forEach(ez => {
        const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), eyeWhiteMat);
        eyeW.position.set(3.6, 9.4, ez);
        pullerGroup.add(eyeW);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), hairMat);
        pupil.position.set(3.72, 9.4, ez);
        pullerGroup.add(pupil);
      });

      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), skinMat);
      nose.rotation.z = -Math.PI / 2;
      nose.position.set(3.85, 9.15, 0);
      pullerGroup.add(nose);

      // Traditional Mustache
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.0), hairMat);
      stache.position.set(3.75, 8.85, 0);
      pullerGroup.add(stache);

      // 3. Articulated Arms Gripping Handlebars
      [-1, 1].forEach(side => {
        const shPos = [1.8, 8.1, side * 1.35];
        const elbPos = [4.3, 7.8, side * 1.85];
        const handPos = [gripL[0], gripL[1], side * Math.abs(gripL[2])];

        pullerGroup.add(createBoneSegment(shPos, elbPos, 0.42, 0.36, shirtMat));
        pullerGroup.add(createBoneSegment(elbPos, handPos, 0.36, 0.30, skinMat));

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), skinMat);
        hand.position.set(handPos[0], handPos[1], handPos[2]);
        pullerGroup.add(hand);
      });

      // 4. Lungi Lower Body Wrap & Pedaling Legs
      const pelvisLungi = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.8, 14), lungiMat);
      pelvisLungi.position.set(0.65, 5.75, 0);
      pullerGroup.add(pelvisLungi);

      // Pedaling Leg Hierarchy
      const pullerLegs = [];
      const lenThigh = 2.05;
      const lenShin = 2.05;
      const hipX = 0.55, hipY = 5.75;
      const crankPivotX = bottomBracket[0], crankPivotY = bottomBracket[1];
      const crankR = 1.15;

      [-1, 1].forEach(side => {
        const legData = {
          side: side,
          hipZ: side * 0.95,
          thigh: new THREE.Group(),
          shin: new THREE.Group(),
          foot: new THREE.Group()
        };

        const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, lenThigh, 12), lungiMat);
        thighMesh.translateY(lenThigh / 2);
        legData.thigh.add(thighMesh);

        const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.30, lenShin, 12), skinMat);
        shinMesh.translateY(lenShin / 2);
        legData.shin.add(shinMesh);

        const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.75), rubberMat);
        legData.foot.add(sandal);

        pullerGroup.add(legData.thigh);
        pullerGroup.add(legData.shin);
        pullerGroup.add(legData.foot);
        pullerLegs.push(legData);
      });

      function updatePullerPedaling(phase) {
        if (crankGroup) crankGroup.rotation.z = phase;
        pullerLegs.forEach(leg => {
          const legPhase = phase + (leg.side === 1 ? 0 : Math.PI);
          const pedalX = crankPivotX + crankR * Math.cos(legPhase);
          const pedalY = crankPivotY + crankR * Math.sin(legPhase);

          const dx = pedalX - hipX;
          const dy = pedalY - hipY;
          const dist = Math.hypot(dx, dy);

          const cosAlpha = Math.max(-1.0, Math.min(1.0, (lenThigh * lenThigh + dist * dist - lenShin * lenShin) / (2 * lenThigh * dist)));
          const alpha = Math.acos(cosAlpha);
          const baseAng = Math.atan2(dy, dx);
          const thighAng = baseAng + alpha;

          const kneeX = hipX + lenThigh * Math.cos(thighAng);
          const kneeY = hipY + lenThigh * Math.sin(thighAng);

          // Update Thigh
          leg.thigh.position.set(hipX, hipY, leg.hipZ);
          leg.thigh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(kneeX - hipX, kneeY - hipY, 0).normalize());

          // Update Shin
          leg.shin.position.set(kneeX, kneeY, leg.hipZ);
          leg.shin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(pedalX - kneeX, pedalY - kneeY, 0).normalize());

          // Update Foot / Sandal
          leg.foot.position.set(pedalX, pedalY, leg.hipZ);
        });
      }

      group.add(pullerGroup);
      group.userData.updatePedaling = updatePullerPedaling;
      updatePullerPedaling(0);

      // F. TWO SEATED PASSENGERS (Picture 3 Reference Match)
      // 1. Lady in Traditional Saree / Salwar Kameez (Right side, +Z)
      const ladyGroup = new THREE.Group();
      ladyGroup.position.set(-6.5, 8.8, 3.2);

      const sareeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.68 }); // Vibrant saffron/orange saree
      const veilMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.65 });  // Draped gold dupatta/hijab

      const ladyTorso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 2.2), sareeMat);
      ladyTorso.position.set(0, 1.4, 0);
      ladyGroup.add(ladyTorso);

      const ladyHead = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), skinMat);
      ladyHead.position.set(0.1, 3.2, 0);
      ladyGroup.add(ladyHead);

      const ladyVeil = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.5), veilMat);
      ladyVeil.position.set(0.05, 3.3, 0);
      ladyGroup.add(ladyVeil);

      // Seated Saree Pleats / Skirt
      const ladySkirt = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.4), sareeMat);
      ladySkirt.position.set(1.5, 0.4, 0);
      ladyGroup.add(ladySkirt);

      group.add(ladyGroup);

      // 2. Gentleman in Violet Panjabi & Trousers (Left side, -Z)
      const gentGroup = new THREE.Group();
      gentGroup.position.set(-6.5, 8.8, -3.2);

      const panjabiMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.65 }); // Royal violet panjabi
      const pantMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });    // Dark trousers

      const gentTorso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 2.4), panjabiMat);
      gentTorso.position.set(0, 1.5, 0);
      gentGroup.add(gentTorso);

      const gentHead = new THREE.Mesh(new THREE.SphereGeometry(0.92, 14, 12), skinMat);
      gentHead.position.set(0.1, 3.35, 0);
      gentGroup.add(gentHead);

      const gentHair = new THREE.Mesh(new THREE.SphereGeometry(0.98, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.6), hairMat);
      gentHair.position.set(0.08, 3.45, 0);
      gentGroup.add(gentHair);

      const gentPants = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.4), pantMat);
      gentPants.position.set(1.5, 0.4, 0);
      gentGroup.add(gentPants);

      group.add(gentGroup);

      return group;
    }

    // 3. REALISTIC DHAKA CNG AUTO-RICKSHAW
    function createRealisticDhakaCNG() {
      const group = new THREE.Group();
      group.userData.wheels = [];
      group.userData.wheelRadius = 3.2;

      // Shared Materials
      const cngGreenMat = new THREE.MeshStandardMaterial({
        color: 0x065f46, // Rich Dhaka Metallic Emerald Green
        roughness: 0.32,
        metalness: 0.28
      });
      const yellowBandMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.1 });
      const softTopMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.88 }); // Charcoal matte canvas
      const chromeGrillMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.20, metalness: 0.88 });
      const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      const steelRimMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xc8f0f8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        transmission: 0.85,
        ior: 1.5
      });

      const alponaTexture = getCNGAlponaTexture();
      const alponaMat = new THREE.MeshStandardMaterial({
        map: alponaTexture,
        roughness: 0.35,
        metalness: 0.25
      });

      // A. Wheels (1 Front, 2 Rear)
      function buildCNGWheel(pos) {
        const w = new THREE.Group();
        w.position.set(pos[0], pos[1], pos[2]);

        const tire = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.75, 12, 28), rubberMat);
        tire.castShadow = true;
        w.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 1.2, 16), steelRimMat);
        rim.rotation.x = Math.PI / 2;
        w.add(rim);

        // 4 Wheel Lug Nuts
        for (let n = 0; n < 4; n++) {
          const ang = n * Math.PI / 2;
          const nut = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 1.3), chromeGrillMat);
          nut.position.set(Math.cos(ang) * 1.1, Math.sin(ang) * 1.1, 0);
          w.add(nut);
        }

        group.userData.wheels.push(w);
        group.add(w);
        return w;
      }

      buildCNGWheel([10.5, 3.2, 0]);
      buildCNGWheel([-7.5, 3.2, -6.8]);
      buildCNGWheel([-7.5, 3.2, 6.8]);

      // B. Sculpted Aerodynamic Body Shell
      // Lower Chassis & Floor
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(26, 2.8, 15.6), cngGreenMat);
      chassis.position.set(-1.2, 3.8, 0);
      chassis.castShadow = true;
      group.add(chassis);

      // Tapered Front Nose Apron
      const apron = new THREE.Mesh(new THREE.BoxGeometry(10.5, 8.5, 12.8), cngGreenMat);
      apron.rotation.z = -0.38;
      apron.position.set(7.5, 7.8, 0);
      apron.castShadow = true;
      group.add(apron);

      // Front Mudguard over single front wheel
      const frontMudguard = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 3.4, 16, 1, false, 0, Math.PI), cngGreenMat);
      frontMudguard.rotation.z = Math.PI;
      frontMudguard.rotation.x = Math.PI / 2;
      frontMudguard.position.set(10.5, 3.6, 0);
      group.add(frontMudguard);

      // Rear Passenger Cowling & Engine Bay
      const rearCabin = new THREE.Mesh(new THREE.BoxGeometry(16.5, 9.5, 16.2), cngGreenMat);
      rearCabin.position.set(-4.5, 8.6, 0);
      rearCabin.castShadow = true;
      group.add(rearCabin);

      // Yellow High-Visibility Rocker Trim Band
      [-1, 1].forEach(side => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 0.35), yellowBandMat);
        stripe.position.set(-1.0, 5.8, side * 8.0);
        group.add(stripe);
      });

      // Front & Rear Bengali Alpona Decorative Art Panels
      const frontAlponaPanel = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6.5), alponaMat);
      frontAlponaPanel.rotation.y = Math.PI / 2;
      frontAlponaPanel.rotation.x = -0.38;
      frontAlponaPanel.position.set(11.8, 8.2, 0);
      group.add(frontAlponaPanel);

      const rearAlponaPanel = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 8.2), alponaMat);
      rearAlponaPanel.rotation.y = -Math.PI / 2;
      rearAlponaPanel.position.set(-12.8, 8.5, 0);
      group.add(rearAlponaPanel);

      // C. Matte Charcoal Soft-Top Canvas Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(25.5, 2.2, 16.4), softTopMat);
      roof.position.set(-1.0, 14.2, 0);
      roof.castShadow = true;
      group.add(roof);

      // 3 Structural Soft-Top Seam Ribs
      [-5.5, 0, 5.5].forEach(rx => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 16.6), rubberMat);
        rib.position.set(rx, 15.3, 0);
        group.add(rib);
      });

      // Yellow Sun Visor Brow
      const visorBrow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 15.8), yellowBandMat);
      visorBrow.rotation.z = -0.22;
      visorBrow.position.set(9.6, 13.8, 0);
      group.add(visorBrow);

      // D. Curved Windshield & Glass
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.2, 14.8), glassMat);
      windshield.rotation.z = -0.28;
      windshield.position.set(8.4, 11.2, 0);
      group.add(windshield);

      // Rubber Frame Around Windshield
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 15.2), rubberMat);
      winFrame.rotation.z = -0.28;
      winFrame.position.set(8.4, 14.2, 0);
      group.add(winFrame);

      // Central Windshield Wiper
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 0.18), chromeGrillMat);
      wiper.rotation.z = 0.45;
      wiper.position.set(8.9, 11.0, 0);
      group.add(wiper);

      // Central Round Chrome-Ringed Headlight
      const lampRim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.22, 8, 20), chromeGrillMat);
      lampRim.rotation.y = Math.PI / 2;
      lampRim.position.set(12.2, 7.2, 0);
      group.add(lampRim);

      const lampLight = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xffedd5, emissiveIntensity: 0.85, roughness: 0.1 })
      );
      lampLight.scale.set(0.3, 1.0, 1.0);
      lampLight.position.set(12.3, 7.2, 0);
      group.add(lampLight);

      // Dual Side Mirrors
      [-1, 1].forEach(side => {
        const mirrorArm = createBoneSegment([8.6, 11.5, side * 7.5], [9.4, 12.2, side * 9.2], 0.16, 0.16, rubberMat);
        group.add(mirrorArm);

        const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.8, 1.1), rubberMat);
        mirrorHead.position.set(9.4, 12.2, side * 9.2);
        group.add(mirrorHead);
      });

      // E. SIGNATURE DHAKA METAL CAGE SECURITY DOORS
      [-1, 1].forEach(side => {
        const doorZ = side * 8.1;
        // Outer Tubular Frame
        group.add(createBoneSegment([-10.5, 6.2, doorZ], [1.5, 6.2, doorZ], 0.22, 0.22, chromeGrillMat));
        group.add(createBoneSegment([-10.5, 13.2, doorZ], [1.5, 13.2, doorZ], 0.22, 0.22, chromeGrillMat));
        group.add(createBoneSegment([-10.5, 6.2, doorZ], [-10.5, 13.2, doorZ], 0.22, 0.22, chromeGrillMat));
        group.add(createBoneSegment([1.5, 6.2, doorZ], [1.5, 13.2, doorZ], 0.22, 0.22, chromeGrillMat));

        // Horizontal Reinforcement Crossbars
        [8.5, 10.8].forEach(by => {
          group.add(createBoneSegment([-10.5, by, doorZ], [1.5, by, doorZ], 0.14, 0.14, chromeGrillMat));
        });

        // 8 Vertical Security Grill Bars
        for (let b = 0; b < 8; b++) {
          const bx = -9.2 + b * 1.35;
          group.add(createBoneSegment([bx, 6.2, doorZ], [bx, 13.2, doorZ], 0.11, 0.11, chromeGrillMat));
        }
      });

      // F. Interior Driver & Passengers
      // Front Handlebar Steering
      const steerBar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.5, 10), rubberMat);
      steerBar.position.set(5.2, 9.2, 0);
      group.add(steerBar);

      // Digital Fare Meter Box
      const meterBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.6), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
      meterBox.position.set(5.5, 10.1, 1.6);
      group.add(meterBox);

      // Driver
      const driverSkinMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.75 });
      const driverShirtMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });

      const dTorso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 2.6), driverShirtMat);
      dTorso.position.set(1.5, 7.8, 0);
      group.add(dTorso);

      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 12), driverSkinMat);
      dHead.position.set(1.6, 10.1, 0);
      group.add(dHead);

      // Rear Passenger Bench & Seated Passenger
      const rearSeat = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.4, 14.2), rubberMat);
      rearSeat.position.set(-6.5, 5.8, 0);
      group.add(rearSeat);

      const pTorso = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 2.4), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 }));
      pTorso.position.set(-6.2, 8.4, 2.5);
      group.add(pTorso);

      const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.90, 14, 12), driverSkinMat);
      pHead.position.set(-6.1, 10.6, 2.5);
      group.add(pHead);

      return group;
    }

    // Add Both Models to Scene
    const rickshaw = createRealisticDhakaRickshaw();
    rickshaw.position.set(0, 0, -14);
    scene.add(rickshaw);

    const cng = createRealisticDhakaCNG();
    cng.position.set(0, 0, 14);
    scene.add(cng);

    // Render single frame
    renderer.render(scene, camera);
    window.__testReady = true;
  </script>
</body>
</html>
"""

with open('scratch/test_vehicles_three.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Saved scratch/test_vehicles_three.html successfully")
