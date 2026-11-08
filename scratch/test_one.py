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

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

ready = threading.Event()
t = threading.Thread(target=lambda: (ready.set(), socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler).serve_forever()), daemon=True)
t.start()
ready.wait(5)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
out_path = os.path.abspath("screenshot_bike_centered.png")
if os.path.exists(out_path):
    os.remove(out_path)

cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    f"--screenshot={out_path}",
    "--window-size=1280,720",
    "--virtual-time-budget=5000",
    f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1"
]
print("Running chrome...", flush=True)
res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
print(f"Done. Returncode: {res.returncode}", flush=True)
if os.path.exists(out_path):
    print(f"Captured {out_path} ({os.path.getsize(out_path)} bytes)", flush=True)
else:
    print(f"No file. Stderr: {res.stderr}", flush=True)
