import http.server
import socketserver
import threading
import subprocess
import os
import socket
import sys

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

targets = [
    ("screenshot_bike_centered.png", f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1"),
    ("screenshot_rickshaw_centered.png", f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=rickshaw&center=1"),
    ("screenshot_cng_centered.png", f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=cng&center=1"),
    ("screenshot_bus_centered.png", f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bus&center=1"),
    ("screenshot_car_centered.png", f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=car&center=1"),
    ("screenshot_3d_drone.png", f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=overview"),
    ("screenshot_2d_flat.png", f"http://127.0.0.1:{PORT}/index.html?view=2d"),
]

for out_name, url in targets:
    out_path = os.path.abspath(out_name)
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
        url
    ]
    print(f"Capturing {out_name}...", flush=True)
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if os.path.exists(out_path):
        print(f"Captured {out_name} ({os.path.getsize(out_path)} bytes)", flush=True)
    else:
        print(f"Failed {out_name}. Stderr: {res.stderr[:200]}", flush=True)

print("ALL CAPTURES COMPLETED", flush=True)
