import http.server
import socketserver
import threading
import subprocess
import os
import socket

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

PORT = find_free_port()

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

httpd = socketserver.TCPServer(('127.0.0.1', PORT), Handler)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

out_path = os.path.abspath("screenshot_bus_centered.png")
if os.path.exists(out_path):
    os.remove(out_path)

chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
cmd = [
    chrome,
    "--headless=new",
    "--no-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    f"--screenshot={out_path}",
    "--window-size=1280,720",
    "--virtual-time-budget=6000",
    f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bus&center=1"
]

res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
if os.path.exists(out_path):
    print("SUCCESS: captured", os.path.getsize(out_path), "bytes")
else:
    print("FAIL:", res.stderr[:300])

httpd.shutdown()
