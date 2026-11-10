const fs = require('fs');

console.log("Checking assets/crossroads-3d.js...");
const code = fs.readFileSync('assets/crossroads-3d.js', 'utf8');

// 1. Check createSeamlessLoftedLimb
if (!code.includes('function createSeamlessLoftedLimb')) {
  console.error("FAIL: createSeamlessLoftedLimb missing!");
  process.exit(1);
}
console.log("PASS: createSeamlessLoftedLimb is defined.");

// 2. Check createRealisticGTABike
if (!code.includes('function createRealisticGTABike(')) {
  console.error("FAIL: createRealisticGTABike missing!");
  process.exit(1);
}
console.log("PASS: createRealisticGTABike is defined.");

// 3. Check 4 outfits
const outfits = ['GTA Streetfighter', 'GTA "R★" Varsity Rider', 'GTA Scrambler', 'Dhaka Urban Rider'];
for (const out of outfits) {
  if (!code.includes(out)) {
    console.error(`FAIL: Outfit ${out} missing!`);
    process.exit(1);
  }
}
console.log("PASS: All 4 GTA multi-outfit rider definitions are present.");

// 4. Check textures: getVarsityBackTexture & getBikeLicensePlateTexture
if (!code.includes('getVarsityBackTexture') || !code.includes('getBikeLicensePlateTexture')) {
  console.error("FAIL: Texture generators missing!");
  process.exit(1);
}
console.log("PASS: Varsity R★ and license plate UF82 ISK texture generators are present.");

// 5. Check that loadSportbikeModel GLB override is removed from init3DScene
if (code.includes('loadSportbikeModel().then(')) {
  console.error("FAIL: loadSportbikeModel override is still present in init3DScene!");
  process.exit(1);
}
console.log("PASS: loadSportbikeModel override has been removed so pure Three.js seamless bike is permanent.");

// 6. Check that create3DVehicle delegates directly to createRealisticGTABike
if (!code.includes("if (type === 'bike')") || !code.includes("return createRealisticGTABike(colorHex, appearanceSeed, vData);")) {
  console.error("FAIL: create3DVehicle does not delegate directly to createRealisticGTABike!");
  process.exit(1);
}
console.log("PASS: create3DVehicle directly returns createRealisticGTABike.");

// 7. Check wheel rotation
if (!code.includes('group.userData.wheels.push(wPivot);') || !code.includes('group.userData.wheelRadius = 3.25;')) {
  console.error("FAIL: Wheel registration in userData.wheels missing!");
  process.exit(1);
}
console.log("PASS: Wheels registered in userData.wheels with wheelRadius = 3.25.");

console.log("\nALL 7 VERIFICATION CHECKS PASSED SUCCESSFULLY!");
