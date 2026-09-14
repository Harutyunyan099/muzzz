#!/usr/bin/env python3
"""Երգարանի տեղային սերվեր.

Գործարկիր՝  python3 server.py
Ապա բացիր՝  http://localhost:8000

Սերվերը աշխատում է միայն քո համակարգչում. ոչ մի ֆայլ ինտերնետ չի ուղարկվում։
"""

import http.server
import os
import socketserver
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.ogg': 'audio/ogg',
        '.opus': 'audio/ogg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '404' in (args[1] if len(args) > 1 else ''):
            sys.stderr.write('  չգտնվեց: %s\n' % (args[0] if args else ''))


def main():
    port = PORT
    for attempt in range(20):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(('127.0.0.1', port), Handler) as httpd:
                url = 'http://localhost:%d/' % port
                print('\n  Երգարանը պատրաստ է:  %s' % url)
                print('  Դադարեցնելու համար սեղմիր Ctrl+C\n')
                try:
                    webbrowser.open(url)
                except Exception:
                    pass
                httpd.serve_forever()
            return
        except OSError:
            port += 1
    print('Ազատ պորտ չգտնվեց։')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n  Ցտեսություն։')
