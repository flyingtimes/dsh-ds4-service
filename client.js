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

      /* ── 启动着色器动效 overlay（body 级 fixed，跟随面板矩形；降级时不存在） ── */
      ".ds4-fx{position:fixed;z-index:9600;pointer-events:none;overflow:hidden;opacity:1;transition:opacity .5s ease;border:1px solid var(--dsw-alias-border-subtle,rgba(255,255,255,.12));box-shadow:0 32px 64px -16px rgba(0,0,0,.5)}",
      ".ds4-fx[data-done='1']{opacity:0}",
      ".ds4-fx canvas{display:block;width:100%;height:100%}",

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

    /* ═══════════ 启动着色器动效（CSS-to-Shader，借鉴 html-in-canvas.dev/demos/css-to-shader） ═══════════
       管线：纹理源 → 2D 画布 → WebGL 片元着色器（CRT 弧形失真 + 故障块位移 + 径向色差 + 扫描线 +
       暗角 + 磷光闪烁 + 点击处扩散光环）。纹理源两种：
         · Chromium 147+（canvas-draw-element）：drawElementImage 实时绘制面板 DOM —— 与原案例同款管线；
         · 其余浏览器：程序化绘制的 boot HUD（标题/启动日志/进度条/均衡器）作为纹理。
       降级：prefers-reduced-motion、WebGL 不可用、着色器编译失败 → 静默跳过，按钮功能不受影响。 */
    var bootFxActive = false;

    var FX_VERT = [
      "attribute vec2 a_position;",
      "varying vec2 v_texCoord;",
      "void main(){",
      "  v_texCoord = a_position * 0.5 + 0.5;",
      "  v_texCoord.y = 1.0 - v_texCoord.y;",
      "  gl_Position = vec4(a_position, 0.0, 1.0);",
      "}"
    ].join("\n");

    var FX_FRAG = [
      "precision mediump float;",
      "uniform sampler2D u_texture;",
      "uniform vec2 u_resolution;",
      "uniform float u_time;",
      "uniform float u_progress;",
      "uniform float u_intensity;",
      "uniform vec2 u_origin;",
      "varying vec2 v_texCoord;",
      "float rand(float s){ return fract(sin(s * 12.9898) * 43758.5453); }",
      "void main(){",
      "  vec2 uv = v_texCoord;",
      /* CRT 弧形失真（案例 crt 预设） */
      "  vec2 dc = uv - 0.5;",
      "  float d2 = dot(dc, dc);",
      "  uv += dc * d2 * 0.14 * u_intensity;",
      /* 故障：水平块位移，随机门控（案例 glitch 预设） */
      "  float tg = floor(u_time * 8.0);",
      "  float block = floor(uv.y * 16.0);",
      "  float gate = step(0.86, rand(tg)) * u_intensity;",
      "  uv.x += (rand(block + tg * 1.7) - 0.5) * 0.06 * gate;",
      /* 径向色差：从点击处向外 RGB 分裂（案例 chromatic 预设） */
      "  vec2 dir = uv - u_origin;",
      "  float amount = (0.006 + 0.010 * u_intensity) * (0.6 + 0.4 * sin(u_time * 3.0));",
      "  float r = texture2D(u_texture, uv + dir * amount).r;",
      "  float g = texture2D(u_texture, uv).g;",
      "  float b = texture2D(u_texture, uv - dir * amount).b;",
      "  vec3 col = vec3(r, g, b);",
      /* 上电白闪（前 0.35s） */
      "  float flash = max(0.0, 1.0 - u_time / 0.35);",
      "  col = mix(col, vec3(0.92, 0.98, 1.0), flash * flash * 0.5);",
      /* 扫描线 + 磷光闪烁（子像素感知） */
      "  col -= sin(uv.y * u_resolution.y * 1.35) * 0.07 * (0.5 + 0.5 * u_intensity);",
      "  col *= 0.97 + 0.03 * sin(u_time * 9.0) * u_intensity;",
      /* 暗角 + 磷光偏色 */
      "  col *= 1.0 - d2 * (0.9 + 0.7 * u_intensity);",
      "  col.r *= 1.0 + 0.05 * u_intensity;",
      /* 点击处扩散光环（案例 spawnRipple 的着色器化） */
      "  vec2 rd = (v_texCoord - u_origin) * vec2(u_resolution.x / u_resolution.y, 1.0);",
      "  float ring = abs(length(rd) - u_time * 0.85);",
      "  float glow = smoothstep(0.045, 0.0, ring) * max(0.0, 1.0 - u_time / 1.15);",
      "  col += vec3(0.35, 0.85, 1.0) * glow * 0.8;",
      /* 启动扫描光带 */
      "  float sweep = smoothstep(0.012, 0.0, abs(uv.y - fract(u_time * 0.45)));",
      "  col += vec3(0.25, 0.65, 0.85) * sweep * 0.22 * (0.4 + 0.6 * u_intensity);",
      /* 弧形失真出界遮罩 */
      "  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n");

    function fxCompile(gl, type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    }

    function mountBootShader(panelEl, opts) {
      if (!panelEl || bootFxActive) return;
      if (typeof document === "undefined" || typeof requestAnimationFrame === "undefined") return;
      try {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      } catch (e) { /* 忽略 */ }

      var overlay = document.createElement("div");
      overlay.className = "ds4-fx";
      var canvas = document.createElement("canvas");
      overlay.appendChild(canvas);

      var gl = null;
      try { gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false }); } catch (e) {}
      if (!gl) return;

      /* 着色器编译（失败 → 静默放弃，不挂 overlay） */
      var vert = fxCompile(gl, gl.VERTEX_SHADER, FX_VERT);
      var frag = fxCompile(gl, gl.FRAGMENT_SHADER, FX_FRAG);
      if (!vert || !frag) { if (vert) gl.deleteShader(vert); if (frag) gl.deleteShader(frag); return; }
      var prog = gl.createProgram();
      gl.attachShader(prog, vert); gl.attachShader(prog, frag); gl.linkProgram(prog);
      gl.deleteShader(vert); gl.deleteShader(frag);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(prog, "a_position");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      var uTex = gl.getUniformLocation(prog, "u_texture");
      var uRes = gl.getUniformLocation(prog, "u_resolution");
      var uTime = gl.getUniformLocation(prog, "u_time");
      var uProg = gl.getUniformLocation(prog, "u_progress");
      var uInt = gl.getUniformLocation(prog, "u_intensity");
      var uOrigin = gl.getUniformLocation(prog, "u_origin");

      /* 纹理源画布：Chromium 147+ 走 drawElementImage(1:1 CSS 像素)，否则 dpr 放大绘制 HUD */
      var stage = document.createElement("canvas");
      var sctx = stage.getContext("2d");
      if (!sctx) return;
      var enhance = typeof sctx.drawElementImage === "function";
      var dpr = enhance ? 1 : Math.min(window.devicePixelRatio || 1, 2);

      /* 主题 token 从面板计算样式读取（深浅模式自动带入） */
      var pcs = window.getComputedStyle ? window.getComputedStyle(panelEl) : null;
      var tok = function (name, fb) {
        var v = pcs ? String(pcs.getPropertyValue(name) || "").trim() : "";
        return v || fb;
      };
      var TH = {
        bg: tok("--ds4-bg", "#141821"), fg: tok("--ds4-fg", "#e8ecf3"),
        muted: tok("--ds4-muted", "#a7b1c4"), subtle: tok("--ds4-subtle", "#7c879c"),
        primary: tok("--ds4-primary", "#4fd8ff"), ok: tok("--ds4-ok", "#3dd68c"),
        err: tok("--ds4-err", "#f87171")
      };

      var base = String((opts && opts.model) || "").split("/").pop() || "model.gguf";
      if (base.length > 26) base = base.slice(0, 25) + "…";
      var port = (opts && opts.port) || 8000;
      var LINES = [
        { at: 0.10, text: "▸ ds4-server bootstrap", c: TH.muted },
        { at: 0.55, text: "· metal · apple silicon", c: TH.subtle },
        { at: 1.05, text: "· model  " + base, c: TH.fg },
        { at: 1.60, text: "· ctx " + ((opts && opts.ctxLen) || 0) + " · threads " + ((opts && opts.threads) || 0), c: TH.subtle },
        { at: 2.20, text: "· kv-disk · warm-up weights", c: TH.subtle },
        { at: 3.00, text: "· awaiting port " + port + " …", c: TH.muted }
      ];

      var origin = (opts && opts.origin) || { x: 0.5, y: 0.85 };
      var t0 = performance.now();
      var settled = false, ok = false, settledAt = 0, stopped = false, raf = 0;

      function stop() {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(raf);
        overlay.remove();
        try { var lc = gl.getExtension("WEBGL_lose_context"); if (lc) lc.loseContext(); } catch (e) {}
        bootFxActive = false;
      }
      canvas.addEventListener("webglcontextlost", stop);

      Promise.resolve(opts && opts.until).then(
        function (j) { settled = true; ok = !!(j && j.ok); },
        function () { settled = true; ok = false; }
      );

      function paint(t, prog) {
        var rect = panelEl.getBoundingClientRect();
        var W = Math.max(1, Math.round(rect.width));
        var H = Math.max(1, Math.round(rect.height));
        if (stage.width !== W * dpr || stage.height !== H * dpr) { stage.width = W * dpr; stage.height = H * dpr; }
        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (enhance) {
          /* 原案例同款：实时 DOM → 纹理（HUD 之下），失败自动退回纯 HUD */
          sctx.clearRect(0, 0, W, H);
          try { sctx.drawElementImage(panelEl, 0, 0); } catch (e) { enhance = false; }
          sctx.fillStyle = "rgba(3,7,13,0.42)";
          sctx.fillRect(0, 0, W, H);
        }
        if (!enhance) {
          /* 程序化背景：双层径向渐变（借鉴案例 CONTROLS 源场景） */
          sctx.fillStyle = TH.bg;
          sctx.fillRect(0, 0, W, H);
          var g1 = sctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, H * 0.95);
          g1.addColorStop(0, "rgba(45,110,170,0.40)"); g1.addColorStop(1, "rgba(0,0,0,0)");
          sctx.fillStyle = g1; sctx.fillRect(0, 0, W, H);
          var g2 = sctx.createRadialGradient(W, H, 0, W, H, H * 0.9);
          g2.addColorStop(0, "rgba(0,110,130,0.32)"); g2.addColorStop(1, "rgba(0,0,0,0)");
          sctx.fillStyle = g2; sctx.fillRect(0, 0, W, H);
        }

        var mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
        var pad = 18;
        /* eyebrow */
        sctx.font = "700 9px " + mono;
        sctx.fillStyle = TH.primary;
        sctx.textAlign = "left"; sctx.textBaseline = "alphabetic";
        sctx.fillText("DS4-SERVER · BOOT SEQUENCE", pad, 26);
        sctx.textAlign = "right";
        sctx.fillStyle = TH.muted;
        sctx.fillText(Math.round(prog * 100) + "%", W - pad, 26);
        /* 标题 + 闪烁光标 */
        sctx.textAlign = "left";
        sctx.font = "800 30px " + mono;
        sctx.fillStyle = TH.fg;
        sctx.fillText("DS4", pad, 60);
        var tw = sctx.measureText("DS4").width;
        if (Math.floor(t * 2.6) % 2 === 0) {
          sctx.fillStyle = TH.primary;
          sctx.fillRect(pad + tw + 5, 40, 13, 4);
        }
        /* 启动日志行 */
        var y = 92, lh = 17;
        sctx.font = "500 10.5px " + mono;
        for (var i = 0; i < LINES.length; i++) {
          if (t >= LINES[i].at) { sctx.fillStyle = LINES[i].c; sctx.fillText(LINES[i].text, pad, y); y += lh; }
        }
        if (settled) {
          sctx.fillStyle = ok ? TH.ok : TH.err;
          sctx.fillText(ok ? "✓ listening on :" + port : "✗ boot failed", pad, y);
          y += lh;
        }
        /* 进度条（案例 scene-meter 的画布版） */
        var mw = W - pad * 2, my = Math.max(y + 10, H - 74);
        sctx.fillStyle = "rgba(127,127,127,0.18)";
        sctx.fillRect(pad, my, mw, 5);
        var grad = sctx.createLinearGradient(pad, 0, pad + mw, 0);
        grad.addColorStop(0, TH.primary); grad.addColorStop(1, TH.ok);
        sctx.fillStyle = grad;
        sctx.fillRect(pad, my, mw * prog, 5);
        /* 均衡器（案例 VISUAL 源场景的地平线均衡器） */
        var n = 16, gap = 3;
        var bw = (mw - gap * (n - 1)) / n;
        var baseY = H - 16;
        for (var k = 0; k < n; k++) {
          var amp = 0.15 + 0.8 * Math.abs(Math.sin(t * 3.1 + k * 0.7) * Math.cos(t * 1.3 + k * 0.35));
          var bh = 6 + amp * 34 * (0.35 + 0.65 * (1 - prog * 0.4));
          var bx = pad + k * (bw + gap);
          var bg2 = sctx.createLinearGradient(0, baseY - bh, 0, baseY);
          bg2.addColorStop(0, TH.primary); bg2.addColorStop(1, "rgba(0,0,0,0)");
          sctx.globalAlpha = 0.8;
          sctx.fillStyle = bg2;
          sctx.fillRect(bx, baseY - bh, bw, bh);
          sctx.globalAlpha = 1;
        }
      }

      function frame() {
        if (stopped) return;
        raf = requestAnimationFrame(frame);
        var rect = panelEl.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 40) return stop();   /* 面板被关闭 → 收场 */
        var st = overlay.style;
        st.left = rect.left + "px"; st.top = rect.top + "px";
        st.width = rect.width + "px"; st.height = rect.height + "px";
        st.borderRadius = (window.getComputedStyle ? getComputedStyle(panelEl).borderRadius : "14px") || "14px";

        var gw = Math.max(1, Math.round(rect.width * Math.min(window.devicePixelRatio || 1, 2)));
        var gh = Math.max(1, Math.round(rect.height * Math.min(window.devicePixelRatio || 1, 2)));
        if (canvas.width !== gw || canvas.height !== gh) { canvas.width = gw; canvas.height = gh; }

        var t = (performance.now() - t0) / 1000;
        if (settled && !settledAt) settledAt = t;
        if (!settled && t > 16) { settled = true; ok = true; }     /* 安全阀 */
        var intensity = settled ? Math.max(0, 1 - Math.max(0, t - settledAt - 0.9) / 0.6) : 1;
        if (settled && t > settledAt + 1.5) overlay.setAttribute("data-done", "1");
        if (settled && t > settledAt + 2.1) return stop();
        var prog = (settled && ok) ? 1 : Math.min(0.94, 0.06 + t / 9);

        paint(t, prog);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, stage);
        gl.uniform1i(uTex, 0);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uProg, prog);
        gl.uniform1f(uInt, intensity);
        gl.uniform2f(uOrigin, origin.x, origin.y);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      bootFxActive = true;
      document.body.appendChild(overlay);
      raf = requestAnimationFrame(frame);
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

      var doControl = function (action, ev) {
        busyRef.current = action;
        msgRef.current = { kind: "busy", text: (action === "start" ? "启动" : action === "stop" ? "停止" : "重启") + "中…加载权重与预热最长约 2 分钟" };
        force();
        var req = fetchJson(CONTROL_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: action })
        });
        req.then(function (j) {
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
        /* 启动按钮 → CSS-to-Shader 启动动效 */
        if (action === "start") {
          var host = (ev && ev.currentTarget && ev.currentTarget.closest)
            ? ev.currentTarget.closest(".ds4-panel")
            : (typeof document !== "undefined" && document.querySelector ? document.querySelector(".ds4-panel") : null);
          if (host) {
            var o = { x: 0.5, y: 0.85 };
            if (ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect) {
              var r1 = host.getBoundingClientRect();
              var r2 = ev.currentTarget.getBoundingClientRect();
              o = {
                x: (r2.left + r2.width / 2 - r1.left) / Math.max(1, r1.width),
                y: (r2.top + r2.height / 2 - r1.top) / Math.max(1, r1.height)
              };
            }
            mountBootShader(host, {
              until: req, port: f && f.port, model: f && f.model,
              threads: f && f.threads, ctxLen: f && f.ctx, origin: o
            });
          }
        }
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
          onClick: function (e) { doControl("start", e); },
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
