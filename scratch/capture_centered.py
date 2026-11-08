import http.server
import socketserver
import threading
import time
import subprocess
import os

PORT = 8765

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
            httpd.serve_forever()
    except Exception:
        pass

def capture(url_path, out_file, budget=3500):
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    out_path = os.path.abspath(out_file)
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
        f"--virtual-time-budget={budget}",
        f"http://127.0.0.1:{PORT}/{url_path}"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(out_path):
        print(f"Captured {out_file} ({os.path.getsize(out_path)} bytes)")
    else:
        print(f"Failed to capture {out_file}. Stderr: {res.stderr}")

def main():
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(1)

    print("Capturing 3D Drone Overview...")
    capture("index.html?view=3d", "screenshot_3d_drone.png", budget=3500)

    print("Capturing Bike Centered...")
    capture("index.html?view=3d&cam=bike&center=1", "screenshot_bike_centered.png", budget=3500)

    print("Capturing Cycle Rickshaw Centered...")
    capture("index.html?view=3d&cam=rickshaw&center=1", "screenshot_rickshaw_centered.png", budget=3500)

    print("Capturing CNG Centered...")
    capture("index.html?view=3d&cam=cng&center=1", "screenshot_cng_centered.png", budget=3500)

    print("Capturing Bus Centered...")
    capture("index.html?view=3d&cam=bus&center=1", "screenshot_bus_centered.png", budget=3500)

    print("Capturing 2D Flat Mode...")
    capture("index.html?view=2d", "screenshot_2d_flat.png", budget=2500)

    print("All captures completed!")

if __name__ == "__main__":
    main()
