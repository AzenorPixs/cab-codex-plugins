#!/usr/bin/env python3
"""Passerelle locale : identité du client fournie par le noyau, pas par JSON."""
import http.server
import json
import os
import shutil
import signal
import socket
import socketserver
import struct
import sys
import tempfile
import threading
import urllib.request

VERSION = '2.4.15'


def serve(config):
    parent = os.getppid()
    directory = tempfile.mkdtemp(prefix='cab-owner-ipc-')
    os.chmod(directory, 0o755)
    path = os.path.join(directory, 'owner.sock')

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            if self.path not in ('/cleanup/owner/poll', '/cleanup/owner/exchange','/ccab/owner/report','/statistics/owner/checkpoint'):
                self.send_error(404)
                return
            try:
                size = int(self.headers.get('Content-Length', '-1'))
                if not 0 <= size <= 4 * 1024 * 1024:
                    raise ValueError('size')
                pid, uid, gid = struct.unpack('3i', self.connection.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, 12))
                packet = urllib.request.Request(config['controllerUrl'] + self.path, data=self.rfile.read(size), method='POST',
                    headers={'content-type':'application/json', 'x-cab-continuity':'cab-continuity-v1',
                             'x-cab-owner-proxy':config['token'], 'x-cab-peer-pid':str(pid),
                             'x-cab-peer-uid':str(uid), 'x-cab-peer-gid':str(gid)})
                try:
                    with urllib.request.urlopen(packet, timeout=15) as response:
                        status, body = response.status, response.read(4*1024*1024)
                except urllib.error.HTTPError as error:
                    status, body = error.code, error.read(4096)
                self.send_response(status)
                self.send_header('content-type', 'application/json')
                self.send_header('content-length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (ValueError, OSError, urllib.error.URLError):
                self.send_error(503)

    class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
        daemon_threads = True

    server = Server(path, Handler)
    os.chmod(path, 0o666)
    signal.signal(signal.SIGTERM, lambda *_args: threading.Thread(target=server.shutdown, daemon=True).start())

    def follow_parent():
        while os.getppid() == parent:
            if threading.Event().wait(1):
                return
        server.shutdown()

    threading.Thread(target=follow_parent, daemon=True).start()
    print(json.dumps({'path':path, 'pid':os.getpid(), 'uid':os.getuid()}), flush=True)
    try:
        server.serve_forever(poll_interval=0.2)
    finally:
        server.server_close()
        shutil.rmtree(directory)


if __name__ == '__main__':
    serve(json.loads(sys.stdin.readline()))
