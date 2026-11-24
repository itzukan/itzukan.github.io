"""Local-only HTTP exercise for the API key lesson."""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/products":
            self.send_json(404, {"error": "not_found"})
            return

        auth = self.headers.get("Authorization", "").split(None, 1)
        if len(auth) != 2 or auth[0].lower() != "bearer" or auth[1] != "itzukan-demo-key":
            self.send_json(401, {"error": "unauthorized"})
            return

        self.send_json(200, {
            "products": [{"id": 101, "name": "りんご"}, {"id": 105, "name": "バナナ"}],
        })

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if status == 401:
            self.send_header("WWW-Authenticate", 'Bearer realm="api-key-practice"')
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    with HTTPServer(("127.0.0.1", 8711), Handler) as server:
        print("http://127.0.0.1:8711/products", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
