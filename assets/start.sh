#!/usr/bin/env bash
# start.sh — Launch the ds4-server with the fixed production config.
#
# Tuned for this host: Apple M2 Ultra, 192 GB unified memory, model fully
# resident (no SSD streaming — the 80 GB IQ2XXS imatrix fits with ~100 GB to
# spare, so streaming only adds scheduling overhead and eviction risk).
#
# Config rationale (A/B tuned 2026-08-21, see logs/bench-tune-*.csv):
#   -c 393216            384K context. 0731's reasoning_effort=max needs
#                        -c 393216+; below it silently falls back to high.
#                        MLA-compressed KV keeps this at ~3 GiB RAM.
#   -t 20                Host helper threads (24-core M2 Ultra). Neutral for
#                        GPU decode (within noise); helps host-side routing.
#   --warm-weights       Touch all 96 GiB of mapped pages at startup so the
#                        first request doesn't eat page faults (cold residency
#                        measured at 17 s without it). Startup gets slower by
#                        roughly the same amount.
#   --kv-disk-space-mb 65536   64 GB persistent prefix cache. Cheap on a 1.3 TB
#                        disk; lets agent sessions survive restarts without
#                        re-prefilling the conversation history.
#   -m ds4flash.gguf     symlink that points at the active quant (currently
#                        DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128.gguf).
#                        To switch weights, just repoint the symlink.
#   --mtp ... --dspark   DSpark speculative decoding via the matched companion
#                        GGUF. Measured 2026-08-21 on this M2 Ultra: SLOWER
#                        than plain decode (28.6 vs 32.8 t/s) and greedy output
#                        may differ from one-token decode (batched verifier
#                        float order). Default off; DSPARK=1 ./start.sh to try.
#
# Tested and rejected 2026-08-21: --prefill-chunk 8192 (default 4096 kept) —
# +2% prefill at short ctx but -16% prefill and +40% first-token latency at
# ctx>=31K (raw_kv_rows 4352->8192). DS4_METAL_EXACT_VIEW_CACHE_GIB raise is
# unnecessary: profile shows zero view-cache evictions with the 64 GiB default.
#
# Usage:
#   ./start.sh                # start (or restart) the server in the background
#   ./start.sh status         # show whether the server is running
#   ./start.sh stop           # stop the running server
#   ./start.sh logs           # tail the server logs (Ctrl-C to exit)

set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT"

BIN="ds4-server"
MODEL="${MODEL:-ds4flash.gguf}"
PORT="${PORT:-8000}"
CTX="${CTX:-393216}"
THREADS="${THREADS:-20}"
KV_DIR="${KV_DIR:-$HOME/.ds4/server-kv}"
KV_SPACE_MB="${KV_SPACE_MB:-65536}"
MTP="${MTP:-gguf/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128-DSpark-support.gguf}"
PID_FILE="logs/ds4-server.pid"
LOG_OUT="logs/ds4-server.log"
LOG_ERR="logs/ds4-server.err"

DSPARK_ARGS=()
if [[ "${DSPARK:-0}" == "1" && -f "$MTP" ]]; then
    DSPARK_ARGS=(--mtp "$MTP" --dspark)
fi

WARM_ARGS=()
if [[ "${WARM:-1}" == "1" ]]; then
    WARM_ARGS=(--warm-weights)
fi

mkdir -p logs "$KV_DIR"

is_running() {
    [[ -f "$PID_FILE" ]] || return 1
    local pid; pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    [[ -n "$pid" ]] || return 1
    kill -0 "$pid" 2>/dev/null
}

cmd_stop() {
    if is_running; then
        local pid; pid="$(cat "$PID_FILE")"
        echo "stopping ds4-server (PID $pid)..."
        kill "$pid" 2>/dev/null || true
        # wait up to 30s for graceful drain
        for _ in $(seq 1 60); do
            kill -0 "$pid" 2>/dev/null || break
            sleep 0.5
        done
        if kill -0 "$pid" 2>/dev/null; then
            echo "forcing kill..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        echo "stopped."
    else
        echo "ds4-server not running."
    fi
    # also clear any orphan without a pid file
    pkill -f "$BIN -c" 2>/dev/null || true
    rm -f "$PID_FILE"
}

cmd_start() {
    if is_running; then
        echo "ds4-server already running (PID $(cat "$PID_FILE")). Use '$0 restart' or '$0 stop' first."
        exit 0
    fi
    # clean up stale orphans before starting fresh
    pkill -f "$BIN -c" 2>/dev/null && sleep 1 || true

    echo "starting ds4-server..."
    echo "  model : $MODEL  ($(readlink -f "$MODEL" 2>/dev/null || echo "$MODEL"))"
    echo "  ctx   : $CTX"
    echo "  thrd  : $THREADS  warm: ${WARM_ARGS[*]:-off}"
    echo "  kvdisk: $KV_DIR ($KV_SPACE_MB MiB)"
    echo "  dspark: ${DSPARK_ARGS[*]:-disabled}"
    echo "  port  : $PORT"

    # count existing "listening on" lines so we only match a FRESH one
    # (logs are appended across restarts; a plain grep matches stale lines)
    local listen_before
    listen_before=$(grep -c "listening on" "$LOG_ERR" 2>/dev/null || echo 0)

    nohup "./$BIN" \
        -m "$MODEL" \
        -c "$CTX" \
        -t "$THREADS" \
        "${WARM_ARGS[@]+${WARM_ARGS[@]}}" \
        --kv-disk-dir "$KV_DIR" \
        --kv-disk-space-mb "$KV_SPACE_MB" \
        ${DSPARK_ARGS[@]+"${DSPARK_ARGS[@]}"} \
        --port "$PORT" \
        >>"$LOG_OUT" 2>>"$LOG_ERR" &

    local pid=$!
    echo "$pid" > "$PID_FILE"
    echo "  pid   : $pid"

    # wait for the listening line (up to ~120s; full-residency warmup ~40s)
    echo "waiting for server to come up..."
    for _ in $(seq 1 120); do
        local listen_now
        listen_now=$(grep -c "listening on" "$LOG_ERR" 2>/dev/null || echo 0)
        if [[ "$listen_now" -gt "$listen_before" ]]; then
            echo "✅ ready: $(grep 'listening on' "$LOG_ERR" | tail -1)"
            exit 0
        fi
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "❌ process exited before listening. Last log lines:"
            tail -20 "$LOG_ERR" 2>/dev/null || true
            rm -f "$PID_FILE"
            exit 1
        fi
        sleep 1
    done
    echo "⚠️  timeout waiting for 'listening on'. Check $LOG_ERR."
    exit 1
}

cmd_restart() {
    cmd_stop
    cmd_start
}

cmd_status() {
    if is_running; then
        local pid; pid="$(cat "$PID_FILE")"
        echo "✅ running (PID $pid)"
        ps -p "$pid" -o pid,stat,%cpu,%mem,time,command | tail -1 | cut -c1-110
    else
        echo "❌ not running"
        exit 1
    fi
}

cmd_logs() {
    tail -f "$LOG_ERR" "$LOG_OUT"
}

case "${1:-start}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    status)  cmd_status ;;
    logs)    cmd_logs ;;
    *) echo "usage: $0 {start|stop|restart|status|logs}"; exit 1 ;;
esac
