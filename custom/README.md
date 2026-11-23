# TL-7DR7299 自编固件（mtwifi 闭源驱动版）

这个分支 = 上游原样 + `custom/` 目录。上游源码本身一行没改，所有客制化都以 patch 形式放在 `custom/patches/`，编译时再打上去。

| 组成 | 来源 | 版本 |
|---|---|---|
| 源码基线 | [padavanonly/immortalwrt-mt798x-6.6](https://github.com/padavanonly/immortalwrt-mt798x-6.6) `mt798x-mt799x-6.6-mtwifi` | `6b7374feb2c`（PR #411 合并点）|
| LuCI | immortalwrt/luci，clone 到 `package/luci` | `668cdc69a79` |
| packages feed | immortalwrt/packages | `171d5f92033` |
| luci feed | immortalwrt/luci，只 update 不 install（package/mtk 的应用要用 `feeds/luci/luci.mk`）| `cc142cd196d` |
| 配置 | `custom/diffconfig` | 目标 `mediatek/filogic_a73`，设备 `tplink_tl-7dr7299-v1` |

本仓库的 `mt798x-mt799x-6.6-mtwifi` 分支固定在上面这个基线提交，没有跟进上游后续更新。

## patch 说明

`custom/patches/immortalwrt/`（打在源码根目录）
- `0001` 默认 LAN IP 改为 192.168.10.1
- `0002` 让 `kmod-crypto-hw-safexcel` 能在 `filogic_a73` 子目标上选（EIP-197 硬件加密）

`custom/patches/packages/`（打在 `feeds/packages`）
- `0001` 加入 Go 1.27 工具链（golang1.27 / golang-bootstrap 等），sing-box 1.14 需要
- `0002` sing-box 升级到 1.14.4

## diffconfig 里的主要选择

- 插件：luci-app-passwall（只带 sing-box，不带 Xray/Haproxy/SS-Rust）、luci-app-rtp2httpd + rtp2httpd、wireguard-tools、luci-theme-argon
- 硬件加速：mtkhnat / WED / WARP、safexcel
- preinit IP 192.168.10.1

## 编译

Debian 13（trixie）下验证过，需要先装好 OpenWrt 编译依赖。

```bash
git clone -b tl-7dr7299 --depth 1 https://github.com/shdxpd/immortalwrt-mt798x-24.10.git
immortalwrt-mt798x-24.10/custom/build.sh ~/7dr-build
```

`build.sh` 会把上游基线、luci、packages 都拉到写死的提交，依次打 patch、套 diffconfig、编译。默认设置 `GOPROXY=https://goproxy.cn,direct`，`SKIP_BUILD=1` 表示只准备源码不编译。产物在 `bin/targets/mediatek/filogic_a73/`：

- `*-squashfs-sysupgrade.itb`：同一套源码的固件之间可以在系统里 `sysupgrade` 升级
- `*-initramfs-recovery.itb`

从别的固件换过来，要先恢复出厂设置，再在 U-Boot 网页里刷。
