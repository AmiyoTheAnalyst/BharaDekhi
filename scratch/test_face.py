import os

html_code = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Face Canvas Texture Test</title>
  <style> body { margin: 0; background: #0b0f19; overflow: hidden; } #canvas-container { width: 100vw; height: 100vh; } </style>
</head>
<body>
<div id="canvas-container"></div>
<script src="../assets/three.min.js"></script>
<script>
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(4.0, 1.0, 3.0);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 1.1);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffedd5, 1.2);
  dirLight.position.set(5, 8, 6);
  scene.add(dirLight);

  function createPullerFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Base Warm Bengali Bronze Skin
    const skinGrad = ctx.createLinearGradient(0, 0, 0, 512);
    skinGrad.addColorStop(0, '#75402c');
    skinGrad.addColorStop(0.3, '#8e523b');
    skinGrad.addColorStop(0.7, '#854b35');
    skinGrad.addColorStop(1, '#663724');
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Full Hair covering back and sides, natural hairline in front
    ctx.fillStyle = '#111114';
    // Back of head (x: 0-140 and 372-512)
    ctx.fillRect(0, 0, 150, 512);
    ctx.fillRect(362, 0, 150, 512);
    // Top of head / crown (y: 0-160 across the whole width)
    ctx.fillRect(0, 0, 512, 160);

    // Natural curved hairline at forehead (centered at x = 256)
    ctx.beginPath();
    ctx.moveTo(140, 512);
    ctx.lineTo(150, 220); // right sideburn
    ctx.bezierCurveTo(170, 180, 210, 165, 256, 175); // right forehead curve
    ctx.bezierCurveTo(302, 165, 342, 180, 362, 220); // left forehead curve
    ctx.lineTo(372, 512);
    ctx.lineTo(512, 512);
    ctx.lineTo(512, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();

    // 3. Eyebrows (x = 256 center, y = 225)
    ctx.strokeStyle = '#151518';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';

    // Left eyebrow (viewer right, x ~ 290)
    ctx.beginPath();
    ctx.moveTo(270, 228);
    ctx.quadraticCurveTo(295, 218, 325, 226);
    ctx.stroke();

    // Right eyebrow (viewer left, x ~ 220)
    ctx.beginPath();
    ctx.moveTo(242, 228);
    ctx.quadraticCurveTo(217, 218, 187, 226);
    ctx.stroke();

    // 4. Eyes (y = 250)
    [-55, 55].forEach(ox => {
      const ex = 256 + ox;
      const ey = 250;

      // Almond Eye Socket Shadow
      ctx.fillStyle = 'rgba(40, 20, 12, 0.45)';
      ctx.beginPath();
      ctx.ellipse(ex, ey - 2, 26, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Sclera
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm Deep Brown Iris
      ctx.fillStyle = '#3a2014';
      ctx.beginPath();
      ctx.arc(ex, ey, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Catchlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 2.5, ey - 2.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Eyelid crease line
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 21, 10, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.stroke();
    });

    // 5. Nose Bridge and Tip Shading (x = 256, y = 265 to 300)
    ctx.strokeStyle = 'rgba(70, 35, 20, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(253, 235);
    ctx.lineTo(251, 285);
    ctx.stroke();

    // Nostril shadows
    ctx.fillStyle = '#421f14';
    ctx.beginPath();
    ctx.ellipse(244, 292, 5, 3, -0.2, 0, Math.PI * 2);
    ctx.ellipse(268, 292, 5, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Nose tip highlight
    ctx.fillStyle = 'rgba(255, 230, 210, 0.25)';
    ctx.beginPath();
    ctx.arc(256, 286, 7, 0, Math.PI * 2);
    ctx.fill();

    // 6. Authentic Bengali Mustache (x = 256, y = 312)
    ctx.fillStyle = '#141416';
    ctx.beginPath();
    ctx.moveTo(200, 322);
    ctx.quadraticCurveTo(230, 304, 256, 308);
    ctx.quadraticCurveTo(282, 304, 312, 322);
    ctx.quadraticCurveTo(286, 316, 256, 318);
    ctx.quadraticCurveTo(226, 316, 200, 322);
    ctx.closePath();
    ctx.fill();

    // 7. Lips (y = 332)
    ctx.fillStyle = '#7a3c30';
    // Upper lip (under mustache)
    ctx.beginPath();
    ctx.ellipse(256, 325, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lower lip
    ctx.fillStyle = '#8f4a3d';
    ctx.beginPath();
    ctx.ellipse(256, 334, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chin shadow
    ctx.fillStyle = 'rgba(50, 25, 15, 0.35)';
    ctx.beginPath();
    ctx.arc(256, 360, 14, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  const faceTex = createPullerFaceTexture();
  const headMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.65,
    metalness: 0.04
  });

  // Anatomical Head Mesh
  const headGroup = new THREE.Group();
  const skullGeo = new THREE.SphereGeometry(1.0, 32, 28);
  skullGeo.scale(0.88, 1.10, 0.88);
  // Rotate so phi=PI (u=0.5) faces +X
  skullGeo.rotateY(0);
  const headMesh = new THREE.Mesh(skullGeo, headMat);
  headGroup.add(headMesh);

  // 3D Nose Bridge for Physical Lighting & Shadow
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x854b35, roughness: 0.65 });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.42, 10), noseMat);
  nose.rotation.z = -Math.PI / 2 + 0.15;
  nose.position.set(0.96, -0.05, 0);
  headGroup.add(nose);

  // 3D Ears
  [-0.82, 0.82].forEach(ez => {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI * 1.3), noseMat);
    ear.scale.set(0.7, 1.1, 0.6);
    ear.position.set(-0.05, -0.05, ez);
    ear.rotation.y = ez > 0 ? 0.3 : -0.3;
    headGroup.add(ear);
  });

  scene.add(headGroup);

  renderer.render(scene, camera);
</script>
</body>
</html>
'''

with open('scratch/test_face_texture.html', 'w', encoding='utf-8') as f:
    f.write(html_code)

print("Saved scratch/test_face_texture.html")
