# TL-7DR7299 自编固件（mtwifi 闭源驱动版）

这个分支 = 上游原样 + `custom/` 目录。上游源码本身一行没改，所有客制化都以 patch 形式放在 `custom/patches/`，编译时再打上去。

| 组成 | 来源 | 版本 |
|---|---|---|
| 源码基线 | [padavanonly/immortalwrt-mt798x-6.6](https://github.com/padavanonly/immortalwrt-mt798x-6.6) `mt798x-mt799x-6.6-mtwifi` | `6b7374feb2c`（PR #411 合并点）|
| LuCI | immortalwrt/luci，clone 到 `package/luci`，再打 `custom/patches/luci` | `668cdc69a79` |
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
- `0003` tailscale 升级到 1.104.7（需要 Go 1.27.4）。源码包从 codeload.github.com 下载；编译机连不上 GitHub 时，先在别的机器上下载好，再放进 `dl/tailscale-1.104.7.tar.gz`

`custom/patches/luci/`（打在 `package/luci`）
- `0001` luci-app-passwall 25.12.16 加 Snell 客户端（sing-box ≥ 1.14）。参照上游 Openwrt-Passwall 的 1fb747a2 精简移植，只保留自己用到的部分：
  - 节点表单：psk、版本 4/6、连接复用、传输协议、v4 混淆（none/http/tls + 混淆域名）、v6 模式。只用 psk，不提供 sing-box 的 userkey（Surge/官方 snell-server 都用不到）
  - sing-box snell 出站生成。需要 underlying 时，用节点页的「链式代理 → 前置代理节点」，生成的是 `detour`
  - 「添加节点」和订阅支持 `snell://psk@host:port?psk=&version=&reuse=1&obfs=&obfs-host=&mode=#名称`。version=5 会自动改成 4（sing-box 客户端不支持 v5，v5 服务端兼容 v4）
  - 不包含服务端、分享链接导出/二维码、clash 订阅转换
- `0002` sing-box 节点加「绑定接口」：下拉框里是 network 里的 pppoe/dhcp/static 接口（不含 lan），生成配置时转成 L3 设备名（如 `pppoe-wan2`），写进出站的 `bind_interface`。默认「自动」，按路由表走。设了前置代理节点时不生效（出站改用 `detour`，由前置节点自己决定走哪个口）
- `0003` 分流规则支持 sing-box 规则集（参照上游 Openwrt-Passwall 的 `rule-set:` 写法，精简移植）：域名/IP 列表里一行写 `rule-set:remote:<URL>` 或 `rule-set:local:<路径>`，支持 `.srs`（binary）和 `.json`（source）。远程规则集经分流的默认出口下载（sing-box 1.14 用 `http_clients`，旧版用 `download_detour`），缓存在 `/usr/share/passwall/singbox_rule_set.db`，重启不用重新下载。全部用在线规则集时不需要 geoview 和 geosite/geoip.dat。DNS 辅助脚本（chinadns-ng/dnsmasq/smartdns）会跳过这些行，所以它们只影响 sing-box 的路由，不参与 DNS 分流
- `0004` passwall 服务端（sing-box 类型）加 Snell 协议：sing-box 1.14 入站只支持 v6（默认，mode default/unshaped/unsafe-raw）和 v5（兼容 v4/v5 客户端，可选 obfs none/http/tls），只用 psk；客户端支持 v6 就优先用 v6。用于外网回家访问 LAN：节点要勾「接受局域网访问」（accept_lan），否则 10/172.16/192.168 目的会被 block；防火墙端口由 passwall_server 自动放行

## 自有包（packages/）

`build.sh` 会把它们拷到 `package/custom/`。

- `luci-app-devmon` v1：菜单在「服务 → 设备监控」。
  - **监控**：每台设备的实时速率（取自 conntrack 计数，HNAT 卸载后的连接也能统计）、当天和当月用量（nlbwmon 数据库，保存在 /etc/nlbwmon，刷机后保留），并显示设备是通过 Wi‑Fi 还是 LAN 连接。
  - **限速**：用自带的 `devmon-qos` 按设备做硬件限速。原理是在 MediaTek HNAT 的 QDMA 硬件队列上限速：nft 给设备的报文打 DSCP，PPE 按 DSCP 把流量放进对应队列，所以已被硬件卸载的连接也受限速约束。最多 31 台设备。限速值按实测增益表做了校准，误差约 ±1%，配置 `devmon.qos.calibrate=0` 可以关掉校准。
  - 取代了 luci-app-eqos-mtk 和 luci-app-nlbwmon 的 LuCI 页面，nlbwmon 后台进程保留。

## diffconfig 里的主要选择

- 插件：luci-app-passwall（只带 sing-box，不带 Xray/Haproxy/SS-Rust）、luci-app-pbr + pbr（nft 策略路由，多 WAN 按目的地/设备/域名分流，默认标记段 0xff0000，不和 passwall 的 0x1 冲突）、luci-app-rtp2httpd + rtp2httpd、wireguard-tools、luci-theme-argon、luci-app-devmon（关掉设备默认带的 luci-app-eqos-mtk）、tailscale
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
