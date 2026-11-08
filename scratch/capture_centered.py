import http.server
import socketserver
import threading
import time
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

def run_server(server_ready_event):
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
            server_ready_event.set()
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}", flush=True)

def capture(url_path, out_file, budget=3500):
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    out_path = os.path.abspath(out_file)
    if os.path.exists(out_path):
        try:
            os.remove(out_path)
        except Exception:
            pass
    cmd = [
        chrome_path,
        "--headless=new",
        "--no-sandbox",
        "--enable-webgl",
        "--use-gl=angle",
        f"--screenshot={out_path}",
        "--window-size=1280,720",
        f"--virtual-time-budget={budget}",
        f"http://127.0.0.1:{PORT}/{url_path}"
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
            print(f"Captured {out_file} ({os.path.getsize(out_path)} bytes)", flush=True)
        else:
            print(f"Failed to capture {out_file}. ReturnCode: {res.returncode}", flush=True)
    except subprocess.TimeoutExpired:
        print(f"Timeout capturing {out_file}", flush=True)
    except Exception as ex:
        print(f"Error capturing {out_file}: {ex}", flush=True)

def main():
    ready = threading.Event()
    t = threading.Thread(target=run_server, args=(ready,), daemon=True)
    t.start()
    if not ready.wait(timeout=5):
        print("Server failed to start!", flush=True)
        return
    print(f"Server started on port {PORT}", flush=True)

    print("Capturing Bike Centered...", flush=True)
    capture("index.html?view=3d&cam=bike&center=1", "screenshot_bike_centered.png", budget=3500)

    print("Capturing Cycle Rickshaw Centered...", flush=True)
    capture("index.html?view=3d&cam=rickshaw&center=1", "screenshot_rickshaw_centered.png", budget=3500)

    print("Capturing CNG Centered...", flush=True)
    capture("index.html?view=3d&cam=cng&center=1", "screenshot_cng_centered.png", budget=3500)

    print("Capturing Bus Centered...", flush=True)
    capture("index.html?view=3d&cam=bus&center=1", "screenshot_bus_centered.png", budget=3500)

    print("Capturing 3D Drone Overview...", flush=True)
    capture("index.html?view=3d", "screenshot_3d_drone.png", budget=3500)

    print("Capturing 2D Flat Mode...", flush=True)
    capture("index.html?view=2d", "screenshot_2d_flat.png", budget=2500)

    print("All captures completed!", flush=True)

if __name__ == "__main__":
    main()
