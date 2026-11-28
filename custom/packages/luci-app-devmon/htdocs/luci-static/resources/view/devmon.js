'use strict';
'require view';
'require rpc';
'require poll';
'require ui';
'require dom';

const callStatsAll = rpc.declare({ object: 'devmon', method: 'stats' });
const callStatsMac = rpc.declare({ object: 'devmon', method: 'stats', params: ['mac'] });
const callUsage = rpc.declare({ object: 'devmon', method: 'usage', params: ['period'] });
const callStats = (mac) => mac ? callStatsMac(mac) : callStatsAll();
const callSetLimit = rpc.declare({
	object: 'devmon', method: 'set_limit',
	params: ['mac', 'ip', 'up', 'down', 'enabled', 'reset', 'name']
});
const callSetLimits = rpc.declare({ object: 'devmon', method: 'set_limits', params: ['items', 'up', 'down', 'enabled', 'reset'] });
const callRename = rpc.declare({ object: 'devmon', method: 'rename', params: ['mac', 'name'] });

const CSS = `
.dm-wrap{--dm-bd:rgba(127,127,127,.22);--dm-sub:rgba(127,127,127,.95);--dm-up:#e8833a;--dm-down:#2a9d8f;--dm-acc:#5e72e4}
.dm-cards{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px}
.dm-card{flex:1 1 150px;border:1px solid var(--dm-bd);border-radius:10px;padding:10px 14px;min-width:140px}
.dm-card .t{font-size:12px;color:var(--dm-sub);margin-bottom:4px}
.dm-card .v{font-size:15px;font-weight:600;line-height:1.5;font-variant-numeric:tabular-nums}
.dm-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 10px}
.dm-bar input[type=text]{max-width:220px}
.dm-bar select{width:auto}
.dm-use{font-size:13px;line-height:1.7;font-variant-numeric:tabular-nums;text-align:left;display:inline-block}
.dm-use .d{color:var(--dm-down)} .dm-use .u{color:var(--dm-up)}
.dm-bar .seg{display:inline-flex;border:1px solid var(--dm-bd);border-radius:8px;overflow:hidden}
.dm-bar .seg span{padding:4px 12px;cursor:pointer;font-size:13px}
.dm-bar .seg span.on{background:var(--dm-acc);color:#fff}
.dm-table{border:1px solid var(--dm-bd);border-radius:10px;overflow:hidden}
.dm-head,.dm-row{display:grid;grid-template-columns:minmax(300px,1fr) 130px 80px 90px 180px;align-items:center}
.dm-head{font-weight:600;font-size:13px;border-bottom:1px solid var(--dm-bd)}
.dm-head>div{padding:10px 12px}
.dm-head>div+div,.dm-row>div+div{border-left:1px solid var(--dm-bd);text-align:center}
.dm-row{border-bottom:1px solid var(--dm-bd)}
.dm-row:last-child{border-bottom:0}
.dm-row>div{padding:12px}
.dm-row.off{opacity:.55}
.dm-dev{display:flex;gap:14px;align-items:center}
.dm-ck{flex:0 0 auto;width:17px;height:17px;margin:0;cursor:pointer}
.dm-hd{display:flex;gap:10px;align-items:center}
.dm-batch{display:none;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 10px;padding:8px 12px;border:1px solid var(--dm-acc);border-radius:10px;font-size:13px}
.dm-batch.on{display:flex}
.dm-batch b{color:var(--dm-acc)}
.dm-av{flex:0 0 52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;letter-spacing:.5px}
.dm-name{font-size:15px;font-weight:600;display:flex;align-items:center;gap:6px}
.dm-name .ed,.dm-lim .ed{cursor:pointer;opacity:.6;font-size:15px}
.dm-name .ed:hover,.dm-lim .ed:hover{opacity:1}
.dm-sp{display:grid;grid-template-columns:150px 150px;font-variant-numeric:tabular-nums;margin:3px 0}
.dm-sp .u{color:var(--dm-up)} .dm-sp .d{color:var(--dm-down)}
.dm-meta{display:grid;grid-template-columns:150px auto;font-size:12px;color:var(--dm-sub);line-height:1.6}
.dm-wan{font-size:12px;color:var(--dm-sub)}
.dm-lk{display:inline-block;font-size:11px;font-weight:normal;padding:1px 7px;border-radius:9px;margin-left:8px;vertical-align:2px;white-space:nowrap;border:1px solid var(--dm-bd);color:var(--dm-sub)}
.dm-lk.w{color:#2b7de9;border-color:rgba(43,125,233,.45)}
.dm-lk .g{color:#2e9d4a}.dm-lk .m{color:#d98a00}.dm-lk .b{color:#d64545}
.dm-conn{cursor:pointer;color:var(--dm-acc);text-decoration:underline dotted}
.dm-sw{position:relative;display:inline-block;width:46px;height:24px}
.dm-sw input{opacity:0;width:0;height:0}
.dm-sw i{position:absolute;inset:0;background:rgba(127,127,127,.45);border-radius:24px;transition:.2s;cursor:pointer}
.dm-sw i:before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}
.dm-sw input:checked+i{background:var(--dm-acc)}
.dm-sw input:checked+i:before{transform:translateX(22px)}
.dm-sw input:disabled+i{cursor:wait;opacity:.6}
.dm-lim{display:flex;align-items:center;justify-content:center;gap:12px;font-size:13px;line-height:1.7;text-align:left}
.dm-note{font-size:12px;color:var(--dm-sub);margin-top:10px;line-height:1.6}
.dm-ftab{width:100%;font-size:12px;font-variant-numeric:tabular-nums}
.dm-ftab th,.dm-ftab td{padding:4px 6px;text-align:left;white-space:nowrap}
.dm-ftab td.n{text-align:right}
.dm-form{display:grid;grid-template-columns:110px 1fr;gap:10px 12px;align-items:center;margin:8px 0}
.dm-form input[type=number]{width:160px}
@media (max-width:860px){
 .dm-head{display:none}
 .dm-row{grid-template-columns:1fr auto;grid-template-areas:"dev dev" "use conn" "sw lim"}
 .dm-row>div:nth-child(1){grid-area:dev}.dm-row>div:nth-child(2){grid-area:use;text-align:left;border-left:0}
 .dm-row>div:nth-child(3){grid-area:conn}
 .dm-row>div:nth-child(4){grid-area:sw;border-left:0;text-align:left}.dm-row>div:nth-child(5){grid-area:lim}
 .dm-sp,.dm-meta{grid-template-columns:1fr 1fr}
}
`;

