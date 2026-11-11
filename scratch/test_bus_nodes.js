const THREE = require('../assets/three.min.js');
const fs = require('fs');

// Read GLTF JSON from dhaka-bus.glb
const buf = fs.readFileSync('assets/models/dhaka-bus.glb');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

console.log("Bus model check:");
console.log("Total nodes:", gltf.nodes.length);
['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'].forEach(wName => {
  const node = gltf.nodes.find(n => n.name === wName);
  console.log(`${wName}:`, node);
});
