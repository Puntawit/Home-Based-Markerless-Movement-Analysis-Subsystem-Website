from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/movement/assess":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("content-length", "0"))
        if content_length:
            self.rfile.read(content_length)

        payload = {
            "session_id": "fake-mediapipe-e2e",
            "video_metadata": {
                "duration_seconds": 1.0,
                "fps": 30,
                "frame_count": 30,
            },
            "clinical_metrics": {
                "pose_quality": {
                    "mean_keypoint_confidence": 0.94,
                    "occlusion_warning": False,
                },
                "joint_angles": {
                    "hip_flexion_peak": 82,
                    "knee_extension_peak": 6,
                },
                "compensation": {
                    "trunk_lean_detected": False,
                },
                "smoothness": {
                    "movement_smoothness_score": 0.88,
                },
                "symmetry_index_score": 0.91,
            },
            "screening_result": {
                "risk_level": "low",
                "confidence_score": 0.92,
                "flags": ["E2E fake analysis complete"],
            },
            "transformation_matrix_6dof": [
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
            ],
        }

        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 8010), Handler)
    server.serve_forever()