const COLORS = ['#26a69a', '#5e72e4', '#ef6c57', '#ab47bc', '#f4a62a', '#42a5f5', '#8d6e63', '#ec407a', '#66bb6a', '#78909c'];

function fmtRate(b) {
	b = +b || 0;
	if (b < 1e6) return (b / 1e3).toFixed(b < 1e4 ? 1 : 0) + ' Kbps';
	if (b < 1e9) return (b / 1e6).toFixed(b < 1e8 ? 2 : 1) + ' Mbps';
	return (b / 1e9).toFixed(2) + ' Gbps';
}

function fmtBytes(n) {
	n = +n || 0;
	const u = ['B', 'KB', 'MB', 'GB', 'TB'];
	let i = 0;
	while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
	return n.toFixed(i ? 1 : 0) + ' ' + u[i];
}

function fmtKbit(k) {
	k = +k || 0;
	if (!k) return '不限速';
	if (k >= 1000) return +(k / 1000).toFixed(2) + ' Mbps';
	return k + ' Kbps';
}

function fmtDur(s) {
	if (s == null) return '-';
	const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
	return `${d} 天 ${h} 小时 ${m} 分钟`;
}

function initials(name, mac) {
	const s = (name || '').trim();
	if (s) {
		const m = s.match(/[A-Za-z0-9]+/);
		if (m) return m[0].substr(0, 4).toUpperCase();
		return s.substr(0, 2);
	}
	return mac ? mac.substr(-5).replace(':', '').toUpperCase() : '?';
}

