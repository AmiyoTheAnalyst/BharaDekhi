import http.server
import socketserver
import threading
import subprocess
import os

PORT = 8999

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

test_html = f"""
<!DOCTYPE html>
<html>
<head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
</head>
<body>
<script>
new THREE.GLTFLoader().load('http://127.0.0.1:{PORT}/assets/models/sportbike-rider.glb',
  gltf => {{
    console.log('BIKE_SUCCESS: nodes=' + gltf.scene.children.length);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    console.log('BIKE_SIZE: x=' + size.x + ' y=' + size.y + ' z=' + size.z);
    document.title = 'SUCCESS: ' + size.x;
  }},
  undefined,
  err => {{
    console.error('BIKE_ERROR:', err);
    document.title = 'ERROR: ' + err.message;
  }}
);
</script>
</body>
</html>
"""

with open("scratch/test_loader.html", "w") as f:
    f.write(test_html)

chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
cmd = [
    chrome,
    "--headless=new",
    "--no-sandbox",
    "--enable-logging=stderr",
    "--v=1",
    "--virtual-time-budget=5000",
    f"http://127.0.0.1:{PORT}/scratch/test_loader.html"
]

res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
httpd.shutdown()
