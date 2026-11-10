const fs = require('fs');

// Load Three.js r128 in Node
const mod = { exports: {} };
new Function('exports', 'module', fs.readFileSync('assets/three.min.js', 'utf8'))(mod.exports, mod);
const THREE = mod.exports;
global.THREE = THREE;

// Dummy canvas for Node texture creation
global.document = {
  createElement: function(tag) {
    if (tag === 'canvas') {
      return {
        width: 256,
        height: 256,
        getContext: function() {
          return {
            clearRect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            bezierCurveTo: () => {},
            arc: () => {},
            stroke: () => {},
            fill: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            createRadialGradient: () => ({ addColorStop: () => {} })
          };
        }
      };
    }
    return {};
  }
};

function createSeamlessLoftedLimb(stations, tubularSegments, radialSegments, material) {
  const pts = stations.map(s => new THREE.Vector3(s.p[0], s.p[1], s.p[2]));
  const curve = new THREE.CatmullRomCurve3(pts);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  function sampleProfile(t) {
    const scaled = t * (stations.length - 1);
    const idx = Math.min(Math.floor(scaled), stations.length - 2);
    const frac = scaled - idx;
    const s0 = stations[idx];
    const s1 = stations[idx + 1];
    return {
      rx: s0.rx + (s1.rx - s0.rx) * frac,
      ry: (s0.ry || s0.rx) + ((s1.ry || s1.rx) - (s0.ry || s0.rx)) * frac
    };
  }

  let prevT = curve.getTangent(0).normalize();
  let normal = Math.abs(prevT.y) > 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  let binormal = new THREE.Vector3().crossVectors(prevT, normal).normalize();
  normal.crossVectors(binormal, prevT).normalize();
  const rotQuat = new THREE.Quaternion();

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const center = curve.getPoint(u);
    const curT = curve.getTangent(u).normalize();
    if (i > 0) {
      rotQuat.setFromUnitVectors(prevT, curT);
      normal.applyQuaternion(rotQuat).normalize();
      binormal.crossVectors(curT, normal).normalize();
      prevT.copy(curT);
    }
    const prof = sampleProfile(u);
    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);
      const offset = new THREE.Vector3()
        .addScaledVector(normal, cosV * prof.rx)
        .addScaledVector(binormal, sinV * prof.ry);
      const vx = center.x + offset.x;
      const vy = center.y + offset.y;
      const vz = center.z + offset.z;
      positions.push(vx, vy, vz);
      offset.normalize();
      normals.push(offset.x, offset.y, offset.z);
      uvs.push(j / radialSegments, u);
    }
  }

  const ringStride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringStride + j;
      const b = (i + 1) * ringStride + j;
      const c = (i + 1) * ringStride + (j + 1);
      const d = i * ringStride + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

// Extract and test new code
console.log("Checking createSeamlessLoftedLimb works in node...");
const testLimb = createSeamlessLoftedLimb([
  { p: [0, 0, 0], rx: 0.5, ry: 0.5 },
  { p: [1, 2, 0], rx: 0.4, ry: 0.4 }
], 6, 8, new THREE.MeshBasicMaterial());
console.log("Limb created, vertices:", testLimb.geometry.attributes.position.count);
