import http.server
import socketserver
import threading
import time
import subprocess
import os

PORT = 8766

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
            httpd.serve_forever()
    except Exception:
        pass

def main():
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(1)

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    out_path = os.path.abspath("scratch/bike_debug.png")
    cmd = [
        chrome_path,
        "--headless=new",
        "--no-sandbox",
        "--enable-webgl",
        "--use-gl=angle",
        "--enable-logging=stderr",
        "--v=1",
        f"--screenshot={out_path}",
        "--window-size=1280,720",
        "--virtual-time-budget=4000",
        f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    with open("scratch/chrome_stderr.log", "w", encoding="utf-8") as f:
        f.write(res.stderr)
    print("Done. Stderr written to scratch/chrome_stderr.log")

if __name__ == "__main__":
    main()
