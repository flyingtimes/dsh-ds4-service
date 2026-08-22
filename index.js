/**
 * dsh-ds4-service — DS4 服务控制插件（服务端）。
 *
 * 在 DSH Web GUI 里开启 / 重启 / 关闭 ds4-server，并可视化配置 start.sh 的
 * 全部启动参数。插件自带 ds4-server 二进制与 start.sh（assets/），可部署到
 * 任意 serviceDir，实现完全自包含；默认直接驱动 ~/code/ds4-on-mac 项目。
 *
 * 设计要点：
 * - start.sh 本身所有参数都支持环境变量覆盖（MODEL/PORT/CTX/THREADS/KV_DIR/
 *   KV_SPACE_MB/MTP/DSPARK/WARM），插件只把配置映射成 env 传给 start.sh，
 *   完全不改动用户手调的 start.sh 文件。
 * - 状态检测以进程表扫描为准（pid 文件只作加速）：ds4-server 自带单例锁，
 *   pid 文件缺失/陈旧时 start.sh 会被误导重复拉起然后被二进制拒绝；
 *   扫描发现活进程还会把 pid 回写 pid 文件（自愈，让 start.sh status 恢复正常）。
 * - 启动幂等：已在运行直接返回成功，不重复调用 start.sh。
 * - 停止彻底：start.sh stop 之后扫描残留的 ds4-server 孤儿进程并清理
 *   （start.sh 的 pkill 模式 "ds4-server -c" 匹配不到实际命令行
 *   "./ds4-server -m ... -c ..."，杀不掉孤儿）。
 * - HTTP 路由：GET 状态 / GET·POST 配置 / POST 控制 / GET 日志。
 * - webServer 运行时探测，缺失时优雅降级（无硬依赖）。
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(PLUGIN_ROOT, 'assets');
const STATUS_PATH = '/plugin-api/ds4/status';
const CONFIG_PATH = '/plugin-api/ds4/config';
const CONTROL_PATH = '/plugin-api/ds4/control';
const LOGS_PATH = '/plugin-api/ds4/logs';

const DEFAULTS = {
  serviceDir: '/Users/clark/code/ds4-on-mac',
  model: 'ds4flash.gguf',
  port: 8000,
  ctx: 393216,
  threads: 20,
  kvDir: '/Users/clark/.ds4/server-kv',
  kvSpaceMb: 65536,
  mtp: 'gguf/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128-DSpark-support.gguf',
  dspark: false,
  warm: true,
  deployAssets: true,
  logLines: 30,
  statusPollMs: 5000,
};

/* ---------------- 基础工具 ---------------- */

function loadConfig() {
  try {
    const raw = JSON.parse(readFileSync(path.join(PLUGIN_ROOT, 'config.json'), 'utf8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

/** 把存活配置持久化回 config.json（保留 _comment） */
function persistConfig(config) {
  const file = path.join(PLUGIN_ROOT, 'config.json');
  let comment = {};
  try { comment = JSON.parse(readFileSync(file, 'utf8'))._comment || {}; } catch { /* 新文件 */ }
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    if (config[k] !== undefined) out[k] = config[k];
  }
  out._comment = comment;
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n', { mode: 0o600 });
}

function logLine(config, message) {
  const line = `${new Date().toISOString()} ${message}`;
  try { console.log(`[ds4-service] ${line}`); } catch { /* ignore */ }
}

/** 通用子进程执行（永不抛出，返回 {ok, exitCode, stdout, stderr}；signal 中止→exitCode='aborted'） */
function runCommand(cmd, args, { cwd, timeoutMs, signal, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (ok, code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (onAbort) signal?.removeEventListener?.('abort', onAbort);
      resolve({ ok, exitCode: code, stdout, stderr: stderr.slice(-2000) });
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      finish(false, 'timeout');
    }, timeoutMs);
    const onAbort = () => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      finish(false, 'aborted');
    };
    if (signal) {
      if (signal.aborted) { onAbort(); return; }
      signal.addEventListener?.('abort', onAbort);
    }
    child.stdout?.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr?.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, exitCode: 'spawn-error', stdout, stderr: String(err?.message || err) });
    });
    child.on('close', (code) => finish(code === 0, code));
  });
}

