import os

with open('scratch/refine_cng.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Extract texture generators and createAuthenticBangladeshiCNG
start_marker = "// ========================================================================="
end_marker = "const cng = createAuthenticBangladeshiCNG();"

part = code[code.find(start_marker):code.find(end_marker)].strip()

# Create cached variables at top of the block
prod_cng_code = """  // =========================================================================
  // CACHED TEXTURES FOR AUTHENTIC BANGLADESHI CNG AUTO-RICKSHAW
  // =========================================================================
  let cachedCNGLiveryLeft = null;
  let cachedCNGLiveryRight = null;
  let cachedCNGFrontNose = null;
  let cachedCNGGarland = null;

  function getCNGLiveryTexture(isLeft) {
    if (isLeft && cachedCNGLiveryLeft) return cachedCNGLiveryLeft;
    if (!isLeft && cachedCNGLiveryRight) return cachedCNGLiveryRight;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#00a65a';
    ctx.fillRect(0, 0, 1024, 512);

    // Yellow dashed perimeter stitching
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 7;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(20, 20, 984, 472);

    // Wheel arch cutout guideline
    const archCenterX = isLeft ? 705 : 319;
    ctx.beginPath();
    ctx.arc(archCenterX, 512, 230, Math.PI, 0, false);
    ctx.stroke();

    // Slanted banners in the UPPER HALF of the panel
    ctx.save();
    const slantAngle = isLeft ? -0.04 : 0.04;
    ctx.translate(isLeft ? 480 : 544, 110);
    ctx.rotate(slantAngle);

    // Upper Banner: White strip with ★ FOR HIRE ★
    const bW = 680;
    const bH = 74;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-bW / 2, -bH / 2, bW, bH);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#dc2626';
    ctx.setLineDash([]);
    ctx.strokeRect(-bW / 2, -bH / 2, bW, bH);

    ctx.fillStyle = '#dc2626';
    ctx.font = '900 42px "Arial Black", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ FOR HIRE ★', 0, 2);

    // Lower Banner: Bright Neon-Yellow strip with ONE PARIBAHAN
    ctx.translate(0, 84);
    const b2W = 660;
    const b2H = 70;
    ctx.fillStyle = '#d4ff00';
    ctx.fillRect(-b2W / 2, -b2H / 2, b2W, b2H);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#b91c1c';
    ctx.strokeRect(-b2W / 2, -b2H / 2, b2W, b2H);

    ctx.fillStyle = '#b91c1c';
    ctx.font = '900 40px "Arial Black", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ONE PARIBAHAN', 0, 2);

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    if (isLeft) cachedCNGLiveryLeft = tex;
    else cachedCNGLiveryRight = tex;
    return tex;
  }

  function getCNGFrontNoseTexture() {
    if (cachedCNGFrontNose) return cachedCNGFrontNose;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#00a65a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(18, 18, 476, 476);

    const bandY = 220;
    const bandH = 36;

    ctx.fillStyle = '#facc15';
    const numDots = 14;
    for (let i = 0; i < numDots; i++) {
      const dx = 45 + (i * (512 - 90) / (numDots - 1));
      ctx.beginPath();
      ctx.arc(dx, bandY - 18, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(28, bandY, 456, bandH);

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(28, bandY + bandH, 456, bandH);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(28, bandY + bandH * 2, 456, bandH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(28, bandY, 456, bandH * 3);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    cachedCNGFrontNose = tex;
    return tex;
  }

  function getCNGGarlandTexture() {
    if (cachedCNGGarland) return cachedCNGGarland;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 128);

    const scallops = 16;
    const sW = 1024 / scallops;
    for (let i = 0; i < scallops; i++) {
      const cx = i * sW + sW / 2;
      ctx.beginPath();
      ctx.arc(cx, 15, sW / 2, 0, Math.PI, false);
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, 15, sW / 3, 0, Math.PI, false);
      ctx.fillStyle = '#facc15';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, 42, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(2, 1);
    cachedCNGGarland = tex;
    return tex;
  }

  function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {
"""

# Now extract the body of createAuthenticBangladeshiCNG
body_start = code.find("function createAuthenticBangladeshiCNG() {") + len("function createAuthenticBangladeshiCNG() {")
body_end = code.rfind("return cngGroup;")
cng_body = code[body_start:body_end] + "return cngGroup;\n  }"

# Also need createContinuousSplineLimb and buildRealisticAdultHead inside or above
helper_start = code.find("function createContinuousSplineLimb(")
helper_end = code.find("function createAuthenticBangladeshiCNG()")
helpers = code[helper_start:helper_end]

full_cng_implementation = prod_cng_code + helpers + cng_body

with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    crossroads = f.read()

target_start = crossroads.find("function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {")
target_end = crossroads.find("function create3DVehicle(type, colorHex, appearanceId, vData) {")

if target_start == -1 or target_end == -1:
    print('ERROR: could not find target boundaries!')
    exit(1)

new_crossroads = crossroads[:target_start] + full_cng_implementation + "\n\n  " + crossroads[target_end:]

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(new_crossroads)

print('Successfully replaced createRealisticDhakaCNG in assets/crossroads-3d.js')
