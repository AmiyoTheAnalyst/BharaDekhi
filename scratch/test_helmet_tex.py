import subprocess
import os

studio_path = os.path.abspath("scratch/test_helmet_tex.html").replace("\\", "/")

html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="../assets/three.min.js"></script>
  <style>body { margin: 0; background: #0b0f19; overflow: hidden; }</style>
</head>
<body>
<script>
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  const camera = new THREE.PerspectiveCamera(32, 1280 / 720, 0.1, 100);
  camera.position.set(3.6, 1.2, 3.4);
  camera.lookAt(0.1, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(1280, 720);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  document.body.appendChild(renderer.domElement);

  const amb = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfffaed, 1.6);
  sun.position.set(12, 22, 16);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x93c5fd, 0.75);
  fill.position.set(-12, 10, -12);
  scene.add(fill);

  function getAerodynamicHelmetTexture(shellHex, decalHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Glossy vibrant shell
    ctx.fillStyle = '#' + new THREE.Color(shellHex).getHexString();
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Black aerodynamic center spine stripe (over the top crown)
    // In SphereGeometry: v=1 is top pole (+Y), v=0 is bottom pole (-Y). u=0.25 is front (+X)
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(225, 1024);
    ctx.lineTo(287, 1024);
    ctx.lineTo(295, 450);
    ctx.lineTo(217, 450);
    ctx.closePath();
    ctx.fill();

    // 3. Signature White/Silver Aerodynamic Curved Swoop Graphic Decal (Photo 1)
    ctx.strokeStyle = '#' + new THREE.Color(decalHex).getHexString();
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Right side swoop (u: 0.25 to 0.50): curves from above visor (u~0.30, v~0.60) up over crown (u~0.40, v~0.82) down to rear (u~0.58, v~0.65)
    ctx.beginPath();
    ctx.moveTo(310, 520);
    ctx.bezierCurveTo(390, 840, 480, 820, 580, 620);
    ctx.stroke();

    // Left side swoop (u: 0.0 to 0.25): curves from above visor (u~0.20, v~0.60) up over crown (u~0.10, v~0.82) down to rear (u~0.92, v~0.65)
    ctx.beginPath();
    ctx.moveTo(202, 520);
    ctx.bezierCurveTo(122, 840, 32, 820, 0, 710);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(1024, 710);
    ctx.bezierCurveTo(992, 820, 902, 840, 822, 520);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    return tex;
  }

  function createPhoto1Helmet(shellColor, decalColor) {
    const headGroup = new THREE.Group();
    const tex = getAerodynamicHelmetTexture(shellColor, decalColor);

    const helmetMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.12,
      metalness: 0.45
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.03,
      metalness: 0.94,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide
    });
    const darkVentMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.35,
      metalness: 0.60
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd9e4ff,
      roughness: 0.15,
      metalness: 0.88
    });

    // 1. Aerodynamic Contoured Shell (Elongated oval sportbike helmet profile)
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.88, 36, 28),
      helmetMat
    );
    shell.scale.set(1.22, 1.05, 0.90);
    shell.position.set(-0.04, 0.04, 0);
    headGroup.add(shell);

    // 2. Aerodynamic Rear Ducktail Spoiler Lip (Photo 1)
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.10, 1.05),
      helmetMat
    );
    spoiler.position.set(-0.84, 0.18, 0);
    spoiler.rotation.z = -0.32;
    headGroup.add(spoiler);

    // 3. Molded Chin Guard Bar (Flush with shell)
    const chinBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.80, 0.42, 28, 1, false, -Math.PI * 0.35, Math.PI * 0.70),
      helmetMat
    );
    chinBar.scale.set(1.18, 1.0, 0.88);
    chinBar.position.set(0.18, -0.26, 0);
    chinBar.rotation.z = 0.08;
    headGroup.add(chinBar);

    // Chin Air Intake Grille
    const chinVent = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.14, 0.36),
      darkVentMat
    );
    chinVent.position.set(1.08, -0.25, 0);
    headGroup.add(chinVent);

    // Top Ram-Air Intake Scoop
    const topVent = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.08, 0.26),
      darkVentMat
    );
    topVent.position.set(0.14, 0.96, 0);
    topVent.rotation.z = -0.12;
    headGroup.add(topVent);

    // 4. Dark Smoke / Iridescent Tinted Curved Visor (Photo 1)
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.91, 0.88, 0.46, 28, 1, true, -Math.PI * 0.35, Math.PI * 0.70),
      visorMat
    );
    visor.scale.set(1.18, 1.0, 0.88);
    visor.position.set(0.19, 0.10, 0);
    headGroup.add(visor);

    // Visor Hinge Pivot Discs
    [-1, 1].forEach(side => {
      const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 16), chromeMat);
      pivot.rotation.x = Math.PI / 2;
      pivot.position.set(0.06, 0.12, side * 0.82);
      headGroup.add(pivot);
    });

    // Bottom Neck Padded Collar
    const neckSeal = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.10, 10, 24),
      darkVentMat
    );
    neckSeal.rotation.x = Math.PI / 2;
    neckSeal.scale.set(1.18, 0.88, 1.0);
    neckSeal.position.set(-0.05, -0.44, 0);
    headGroup.add(neckSeal);

    // Slight forward aggressive racing tuck angle
    headGroup.rotation.z = -0.14;

    return headGroup;
  }

  const hBlue = createPhoto1Helmet(0x2563eb, 0xf8fafc);
  hBlue.position.set(0, 0.2, 0);
  scene.add(hBlue);

  renderer.render(scene, camera);
</script>
</body>
</html>
"""

with open("scratch/test_helmet_tex.html", "w", encoding="utf-8") as f:
    f.write(html_content)

user_data = os.path.abspath("scratch/chrome_tmp_helmet_tex")
out_file = os.path.abspath("scratch/test_helmet_tex_photo1.png")

cmd = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "--headless=new",
    "--no-sandbox",
    "--allow-file-access-from-files",
    "--enable-webgl",
    "--use-gl=angle",
    f"--user-data-dir={user_data}",
    f"--screenshot={out_file}",
    "--window-size=1280,720",
    "--run-all-compositor-stages-before-draw",
    f"file:///{studio_path}"
]

res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
print(f"Captured: {out_file} ({os.path.getsize(out_file)} bytes)")
