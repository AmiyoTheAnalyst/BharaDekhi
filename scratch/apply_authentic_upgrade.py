import sys

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update textures in lines ~1320-1425
old_tex_start = content.find('let sharedCngDecalTexture = null;')
old_tex_end = content.find('let sharedRollerShutterTexture = null;')

if old_tex_start == -1 or old_tex_end == -1:
    print('ERROR: could not find old textures region')
    sys.exit(1)

new_textures = '''let sharedCngDecalTexture = null;
  let sharedCngAlponaTexture = null;
  function getCNGSideTexture() {
    if (sharedCngDecalTexture) return sharedCngDecalTexture;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 512, 256);

    // Festive Bunting Garland across roofline
    const flags = 15;
    const fW = 512 / flags;
    const flagColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < flags; i++) {
      ctx.fillStyle = flagColors[i % flagColors.length];
      ctx.beginPath();
      ctx.moveTo(i * fW, 0);
      ctx.lineTo((i + 1) * fW, 0);
      ctx.lineTo(i * fW + fW / 2, 26);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(512, 0); ctx.stroke();

    // Rear Quarter Panel: "★ FOR HIRE ★" White plaque with red stars & border
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 85, 230, 38);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(16, 85, 230, 38);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ FOR HIRE ★', 131, 104);

    // Lemon-Yellow Band: ONE PARIBAHAN
    ctx.fillStyle = '#facc15';
    ctx.fillRect(16, 130, 230, 34);
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(16, 130, 230, 34);

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('ONE PARIBAHAN', 131, 147);

    // White Dashed Stitch Lines on lower body
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(16, 172, 230, 72);

    // Doors section
    ctx.strokeRect(260, 48, 115, 196);
    ctx.strokeRect(385, 48, 115, 196);
    ctx.setLineDash([]);

    // Shield Stencil on passenger door
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(302, 140); ctx.lineTo(332, 140);
    ctx.lineTo(332, 170); ctx.quadraticCurveTo(317, 195, 317, 200);
    ctx.quadraticCurveTo(317, 195, 302, 170);
    ctx.closePath();
    ctx.fill();

    // Pitcher Stencil on driver door
    ctx.beginPath();
    ctx.arc(442, 150, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(436, 158); ctx.lineTo(448, 158);
    ctx.lineTo(454, 185); ctx.lineTo(430, 185);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(432, 185, 20, 4);

    const texture = new THREE.CanvasTexture(cv);
    texture.minFilter = THREE.LinearFilter;
    sharedCngDecalTexture = texture;
    return sharedCngDecalTexture;
  }
  function getCngSideDecalTexture() {
    return getCNGSideTexture();
  }

  function getCNGAlponaTexture() {
    if (sharedCngAlponaTexture) return sharedCngAlponaTexture;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.0;
    const scallops = 20;
    const sW = 512 / scallops;
    ctx.beginPath();
    for (let i = 0; i < scallops; i++) {
      ctx.arc(i * sW + sW / 2, 28, sW / 2, Math.PI, 0, true);
    }
    ctx.stroke();

    for (let i = 0; i < scallops; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(i * sW + sW / 2, 18, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawAlponaVine(cx, cy, scale, flip) {
      ctx.save();
      ctx.translate(cx, cy);
      if (flip) ctx.scale(-1, 1);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(40 * scale, -25 * scale, 65 * scale, 30 * scale, 110 * scale, -10 * scale);
      ctx.stroke();

      const lColors = ['#ffffff', '#fef08a', '#86efac'];
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        const lx = t * 100 * scale;
        const ly = Math.sin(t * Math.PI) * 20 * scale;
        ctx.fillStyle = lColors[i % lColors.length];
        ctx.beginPath();
        ctx.ellipse(lx, ly, 12 * scale, 5 * scale, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawAlponaVine(256, 120, 1.2, false);
    drawAlponaVine(256, 120, 1.2, true);
    drawAlponaVine(256, 360, 1.2, false);
    drawAlponaVine(256, 360, 1.2, true);

    // Central Mandala
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4.0;
    ctx.beginPath(); ctx.arc(256, 240, 105, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(256, 240, 92, 0, Math.PI * 2); ctx.stroke();

    const petals = 16;
    for (let p = 0; p < petals; p++) {
      const ang = (p * Math.PI * 2) / petals;
      ctx.save();
      ctx.translate(256, 240);
      ctx.rotate(ang);
      ctx.fillStyle = (p % 2 === 0) ? '#fef08a' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 52, 9, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, 24, 5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(256, 240, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(256, 240, 8, 0, Math.PI * 2); ctx.fill();

    // BRTA License Plate
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(80, 410, 352, 70);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(80, 410, 352, 70);

    ctx.fillStyle = '#059669';
    ctx.beginPath(); ctx.arc(120, 445, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(118, 445, 10, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DHAKA METRO - THA', 270, 432);
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.fillText('11-2468', 270, 460);

    const texture = new THREE.CanvasTexture(cv);
    texture.minFilter = THREE.LinearFilter;
    sharedCngAlponaTexture = texture;
    return sharedCngAlponaTexture;
  }

  let sharedRickshawArtTexture = null;
  function getRickshawArtTexture() {
    if (sharedRickshawArtTexture) return sharedRickshawArtTexture;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.35, '#1e1b4b');
    grad.addColorStop(0.70, '#831843');
    grad.addColorStop(1, '#db2777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    function drawScallopBorder(inset, r, c1, c2) {
      ctx.fillStyle = c1;
      ctx.strokeStyle = c2;
      ctx.lineWidth = 2.2;
      const step = r * 1.85;
      for (let x = inset; x <= 512 - inset; x += step) {
        ctx.beginPath(); ctx.arc(x, inset, r, 0, Math.PI); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, 512 - inset, r, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      for (let y = inset; y <= 512 - inset; y += step) {
        ctx.beginPath(); ctx.arc(inset, y, r, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(512 - inset, y, r, Math.PI / 2, Math.PI * 1.5); ctx.fill(); ctx.stroke();
      }
    }
    drawScallopBorder(14, 11, '#facc15', '#dc2626');
    drawScallopBorder(28, 7, '#38bdf8', '#ffffff');

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(38, 38, 436, 436);

    function drawCornerLotus(cx, cy, rot) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      const pColors = ['#f43f5e', '#ec4899', '#fbbf24', '#34d399'];
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 6);
        ctx.fillStyle = pColors[i];
        ctx.beginPath();
        ctx.ellipse(20, 0, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    drawCornerLotus(48, 48, 0);
    drawCornerLotus(464, 48, Math.PI / 2);
    drawCornerLotus(464, 464, Math.PI);
    drawCornerLotus(48, 464, -Math.PI / 2);

    // Stylized Mayur (Peacock)
    ctx.save();
    ctx.translate(256, 225);
    const feathers = 18;
    for (let f = 0; f < feathers; f++) {
      const ang = Math.PI + (f * Math.PI) / (feathers - 1);
      const fx = Math.cos(ang) * 115;
      const fy = Math.sin(ang) * 100;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = f % 2 === 0 ? '#10b981' : '#06b6d4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(0, -8, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath(); ctx.arc(0, -8, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#0284c7';
    ctx.beginPath(); ctx.ellipse(0, 28, 34, 42, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(-9, 18);
    ctx.quadraticCurveTo(-22, -22, -11, -44);
    ctx.quadraticCurveTo(-5, -58, 6, -53);
    ctx.quadraticCurveTo(8, -32, 11, 18);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-11, -48); ctx.lineTo(-22, -46); ctx.lineTo(-9, -40); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-3, -46, 3.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(-3, -46, 1.9, 0, Math.PI * 2); ctx.fill();

    for (let c = -1; c <= 1; c++) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(c * 11, -70); ctx.stroke();
      ctx.fillStyle = '#ec4899';
      ctx.beginPath(); ctx.arc(c * 11, -72, 3.8, 0, Math.PI * 2); ctx.fill();
    }

    const lColors = ['#f43f5e', '#fb7185', '#facc15'];
    for (let layer = 0; layer < 3; layer++) {
      const petals = 7;
      ctx.fillStyle = lColors[layer];
      for (let p = 0; p < petals; p++) {
        const pAng = (p - (petals - 1) / 2) * 0.28;
        ctx.save();
        ctx.translate(0, 68 + layer * 6);
        ctx.rotate(pAng);
        ctx.beginPath();
        ctx.ellipse(0, 24 - layer * 5, 13 - layer * 2, 30 - layer * 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(65, 415, 382, 54);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(65, 415, 382, 54);

    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ঢাকা রিকশা আর্ট', 256, 442);

    const texture = new THREE.CanvasTexture(cv);
    texture.minFilter = THREE.LinearFilter;
    sharedRickshawArtTexture = texture;
    return sharedRickshawArtTexture;
  }

  '''

