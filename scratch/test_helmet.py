import subprocess
import os

studio_path = os.path.abspath("scratch/test_helmet.html").replace("\\", "/")

html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="../assets/three.min.js"></script>
  <style>body { margin: 0; background: #0f172a; overflow: hidden; }</style>
</head>
<body>
<script>
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  const camera = new THREE.PerspectiveCamera(35, 1280 / 720, 0.1, 100);
  camera.position.set(4.5, 2.2, 5.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(1280, 720);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  const amb = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfffaed, 1.4);
  sun.position.set(10, 20, 15);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x93c5fd, 0.6);
  fill.position.set(-10, 10, -10);
  scene.add(fill);

  function createPhoto1Helmet(shellColor, decalColor) {
    const headGroup = new THREE.Group();

    const helmetMat = new THREE.MeshStandardMaterial({
      color: shellColor,
      roughness: 0.14,
      metalness: 0.55
    });
    const decalMat = new THREE.MeshStandardMaterial({
      color: decalColor,
      roughness: 0.20,
      metalness: 0.35
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.04,
      metalness: 0.90,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const darkVentMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.40,
      metalness: 0.60
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd9e4ff,
      roughness: 0.20,
      metalness: 0.85
    });

    // 1. Aerodynamic Contoured Crown Shell
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.88, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      helmetMat
    );
    crown.scale.set(1.08, 1.02, 0.96);
    crown.position.set(-0.02, 0.04, 0);
    headGroup.add(crown);

    // 2. Rear Skull Shell & Ducktail Spoiler Lip
    const rearShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.88, 32, 20, -Math.PI * 0.70, Math.PI * 1.40, Math.PI * 0.36, Math.PI * 0.54),
      helmetMat
    );
    rearShell.scale.set(1.08, 1.02, 0.96);
    rearShell.position.set(-0.04, 0.02, 0);
    headGroup.add(rearShell);

    // Aerodynamic Rear Ducktail Spoiler Lip
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 1.15),
      helmetMat
    );
    spoiler.position.set(-0.76, 0.22, 0);
    spoiler.rotation.z = -0.32;
    headGroup.add(spoiler);

    // 3. Molded Chin Guard (Integrated into helmet shell)
    const chinBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.78, 0.40, 24, 1, false, -Math.PI * 0.34, Math.PI * 0.68),
      helmetMat
    );
    chinBar.position.set(0.18, -0.26, 0);
    chinBar.rotation.z = 0.08;
    headGroup.add(chinBar);

    // Chin Air Intake Grille
    const chinVent = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.16, 0.38),
      darkVentMat
    );
    chinVent.position.set(0.96, -0.25, 0);
    headGroup.add(chinVent);

    // Top Ram-Air Intake Channel Scoop (Black center spine)
    const topSpine = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.08, 0.22),
      darkVentMat
    );
    topSpine.position.set(-0.05, 0.95, 0);
    topSpine.rotation.z = -0.12;
    headGroup.add(topSpine);

    // 4. White/Silver Aerodynamic Curved Swoop Graphic Decal (Photo 1 Matching Stripe!)
    [-1, 1].forEach(side => {
      // Curved arch lying flat along the side of the helmet (in XY plane, normal along Z)
      const swoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.042, 8, 32, Math.PI * 0.68),
        decalMat
      );
      swoop.position.set(-0.06, 0.04, side * 0.85);
      swoop.rotation.z = side > 0 ? 0.42 : 0.42;
      headGroup.add(swoop);

      const swoopTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.06, 0.02),
        decalMat
      );
      swoopTail.position.set(-0.48, 0.24, side * 0.85);
      swoopTail.rotation.z = -0.22;
      headGroup.add(swoopTail);
    });

    // 5. Dark Smoke / Iridescent Tinted Curved Visor (Photo 1)
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.89, 0.86, 0.44, 24, 1, true, -Math.PI * 0.34, Math.PI * 0.68),
      visorMat
    );
    visor.position.set(0.19, 0.10, 0);
    headGroup.add(visor);

    // Visor Hinge Pivot Discs
    [-1, 1].forEach(side => {
      const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 16), chromeMat);
      pivot.rotation.x = Math.PI / 2;
      pivot.position.set(0.06, 0.12, side * 0.88);
      headGroup.add(pivot);
    });

    // Bottom Neck Rubber Weather Seal
    const neckSeal = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.10, 10, 24),
      darkVentMat
    );
    neckSeal.rotation.x = Math.PI / 2;
    neckSeal.position.set(-0.05, -0.44, 0);
    headGroup.add(neckSeal);

    return headGroup;
  }

  const hBlue = createPhoto1Helmet(0x2563eb, 0xf8fafc); // Photo 1 Electric Blue
  hBlue.position.set(0, 0.2, 0);
  scene.add(hBlue);

  renderer.render(scene, camera);
</script>
</body>
</html>
"""

with open("scratch/test_helmet.html", "w", encoding="utf-8") as f:
    f.write(html_content)

user_data = os.path.abspath("scratch/chrome_tmp_helmet")
os.makedirs(user_data, exist_ok=True)
out_file = os.path.abspath("scratch/test_helmet_photo1.png")

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
