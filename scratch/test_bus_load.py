import http.server
import socketserver
import threading
import subprocess
import os

PORT = 8995
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

test_html = """
<!DOCTYPE html>
<html>
<head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
</head>
<body>
<script>
new THREE.GLTFLoader().load('http://127.0.0.1:8995/assets/models/dhaka-bus.glb',
  gltf => {
    console.log('BUS_LOAD_SUCCESS: children=' + gltf.scene.children.length);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    console.log('BUS_SIZE: x=' + size.x + ' y=' + size.y + ' z=' + size.z);
  },
  undefined,
  err => {
    console.error('BUS_LOAD_ERROR:', err);
  }
);
</script>
</body>
</html>
"""

with open('scratch/test_bus.html', 'w') as f:
    f.write(test_html)

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
cmd = [
    chrome,
    '--headless=new',
    '--no-sandbox',
    '--enable-logging=stderr',
    '--v=1',
    '--virtual-time-budget=5000',
    'http://127.0.0.1:8995/scratch/test_bus.html'
]

res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
for line in res.stderr.splitlines():
    if 'BUS_' in line or 'CONSOLE' in line:
        print(line)
httpd.shutdown()