content = content[:old_tex_start] + new_textures + content[old_tex_end:]

# 2. Insert vehicle factories right before create3DVehicle
c3d_marker = '  function create3DVehicle(type, colorHex, appearanceId, vData) {'
c3d_pos = content.find(c3d_marker)
if c3d_pos == -1:
    print('ERROR: could not find create3DVehicle')
    sys.exit(1)

vehicle_factories = '''  // ---------------------------------------------------------------------------
  // Authentic Dhaka Cycle Rickshaw & CNG Auto-Rickshaw Factories (Pure Three.js)
  // ---------------------------------------------------------------------------
  function createSmoothBoneSegment(p0, p1, r0, r1, material) {
    const v0 = new THREE.Vector3(p0[0], p0[1], p0[2]);
    const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const dir = new THREE.Vector3().subVectors(v1, v0);
    const len = dir.length();
    if (len < 0.0001) return new THREE.Group();

    const geom = new THREE.CylinderGeometry(r1, r0, len, 12);
    geom.translate(0, len / 2, 0);

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.copy(v0);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.castShadow = true;
    return mesh;
  }

  function createOrganicTorso(stations, material) {
    const points = stations.map(s => new THREE.Vector3(s.x, s.y, s.z));
    const curve = new THREE.CatmullRomCurve3(points);
    const numSteps = 16;
    const radSteps = 12;

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const pt = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      const sIdx = Math.min(stations.length - 2, Math.floor(t * (stations.length - 1)));
      const frac = (t * (stations.length - 1)) - sIdx;
      const rx = THREE.MathUtils.lerp(stations[sIdx].rx, stations[sIdx + 1].rx, frac);
      const rz = THREE.MathUtils.lerp(stations[sIdx].rz, stations[sIdx + 1].rz, frac);

      let normal = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.y) > 0.95) normal.set(1, 0, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      normal.crossVectors(binormal, tangent).normalize();

      for (let j = 0; j <= radSteps; j++) {
        const theta = (j / radSteps) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const offset = new THREE.Vector3()
          .addScaledVector(normal, cos * rx)
          .addScaledVector(binormal, sin * rz);
        const v = new THREE.Vector3().addVectors(pt, offset);
        positions.push(v.x, v.y, v.z);

        const norm = offset.clone().normalize();
        normals.push(norm.x, norm.y, norm.z);
        uvs.push(j / radSteps, t);
      }
    }

    for (let i = 0; i < numSteps; i++) {
      for (let j = 0; j < radSteps; j++) {
        const a = i * (radSteps + 1) + j;
        const b = (i + 1) * (radSteps + 1) + j;
        const c = (i + 1) * (radSteps + 1) + (j + 1);
        const d = i * (radSteps + 1) + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true;
    return mesh;
  }

  function createSculptedHumanHead(skinMat, hairMat, options = {}) {
    const headGroup = new THREE.Group();

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), skinMat);
    cranium.scale.set(0.88, 1.05, 0.92);
    headGroup.add(cranium);

    const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.45, 10), skinMat);
    jaw.position.set(0.16, -0.46, 0);
    jaw.rotation.z = -0.22;
    headGroup.add(jaw);

    if (!options.isVeiled) {
      const hairGeom = new THREE.SphereGeometry(0.75, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52);
      const hair = new THREE.Mesh(hairGeom, hairMat);
      hair.scale.set(0.92, 1.08, 0.96);
      hair.position.set(-0.02, 0.08, 0);
      headGroup.add(hair);

      [-0.66, 0.66].forEach(sz => {
        const sburn = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.30, 0.08), hairMat);
        sburn.position.set(0.05, -0.15, sz);
        headGroup.add(sburn);
      });
    }

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.23, 0.23].forEach(side => {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), eyeWhiteMat);
      eyeW.scale.set(0.5, 0.9, 1.2);
      eyeW.position.set(0.60, 0.08, side);
      headGroup.add(eyeW);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), hairMat);
      iris.position.set(0.66, 0.08, side);
      headGroup.add(iris);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.030, 0.23), hairMat);
      brow.position.set(0.62, 0.20, side);
      brow.rotation.z = -0.15;
      headGroup.add(brow);

      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
      ear.scale.set(0.6, 1.2, 0.35);
      ear.position.set(-0.08, 0.02, side * 0.70);
      headGroup.add(ear);
    });

    const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 8), skinMat);
    noseBridge.rotation.z = -Math.PI / 2 + 0.15;
    noseBridge.position.set(0.66, 0.0, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    noseTip.position.set(0.72, -0.07, 0);
    headGroup.add(noseTip);

    const lipMat = new THREE.MeshStandardMaterial({ color: 0x9f513b, roughness: 0.6 });
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.28), lipMat);
    lips.position.set(0.62, -0.23, 0);
    headGroup.add(lips);

    if (options.mustache) {
      const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 8), hairMat);
      stache.rotation.x = Math.PI / 2;
      stache.position.set(0.68, -0.15, 0);
      headGroup.add(stache);
    }

    if (options.bindi) {
      const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      bindi.position.set(0.66, 0.24, 0);
      headGroup.add(bindi);
    }

    return headGroup;
  }

  function createRealisticDhakaRickshaw(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();
    group.userData.wheels = [];
    group.userData.wheelRadius = 4.1;

    const tubPalette = [0x14b8a6, 0x0284c7, 0x059669, 0xb91c1c];
    const tubColor = colorHex || tubPalette[Math.abs(appearanceSeed || 0) % tubPalette.length];

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.95 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const tealTubMat = new THREE.MeshStandardMaterial({ color: tubColor, roughness: 0.35, metalness: 0.15 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 });
    const seatRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45, metalness: 0.1 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });

    const hoodArtMat = new THREE.MeshStandardMaterial({
      map: getRickshawArtTexture(),
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    function buildRickshawWheel(pos) {
      const wGroup = new THREE.Group();
      wGroup.position.set(pos[0], pos[1], pos[2]);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.38, 12, 32), rubberMat);
      tire.castShadow = true;
      wGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(3.72, 0.09, 8, 32), chromeMat);
      wGroup.add(rim);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.65, 12), chromeMat);
      hub.rotation.x = Math.PI / 2;
      wGroup.add(hub);

      const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.75, 10), goldTrimMat);
      hubCap.rotation.x = Math.PI / 2;
      wGroup.add(hubCap);

      const spokeCount = 24;
      for (let i = 0; i < spokeCount; i++) {
        const ang = (i * Math.PI * 2) / spokeCount;
        const rimPt = [Math.cos(ang) * 3.65, Math.sin(ang) * 3.65, (i % 2 === 0 ? 0.22 : -0.22)];
        const hubPt = [0, 0, (i % 2 === 0 ? 0.28 : -0.28)];
        wGroup.add(createSmoothBoneSegment(hubPt, rimPt, 0.035, 0.035, chromeMat));
      }

      group.userData.wheels.push(wGroup);
      group.add(wGroup);
      return wGroup;
    }

    buildRickshawWheel([10.5, 4.1, 0]);
    buildRickshawWheel([-7.8, 4.1, -7.3]);
    buildRickshawWheel([-7.8, 4.1, 7.3]);

    // Mudguards
    [-1, 1].forEach(side => {
      const guardPts = [];
      const mgRadius = 4.75;
      const cx = -7.8, cy = 4.1, cz = side * 7.3;
      for (let a = 0; a <= 16; a++) {
        const rad = Math.PI * a / 16;
        guardPts.push(new THREE.Vector3(cx + Math.cos(rad) * mgRadius, cy + Math.sin(rad) * mgRadius, cz));
      }
      const curve = new THREE.CatmullRomCurve3(guardPts);
      const mudguard = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.52, 8, false), new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.35,
        metalness: 0.2
      }));
      mudguard.castShadow = true;
      group.add(mudguard);

      group.add(createSmoothBoneSegment([cx, cy, cz + side * 0.4], [cx - 2.8, cy + 3.4, cz], 0.12, 0.12, chromeMat));
      group.add(createSmoothBoneSegment([cx, cy, cz + side * 0.4], [cx + 2.8, cy + 3.4, cz], 0.12, 0.12, chromeMat));
    });

    const fGuardPts = [];
    for (let a = 0; a <= 12; a++) {
      const rad = Math.PI * (0.2 + 0.6 * a / 12);
      fGuardPts.push(new THREE.Vector3(10.5 + Math.cos(rad) * 4.65, 4.1 + Math.sin(rad) * 4.65, 0));
    }
    const fCurve = new THREE.CatmullRomCurve3(fGuardPts);
    const fMudguard = new THREE.Mesh(new THREE.TubeGeometry(fCurve, 16, 0.46, 8, false), chromeMat);
    group.add(fMudguard);

    // Authentic Bicycle Frame (double top tubes, diagonal stays, NO horizontal floating beam)
    const forkCrown = [9.2, 8.4, 0];
    const bottomBracket = [1.35, 3.3, 0];
    const saddlePost = [0.8, 5.8, 0];
    const handleStem = [6.8, 9.4, 0];

    // Front Fork
    group.add(createSmoothBoneSegment([10.5, 4.1, -0.6], forkCrown, 0.32, 0.28, chromeMat));
    group.add(createSmoothBoneSegment([10.5, 4.1, 0.6], forkCrown, 0.32, 0.28, chromeMat));
    group.add(createSmoothBoneSegment(forkCrown, handleStem, 0.38, 0.38, steelMat));

    // Double horizontal top tubes (Picture 3 match)
    group.add(createSmoothBoneSegment([7.0, 8.6, 0], [0.8, 6.0, 0], 0.26, 0.26, steelMat));
    group.add(createSmoothBoneSegment([7.1, 7.8, 0], [0.9, 5.2, 0], 0.26, 0.26, steelMat));

    // Down tube & Seat tube
    group.add(createSmoothBoneSegment([7.0, 7.8, 0], bottomBracket, 0.32, 0.32, steelMat));
    group.add(createSmoothBoneSegment(saddlePost, bottomBracket, 0.32, 0.32, steelMat));

    // Stays cleanly connecting down to rear axle under the chassis (Picture 3 match)
    group.add(createSmoothBoneSegment(bottomBracket, [-7.8, 4.1, 0], 0.36, 0.36, steelMat));
    group.add(createSmoothBoneSegment(bottomBracket, [-7.8, 4.1, -5.5], 0.30, 0.30, steelMat));
    group.add(createSmoothBoneSegment(bottomBracket, [-7.8, 4.1, 5.5], 0.30, 0.30, steelMat));
    group.add(createSmoothBoneSegment([0.8, 5.2, 0], [-6.5, 4.6, -3.5], 0.28, 0.28, steelMat));
    group.add(createSmoothBoneSegment([0.8, 5.2, 0], [-6.5, 4.6, 3.5], 0.28, 0.28, steelMat));

    // Rear Axle Bar
    group.add(createSmoothBoneSegment([-7.8, 4.1, -7.3], [-7.8, 4.1, 7.3], 0.42, 0.42, chromeMat));

    // Natural swept-back cruiser handlebars within puller reach
    const gripL = [4.6, 8.8, -2.1];
    const gripR = [4.6, 8.8, 2.1];
    group.add(createSmoothBoneSegment(handleStem, [5.8, 9.2, -1.8], 0.22, 0.22, chromeMat));
    group.add(createSmoothBoneSegment([5.8, 9.2, -1.8], gripL, 0.22, 0.22, chromeMat));
    group.add(createSmoothBoneSegment(handleStem, [5.8, 9.2, 1.8], 0.22, 0.22, chromeMat));
    group.add(createSmoothBoneSegment([5.8, 9.2, 1.8], gripR, 0.22, 0.22, chromeMat));

    // Chrome Bell & Vintage Bucket Headlight
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), goldTrimMat);
    bell.position.set(5.5, 9.4, -1.6);
    group.add(bell);

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

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 2.2), rubberMat);
    saddle.position.set(0.8, 6.1, 0);
    group.add(saddle);

    // Crankset & Pedals
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

    // PASSENGER CARRIAGE TUB (Picture 3 match)
    const tubPts = [
      new THREE.Vector2(-12.8, 5.8),
      new THREE.Vector2(-3.6, 5.8),
      new THREE.Vector2(-3.6, 8.2),
      new THREE.Vector2(-6.2, 9.4),
      new THREE.Vector2(-12.8, 9.4)
    ];
    const tubShape = new THREE.Shape(tubPts);
    const tubGeo = new THREE.ExtrudeGeometry(tubShape, {
      depth: 14.8,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.45,
      bevelThickness: 0.45
    });
    tubGeo.translate(0, 0, -7.4);
    const tub = new THREE.Mesh(tubGeo, tealTubMat);
    tub.castShadow = true;
    group.add(tub);

    const footboard = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 14.0), woodFloorMat);
    footboard.position.set(-2.2, 5.2, 0);
    footboard.castShadow = true;
    group.add(footboard);

    [-1, 1].forEach(side => {
      const sideRail = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.35, 0.45), goldTrimMat);
      sideRail.position.set(-8.0, 9.4, side * 7.8);
      group.add(sideRail);

      const armPts = [
        new THREE.Vector3(-12.2, 9.4, side * 7.8),
        new THREE.Vector3(-7.8, 11.2, side * 7.8),
        new THREE.Vector3(-3.8, 9.4, side * 7.8)
      ];
      const armCurve = new THREE.CatmullRomCurve3(armPts);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 14, 0.24, 8, false), chromeMat));
    });

    const benchPad = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.1, 14.2), tealTubMat);
    benchPad.position.set(-7.5, 8.9, 0);
    group.add(benchPad);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.2, 14.2), seatRedMat);
    backrest.position.set(-11.8, 11.4, 0);
    backrest.castShadow = true;
    group.add(backrest);

    for (let bx = -6; bx <= 6; bx += 3) {
      for (let by = 9.8; by <= 13.0; by += 1.5) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), goldTrimMat);
        stud.position.set(-11.15, by, bx);
        group.add(stud);
      }
    }

    // Backboard Tinplate Art
    const backboard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.5, 14.8), hoodArtMat);
    backboard.position.set(-12.6, 7.4, 0);
    backboard.castShadow = true;
    group.add(backboard);

    // Folding Canopy Hood (Picture 3 match)
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

    for (let r = 0; r <= 5; r++) {
      const ru = r / 5;
      const rang = Math.PI * (0.05 + 0.90 * ru);
      const rx = canopyCenterX + Math.cos(rang) * canopyRx;
      const ry = canopyBaseY + Math.sin(rang) * canopyRy;
      const ribPts = [new THREE.Vector3(rx, ry, -canopyWidth), new THREE.Vector3(rx, ry, canopyWidth)];
      group.add(createSmoothBoneSegment(ribPts[0].toArray(), ribPts[1].toArray(), 0.16, 0.16, chromeMat));
    }

    // Golden Fringe Tassels
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

    // RICKSHAW PULLER (Picture 3 match)
    const pullerGroup = new THREE.Group();
    const pullerSkinMat = new THREE.MeshStandardMaterial({ color: 0x9a5b3a, roughness: 0.72 });
    const pullerHairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const shirtPalette = [0x581c87, 0x0284c7, 0x15803d, 0xd97706];
    const shirtColor = shirtPalette[Math.abs(appearanceSeed || 0) % shirtPalette.length];
    const pullerShirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.65 });
    const pullerLungiMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.75 });
    const pullerGamchaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });

    const pullerTorso = createOrganicTorso([
      { x: 0.8, y: 6.0, z: 0, rx: 1.1, rz: 1.3 },
      { x: 1.2, y: 6.8, z: 0, rx: 1.15, rz: 1.4 },
      { x: 1.7, y: 7.7, z: 0, rx: 1.25, rz: 1.55 },
      { x: 2.1, y: 8.4, z: 0, rx: 1.1, rz: 1.45 },
      { x: 2.4, y: 8.8, z: 0, rx: 0.55, rz: 0.55 }
    ], pullerShirtMat);
    pullerGroup.add(pullerTorso);

    // Red Gamcha draped over shoulder
    const gamchaPts = [
      new THREE.Vector3(1.3, 7.3, 1.25),
      new THREE.Vector3(2.0, 8.4, 1.35),
      new THREE.Vector3(2.4, 7.7, 1.15),
      new THREE.Vector3(2.5, 6.4, 0.8)
    ];
    const gamchaCurve = new THREE.CatmullRomCurve3(gamchaPts);
    const gamchaMesh = new THREE.Mesh(new THREE.TubeGeometry(gamchaCurve, 16, 0.32, 8, false), pullerGamchaMat);
    pullerGroup.add(gamchaMesh);

    const pullerHead = createSculptedHumanHead(pullerSkinMat, pullerHairMat, { mustache: true });
    pullerHead.position.set(2.7, 9.6, 0);
    pullerGroup.add(pullerHead);

    // Articulated Arms with natural bent elbows gripping bars
    [-1, 1].forEach(side => {
      const shPos = [2.1, 8.4, side * 1.35];
      const elbPos = [3.4, 7.8, side * 1.8];
      const handPos = [gripL[0], gripL[1], side * Math.abs(gripL[2])];

      const shCap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), pullerShirtMat);
      shCap.position.set(shPos[0], shPos[1], shPos[2]);
      pullerGroup.add(shCap);

      pullerGroup.add(createSmoothBoneSegment(shPos, elbPos, 0.44, 0.36, pullerShirtMat));
      pullerGroup.add(createSmoothBoneSegment(elbPos, handPos, 0.36, 0.30, pullerSkinMat));

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), pullerSkinMat);
      hand.position.set(handPos[0], handPos[1], handPos[2]);
      pullerGroup.add(hand);
    });

    // Lungi Waist Wrap (Tapered cylinder with pleats, Picture 3 match)
    const lungiWrap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 1.6, 16), pullerLungiMat);
    lungiWrap.rotation.z = -0.18;
    lungiWrap.position.set(0.85, 5.7, 0);
    pullerGroup.add(lungiWrap);

    const lungiPleat = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.16, 8, 16), pullerLungiMat);
    lungiPleat.rotation.x = Math.PI / 2;
    lungiPleat.position.set(0.85, 5.1, 0);
    pullerGroup.add(lungiPleat);

    // Pedaling legs synchronized with crank
    const pullerLegs = [];
    const lenThigh = 1.95;
    const lenShin = 1.95;
    const hipX = 0.8, hipY = 5.6;
    const crankPivotX = bottomBracket[0], crankPivotY = bottomBracket[1];
    const crankR = 1.15;

    [-1, 1].forEach(side => {
      const legData = {
        side: side,
        hipZ: side * 0.95,
        thigh: new THREE.Group(),
        kneeCap: new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), pullerSkinMat),
        shin: new THREE.Group(),
        foot: new THREE.Group()
      };

      // Upper thigh covered by lungi cloth (Picture 3 match)
      const lungiThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.44, lenThigh * 0.75, 12), pullerLungiMat);
      lungiThigh.translateY(lenThigh * 0.375);
      legData.thigh.add(lungiThigh);

      // Lower thigh skin above knee
      const thighSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.36, lenThigh * 0.30, 12), pullerSkinMat);
      thighSkin.translateY(lenThigh * 0.85);
      legData.thigh.add(thighSkin);

      // Bare shin & calf
      const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, lenShin, 12), pullerSkinMat);
      shinMesh.translateY(lenShin / 2);
      legData.shin.add(shinMesh);

      // Sandal with sole and leather straps (Picture 3 match)
      const sandalSole = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 0.72), rubberMat);
      sandalSole.position.set(0.1, 0, 0);
      legData.foot.add(sandalSole);

      const strapMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const sandalStrap = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 6, 12, Math.PI), strapMat);
      sandalStrap.position.set(0.15, 0.18, 0);
      legData.foot.add(sandalStrap);

      pullerGroup.add(legData.thigh);
      pullerGroup.add(legData.kneeCap);
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
        // Positive alpha enforces forward knee bend
        const thighAng = baseAng + Math.abs(alpha);

        const kneeX = hipX + lenThigh * Math.cos(thighAng);
        const kneeY = hipY + lenThigh * Math.sin(thighAng);

        leg.thigh.position.set(hipX, hipY, leg.hipZ);
        leg.thigh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(kneeX - hipX, kneeY - hipY, 0).normalize());

        leg.kneeCap.position.set(kneeX, kneeY, leg.hipZ);

        leg.shin.position.set(kneeX, kneeY, leg.hipZ);
        leg.shin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(pedalX - kneeX, pedalY - kneeY, 0).normalize());

        leg.foot.position.set(pedalX, pedalY, leg.hipZ);
      });
    }

    group.add(pullerGroup);
    group.userData.updatePedaling = updatePullerPedaling;
    updatePullerPedaling(0);

    // TWO SEATED PASSENGERS (Picture 3 Match)
    // 1. Lady in Saffron Saree with Veil (Right side, +Z)
    const ladyGroup = new THREE.Group();
    ladyGroup.position.set(-7.8, 9.2, 3.2);

    const sareePalette = [0xd97706, 0xbe185d, 0x0d9488, 0x047857];
    const sareeColor = sareePalette[Math.abs((appearanceSeed || 0) + 1) % sareePalette.length];
    const sareeMat = new THREE.MeshStandardMaterial({ color: sareeColor, roughness: 0.65 });
    const sareeBorderMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45, metalness: 0.3 });
    const ladySkinMat = new THREE.MeshStandardMaterial({ color: 0xb5734e, roughness: 0.75 });

    const ladyTorso = createOrganicTorso([
      { x: 0, y: 0.2, z: 0, rx: 0.95, rz: 1.15 },
      { x: 0, y: 1.2, z: 0, rx: 1.05, rz: 1.25 },
      { x: 0, y: 2.2, z: 0, rx: 0.95, rz: 1.20 },
      { x: 0.1, y: 2.8, z: 0, rx: 0.42, rz: 0.42 }
    ], sareeMat);
    ladyGroup.add(ladyTorso);

    const palluPts = [
      new THREE.Vector3(0.3, 0.4, 0.8),
      new THREE.Vector3(0.5, 1.6, 0.2),
      new THREE.Vector3(0.4, 2.4, -0.7),
      new THREE.Vector3(0.1, 2.7, -0.9)
    ];
    const palluCurve = new THREE.CatmullRomCurve3(palluPts);
    ladyGroup.add(new THREE.Mesh(new THREE.TubeGeometry(palluCurve, 16, 0.36, 8, false), sareeBorderMat));

    const ladyHead = createSculptedHumanHead(ladySkinMat, pullerHairMat, { isVeiled: true, bindi: true });
    ladyHead.position.set(0.1, 3.2, 0);
    ladyGroup.add(ladyHead);

    // Draped saree aanchal over crown/back of head
    const ladyVeil = new THREE.Mesh(
      new THREE.SphereGeometry(0.80, 16, 14, -Math.PI * 0.45, Math.PI * 0.90, 0, Math.PI * 0.65),
      sareeMat
    );
    ladyVeil.position.set(-0.06, 3.25, 0);
    ladyGroup.add(ladyVeil);

    // Saree lap strictly inside carriage tub
    const ladyLap = createOrganicTorso([
      { x: 0.1, y: 0.3, z: 0, rx: 1.10, rz: 1.20 },
      { x: 1.0, y: 0.1, z: 0, rx: 1.05, rz: 1.15 },
      { x: 1.8, y: -0.8, z: 0, rx: 0.90, rz: 1.05 },
      { x: 2.0, y: -2.4, z: 0, rx: 0.80, rz: 0.95 }
    ], sareeMat);
    ladyGroup.add(ladyLap);

    ladyGroup.add(createSmoothBoneSegment([0.3, 2.4, -0.9], [1.3, 1.1, -0.3], 0.28, 0.22, sareeMat));
    ladyGroup.add(createSmoothBoneSegment([0.3, 2.4, 0.9], [1.3, 1.1, 0.3], 0.28, 0.22, sareeMat));
    const ladyHands = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), ladySkinMat);
    ladyHands.position.set(1.4, 1.0, 0);
    ladyGroup.add(ladyHands);

    group.add(ladyGroup);

    // 2. Gentleman in Royal Violet Panjabi (Left side, -Z)
    const gentGroup = new THREE.Group();
    gentGroup.position.set(-7.8, 9.2, -3.2);

    const panjabiMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.65 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });

    const gentTorso = createOrganicTorso([
      { x: 0, y: 0.2, z: 0, rx: 1.05, rz: 1.25 },
      { x: 0, y: 1.3, z: 0, rx: 1.15, rz: 1.35 },
      { x: 0, y: 2.3, z: 0, rx: 1.05, rz: 1.30 },
      { x: 0.1, y: 2.9, z: 0, rx: 0.46, rz: 0.46 }
    ], panjabiMat);
    gentGroup.add(gentTorso);

    const gentHead = createSculptedHumanHead(pullerSkinMat, pullerHairMat, { mustache: true });
    gentHead.position.set(0.1, 3.35, 0);
    gentGroup.add(gentHead);

    const gentLap = createOrganicTorso([
      { x: 0.1, y: 0.3, z: 0, rx: 1.10, rz: 1.20 },
      { x: 1.0, y: 0.1, z: 0, rx: 1.05, rz: 1.15 },
      { x: 1.8, y: -0.8, z: 0, rx: 0.90, rz: 1.05 },
      { x: 2.0, y: -2.4, z: 0, rx: 0.80, rz: 0.95 }
    ], pantMat);
    gentGroup.add(gentLap);

    // Left arm resting on chrome side rail, right arm on lap
    gentGroup.add(createSmoothBoneSegment([0.2, 2.5, -1.0], [0.5, 1.4, -2.4], 0.32, 0.26, panjabiMat));
    const gentHandL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), pullerSkinMat);
    gentHandL.position.set(0.6, 1.3, -2.5);
    gentGroup.add(gentHandL);

    gentGroup.add(createSmoothBoneSegment([0.2, 2.5, 1.0], [1.3, 1.1, 0.3], 0.32, 0.26, panjabiMat));
    const gentHandR = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), pullerSkinMat);
    gentHandR.position.set(1.4, 1.0, 0.3);
    gentGroup.add(gentHandR);

    group.add(gentGroup);

    return group;
  }

  function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();
    group.userData.wheels = [];
    group.userData.wheelRadius = 3.2;

    const cngGreenMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      roughness: 0.28,
      metalness: 0.32
    });
    const yellowBandMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.1 });
    const redBandMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const softTopMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.88 });
    const chromeGrillMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.18, metalness: 0.90 });
    const cageGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35, metalness: 0.25 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const steelRimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8f0f8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      transmission: 0.85,
      ior: 1.5
    });

    const sideLiveryMat = new THREE.MeshStandardMaterial({
      map: getCNGSideTexture(),
      roughness: 0.35,
      metalness: 0.2
    });

    const alponaMat = new THREE.MeshStandardMaterial({
      map: getCNGAlponaTexture(),
      roughness: 0.35,
      metalness: 0.25
    });

    function buildCNGWheel(pos) {
      const w = new THREE.Group();
      w.position.set(pos[0], pos[1], pos[2]);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.75, 12, 28), rubberMat);
      tire.castShadow = true;
      w.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 1.2, 16), steelRimMat);
      rim.rotation.x = Math.PI / 2;
      w.add(rim);

      // Yellow Hub Accent Ring (Picture 4 match)
      const hubRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.14, 8, 16), yellowBandMat);
      w.add(hubRing);

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

    // Tapered Chassis Floor (Narrower at front wheel)
    const floorPts = [
      new THREE.Vector2(-13.8, -7.8),
      new THREE.Vector2(2.0, -7.8),
      new THREE.Vector2(11.0, -2.8),
      new THREE.Vector2(11.0, 2.8),
      new THREE.Vector2(2.0, 7.8),
      new THREE.Vector2(-13.8, 7.8)
    ];
    const floorShape = new THREE.Shape(floorPts);
    const floorGeo = new THREE.ExtrudeGeometry(floorShape, { depth: 2.2, bevelEnabled: false });
    floorGeo.rotateX(Math.PI / 2);
    floorGeo.translate(0, 3.8, 0);
    const floorMesh = new THREE.Mesh(floorGeo, cngGreenMat);
    floorMesh.castShadow = true;
    group.add(floorMesh);

    // Curved Front Mudguard with pointed nose cowl (Picture 4 Match)
    const frontMudguard = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 3.2, 16, 1, false, 0, Math.PI),
      cngGreenMat
    );
    frontMudguard.rotation.z = Math.PI;
    frontMudguard.rotation.x = Math.PI / 2;
    frontMudguard.position.set(10.5, 3.6, 0);
    group.add(frontMudguard);

    // Pointed Front Nose Cowl with Chrome Headlight (Picture 4 Match)
    const noseCowl = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 12), cngGreenMat);
    noseCowl.rotation.z = -Math.PI / 2;
    noseCowl.position.set(12.8, 4.6, 0);
    group.add(noseCowl);

    const lampRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.20, 8, 20), chromeGrillMat);
    lampRim.rotation.y = Math.PI / 2;
    lampRim.position.set(14.2, 4.6, 0);
    group.add(lampRim);

    const lampLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.92, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xffedd5, emissiveIntensity: 0.85, roughness: 0.1 })
    );
    lampLight.scale.set(0.3, 1.0, 1.0);
    lampLight.position.set(14.3, 4.6, 0);
    group.add(lampLight);

    // Tapered Front Nose Apron
    const apronPts = [
      new THREE.Vector2(5.5, 4.8),
      new THREE.Vector2(11.8, 6.2),
      new THREE.Vector2(10.8, 10.2),
      new THREE.Vector2(7.2, 11.2),
      new THREE.Vector2(5.5, 11.0)
    ];
    const apronShape = new THREE.Shape(apronPts);
    const apronGeo = new THREE.ExtrudeGeometry(apronShape, {
      depth: 13.8,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.6,
      bevelThickness: 0.6
    });
    apronGeo.translate(0, 0, -6.9);
    const apronMesh = new THREE.Mesh(apronGeo, cngGreenMat);
    apronMesh.castShadow = true;
    group.add(apronMesh);

    // Under-windshield Accent Stripes (Yellow + Red, Picture 4 Match) - Visible on nose exterior
    const stripeYellow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 13.6), yellowBandMat);
    stripeYellow.position.set(11.2, 9.8, 0);
    group.add(stripeYellow);

    const stripeRed = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 13.6), redBandMat);
    stripeRed.position.set(11.4, 9.2, 0);
    group.add(stripeRed);

    // Rear Passenger Cabin Cowling
    const rearCabin = new THREE.Mesh(new THREE.BoxGeometry(16.5, 8.8, 16.2), cngGreenMat);
    rearCabin.position.set(-5.2, 8.2, 0);
    rearCabin.castShadow = true;
    group.add(rearCabin);

    // Rear Engine Cowl Plate with Alpona & License Plate (Picture 4 Match)
    const cowlPlate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 8.4, 15.6), alponaMat);
    cowlPlate.position.set(-13.5, 8.2, 0);
    cowlPlate.castShadow = true;
    group.add(cowlPlate);

    // Side Livery Panels ("★ FOR HIRE ★" / "ONE PARIBAHAN")
    [-1, 1].forEach(side => {
      const sideLivery = new THREE.Mesh(new THREE.BoxGeometry(16.0, 7.8, 0.35), sideLiveryMat);
      sideLivery.position.set(-5.2, 8.2, side * 8.18);
      if (side < 0) sideLivery.rotation.y = Math.PI;
      group.add(sideLivery);
    });

    // Soft-Top Roof with Longitudinal Seam Ribs
    const roofPts = [
      new THREE.Vector2(-13.8, 12.6),
      new THREE.Vector2(6.8, 12.6),
      new THREE.Vector2(8.8, 13.8),
      new THREE.Vector2(5.2, 17.0),
      new THREE.Vector2(-13.8, 16.8)
    ];
    const roofShape = new THREE.Shape(roofPts);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
      depth: 16.4,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.5,
      bevelThickness: 0.5
    });
    roofGeo.translate(0, 0, -8.2);
    const roofMesh = new THREE.Mesh(roofGeo, softTopMat);
    roofMesh.castShadow = true;
    group.add(roofMesh);

    [-4.0, 0, 4.0].forEach(rz => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.35, 0.45), yellowBandMat);
      rib.position.set(-3.5, 17.15, rz);
      group.add(rib);
    });

    const visorBrow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 16.6), cngGreenMat);
    visorBrow.position.set(7.5, 14.1, 0);
    group.add(visorBrow);

    // Angled Windshield Glass
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.65, 5.8, 14.8), glassMat);
    windshield.rotation.z = -0.28;
    windshield.position.set(8.4, 11.0, 0);
    group.add(windshield);

    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.35, 15.2), rubberMat);
    winFrame.rotation.z = -0.28;
    winFrame.position.set(8.4, 13.8, 0);
    group.add(winFrame);

    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 0.18), chromeGrillMat);
    wiper.rotation.z = 0.45;
    wiper.position.set(8.9, 10.8, 0);
    group.add(wiper);

    // Side Mirrors on stalks
    [-1, 1].forEach(side => {
      group.add(createSmoothBoneSegment([8.6, 11.5, side * 7.5], [9.4, 12.2, side * 9.2], 0.16, 0.16, rubberMat));
      const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.8, 1.1), rubberMat);
      mirrorHead.position.set(9.4, 12.2, side * 9.2);
      group.add(mirrorHead);
    });

    // Protective Grill Metal Cage Doors on both sides (Picture 4 Match)
    [-1, 1].forEach(side => {
      const doorZ = side * 8.35;
      // Outer Door Frame
      group.add(createSmoothBoneSegment([-10.5, 5.8, doorZ], [1.5, 5.8, doorZ], 0.22, 0.22, chromeGrillMat));
      group.add(createSmoothBoneSegment([-10.5, 12.6, doorZ], [1.5, 12.6, doorZ], 0.22, 0.22, chromeGrillMat));
      group.add(createSmoothBoneSegment([-10.5, 5.8, doorZ], [-10.5, 12.6, doorZ], 0.22, 0.22, chromeGrillMat));
      group.add(createSmoothBoneSegment([1.5, 5.8, doorZ], [1.5, 12.6, doorZ], 0.22, 0.22, chromeGrillMat));
      // Center divider between front driver door and rear passenger door
      group.add(createSmoothBoneSegment([-4.0, 5.8, doorZ], [-4.0, 12.6, doorZ], 0.20, 0.20, chromeGrillMat));

      // Horizontal rails
      [8.2, 10.4].forEach(by => {
        group.add(createSmoothBoneSegment([-10.5, by, doorZ], [1.5, by, doorZ], 0.14, 0.14, chromeGrillMat));
      });

      // Rear Passenger Door: Vertical Cage Bars (Picture 4 Match)
      for (let b = 0; b < 5; b++) {
        const bx = -9.4 + b * 1.25;
        group.add(createSmoothBoneSegment([bx, 5.8, doorZ], [bx, 12.6, doorZ], 0.11, 0.11, cageGreenMat));
      }

      // Front Driver Door: Diamond Wire Grill Mesh (Picture 4 Match)
      for (let d = 0; d < 4; d++) {
        const dx = -3.5 + d * 1.2;
        group.add(createSmoothBoneSegment([dx, 6.0, doorZ], [dx + 1.2, 12.4, doorZ], 0.09, 0.09, cageGreenMat));
        group.add(createSmoothBoneSegment([dx + 1.2, 6.0, doorZ], [dx, 12.4, doorZ], 0.09, 0.09, cageGreenMat));
      }
    });

    // Handlebars and Fare Meter Console
    const steerBar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.5, 10), rubberMat);
    steerBar.position.set(5.2, 9.2, 0);
    group.add(steerBar);

    const meterBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.6), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
    meterBox.position.set(5.5, 10.1, 1.6);
    group.add(meterBox);

    // CNG Driver Behind Handlebars
    const driverSkinMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.75 });
    const driverShirtMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    const dTorso = createOrganicTorso([
      { x: 0.4, y: 5.6, z: 0, rx: 1.0, rz: 1.2 },
      { x: 0.9, y: 6.6, z: 0, rx: 1.1, rz: 1.3 },
      { x: 1.4, y: 7.6, z: 0, rx: 1.1, rz: 1.3 },
      { x: 1.6, y: 8.4, z: 0, rx: 0.45, rz: 0.45 }
    ], driverShirtMat);
    group.add(dTorso);

    const dHead = createSculptedHumanHead(driverSkinMat, hairMat, { mustache: true });
    dHead.position.set(1.7, 9.2, 0);
    group.add(dHead);

    // Driver Arms gripping handlebars
    [-1, 1].forEach(side => {
      group.add(createSmoothBoneSegment([1.6, 8.2, side * 1.1], [3.6, 8.4, side * 1.7], 0.34, 0.28, driverShirtMat));
      group.add(createSmoothBoneSegment([3.6, 8.4, side * 1.7], [5.2, 9.2, side * 2.2], 0.28, 0.22, driverSkinMat));
    });

    // Rear Passenger Bench and Visible Occupants
    const rearSeat = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.4, 14.2), rubberMat);
    rearSeat.position.set(-6.5, 5.4, 0);
    group.add(rearSeat);

    [-2.8, 2.8].forEach((pz, idx) => {
      const pTorso = createOrganicTorso([
        { x: -6.4, y: 5.8, z: pz, rx: 0.95, rz: 1.15 },
        { x: -6.3, y: 6.8, z: pz, rx: 1.05, rz: 1.25 },
        { x: -6.2, y: 7.8, z: pz, rx: 1.0, rz: 1.20 },
        { x: -6.1, y: 8.5, z: pz, rx: 0.45, rz: 0.45 }
      ], new THREE.MeshStandardMaterial({ color: idx === 0 ? 0xd97706 : 0x7c3aed, roughness: 0.7 }));
      group.add(pTorso);

      const pHead = createSculptedHumanHead(driverSkinMat, hairMat, { mustache: idx === 0 });
      pHead.position.set(-6.1, 9.4, pz);
      group.add(pHead);
    });

    return group;
  }

'''