/* ---------------- 服务部署与状态 ---------------- */

const serviceDir = (config) => path.resolve(String(config.serviceDir || '').trim() || DEFAULTS.serviceDir);
const startScript = (config) => path.join(serviceDir(config), 'start.sh');
const pidFile = (config) => path.join(serviceDir(config), 'logs', 'ds4-server.pid');
const logOut = (config) => path.join(serviceDir(config), 'logs', 'ds4-server.log');
const logErr = (config) => path.join(serviceDir(config), 'logs', 'ds4-server.err');
const portRe = (config) => new RegExp(`--port\\s+${Number(config.port)}(\\s|$)`);

/** 把插件自带的二进制与启动脚本部署到 serviceDir（缺才复制，幂等） */
function deployAssets(config) {
  if (!config.deployAssets) return;
  const dir = serviceDir(config);
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const logsDir = path.join(dir, 'logs');
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    for (const name of ['ds4-server', 'start.sh']) {
      const dst = path.join(dir, name);
      const src = path.join(ASSETS_DIR, name);
      if (!existsSync(dst) && existsSync(src)) copyFileSync(src, dst);
    }
  } catch (err) {
    logLine(config, `资产部署失败: ${err?.message || err}`);
  }
}

/** 读取 pid 文件里的数字；缺失/非法返回 null */
function readPid(config) {
  try {
    const raw = readFileSync(pidFile(config), 'utf8').trim();
    return /^\d+$/.test(raw) ? Number(raw) : null;
  } catch {
    return null;
  }
}

function pidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/**
 * 扫描进程表找 ds4-server 主进程（不依赖 pid 文件）。
 * 匹配 "ds4-server" 作为可执行名且后跟空白（排除 .pid/.err 等文件名参数、
 * 排除 grep/编辑器），实际服务进程命令形如 "./ds4-server -m ... --port ..."。
 */
async function findServerProcesses(config) {
  const r = await runCommand('ps', ['-axo', 'pid=,command='], { timeoutMs: 8000 });
  if (!r.ok) return [];
  const found = [];
  for (const lineRaw of r.stdout.split('\n')) {
    const line = lineRaw.trim();
    if (!line) continue;
    const m = /^(\d+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const pid = Number(m[1]);
    const cmd = m[2];
    if (pid === process.pid) continue;
    // 要求名字后紧跟 flag（-m/--port），排除 "less ds4-server"、"grep ds4-server x"
    if (!/(^|\s|\/)ds4-server\s+--?[a-z]/i.test(cmd)) continue;
    found.push({ pid, command: cmd });
  }
  return found;
}

/**
 * 综合状态：pid 文件存活优先，否则进程表扫描（可回写 pid 文件自愈）。
 * @returns {Promise<{running:boolean, pid:number|null, source:string, command:string|null}>}
 */
async function getStatus(config, { heal = false } = {}) {
  const pid = readPid(config);
  if (pidAlive(pid)) {
    const procs = await findServerProcesses(config);
    const mine = procs.find((p) => p.pid === pid);
    return { running: true, pid, source: 'pidfile', command: mine?.command || null };
  }
  const procs = await findServerProcesses(config);
  if (procs.length) {
    const prefer = procs.find((p) => portRe(config).test(p.command)) || procs[0];
    if (heal) {
      try {
        mkdirSync(path.dirname(pidFile(config)), { recursive: true });
        writeFileSync(pidFile(config), `${prefer.pid}\n`);
        logLine(config, `自愈: pid 文件缺失/陈旧，已回写扫描到的 PID ${prefer.pid}`);
      } catch (err) {
        logLine(config, `自愈失败: ${err?.message || err}`);
      }
    }
    return { running: true, pid: prefer.pid, source: 'scan', command: prefer.command };
  }
  return { running: false, pid: null, source: 'none', command: null };
}

/** 把配置映射成 start.sh 的环境变量覆盖 */
function buildEnv(config) {
  const env = { ...process.env };
  const set = (k, v) => { env[k] = String(v); };
  set('MODEL', config.model);
  set('PORT', config.port);
  set('CTX', config.ctx);
  set('THREADS', config.threads);
  set('KV_DIR', config.kvDir);
  set('KV_SPACE_MB', config.kvSpaceMb);
  if (config.mtp && String(config.mtp).trim()) set('MTP', config.mtp);
  set('DSPARK', config.dspark ? '1' : '0');
  set('WARM', config.warm ? '1' : '0');
  return env;
}

/** 调用 serviceDir/start.sh 的某个子命令 */
function runStartScript(config, cmd, { timeoutMs = 150_000 } = {}) {
  const script = startScript(config);
  if (!existsSync(script)) {
    return Promise.resolve({ ok: false, exitCode: 'missing-start-sh', stdout: '', stderr: `start.sh 不存在: ${script}` });
  }
  logLine(config, `start.sh ${cmd} (serviceDir=${serviceDir(config)})`);
  return runCommand('bash', [script, cmd], {
    cwd: serviceDir(config),
    env: buildEnv(config),
    timeoutMs,
  });
}

/** 等待一组 pid 全部退出（轮询 kill -0），超时返回仍存活的 */
function waitForDeath(pids, timeoutMs = 30_000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const alive = pids.filter((p) => pidAlive(p));
      if (!alive.length || Date.now() - start >= timeoutMs) return resolve(alive);
      setTimeout(tick, 500);
    };
    tick();
  });
}

