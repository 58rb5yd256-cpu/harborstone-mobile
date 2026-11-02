// TEST HARNESS ONLY (not deployed). Serves public/ and runs the REAL api/auth handlers in-process,
// with the Resend HTTPS call replaced by a local capture so the emailed code can be read by the test.
// This proves the server logic and the request that would be sent to Resend — it does NOT prove delivery by a real provider.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); const pub = path.join(root, 'public');
Object.assign(process.env, { HM_LOGIN_EMAIL: 'jessicabrownn088@gmail.com', HM_LOGIN_PASSWORD: 'Test-Only-Pw-123!', HM_OTP_SECRET: 'test-only-secret-0123456789abcdef0123', HM_OTP_TO: 'jessicabrownn088@gmail.com', RESEND_API_KEY: 're_test_stub', HM_FROM_EMAIL: 'Harborstone Bank <no-reply@example.test>', VERCEL_ENV: 'production' });
let offset = 0; const realNow = Date.now; Date.now = () => realNow() + offset; // lets the test fast-forward past the 5-minute expiry
const mails = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => { if (String(url).startsWith('https://api.resend.com/')) { mails.push({ auth: init.headers.Authorization, ...JSON.parse(init.body) }); return new Response('{"id":"stub"}', { status: 200 }); } return realFetch(url, init); };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const handlers = {}; for (const n of ['request-otp', 'verify-otp']) handlers[n] = (await import(pathToFileURL(path.join(root, 'api/auth', n + '.js')))).default;
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__mails') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(mails)); }
  if (u.pathname === '/__advance') { offset += Number(u.searchParams.get('ms') || 0); return res.end('ok'); }
  const m = u.pathname.match(/^\/api\/auth\/([a-z-]+)$/);
  if (m && handlers[m[1]]) { let b = ''; for await (const c of req) b += c; req.body = b; return handlers[m[1]](req, res); }
  let p = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname); const f = path.join(pub, path.normalize(p));
  if (!f.startsWith(pub) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
}).listen(8010, () => console.log('api harness on 8010'));
