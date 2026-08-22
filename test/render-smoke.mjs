// 深度渲染冒烟测试：mock jsx 执行所有组件函数体，捕获运行时错误
import { readFileSync } from 'node:fs';

const fixture = { serviceDir: '/a', model: 'm', port: 8000, ctx: 393216, threads: 20,
  kvDir: '/k', kvSpaceMb: 65536, mtp: '', dspark: true, warm: false, logLines: 30 };
const errors = [];

function makeRuntime(tabVal, msg) {
  let refCalls = 0;
  const react = {
    Fragment: 'F',
    useSyncExternalStore: () => true,
    useRef(v) { refCalls++; let cur = v;
      if (refCalls === 2) cur = fixture;       // formRef
      if (refCalls === 5) cur = msg;            // msgRef
      if (refCalls === 7) cur = tabVal;         // tabRef
      return { current: cur }; },
    useReducer: (r, i) => [i, () => {}],
    useEffect(fn) { try { const d = fn(); if (typeof d === 'function') d(); } catch (e) { errors.push('effect:' + e.message); } },
  };
  const invoke = (t, p) => {
    if (typeof t !== 'function') return null;
    try { return t(p || {}); } catch (e) { errors.push((t.name || '?') + ': ' + e.message); return null; }
  };
  return { react, jt: { jsx: invoke, jsxs: invoke } };
}

function renderPanel(tabVal, msg) {
  const { react, jt } = makeRuntime(tabVal, msg);
  const comps = {};
  global.window = { __ModuleLoader__: { load(def) {
    const mod = def.factory((id) => (id === 'react' ? react : jt));
    mod.apply({ effect: (fn) => fn(), slots: {
      inject: (s, r) => r(),
      register: (o, C) => { comps[o.id] = C; return () => {}; },
    } });
  } } };
  eval(readFileSync(new URL('../client.js', import.meta.url), 'utf8'));
  comps['ds4-service-launch']();
  comps['ds4-service-panel']();
}

renderPanel('ctrl', null);
renderPanel('cfg', { kind: 'ok', text: '参数已保存，重启服务后生效', action: '立即重启' });
renderPanel('cfg', { kind: 'err', text: '保存失败: X' });
renderPanel('ctrl', { kind: 'busy', text: '启动中…' });
console.log('all tab/msg variants rendered — errors:', errors.length ? errors : 'none');
