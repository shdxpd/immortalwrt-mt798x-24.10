include $(TOPDIR)/rules.mk

LUCI_TITLE:=Device monitor: realtime per-device rate, usage and HNAT hardware rate limits
LUCI_DEPENDS:=+luci-base +ucode +rpcd-mod-ucode +ucode-mod-fs +ucode-mod-uci +conntrack +nlbwmon +iwinfo +ip-full +nftables
LUCI_PKGARCH:=all
PKG_VERSION:=1.0
PKG_RELEASE:=1

define Package/luci-app-devmon/conffiles
/etc/config/devmon
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
