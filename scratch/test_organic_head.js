const fs = require('fs');

// Load Three.js r128 in Node
const mod = { exports: {} };
new Function('exports', 'module', fs.readFileSync('assets/three.min.js', 'utf8'))(mod.exports, mod);
const THREE = mod.exports;

function createSculptedOrganicHead(skinMat) {
  const nLat = 36;
  const nLon = 48;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= nLat; i++) {
    const theta = (i / nLat) * Math.PI; // 0 (top) to PI (bottom)
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let j = 0; j <= nLon; j++) {
      const phi = (j / nLon) * Math.PI * 2 - Math.PI; // -PI to +PI, 0 is facing forward +X
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      // Base anatomical head ellipsoid dimensions
      let rx = 0.76;
      let ry = 0.92;
      let rz = 0.68;

      // Organic facial feature sculpting based on (theta, phi)
      let dr = 0.0;

      // 1. Forehead & Cranium: round & smooth
      if (theta < Math.PI * 0.40) {
        dr += 0.02 * Math.sin(theta / (Math.PI * 0.40) * Math.PI);
      }

      // 2. Brow Ridge: theta ~ 0.42 * PI, phi in [-0.4, 0.4]
      const browDistT = Math.abs(theta - Math.PI * 0.43);
      const browDistP = Math.abs(phi);
      if (browDistT < 0.12 && browDistP < 0.55) {
        const factor = Math.exp(-Math.pow(browDistT / 0.08, 2) - Math.pow(browDistP / 0.40, 2));
        dr += 0.065 * factor;
      }

      // 3. Eye Sockets: theta ~ 0.48 * PI, phi ~ +/- 0.32
      const eyeLDist = Math.hypot((theta - Math.PI * 0.49) / 0.08, (phi - 0.32) / 0.18);
      const eyeRDist = Math.hypot((theta - Math.PI * 0.49) / 0.08, (phi + 0.32) / 0.18);
      if (eyeLDist < 1.0) {
        dr -= 0.075 * (1.0 - eyeLDist);
      }
      if (eyeRDist < 1.0) {
        dr -= 0.075 * (1.0 - eyeRDist);
      }

      // 4. Nose Bridge & Tip: theta in [0.46 * PI, 0.58 * PI], phi ~ 0
      if (theta >= Math.PI * 0.45 && theta <= Math.PI * 0.60 && Math.abs(phi) < 0.22) {
        const nFrac = (theta - Math.PI * 0.45) / (Math.PI * 0.15); // 0 at bridge, 1 at base
        const pFrac = Math.abs(phi) / 0.22;
        // Nose bridge rises from 0.04 to 0.22 at the tip
        const noseHeight = 0.05 + 0.18 * Math.sin(nFrac * Math.PI);
        const noseProfile = Math.cos(pFrac * Math.PI * 0.5);
        dr += noseHeight * noseProfile;
      }

      // 5. Cheekbones: theta ~ 0.54 * PI, phi ~ +/- 0.52
      const cheekL = Math.hypot((theta - Math.PI * 0.53) / 0.12, (phi - 0.52) / 0.25);
      const cheekR = Math.hypot((theta - Math.PI * 0.53) / 0.12, (phi + 0.52) / 0.25);
      if (cheekL < 1.0) dr += 0.06 * (1.0 - cheekL);
      if (cheekR < 1.0) dr += 0.06 * (1.0 - cheekR);

      // 6. Upper & Lower Lips: theta in [0.60 * PI, 0.67 * PI], phi in [-0.28, 0.28]
      if (theta >= Math.PI * 0.60 && theta <= Math.PI * 0.67 && Math.abs(phi) < 0.30) {
        const lipT = (theta - Math.PI * 0.60) / (Math.PI * 0.07);
        const lipP = Math.abs(phi) / 0.30;
        // Dual lip bulge with slight mouth cleft
        const lipShape = (Math.sin(lipT * Math.PI * 2) > 0 ? 0.055 : 0.045) * Math.sin(lipT * Math.PI) * Math.cos(lipP * Math.PI * 0.5);
        dr += lipShape;
      }

      // 7. Defined Chin: theta in [0.69 * PI, 0.78 * PI], phi in [-0.35, 0.35]
      if (theta >= Math.PI * 0.69 && theta <= Math.PI * 0.79 && Math.abs(phi) < 0.35) {
        const chinT = (theta - Math.PI * 0.69) / (Math.PI * 0.10);
        const chinP = Math.abs(phi) / 0.35;
        const chinProfile = Math.sin(chinT * Math.PI) * Math.cos(chinP * Math.PI * 0.5);
        dr += 0.11 * chinProfile;
      }

      // 8. Tapering Neck: theta > 0.82 * PI
      if (theta > Math.PI * 0.82) {
        const neckFrac = (theta - Math.PI * 0.82) / (Math.PI * 0.18);
        rx *= (1.0 - neckFrac * 0.32);
        rz *= (1.0 - neckFrac * 0.22);
      }

      const totalR = 1.0 + dr;
      const x = totalR * rx * sinT * cosP;
      const y = totalR * ry * cosT;
      const z = totalR * rz * sinT * sinP;

      positions.push(x, y, z);
      normals.push(x, y, z);
      uvs.push(j / nLon, 1.0 - (i / nLat));
    }
  }

  const stride = nLon + 1;
  for (let i = 0; i < nLat; i++) {
    for (let j = 0; j < nLon; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, skinMat);
  mesh.castShadow = true;
  return mesh;
}

const headMesh = createSculptedOrganicHead(new THREE.MeshBasicMaterial());
console.log("Head mesh generated successfully, total vertices:", headMesh.geometry.attributes.position.count);