/* ---------------- 控制动作 ---------------- */

/** 启动（幂等：已在运行直接成功） */
async function doStart(config) {
  const before = await getStatus(config);
  if (before.running) {
    return { ok: true, running: true, detail: `已在运行 (PID ${before.pid})，无需重复启动` };
  }
  deployAssets(config);
  const r = await runStartScript(config, 'start', { timeoutMs: 220_000 });
  const after = await getStatus(config, { heal: true });
  const detail = [(r.stdout || '').trim(), (r.stderr || '').trim()]
    .filter(Boolean).join('\n').slice(-1500);
  return { ok: after.running, running: after.running, detail };
}

/** 停止（start.sh stop + 孤儿进程兜底清理） */
async function doStop(config) {
  const parts = [];
  const r = await runStartScript(config, 'stop', { timeoutMs: 90_000 });
  parts.push((r.stdout || '').trim());
  if (!r.ok) parts.push((r.stderr || '').trim());
  // 兜底：start.sh 的 pkill 模式 "ds4-server -c" 匹配不到 "./ds4-server -m ... -c ..."，
  // 孤儿进程会留着并触发二进制的单例锁，导致下次启动被拒。
  const leftover = await findServerProcesses(config);
  if (leftover.length) {
    const pids = leftover.map((p) => p.pid);
    for (const pid of pids) { try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ } }
    parts.push(`插件清理孤儿进程: ${pids.join(', ')}`);
    const still = await waitForDeath(pids, 30_000);
    if (still.length) {
      for (const pid of still) { try { process.kill(pid, 'SIGKILL'); } catch { /* ignore */ } }
      parts.push(`强制结束: ${still.join(', ')}`);
      await waitForDeath(still, 5_000);
    }
  }
  try { rmSync(pidFile(config), { force: true }); } catch { /* ignore */ }
  const after = await getStatus(config);
  if (after.running) parts.push(`⚠️ 仍有进程在运行 (PID ${after.pid})`);
  return { ok: !after.running, running: after.running, detail: parts.filter(Boolean).join('\n').slice(-1500) };
}

/** 重启 = 彻底停止 + 幂等启动 */
async function doRestart(config) {
  const stop = await doStop(config);
  const start = await doStart(config);
  return {
    ok: start.ok,
    running: start.running,
    detail: ['—— 停止 ——', stop.detail, '—— 启动 ——', start.detail].filter(Boolean).join('\n').slice(-1500),
  };
}

