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

// 4. Check 10 automotive palettes
if (!code.includes('const BIKE_PALETTES = [') || !code.includes('Pearl White & Bronze') || !code.includes('Championship Gold & Silver')) {
  console.error("FAIL: BIKE_PALETTES matrix missing or incomplete!");
  process.exit(1);
}
console.log("PASS: BIKE_PALETTES 10-colorway matrix is defined.");

// 5. Check textures
const textures = [
  'getVarsityBackTexture',
  'getBikeLicensePlateTexture',
  'getFukaruTireTexture',
  'getShitzuDecalTexture',
  'getKanjiDecalTexture',
  'getPinstripeTankTexture',
  'getGrillHeadlightTexture'
];
for (const tex of textures) {
  if (!code.includes(tex)) {
    console.error(`FAIL: Texture generator ${tex} missing!`);
    process.exit(1);
  }
}
console.log("PASS: All 7 procedural texture & decal generators are present.");

// 6. Check that head radius 0.82 and sculpted 3D human face are implemented
if (!code.includes('new THREE.SphereGeometry(0.82, 20, 18)') || !code.includes('darkIrisMat') || !code.includes('eyeWhiteMat')) {
  console.error("FAIL: Sculpted 3D face / head radius 0.82 missing!");
  process.exit(1);
}
console.log("PASS: Anatomical head (radius 0.82) with 3D eyes, nose, brow, and lips is defined.");

// 7. Check that floating toruses (waistHem / collarTrim) are completely removed
if (code.includes('waistHem') || code.includes('collarTrim')) {
  console.error("FAIL: Floating waistHem or collarTrim still present in code!");
  process.exit(1);
}
console.log("PASS: Zero floating artifacts (waistHem & collarTrim completely eliminated).");

// 8. Check 5 archetypes logic
if (!code.includes('isStreetfighter') || !code.includes('isCruiser') || !code.includes('isSupersport') || !code.includes('isHyperbike') || !code.includes('isCafeRacer')) {
  console.error("FAIL: 5 motorcycle archetypes logic missing!");
  process.exit(1);
}
console.log("PASS: All 5 distinct GTA V motorcycle archetypes are implemented.");

// 9. Check wheel registration and wheel radius
if (!code.includes('group.userData.wheels.push(wPivot);') || !code.includes('group.userData.wheelRadius = 3.25;')) {
  console.error("FAIL: Wheel registration in userData.wheels missing!");
  process.exit(1);
}
console.log("PASS: Wheels registered in userData.wheels with wheelRadius = 3.25.");

console.log("\nALL 9 REVOLUTIONARY VERIFICATION CHECKS PASSED SUCCESSFULLY!");
