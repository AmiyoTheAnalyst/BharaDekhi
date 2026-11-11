import subprocess
import os

studio_path = os.path.abspath("scratch/test_rickshaw_view.html").replace("\\", "/")

html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="../assets/three.min.js"></script>
  <style>body { margin: 0; background: #0b0f19; overflow: hidden; }</style>
</head>
<body>
<script src="../assets/crossroads-3d.js"></script>
<script>
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  const camera = new THREE.PerspectiveCamera(35, 1280 / 720, 0.1, 100);
  camera.position.set(0, 10, 32);
  camera.lookAt(0, 7.5, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(1280, 720);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  document.body.appendChild(renderer.domElement);

  const amb = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfffaed, 1.5);
  sun.position.set(15, 25, 20);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x93c5fd, 0.6);
  fill.position.set(-15, 10, -15);
  scene.add(fill);

  // Ground plane
  const road = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }));
  road.rotation.x = -Math.PI / 2;
  scene.add(road);

  window.scene = scene;
  const rickshaw = window.create3DVehicle('rickshaw', null, 'rick_test', { type: 'rickshaw', dir: 'EB', pos: 600 });
  scene.add(rickshaw);

  // Update pedaling to a 45 deg angle
  if (rickshaw.userData && rickshaw.userData.updatePedaling) {
    rickshaw.userData.updatePedaling(Math.PI * 0.35);
  }

  renderer.render(scene, camera);
</script>
</body>
</html>
"""

with open("scratch/test_rickshaw_view.html", "w", encoding="utf-8") as f:
    f.write(html_content)

user_data = os.path.abspath("scratch/chrome_tmp_rickshaw")
os.makedirs(user_data, exist_ok=True)
out_file = os.path.abspath("scratch/test_rickshaw_procedural.png")

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
