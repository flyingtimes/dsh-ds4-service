/**
 * dsh-ds4-service — 客户端（Web GUI）。
 *
 * UI 遵循 shadcn/ui 设计体系（映射到 DSH 主题别名变量）：
 *   - 语义 design token：--ds4-bg(背景) / --ds4-card(卡片,亮一档) /
 *     --ds4-fg|--ds4-muted|--ds4-subtle(三级文字) / --ds4-border(10% 白)
 *     / --ds4-primary(强调色) —— 组件只引用 token，不写死颜色
 *   - Card 分组：rounded-xl border bg-card，小写间距大写节标题
 *   - Button variant 体系：primary / outline / destructive / ghost
 *   - Switch 替代 checkbox；Badge 式状态；分段式 Tabs（控制 | 参数）
 *   - 焦点环 ring、disabled:opacity .5、图标 14px stroke2
 *
 * 两个表面：侧栏「DS4 服务」入口（状态点）+ 固定定位控制面板。
 * 纯 React 薄壳 + fetch；不依赖其他客户端包。
 */
window.__ModuleLoader__.load({
  id: "dsh-ds4-service",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var React = require("react");
    var jsx = require("react/jsx-runtime");

    /* ═══════════ Design tokens + 组件样式（shadcn 体系，双模式） ═══════════ */
    var CSS = [
      /* ① 色彩 token：DSH 主题别名优先（GUI 深浅切换时自动重定义），回退值深浅各一套 */
      ".ds4-panel,.ds4-launch{",
      "  --ds4-bg:var(--dsw-alias-surface-1,#f7f9fc);",
      "  --ds4-card:var(--dsw-alias-surface-2,#ffffff);",
      "  --ds4-fg:var(--dsw-alias-label-primary,#1a2333);",
      "  --ds4-muted:var(--dsw-alias-label-secondary,#5a677d);",
      "  --ds4-subtle:var(--dsw-alias-label-tertiary,#8a94a8);",
      "  --ds4-border:var(--dsw-alias-border-subtle,#dde4ee);",
      "  --ds4-hover:var(--dsw-alias-interactive-bg-hover,rgba(15,23,42,.06));",
      "  --ds4-primary:var(--dsw-alias-accent,#0aa2c0);",
      "  --ds4-primary-fg:#ffffff;",
      "  --ds4-ok:#1a9e5c;--ds4-err:#dc2626;--ds4-warn:#b45309;",
      "}",
      "body[data-ds-dark-theme] .ds4-panel,body[data-ds-dark-theme] .ds4-launch{",
      "  --ds4-bg:var(--dsw-alias-surface-1,#141821);",
      "  --ds4-card:var(--dsw-alias-surface-2,#1b212c);",
      "  --ds4-fg:var(--dsw-alias-label-primary,#e8ecf3);",
      "  --ds4-muted:var(--dsw-alias-label-secondary,#a7b1c4);",
      "  --ds4-subtle:var(--dsw-alias-label-tertiary,#7c879c);",
      "  --ds4-border:var(--dsw-alias-border-subtle,#2a3140);",
      "  --ds4-hover:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));",
      "  --ds4-primary:var(--dsw-alias-accent,#4fd8ff);",
      "  --ds4-primary-fg:#052731;",
      "  --ds4-ok:#3dd68c;--ds4-err:#f87171;--ds4-warn:#f5b942;",
      "}",

      /* ② 立体效果 token（浅色默认：柔和蓝灰投影 + 白高光） */
      ".ds4-panel,.ds4-launch{",
      "  --ds4-panel-grad:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0) 40px);",
      "  --ds4-panel-border-top:rgba(255,255,255,.9);",
      "  --ds4-panel-shadow:0 32px 64px -16px rgba(30,41,59,.28),0 4px 12px rgba(30,41,59,.1),inset 0 1px 0 rgba(255,255,255,.85);",
      "  --ds4-ico-grad:linear-gradient(180deg,rgba(10,162,192,.24),rgba(10,162,192,.1));",
      "  --ds4-ico-border:rgba(10,162,192,.35);",
      "  --ds4-ico-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 4px rgba(30,41,59,.18);",
      "  --ds4-well-bg:rgba(148,163,184,.18);",
      "  --ds4-well-shadow:inset 0 1px 3px rgba(30,41,59,.16),inset 0 -1px 0 rgba(255,255,255,.6);",
      "  --ds4-tab-on-grad:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.4));",
      "  --ds4-tab-on-border:rgba(148,163,184,.45);",
      "  --ds4-tab-on-shadow:0 2px 4px rgba(30,41,59,.16),inset 0 1px 0 rgba(255,255,255,.95);",
      "  --ds4-card-grad:linear-gradient(180deg,rgba(255,255,255,.65),rgba(255,255,255,0) 42%);",
      "  --ds4-card-border-top:rgba(255,255,255,.85);",
      "  --ds4-card-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 2px 5px rgba(30,41,59,.09);",
      "  --ds4-btn-grad:linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.35));",
      "  --ds4-btn-grad-hover:linear-gradient(180deg,rgba(255,255,255,1),rgba(255,255,255,.55));",
      "  --ds4-btn-border-top:rgba(255,255,255,.95);",
      "  --ds4-btn-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 3px rgba(30,41,59,.12);",
      "  --ds4-btn-press:inset 0 2px 4px rgba(30,41,59,.18);",
      "  --ds4-btn-primary-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 3px 6px -1px rgba(8,90,120,.45);",
      "  --ds4-btn-primary-press:inset 0 1px 0 rgba(255,255,255,.35),inset 0 2px 5px rgba(0,0,0,.22);",
      "  --ds4-btn-danger-grad:linear-gradient(180deg,rgba(239,68,68,.12),rgba(239,68,68,.04));",
      "  --ds4-btn-danger-border-top:rgba(220,38,38,.5);",
      "  --ds4-input-bg:rgba(255,255,255,.9);",
      "  --ds4-input-border-bottom:rgba(148,163,184,.55);",
      "  --ds4-input-shadow:inset 0 1px 2px rgba(30,41,59,.09),inset 0 -1px 0 rgba(255,255,255,.8);",
      "  --ds4-sw-track:rgba(148,163,184,.32);",
      "  --ds4-sw-track-shadow:inset 0 1px 3px rgba(30,41,59,.18);",
      "  --ds4-sw-on-shadow:inset 0 1px 2px rgba(0,0,0,.15),0 0 10px rgba(10,162,192,.25);",
      "  --ds4-alert-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 1px 2px rgba(30,41,59,.07);",
      "  --ds4-ok-fg:#178352;--ds4-ok-bg:rgba(34,197,94,.1);--ds4-ok-border:rgba(34,197,94,.35);--ds4-ok-btn:rgba(34,197,94,.5);",
      "  --ds4-err-fg:#dc2626;--ds4-err-bg:rgba(239,68,68,.07);--ds4-err-border:rgba(239,68,68,.32);",
      "  --ds4-warn-fg:#b45309;--ds4-warn-bg:rgba(245,158,11,.13);--ds4-warn-border:rgba(245,158,11,.4);",
      "  --ds4-savebar-grad:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.8));",
      "  --ds4-savebar-shadow:0 -10px 20px -10px rgba(30,41,59,.18);",
      "  --ds4-launch-hover-grad:linear-gradient(180deg,rgba(255,255,255,.8),rgba(255,255,255,.35));",
      "  --ds4-launch-hover-shadow:inset 0 1px 0 rgba(255,255,255,.9);",
      "  --ds4-log-shadow:inset 0 2px 8px rgba(0,0,0,.14),0 1px 3px rgba(30,41,59,.14);",
      "  --ds4-log-bg:#f2f5fa;--ds4-log-head-border:#dfe6f0;--ds4-log-head-grad:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,.25));",
      "  --ds4-log-fg:#3f4b60;--ds4-log-ok:#157a4a;--ds4-log-err:#c53030;--ds4-log-thumb:#c3cddb;--ds4-log-empty:#8a94a8;",
      "}",

      /* ③ 深色效果 token（GUI 深色时 body 带 data-ds-dark-theme，自动覆盖） */
      "body[data-ds-dark-theme] .ds4-panel,body[data-ds-dark-theme] .ds4-launch{",
      "  --ds4-panel-grad:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0) 40px);",
      "  --ds4-panel-border-top:rgba(255,255,255,.16);",
      "  --ds4-panel-shadow:0 32px 64px -16px rgba(0,0,0,.6),0 4px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06);",
      "  --ds4-ico-grad:linear-gradient(180deg,rgba(79,216,255,.22),rgba(79,216,255,.09));",
      "  --ds4-ico-border:rgba(79,216,255,.28);",
      "  --ds4-ico-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 2px 4px rgba(0,0,0,.35);",
      "  --ds4-well-bg:rgba(0,0,0,.25);",
      "  --ds4-well-shadow:inset 0 1px 3px rgba(0,0,0,.35),inset 0 -1px 0 rgba(255,255,255,.03);",
      "  --ds4-tab-on-grad:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));",
      "  --ds4-tab-on-border:rgba(255,255,255,.09);",
      "  --ds4-tab-on-shadow:0 2px 4px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);",
      "  --ds4-card-grad:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,0) 42%);",
      "  --ds4-card-border-top:rgba(255,255,255,.1);",
      "  --ds4-card-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 2px 5px rgba(0,0,0,.28);",
      "  --ds4-btn-grad:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));",
      "  --ds4-btn-grad-hover:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03));",
      "  --ds4-btn-border-top:rgba(255,255,255,.16);",
      "  --ds4-btn-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 1px 3px rgba(0,0,0,.3);",
      "  --ds4-btn-press:inset 0 2px 4px rgba(0,0,0,.35);",
      "  --ds4-btn-primary-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 3px 6px -1px rgba(0,0,0,.45);",
      "  --ds4-btn-primary-press:inset 0 1px 0 rgba(255,255,255,.3),inset 0 2px 5px rgba(0,0,0,.28);",
      "  --ds4-btn-danger-grad:linear-gradient(180deg,rgba(248,113,113,.09),rgba(248,113,113,.02));",
      "  --ds4-btn-danger-border-top:rgba(248,113,113,.5);",
      "  --ds4-input-bg:rgba(0,0,0,.24);",
      "  --ds4-input-border-bottom:rgba(0,0,0,.45);",
      "  --ds4-input-shadow:inset 0 1px 3px rgba(0,0,0,.35),inset 0 -1px 0 rgba(255,255,255,.03);",
      "  --ds4-sw-track:rgba(0,0,0,.3);",
      "  --ds4-sw-track-shadow:inset 0 1px 3px rgba(0,0,0,.4);",
      "  --ds4-sw-on-shadow:inset 0 1px 2px rgba(0,0,0,.25),0 0 10px rgba(79,216,255,.18);",
      "  --ds4-alert-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 1px 2px rgba(0,0,0,.2);",
      "  --ds4-ok-fg:#4ce0a1;--ds4-ok-bg:rgba(61,214,140,.08);--ds4-ok-border:rgba(61,214,140,.22);--ds4-ok-btn:rgba(61,214,140,.35);",
      "  --ds4-err-fg:#f87171;--ds4-err-bg:rgba(248,113,113,.08);--ds4-err-border:rgba(248,113,113,.22);",
      "  --ds4-warn-fg:#f5b942;--ds4-warn-bg:rgba(245,185,66,.08);--ds4-warn-border:rgba(245,185,66,.22);",
      "  --ds4-savebar-grad:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.16));",
      "  --ds4-savebar-shadow:0 -10px 20px -10px rgba(0,0,0,.4);",
      "  --ds4-launch-hover-grad:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03));",
      "  --ds4-launch-hover-shadow:inset 0 1px 0 rgba(255,255,255,.07);",
      "  --ds4-log-shadow:inset 0 2px 8px rgba(0,0,0,.5),0 1px 3px rgba(0,0,0,.3);",
      "  --ds4-log-bg:#0b0e13;--ds4-log-head-border:#1c2536;--ds4-log-head-grad:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));",
      "  --ds4-log-fg:#9aa7bd;--ds4-log-ok:#4ce0a1;--ds4-log-err:#f87171;--ds4-log-thumb:#2a3140;--ds4-log-empty:#5a677d;",
      "}",
      ".ds4-panel *,.ds4-launch *{box-sizing:border-box}",

      /* ── 面板外壳（Card 语义：border + bg + 大圆角 + 三层投影 + 顶部受光） ── */
      ".ds4-panel{position:fixed;left:12px;bottom:60px;z-index:9500;width:392px;max-height:min(82vh,700px);overflow-y:auto;background:var(--ds4-panel-grad),var(--ds4-bg);color:var(--ds4-fg);border:1px solid var(--ds4-border);border-top-color:var(--ds4-panel-border-top);border-radius:14px;box-shadow:var(--ds4-panel-shadow);padding:14px;font-size:13px;font-family:inherit}",
      ".ds4-panel::-webkit-scrollbar{width:8px}",
      ".ds4-panel::-webkit-scrollbar-thumb{background:var(--ds4-border);border-radius:99px}",
      ".ds4-panel::-webkit-scrollbar-track{background:transparent}",

      /* ── 头部：图标瓦片 + 标题/描述 + ghost 关闭 ── */
      ".ds4-head{display:flex;align-items:center;gap:10px}",
      ".ds4-head-ico{flex:none;width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--ds4-ico-grad);color:var(--ds4-primary);border:1px solid var(--ds4-ico-border);box-shadow:var(--ds4-ico-shadow)}",
      ".ds4-head-txt{min-width:0;flex:1}",
      ".ds4-head-title{font-size:13.5px;font-weight:600;line-height:1.25}",
      ".ds4-head-desc{font-size:11px;color:var(--ds4-subtle);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",

      /* ── icon button（ghost variant） ── */
      ".ds4-ibtn{flex:none;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--ds4-muted);border-radius:7px;cursor:pointer;transition:background .12s,color .12s}",
      ".ds4-ibtn:hover{background:var(--ds4-hover);color:var(--ds4-fg)}",
      ".ds4-ibtn:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(79,216,255,.35)}",

      /* ── 分段式 Tabs（凹槽轨道 + 凸起选中片） ── */
      ".ds4-tabs{display:flex;gap:3px;padding:3px;margin-top:12px;background:var(--ds4-well-bg);border:1px solid var(--ds4-border);border-radius:10px;box-shadow:var(--ds4-well-shadow)}",
      ".ds4-tab{flex:1;height:27px;border:none;background:transparent;color:var(--ds4-muted);font:inherit;font-size:12.5px;font-weight:500;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:color .12s,box-shadow .12s,background .12s}",
      ".ds4-tab:hover{color:var(--ds4-fg)}",
      ".ds4-tab[data-active='true']{background:var(--ds4-tab-on-grad),var(--ds4-card);color:var(--ds4-fg);border:1px solid var(--ds4-tab-on-border);box-shadow:var(--ds4-tab-on-shadow)}",
      ".ds4-tab:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(79,216,255,.35)}",

      /* ── Card（状态/配置分组/日志 容器：受光顶边 + 微投影） ── */
      ".ds4-card{border:1px solid var(--ds4-border);border-top-color:var(--ds4-card-border-top);border-radius:11px;background:var(--ds4-card-grad),var(--ds4-card);padding:11px 12px;margin-top:12px;box-shadow:var(--ds4-card-shadow)}",
      ".ds4-card-title{font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ds4-subtle);margin-bottom:8px;display:flex;align-items:center;gap:6px}",

      /* ── 状态 Hero ── */
      ".ds4-hero{display:flex;align-items:center;gap:11px}",
      ".ds4-hero-dot{flex:none;width:9px;height:9px;border-radius:99px}",
      ".ds4-hero-dot--on{background:radial-gradient(circle at 35% 30%,#8ceec0,var(--ds4-ok));filter:drop-shadow(0 0 3px rgba(61,214,140,.65));animation:ds4-ping 2.2s cubic-bezier(0,0,.2,1) infinite}",
      ".ds4-hero-dot--off{background:var(--ds4-subtle)}",
      ".ds4-hero-dot--err{background:var(--ds4-err)}",
      "@keyframes ds4-ping{0%{box-shadow:0 0 0 0 rgba(61,214,140,.5)}70%{box-shadow:0 0 0 7px rgba(61,214,140,0)}100%{box-shadow:0 0 0 0 rgba(61,214,140,0)}}",
      ".ds4-hero-txt{min-width:0;flex:1}",
      ".ds4-hero-title{font-size:14px;font-weight:600;line-height:1.3;display:flex;align-items:center;gap:7px}",
      ".ds4-kv{display:flex;flex-wrap:wrap;gap:3px 0;margin-top:6px}",
      ".ds4-kv-item{display:inline-flex;align-items:baseline;gap:5px;font-size:11px;margin-right:14px}",
      ".ds4-kv-item span{color:var(--ds4-subtle)}",
      ".ds4-kv-item b{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;font-size:11px;color:var(--ds4-muted)}",
      ".ds4-path{margin-top:7px;padding-top:7px;border-top:1px dashed var(--ds4-border);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;color:var(--ds4-subtle);word-break:break-all;line-height:1.5}",
      ".ds4-spin{flex:none;width:13px;height:13px;border-radius:99px;border:2px solid var(--ds4-warn);border-top-color:transparent;animation:ds4-rot .7s linear infinite;filter:drop-shadow(0 0 3px rgba(245,185,66,.4))}",
      "@keyframes ds4-rot{to{transform:rotate(360deg)}}",

      /* ── Button variant 体系（渐变表面 + 受光顶边 + 按压物理反馈） ── */
      ".ds4-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 10px;border-radius:9px;font:inherit;font-size:12.5px;font-weight:500;border:1px solid transparent;cursor:pointer;transition:background .12s,filter .12s,opacity .12s,transform .06s,box-shadow .06s;white-space:nowrap}",
      ".ds4-btn:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(79,216,255,.35)}",
      ".ds4-btn:disabled{opacity:.45;cursor:not-allowed}",
      ".ds4-btn:active:not(:disabled){transform:translateY(1px)}",
      ".ds4-btn--primary{background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.06) 48%,rgba(0,0,0,.12)),var(--ds4-primary);color:var(--ds4-primary-fg);border-color:rgba(0,0,0,.18);box-shadow:var(--ds4-btn-primary-shadow);text-shadow:0 1px 0 rgba(255,255,255,.22)}",
      ".ds4-btn--primary:hover:not(:disabled){filter:brightness(1.06)}",
      ".ds4-btn--primary:active:not(:disabled){box-shadow:var(--ds4-btn-primary-press)}",
      ".ds4-btn--outline{background:var(--ds4-btn-grad);color:var(--ds4-fg);border-color:var(--ds4-border);border-top-color:var(--ds4-btn-border-top);box-shadow:var(--ds4-btn-shadow)}",
      ".ds4-btn--outline:hover:not(:disabled){background:var(--ds4-btn-grad-hover)}",
      ".ds4-btn--outline:active:not(:disabled){box-shadow:var(--ds4-btn-press)}",
      ".ds4-btn--danger{background:var(--ds4-btn-danger-grad);color:var(--ds4-err);border-color:rgba(248,113,113,.4);border-top-color:var(--ds4-btn-danger-border-top);box-shadow:var(--ds4-btn-shadow)}",
      ".ds4-btn--danger:hover:not(:disabled){background:rgba(248,113,113,.13)}",
      ".ds4-btn--danger:active:not(:disabled){box-shadow:var(--ds4-btn-press)}",
      ".ds4-ctrl{display:flex;gap:8px;margin-top:12px}",

      /* ── Alert（inline 结果提示） ── */
      ".ds4-alert{display:flex;align-items:flex-start;gap:7px;margin-top:10px;padding:8px 10px;border-radius:9px;font-size:12px;line-height:1.5;border:1px solid transparent;box-shadow:var(--ds4-alert-shadow)}",
      ".ds4-alert--ok{background:var(--ds4-ok-bg);border-color:var(--ds4-ok-border);color:var(--ds4-ok-fg)}",
      ".ds4-alert--err{background:var(--ds4-err-bg);border-color:var(--ds4-err-border);color:var(--ds4-err-fg)}",
      ".ds4-alert--busy{background:var(--ds4-warn-bg);border-color:var(--ds4-warn-border);color:var(--ds4-warn-fg)}",
      ".ds4-alert-ico{flex:none;margin-top:1px;display:inline-flex}",
      ".ds4-alert-txt{flex:1;min-width:0;word-break:break-word}",
      ".ds4-alert-btn{flex:none;height:22px;padding:0 9px;margin-top:-1px;border-radius:6px;border:1px solid var(--ds4-ok-btn,var(--ds4-ok-border));background:transparent;color:var(--ds4-ok-fg);font:inherit;font-size:11.5px;font-weight:500;cursor:pointer}",
      ".ds4-alert-btn:hover{background:var(--ds4-ok-bg)}",

      /* ── 表单字段 ── */
      ".ds4-field{display:flex;align-items:center;gap:10px;min-height:31px}",
      ".ds4-field + .ds4-field{margin-top:2px}",
      ".ds4-field-label{flex:none;width:86px;font-size:12px;font-weight:500;color:var(--ds4-muted);cursor:default}",
      ".ds4-field-ctl{flex:1;min-width:0;display:flex;align-items:center;gap:6px}",
      ".ds4-input{flex:1;min-width:0;width:100%;height:28px;padding:0 9px;border-radius:7px;border:1px solid var(--ds4-border);border-bottom-color:var(--ds4-input-border-bottom);background:var(--ds4-input-bg);color:var(--ds4-fg);font:inherit;font-size:12.5px;box-shadow:var(--ds4-input-shadow);transition:border-color .12s,box-shadow .12s}",
      ".ds4-input::placeholder{color:var(--ds4-subtle)}",
      ".ds4-input:focus{outline:none;border-color:rgba(79,216,255,.6);box-shadow:var(--ds4-input-shadow),0 0 0 2px rgba(79,216,255,.22),0 0 12px rgba(79,216,255,.12)}",
      ".ds4-input--mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}",
      ".ds4-input--num{text-align:right}",
      ".ds4-unit{flex:none;font-size:10.5px;color:var(--ds4-subtle)}",
      "input.ds4-input::-webkit-outer-spin-button,input.ds4-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}",

      /* ── Switch（凹槽 + 立体滑块） ── */
      ".ds4-switch{flex:none;position:relative;width:32px;height:18px;border-radius:99px;border:1px solid var(--ds4-border);background:var(--ds4-sw-track);cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s;padding:0;box-shadow:var(--ds4-sw-track-shadow)}",
      ".ds4-switch::after{content:'';position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:99px;background:linear-gradient(180deg,#ffffff,rgba(255,255,255,.72));opacity:.94;transition:transform .15s ease,opacity .15s;box-shadow:0 1px 2px rgba(30,41,59,.45),inset 0 1px 0 rgba(255,255,255,.9)}",
      ".ds4-switch--on{background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 60%),var(--ds4-primary);border-color:rgba(0,0,0,.12);box-shadow:var(--ds4-sw-on-shadow)}",
      ".ds4-switch--on::after{transform:translateX(14px);background:var(--ds4-primary-fg);opacity:1}",
      ".ds4-switch:focus-visible{outline:none;box-shadow:inset 0 1px 3px rgba(0,0,0,.4),0 0 0 2px rgba(79,216,255,.35)}",

      /* ── 日志卡（下沉式终端，随主题切换：浅色=浅底深字，深色=深底浅字） ── */
      ".ds4-log{margin-top:12px;border:1px solid var(--ds4-border);border-radius:11px;overflow:hidden;background:var(--ds4-log-bg);box-shadow:var(--ds4-log-shadow)}",
      ".ds4-log-head{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 11px;border-bottom:1px solid var(--ds4-log-head-border);background:var(--ds4-log-head-grad);box-shadow:0 1px 0 rgba(0,0,0,.12)}",
      ".ds4-log-title{flex:1;font-size:11px;font-weight:600;color:var(--ds4-muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.03em}",
      ".ds4-log-body{max-height:172px;overflow-y:auto;padding:8px 11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.8px;line-height:1.55;color:var(--ds4-log-fg);white-space:pre-wrap;word-break:break-all}",
      ".ds4-log-body::-webkit-scrollbar{width:8px}",
      ".ds4-log-body::-webkit-scrollbar-thumb{background:var(--ds4-log-thumb);border-radius:99px}",
      ".ds4-log-line--ok{color:var(--ds4-log-ok)}",
      ".ds4-log-line--err{color:var(--ds4-log-err)}",
      ".ds4-log-empty{color:var(--ds4-log-empty)}",

      /* ── 参数页保存条（毛玻璃悬浮层） ── */
      ".ds4-savebar{position:sticky;bottom:-14px;margin:12px -14px -14px;padding:10px 14px 12px;background:var(--ds4-savebar-grad),var(--ds4-bg);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-top:1px solid var(--ds4-border);box-shadow:var(--ds4-savebar-shadow);display:flex;align-items:center;gap:10px}",
      ".ds4-savebar-note{flex:1;min-width:0;font-size:10.5px;color:var(--ds4-subtle);line-height:1.45}",
      ".ds4-savebar .ds4-btn{flex:none;width:96px;height:32px}",

      /* ── 侧栏入口 ── */
      ".ds4-launch{width:100%;height:44px;color:var(--ds4-fg);cursor:pointer;background:transparent;border:none;border-radius:10px;align-items:center;gap:8px;padding:0 8px 0 7px;font:inherit;font-size:13.5px;font-weight:500;display:inline-flex;overflow:hidden;transition:background .12s,box-shadow .12s}",
      ".ds4-launch:hover{background:var(--ds4-launch-hover-grad);box-shadow:var(--ds4-launch-hover-shadow)}",
      ".ds4-launch[data-active]{background:var(--ds4-launch-hover-grad);box-shadow:var(--ds4-launch-hover-shadow),inset 0 -1px 0 rgba(30,41,59,.12)}",
      ".ds4-launch-ico{flex:none;color:var(--ds4-muted);display:inline-flex}",
      ".ds4-launch-label{flex:1;min-width:0;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;text-align:left}",
      ".ds4-launch-dot{flex:none;width:7px;height:7px;border-radius:99px;background:var(--ds4-ok)}",
      ".ds4-launch-dot--off{background:var(--ds4-subtle)}",
      ".ds4-launch-dot--err{background:var(--ds4-err)}",
      ".ds4-launch-dot--busy{background:var(--ds4-warn);animation:ds4-blink 1s infinite alternate}",
      "@keyframes ds4-blink{from{opacity:.4}to{opacity:1}}",
    ].join("\n");
    try {
      var styleEl = document.createElement("style");
      styleEl.setAttribute("data-plugin", "dsh-ds4-service");
      styleEl.textContent = CSS;
      document.head.appendChild(styleEl);
    } catch (e) { /* SSR/测试环境 */ }

    /* ═══════════ 图标（lucide 线条风：stroke2 / 圆角端点） ═══════════ */
    function svgWrap(size, children) {
      return jsx.jsxs("svg", {
        width: size, height: size, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
        "aria-hidden": "true", children: children
      });
    }
    function IcoServer(s) {
      return svgWrap(s, [jsx.jsx("rect", { key: "a", x: 2, y: 2, width: 20, height: 8, rx: 2 }),
        jsx.jsx("rect", { key: "b", x: 2, y: 14, width: 20, height: 8, rx: 2 }),
        jsx.jsx("line", { key: "c", x1: 6, y1: 6, x2: 6.01, y2: 6 }),
        jsx.jsx("line", { key: "d", x1: 6, y1: 18, x2: 6.01, y2: 18 })]);
    }
    function IcoX(s) {
      return svgWrap(s, [jsx.jsx("path", { key: "a", d: "M18 6 6 18" }), jsx.jsx("path", { key: "b", d: "m6 6 12 12" })]);
    }
    function IcoCheck(s) {
      return svgWrap(s, [jsx.jsx("path", { key: "a", d: "M20 6 9 17l-5-5" })]);
    }
    function IcoPlay(s) {
      return svgWrap(s, [jsx.jsx("path", { key: "a", d: "m5 3 14 9-14 9V3" })]);
    }
    function IcoRotate(s) {
      return svgWrap(s, [jsx.jsx("path", { key: "a", d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }),
        jsx.jsx("path", { key: "b", d: "M21 3v5h-5" })]);
    }
    function IcoStop(s) {
      return svgWrap(s, [jsx.jsx("rect", { key: "a", x: 6, y: 6, width: 12, height: 12, rx: 1.5 })]);
    }
    function IcoRefresh(s) {
      return svgWrap(s, [jsx.jsx("path", { key: "a", d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }),
        jsx.jsx("path", { key: "b", d: "M21 3v5h-5" })]);
    }
    function IcoSettings(s) {
      return svgWrap(s, [jsx.jsx("path", { key: "a", d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
        jsx.jsx("circle", { key: "b", cx: 12, cy: 12, r: 3 })]);
    }

    /* ═══════════ 基础组件 ═══════════ */
    function Spinner() { return jsx.jsx("span", { className: "ds4-spin" }); }

    function Switch(props) {
      return jsx.jsx("button", {
        type: "button", role: "switch", "aria-checked": props.checked ? "true" : "false",
        className: props.checked ? "ds4-switch ds4-switch--on" : "ds4-switch",
        title: props.title || "", onClick: function () { props.onChange(!props.checked); }
      });
    }

    function TextInput(props) {
      return jsx.jsx("input", {
        type: "text", className: props.mono ? "ds4-input ds4-input--mono" : "ds4-input",
        value: props.value, spellCheck: false, placeholder: props.placeholder || "",
        onChange: function (e) { props.onChange(e.target.value); }
      });
    }
    function NumberInput(props) {
      return jsx.jsx("input", {
        type: "number", className: "ds4-input ds4-input--num",
        value: props.value, min: props.min, max: props.max,
        onChange: function (e) { props.onChange(Number(e.target.value)); }
      });
    }
    function FieldRow(props) {
      return jsx.jsxs("div", { className: "ds4-field", children: [
        jsx.jsx("label", { className: "ds4-field-label", title: props.title || "", children: props.label }),
        jsx.jsx("div", { className: "ds4-field-ctl", children: props.children })
      ] });
    }

    function Alert(props) {
      return jsx.jsxs("div", { className: "ds4-alert ds4-alert--" + props.kind, children: [
        jsx.jsx("span", { className: "ds4-alert-ico", children: props.kind === "ok" ? IcoCheck(13) : props.kind === "busy" ? Spinner() : IcoX(13) }),
        jsx.jsx("span", { className: "ds4-alert-txt", children: props.text }),
        props.action ? jsx.jsx("button", { className: "ds4-alert-btn", onClick: props.onAction, children: props.action }) : null
      ] });
    }

    function logLineClass(line) {
      if (/listening on|ready|✅|loaded/i.test(line)) return "ds4-log-line--ok";
      if (/error|fail|❌|fatal|refus/i.test(line)) return "ds4-log-line--err";
      return null;
    }

    /* ═══════════ 面板开关状态存储 ═══════════ */
    var listeners = new Set();
    var openState = false;
    var panelStore = {
      getSnapshot: function () { return openState; },
      subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
      open: function () { openState = true; listeners.forEach(function (fn) { fn(); }); },
      close: function () { openState = false; listeners.forEach(function (fn) { fn(); }); },
      toggle: function () { panelStore[openState ? "close" : "open"](); }
    };

    var STATUS_URL = "/plugin-api/ds4/status";
    var CONFIG_URL = "/plugin-api/ds4/config";
    var CONTROL_URL = "/plugin-api/ds4/control";
    var LOGS_URL = "/plugin-api/ds4/logs?lines=";

    function fetchJson(url, opts) {
      return fetch(url, opts).then(function (r) {
        return r.json().catch(function () { return { ok: false, error: "bad json" }; });
      });
    }

    /* ═══════════ 侧栏入口 ═══════════ */
    function DS4Launcher() {
      var open = React.useSyncExternalStore(panelStore.subscribe, panelStore.getSnapshot);
      var statusRef = React.useRef(null);
      var force = React.useReducer(function (c) { return c + 1; }, 0)[1];
      React.useEffect(function () {
        var alive = true;
        var poll = function () {
          fetchJson(STATUS_URL).then(function (j) {
            if (!alive) return;
            statusRef.current = j && j.ok ? { running: j.running, lastOk: j.state && j.state.lastOk } : null;
            force();
          }).catch(function () {});
        };
        poll();
        var t = setInterval(poll, 6000);
        return function () { alive = false; clearInterval(t); };
      }, []);
      var st = statusRef.current;
      var dot = "ds4-launch-dot";
      if (!st) dot += " ds4-launch-dot--off";
      else if (st.lastOk === false) dot += " ds4-launch-dot--err";
      else if (st.running) dot += "";
      else dot += " ds4-launch-dot--off";
      return jsx.jsxs("button", {
        className: "ds4-launch",
        "data-active": open || undefined,
        onClick: panelStore.toggle,
        title: "DS4 服务控制",
        children: [
          jsx.jsx("span", { className: "ds4-launch-ico", key: "ico", children: IcoServer(17) }),
          jsx.jsx("span", { className: "ds4-launch-label", key: "label", children: "DS4 服务" }),
          jsx.jsx("span", { className: dot, key: "dot" })
        ]
      });
    }

    function DS4Panel() {
      var open = React.useSyncExternalStore(panelStore.subscribe, panelStore.getSnapshot);
      if (!open) return null;
      return jsx.jsx(DS4PanelBody, {});
    }

    /* ═══════════ 面板主体 ═══════════ */
    function DS4PanelBody() {
      var statusRef = React.useRef(null);
      var formRef = React.useRef(null);
      var logRef = React.useRef([]);
      var logBoxRef = React.useRef(null);
      var msgRef = React.useRef(null);      // {kind:'ok'|'err'|'busy', text, action?}
      var busyRef = React.useRef(null);      // null | 'start' | 'stop' | 'restart'
      var tabRef = React.useRef("ctrl");
      var force = React.useReducer(function (c) { return c + 1; }, 0)[1];

      var loadStatus = function () {
        fetchJson(STATUS_URL).then(function (j) {
          if (j && j.ok) {
            statusRef.current = { running: j.running, pid: j.pid, serviceDir: j.serviceDir };
          } else {
            statusRef.current = { running: null };
          }
          force();
        }).catch(function () { statusRef.current = { running: null }; force(); });
      };

      var loadForm = function () {
        fetchJson(CONFIG_URL).then(function (j) {
          if (j && j.ok) {
            var c = j.config;
            formRef.current = {
              serviceDir: c.serviceDir, model: c.model, port: c.port,
              ctx: c.ctx, threads: c.threads,
              kvDir: c.kvDir, kvSpaceMb: c.kvSpaceMb,
              mtp: c.mtp, dspark: c.dspark, warm: c.warm, logLines: c.logLines
            };
          } else {
            msgRef.current = { kind: "err", text: (j && j.error) || "配置读取失败" };
          }
          force();
        }).catch(function () { msgRef.current = { kind: "err", text: "无法连接插件服务" }; force(); });
      };

      var loadLogs = function (lines) {
        var f = formRef.current;
        var n = lines || (f && f.logLines) || 30;
        fetchJson(LOGS_URL + n).then(function (j) {
          if (j && j.ok) {
            logRef.current = j.log || [];
            force();
            requestAnimationFrame(function () {
              if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
            });
          }
        }).catch(function () {});
      };

      React.useEffect(function () {
        loadStatus();
        loadForm();
        loadLogs(30);
        var t = setInterval(function () { loadStatus(); loadLogs(); }, 4000);
        return function () { clearInterval(t); };
      }, []);

      var st = statusRef.current;
      var f = formRef.current;
      var set = function (k, v) { formRef.current[k] = v; force(); };
      var running = st ? st.running : null;
      var busy = busyRef.current;

      var doControl = function (action) {
        busyRef.current = action;
        msgRef.current = { kind: "busy", text: (action === "start" ? "启动" : action === "stop" ? "停止" : "重启") + "中…加载权重与预热最长约 2 分钟" };
        force();
        fetchJson(CONTROL_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: action })
        }).then(function (j) {
          busyRef.current = null;
          if (j && j.ok) {
            msgRef.current = { kind: "ok", text: action === "start" ? "服务已启动" : action === "stop" ? "服务已停止" : "服务已重启" };
          } else {
            var why = String((j && (j.error || j.detail)) || "控制失败").trim().split("\n").filter(Boolean).pop() || "控制失败";
            msgRef.current = { kind: "err", text: why.slice(0, 90) };
          }
          statusRef.current = null;
          loadStatus();
          loadLogs();
        }).catch(function () {
          busyRef.current = null;
          msgRef.current = { kind: "err", text: "控制请求失败" };
          force();
        });
      };

      var doSave = function () {
        var body = {
          serviceDir: String(f.serviceDir || "").trim(),
          model: String(f.model || "").trim(),
          port: Number(f.port), ctx: Number(f.ctx), threads: Number(f.threads),
          kvDir: String(f.kvDir || "").trim(), kvSpaceMb: Number(f.kvSpaceMb),
          mtp: String(f.mtp || "").trim(),
          dspark: !!f.dspark, warm: !!f.warm,
          logLines: Number(f.logLines || 30)
        };
        fetchJson(CONFIG_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }).then(function (j) {
          if (j && j.ok) {
            msgRef.current = running
              ? { kind: "ok", text: "参数已保存，重启服务后生效", action: "立即重启" }
              : { kind: "ok", text: "参数已保存" };
          } else {
            msgRef.current = { kind: "err", text: "保存失败: " + ((j && j.error) || "未知错误") };
          }
          force();
        }).catch(function () { msgRef.current = { kind: "err", text: "保存请求失败" }; force(); });
      };

      if (!f) {
        return jsx.jsx("div", { className: "ds4-panel", children: "加载配置中…" });
      }

      /* ── 状态 Hero ── */
      var hero = jsx.jsxs("div", { className: "ds4-card", children: [
        jsx.jsxs("div", { className: "ds4-hero", children: [
          busy ? Spinner() : jsx.jsx("span", {
            className: "ds4-hero-dot " + (running ? "ds4-hero-dot--on" : running === false ? "ds4-hero-dot--off" : "ds4-hero-dot--off")
          }),
          jsx.jsxs("div", { className: "ds4-hero-txt", children: [
            jsx.jsx("div", { className: "ds4-hero-title", children:
              busy
                ? (busy === "start" ? "启动中" : busy === "stop" ? "停止中" : "重启中") + "…"
                : running === null ? "状态获取中…"
                  : running ? "运行中" : "已停止"
            }),
            jsx.jsxs("div", { className: "ds4-kv", children: [
              jsx.jsxs("span", { className: "ds4-kv-item", children: [jsx.jsx("span", { children: "PID" }), jsx.jsx("b", { children: running ? (st && st.pid) || "—" : "—" })] }),
              jsx.jsxs("span", { className: "ds4-kv-item", children: [jsx.jsx("span", { children: "端口" }), jsx.jsx("b", { children: f.port })] }),
              jsx.jsxs("span", { className: "ds4-kv-item", children: [jsx.jsx("span", { children: "上下文" }), jsx.jsx("b", { children: Number(f.ctx).toLocaleString() })] }),
              jsx.jsxs("span", { className: "ds4-kv-item", children: [jsx.jsx("span", { children: "线程" }), jsx.jsx("b", { children: f.threads })] })
            ] }),
            jsx.jsx("div", { className: "ds4-path", children: (st && st.serviceDir) || f.serviceDir })
          ] })
        ] })
      ] });

      /* ── 控制按钮（状态机：运行→可重启/停；停止→可启动） ── */
      var btns = jsx.jsxs("div", { className: "ds4-ctrl", children: [
        jsx.jsxs("button", {
          className: "ds4-btn ds4-btn--primary",
          disabled: !!busy || running === true,
          onClick: function () { doControl("start"); },
          children: [busy === "start" ? Spinner() : IcoPlay(13), busy === "start" ? "启动中" : "启动"]
        }),
        jsx.jsxs("button", {
          className: "ds4-btn ds4-btn--outline",
          disabled: !!busy || running === false,
          onClick: function () { doControl("restart"); },
          children: [busy === "restart" ? Spinner() : IcoRotate(13), busy === "restart" ? "重启中" : "重启"]
        }),
        jsx.jsxs("button", {
          className: "ds4-btn ds4-btn--danger",
          disabled: !!busy || running === false,
          onClick: function () { doControl("stop"); },
          children: [busy === "stop" ? Spinner() : IcoStop(13), busy === "stop" ? "停止中" : "停止"]
        })
      ] });

      /* ── 日志卡 ── */
      var logCard = jsx.jsxs("div", { className: "ds4-log", children: [
        jsx.jsxs("div", { className: "ds4-log-head", children: [
          jsx.jsx("span", { className: "ds4-log-title", children: "服务日志" }),
          jsx.jsx("button", {
            className: "ds4-ibtn", title: "刷新日志",
            onClick: function () { loadLogs(); },
            children: IcoRefresh(13)
          })
        ] }),
        jsx.jsx("div", {
          className: "ds4-log-body", ref: logBoxRef,
          children: logRef.current.length
            ? logRef.current.map(function (l, i) {
              var cls = logLineClass(l);
              return cls ? jsx.jsx("div", { key: i, className: cls, children: l }) : jsx.jsx("div", { key: i, children: l });
            })
            : jsx.jsx("div", { className: "ds4-log-empty", children: "暂无日志" })
        })
      ] });

      /* ── 参数表单（Card 分组） ── */
      var cfgCards = [
        { title: "服务与模型", rows: [
          { label: "服务目录", title: "服务运行目录；缺二进制/脚本时插件会把自带的部署过去", mono: true, k: "serviceDir" },
          { label: "模型", title: "模型文件：相对 serviceDir、绝对路径，或 {{assets}} 占位符（=插件 assets 目录，用 assets/download.sh 下载）", mono: true, k: "model" },
          { label: "端口", title: "监听端口", num: true, min: 1, max: 65535, k: "port" }
        ] },
        { title: "上下文与线程", rows: [
          { label: "上下文", title: "上下文长度 -c；reasoning_effort=max 需 393216+", num: true, min: 1024, max: 1000000, k: "ctx" },
          { label: "线程数", title: "主机辅助线程数 -t", num: true, min: 1, max: 256, k: "threads" }
        ] },
        { title: "KV 持久化", rows: [
          { label: "KV 目录", title: "--kv-disk-dir KV 磁盘目录", mono: true, k: "kvDir" },
          { label: "KV 上限", title: "--kv-disk-space-mb 上限", num: true, min: 16, max: 1000000, k: "kvSpaceMb", unit: "MB" }
        ] },
        { title: "DSpark 与预热", rows: [
          { label: "MTP 模型", title: "DSpark 配套模型 --mtp，支持 {{assets}} 占位符；留空禁用（下载: assets/download.sh --dspark）", mono: true, k: "mtp" },
          { label: "DSpark", title: "投机解码 --dspark；M2 Ultra 实测更慢，默认关", switch: true, k: "dspark" },
          { label: "预热权重", title: "--warm-weights 预触全部映射页；启动变慢换首请求不缺页", switch: true, k: "warm" },
          { label: "日志行数", title: "日志面板读取行数", num: true, min: 1, max: 500, k: "logLines" }
        ] }
      ].map(function (card) {
        return jsx.jsxs("div", { className: "ds4-card", key: card.title, children: [
          jsx.jsx("div", { className: "ds4-card-title", children: card.title }),
          card.rows.map(function (row) {
            return jsx.jsx(FieldRow, {
              label: row.label, title: row.title,
              children: row.switch
                ? [jsx.jsx(Switch, {
                    key: "sw", checked: !!f[row.k], title: row.title,
                    onChange: function (v) { set(row.k, v); }
                  })]
                : row.num
                  ? [jsx.jsx(NumberInput, {
                      key: "num", value: f[row.k], min: row.min, max: row.max,
                      onChange: function (v) { set(row.k, v); }
                    })]
                    .concat(row.unit ? [jsx.jsx("span", { key: "unit", className: "ds4-unit", children: row.unit })] : [])
                  : [jsx.jsx(TextInput, {
                      key: "txt", value: f[row.k], mono: !!row.mono,
                      onChange: function (v) { set(row.k, v); }
                    })]
            }, row.k);
          })
        ] });
      });

      return jsx.jsxs("div", { className: "ds4-panel", children: [
        /* 头部 */
        jsx.jsxs("div", { className: "ds4-head", children: [
          jsx.jsx("span", { className: "ds4-head-ico", children: IcoServer(16) }),
          jsx.jsxs("div", { className: "ds4-head-txt", children: [
            jsx.jsx("div", { className: "ds4-head-title", children: "DS4 服务" }),
            jsx.jsx("div", { className: "ds4-head-desc", children: "ds4-server 控制台" })
          ] }),
          jsx.jsx("button", { className: "ds4-ibtn", title: "关闭", onClick: panelStore.close, children: IcoX(14) })
        ] }),

        /* Tabs */
        jsx.jsxs("div", { className: "ds4-tabs", role: "tablist", children: [
          jsx.jsx("button", {
            className: "ds4-tab", role: "tab", "data-active": String(tabRef.current === "ctrl"),
            onClick: function () { tabRef.current = "ctrl"; force(); },
            children: "控制"
          }),
          jsx.jsx("button", {
            className: "ds4-tab", role: "tab", "data-active": String(tabRef.current === "cfg"),
            onClick: function () { tabRef.current = "cfg"; force(); },
            children: [IcoSettings(12), "参数"]
          })
        ] }),

        /* 控制页 */
        tabRef.current === "ctrl" ? jsx.jsxs(React.Fragment, { key: "ctrl", children: [
          hero,
          btns,
          msgRef.current ? jsx.jsx(Alert, {
            kind: msgRef.current.kind, text: msgRef.current.text,
            action: msgRef.current.action,
            onAction: function () { msgRef.current = null; doControl("restart"); }
          }) : null,
          logCard
        ] }) : null,

        /* 参数页 */
        tabRef.current === "cfg" ? jsx.jsxs(React.Fragment, { key: "cfg", children: [
          cfgCards,
          msgRef.current ? jsx.jsx(Alert, {
            kind: msgRef.current.kind, text: msgRef.current.text,
            action: msgRef.current.action,
            onAction: function () { tabRef.current = "ctrl"; msgRef.current = null; force(); doControl("restart"); }
          }) : null,
          jsx.jsxs("div", { className: "ds4-savebar", children: [
            jsx.jsx("div", { className: "ds4-savebar-note", children: "参数映射为 start.sh 环境变量，不改动脚本本身；保存后重启服务生效。" }),
            jsx.jsxs("button", { className: "ds4-btn ds4-btn--primary", onClick: doSave, children: ["保存参数"] })
          ] })
        ] }) : null
      ] });
    }

    var inject = ["slots"];
    function apply(ctx) {
      ctx.effect(function () {
        var disposers = [
          ctx.slots.inject("sidebar.footer.action", function () {
            return ctx.slots.register({
              name: "sidebar.footer.action",
              id: "ds4-service-launch",
              order: 15,
              inject: function () { return {}; }
            }, DS4Launcher);
          }),
          ctx.slots.inject("shell.overlay", function () {
            return ctx.slots.register({
              name: "shell.overlay",
              id: "ds4-service-panel",
              order: 15,
              inject: function () { return {}; }
            }, DS4Panel);
          })
        ];
        return function () { for (var i = 0; i < disposers.length; i++) disposers[i](); };
      }, "ds4-service: launcher + panel");
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.store = panelStore;
    return module.exports;
  }
});