function color(key) {
	let h = 0;
	for (const c of key || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return COLORS[h % COLORS.length];
}

function devKey(d) { return d.mac || d.ip; }

function linkKey(l) { return !l ? 'none' : l.type === 'wifi' ? 'wifi:' + (l.band || l.iface) : 'lan:' + l.iface; }
function linkName(l) {
	if (!l) return '未知';
	return l.type === 'wifi' ? 'Wi‑Fi ' + (l.band || l.iface) : '有线 ' + (l.label || l.iface);
}

return view.extend({
	filter: 'online',
	search: '',
	connDev: null,
	connBody: null,
	busy: {},
	period: 'today',
	sel: {},
	usage: null,

	load() {
		try { this.period = localStorage.getItem('devmon.period') || 'today'; } catch (e) {}
		return Promise.all([callStats(), callUsage(this.period).catch(() => null)]);
	},

	loadUsage() {
		const p = this.period;
		return callUsage(p).then((u) => {
			if (u && u.period === p && p === this.period) { this.usage = u; this.update(this.last); }
		}).catch(() => {});
	},

	render(res) {
		const data = res[0];
		this.usage = res[1];
		this.cards = E('div', { 'class': 'dm-cards' });
		this.rows = E('div');
		this.note = E('div', { 'class': 'dm-note' });

		const seg = E('span', { 'class': 'seg' }, [
			E('span', { 'class': 'on', 'data-f': 'online' }, '在线设备'),
			E('span', { 'data-f': 'all' }, '全部设备')
		]);
		seg.querySelectorAll('span').forEach((s) => s.addEventListener('click', () => {
			seg.querySelectorAll('span').forEach((x) => x.classList.toggle('on', x === s));
			this.filter = s.getAttribute('data-f');
			this.update(this.last);
		}));
		const search = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': '搜索名称 / IP / MAC' });
		search.addEventListener('input', () => { this.search = search.value.trim().toLowerCase(); this.update(this.last); });
		const PER = [['today', '今天'], ['yesterday', '昨天'], ['7d', '最近 7 天'], ['30d', '最近 30 天'], ['month', '本月']];
		if (!PER.some((o) => o[0] === this.period)) this.period = 'today';
		const sel = E('select', { 'class': 'cbi-input-select', 'title': '流量统计时间段' },
			PER.map((o) => E('option', { 'value': o[0] }, '流量：' + o[1])));
		sel.value = this.period;
		this.perName = (k) => (PER.find((o) => o[0] === k) || PER[0])[1];
		sel.addEventListener('change', () => {
			this.period = sel.value;
			try { localStorage.setItem('devmon.period', this.period); } catch (e) {}
			this.usage = null;
			this.update(this.last);
			this.loadUsage();
		});
		const SORTS = [['default', '默认（在线优先）'], ['rate', '实时速率'], ['down', '实时下载'], ['up', '实时上传'],
			['usage', '已用流量'], ['udown', '已用下载'], ['uup', '已用上传'], ['conns', '连接数'],
			['since', '在线时长'], ['link', '连接方式'], ['signal', 'Wi‑Fi 信号'], ['name', '名称'], ['ip', 'IP 地址']];
		try { this.sortBy = localStorage.getItem('devmon.sort') || 'default'; } catch (e) { this.sortBy = 'default'; }
		if (!SORTS.some((o) => o[0] === this.sortBy)) this.sortBy = 'default';
		const sortBox = E('select', { 'class': 'cbi-input-select', 'title': '排序方式' },
			SORTS.map((o) => E('option', { 'value': o[0] }, '排序：' + o[1])));
		sortBox.value = this.sortBy;
		sortBox.addEventListener('change', () => {
			this.sortBy = sortBox.value;
			try { localStorage.setItem('devmon.sort', this.sortBy); } catch (e) {}
			this.update(this.last);
		});

		try { this.linkF = localStorage.getItem('devmon.link') || 'all'; } catch (e) { this.linkF = 'all'; }
		this.linkBox = E('select', { 'class': 'cbi-input-select', 'title': '按连接方式过滤' });
		this.linkBox.addEventListener('change', () => {
			this.linkF = this.linkBox.value;
			try { localStorage.setItem('devmon.link', this.linkF); } catch (e) {}
			this.update(this.last);
		});

		const root = E('div', { 'class': 'dm-wrap' }, [
			E('style', {}, CSS),
			E('h2', {}, '设备监控'),
			this.cards,
			E('div', { 'class': 'dm-bar' }, [seg, search, this.linkBox, sel, sortBox]),
			this.batch = E('div', { 'class': 'dm-batch' }),
			E('div', { 'class': 'dm-table' }, [
				E('div', { 'class': 'dm-head' }, [
					E('div', { 'class': 'dm-hd' }, [this.ckAll = E('input', { 'type': 'checkbox', 'class': 'dm-ck', 'title': '全选当前列表',
						'change': (ev) => this.selectAll(ev.target.checked) }), '设备']), E('div', { 'class': 'dm-uh' }, '已用流量'), E('div', {}, '连接数'), E('div', {}, '网络限速'), E('div', {}, '限速值')
				]),
				this.rows
			]),
			this.note
		]);

		this.update(data);
		poll.add(() => callStats(this.connDev ? this.connDev.mac : null).then((d) => this.update(d)), 2);
		poll.add(() => this.loadUsage(), 30);
		return root;
	},

	update(d) {
		if (!d || !d.devices) return;
		this.last = d;

		/* cards */
		const order = { WAN_CT: 1, WAN_CN2: 2, WAN_9929: 3 };
		const wans = (d.wans || []).filter((w) => w.name !== '内网')
			.sort((a, b) => (order[a.name] || 9) - (order[b.name] || 9) || a.name.localeCompare(b.name));
		let tu = 0, td = 0;
		wans.forEach((w) => { tu += w.up; td += w.down; });
		const online = d.devices.filter((x) => x.online).length;
		const card = (t, v) => E('div', { 'class': 'dm-card' }, [E('div', { 'class': 't' }, t), E('div', { 'class': 'v' }, v)]);
		const rv = (u, dn) => [E('span', { 'style': 'color:var(--dm-down)' }, '↓ ' + fmtRate(dn)), E('br'),
			E('span', { 'style': 'color:var(--dm-up)' }, '↑ ' + fmtRate(u))];
		dom.content(this.cards, [
			card('总计', rv(tu, td)),
			...wans.map((w) => card(w.name, rv(w.up, w.down))),
			this.usageCard(card),
			card('设备 / 连接', [E('span', {}, `${online} 台在线`), E('br'), E('span', {}, `${d.conntrack} / ${d.conntrack_max}`)])
		]);

		/* rows */
		let devs = d.devices;
		if (this.filter === 'all' && this.usage && this.usage.devices) {
			const have = {};
			devs.forEach((x) => { if (x.mac) have[x.mac] = 1; });
			devs = devs.concat(Object.keys(this.usage.devices).filter((m) => !have[m])
				.map((m) => ({ mac: m, online: false, up: 0, down: 0, conns: 0, wan: {} })));
		}
		let list = devs.filter((x) => this.filter === 'all' || x.online || (x.limit && x.limit.enabled));
		this.renderLinkBox(devs);
		if (this.linkF !== 'all') {
			const f = this.linkF;
			list = list.filter((x) => {
				const k = linkKey(x.link);
				return f === 'wifi' ? k.startsWith('wifi:') : f === 'lan' ? k.startsWith('lan:') : k === f;
			});
		}
		if (this.search)
			list = list.filter((x) => [x.name, x.hostname, x.ip, x.mac, x.link ? linkName(x.link) : null].concat(x.ip6 || [])
				.some((v) => v && String(v).toLowerCase().indexOf(this.search) >= 0));
		const ud = (this.usage && this.usage.devices) || {};
		const ut = (x) => { const v = x.mac && ud[x.mac]; return v ? v.rx + v.tx : 0; };
		const uv = (x, k) => { const v = x.mac && ud[x.mac]; return v ? v[k] : 0; };
		const nm = (x) => String(x.name || x.hostname || x.ip || x.mac || '');
		const ipn = (x) => { const p = String(x.ip || '').split('.'); return p.length === 4 ? ((+p[0] << 24) >>> 0) + (+p[1] << 16) + (+p[2] << 8) + +p[3] : 4294967296; };
		const KEY = {
			rate: (a, b) => (b.down + b.up) - (a.down + a.up),
			down: (a, b) => b.down - a.down,
			up: (a, b) => b.up - a.up,
			usage: (a, b) => ut(b) - ut(a),
			udown: (a, b) => uv(b, 'rx') - uv(a, 'rx'),
			uup: (a, b) => uv(b, 'tx') - uv(a, 'tx'),
			conns: (a, b) => (b.conns || 0) - (a.conns || 0),
			since: (a, b) => (b.since ?? -1) - (a.since ?? -1),
			name: (a, b) => nm(a).localeCompare(nm(b), 'zh-CN'),
			ip: (a, b) => ipn(a) - ipn(b),
			link: (a, b) => linkKey(a.link).localeCompare(linkKey(b.link)),
			signal: (a, b) => ((b.link && b.link.signal) ?? -999) - ((a.link && a.link.signal) ?? -999)
		};
		const dflt = (a, b) => (b.online - a.online) || (b.down + b.up - a.down - a.up) || (b.conns - a.conns) || nm(a).localeCompare(nm(b));
		const k = KEY[this.sortBy];
		list.sort(k ? (a, b) => k(a, b) || dflt(a, b) : dflt);
		this.visible = list;
		this.renderBatch(devs);
		dom.content(this.rows, list.length ? list.map((x) => this.renderRow(x)) :
			E('div', { 'style': 'padding:20px;text-align:center' }, '没有设备'));

		const uh = this.cards.parentNode && this.cards.parentNode.querySelector('.dm-uh');
		if (uh) uh.textContent = '已用流量（' + this.perName(this.period) + '）';

		const nlim = d.devices.filter((x) => x.limit && x.limit.enabled).length;
		dom.content(this.note, [
			`限速由 devmon-qos 下发到 HNAT 硬件队列（不影响硬件加速），当前已限速 ${nlim} / 31 台；按 IPv4 地址生效。`,
			E('br'),
			`限速${d.eqos_enabled ? '已启用' : '已关闭'}，总带宽 ↓${d.eqos_down} / ↑${d.eqos_up} Mbit/s。速率由连接跟踪计数计算，硬件加速约每 4 秒同步一次，显示为约 8 秒平均。`,
			E('br'),
			'已用流量来自 nlbwmon（按天存储在 /etc/nlbwmon，每小时写盘，最多保留 30 天），包含内网与外网流量，约 30 秒刷新' +
				(this.usage && this.usage.first ? `；当前时段最早数据 ${this.usage.first}。` : '。')
		]);

		if (this.connDev && this.connBody) this.renderFlows(d.flows || []);
	},

	usageCard(card) {
		const u = this.usage;
		const t = '总流量（' + this.perName(this.period) + '）';
		if (!u) return card(t, [E('span', {}, '加载中…'), E('br'), E('span', {}, '\u00a0')]);
		return card(t, [E('span', { 'style': 'color:var(--dm-down)' }, '↓ ' + fmtBytes(u.rx)), E('br'),
			E('span', { 'style': 'color:var(--dm-up)' }, '↑ ' + fmtBytes(u.tx))]);
	},

	linkBadge(l) {
		if (!l) return '';
		if (l.type === 'wifi') {
			const sg = l.signal;
			const cls = sg == null ? '' : sg >= -60 ? 'g' : sg >= -72 ? 'm' : 'b';
			const tip = [l.ssid ? 'SSID ' + l.ssid : null, '接口 ' + l.iface,
				l.rx_rate ? '协商 ↓' + l.tx_rate + ' / ↑' + l.rx_rate + ' Mbps' : null].filter(Boolean).join('，');
			return E('span', { 'class': 'dm-lk w', 'title': tip }, ['📶 ' + (l.band || 'Wi‑Fi'),
				sg != null ? E('span', { 'class': cls }, ' ' + sg + ' dBm') : '']);
		}
		return E('span', { 'class': 'dm-lk', 'title': '网桥端口 ' + l.iface }, '🔌 有线 ' + (l.label || l.iface));
	},

	renderLinkBox(devs) {
		const cnt = {}, names = {};
		let nw = 0, nl = 0;
		devs.filter((x) => this.filter === 'all' || x.online || (x.limit && x.limit.enabled)).forEach((x) => {
			const k = linkKey(x.link);
			cnt[k] = (cnt[k] || 0) + 1; names[k] = linkName(x.link);
			if (k.startsWith('wifi:')) nw++; else if (k.startsWith('lan:')) nl++;
		});
		const keys = Object.keys(cnt).sort();
		const opts = [['all', '连接：全部方式']]
			.concat([['wifi', `Wi‑Fi（全部）· ${nw}`]], keys.filter((k) => k.startsWith('wifi:')).map((k) => [k, `　${names[k]} · ${cnt[k]}`]))
			.concat([['lan', `有线（全部）· ${nl}`]], keys.filter((k) => k.startsWith('lan:')).map((k) => [k, `　${names[k]} · ${cnt[k]}`]))
			.concat(cnt.none ? [['none', `未知 · ${cnt.none}`]] : []);
		if (this.linkF !== 'all' && !opts.some((o) => o[0] === this.linkF)) opts.push([this.linkF, this.linkF + ' · 0']);
		const sig = opts.map((o) => o.join('=')).join('|');
		if (sig !== this.linkSig) {
			this.linkSig = sig;
			dom.content(this.linkBox, opts.map((o) => E('option', { 'value': o[0] }, o[1])));
		}
		this.linkBox.value = this.linkF;
	},

	renderRow(x) {
		const key = devKey(x);
		const name = x.name || x.hostname || '未知设备';
		const lim = x.limit || {};
		const on = !!lim.enabled;

		const wk = Object.keys(x.wan || {});
		const all = wk.reduce((s, k) => s + x.wan[k][0] + x.wan[k][1], 0);
		const wanTxt = wk.filter((k) => k !== '内网').map((k) => {
			const t = x.wan[k][0] + x.wan[k][1];
			return all > 0 && t > 0 ? `${k} ${Math.round(t * 100 / all)}%` : null;
		}).filter(Boolean).join(' · ');

		const sw = E('input', { 'type': 'checkbox' });
		sw.checked = on;
		if (this.busy[key]) sw.disabled = true;
		sw.addEventListener('change', () => {
			if (sw.checked) {
				if (lim.up || lim.down) this.apply(x, lim.up || 0, lim.down || 0, true, true);
				else { sw.checked = false; this.editLimit(x); }
			}
			else this.apply(x, lim.up || 0, lim.down || 0, false, false);
		});

		const edName = E('span', { 'class': 'ed', 'title': '修改名称' }, '✎');
		edName.addEventListener('click', () => this.editName(x));
		const edLim = E('span', { 'class': 'ed', 'title': '设置限速值' }, '✎');
		edLim.addEventListener('click', () => this.editLimit(x));
		const conn = E('span', { 'class': 'dm-conn', 'title': '查看连接' }, String(x.conns || 0));
		conn.addEventListener('click', () => this.showFlows(x));

		return E('div', { 'class': 'dm-row' + (x.online ? '' : ' off') }, [
			E('div', {}, E('div', { 'class': 'dm-dev' }, [
				E('input', { 'type': 'checkbox', 'class': 'dm-ck', 'title': '选择', 'checked': this.sel[key] ? '' : null,
					'change': (ev) => { if (ev.target.checked) this.sel[key] = x; else delete this.sel[key]; this.update(this.last); } }),
				E('div', { 'class': 'dm-av', 'style': 'background:' + color(key) }, initials(x.name || x.hostname, x.mac)),
				E('div', {}, [
					E('div', { 'class': 'dm-name' }, [name, edName, this.linkBadge(x.link)]),
					E('div', { 'class': 'dm-sp' }, [
						E('span', { 'class': 'u' }, '↑ ' + fmtRate(x.up)),
						E('span', { 'class': 'd' }, '↓ ' + fmtRate(x.down))
					]),
					E('div', { 'class': 'dm-meta' }, [
						E('span', {}, 'IP: ' + (x.ip || '-')),
						E('span', {}, 'MAC: ' + (x.mac ? x.mac.toUpperCase() : '-')),
						E('span', {}, x.online ? '在线: ' + fmtDur(x.since) : '离线'),
						E('span', { 'class': 'dm-wan' }, wanTxt)
					])
				])
			])),
			E('div', {}, this.renderUse(x)),
			E('div', {}, conn),
			E('div', {}, E('label', { 'class': 'dm-sw' }, [sw, E('i')])),
			E('div', {}, E('div', { 'class': 'dm-lim' }, [
				E('div', {}, [
					E('div', {}, '↑ ' + (on ? fmtKbit(lim.up) : '不限速')),
					E('div', {}, '↓ ' + (on ? fmtKbit(lim.down) : '不限速'))
				]),
				edLim
			]))
		]);
	},

	selectAll(on) {
		(this.visible || []).forEach((x) => { const k = devKey(x); if (on) this.sel[k] = x; else delete this.sel[k]; });
		this.update(this.last);
	},

	renderBatch(devs) {
		const byKey = {};
		devs.forEach((x) => byKey[devKey(x)] = x);
		Object.keys(this.sel).forEach((k) => { if (byKey[k]) this.sel[k] = byKey[k]; });
		const keys = Object.keys(this.sel);
		const vis = this.visible || [];
		const nsel = vis.filter((x) => this.sel[devKey(x)]).length;
		if (this.ckAll) {
			this.ckAll.checked = vis.length > 0 && nsel === vis.length;
			this.ckAll.indeterminate = nsel > 0 && nsel < vis.length;
		}
		this.batch.classList.toggle('on', keys.length > 0);
		if (!keys.length) { dom.content(this.batch, []); return; }
		const sel = keys.map((k) => this.sel[k]);
		const noip = sel.filter((x) => !x.ip).length;
		const nlim = sel.filter((x) => x.limit && x.limit.enabled).length;
		dom.content(this.batch, [
			E('span', {}, ['已选 ', E('b', {}, String(keys.length)), ' 台',
				nlim ? `（${nlim} 台已限速）` : '', noip ? `，${noip} 台无 IPv4 将跳过` : '']),
			E('button', { 'class': 'btn cbi-button-action', 'disabled': this.batchBusy ? '' : null, 'click': () => this.editBatch() }, '一键限速'),
			E('button', { 'class': 'btn', 'disabled': this.batchBusy || !nlim ? '' : null, 'click': () => this.applyBatch(0, 0, false, false) }, '取消限速'),
			E('button', { 'class': 'btn', 'click': () => this.selectAll(true) }, '全选当前列表'),
			E('button', { 'class': 'btn', 'click': () => { this.sel = {}; this.update(this.last); } }, '清空选择')
		]);
	},

	editBatch() {
		const sel = Object.values(this.sel);
		const names = sel.map((x) => x.name || x.hostname || x.ip || x.mac);
		const iu = E('input', { 'type': 'number', 'min': '0', 'step': 'any', 'class': 'cbi-input-text', 'placeholder': '不限速' });
		const id = E('input', { 'type': 'number', 'min': '0', 'step': 'any', 'class': 'cbi-input-text', 'placeholder': '不限速' });
		const rs = E('input', { 'type': 'checkbox' });
		rs.checked = true;
		const preset = (u, d) => E('button', { 'class': 'btn', 'style': 'padding:2px 8px', 'click': () => { iu.value = u; id.value = d; } }, `↑${u} / ↓${d}`);
		ui.showModal(`一键限速：${sel.length} 台设备`, [
			E('p', { 'style': 'font-size:12px;opacity:.8;max-height:5.5em;overflow:auto' }, names.join('、')),
			E('div', { 'class': 'dm-form' }, [
				E('label', {}, '常用'), E('div', { 'style': 'display:flex;flex-wrap:wrap;gap:6px' }, [preset(2, 10), preset(5, 20), preset(10, 50), preset(20, 100)]),
				E('label', {}, '上传限速'), E('div', {}, [iu, ' Mbps']),
				E('label', {}, '下载限速'), E('div', {}, [id, ' Mbps']),
				E('span'), E('label', {}, [rs, ' 立即生效（断开这些设备现有连接，应用会自动重连）'])
			]),
			E('p', { 'style': 'font-size:12px;opacity:.75' }, '每台设备各自独立限到这个速率（不是共享总带宽）。留空或 0 表示该方向不限速。'),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, '取消'), ' ',
				E('button', {
					'class': 'btn cbi-button-positive', 'click': () => {
						const up = Math.round((parseFloat(iu.value) || 0) * 1000);
						const dn = Math.round((parseFloat(id.value) || 0) * 1000);
						if (!up && !dn) { ui.addTimeLimitedNotification(null, E('p', '请至少填写一个方向的限速值'), 3000, 'warning'); return; }
						ui.hideModal();
						this.applyBatch(up, dn, true, rs.checked);
					}
				}, '应用到全部')
			])
		]);
	},

	applyBatch(up, dn, enabled, reset) {
		const sel = Object.values(this.sel).filter((x) => x.ip && (enabled || (x.limit && x.limit.enabled)));
		if (!sel.length) return Promise.resolve();
		const items = sel.map((x) => ({ mac: x.mac || '', ip: x.ip, name: x.name || x.hostname || '' }));
		this.batchBusy = true;
		sel.forEach((x) => this.busy[devKey(x)] = true);
		this.update(this.last);
		return callSetLimits(items, up, dn, enabled, reset).then((r) => {
			if (r && r.error) { ui.addNotification(null, E('p', '设置失败：' + r.error), 'error'); return; }
			const bad = (r && r.failed) || [];
			ui.addTimeLimitedNotification(null, E('p', (enabled ? `已对 ${r.count} 台设备限速 ↑${fmtKbit(up)} ↓${fmtKbit(dn)}` +
				(r.reset ? `（已断开 ${r.reset} 台的现有连接）` : '') : `已取消 ${r.count} 台设备的限速`) +
				(bad.length ? `；${bad.length} 台失败：` + bad.map((b) => `${b.ip || b.mac} ${b.error}`).join('，') : '')), 5000, 'info');
			this.sel = {};
		}).catch((e) => {
			ui.addNotification(null, E('p', '设置失败：' + e), 'error');
		}).finally(() => {
			this.batchBusy = false;
			sel.forEach((x) => delete this.busy[devKey(x)]);
			return callStats().then((d) => this.update(d));
		});
	},

	renderUse(x) {
		if (!this.usage) return E('span', { 'class': 'dm-use' }, '…');
		const v = x.mac && this.usage.devices && this.usage.devices[x.mac];
		return E('span', { 'class': 'dm-use', 'title': '合计 ' + fmtBytes(v ? v.rx + v.tx : 0) }, [
			E('span', { 'class': 'd' }, '↓ ' + fmtBytes(v ? v.rx : 0)), E('br'),
			E('span', { 'class': 'u' }, '↑ ' + fmtBytes(v ? v.tx : 0))
		]);
	},

	apply(x, up, down, enabled, reset) {
		const key = devKey(x);
		if (!x.ip) {
			ui.addNotification(null, E('p', '该设备没有 IPv4 地址，无法限速'), 'warning');
			return Promise.resolve();
		}
		this.busy[key] = true;
		this.update(this.last);
		return callSetLimit(x.mac || '', x.ip, up, down, enabled, reset, x.name || x.hostname || '').then((r) => {
			if (r && r.error) ui.addNotification(null, E('p', '设置失败：' + r.error), 'error');
			else ui.addTimeLimitedNotification(null, E('p', `${x.name || x.hostname || x.ip}：` +
				(enabled ? `已限速 ↑${fmtKbit(up)} ↓${fmtKbit(down)}${r && r.reset ? '（已断开现有连接）' : ''}` : '已取消限速')), 4000, 'info');
		}).catch((e) => {
			ui.addNotification(null, E('p', '设置失败：' + e), 'error');
		}).finally(() => {
			delete this.busy[key];
			return callStats().then((d) => this.update(d));
		});
	},

	editLimit(x) {
		const lim = x.limit || {};
		const toM = (k) => k ? +(k / 1000).toFixed(3) : '';
		const iu = E('input', { 'type': 'number', 'min': '0', 'step': 'any', 'class': 'cbi-input-text', 'placeholder': '不限速', 'value': toM(lim.up) });
		const id = E('input', { 'type': 'number', 'min': '0', 'step': 'any', 'class': 'cbi-input-text', 'placeholder': '不限速', 'value': toM(lim.down) });
		const rs = E('input', { 'type': 'checkbox', 'id': 'dm-reset' });
		rs.checked = !lim.enabled || lim.ip !== x.ip;

		ui.showModal(`限速：${x.name || x.hostname || x.ip}`, [
			E('div', { 'class': 'dm-form' }, [
				E('label', {}, '上传限速'), E('div', {}, [iu, ' Mbps']),
				E('label', {}, '下载限速'), E('div', {}, [id, ' Mbps']),
				E('span'), E('label', {}, [rs, ' 立即生效（断开该设备现有连接，应用会自动重连）'])
			]),
			E('p', { 'style': 'font-size:12px;opacity:.75' },
				'留空或 0 表示该方向不限速；两项都留空等于取消限速。不勾选「立即生效」时，新限速只对之后新建的连接生效，正在进行的下载不受影响。'),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, '取消'), ' ',
				E('button', {
					'class': 'btn cbi-button-positive', 'click': () => {
						const up = Math.round((parseFloat(iu.value) || 0) * 1000);
						const dn = Math.round((parseFloat(id.value) || 0) * 1000);
						ui.hideModal();
						this.apply(x, up, dn, !!(up || dn), rs.checked);
					}
				}, '保存')
			])
		]);
	},

	editName(x) {
		if (!x.mac) return;
		const inp = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': x.name || '', 'placeholder': x.hostname || '' });
		ui.showModal('修改设备名称', [
			E('div', { 'class': 'dm-form' }, [E('label', {}, '名称'), inp]),
			E('p', { 'style': 'font-size:12px;opacity:.75' }, '留空恢复为 DHCP 主机名。'),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, '取消'), ' ',
				E('button', {
					'class': 'btn cbi-button-positive', 'click': () => {
						ui.hideModal();
						callRename(x.mac, inp.value.trim()).then(() => callStats()).then((d) => this.update(d));
					}
				}, '保存')
			])
		]);
	},

	showFlows(x) {
		this.connDev = x;
		this.connBody = E('tbody', {}, E('tr', {}, E('td', { 'colspan': 7 }, '加载中…')));
		this.ff = this.ff || { q: '', proto: '', wan: '', active: false };
		this.ff.wan = '';
		const redraw = () => { if (this.lastFlows) this.renderFlows(this.lastFlows); };
		const q = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': '过滤地址 / 端口', 'style': 'max-width:180px', 'value': this.ff.q });
		q.addEventListener('input', () => { this.ff.q = q.value.trim().toLowerCase(); redraw(); });
		const proto = E('select', { 'class': 'cbi-input-select', 'style': 'width:auto' }, [
			E('option', { 'value': '' }, '全部协议'), E('option', { 'value': 'tcp' }, 'TCP'),
			E('option', { 'value': 'udp' }, 'UDP'), E('option', { 'value': 'other' }, '其他')
		]);
		proto.value = this.ff.proto;
		proto.addEventListener('change', () => { this.ff.proto = proto.value; redraw(); });
		this.ffWan = E('select', { 'class': 'cbi-input-select', 'style': 'width:auto' }, E('option', { 'value': '' }, '全部出口'));
		this.ffWan.addEventListener('change', () => { this.ff.wan = this.ffWan.value; redraw(); });
		const act = E('input', { 'type': 'checkbox' });
		act.checked = this.ff.active;
		act.addEventListener('change', () => { this.ff.active = act.checked; redraw(); });
		this.ffCount = E('span', { 'style': 'font-size:12px;opacity:.7;margin-left:auto' });
		ui.showModal(`连接：${x.name || x.hostname || x.ip}`, [
			E('div', { 'style': 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px' }, [
				q, proto, this.ffWan,
				E('label', { 'style': 'font-size:13px;display:inline-flex;gap:4px;align-items:center' }, [act, '只看有速率的']),
				this.ffCount
			]),
			E('div', { 'style': 'max-height:60vh;overflow:auto' },
				E('table', { 'class': 'dm-ftab' }, [
					E('thead', {}, E('tr', {}, [
						E('th', {}, '协议'), E('th', {}, '远端地址'), E('th', {}, '出口'),
						E('th', {}, '↓ 速率'), E('th', {}, '↑ 速率'), E('th', {}, '↓ 累计'), E('th', {}, '↑ 累计')
					])),
					this.connBody
				])),
			E('div', { 'class': 'right' }, E('button', {
				'class': 'btn', 'click': () => { this.connDev = null; this.connBody = null; this.lastFlows = null; ui.hideModal(); }
			}, '关闭'))
		]);
		callStats(x.mac).then((d) => this.update(d));
	},

	renderFlows(all) {
		this.lastFlows = all;
		const ff = this.ff || {};
		if (this.ffWan) {
			const ws = [...new Set(all.map((f) => f.wan).filter(Boolean))].sort();
			if (ff.wan && ws.indexOf(ff.wan) < 0) ws.push(ff.wan);
			const cur = Array.from(this.ffWan.options).slice(1).map((o) => o.value).join('|');
			if (cur !== ws.join('|')) {
				dom.content(this.ffWan, [E('option', { 'value': '' }, '全部出口')].concat(ws.map((w) => E('option', { 'value': w }, w))));
				this.ffWan.value = ff.wan || '';
			}
		}
		const flows = all.filter((f) => {
			const p = String(f.proto || '').toLowerCase();
			if (ff.proto === 'other' ? (p === 'tcp' || p === 'udp') : (ff.proto && p !== ff.proto)) return false;
			if (ff.wan && f.wan !== ff.wan) return false;
			if (ff.active && !(f.down > 0 || f.up > 0)) return false;
			if (ff.q && [f.remote, f.rport, f.client, `${f.remote}:${f.rport}`].every((v) => v == null || String(v).toLowerCase().indexOf(ff.q) < 0)) return false;
			return true;
		});
		if (this.ffCount) this.ffCount.textContent = `显示 ${flows.length} / ${all.length} 条`;
		if (!flows.length) {
			dom.content(this.connBody, E('tr', {}, E('td', { 'colspan': 7 }, all.length ? '没有符合条件的连接' : '没有连接')));
			return;
		}
		dom.content(this.connBody, flows.map((f) => {
			const r = f.remote && f.remote.indexOf(':') >= 0 ? `[${f.remote}]` : f.remote;
			return E('tr', {}, [
				E('td', {}, f.proto), E('td', {}, `${r}${f.rport ? ':' + f.rport : ''}`), E('td', {}, f.wan),
				E('td', { 'class': 'n' }, fmtRate(f.down)), E('td', { 'class': 'n' }, fmtRate(f.up)),
				E('td', { 'class': 'n' }, fmtBytes(f.td)), E('td', { 'class': 'n' }, fmtBytes(f.tu))
			]);
		}));
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
