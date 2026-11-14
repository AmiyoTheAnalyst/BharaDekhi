import os
import subprocess

html_template = """<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Production CNG Render</title>
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
    scene.background = new THREE.Color(0x0c1220);
    const camera = new THREE.PerspectiveCamera(36, 1280 / 720, 0.1, 1000);
    // CAMERA_SETUP_PLACEHOLDER

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(1.5);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.15);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff7ed, 1.45);
    dir.position.set(16, 26, 20);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.75);
    fill.position.set(-18, 14, -14);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffedd5, 0.65);
    rim.position.set(-10, 16, 22);
    scene.add(rim);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(140, 140);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const cng = window.create3DVehicle('cng', 0x00a65a, 202, { id: 'cng_prod_test' });
    if (cng) {
      scene.add(cng);
    }

    renderer.render(scene, camera);
    window.__RENDER_DONE__ = true;
  </script>
</body>
</html>"""

views = [
    ('scratch/prod_cng_side_profile.png', (0.5, 7.5, 34.0), (0.5, 6.5, 0)),
    ('scratch/prod_cng_driver_close.png', (3.5, 7.5, 14.0), (2.0, 6.5, 0)),
    ('scratch/prod_cng_passengers_close.png', (-1.0, 7.2, 14.0), (-6.5, 6.5, 0)),
    ('scratch/prod_cng_isometric.png', (18.0, 16.0, 24.0), (0, 7.0, 0))
]

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_prod_cng')
os.makedirs(user_data, exist_ok=True)

for out_name, cam_pos, look_at in views:
    cam_setup = f'camera.position.set({cam_pos[0]}, {cam_pos[1]}, {cam_pos[2]});\n    camera.lookAt({look_at[0]}, {look_at[1]}, {look_at[2]});'
    content = html_template.replace('// CAMERA_SETUP_PLACEHOLDER', cam_setup)

    temp_html_path = os.path.abspath(f'scratch/temp_{os.path.basename(out_name)}.html')
    with open(temp_html_path, 'w', encoding='utf-8') as f:
        f.write(content)

    out_png = os.path.abspath(out_name)
    if os.path.exists(out_png):
        try: os.remove(out_png)
        except: pass

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
        f'file:///{temp_html_path.replace(os.sep, "/")}'
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
        print(f'{out_name}: exists={os.path.exists(out_png)}, size={os.path.getsize(out_png) if os.path.exists(out_png) else 0}')
    except Exception as e:
        print(f'Error for {out_name}: {e}')
