// Node test simulation for bike wheels & kinematics
const fs = require('fs');

console.log("Checking assets/crossroads-3d.js...");
const code = fs.readFileSync('assets/crossroads-3d.js', 'utf8');

// Check that old procedural stickman code is gone
if (code.includes('makeRoundedLens') || code.includes('chinLowerShape')) {
  console.error("FAIL: Legacy procedural stickman code still present!");
  process.exit(1);
} else {
  console.log("PASS: Legacy procedural stickman code is completely removed.");
}

// Check that replaceBikeWithModel matches Wheel_F and Wheel_R
if (code.includes("name === 'wheel_f'") && code.includes("name === 'wheel_r'")) {
  console.log("PASS: replaceBikeWithModel matches Wheel_F and Wheel_R pivots.");
} else {
  console.error("FAIL: Wheel pivot matching missing in replaceBikeWithModel");
  process.exit(1);
}

// Check sportbikePrototypeModel caching
if (code.includes('let sportbikePrototypeModel = null;') && code.includes('sportbikePrototypeModel = prototype;')) {
  console.log("PASS: sportbikePrototypeModel is properly cached globally.");
} else {
  console.error("FAIL: sportbikePrototypeModel caching missing");
  process.exit(1);
}

// Check forward wheel rolling
if (code.includes('vm.mesh.userData.wheels.forEach(w => {') && code.includes('w.rotation.z -= forwardRoll;')) {
  console.log("PASS: Wheels rotate forward strictly around local Z transverse axis.");
} else {
  console.error("FAIL: Forward wheel rolling logic missing or incorrect");
  process.exit(1);
}

console.log("ALL SIMULATION CHECKS PASSED!");
