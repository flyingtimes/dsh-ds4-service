// 安全守卫测试：mock webServer 捕获 handler，模拟各种来源的请求
import { internals } from '../index.js';

const config = internals.loadConfig();
const routes = new Map();
const fakeWebServer = {
  port: 3080,
  host: '127.0.0.1',
  register: (route) => routes.set(route.path, route.handler),
};
const fakeCtx = {
  webServer: fakeWebServer,
  get: (name) => (name === 'webRuntime'
    ? { trustedHosts: ['192.168.1.5'], lanAddresses: ['192.168.1.5'] }
    : undefined),
};
const state = {
  lastAction: null, lastAt: 0, lastOk: null, lastDetail: '',
  setLast(a) { this.lastAction = a; },
  snapshot() { return { lastAction: this.lastAction }; },
};

internals.registerRoutes(fakeCtx, config, state);

function makeReq(headers, body) {
  return {
    method: body === undefined ? 'GET' : 'POST',
    url: '/plugin-api/ds4/status',
    headers,
    on: () => {}, destroy() {},
  };
}
function makeRes() {
  const out = { status: 0, body: '' };
  return {
    out,
    writeHead(status, headers) { out.status = status; out.headers = headers; },
    end(body) { out.body = body || ''; },
  };
}
async function call(path, headers, body) {
  const handler = routes.get(path);
  const req = makeReq(headers, body);
  req.method = body === undefined ? 'GET' : 'POST';
  req.url = path;
  if (body !== undefined) {
    // 模拟已读取的 body（readBody 通过事件收集；这里直接预注入）
    const chunks = [Buffer.from(body)];
    req.on = (ev, fn) => { if (ev === 'data') chunks.forEach(fn); if (ev === 'end') setImmediate(fn); };
  }
  const res = makeRes();
  await handler(req, res);
  return res.out;
}

const cases = [
  // [描述, headers, body, 期望 status]
  ['正常同源 GET(Host 回环)', { host: '127.0.0.1:3080' }, undefined, 200],
  ['localhost Host', { host: 'localhost:3080' }, undefined, 200],
  ['同源 Origin(浏览器 POST)', { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' }, '{}', 200],
  ['LAN Host(受信 IP)', { host: '192.168.1.5:3080', origin: 'http://192.168.1.5:3080' }, '{}', 200],
  ['CSRF: 伪造 Origin', { host: '127.0.0.1:3080', origin: 'http://evil.example' }, '{}', 403],
  ['CSRF: Origin null', { host: '127.0.0.1:3080', origin: 'null' }, '{}', 403],
  ['重绑定: 伪 Host', { host: 'evil.example:3080' }, undefined, 403],
  ['重绑定: 伪 Host + 匹配 Origin', { host: 'evil.example:3080', origin: 'http://evil.example:3080' }, undefined, 403],
  ['Sec-Fetch-Site cross-site', { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080', 'sec-fetch-site': 'cross-site' }, '{}', 403],
  ['无 Host 头', {}, undefined, 403],
  ['curl(无 Origin 无 Sec-Fetch)', { host: '127.0.0.1:3080' }, '{}', 200],
];

let failed = 0;
for (const [desc, headers, body, expect] of cases) {
  const path = body === undefined ? '/plugin-api/ds4/status' : '/plugin-api/ds4/config';
  const out = await call(path, headers, body);
  const pass = out.status === expect;
  if (!pass) failed++;
  console.log(`${pass ? '✓' : '✗'} [${out.status}] ${desc}${pass ? '' : ` — 期望 ${expect}, body=${String(out.body).slice(0, 80)}`}`);
}
console.log(failed ? `\n${failed} 个用例失败` : '\n全部通过');
process.exit(failed ? 1 : 0);