/** 读取服务日志（err 优先，回退 out） */
function tailLog(config, lines) {
  const n = Math.max(1, Math.min(500, Number(lines) || config.logLines || 30));
  const tryFile = (f) => {
    try {
      const text = readFileSync(f, 'utf8');
      const arr = text.trim().split('\n');
      return arr.slice(-n);
    } catch { return null; }
  };
  return tryFile(logErr(config)) || tryFile(logOut(config)) || [];
}

/* ---------------- HTTP 路由 ---------------- */

const intIn = (lo, hi) => (v) => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : undefined);
const strIn = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const strOrEmpty = (v) => (typeof v === 'string' ? v.trim() : undefined);
const boolIn = (v) => (typeof v === 'boolean' ? v : undefined);

/** 可写字段白名单：校验器返回 undefined 表示拒绝该字段 */
const WRITABLE = {
  serviceDir: strIn,
  model: strIn,
  port: intIn(1, 65535),
  ctx: intIn(1024, 1_000_000),
  threads: intIn(1, 256),
  kvDir: strIn,
  kvSpaceMb: intIn(16, 1_000_000),
  mtp: strOrEmpty,
  dspark: boolIn,
  warm: boolIn,
  deployAssets: boolIn,
  logLines: intIn(1, 500),
  statusPollMs: intIn(500, 60_000),
};

function snapshotConfig(config) {
  const out = {};
  for (const k of Object.keys(WRITABLE)) out[k] = config[k];
  return out;
}

/* ---------------- 请求来源守卫（CSRF / DNS 重绑定防护） ---------------- */

/**
 * 构建允许的请求权威（host:port）集合：回环 + 服务器绑定地址 +
 * webRuntime.trustedHosts（LAN IP 与 --trusted-host），端口取实际监听端口。
 * dsh 的 webServer 本身只按路径分发、不校验 Host/Origin；插件路由自带围栏。
 */
function buildAllowedAuthorities(ctx, webServer) {
  const authorities = new Set(); // "host:port"
  const hostnames = new Set();   // 仅主机名（Host 不带端口的情形）
  const port = (() => { try { return webServer.port; } catch { return undefined; } })();
  const add = (h) => {
    const name = String(h || '').replace(/^\[|\]$/g, '').toLowerCase();
    if (!name) return;
    hostnames.add(name);
    if (port) authorities.add(`${name}:${port}`);
  };
  add('127.0.0.1'); add('localhost'); add('::1');
  try { add(webServer.host); } catch { /* ignore */ }
  try {
    const rt = typeof ctx.get === 'function' ? ctx.get('webRuntime') : null;
    for (const h of (rt?.trustedHosts || [])) add(h);
    for (const h of (rt?.lanAddresses || [])) add(h);
  } catch { /* webRuntime 未提供 */ }
  return { authorities, hostnames };
}

function authorityAllowed(value, allowed) {
  if (!value) return false;
  const raw = String(value).replace(/^\[|\]$/g, '').toLowerCase();
  if (allowed.authorities.has(raw)) return true;
  // 拆出主机名，兼容 Host/Origin 不带端口的写法
  const host = raw.replace(/:\d+$/, '');
  return allowed.hostnames.has(host);
}

/**
 * 判定请求是否来自可信来源：
 *  1) Sec-Fetch-Site: cross-site → 拒绝（浏览器原生标注，不可伪造）
 *  2) Host 不在允许清单 → 拒绝（挡 DNS 重绑定：rebinding 域名的 Host 是攻击者域名）
 *  3) 带 Origin 时必须在允许清单（挡跨站 CSRF；text/plain 简单请求也带 Origin；
 *     Origin: null 视为不可信）
 *  4) 都不带 → 放行（curl 等非浏览器客户端）
 */
