const THREE = require('../assets/three.min.js');
const fs = require('fs');

// We can read GLTF data and inspect
const buf = fs.readFileSync('assets/models/dhaka-bus.glb');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

// Find positions of Bus_Front_Apron_White vs Bus_Rear_Wall_Red
const front = gltf.nodes.find(n => n.name === 'Bus_Front_Apron_White');
const rear = gltf.nodes.find(n => n.name === 'Bus_Rear_Wall_Red');
console.log('Front Apron translation:', front.translation);
console.log('Rear Wall translation:', rear.translation);
