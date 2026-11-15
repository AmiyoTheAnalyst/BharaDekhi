import os
import subprocess

html_content = r'''<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Production Dual Motorcycle Verification</title>
  <style>
    body { margin: 0; background: #0c1220; overflow: hidden; }
    #canvas-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <script src="../assets/three.min.js"></script>
  <script src="../assets/crossroads-3d.js"></script>
  <script>
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1220);
    const camera = new THREE.PerspectiveCamera(36, 1280 / 720, 0.1, 1000);
    // CAMERA_SETUP_PLACEHOLDER

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1280, 720);
    renderer.setPixelRatio(1.5);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.15);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff7ed, 1.45);
    dir.position.set(16, 26, 20);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.75);
    fill.position.set(-18, 14, -14);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffedd5, 0.65);
    rim.position.set(-10, 16, 22);
    scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // CALL_BIKE_PLACEHOLDER

    renderer.render(scene, camera);
    window.__RENDER_DONE__ = true;
  </script>
</body>
</html>'''

views = [
    # Model A: Streetfighter / Cafe Racer
    ('scratch/prod_bike_a_isometric.png', "const bike = window.create3DVehicle('bike', null, 'bike_a', { modelType: 'streetfighter' }); scene.add(bike);", (15.0, 9.5, 16.0), (0.0, 5.0, 0.0)),
    ('scratch/prod_bike_a_side.png', "const bike = window.create3DVehicle('bike', null, 'bike_a', { modelType: 'streetfighter' }); scene.add(bike);", (0.0, 5.2, 19.0), (0.0, 5.2, 0.0)),
    ('scratch/prod_bike_a_front_close.png', "const bike = window.create3DVehicle('bike', null, 'bike_a', { modelType: 'streetfighter' }); scene.add(bike);", (12.0, 7.5, 6.0), (5.5, 7.5, 0.0)),
    # Model B: Muscle Cruiser
    ('scratch/prod_bike_b_isometric.png', "const bike = window.create3DVehicle('bike', null, 'bike_b', { modelType: 'cruiser' }); scene.add(bike);", (15.0, 9.5, 16.0), (0.0, 5.0, 0.0)),
    ('scratch/prod_bike_b_side.png', "const bike = window.create3DVehicle('bike', null, 'bike_b', { modelType: 'cruiser' }); scene.add(bike);", (0.0, 5.2, 19.0), (0.0, 5.2, 0.0)),
    ('scratch/prod_bike_b_front_close.png', "const bike = window.create3DVehicle('bike', null, 'bike_b', { modelType: 'cruiser' }); scene.add(bike);", (12.0, 7.5, 6.0), (5.5, 7.5, 0.0)),
]

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
user_data = os.path.abspath('scratch/chrome_tmp_prod_motorcycles')
os.makedirs(user_data, exist_ok=True)

for out_name, call_code, cam_pos, look_at in views:
    cam_setup = f'camera.position.set({cam_pos[0]}, {cam_pos[1]}, {cam_pos[2]});\n    camera.lookAt({look_at[0]}, {look_at[1]}, {look_at[2]});'
    content = html_content.replace('// CAMERA_SETUP_PLACEHOLDER', cam_setup)
    content = content.replace('// CALL_BIKE_PLACEHOLDER', call_code)

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
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
        print(f'{out_name}: exists={os.path.exists(out_png)}, size={os.path.getsize(out_png) if os.path.exists(out_png) else 0}')
    except Exception as e:
        print(f'Error for {out_name}: {e}')
