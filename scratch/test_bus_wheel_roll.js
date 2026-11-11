const THREE = require('../assets/three.min.js');
const fs = require('fs');

// Create test wheel parent with a child that has the exact rotation from glTF
const parent = new THREE.Group();
const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16));
// In glTF: rot is [0.7071068, 0, 0, 0.7071068] -> x = 0.7071, w = 0.7071 -> rot around X by 90 deg
tire.quaternion.set(0.7071068, 0, 0, 0.7071068);
parent.add(tire);

// Let's see: if the vehicle moves forward along +X:
// Points at top of tire (y = +0.5, x = 0, z = 0)
// When rolling forward (+X), the top of the tire must move in +X direction!
// Let's test rotating parent around X, Y, and Z by +0.1 rad:
['x', 'y', 'z'].forEach(axis => {
  const p = parent.clone();
  p.rotation[axis] = 0.1;
  p.updateMatrixWorld(true);
  const topPos = new THREE.Vector3(0, 0.5, 0);
  topPos.applyMatrix4(p.children[0].matrixWorld);
  console.log(`Rotating parent around ${axis}: top point moved to x=${topPos.x.toFixed(4)}, y=${topPos.y.toFixed(4)}, z=${topPos.z.toFixed(4)}`);
});
