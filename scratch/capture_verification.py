import http.server
import socketserver
import threading
import subprocess
import os
import socket
import time

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

SCRATCH_DIR = r"C:\Users\HP\.gemini\antigravity\brain\a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8\scratch"
chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

file_base = 'file:///' + os.path.abspath('index.html').replace('\\', '/')

targets = [
    ("verify_bus.png", f"{file_base}?view=3d&cam=bus&center=1"),
    ("verify_rickshaw.png", f"{file_base}?view=3d&cam=rickshaw&center=1"),
    ("verify_cng.png", f"{file_base}?view=3d&cam=cng&center=1"),
    ("verify_bike.png", f"{file_base}?view=3d&cam=bike&center=1"),
    ("verify_drone.png", f"{file_base}?view=3d&cam=overview")
]

for name, url in targets:
    out_path = os.path.join(SCRATCH_DIR, name)
    if os.path.exists(out_path):
        os.remove(out_path)
    cmd = [
        chrome,
        "--headless=new",
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--enable-webgl",
        f"--screenshot={out_path}",
        "--window-size=1280,720",
        "--virtual-time-budget=4000",
        url
    ]
    print(f"Capturing {name}...", flush=True)
    subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if os.path.exists(out_path):
        print(f"SUCCESS: {name} ({os.path.getsize(out_path)} bytes)", flush=True)
    else:
        print(f"FAILED: {name}", flush=True)

httpd.shutdown()
print("ALL DONE", flush=True)
