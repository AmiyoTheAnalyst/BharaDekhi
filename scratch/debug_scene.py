import http.server
import socketserver
import threading
import time
import subprocess
import os

PORT = 8765

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

def main():
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(1)

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    # Run chrome with inspect or dump console
    cmd = [
        chrome_path,
        "--headless=new",
        "--no-sandbox",
        "--enable-webgl",
        "--use-gl=angle",
        "--enable-logging=stderr",
        "--v=1",
        "--window-size=1280,720",
        "--virtual-time-budget=6000",
        f"http://127.0.0.1:{PORT}/index.html?view=3d"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Stderr:", res.stderr[:2000])

if __name__ == "__main__":
    main()