content = content[:c3d_pos] + vehicle_factories + content[c3d_pos:]

# 3. Update create3DVehicle to return the new authentic models directly
old_dispatch = '''    if (type === 'cng' && cngPrototypeModel) {
      const cngGroup = new THREE.Group();
      replaceCNGWithModel(cngGroup, cngPrototypeModel);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(cngGroup);
      return cngGroup;
    }
    if (type === 'rickshaw' && rickshawPrototypeModel) {
      const rickGroup = new THREE.Group();
      replaceRickshawWithModel(rickGroup, rickshawPrototypeModel);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(rickGroup);
      return rickGroup;
    }'''

new_dispatch = '''    if (type === 'cng') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      const cng = createRealisticDhakaCNG(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(cng);
      return cng;
    }
    if (type === 'rickshaw') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      const rick = createRealisticDhakaRickshaw(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(rick);
      return rick;
    }'''

if old_dispatch not in content:
    print('ERROR: could not find old_dispatch')
    sys.exit(1)

content = content.replace(old_dispatch, new_dispatch, 1)

# 4. Make replaceRickshawWithModel and replaceCNGWithModel safe no-ops
repl_rick = '  function replaceRickshawWithModel(vehicle, prototype) {'
if repl_rick in content:
    content = content.replace(repl_rick, '  function replaceRickshawWithModel(vehicle, prototype) {\n    return; // Pure Three.js model preserved', 1)

repl_cng = '  function replaceCNGWithModel(vehicle, prototype) {'
if repl_cng in content:
    content = content.replace(repl_cng, '  function replaceCNGWithModel(vehicle, prototype) {\n    return; // Pure Three.js model preserved', 1)

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: Updated assets/crossroads-3d.js with authentic Rickshaw & CNG!')
