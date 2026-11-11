"""Integration tests against real PHP HTTP uploads and a local Supabase stand-in.

Usage: python scripts/test-sw-media.py --php /path/to/php
No production credentials, database rows or files are used.
"""
import argparse
import base64
import io
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REPO = Path(__file__).resolve().parent.parent
USER_ID = '12345678-1234-4123-8123-123456789012'


class SupabaseHandler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        token = self.headers.get('Authorization', '')
        status, body = 200, {}
        if self.headers.get('apikey') != 'test-anon-key':
            status = 401
        elif token == 'Bearer backend-down':
            status = 503
        elif token not in ('Bearer admin-token', 'Bearer user-token'):
            status = 401
        elif self.path == '/auth/v1/user':
            body = {'id': USER_ID}
        elif self.path.startswith('/rest/v1/admin_profiles?'):
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            assert query == {'user_id': ['eq.' + USER_ID], 'select': ['user_id'], 'limit': ['1']}
            body = [{'user_id': USER_ID}] if token == 'Bearer admin-token' else []
        else:
            status = 404
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())


class MediaApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='viveutrera-media-test-')
        cls.root = Path(cls.temp.name)
        cls.web = cls.root / 'web'
        cls.media = cls.web / 'media'
        cls.media.mkdir(parents=True)
        shutil.copytree(REPO / 'sw-hosting', cls.web / 'api')
        cls.backend = ThreadingHTTPServer(('127.0.0.1', 0), SupabaseHandler)
        cls.thread = threading.Thread(target=cls.backend.serve_forever, daemon=True)
        cls.thread.start()
        config = {'supabase_url': f'http://127.0.0.1:{cls.backend.server_port}',
                  'supabase_anon_key': 'test-anon-key', 'public_media_url': 'https://viveutrera.es/media',
                  'media_directory': str(cls.media),
                  'allowed_origins': ['https://viveutrera.es', 'https://www.viveutrera.es']}
        encoded = base64.b64encode(json.dumps(config).encode()).decode()
        (cls.web / 'api/media-config.php').write_text(
            f"<?php return json_decode(base64_decode('{encoded}'), true);", encoding='utf-8')
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            port = listener.getsockname()[1]
        cls.base = f'http://127.0.0.1:{port}'
        cls.log = (cls.root / 'php.log').open('w')
        php_path = Path(PHP).resolve()
        options = ['-n']
        if os.name == 'nt':
            options += ['-d', f'extension_dir={php_path.parent / "ext"}',
                        '-d', 'extension=curl', '-d', 'extension=fileinfo']
        else:
            options = []  # Use the installed PHP extensions on Unix.
        options += ['-d', 'upload_max_filesize=1M', '-d', 'post_max_size=4M',
                    '-S', f'127.0.0.1:{port}', '-t', str(cls.web)]
        cls.process = subprocess.Popen([str(php_path), *options], stdout=cls.log, stderr=cls.log)
        for _ in range(50):
            try:
                urllib.request.urlopen(cls.base + '/api/media.php?action=health', timeout=1).close()
                break
            except (urllib.error.URLError, TimeoutError):
                time.sleep(0.1)
        else:
            cls.process.terminate()
            cls.process.wait()
            cls.log.close()
            raise RuntimeError((cls.root / 'php.log').read_text())
        cls.png = (REPO / 'public/brand/pwa-icon-180.png').read_bytes()

    @classmethod
    def tearDownClass(cls):
        cls.process.terminate()
        cls.process.wait(timeout=5)
        cls.backend.shutdown()
        cls.backend.server_close()
        cls.log.close()
        cls.temp.cleanup()

    def request(self, action, *, method='POST', token='admin-token', body=b'', content_type='application/json', origin=None):
        headers = {'Content-Type': content_type}
        if token is not None:
            headers['Authorization'] = 'Bearer ' + token
        if origin:
            headers['Origin'] = origin
        request = urllib.request.Request(self.base + '/api/media.php?action=' + action,
                                         data=body if method == 'POST' else None, headers=headers, method=method)
        try:
            response = urllib.request.urlopen(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None, response.headers

    def upload(self, data=None, *, target='element-image', filename='foto.png', token='admin-token', mime='image/png'):
        boundary = 'viveutrera-test-boundary'
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="target"\r\n\r\n{target}\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
                f'Content-Type: {mime}\r\n\r\n').encode() + (self.png if data is None else data)
        body += f'\r\n--{boundary}--\r\n'.encode()
        return self.request('upload', token=token, body=body, content_type=f'multipart/form-data; boundary={boundary}')

    def test_health_and_cache(self):
        status, body, headers = self.request('health', method='GET', token=None)
        self.assertEqual(status, 200)
        self.assertEqual(body, {'ok': True, 'storage': 'SW Hosting'})
        self.assertEqual(headers['Cache-Control'], 'no-store')

    def test_authentication_and_admin_membership_are_required(self):
        for token, expected in [(None, 401), ('expired-token', 401), ('user-token', 403), ('backend-down', 503)]:
            with self.subTest(token=token):
                self.assertEqual(self.upload(token=token)[0], expected)

    def test_health_explains_missing_requirements_without_exposing_paths(self):
        temporary = self.web / 'media-not-mounted'
        self.media.rename(temporary)
        try:
            status, body, _ = self.request('health', method='GET', token=None)
            self.assertEqual(status, 503)
            self.assertFalse(body['ok'])
            self.assertFalse(body['checks']['media_exists'])
            self.assertFalse(body['checks']['media_writable'])
            self.assertTrue(all(isinstance(value, bool) for value in body['checks'].values()))
            self.assertNotIn(str(self.root), json.dumps(body))
            self.assertNotIn('test-anon-key', json.dumps(body))
        finally:
            temporary.rename(self.media)

    def test_upload_image_and_public_response(self):
        status, body, _ = self.upload(filename='foto.php')
        self.assertEqual(status, 201)
        asset = body['asset']
        self.assertTrue(asset['object_key'].startswith('element-image/'))
        self.assertTrue(asset['object_key'].endswith('.png'))
        self.assertEqual(asset['mime_type'], 'image/png')
        self.assertEqual(asset['file_size'], len(self.png))
        self.assertEqual((self.media / asset['object_key']).read_bytes(), self.png)
        self.assertEqual(body['publicUrl'], 'https://viveutrera.es/media/' + asset['object_key'])

    def test_audio_upload(self):
        stream = io.BytesIO()
        with wave.open(stream, 'wb') as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(8000)
            audio.writeframes(b'\0' * 16000)
        status, body, _ = self.upload(stream.getvalue(), target='element-audio', filename='audio.wav', mime='audio/wav')
        self.assertEqual(status, 201)
        self.assertEqual(body['asset']['media_type'], 'audio')
        self.assertEqual((self.media / body['asset']['object_key']).read_bytes(), stream.getvalue())

    def test_upload_validation_and_server_size_limit(self):
        for options, expected in [({'target': '../api'}, 400), ({'data': b'<?php echo 1;'}, 415),
                                  ({'target': 'element-audio'}, 415), ({'data': b''}, 413),
                                  ({'data': self.png + b'\0' * (1024 * 1024)}, 413)]:
            with self.subTest(options=list(options)):
                self.assertEqual(self.upload(**options)[0], expected)

    def test_delete_and_missing_file_retry(self):
        status, body, _ = self.upload()
        self.assertEqual(status, 201)
        key = body['asset']['object_key']
        for _ in range(2):
            status, result, _ = self.request('delete', body=json.dumps({'objectKeys': [key]}).encode())
            self.assertEqual(status, 200)
            self.assertEqual(result, {'deleted': [key]})
            self.assertFalse((self.media / key).exists())

    def test_invalid_delete_batch_does_not_remove_any_file(self):
        _, body, _ = self.upload()
        key = body['asset']['object_key']
        for invalid in ['../api/media.php', '/site/a.jpg', 'site/../../a.jpg', 'site/a.php',
                        'site/a.jpg/../b.jpg', 'site/link\\file.jpg', 'site/%2e%2e/a.jpg', None]:
            with self.subTest(invalid=invalid):
                status, _, _ = self.request('delete', body=json.dumps({'objectKeys': [key, invalid]}).encode())
                self.assertEqual(status, 400)
                self.assertTrue((self.media / key).exists())

    def test_delete_authorization_and_json_validation(self):
        for token, expected in [(None, 401), ('user-token', 403), ('expired-token', 401)]:
            self.assertEqual(self.request('delete', token=token, body=b'{"objectKeys":["site/a.jpg"]}')[0], expected)
        for body in [b'{invalid', b'{}', b'{"objectKeys":[]}', json.dumps({'objectKeys': ['site/a.jpg'] * 101}).encode()]:
            self.assertEqual(self.request('delete', body=body)[0], 400)

    def test_symbolic_links_cannot_escape_media_root(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'sentinel.jpg').write_bytes(b'protected')
        (self.media / 'site').mkdir(exist_ok=True)
        try:
            (self.media / 'site/link').symlink_to(outside, target_is_directory=True)
        except OSError:
            if os.name != 'nt':
                raise
            # A Windows junction exercises the same path escape without requiring
            # the privileged symbolic-link capability.
            environment = dict(os.environ, VIVEUTRERA_TEST_LINK=str(self.media / 'site/link'),
                               VIVEUTRERA_TEST_TARGET=str(outside))
            subprocess.run(['powershell.exe', '-NoProfile', '-Command',
                            'New-Item -ItemType Junction -Path $env:VIVEUTRERA_TEST_LINK '
                            '-Target $env:VIVEUTRERA_TEST_TARGET -ErrorAction Stop | Out-Null'],
                           env=environment, check=True, capture_output=True)
        status, _, _ = self.request('delete', body=b'{"objectKeys":["site/link/sentinel.jpg"]}')
        self.assertEqual(status, 400)
        self.assertEqual((outside / 'sentinel.jpg').read_bytes(), b'protected')

    def test_cross_origin_and_methods(self):
        self.assertEqual(self.request('delete', origin='https://untrusted.example')[0], 403)
        self.assertEqual(self.request('delete', method='GET')[0], 405)
        self.assertEqual(self.request('unknown')[0], 404)
        status, _, headers = self.request('health', method='OPTIONS', origin='https://www.viveutrera.es')
        self.assertEqual(status, 204)
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'https://www.viveutrera.es')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--php', required=True)
    args = parser.parse_args()
    PHP = args.php
    unittest.main(argv=['test-sw-media'], verbosity=2)
