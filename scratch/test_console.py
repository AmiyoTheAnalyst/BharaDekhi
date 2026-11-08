import http.server
import socketserver
import threading
import time
import subprocess
import os

PORT = 8769
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def main():
    t = threading.Thread(target=lambda: socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler).serve_forever(), daemon=True)
    t.start()
    time.sleep(1)

    chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    cmd = [
        chrome_path,
        '--headless=new',
        '--no-sandbox',
        '--enable-webgl',
        '--use-gl=angle',
        '--enable-logging=stderr',
        '--v=1',
        '--virtual-time-budget=6000',
        '--screenshot=scratch_test.png',
        f'http://127.0.0.1:{PORT}/index.html?view=3d'
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    with open('console_output.txt', 'w', encoding='utf-8') as f:
        f.write(res.stdout + '\n--- STDERR ---\n' + res.stderr)
    print("Logged to console_output.txt")

if __name__ == '__main__':
    main()
