#!/usr/bin/env bash
# download.sh — 把 DS4 模型权重下载到本目录（assets/），断点续传 + sha-256 校验。
#
# 用法:
#   ./download.sh               只下载主模型（~96 GB，默认配置指向它）
#   ./download.sh --dspark      主模型 + DSpark 配套模型（另 ~6.8 GB，mtp 参数用）
#   ./download.sh --force       跳过磁盘剩余空间检查
#   ./download.sh --help        查看本说明
#
# 环境变量:
#   HF_ENDPOINT   下载源，默认 https://hf-mirror.com（国内镜像）；
#                 海外直连: HF_ENDPOINT=https://huggingface.co ./download.sh
#
# 行为:
#   - aria2c 优先（8 线程分块 + 内联校验），未安装则回退 curl 单线程续传
#   - 下载到 <file>.part（curl 模式），sha-256 校验通过才改名为正式文件
#   - 已完整存在且校验/标记通过的文件自动跳过，可放心重复执行
#   - 配置里的 {{assets}} 占位符即指向本目录，下载完无需任何手工链接
set -uo pipefail

SCRIPT_PATH="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/$(basename -- "$0")"
ASSETS="$(dirname -- "$SCRIPT_PATH")"
cd "$ASSETS" || exit 1

REPO="apetersson/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128"

TARGET="DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128.gguf"
TARGET_SHA="2cfc36b761b59ea43531e7cdb02a690436a330e42ad57cb162726b385914df59"
TARGET_SIZE=102826238912

COMPANION="DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128-DSpark-support.gguf"
COMPANION_SHA="cd8593a232c9feebc4c91855d5ab486b17250fc8bc2f294bc80401f93b371566"
COMPANION_SIZE=7297737120

HOST="${HF_ENDPOINT:-https://hf-mirror.com}"
WANT_COMPANION=0
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --dspark|--companion|--all) WANT_COMPANION=1 ;;
    --force) FORCE=1 ;;
    -h|--help) grep '^# ' "$SCRIPT_PATH" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "未知参数: ${arg}（--help 查看用法）" >&2; exit 2 ;;
  esac
done

# ---- 工具检查 ----
HAVE_ARIA=0; command -v aria2c >/dev/null 2>&1 && HAVE_ARIA=1
if [[ $HAVE_ARIA -eq 0 ]] && ! command -v curl >/dev/null 2>&1; then
  echo "✗ 需要 aria2c 或 curl 任一（推荐: brew install aria2 / apt install aria2）" >&2
  exit 1
fi

sha_of() {  # sha_of <file>
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print $1}'
  else sha256sum "$1" | awk '{print $1}'; fi
}
size_of() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo 0; }
free_bytes() { df -Pk . | awk 'NR==2 {print $4*1024}'; }
gb() { echo $(( $1 / 1024 / 1024 / 1024 )); }

# ---- 磁盘空间检查（已有的半截文件可抵扣，这里从简只做静态估算） ----
NEED=$TARGET_SIZE
[[ $WANT_COMPANION -eq 1 ]] && NEED=$(( NEED + COMPANION_SIZE ))
FREE=$(free_bytes)
if [[ $FORCE -eq 0 && $FREE -lt $NEED ]]; then
  echo "✗ 磁盘空间不足: 需要约 $(gb $NEED) GiB，当前可用 $(gb $FREE) GiB" >&2
  echo "  确认无碍可加 --force 强制下载" >&2
  exit 1
fi

# ---- 单文件下载 ----
fetch() {  # fetch <file> <sha256> <expected_size>
  local file="$1" sha="$2" want="$3"
  local stamp=".verified-$file.ok"

  # 完整且校验标记存在 → 直接跳过（避免每次重算 96GB 哈希）
  if [[ -f "$file" ]] && [[ "$(size_of "$file")" -eq "$want" ]] && [[ -f "$stamp" ]]; then
    echo "✓ $file 已存在且校验通过，跳过"
    return 0
  fi

  local url="$HOST/$REPO/resolve/main/$file"
  echo "▶ 下载 $file（约 $(gb $want) GiB）"
  echo "  源: $url"

  if [[ $HAVE_ARIA -eq 1 ]]; then
    aria2c \
      --file-allocation=none \
      --continue=true \
      --max-connection-per-server=8 \
      --split=8 \
      --min-split-size=64M \
      --retry-wait=15 \
      --max-tries=0 \
      --timeout=120 \
      --connect-timeout=30 \
      --summary-interval=60 \
      --checksum="sha-256=$sha" \
      --out="$file" \
      "$url"
    local st=$?
    if [[ $st -ne 0 ]]; then
      echo "✗ aria2c 退出码 $st（已保留断点，重跑本脚本即可续传）" >&2
      return "$st"
    fi
  else
    echo "  （未找到 aria2c，回退 curl 单线程续传；brew install aria2 可 8 线程加速）"
    curl -L --fail --continue-at - \
      --retry 100 --retry-delay 15 --retry-all-errors \
      --connect-timeout 30 \
      --speed-time 120 --speed-limit 1024 \
      --output "$file.part" \
      "$url"
    local st=$?
    if [[ $st -ne 0 ]]; then
      echo "✗ curl 退出码 $st（已保留 $file.part，重跑本脚本即可续传）" >&2
      return "$st"
    fi
    echo "  校验 sha-256 中（大文件约需几分钟）…"
    local got
    got="$(sha_of "$file.part")"
    if [[ "$got" != "$sha" ]]; then
      echo "✗ sha-256 不匹配: $got（保留 $file.part 供续传）" >&2
      return 1
    fi
    mv "$file.part" "$file"
  fi

  sha_of "$file" > "$stamp" 2>/dev/null || true
  echo "✓ $file 完成"
  return 0
}

echo "目录: $ASSETS"
echo "下载源: $HOST（HF_ENDPOINT 可换）"

RC=0
fetch "$TARGET" "$TARGET_SHA" "$TARGET_SIZE" || RC=1
if [[ $WANT_COMPANION -eq 1 ]]; then
  fetch "$COMPANION" "$COMPANION_SHA" "$COMPANION_SIZE" || RC=1
fi

if [[ $RC -eq 0 ]]; then
  cat <<EOF

✅ 全部完成。默认配置已指向:
   model: {{assets}}/$TARGET
EOF
  [[ $WANT_COMPANION -eq 1 ]] && echo "   mtp  : {{assets}}/$COMPANION（开启 dspark 时使用）"
  echo "（{{assets}} 占位符 = 插件 assets 目录，index.js 会自动展开为绝对路径）"
fi
exit $RC
