import os
import subprocess

html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bike Test</title>
  <style>body { margin: 0; background: #0c1220; overflow: hidden; }</style>
</head>
<body>
  <div id="canvas-container" style="width: 1280px; height: 720px;"></div>
  <script src="../assets/three.min.js"></script>
  <script src="../assets/crossroads-3d.js"></script>
  <script>
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1220);
    const camera = new THREE.PerspectiveCamera(36, 1280 / 720, 0.1, 1000);
    camera.position.set(14, 10, 16);
    camera.lookAt(0, 4.0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1280, 720);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.2);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff7ed, 1.5);
    dir.position.set(15, 25, 20);
    scene.add(dir);

    // Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const bike = window.create3DVehicle('bike', 0xffffff, 0, { id: 'test_bike_0' });
    if (bike) scene.add(bike);

    renderer.render(scene, camera);
    window.__RENDER_DONE__ = true;
  </script>
</body>
</html>"""

with open('scratch/current_bike_test.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_bike')
os.makedirs(user_data, exist_ok=True)
out_png = os.path.abspath('scratch/current_bike_render.png')

cmd = [
    chrome_path,
    '--headless=new',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--enable-webgl',
    '--use-gl=angle',
    '--window-size=1280,720',
    f'--user-data-dir={user_data}',
    f'--screenshot={out_png}',
    f'file:///{os.path.abspath("scratch/current_bike_test.html").replace(os.sep, "/")}'
]
subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
print('Current bike exists:', os.path.exists(out_png))
