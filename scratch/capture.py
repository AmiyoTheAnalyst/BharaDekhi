import http.server
import socketserver
import threading
import time
import subprocess
import os
import json

PORT = 8765

class DumpHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_POST(self):
        if self.path == '/__dump':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            with open('scene_dump.json', 'w', encoding='utf-8') as f:
                f.write(body)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')
            print("Successfully saved scene_dump.json!")
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), DumpHandler) as httpd:
        httpd.serve_forever()

def capture(url_path, out_file, budget=8000):
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    out_path = os.path.abspath(out_file)
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

    print("Capturing 3D Drone view...")
    capture("index.html?view=3d", "screenshot_3d_drone.png", budget=6000)

if __name__ == "__main__":
    main()
