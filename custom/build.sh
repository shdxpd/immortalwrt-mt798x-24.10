#!/usr/bin/env bash
# 在干净目录里复现 TL-7DR7299 自编固件：
#   上游 padavanonly/immortalwrt-mt798x-6.6 @ BASE_REV
#   + custom/patches/immortalwrt/*.patch
#   + immortalwrt/luci @ LUCI_REV（放在 package/luci）+ custom/patches/luci/*.patch
#   + immortalwrt/packages @ PACKAGES_REV（feed）+ custom/patches/packages/*.patch
#   + custom/diffconfig
#
# 用法: custom/build.sh [工作目录]   （默认 ./immortalwrt）
# 环境变量: JOBS=并行数（默认 nproc），SKIP_BUILD=1 只准备源码不编译
set -euo pipefail

UPSTREAM_URL=https://github.com/padavanonly/immortalwrt-mt798x-6.6.git
BASE_REV=6b7374feb2c7e4b0a9486333578f2b8950008840      # mt798x-mt799x-6.6-mtwifi, PR #411
LUCI_URL=https://github.com/immortalwrt/luci.git
LUCI_REV=668cdc69a79c59ec8018180f94221f92136d9902
LUCI_FEED_REV=cc142cd196d425d9f14f9c18f072913730b642ce   # feeds/luci，只提供 luci.mk，不 install
PACKAGES_URL=https://github.com/immortalwrt/packages.git
PACKAGES_REV=171d5f9203379f77693807d7283515a873f95df9

HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${1:-$PWD/immortalwrt}
JOBS=${JOBS:-$(nproc)}

# 国内网络下编译 sing-box 等 Go 包需要
export GOPROXY=${GOPROXY:-https://goproxy.cn,direct}
export GOSUMDB=${GOSUMDB:-sum.golang.google.cn}

fetch_rev() { # url rev dir
  mkdir -p "$3"
  git -C "$3" init -q
  git -C "$3" remote add origin "$1" 2>/dev/null || git -C "$3" remote set-url origin "$1"
  git -C "$3" fetch -q --depth 1 --filter=blob:none origin "$2"
  git -C "$3" checkout -q --detach FETCH_HEAD
}

echo "==> 源码 $BASE_REV"
fetch_rev "$UPSTREAM_URL" "$BASE_REV" "$WORK"
cd "$WORK"
for p in "$HERE"/patches/immortalwrt/*.patch; do
  echo "    apply $(basename "$p")"; git apply "$p"
done

echo "==> luci $LUCI_REV -> package/luci"
fetch_rev "$LUCI_URL" "$LUCI_REV" package/luci
for p in "$HERE"/patches/luci/*.patch; do
  echo "    apply $(basename "$p")"; git -C package/luci apply "$p"
done

echo "==> feeds: packages $PACKAGES_REV, luci $LUCI_FEED_REV"
# luci feed 只更新不安装：package/mtk 下的 luci 应用要 include feeds/luci/luci.mk
cat > feeds.conf <<EOF
src-git packages $PACKAGES_URL^$PACKAGES_REV
src-git luci $LUCI_URL^$LUCI_FEED_REV
EOF
./scripts/feeds update packages luci
for p in "$HERE"/patches/packages/*.patch; do
  echo "    apply $(basename "$p")"; git -C feeds/packages apply "$p"
done
./scripts/feeds update -i packages
./scripts/feeds install -a -p packages

echo "==> .config"
cp "$HERE/diffconfig" .config
make defconfig

[ "${SKIP_BUILD:-0}" = 1 ] && { echo "SKIP_BUILD=1，源码已就绪: $WORK"; exit 0; }

make download -j8
make -j"$JOBS" || make -j1 V=s
ls -l bin/targets/mediatek/filogic_a73/*tl-7dr7299*
