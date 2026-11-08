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

class DumpHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_POST(self):
        if self.path == '/__log':
            len_ = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(len_).decode('utf-8')
            with open('bike_debug_info.txt', 'w', encoding='utf-8') as f:
                f.write(data)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()

ready = threading.Event()
t = threading.Thread(target=lambda: (ready.set(), socketserver.TCPServer(('127.0.0.1', PORT), DumpHandler).serve_forever()), daemon=True)
t.start()
ready.wait(5)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
out_path = os.path.abspath("scratch/bike_test_probe.png")

cmd = [
    chrome_path,
    "--headless=new",
    "--no-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    f"--screenshot={out_path}",
    "--window-size=1280,720",
    "--virtual-time-budget=5000",
    f"http://127.0.0.1:{PORT}/index.html?view=3d&cam=bike&center=1&probe=1"
]
print("Running chrome probe...", flush=True)
res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
print("Finished probe.", flush=True)
