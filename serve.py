import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not os.path.exists(self.path[1:]):  # Check if the requested path doesn't exist
            self.path = '/index.html'  # Serve index.html instead
        return super().do_GET()

if __name__ == '__main__':
    httpd = HTTPServer(('localhost', 8000), CustomHandler)
    print("Serving on http://localhost:8000")
    httpd.serve_forever()
