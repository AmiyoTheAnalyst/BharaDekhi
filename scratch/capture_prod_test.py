import os
import subprocess

html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Prod Rickshaw Render</title>
  <style>
    body { margin: 0; background: #070b14; overflow: hidden; }
    #canvas-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id='canvas-container'></div>
  <script src='../assets/three.min.js'></script>
  <script src='../assets/crossroads-3d.js'></script>
  <script>
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    const camera = new THREE.PerspectiveCamera(38, 1280 / 720, 0.1, 1000);
    camera.position.set(0.5, 6.2, 17.5);
    camera.lookAt(0.5, 5.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(1.5);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff7ed, 1.4);
    dir.position.set(12, 22, 15);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.7);
    fill.position.set(-15, 10, -10);
    scene.add(fill);

    const rick = window.create3DVehicle('rickshaw', 0x0284c7, 101, { id: 'test' });
    if (rick) {
      scene.add(rick);
    }

    renderer.render(scene, camera);
  </script>
</body>
</html>"""

with open('scratch/test_prod_local.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_prod')
os.makedirs(user_data, exist_ok=True)
html_file = os.path.abspath('scratch/test_prod_local.html')
out_png = os.path.abspath('scratch/test_prod_render.png')

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
    f'file:///{html_file.replace(os.sep, "/")}'
]

res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print('Result size:', os.path.getsize(out_png) if os.path.exists(out_png) else 'NOT FOUND')