function requestTrusted(req, allowed) {
  const sec = String(req.headers?.['sec-fetch-site'] || '').toLowerCase();
  if (sec === 'cross-site') return false;
  const host = req.headers?.host;
  if (!authorityAllowed(host, allowed)) return false;
  const origin = req.headers?.origin;
  if (origin !== undefined) {
    if (!origin || origin === 'null') return false;
    try {
      const u = new URL(origin);
      const oa = u.port ? `${u.hostname.replace(/^\[|\]$/g, '').toLowerCase()}:${u.port}` : u.hostname.toLowerCase();
      if (!authorityAllowed(oa, allowed)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function registerRoutes(ctx, config, state) {
  const withService = (name, fn) => {
    let svc = null;
    try { svc = ctx[name]; } catch { /* undeclared */ }
    if (svc) { fn(svc); return; }
    try {
      if (typeof ctx.inject === 'function') {
        ctx.inject([name], (c) => {
          try { fn(c[name]); } catch (e) { logLine(config, `路由注册失败: ${e?.message || e}`); }
        });
      }
    } catch { /* service 不存在 */ }
  };
  withService('webServer', (webServer) => {
    let allowedCache = null;
    const allowed = () => (allowedCache ??= buildAllowedAuthorities(ctx, webServer));
    const send = (res, status, payload) => {
      const body = JSON.stringify(payload);
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      });
      res.end(body);
    };
    const forbidden = (res) => send(res, 403, { ok: false, error: 'forbidden: untrusted request origin' });
    const guard = (req, res) => {
      if (!requestTrusted(req, allowed())) {
        logLine(config, `拒绝不可信请求: ${req.method} ${req.url} host=${req.headers?.host} origin=${req.headers?.origin || '-'}`);
        forbidden(res);
        return false;
      }
      return true;
    };
    const readBody = (req) => new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => { size += c.length; if (size > 64 * 1024) { reject(new Error('body too large')); req.destroy(); return; } chunks.push(c); });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });

    // ---- 状态 ----
    webServer.register({
      kind: 'exact',
      path: STATUS_PATH,
      handler: async (req, res) => {
        try {
          if (!guard(req, res)) return;
          const st = await getStatus(config, { heal: true });
          send(res, 200, {
            ok: true, plugin: 'ds4-service', path: STATUS_PATH,
            running: st.running, pid: st.pid, source: st.source,
            serviceDir: serviceDir(config),
            command: st.command,
            state: state.snapshot(),
            lastLog: tailLog(config, 12),
            config: snapshotConfig(config),
          });
        } catch (err) {
          send(res, 500, { ok: false, error: String(err?.message || err) });
        }
      },
    });

    // ---- 配置读写 ----
    webServer.register({
      kind: 'exact',
      path: CONFIG_PATH,
      handler: async (req, res) => {
        try {
          if (!guard(req, res)) return;
          if (req.method === 'GET') {
            send(res, 200, { ok: true, config: snapshotConfig(config), state: state.snapshot() });
            return;
          }
          if (req.method !== 'POST') { send(res, 405, { ok: false, error: 'method not allowed' }); return; }
          let body;
          try { body = JSON.parse(await readBody(req)); } catch { send(res, 400, { ok: false, error: 'invalid JSON' }); return; }
          if (!body || typeof body !== 'object') { send(res, 400, { ok: false, error: 'body must be object' }); return; }
          const applied = {};
          const rejected = [];
          for (const [k, v] of Object.entries(body)) {
            if (!(k in WRITABLE)) { rejected.push(k); continue; }
            const clean = WRITABLE[k](v);
            if (clean === undefined) { rejected.push(k); continue; }
            config[k] = clean;
            applied[k] = clean;
          }
          if (Object.keys(applied).length) {
            try { persistConfig(config); } catch (err) { send(res, 500, { ok: false, error: `persist failed: ${err?.message || err}` }); return; }
          }
          deployAssets(config);
          logLine(config, `配置已更新: ${JSON.stringify(applied)}${rejected.length ? `，拒绝: ${rejected.join(',')}` : ''}`);
          send(res, 200, { ok: true, applied, rejected, config: snapshotConfig(config) });
        } catch (err) {
          send(res, 500, { ok: false, error: String(err?.message || err) });
        }
      },
    });

    // ---- 控制（start / stop / restart；互斥防并发触发） ----
    let controlInFlight = false;
    webServer.register({
      kind: 'exact',
      path: CONTROL_PATH,
      handler: async (req, res) => {
        try {
          if (!guard(req, res)) return;
          if (req.method !== 'POST') { send(res, 405, { ok: false, error: 'method not allowed' }); return; }
          if (controlInFlight) { send(res, 409, { ok: false, error: 'another control action is in flight' }); return; }
          let body;
          try { body = JSON.parse(await readBody(req)); } catch { send(res, 400, { ok: false, error: 'invalid JSON' }); return; }
          const action = body?.action;
          if (!['start', 'stop', 'restart'].includes(action)) { send(res, 400, { ok: false, error: `action must be start|stop|restart, got ${String(action)}` }); return; }
          controlInFlight = true;
          const started = Date.now();
          try {
            const r = action === 'start' ? await doStart(config)
              : action === 'stop' ? await doStop(config)
                : await doRestart(config);
            state.setLast(action, started, r.ok, r.detail);
            logLine(config, `控制 ${action} → ${r.ok ? '成功' : '失败'} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
            send(res, r.ok ? 200 : 500, {
              ok: r.ok, action,
              running: r.running,
              detail: r.detail, state: state.snapshot(),
            });
          } finally {
            controlInFlight = false;
          }
        } catch (err) {
          send(res, 500, { ok: false, error: String(err?.message || err) });
        }
      },
    });

    // ---- 日志 ----
    webServer.register({
      kind: 'exact',
      path: LOGS_PATH,
      handler: async (req, res) => {
        try {
          if (!guard(req, res)) return;
          const url = new URL(req.url || '/', 'http://localhost');
          const lines = Number(url.searchParams.get('lines')) || config.logLines || 30;
          const st = await getStatus(config);
          send(res, 200, {
            ok: true, running: st.running, pid: st.pid,
            log: tailLog(config, lines),
            logFile: logErr(config),
          });
        } catch (err) {
          send(res, 500, { ok: false, error: String(err?.message || err) });
        }
      },
    });

    logLine(config, `路由已注册: GET ${STATUS_PATH} | GET/POST ${CONFIG_PATH} | POST ${CONTROL_PATH} | GET ${LOGS_PATH}`);
  });
}

/* ---------------- 插件入口 ---------------- */

export function apply(ctx) {
  const config = loadConfig();
  const state = {
    lastAction: null,
    lastAt: 0,
    lastOk: null,
    lastDetail: '',
    setLast(action, at, ok, detail) { this.lastAction = action; this.lastAt = at; this.lastOk = ok; this.lastDetail = detail; },
    snapshot() {
      return { lastAction: this.lastAction, lastAt: this.lastAt, lastOk: this.lastOk, lastDetail: String(this.lastDetail || '').slice(-500) };
    },
  };

  deployAssets(config);
  logLine(config, `已启用: serviceDir=${serviceDir(config)} model=${config.model} port=${config.port} ctx=${config.ctx} threads=${config.threads} kvSpaceMb=${config.kvSpaceMb} dspark=${config.dspark} warm=${config.warm}`);

  // 启动时同步一次状态（顺便自愈 pid 文件）
  getStatus(config, { heal: true })
    .then((st) => logLine(config, `初始状态: ${st.running ? `运行中 (PID ${st.pid}, ${st.source})` : '未运行'}`))
    .catch(() => {});

  registerRoutes(ctx, config, state);
}

// 无硬依赖：webServer 运行时探测，缺失时优雅降级
export const inject = [];

// 测试/诊断用内部导出（不影响 cordis 加载）
export const internals = {
  getStatus, doStart, doStop, doRestart, findServerProcesses, loadConfig,
  buildAllowedAuthorities, requestTrusted, registerRoutes,
};
