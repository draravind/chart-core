import e, { createContext as t, useCallback as n, useContext as r, useEffect as i, useLayoutEffect as a, useMemo as o, useRef as s, useState as c } from "react";
import { BarChart3 as l, ChevronDown as u, ChevronUp as d, Minus as f, MousePointer2 as p, MousePointerClick as m, MoveHorizontal as h, MoveVertical as g, RotateCcw as _, Ruler as v, Settings as y, Slash as b, Trash2 as x, TrendingUp as S, Type as C } from "lucide-react";
import { Fragment as w, jsx as T, jsxs as E } from "react/jsx-runtime";
import * as D from "d3";
//#region src/types.ts
var O = [
	"3M",
	"6M",
	"1Y",
	"2Y",
	"3Y",
	"5Y"
], k = {
	"3M": 66,
	"6M": 132,
	"1Y": 252,
	"2Y": 504,
	"3Y": 756,
	"5Y": 1260
}, ee = 2, te = 10, ne = 78;
function re(e) {
	return Math.floor((e - ne) / 2);
}
function ie(e) {
	let t = re(e), n = Object.values(k).sort((e, t) => e - t).filter((e) => e <= t);
	return n.length ? Math.max(...n) : Math.max(10, t);
}
var ae = (e) => e == null ? "" : e.toLocaleString("en-IN", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), oe = (e) => e == null ? "" : e >= 1e9 ? (e / 1e9).toFixed(2) + "B" : e >= 1e6 ? (e / 1e6).toFixed(2) + "M" : e >= 1e3 ? (e / 1e3).toFixed(0) + "K" : e.toString(), se = (e) => e == null ? "" : e >= 1e9 ? Math.round(e / 1e9) + "B" : e >= 1e6 ? Math.round(e / 1e6) + "M" : e >= 1e3 ? Math.round(e / 1e3) + "K" : e.toString(), ce = 1440 * 60 * 1e3;
function le(e, t = 30, n = 365) {
	let r = e.length, i = Array(r).fill(void 0), a = 0;
	for (let n = 0; n < r; n++) a += e[n].volume, n >= t && (a -= e[n - t].volume), n >= t - 1 && (i[n] = a / t);
	let o = [];
	if (r === 0) return {
		sma: i,
		labels: o
	};
	let s = -1, c = 0;
	for (let t = 0; t < r; t++) e[t].volume > 0 && e[t].volume >= c && (s = t, c = e[t].volume);
	if (s === -1) return {
		sma: i,
		labels: o
	};
	let l = new Date(e[r - 1].date).getTime() - n * ce, u = -1, d = 0;
	for (let t = 0; t < r; t++) new Date(e[t].date).getTime() < l || e[t].volume > 0 && e[t].volume >= d && (u = t, d = e[t].volume);
	return o.push({
		index: s,
		text: "HVE"
	}), u !== -1 && u !== s && o.push({
		index: u,
		text: "HVY"
	}), {
		sma: i,
		labels: o
	};
}
//#endregion
//#region src/patterns/catalog.ts
var ue = [
	{
		name: "high_tight_flag",
		label: "High tight flag"
	},
	{
		name: "base_breakout",
		label: "Base breakout"
	},
	{
		name: "consolidation",
		label: "Consolidation"
	},
	{
		name: "gap_up",
		label: "Gap up"
	},
	{
		name: "volume_breakout",
		label: "Volume breakout"
	},
	{
		name: "golden_cross",
		label: "Golden cross"
	},
	{
		name: "nr7",
		label: "NR7"
	},
	{
		name: "unusual_volume",
		label: "Unusual volume"
	},
	{
		name: "volume_dryup",
		label: "Volume dryup"
	},
	{
		name: "pocket_pivot",
		label: "Pocket pivot"
	},
	{
		name: "inside_day",
		label: "Inside day"
	},
	{
		name: "pullback_to_ema",
		label: "Pullback to EMA"
	}
], de = ue.map((e) => e.name);
//#endregion
//#region src/utils/dateBarIndex.ts
function A(e, t) {
	if (e.length === 0 || t < e[0].date || t > e[e.length - 1].date) return null;
	let n = 0, r = e.length - 1;
	for (; n <= r;) {
		let i = n + r >>> 1, a = e[i].date;
		if (a === t) return i;
		a < t ? n = i + 1 : r = i - 1;
	}
	return n - 1;
}
function fe(e, t) {
	return e.length === 0 ? "" : e[Math.max(0, Math.min(e.length - 1, t))].date;
}
var j = {
	chartWrapper: "_chartWrapper_1p65o_1",
	chartWrapperBare: "_chartWrapperBare_1p65o_14",
	seriesCanvas: "_seriesCanvas_1p65o_27",
	chartSvg: "_chartSvg_1p65o_34",
	empty: "_empty_1p65o_42",
	emptyIcon: "_emptyIcon_1p65o_52",
	resetPanBtn: "_resetPanBtn_1p65o_57",
	resetPanBtnInactive: "_resetPanBtnInactive_1p65o_84",
	autoFitBtn: "_autoFitBtn_1p65o_93",
	autoFitBtnActive: "_autoFitBtnActive_1p65o_118",
	subpaneDivider: "_subpaneDivider_1p65o_129",
	subpaneDividerLine: "_subpaneDividerLine_1p65o_140",
	legend: "_legend_1p65o_156",
	legendBlock: "_legendBlock_1p65o_164",
	legendItem: "_legendItem_1p65o_172",
	legendValues: "_legendValues_1p65o_191",
	legendToggle: "_legendToggle_1p65o_200",
	legendDot: "_legendDot_1p65o_218",
	legendLabel: "_legendLabel_1p65o_225",
	legendBtn: "_legendBtn_1p65o_230",
	legendPopover: "_legendPopover_1p65o_258",
	legendPopoverHeader: "_legendPopoverHeader_1p65o_275",
	legendPopoverTitle: "_legendPopoverTitle_1p65o_295",
	legendPopoverSummary: "_legendPopoverSummary_1p65o_305",
	legendPopoverClose: "_legendPopoverClose_1p65o_311",
	panelScrollBody: "_panelScrollBody_1p65o_333",
	legendPopoverField: "_legendPopoverField_1p65o_341",
	legendColorField: "_legendColorField_1p65o_418",
	legendColorControls: "_legendColorControls_1p65o_431",
	legendColorHex: "_legendColorHex_1p65o_463",
	lineFieldControls: "_lineFieldControls_1p65o_493",
	lineFieldSelect: "_lineFieldSelect_1p65o_522",
	lineFieldWidth: "_lineFieldWidth_1p65o_535",
	lineFieldOpacity: "_lineFieldOpacity_1p65o_556",
	sliderControl: "_sliderControl_1p65o_561",
	sliderValue: "_sliderValue_1p65o_571",
	settingsGearBtn: "_settingsGearBtn_1p65o_579",
	settingsDialog: "_settingsDialog_1p65o_606",
	autoFitMenu: "_autoFitMenu_1p65o_626",
	autoFitMenuRow: "_autoFitMenuRow_1p65o_644",
	autoFitMenuEmpty: "_autoFitMenuEmpty_1p65o_658",
	settingsSectionTitle: "_settingsSectionTitle_1p65o_664",
	settingsGroupTitle: "_settingsGroupTitle_1p65o_678"
}, M = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
function N(e, t, n) {
	if (!e || t < 0 || t >= e.length) return "";
	let r = e[t];
	return Number.isNaN(r) ? "" : n(r);
}
function pe(e, t, n, r, i) {
	let { xScale: a, bandwidth: o, renderStart: s, renderEnd: c } = t;
	e.save(), e.beginPath(), e.lineWidth = r.width, e.strokeStyle = r.color, e.globalAlpha = r.opacity ?? 1, e.setLineDash(r.dash ?? []), e.lineJoin = "round", e.lineCap = "butt";
	let l = !1;
	for (let r = s; r < c; r++) {
		if (!i(r)) {
			l = !1;
			continue;
		}
		let s = a(r) + o / 2, c = t.y(n[r]);
		l ? e.lineTo(s, c) : (e.moveTo(s, c), l = !0);
	}
	e.stroke(), e.restore();
}
function P(e, t, n, r) {
	for (let i of r) {
		let r = t[i.key];
		r && pe(e, n, r, i.st, (e) => !Number.isNaN(r[e]));
	}
}
function me(e, t, n, r, i) {
	let { xScale: a, bandwidth: o, renderStart: s, renderEnd: c } = t, l = t.y(0), u = Math.max(1, o);
	e.save(), e.globalAlpha = r.opacity ?? 1;
	for (let d = s; d < c; d++) {
		let s = n[d];
		if (Number.isNaN(s)) continue;
		let c = a(d) + o / 2 - u / 2, f = t.y(s);
		e.fillStyle = s >= 0 ? r.color : i ?? r.color;
		let p = Math.min(f, l), m = Math.max(1, Math.abs(l - f));
		e.fillRect(c, p, u, m);
	}
	e.restore();
}
function he(e, t, n, r, i, a = 2.5) {
	let { xScale: o, bandwidth: s, renderStart: c, renderEnd: l } = t;
	e.save(), e.fillStyle = r.color, e.globalAlpha = r.opacity ?? 1;
	for (let r = c; r < l; r++) {
		if (!i(r) || Number.isNaN(n[r])) continue;
		let c = o(r) + s / 2;
		e.beginPath(), e.arc(c, t.y(n[r]), a, 0, Math.PI * 2), e.fill();
	}
	e.restore();
}
//#endregion
//#region src/indicators/settingsOptions.ts
var ge = [
	{
		label: "SMA",
		value: 0
	},
	{
		label: "EMA",
		value: 1
	},
	{
		label: "WMA",
		value: 2
	},
	{
		label: "DEMA",
		value: 3
	},
	{
		label: "TEMA",
		value: 4
	}
], _e = [
	{
		label: "Solid",
		value: 0
	},
	{
		label: "Dashed",
		value: 1
	},
	{
		label: "Dotted",
		value: 2
	}
];
function ve(e) {
	return e === 1 ? [4, 3] : e === 2 ? [1, 2] : null;
}
//#endregion
//#region src/indicators/lineSettings.ts
function F(e, t, n) {
	return {
		color: n(String(e[`${t}Color`])),
		width: Number(e[`${t}Width`]),
		dash: ve(Number(e[`${t}Style`])),
		opacity: Number(e[`${t}Opacity`])
	};
}
//#endregion
//#region src/indicators/builtins/rollingHigh.ts
function ye(e, t) {
	let n = new Float64Array(e.length);
	for (let r = 0; r < e.length; r++) n[r] = e[r][t] ?? NaN;
	return n;
}
function be(e, t, n, r) {
	let i = n[e][t];
	if (Number.isNaN(i)) return !1;
	let a = r[t];
	if (a && i === a.high) return !1;
	if (e === "highAll") return !0;
	let o = n[e === "high1y" ? "high2y" : e === "high2y" ? "high3y" : "highAll"][t];
	return Number.isNaN(o) ? !1 : Math.abs(i - o) / o > .01;
}
var I = [
	{
		key: "high1y",
		label: "1Y"
	},
	{
		key: "high2y",
		label: "2Y"
	},
	{
		key: "high3y",
		label: "3Y"
	},
	{
		key: "highAll",
		label: "ATH"
	}
], xe = {
	key: "highs",
	label: "Highs",
	longLabel: "Rolling Highs",
	pane: "price",
	settingsSchema: [
		{
			key: "high1y",
			label: "1Y",
			kind: "line",
			default: {
				color: "var(--high-1y)",
				width: 1.1,
				style: 1,
				opacity: .5
			}
		},
		{
			key: "high2y",
			label: "2Y",
			kind: "line",
			default: {
				color: "var(--high-2y)",
				width: 1.1,
				style: 1,
				opacity: .5
			}
		},
		{
			key: "high3y",
			label: "3Y",
			kind: "line",
			default: {
				color: "var(--high-3y)",
				width: 1.1,
				style: 1,
				opacity: .5
			}
		},
		{
			key: "highAll",
			label: "ATH",
			kind: "line",
			default: {
				color: "var(--high-all)",
				width: 1.1,
				style: 0,
				opacity: .5
			}
		}
	],
	warmupBars: () => 0,
	compute: (e) => ({ series: {
		high1y: ye(e.bars, "high1y"),
		high2y: ye(e.bars, "high2y"),
		high3y: ye(e.bars, "high3y"),
		highAll: ye(e.bars, "highAll")
	} }),
	draw: (e, t, n, r, i) => {
		for (let a of I) {
			let o = t[a.key];
			o && pe(e, n, o, F(r, a.key, i), (e) => be(a.key, e, t, n.data));
		}
	},
	autofitKeys: () => [
		"high1y",
		"high2y",
		"high3y",
		"highAll"
	],
	legend: (e, t, n, r) => I.map((i) => ({
		color: String(n[`${i.key}Color`]),
		label: i.label,
		value: N(e[i.key], t, r.priceFmt)
	}))
}, Se = (e) => Math.round(e * 100) / 100;
function Ce(e, t) {
	let n = e.length, r = new Float64Array(n), i = 2 / (t + 1), a = NaN;
	for (let t = 0; t < n; t++) {
		let n = e[t];
		if (Number.isNaN(n)) {
			r[t] = NaN, a = NaN;
			continue;
		}
		a = Number.isNaN(a) ? n : i * n + (1 - i) * a, r[t] = Se(a);
	}
	return r;
}
function we(e, t) {
	let n = e.length, r = new Float64Array(n), i = [], a = 0;
	for (let o = 0; o < n; o++) {
		let n = e[o];
		if (Number.isNaN(n)) {
			r[o] = NaN;
			continue;
		}
		for (; i.length - a > 0 && i[a] <= o - t;) a++;
		for (; i.length - a > 0 && e[i[i.length - 1]] <= n;) i.pop();
		i.push(o), r[o] = Se(e[i[a]]);
	}
	return r;
}
function L(e) {
	let t = e.length, n = new Float64Array(t), r = NaN;
	for (let i = 0; i < t; i++) {
		let t = e[i];
		if (Number.isNaN(t)) {
			n[i] = NaN;
			continue;
		}
		r = Number.isNaN(r) ? t : Math.max(r, t), n[i] = Se(r);
	}
	return n;
}
//#endregion
//#region src/indicators/builtins/rsLine.ts
var Te = (e) => Math.round(e * 100) / 100, Ee = {
	key: "rs",
	label: "RS Line",
	longLabel: "Relative Strength Line",
	pane: { subpane: "rs" },
	settingsSchema: [
		{
			key: "lookback",
			label: "Lookback",
			kind: "number",
			default: 252,
			min: 1
		},
		{
			key: "line",
			label: "RS",
			kind: "line",
			default: {
				color: "var(--rs-line)",
				width: 1.3
			}
		},
		{
			key: "signalColor",
			label: "Signal",
			kind: "color",
			default: "var(--rs-signal)"
		}
	],
	formatParams: (e) => String(e.lookback),
	warmupBars: (e) => e.lookback,
	compute: (e, t) => {
		let n = e.c.length, r = new Float64Array(n), i = new Float64Array(n), a = e.benchmarkClose;
		if (!a) return r.fill(NaN), { series: {
			rs: r,
			signal: i
		} };
		let o = new Float64Array(n), s = NaN;
		for (let t = 0; t < n; t++) {
			let n = a[t], r = Number.isNaN(n) || n === 0 ? NaN : e.c[t] / n;
			o[t] = r, Number.isNaN(s) && !Number.isNaN(r) && (s = r);
		}
		let c = Number.isNaN(s) || s === 0 ? NaN : 100 / s;
		for (let e = 0; e < n; e++) r[e] = Number.isNaN(o[e]) ? NaN : Te(o[e] * c);
		let l = we(r, t.lookback), u = we(e.h, t.lookback);
		for (let t = 0; t < n; t++) {
			let n = !Number.isNaN(r[t]) && r[t] === l[t], a = !Number.isNaN(e.h[t]) && !Number.isNaN(u[t]) && e.h[t] < u[t];
			i[t] = n && a ? 1 : 0;
		}
		return { series: {
			rs: r,
			signal: i
		} };
	},
	draw: (e, t, n, r, i) => {
		let a = t.rs, o = t.signal;
		a && (pe(e, n, a, F(r, "line", i), (e) => !Number.isNaN(a[e])), o && he(e, n, a, {
			color: i(r.signalColor),
			width: 1.3
		}, (e) => o[e] === 1 && !Number.isNaN(a[e])));
	},
	autofitKeys: () => ["rs"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "RS",
		value: N(e.rs, t, M)
	}]
}, De = 12, Oe = .18, R = {
	key: "stage2",
	label: "Stage 2",
	longLabel: "Stage 2 Advancing",
	pane: "price",
	settingsSchema: [
		{
			key: "smaPeriod",
			label: "SMA length",
			kind: "number",
			default: 150,
			min: 1
		},
		{
			key: "slopeLookback",
			label: "Slope lookback",
			kind: "number",
			default: 20,
			min: 1
		},
		{
			key: "slopeMin",
			label: "Slope min",
			kind: "number",
			default: .01,
			min: 0,
			step: .01
		},
		{
			key: "minPeriods",
			label: "Min periods",
			kind: "number",
			default: 100,
			min: 1
		},
		{
			key: "bandColor",
			label: "Band",
			kind: "color",
			default: "var(--stage2-band)"
		}
	],
	formatParams: (e) => `${e.smaPeriod},${e.slopeLookback}`,
	warmupBars: (e) => e.smaPeriod + e.slopeLookback,
	compute: (e, t) => {
		let n = e.c, r = n.length, i = new Float64Array(r);
		for (let e = 0; e < r; e++) {
			let r = Math.max(0, e - t.smaPeriod + 1), a = 0, o = 0;
			for (let t = r; t <= e; t++) {
				let e = n[t];
				Number.isNaN(e) || (a += e, o++);
			}
			i[e] = o >= t.minPeriods ? a / o : NaN;
		}
		let a = new Float64Array(r);
		for (let e = 0; e < r; e++) {
			let r = e - t.slopeLookback >= 0 ? i[e - t.slopeLookback] : NaN, o = i[e];
			a[e] = (Number.isNaN(o) || Number.isNaN(r) || r === 0 ? NaN : (o - r) / r) > t.slopeMin && n[e] > o ? 1 : NaN;
		}
		return { series: { stage2: a } };
	},
	draw: (e, t, n, r, i) => {
		let a = t.stage2;
		if (!a) return;
		let { xScale: o, bandwidth: s, renderStart: c, renderEnd: l } = n, u = Math.max(...n.yPrice.range()) - De;
		e.save(), e.fillStyle = i(r.bandColor), e.globalAlpha = Oe;
		let d = -1, f = (t) => {
			let n = o(d), r = o(t) + s;
			e.fillRect(n, u, r - n, De);
		};
		for (let e = c; e < l; e++) a[e] === 1 ? d === -1 && (d = e) : d !== -1 && (f(e - 1), d = -1);
		d !== -1 && f(l - 1), e.restore();
	},
	autofitKeys: () => [],
	legend: (e, t, n) => [{
		color: n.bandColor,
		label: "Stage 2",
		value: null
	}]
}, ke = 40, Ae = 70, je = 65, Me = "500 10px 'Helvetica Neue', Helvetica, Arial, sans-serif", Ne = 864e5, Pe = 365 * Ne, Fe = 48, Ie = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), Le = (e) => `${e >= 0 ? "+" : ""}${e.toFixed(1)}%`;
function Re(e, t) {
	let n = e.length, r = new Float64Array(n);
	r.fill(NaN);
	let i = e.map((e) => new Date(e.date).getTime());
	for (let a = 0; a < n; a++) {
		let o = e[a][t];
		if (o == null || !Number.isFinite(o)) continue;
		let s = i[a] - Pe, c = -1, l = Infinity;
		for (let e = 0; e < n; e++) {
			let t = Math.abs(i[e] - s) / Ne;
			t <= ke && t < l && (l = t, c = e);
		}
		if (c < 0) continue;
		let u = e[c][t];
		u == null || !Number.isFinite(u) || u === 0 || (r[a] = (o - u) / Math.abs(u) * 100);
	}
	return r;
}
function ze(e, t) {
	let n = Array(e.length).fill(!1), r = Infinity;
	for (let i = e.length - 1; i >= 0; i--) (r === Infinity || Math.abs(r - e[i]) >= t) && (n[i] = !0, r = e[i]);
	return n;
}
function z(e) {
	let t = [...e.quarterlyResults ?? []].sort((e, t) => e.date < t.date ? -1 : +(e.date > t.date)), n = Re(t, "eps"), r = Re(t, "rps"), i = e.market === "US" ? "$" : "₹", a = t.map((e, t) => {
		let a = e.eps == null ? NaN : e.eps, o = e.rps == null ? NaN : e.rps, s = n[t], c = r[t];
		return {
			label: e.label,
			eps: a,
			rps: o,
			epsText: Number.isFinite(a) ? i + Ie(a) : "--",
			rpsText: Number.isFinite(o) ? i + Ie(o) : "--",
			epsGrowthText: Number.isNaN(s) ? "" : Le(s),
			rpsGrowthText: Number.isNaN(c) ? "" : Le(c),
			epsGrowthUp: s >= 0,
			rpsGrowthUp: c >= 0
		};
	}), o = e.c.length, s = new Float64Array(o).fill(NaN), c = new Float64Array(o).fill(NaN), l = new Float64Array(o).fill(NaN), u = new Float64Array(o).fill(NaN), d = new Float64Array(o).fill(NaN);
	for (let n = 0; n < t.length; n++) {
		let r = A(e.bars, t[n].date);
		r != null && (d[r] = n);
	}
	let f = [];
	for (let e = 0; e < o; e++) Number.isNaN(d[e]) || f.push(e);
	for (let e = 0; e < f.length; e++) {
		let t = f[e], i = e + 1 < f.length ? f[e + 1] : o, p = d[t], m = a[p];
		for (let e = t; e < i; e++) s[e] = m.eps, c[e] = m.rps, l[e] = n[p], u[e] = r[p];
	}
	return {
		series: {
			eps: s,
			rps: c,
			epsGrowth: l,
			rpsGrowth: u,
			anchor: d
		},
		meta: a
	};
}
function Be(e, t, n, r) {
	let i = e.textAlign;
	e.textAlign = "left";
	let a = r.map((t) => e.measureText(t.text).width), o = t - (a.reduce((e, t) => e + t, 0) + 4 * Math.max(0, r.length - 1)) / 2;
	for (let t = 0; t < r.length; t++) e.fillStyle = r[t].color, e.fillText(r[t].text, o, n), o += a[t] + 4;
	e.textAlign = i;
}
var Ve = (e, t, n, r, i, a) => {
	let o = a;
	if (!o) return;
	let s = r.display === 1 ? "bars" : "text", { xScale: c, bandwidth: l, renderStart: u, renderEnd: d } = n, f = n.paneTop ?? 0, p = (n.paneBottom ?? 0) - f;
	if (p <= 0) return;
	let m = i(r.epsColor), h = i(r.rpsColor), g = i(r.growthUpColor), _ = i(r.growthDownColor), v = i(r.labelColor);
	e.save(), e.beginPath(), e.rect(-1e6, f, 2e6, p), e.clip(), e.font = Me;
	let y = [];
	for (let e = u; e < d; e++) {
		let n = t.anchor[e];
		if (Number.isNaN(n)) continue;
		let r = o[n];
		r && y.push({
			g: e,
			x: (c(e) ?? 0) + l / 2,
			row: r
		});
	}
	if (s === "text") {
		let t = ze(y.map((e) => e.x), Ae);
		if (e.textAlign = "center", e.textBaseline = "alphabetic", p >= je) {
			let n = p / 5.5, r = f + n * .9, i = f + n * 1.9, a = f + n * 2.7, o = f + n * 3.9, s = f + n * 4.7;
			for (let n = 0; n < y.length; n++) {
				if (!t[n]) continue;
				let { x: c, row: l } = y[n];
				e.fillStyle = v, e.fillText(l.label, c, r), e.fillStyle = Number.isFinite(l.eps) ? m : v, e.fillText(l.epsText, c, i), l.epsGrowthText && (e.fillStyle = l.epsGrowthUp ? g : _, e.fillText(l.epsGrowthText, c, a)), e.fillStyle = Number.isFinite(l.rps) ? h : v, e.fillText(l.rpsText, c, o), l.rpsGrowthText && (e.fillStyle = l.rpsGrowthUp ? g : _, e.fillText(l.rpsGrowthText, c, s));
			}
		} else {
			let n = p / 3.2, r = f + n * .9, i = f + n * 1.9, a = f + n * 2.9;
			for (let n = 0; n < y.length; n++) {
				if (!t[n]) continue;
				let { x: o, row: s } = y[n];
				e.fillStyle = v, e.fillText(s.label, o, r), Be(e, o, i, [
					{
						text: "EPS",
						color: v
					},
					{
						text: s.epsText,
						color: Number.isFinite(s.eps) ? m : v
					},
					...s.epsGrowthText ? [{
						text: s.epsGrowthText,
						color: s.epsGrowthUp ? g : _
					}] : []
				]), Be(e, o, a, [
					{
						text: "RPS",
						color: v
					},
					{
						text: s.rpsText,
						color: Number.isFinite(s.rps) ? h : v
					},
					...s.rpsGrowthText ? [{
						text: s.rpsGrowthText,
						color: s.rpsGrowthUp ? g : _
					}] : []
				]);
			}
		}
		e.restore();
		return;
	}
	let b = n.y(0), x = [];
	for (let e = 0; e < t.anchor.length; e++) Number.isNaN(t.anchor[e]) || x.push(e);
	let S = 63;
	if (x.length >= 2) {
		let e = [];
		for (let t = 1; t < x.length; t++) e.push(x[t] - x[t - 1]);
		e.sort((e, t) => e - t), S = e[Math.floor(e.length / 2)];
	}
	let C = S * c.step(), w = Math.min(Fe, C * .3), T = Math.min(4, w * .12), E = Math.max(1, (w - T) / 2), D = (t, r, i) => {
		if (!Number.isFinite(r)) return;
		let a = n.y(r), o = Math.min(b, a), s = Math.max(1, Math.abs(b - a));
		e.fillStyle = i, e.fillRect(t, o, E, s);
	}, O = ze(y.map((e) => e.x), Ae);
	e.textAlign = "center";
	for (let t = 0; t < y.length; t++) {
		let { x: r, row: i } = y[t], a = r - T / 2 - E, o = r + T / 2;
		if (D(a, i.rps, h), D(o, i.eps, m), !O[t]) continue;
		let s = (t, r, i, a) => {
			if (!i || !Number.isFinite(r)) return;
			let o = Math.min(b, n.y(r));
			e.fillStyle = a ? g : _, e.textBaseline = "bottom", e.fillText(i, t + E / 2, o - 2);
		};
		s(a, i.rps, i.rpsGrowthText, i.rpsGrowthUp), s(o, i.eps, i.epsGrowthText, i.epsGrowthUp);
	}
	e.restore();
}, He = {
	fixedDomain: [0, 1],
	hideAxis: !0
}, Ue = {
	includeZero: !0,
	guideLines: [0],
	autofitPadding: 0,
	topPadPx: 17
}, We = {
	key: "results",
	label: "Results",
	longLabel: "Quarterly Results",
	pane: { subpane: "results" },
	paneHeightFactor: 1.7,
	settingsSchema: [
		{
			key: "display",
			label: "Display",
			kind: "enum",
			default: 0,
			options: [{
				label: "Text",
				value: 0
			}, {
				label: "Bars",
				value: 1
			}]
		},
		{
			key: "epsColor",
			label: "EPS",
			kind: "color",
			default: "var(--qr-eps)"
		},
		{
			key: "rpsColor",
			label: "RPS",
			kind: "color",
			default: "var(--qr-rps)"
		},
		{
			key: "growthUpColor",
			label: "Growth +",
			kind: "color",
			default: "var(--qr-growth-up)"
		},
		{
			key: "growthDownColor",
			label: "Growth −",
			kind: "color",
			default: "var(--qr-growth-down)"
		},
		{
			key: "labelColor",
			label: "Quarter",
			kind: "color",
			default: "var(--qr-label)"
		}
	],
	formatParams: (e) => e.display === 1 ? "Bars" : "Text",
	warmupBars: () => 0,
	compute: (e) => z(e),
	draw: Ve,
	autofitKeys: (e) => e.display === 1 ? ["eps", "rps"] : [],
	domain: (e, t) => t.display === 1 ? Ue : He,
	legend: (e, t, n) => [{
		color: n.rpsColor,
		label: "RPS",
		value: N(e.rps, t, M)
	}, {
		color: n.epsColor,
		label: "EPS",
		value: N(e.eps, t, M)
	}]
}, Ge = .5, Ke = 2, qe = 9, Je = "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";
function B(e, t) {
	let n = e.c.length, r = e.displayStart ?? 0, i = e.bars.slice(r), a = le(i, t.smaPeriod), o = new Float64Array(n).fill(NaN), s = new Float64Array(n).fill(NaN), c = new Float64Array(n).fill(NaN), l = new Float64Array(n).fill(NaN);
	for (let e = 0; e < i.length; e++) {
		let n = r + e, l = i[e];
		if (l.volume > 0 && (l.close >= l.open ? o[n] = l.volume : s[n] = l.volume), t.smaFade) {
			let t = a.sma[e];
			t !== void 0 && (c[n] = t);
		}
	}
	if (t.milestones) for (let e of a.labels) l[r + e.index] = e.text === "HVE" ? 1 : 2;
	return {
		volumeUp: o,
		volumeDown: s,
		volSma: c,
		volLabel: l
	};
}
var V = {
	key: "volume",
	label: "Volume",
	longLabel: "Volume",
	pane: { subpane: "volume" },
	paneHeightFactor: 1.154,
	settingsSchema: [
		{
			key: "smaPeriod",
			label: "Avg Length",
			kind: "number",
			default: 30,
			min: 1
		},
		{
			key: "smaFade",
			label: "Fade Below Avg",
			kind: "enum",
			default: 1,
			options: [{
				label: "On",
				value: 1
			}, {
				label: "Off",
				value: 0
			}]
		},
		{
			key: "milestones",
			label: "HVE/HVY",
			kind: "enum",
			default: 1,
			options: [{
				label: "On",
				value: 1
			}, {
				label: "Off",
				value: 0
			}]
		},
		{
			key: "standardOpacity",
			label: "Normal Bar Opacity",
			kind: "number",
			default: Ge,
			min: 0,
			max: 1,
			step: .01
		},
		{
			key: "fadeOpacity",
			label: "Faded Bar Opacity",
			kind: "number",
			default: .2,
			min: 0,
			max: 1,
			step: .01
		},
		{
			key: "upColor",
			label: "Up",
			kind: "color",
			default: "var(--chart-positive)"
		},
		{
			key: "downColor",
			label: "Down",
			kind: "color",
			default: "var(--chart-negative)"
		},
		{
			key: "labelColor",
			label: "HVE/HVY",
			kind: "color",
			default: "var(--chart-axis-label)"
		}
	],
	formatParams: (e) => e.smaFade ? `${e.smaPeriod}` : `${e.smaPeriod} · plain`,
	warmupBars: () => 0,
	compute: (e, t) => ({ series: B(e, t) }),
	draw: (e, t, n, r, i) => {
		let { xScale: a, bandwidth: o, renderStart: s, renderEnd: c, data: l } = n, u = n.paneTop ?? 0, d = n.paneBottom ?? 0;
		if (d <= u) return;
		let f = i(r.upColor), p = i(r.downColor), m = i(r.labelColor), h = t.volSma, g = t.volLabel;
		e.save(), e.beginPath(), e.rect(-1e6, u, 2e6, d - u), e.clip();
		let _ = n.y(0);
		for (let t = s; t < c; t++) {
			let i = l[t];
			if (!i || i.volume <= 0) continue;
			let s = a(t), c = n.y(i.volume), u = _ - c, d = i.close >= i.open, m = h?.[t], g = m !== void 0 && Number.isFinite(m) && i.volume < m;
			e.fillStyle = d ? f : p, e.globalAlpha = g ? r.fadeOpacity : r.standardOpacity, e.fillRect(s, c, o, u);
		}
		if (e.globalAlpha = 1, g) {
			e.fillStyle = m, e.font = Je, e.textAlign = "center", e.textBaseline = "alphabetic";
			for (let t = s; t < c; t++) {
				let r = g[t];
				if (Number.isNaN(r)) continue;
				let i = l[t];
				if (!i) continue;
				let s = Math.max(n.y(i.volume) - Ke, u + qe);
				e.fillText(r === 1 ? "HVE" : "HVY", a(t) + o / 2, s);
			}
		}
		e.restore();
	},
	autofitKeys: () => ["volumeUp", "volumeDown"],
	domain: () => ({
		includeZero: !0,
		autofitPadding: 0,
		topPadPx: 15,
		tickFormat: se
	}),
	legend: (e, t, n) => [{
		color: n.upColor,
		label: "Vol",
		value: N(e.volumeUp, t, oe)
	}, {
		color: n.downColor,
		label: "Vol",
		value: N(e.volumeDown, t, oe)
	}]
}, H = (e) => Number.isNaN(e) ? NaN : Math.round(e * 100) / 100;
function Ye(e) {
	for (let t = 0; t < e.length; t++) if (!Number.isNaN(e[t])) return t;
	return e.length;
}
function U(e) {
	let t = new Float64Array(e);
	return t.fill(NaN), t;
}
function W(e, t) {
	let n = e.length, r = U(n), i = Ye(e);
	if (t < 1 || i + t > n) return r;
	let a = 0;
	for (let o = i; o < n; o++) a += e[o], o >= i + t && (a -= e[o - t]), o >= i + t - 1 && (r[o] = a / t);
	return r;
}
function Xe(e, t) {
	let n = e.length, r = U(n), i = Ye(e), a = i + t - 1;
	if (t < 1 || a >= n) return r;
	let o = t * (t + 1) / 2, s = 0, c = 0;
	for (let n = 0; n < t; n++) {
		let t = e[i + n];
		s += (n + 1) * t, c += t;
	}
	r[a] = s / o;
	for (let i = a + 1; i < n; i++) s = s + t * e[i] - c, c = c - e[i - t] + e[i], r[i] = s / o;
	return r;
}
function G(e, t) {
	return Ze(e, t, Ye(e) + t - 1);
}
function Ze(e, t, n) {
	let r = e.length, i = U(r);
	if (t < 1 || n < t - 1 || n >= r) return i;
	let a = 0;
	for (let r = n - t + 1; r <= n; r++) a += e[r];
	let o = a / t;
	i[n] = o;
	let s = 2 / (t + 1);
	for (let t = n + 1; t < r; t++) o = s * e[t] + (1 - s) * o, i[t] = o;
	return i;
}
function Qe(e, t) {
	let n = e.length, r = G(e, t), i = G(r, t), a = U(n);
	for (let e = 0; e < n; e++) !Number.isNaN(r[e]) && !Number.isNaN(i[e]) && (a[e] = 2 * r[e] - i[e]);
	return a;
}
function $e(e, t) {
	let n = e.length, r = G(e, t), i = G(r, t), a = G(i, t), o = U(n);
	for (let e = 0; e < n; e++) Number.isNaN(a[e]) || (o[e] = 3 * r[e] - 3 * i[e] + a[e]);
	return o;
}
function K(e, t, n) {
	switch (e) {
		case 1: return G(t, n);
		case 2: return Xe(t, n);
		case 3: return Qe(t, n);
		case 4: return $e(t, n);
		default: return W(t, n);
	}
}
function et(e, t) {
	switch (e) {
		case 3: return 2 * (t - 1);
		case 4: return 3 * (t - 1);
		default: return t - 1;
	}
}
function tt(e, t, n) {
	let r = e.length, i = U(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t <= a; t++) o += e[t];
	let s = o / t;
	i[a] = s;
	for (let n = a + 1; n < r; n++) s = (s * (t - 1) + e[n]) / t, i[n] = s;
	return i;
}
function nt(e, t, n) {
	let r = e.length, i = U(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t < a; t++) o += e[t];
	o = o - o / t + e[a], i[a] = o;
	for (let n = a + 1; n < r; n++) o = o - o / t + e[n], i[n] = o;
	return i;
}
function rt(e, t) {
	let n = e.length, r = U(n), i = Ye(e);
	if (t < 1 || i + t > n) return r;
	let a = [], o = 0;
	for (let s = i; s < n; s++) {
		let n = e[s];
		for (; a.length - o > 0 && a[o] <= s - t;) o++;
		for (; a.length - o > 0 && e[a[a.length - 1]] <= n;) a.pop();
		a.push(s), s >= i + t - 1 && (r[s] = e[a[o]]);
	}
	return r;
}
function it(e, t) {
	let n = e.length, r = U(n), i = Ye(e);
	if (t < 1 || i + t > n) return r;
	let a = [], o = 0;
	for (let s = i; s < n; s++) {
		let n = e[s];
		for (; a.length - o > 0 && a[o] <= s - t;) o++;
		for (; a.length - o > 0 && e[a[a.length - 1]] >= n;) a.pop();
		a.push(s), s >= i + t - 1 && (r[s] = e[a[o]]);
	}
	return r;
}
function at(e, t, n) {
	let r = e.length, i = U(r);
	for (let a = 1; a < r; a++) {
		let r = e[a] - t[a], o = Math.abs(e[a] - n[a - 1]), s = Math.abs(t[a] - n[a - 1]);
		i[a] = Math.max(r, o, s);
	}
	return i;
}
function ot(e, t) {
	let n = e.length, r = U(n);
	if (t < 1 || t >= n) return r;
	let i = new Float64Array(n), a = new Float64Array(n);
	for (let t = 1; t < n; t++) {
		let n = e[t] - e[t - 1];
		i[t] = n > 0 ? n : 0, a[t] = n < 0 ? -n : 0;
	}
	let o = 0, s = 0;
	for (let e = 1; e <= t; e++) o += i[e], s += a[e];
	o /= t, s /= t, r[t] = s === 0 ? 100 : 100 - 100 / (1 + o / s);
	for (let e = t + 1; e < n; e++) o = (o * (t - 1) + i[e]) / t, s = (s * (t - 1) + a[e]) / t, r[e] = s === 0 ? 100 : 100 - 100 / (1 + o / s);
	return r;
}
function st(e, t, n, r) {
	let i = e.length, a = U(i);
	if (r < 1 || r >= i) return a;
	let o = at(e, t, n), s = U(i), c = U(i);
	for (let n = 1; n < i; n++) {
		let r = e[n] - e[n - 1], i = t[n - 1] - t[n];
		s[n] = r > i && r > 0 ? r : 0, c[n] = i > r && i > 0 ? i : 0;
	}
	let l = nt(o, r, 1), u = nt(s, r, 1), d = nt(c, r, 1);
	for (let e = r; e < i; e++) {
		if (Number.isNaN(l[e]) || l[e] === 0) {
			a[e] = 0;
			continue;
		}
		let t = 100 * u[e] / l[e], n = 100 * d[e] / l[e], r = t + n;
		a[e] = r === 0 ? 0 : 100 * Math.abs(t - n) / r;
	}
	return a;
}
function ct(e, t, n, r) {
	return tt(at(e, t, n), r, 1);
}
function lt(e, t, n, r) {
	return tt(st(e, t, n, r), r, r);
}
function ut(e, t, n, r) {
	let i = e.length, a = rt(e, r), o = it(t, r), s = U(i);
	for (let e = 0; e < i; e++) {
		if (Number.isNaN(a[e]) || Number.isNaN(o[e]) || Number.isNaN(n[e])) continue;
		let t = a[e] - o[e];
		s[e] = t === 0 ? 0 : 100 * (n[e] - o[e]) / t;
	}
	return s;
}
function dt(e, t) {
	let n = e.length, r = U(n), i = Ye(e);
	if (t < 1 || i + t > n) return r;
	let a = 0, o = 0;
	for (let s = i; s < n; s++) {
		if (a += e[s], o += e[s] * e[s], s >= i + t) {
			let n = e[s - t];
			a -= n, o -= n * n;
		}
		if (s >= i + t - 1) {
			let e = a / t, n = o / t - e * e;
			r[s] = Math.sqrt(Math.max(0, n));
		}
	}
	return r;
}
//#endregion
//#region src/indicators/builtins/sma.ts
var ft = {
	key: "ti:sma",
	label: "SMA",
	longLabel: "Simple Moving Average",
	pane: "price",
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 20,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--ti-sma)",
			width: 1.2
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period - 1 + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = W(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { sma: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "sma",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["sma"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "SMA",
		value: N(e.sma, t, r.priceFmt)
	}]
};
//#endregion
//#region src/indicators/builtins/emaTalib.ts
function pt(e) {
	return e < 15 ? {
		line: "var(--ema-10)",
		label: "var(--chart-ema-10-label)"
	} : e < 30 ? {
		line: "var(--ema-20)",
		label: "var(--chart-ema-20-label)"
	} : e < 75 ? {
		line: "var(--ema-50)",
		label: "var(--chart-ema-50-label)"
	} : {
		line: "var(--ema-200)",
		label: "var(--chart-ema-200-label)"
	};
}
var mt = {
	key: "ti:ema",
	label: "EMA",
	longLabel: "Exponential Moving Average",
	pane: "price",
	settingsSchema: [
		{
			key: "period",
			label: "Length",
			kind: "number",
			default: 20,
			min: 1
		},
		{
			key: "line",
			label: "Line",
			kind: "line",
			default: {
				color: "var(--ti-ema)",
				width: 1.2
			}
		},
		{
			key: "labelColor",
			label: "Label",
			kind: "color",
			default: "var(--ti-ema)"
		}
	],
	deriveDefaults: (e) => {
		let t = pt(e.period);
		return {
			lineColor: t.line,
			labelColor: t.label
		};
	},
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period - 1 + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = G(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { ema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "ema",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["ema"],
	legend: (e, t, n, r) => [{
		color: n.labelColor,
		label: "EMA",
		value: N(e.ema, t, r.priceFmt)
	}]
}, ht = {
	key: "ti:wma",
	label: "WMA",
	longLabel: "Weighted Moving Average",
	pane: "price",
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 20,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--ti-wma)",
			width: 1.2
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period - 1 + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = Xe(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { wma: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "wma",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["wma"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "WMA",
		value: N(e.wma, t, r.priceFmt)
	}]
}, gt = {
	key: "ti:dema",
	label: "DEMA",
	longLabel: "Double Exponential Moving Average",
	pane: "price",
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 20,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--ti-dema)",
			width: 1.2
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => 2 * (e.period - 1) + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = Qe(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { dema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "dema",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["dema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "DEMA",
		value: N(e.dema, t, r.priceFmt)
	}]
}, _t = {
	key: "ti:tema",
	label: "TEMA",
	longLabel: "Triple Exponential Moving Average",
	pane: "price",
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 20,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--ti-tema)",
			width: 1.2
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => 3 * (e.period - 1) + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = $e(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { tema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "tema",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["tema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "TEMA",
		value: N(e.tema, t, r.priceFmt)
	}]
}, vt = {
	key: "ti:bbands",
	label: "BBANDS",
	longLabel: "Bollinger Bands",
	pane: "price",
	settingsSchema: [
		{
			key: "period",
			label: "Length",
			kind: "number",
			default: 20,
			min: 1
		},
		{
			key: "nbdevup",
			label: "Upper band",
			kind: "number",
			default: 2,
			min: 0,
			step: .1
		},
		{
			key: "nbdevdn",
			label: "Lower band",
			kind: "number",
			default: 2,
			min: 0,
			step: .1
		},
		{
			key: "matype",
			label: "Moving average type",
			kind: "enum",
			default: 0,
			options: ge
		},
		{
			key: "upper",
			label: "Upper",
			kind: "line",
			default: {
				color: "var(--bb-upper)",
				width: 1,
				style: 1,
				opacity: .8
			}
		},
		{
			key: "mid",
			label: "Mid",
			kind: "line",
			default: {
				color: "var(--bb-mid)",
				width: 1.2
			}
		},
		{
			key: "lower",
			label: "Lower",
			kind: "line",
			default: {
				color: "var(--bb-lower)",
				width: 1,
				style: 1,
				opacity: .8
			}
		}
	],
	formatParams: (e) => `${e.period},${e.nbdevup}`,
	warmupBars: (e) => Math.max(et(e.matype, e.period), e.period - 1) + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = e.c.length, r = K(t.matype, e.c, t.period), i = dt(e.c, t.period), a = new Float64Array(n), o = new Float64Array(n), s = new Float64Array(n);
		for (let e = 0; e < n; e++) {
			if (Number.isNaN(r[e]) || Number.isNaN(i[e])) {
				a[e] = NaN, o[e] = NaN, s[e] = NaN;
				continue;
			}
			o[e] = H(r[e]), a[e] = H(r[e] + t.nbdevup * i[e]), s[e] = H(r[e] - t.nbdevdn * i[e]);
		}
		return { series: {
			upperband: a,
			middleband: o,
			lowerband: s
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [
		{
			key: "upperband",
			st: F(r, "upper", i)
		},
		{
			key: "middleband",
			st: F(r, "mid", i)
		},
		{
			key: "lowerband",
			st: F(r, "lower", i)
		}
	]),
	autofitKeys: () => [
		"upperband",
		"middleband",
		"lowerband"
	],
	legend: (e, t, n, r) => [
		{
			color: n.upperColor,
			label: "Upper",
			value: N(e.upperband, t, r.priceFmt)
		},
		{
			color: n.midColor,
			label: "Mid",
			value: N(e.middleband, t, r.priceFmt)
		},
		{
			color: n.lowerColor,
			label: "Lower",
			value: N(e.lowerband, t, r.priceFmt)
		}
	]
}, yt = {
	key: "ti:rsi",
	label: "RSI",
	longLabel: "Relative Strength Index",
	pane: { subpane: "rsi" },
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 14,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--rsi-line)",
			width: 1.3
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = ot(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { rsi: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "rsi",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["rsi"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [30, 70]
	}),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "RSI",
		value: N(e.rsi, t, M)
	}]
}, bt = {
	key: "ti:macd",
	label: "MACD",
	longLabel: "Moving Average Convergence Divergence",
	pane: { subpane: "macd" },
	settingsSchema: [
		{
			key: "fast",
			label: "Fast",
			kind: "number",
			default: 12,
			min: 1
		},
		{
			key: "slow",
			label: "Slow",
			kind: "number",
			default: 26,
			min: 1
		},
		{
			key: "signal",
			label: "Signal",
			kind: "number",
			default: 9,
			min: 1
		},
		{
			key: "macd",
			label: "MACD",
			kind: "line",
			default: {
				color: "var(--macd-line)",
				width: 1.3
			}
		},
		{
			key: "macdsignal",
			label: "Signal",
			kind: "line",
			default: {
				color: "var(--macd-signal)",
				width: 1.1
			}
		},
		{
			key: "histUpColor",
			label: "Hist +",
			kind: "color",
			default: "var(--macd-hist-up)"
		},
		{
			key: "histDownColor",
			label: "Hist −",
			kind: "color",
			default: "var(--macd-hist-down)"
		}
	],
	formatParams: (e) => `${e.fast},${e.slow},${e.signal}`,
	warmupBars: (e) => e.slow - 1 + (e.signal - 1) + Math.max(250, 5 * e.slow),
	compute: (e, t) => {
		let n = e.c.length, r = Ze(e.c, t.fast, t.slow - 1), i = G(e.c, t.slow), a = new Float64Array(n);
		a.fill(NaN);
		for (let e = 0; e < n; e++) !Number.isNaN(r[e]) && !Number.isNaN(i[e]) && (a[e] = r[e] - i[e]);
		let o = G(a, t.signal), s = new Float64Array(n), c = new Float64Array(n), l = new Float64Array(n);
		for (let e = 0; e < n; e++) {
			if (Number.isNaN(o[e])) {
				s[e] = NaN, c[e] = NaN, l[e] = NaN;
				continue;
			}
			s[e] = H(a[e]), c[e] = H(o[e]), l[e] = H(a[e] - o[e]);
		}
		return { series: {
			macd: s,
			macdsignal: c,
			macdhist: l
		} };
	},
	draw: (e, t, n, r, i) => {
		t.macdhist && me(e, n, t.macdhist, {
			color: i(r.histUpColor),
			width: 1
		}, i(r.histDownColor)), P(e, t, n, [{
			key: "macd",
			st: F(r, "macd", i)
		}, {
			key: "macdsignal",
			st: F(r, "macdsignal", i)
		}]);
	},
	autofitKeys: () => [
		"macd",
		"macdsignal",
		"macdhist"
	],
	domain: () => ({ zeroLine: !0 }),
	legend: (e, t, n) => [
		{
			color: n.macdColor,
			label: "MACD",
			value: N(e.macd, t, M)
		},
		{
			color: n.macdsignalColor,
			label: "Signal",
			value: N(e.macdsignal, t, M)
		},
		{
			color: n.histUpColor,
			label: "Hist",
			value: N(e.macdhist, t, M)
		}
	]
}, xt = {
	key: "ti:stoch",
	label: "STOCH",
	longLabel: "Stochastic",
	pane: { subpane: "stoch" },
	settingsSchema: [
		{
			key: "fastk",
			label: "%K length",
			kind: "number",
			default: 5,
			min: 1
		},
		{
			key: "slowk",
			label: "%K smoothing",
			kind: "number",
			default: 3,
			min: 1
		},
		{
			key: "slowk_matype",
			label: "%K moving average",
			kind: "enum",
			default: 0,
			options: ge
		},
		{
			key: "slowd",
			label: "%D smoothing",
			kind: "number",
			default: 3,
			min: 1
		},
		{
			key: "slowd_matype",
			label: "%D moving average",
			kind: "enum",
			default: 0,
			options: ge
		},
		{
			key: "k",
			label: "%K",
			kind: "line",
			default: {
				color: "var(--stoch-k)",
				width: 1.3
			}
		},
		{
			key: "d",
			label: "%D",
			kind: "line",
			default: {
				color: "var(--stoch-d)",
				width: 1.1,
				style: 1
			}
		}
	],
	formatParams: (e) => `${e.fastk},${e.slowk},${e.slowd}`,
	warmupBars: (e) => e.fastk - 1 + (e.slowk - 1) + (e.slowd - 1) + Math.max(250, 5 * e.fastk),
	compute: (e, t) => {
		let n = ut(e.h, e.l, e.c, t.fastk), r = K(t.slowk_matype, n, t.slowk), i = K(t.slowd_matype, r, t.slowd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = H(r[e]), i[e] = H(i[e]);
		return { series: {
			slowk: r,
			slowd: i
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "slowk",
		st: F(r, "k", i)
	}, {
		key: "slowd",
		st: F(r, "d", i)
	}]),
	autofitKeys: () => ["slowk", "slowd"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [20, 80]
	}),
	legend: (e, t, n) => [{
		color: n.kColor,
		label: "%K",
		value: N(e.slowk, t, M)
	}, {
		color: n.dColor,
		label: "%D",
		value: N(e.slowd, t, M)
	}]
}, St = {
	key: "ti:stochf",
	label: "STOCHF",
	longLabel: "Stochastic Fast",
	pane: { subpane: "stochf" },
	settingsSchema: [
		{
			key: "fastk",
			label: "%K length",
			kind: "number",
			default: 5,
			min: 1
		},
		{
			key: "fastd",
			label: "%D smoothing",
			kind: "number",
			default: 3,
			min: 1
		},
		{
			key: "fastd_matype",
			label: "%D moving average",
			kind: "enum",
			default: 0,
			options: ge
		},
		{
			key: "k",
			label: "%K",
			kind: "line",
			default: {
				color: "var(--stoch-k)",
				width: 1.3
			}
		},
		{
			key: "d",
			label: "%D",
			kind: "line",
			default: {
				color: "var(--stoch-d)",
				width: 1.1,
				style: 1
			}
		}
	],
	formatParams: (e) => `${e.fastk},${e.fastd}`,
	warmupBars: (e) => e.fastk - 1 + (e.fastd - 1) + Math.max(250, 5 * e.fastk),
	compute: (e, t) => {
		let n = ut(e.h, e.l, e.c, t.fastk), r = K(t.fastd_matype, n, t.fastd);
		for (let e = 0; e < n.length; e++) Number.isNaN(r[e]) && (n[e] = NaN), n[e] = H(n[e]), r[e] = H(r[e]);
		return { series: {
			fastk: n,
			fastd: r
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "fastk",
		st: F(r, "k", i)
	}, {
		key: "fastd",
		st: F(r, "d", i)
	}]),
	autofitKeys: () => ["fastk", "fastd"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [20, 80]
	}),
	legend: (e, t, n) => [{
		color: n.kColor,
		label: "%K",
		value: N(e.fastk, t, M)
	}, {
		color: n.dColor,
		label: "%D",
		value: N(e.fastd, t, M)
	}]
}, Ct = {
	key: "ti:stochrsi",
	label: "STOCHRSI",
	longLabel: "Stochastic RSI",
	pane: { subpane: "stochrsi" },
	settingsSchema: [
		{
			key: "timeperiod",
			label: "RSI length",
			kind: "number",
			default: 14,
			min: 1
		},
		{
			key: "fastk",
			label: "%K length",
			kind: "number",
			default: 5,
			min: 1
		},
		{
			key: "fastd",
			label: "%D smoothing",
			kind: "number",
			default: 3,
			min: 1
		},
		{
			key: "fastd_matype",
			label: "%D moving average",
			kind: "enum",
			default: 0,
			options: ge
		},
		{
			key: "k",
			label: "%K",
			kind: "line",
			default: {
				color: "var(--stoch-k)",
				width: 1.3
			}
		},
		{
			key: "d",
			label: "%D",
			kind: "line",
			default: {
				color: "var(--stoch-d)",
				width: 1.1,
				style: 1
			}
		}
	],
	formatParams: (e) => `${e.timeperiod},${e.fastk},${e.fastd}`,
	warmupBars: (e) => e.timeperiod + (e.fastk - 1) + (e.fastd - 1) + Math.max(250, 5 * e.timeperiod),
	compute: (e, t) => {
		let n = ot(e.c, t.timeperiod), r = ut(n, n, n, t.fastk), i = K(t.fastd_matype, r, t.fastd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = H(r[e]), i[e] = H(i[e]);
		return { series: {
			fastk: r,
			fastd: i
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "fastk",
		st: F(r, "k", i)
	}, {
		key: "fastd",
		st: F(r, "d", i)
	}]),
	autofitKeys: () => ["fastk", "fastd"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [20, 80]
	}),
	legend: (e, t, n) => [{
		color: n.kColor,
		label: "%K",
		value: N(e.fastk, t, M)
	}, {
		color: n.dColor,
		label: "%D",
		value: N(e.fastd, t, M)
	}]
}, wt = {
	key: "ti:willr",
	label: "WILLR",
	longLabel: "Williams %R",
	pane: { subpane: "willr" },
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 14,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--willr-line)",
			width: 1.3
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period - 1 + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = e.c.length, r = rt(e.h, t.period), i = it(e.l, t.period), a = new Float64Array(n);
		a.fill(NaN);
		for (let t = 0; t < n; t++) {
			if (Number.isNaN(r[t]) || Number.isNaN(i[t])) continue;
			let n = r[t] - i[t];
			a[t] = H(n === 0 ? 0 : -100 * (r[t] - e.c[t]) / n);
		}
		return { series: { willr: a } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "willr",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["willr"],
	domain: () => ({
		fixedDomain: [-100, 0],
		guideLines: [-20, -80]
	}),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "WILLR",
		value: N(e.willr, t, M)
	}]
}, Tt = {
	key: "ti:adx",
	label: "ADX",
	longLabel: "Average Directional Index",
	pane: { subpane: "adx" },
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 14,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--adx-line)",
			width: 1.3
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => 2 * e.period - 1 + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = lt(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { adx: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "adx",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["adx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ADX",
		value: N(e.adx, t, M)
	}]
}, Et = {
	key: "ti:dx",
	label: "DX",
	longLabel: "Directional Movement Index",
	pane: { subpane: "dx" },
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 14,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--dx-line)",
			width: 1.3
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = st(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { dx: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "dx",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["dx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "DX",
		value: N(e.dx, t, M)
	}]
}, Dt = {
	key: "ti:atr",
	label: "ATR",
	longLabel: "Average True Range",
	pane: { subpane: "atr" },
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 14,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--atr-line)",
			width: 1.3
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = ct(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { atr: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "atr",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["atr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ATR",
		value: N(e.atr, t, M)
	}]
}, Ot = {
	key: "ti:natr",
	label: "NATR",
	longLabel: "Normalized Average True Range",
	pane: { subpane: "natr" },
	settingsSchema: [{
		key: "period",
		label: "Length",
		kind: "number",
		default: 14,
		min: 1
	}, {
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--natr-line)",
			width: 1.3
		}
	}],
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = e.c.length, r = ct(e.h, e.l, e.c, t.period), i = new Float64Array(n);
		i.fill(NaN);
		for (let t = 0; t < n; t++) Number.isNaN(r[t]) || e.c[t] === 0 || (i[t] = H(100 * r[t] / e.c[t]));
		return { series: { natr: i } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "natr",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["natr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "NATR",
		value: N(e.natr, t, M)
	}]
}, kt = {
	key: "ti:trange",
	label: "TRANGE",
	longLabel: "True Range",
	pane: { subpane: "trange" },
	settingsSchema: [{
		key: "line",
		label: "Line",
		kind: "line",
		default: {
			color: "var(--trange-line)",
			width: 1.3
		}
	}],
	warmupBars: () => 251,
	compute: (e) => {
		let t = at(e.h, e.l, e.c);
		for (let e = 0; e < t.length; e++) t[e] = H(t[e]);
		return { series: { trange: t } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "trange",
		st: F(r, "line", i)
	}]),
	autofitKeys: () => ["trange"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "TRANGE",
		value: N(e.trange, t, M)
	}]
}, At = /* @__PURE__ */ new Map();
function jt(e) {
	At.set(e.key, e);
}
function q(e) {
	return At.get(e);
}
function Mt() {
	return [...At.values()];
}
function Nt(e) {
	let t = {};
	for (let n of e) n.kind === "line" ? (t[`${n.key}Color`] = n.default.color, t[`${n.key}Width`] = n.default.width, t[`${n.key}Style`] = n.default.style ?? 0, t[`${n.key}Opacity`] = n.default.opacity ?? 1) : t[n.key] = n.default;
	return t;
}
function Pt(e, t) {
	let n = Nt(e.settingsSchema), r = {
		...n,
		...t
	}, i = e.deriveDefaults?.(r) ?? {};
	return {
		...n,
		...i,
		...t
	};
}
function Ft(e, t) {
	let n = q(e);
	if (!n) return;
	let r = { ...t?.settingsOverrides }, i = Pt(n, r);
	return {
		id: t?.id ?? e,
		defKey: e,
		label: n.label,
		enabled: t?.enabled ?? !1,
		settings: i,
		settingsOverrides: r
	};
}
jt(xe), jt(Ee), jt(R), jt(We), jt(V);
var It = [
	ft,
	mt,
	ht,
	gt,
	_t,
	vt,
	yt,
	bt,
	xt,
	St,
	Ct,
	wt,
	Tt,
	Et,
	Dt,
	Ot,
	kt
];
for (let e of It) jt(e);
function Lt(e) {
	let t = q(e.defKey);
	return t?.formatParams ? t.formatParams(e.settings) : "";
}
var Rt = [
	"ti:ema",
	"ti:sma",
	"ti:wma",
	"ti:dema",
	"ti:tema",
	"ti:bbands",
	"highs",
	"stage2"
], zt = [
	"volume",
	"results",
	"rs",
	"rsi",
	"macd",
	"stoch",
	"stochf",
	"stochrsi",
	"willr",
	"adx",
	"dx",
	"atr",
	"natr",
	"trange"
], J = {
	colors: {},
	background: {
		topColor: "#6e7b8b",
		bottomColor: "#776a5a",
		radius: 12
	},
	candle: { wickWidth: 1.25 },
	axis: {
		opacity: .12,
		tickSize: 4
	},
	crosshair: {
		color: "currentColor",
		opacity: .3,
		dash: "3,3"
	},
	patterns: {
		base_breakout: {
			lineColor: "#252525",
			lineWidth: 1.5,
			lineOpacity: .5,
			lineDash: "5 4",
			statColor: "#252525",
			dotFill: "#252525",
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		consolidation: {
			boxFill: "#252525",
			boxFillOpacity: .1,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		high_tight_flag: {
			poleColor: "#252525",
			poleWidth: 2,
			poleOpacity: .35,
			flagFill: "#252525",
			flagFillOpacity: .12,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		gap_up: {
			bandFill: "#252525",
			bandFillOpacity: .1,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		volume_breakout: {
			markerColor: "#252525",
			markerOpacity: .9,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		golden_cross: {
			dotFill: "#252525",
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		nr7: {
			lineColor: "#252525",
			lineWidth: 1,
			lineOpacity: .5,
			markerColor: "#252525",
			markerOpacity: .9,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		unusual_volume: {
			markerColor: "#252525",
			markerOpacity: .9,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		volume_dryup: {
			markerColor: "#252525",
			markerOpacity: .9,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		pocket_pivot: {
			markerColor: "#252525",
			markerOpacity: .9,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		inside_day: {
			lineColor: "#252525",
			lineWidth: 1.5,
			lineOpacity: .5,
			boxStroke: "#252525",
			boxStrokeWidth: 1.5,
			boxStrokeOpacity: .6,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		},
		pullback_to_ema: {
			dotFill: "#252525",
			lineColor: "#252525",
			lineWidth: 1.5,
			lineOpacity: .5,
			labelBg: "#252525",
			labelBgOpacity: .7,
			labelTextColor: "#ffffff",
			labelFontSize: 11
		}
	}
}, Bt = (e) => typeof e == "object" && !!e && !Array.isArray(e);
function Vt(e, t) {
	if (t === void 0) return e;
	if (!Bt(e) || !Bt(t)) return t;
	let n = { ...e };
	for (let r of Object.keys(t)) n[r] = Vt(e[r], t[r]);
	return n;
}
function Ht(e) {
	return Vt(J, e);
}
//#endregion
//#region src/drawings/types.ts
function Ut(e) {
	return !!e && typeof e == "object" && typeof e.date == "string" && typeof e.price == "number" && Number.isFinite(e.price);
}
function Wt(e) {
	if (!e || typeof e != "object") return null;
	let t = e;
	if (typeof t.id != "string" || t.id === "" || typeof t.type != "string") return null;
	switch (t.type) {
		case "trendline":
		case "ray":
		case "ruler": return Ut(t.a) && Ut(t.b) ? e : null;
		case "hray":
		case "text": return Ut(t.a) ? e : null;
		case "hline": return typeof t.price == "number" && Number.isFinite(t.price) ? e : null;
		case "vline": return typeof t.date == "string" ? e : null;
		default: return e;
	}
}
//#endregion
//#region src/drawings/defaults.ts
var Gt = {
	color: "var(--chart-drawing)",
	width: 1.5,
	style: 0,
	opacity: 1,
	text: "",
	fontSize: 12,
	bgColor: "var(--chart-drawing-bg)",
	bgOpacity: .85
};
function Kt(e) {
	return {
		color: e?.color ?? Gt.color,
		width: e?.width ?? Gt.width,
		style: e?.style ?? Gt.style,
		opacity: e?.opacity ?? Gt.opacity,
		text: e?.text ?? Gt.text,
		fontSize: e?.fontSize ?? Gt.fontSize,
		bgColor: e?.bgColor ?? Gt.bgColor,
		bgOpacity: e?.bgOpacity ?? Gt.bgOpacity
	};
}
//#endregion
//#region src/internal/cn.ts
function qt(...e) {
	return e.filter(Boolean).join(" ");
}
var Y = {
	chartControls: "_chartControls_1o2a2_1",
	indicatorPicker: "_indicatorPicker_1o2a2_8",
	pickerPanel: "_pickerPanel_1o2a2_13",
	pickerScroll: "_pickerScroll_1o2a2_25",
	pickerCount: "_pickerCount_1o2a2_61",
	pickerSection: "_pickerSection_1o2a2_68",
	pickerRow: "_pickerRow_1o2a2_77",
	pickerCheckRow: "_pickerCheckRow_1o2a2_92",
	pickerLabel: "_pickerLabel_1o2a2_111",
	pickerAdd: "_pickerAdd_1o2a2_117",
	drawToolRow: "_drawToolRow_1o2a2_140",
	drawToolRowActive: "_drawToolRowActive_1o2a2_168",
	drawToolDivider: "_drawToolDivider_1o2a2_173"
}, Jt = [
	{
		tool: "cursor",
		label: "Cursor",
		Icon: p
	},
	{
		tool: "trendline",
		label: "Trend line",
		Icon: S
	},
	{
		tool: "ray",
		label: "Ray",
		Icon: b
	},
	{
		tool: "hline",
		label: "Horizontal line",
		Icon: f
	},
	{
		tool: "vline",
		label: "Vertical line",
		Icon: g
	},
	{
		tool: "hray",
		label: "Horizontal ray",
		Icon: h
	},
	{
		tool: "text",
		label: "Text",
		Icon: C
	},
	{
		tool: "ruler",
		label: "Ruler",
		Icon: v
	}
];
function X(e, t) {
	let n = t.indexOf(e);
	return n === -1 ? t.length : n;
}
function Yt(e) {
	let t = e.pane;
	return typeof t == "object" ? t.subpane : "";
}
function Xt({ chartType: e, onChartTypeChange: t, indicators: n, onIndicatorsChange: r, patternsEnabled: a, onPatternsToggle: o, visiblePatterns: l, onVisiblePatternsChange: u, statsEnabled: d, onStatsToggle: f, activeDrawingTool: p = "cursor", onActiveDrawingToolChange: m, hasDrawings: h, onDeleteAllDrawings: g, className: _ }) {
	let [v, y] = c(!1), b = s(null), [x, S] = c(!1), C = s(null), [D, O] = c(!1), k = s(null);
	i(() => {
		if (!D) return;
		let e = (e) => {
			k.current && !k.current.contains(e.target) && O(!1);
		}, t = (e) => {
			e.key === "Escape" && O(!1);
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [D]), i(() => {
		if (!v) return;
		let e = (e) => {
			b.current && !b.current.contains(e.target) && y(!1);
		}, t = (e) => {
			e.key === "Escape" && y(!1);
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [v]), i(() => {
		if (!x) return;
		let e = (e) => {
			C.current && !C.current.contains(e.target) && S(!1);
		}, t = (e) => {
			e.key === "Escape" && S(!1);
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [x]);
	let ee = (e) => l ? l.includes(e) : !0, te = l ? l.length : de.length, ne = (e) => {
		if (!u) return;
		let t = l ?? de;
		u(t.includes(e) ? t.filter((t) => t !== e) : [...t, e]);
	}, re = Mt().filter((e) => e.pane === "price").sort((e, t) => X(e.key, Rt) - X(t.key, Rt)), ie = Mt().filter((e) => typeof e.pane == "object").sort((e, t) => X(Yt(e), zt) - X(Yt(t), zt)), ae = (e) => {
		let t = Ft(e.key, {
			id: crypto.randomUUID(),
			enabled: !0
		});
		t && r([...n, t]);
	}, oe = (e) => /* @__PURE__ */ E("div", {
		className: Y.pickerRow,
		children: [/* @__PURE__ */ T("span", {
			className: Y.pickerLabel,
			children: e.label
		}), /* @__PURE__ */ T("button", {
			type: "button",
			className: Y.pickerAdd,
			title: `Add ${e.label}`,
			onClick: () => ae(e),
			children: "+"
		})]
	}, e.key);
	return /* @__PURE__ */ E("div", {
		className: qt(Y.chartControls, _),
		children: [
			/* @__PURE__ */ E("div", {
				className: "pill-toggle-group",
				children: [/* @__PURE__ */ T("button", {
					className: qt("pill-toggle-btn", "pill-toggle-btn-sm", e === "candlestick" && "is-active"),
					onClick: () => t("candlestick"),
					children: "Candles"
				}), /* @__PURE__ */ T("button", {
					className: qt("pill-toggle-btn", "pill-toggle-btn-sm", e === "bar" && "is-active"),
					onClick: () => t("bar"),
					children: "Bars"
				})]
			}),
			/* @__PURE__ */ E("div", {
				className: Y.indicatorPicker,
				ref: b,
				children: [/* @__PURE__ */ E("button", {
					type: "button",
					className: qt("pill-toggle-btn", "pill-toggle-btn-sm", v && "is-active"),
					onClick: () => y((e) => !e),
					children: [
						"Indicators ·",
						" ",
						/* @__PURE__ */ T("span", {
							className: Y.pickerCount,
							children: n.length
						})
					]
				}), v && /* @__PURE__ */ T("div", {
					className: Y.pickerPanel,
					children: /* @__PURE__ */ E("div", {
						className: Y.pickerScroll,
						children: [
							/* @__PURE__ */ T("div", {
								className: Y.pickerSection,
								children: "Overlays"
							}),
							re.map(oe),
							/* @__PURE__ */ T("div", {
								className: Y.pickerSection,
								children: "Oscillators"
							}),
							ie.map(oe)
						]
					})
				})]
			}),
			/* @__PURE__ */ E("div", {
				className: Y.indicatorPicker,
				ref: C,
				children: [/* @__PURE__ */ E("button", {
					type: "button",
					className: qt("pill-toggle-btn", "pill-toggle-btn-sm", a && "is-active"),
					onClick: () => S((e) => !e),
					children: [
						"Patterns ·",
						" ",
						/* @__PURE__ */ T("span", {
							className: Y.pickerCount,
							children: a ? te : 0
						})
					]
				}), x && /* @__PURE__ */ T("div", {
					className: Y.pickerPanel,
					children: /* @__PURE__ */ E("div", {
						className: Y.pickerScroll,
						children: [
							/* @__PURE__ */ E("label", {
								className: Y.pickerCheckRow,
								children: [/* @__PURE__ */ T("span", {
									className: Y.pickerLabel,
									children: "Show patterns"
								}), /* @__PURE__ */ T("input", {
									type: "checkbox",
									checked: a,
									onChange: o
								})]
							}),
							/* @__PURE__ */ T("div", {
								className: Y.pickerSection,
								children: "Patterns"
							}),
							ue.map(({ name: e, label: t }) => /* @__PURE__ */ E("label", {
								className: Y.pickerCheckRow,
								children: [/* @__PURE__ */ T("span", {
									className: Y.pickerLabel,
									children: t
								}), /* @__PURE__ */ T("input", {
									type: "checkbox",
									disabled: !a || !u,
									checked: ee(e),
									onChange: () => ne(e)
								})]
							}, e))
						]
					})
				})]
			}),
			m && /* @__PURE__ */ E("div", {
				className: Y.indicatorPicker,
				ref: k,
				children: [/* @__PURE__ */ T("button", {
					type: "button",
					className: qt("pill-toggle-btn", "pill-toggle-btn-sm", (D || p !== "cursor") && "is-active"),
					onClick: () => O((e) => !e),
					children: "Draw ▾"
				}), D && /* @__PURE__ */ T("div", {
					className: Y.pickerPanel,
					children: /* @__PURE__ */ E("div", {
						className: Y.pickerScroll,
						children: [Jt.map(({ tool: e, label: t, Icon: n }) => /* @__PURE__ */ E("button", {
							type: "button",
							className: qt(Y.drawToolRow, p === e && Y.drawToolRowActive),
							onClick: () => {
								m(e), O(!1);
							},
							children: [/* @__PURE__ */ T(n, { size: 14 }), /* @__PURE__ */ T("span", {
								className: Y.pickerLabel,
								children: t
							})]
						}, e)), g && /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T("div", { className: Y.drawToolDivider }), /* @__PURE__ */ T("button", {
							type: "button",
							className: Y.drawToolRow,
							disabled: !h,
							onClick: () => {
								g(), O(!1);
							},
							children: /* @__PURE__ */ T("span", {
								className: Y.pickerLabel,
								children: "Delete all"
							})
						})] })]
					})
				})]
			}),
			/* @__PURE__ */ T("div", {
				className: "pill-toggle-group",
				children: /* @__PURE__ */ T("button", {
					className: qt("pill-toggle-btn", "pill-toggle-btn-sm", d && "is-active"),
					onClick: f,
					children: "Stats"
				})
			})
		]
	});
}
//#endregion
//#region src/utils/toHex6.ts
var Zt = "#888888", Qt = (e) => Math.max(0, Math.min(255, Math.round(e))).toString(16).padStart(2, "0");
function $t(e) {
	let t = e.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
	let n = t.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
	if (n) return `#${Qt(+n[1])}${Qt(+n[2])}${Qt(+n[3])}`;
	let r = t.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
	return r ? `#${Qt(r[1] * 255)}${Qt(r[2] * 255)}${Qt(r[3] * 255)}` : Zt;
}
//#endregion
//#region src/controls/SettingsFields.tsx
function en(e, t) {
	let n = e;
	return t.min != null && (n = Math.max(t.min, n)), t.max != null && (n = Math.min(t.max, n)), n;
}
function tn({ spec: e, value: t, onCommit: n }) {
	let [r, i] = c(String(t)), a = e.step ?? 1, o = Number.isInteger(a), s = o ? `Whole number${e.min == null ? "" : ` ≥ ${e.min}`}` : `Number${e.min == null ? "" : ` ≥ ${e.min}`}, step ${a}`;
	return /* @__PURE__ */ E("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ T("span", { children: e.label }), /* @__PURE__ */ T("input", {
			type: "number",
			value: r,
			min: e.min,
			max: e.max,
			step: a,
			title: s,
			autoComplete: "off",
			onWheel: (e) => e.currentTarget.blur(),
			onChange: (t) => {
				let r = t.target.value;
				i(r);
				let a = Number(r);
				r.trim() !== "" && Number.isFinite(a) && /^\d*\.?\d*$/.test(r) && n(en(o ? Math.round(a) : a, e));
			},
			onBlur: () => i(String(t))
		})]
	});
}
function nn({ spec: e, value: t, onChange: n }) {
	return /* @__PURE__ */ E("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ T("span", { children: e.label }), /* @__PURE__ */ T("select", {
			value: t,
			onChange: (e) => n(Number(e.target.value)),
			children: e.options.map((e) => /* @__PURE__ */ T("option", {
				value: e.value,
				children: e.label
			}, e.value))
		})]
	});
}
function rn({ label: e, value: t, onChange: n }) {
	return /* @__PURE__ */ E("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ T("span", { children: e }), /* @__PURE__ */ T("input", {
			type: "checkbox",
			checked: t,
			onChange: (e) => n(e.target.checked)
		})]
	});
}
function an({ label: e, colorExpr: t, isOverridden: n, resolveColor: r, onCommit: a, onReset: o }) {
	let s = $t(r(t)), [l, u] = c(s);
	return i(() => u(s), [s]), /* @__PURE__ */ E("div", {
		className: j.legendColorField,
		children: [/* @__PURE__ */ T("span", { children: e }), /* @__PURE__ */ E("div", {
			className: j.legendColorControls,
			children: [
				/* @__PURE__ */ T("input", {
					type: "color",
					value: s,
					title: `${e} color`,
					onChange: (e) => a(e.target.value)
				}),
				/* @__PURE__ */ T("input", {
					type: "text",
					className: j.legendColorHex,
					value: l,
					spellCheck: !1,
					autoComplete: "off",
					onChange: (e) => u(e.target.value),
					onBlur: () => {
						let e = l.trim().toLowerCase();
						/^#[0-9a-f]{6}$/.test(e) ? a(e) : u(s);
					},
					onKeyDown: (e) => {
						e.key === "Enter" && e.currentTarget.blur();
					}
				}),
				/* @__PURE__ */ T("button", {
					type: "button",
					className: j.legendBtn,
					title: "Reset to default color",
					disabled: !n,
					onClick: o,
					children: "↺"
				})
			]
		})]
	});
}
function on({ label: e, value: t, onCommit: n, min: r = 0, max: i = 1, step: a = .05 }) {
	return /* @__PURE__ */ E("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ T("span", { children: e }), /* @__PURE__ */ E("span", {
			className: j.sliderControl,
			children: [/* @__PURE__ */ T("input", {
				type: "range",
				min: r,
				max: i,
				step: a,
				value: t,
				onChange: (e) => n(Number(e.target.value))
			}), /* @__PURE__ */ T("span", {
				className: j.sliderValue,
				children: t.toFixed(2)
			})]
		})]
	});
}
function sn({ label: e, prefix: t, settings: n, settingsOverrides: r, resolveColor: i, onCommit: a, onResetKeys: o }) {
	let s = `${t}Color`, c = `${t}Width`, l = `${t}Style`, u = `${t}Opacity`, d = $t(i(String(n[s] ?? ""))), f = Number(n[c] ?? 1), p = Number(n[l] ?? 0), m = Number(n[u] ?? 1), h = [
		s,
		c,
		l,
		u
	].some((e) => e in r);
	return /* @__PURE__ */ E("div", {
		className: j.legendColorField,
		children: [/* @__PURE__ */ T("span", { children: e }), /* @__PURE__ */ E("div", {
			className: j.lineFieldControls,
			children: [
				/* @__PURE__ */ T("input", {
					type: "color",
					value: d,
					title: `${e} color`,
					onChange: (e) => a(s, e.target.value)
				}),
				/* @__PURE__ */ T("select", {
					className: j.lineFieldSelect,
					value: p,
					title: `${e} style`,
					onChange: (e) => a(l, Number(e.target.value)),
					children: _e.map((e) => /* @__PURE__ */ T("option", {
						value: e.value,
						children: e.label
					}, e.value))
				}),
				/* @__PURE__ */ T("input", {
					type: "number",
					className: j.lineFieldWidth,
					min: .5,
					max: 10,
					step: .1,
					value: f,
					title: `${e} width`,
					onWheel: (e) => e.currentTarget.blur(),
					onChange: (e) => {
						let t = Number(e.target.value);
						Number.isFinite(t) && t > 0 && a(c, t);
					}
				}),
				/* @__PURE__ */ T("input", {
					type: "range",
					className: j.lineFieldOpacity,
					min: 0,
					max: 1,
					step: .05,
					value: m,
					title: `${e} opacity`,
					onChange: (e) => a(u, Number(e.target.value))
				}),
				/* @__PURE__ */ T("button", {
					type: "button",
					className: j.legendBtn,
					title: "Reset line to default",
					disabled: !h,
					onClick: () => o([
						s,
						c,
						l,
						u
					].filter((e) => e in r)),
					children: "↺"
				})
			]
		})]
	});
}
//#endregion
//#region src/controls/SettingsDialog.tsx
function cn(e, t) {
	let n = e;
	for (let e of t) {
		if (typeof n != "object" || !n) return;
		n = n[e];
	}
	return n;
}
function Z(e, t, n) {
	let [r, ...i] = t, a = { ...e ?? {} };
	return i.length === 0 ? a[r] = n : a[r] = Z(a[r], i, n), a;
}
function ln(e, t) {
	let [n, ...r] = t, i = { ...e ?? {} };
	if (r.length === 0) delete i[n];
	else {
		let e = i[n];
		if (e && typeof e == "object") {
			let t = ln(e, r);
			Object.keys(t).length === 0 ? delete i[n] : i[n] = t;
		}
	}
	return i;
}
function un({ label: e, value: t, onCommit: n }) {
	let [r, a] = c(t);
	return i(() => a(t), [t]), /* @__PURE__ */ E("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ T("span", { children: e }), /* @__PURE__ */ T("input", {
			type: "text",
			value: r,
			spellCheck: !1,
			autoComplete: "off",
			onChange: (e) => a(e.target.value),
			onBlur: () => n(r),
			onKeyDown: (e) => {
				e.key === "Enter" && e.currentTarget.blur();
			}
		})]
	});
}
function dn({ appearance: e, onAppearanceChange: t, resolveColor: n, onClose: r, style: a }) {
	let o = s(null);
	i(() => {
		let e = (e) => {
			o.current && !o.current.contains(e.target) && r();
		}, t = (e) => {
			e.key === "Escape" && r();
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [r]);
	let c = Ht(e), l = (n, r) => t(Z(e, n, r)), u = (n) => t(ln(e, n)), d = (t, r) => {
		let i = e.colors?.[t];
		return /* @__PURE__ */ T(an, {
			label: r,
			colorExpr: i ?? `var(--${t})`,
			isOverridden: i !== void 0,
			resolveColor: n,
			onCommit: (e) => l(["colors", t], e),
			onReset: () => u(["colors", t])
		}, t);
	}, f = (t, r) => /* @__PURE__ */ T(an, {
		label: r,
		colorExpr: String(cn(c, t)),
		isOverridden: cn(e, t) !== void 0,
		resolveColor: n,
		onCommit: (e) => l(t, e),
		onReset: () => u(t)
	}, t.join(".")), p = (e, t, n = {}) => {
		let r = Number(cn(c, e));
		return /* @__PURE__ */ T(tn, {
			spec: {
				key: e.join("."),
				label: t,
				kind: "number",
				default: r,
				...n
			},
			value: r,
			onCommit: (t) => l(e, t)
		}, e.join("."));
	}, m = (e, t) => /* @__PURE__ */ T(on, {
		label: t,
		value: Number(cn(c, e)),
		onCommit: (t) => l(e, t)
	}, e.join(".")), h = (e, t) => /* @__PURE__ */ T(un, {
		label: t,
		value: String(cn(c, e)),
		onCommit: (t) => l(e, t)
	}, e.join("."));
	return /* @__PURE__ */ E("div", {
		className: j.settingsDialog,
		ref: o,
		style: a,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ E("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ T("span", {
				className: j.legendPopoverTitle,
				children: "Chart settings"
			}), /* @__PURE__ */ T("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: r,
				children: "×"
			})]
		}), /* @__PURE__ */ E("div", {
			className: j.panelScrollBody,
			children: [
				/* @__PURE__ */ T("div", {
					className: j.settingsSectionTitle,
					children: "Chart appearance"
				}),
				d("chart-positive", "Candle up"),
				d("chart-negative", "Candle down"),
				p(["candle", "wickWidth"], "Wick width", {
					min: .5,
					max: 6,
					step: .05
				}),
				f(["background", "topColor"], "Background top"),
				f(["background", "bottomColor"], "Background bottom"),
				p(["background", "radius"], "Background radius", {
					min: 0,
					max: 48,
					step: 1
				}),
				d("chart-axis-label", "Axis label"),
				m(["axis", "opacity"], "Axis opacity"),
				p(["axis", "tickSize"], "Tick size", {
					min: 0,
					max: 16,
					step: 1
				}),
				f(["crosshair", "color"], "Crosshair"),
				m(["crosshair", "opacity"], "Crosshair opacity"),
				h(["crosshair", "dash"], "Crosshair dash"),
				d("chart-separator", "Separator"),
				d("subpane-guide", "Subpane guide"),
				/* @__PURE__ */ T("div", {
					className: j.settingsSectionTitle,
					children: "Patterns"
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Base breakout"
				}),
				f([
					"patterns",
					"base_breakout",
					"lineColor"
				], "Line"),
				p([
					"patterns",
					"base_breakout",
					"lineWidth"
				], "Line width", {
					min: .5,
					max: 8,
					step: .1
				}),
				m([
					"patterns",
					"base_breakout",
					"lineOpacity"
				], "Line opacity"),
				h([
					"patterns",
					"base_breakout",
					"lineDash"
				], "Line dash"),
				f([
					"patterns",
					"base_breakout",
					"statColor"
				], "Stat text"),
				f([
					"patterns",
					"base_breakout",
					"dotFill"
				], "Breakout dot"),
				f([
					"patterns",
					"base_breakout",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"base_breakout",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"base_breakout",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"base_breakout",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Consolidation"
				}),
				f([
					"patterns",
					"consolidation",
					"boxFill"
				], "Box fill"),
				m([
					"patterns",
					"consolidation",
					"boxFillOpacity"
				], "Box opacity"),
				f([
					"patterns",
					"consolidation",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"consolidation",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"consolidation",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"consolidation",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "High tight flag"
				}),
				f([
					"patterns",
					"high_tight_flag",
					"poleColor"
				], "Pole"),
				p([
					"patterns",
					"high_tight_flag",
					"poleWidth"
				], "Pole width", {
					min: .5,
					max: 8,
					step: .1
				}),
				m([
					"patterns",
					"high_tight_flag",
					"poleOpacity"
				], "Pole opacity"),
				f([
					"patterns",
					"high_tight_flag",
					"flagFill"
				], "Flag fill"),
				m([
					"patterns",
					"high_tight_flag",
					"flagFillOpacity"
				], "Flag opacity"),
				f([
					"patterns",
					"high_tight_flag",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"high_tight_flag",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"high_tight_flag",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"high_tight_flag",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Gap up"
				}),
				f([
					"patterns",
					"gap_up",
					"bandFill"
				], "Band fill"),
				m([
					"patterns",
					"gap_up",
					"bandFillOpacity"
				], "Band opacity"),
				f([
					"patterns",
					"gap_up",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"gap_up",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"gap_up",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"gap_up",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Volume breakout"
				}),
				f([
					"patterns",
					"volume_breakout",
					"markerColor"
				], "Marker"),
				m([
					"patterns",
					"volume_breakout",
					"markerOpacity"
				], "Marker opacity"),
				f([
					"patterns",
					"volume_breakout",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"volume_breakout",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"volume_breakout",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"volume_breakout",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Golden cross"
				}),
				f([
					"patterns",
					"golden_cross",
					"dotFill"
				], "Dot"),
				f([
					"patterns",
					"golden_cross",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"golden_cross",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"golden_cross",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"golden_cross",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "NR7"
				}),
				f([
					"patterns",
					"nr7",
					"lineColor"
				], "Line"),
				p([
					"patterns",
					"nr7",
					"lineWidth"
				], "Line width", {
					min: .5,
					max: 8,
					step: .1
				}),
				m([
					"patterns",
					"nr7",
					"lineOpacity"
				], "Line opacity"),
				f([
					"patterns",
					"nr7",
					"markerColor"
				], "Marker"),
				m([
					"patterns",
					"nr7",
					"markerOpacity"
				], "Marker opacity"),
				f([
					"patterns",
					"nr7",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"nr7",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"nr7",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"nr7",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Unusual volume"
				}),
				f([
					"patterns",
					"unusual_volume",
					"markerColor"
				], "Marker"),
				m([
					"patterns",
					"unusual_volume",
					"markerOpacity"
				], "Marker opacity"),
				f([
					"patterns",
					"unusual_volume",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"unusual_volume",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"unusual_volume",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"unusual_volume",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Volume dry-up"
				}),
				f([
					"patterns",
					"volume_dryup",
					"markerColor"
				], "Marker"),
				m([
					"patterns",
					"volume_dryup",
					"markerOpacity"
				], "Marker opacity"),
				f([
					"patterns",
					"volume_dryup",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"volume_dryup",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"volume_dryup",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"volume_dryup",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Pocket pivot"
				}),
				f([
					"patterns",
					"pocket_pivot",
					"markerColor"
				], "Marker"),
				m([
					"patterns",
					"pocket_pivot",
					"markerOpacity"
				], "Marker opacity"),
				f([
					"patterns",
					"pocket_pivot",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"pocket_pivot",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"pocket_pivot",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"pocket_pivot",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Inside day"
				}),
				f([
					"patterns",
					"inside_day",
					"lineColor"
				], "Mother line"),
				p([
					"patterns",
					"inside_day",
					"lineWidth"
				], "Mother line width", {
					min: .5,
					max: 8,
					step: .1
				}),
				m([
					"patterns",
					"inside_day",
					"lineOpacity"
				], "Mother line opacity"),
				f([
					"patterns",
					"inside_day",
					"boxStroke"
				], "Inside box"),
				p([
					"patterns",
					"inside_day",
					"boxStrokeWidth"
				], "Inside box width", {
					min: .5,
					max: 8,
					step: .1
				}),
				m([
					"patterns",
					"inside_day",
					"boxStrokeOpacity"
				], "Inside box opacity"),
				f([
					"patterns",
					"inside_day",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"inside_day",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"inside_day",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"inside_day",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ T("div", {
					className: j.settingsGroupTitle,
					children: "Pullback to EMA"
				}),
				f([
					"patterns",
					"pullback_to_ema",
					"dotFill"
				], "Dot"),
				f([
					"patterns",
					"pullback_to_ema",
					"lineColor"
				], "Tick"),
				p([
					"patterns",
					"pullback_to_ema",
					"lineWidth"
				], "Tick width", {
					min: .5,
					max: 8,
					step: .1
				}),
				m([
					"patterns",
					"pullback_to_ema",
					"lineOpacity"
				], "Tick opacity"),
				f([
					"patterns",
					"pullback_to_ema",
					"labelBg"
				], "Label bg"),
				m([
					"patterns",
					"pullback_to_ema",
					"labelBgOpacity"
				], "Label bg opacity"),
				f([
					"patterns",
					"pullback_to_ema",
					"labelTextColor"
				], "Label text"),
				p([
					"patterns",
					"pullback_to_ema",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				})
			]
		})]
	});
}
var fn = {
	zoomSlider: "_zoomSlider_1ol61_4",
	marks: "_marks_1ol61_16",
	mark: "_mark_1ol61_16"
};
//#endregion
//#region src/controls/ZoomSlider.tsx
function pn({ visibleBars: e, onVisibleBarsChange: t, maxVisibleBars: n, onPanReset: r }) {
	let i = Math.max(10, n), a = Math.min(k["3M"], i), o = Math.max(a, Math.min(e, i)), s = Math.log(a), c = Math.log(i), l = c - s, u = O.map((e) => ({
		key: e,
		bars: k[e]
	})).filter((e) => e.bars >= a && e.bars <= i), d = (e) => l > 0 ? (Math.log(e) - s) / l * 100 : 0, f = (e) => {
		let n = Math.max(a, Math.min(e, i));
		t(n), u.some((e) => e.bars === n) && r?.();
	};
	return /* @__PURE__ */ E("div", {
		className: fn.zoomSlider,
		children: [/* @__PURE__ */ T("input", {
			type: "range",
			min: s,
			max: c,
			step: "any",
			value: Math.log(o),
			onChange: (e) => f(Math.round(Math.exp(Number(e.target.value)))),
			"aria-label": "Zoom (visible range)"
		}), /* @__PURE__ */ T("div", {
			className: fn.marks,
			children: u.map((e) => /* @__PURE__ */ T("button", {
				type: "button",
				className: fn.mark,
				style: { left: `${d(e.bars)}%` },
				onClick: () => f(e.bars),
				children: e.key
			}, e.key))
		})]
	});
}
//#endregion
//#region src/controls/IndicatorLegend.tsx
var mn = 18;
function hn({ config: e, def: t, onCommit: n, onReset: r, onResetKeys: a, resolveColor: o, onClose: c }) {
	let l = s(null);
	i(() => {
		let e = (e) => {
			l.current && !l.current.contains(e.target) && c();
		}, t = (e) => {
			e.key === "Escape" && c();
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [c]);
	let u = Lt(e), d = o ?? ((e) => e);
	return /* @__PURE__ */ E("div", {
		className: j.legendPopover,
		ref: l,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ E("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ E("span", {
				className: j.legendPopoverTitle,
				children: [t.longLabel ?? t.label, u && /* @__PURE__ */ T("span", {
					className: j.legendPopoverSummary,
					children: u
				})]
			}), /* @__PURE__ */ T("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: c,
				children: "×"
			})]
		}), /* @__PURE__ */ T("div", {
			className: j.panelScrollBody,
			children: t.settingsSchema.map((t) => {
				switch (t.kind) {
					case "number": return /* @__PURE__ */ T(tn, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onCommit: (e) => n(t.key, e)
					}, t.key);
					case "enum": return /* @__PURE__ */ T(nn, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "toggle": return /* @__PURE__ */ T(rn, {
						label: t.label,
						value: !!(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "color": return /* @__PURE__ */ T(an, {
						label: t.label,
						colorExpr: String(e.settings[t.key] ?? t.default),
						isOverridden: t.key in e.settingsOverrides,
						resolveColor: d,
						onCommit: (e) => n(t.key, e),
						onReset: () => r(t.key)
					}, t.key);
					case "line": return /* @__PURE__ */ T(sn, {
						label: t.label,
						prefix: t.key,
						settings: e.settings,
						settingsOverrides: e.settingsOverrides,
						resolveColor: d,
						onCommit: (e, t) => n(e, t),
						onResetKeys: (e) => a(e)
					}, t.key);
				}
			})
		})]
	});
}
function gn({ configs: e, top: t, left: n, openId: r, setOpenId: i, onCommit: a, onReset: o, onResetKeys: s, resolveColor: c, onRemove: l, rowsFor: f, toggle: p }) {
	if (e.length === 0 && !p) return null;
	let m = c ?? ((e) => e);
	return /* @__PURE__ */ E("div", {
		className: j.legendBlock,
		style: {
			top: t,
			left: n
		},
		children: [e.map((e) => {
			let t = q(e.defKey);
			if (!t) return null;
			let n = (t.settingsSchema?.length ?? 0) > 0, u = Lt(e), d = f(e), p = d[0]?.color ? m(d[0].color) : "transparent", h = d.filter((e) => e.value).map((e) => ({
				text: e.value,
				color: m(e.color)
			}));
			return /* @__PURE__ */ E("div", {
				className: j.legendItem,
				children: [
					/* @__PURE__ */ T("span", {
						className: j.legendDot,
						style: { background: p }
					}),
					/* @__PURE__ */ E("span", {
						className: j.legendLabel,
						children: [t.label, u ? ` ${u}` : ""]
					}),
					h.length > 0 && /* @__PURE__ */ T("span", {
						className: j.legendValues,
						children: h.map((e, t) => /* @__PURE__ */ T("span", {
							style: { color: e.color },
							children: e.text
						}, t))
					}),
					n && /* @__PURE__ */ T("button", {
						type: "button",
						className: j.legendBtn,
						title: `Edit ${t.label}`,
						onMouseDown: (e) => e.stopPropagation(),
						onClick: () => i(r === e.id ? null : e.id),
						children: "⚙"
					}),
					/* @__PURE__ */ T("button", {
						type: "button",
						className: j.legendBtn,
						title: `Remove ${t.label}`,
						onClick: () => l(e.id),
						children: "×"
					}),
					r === e.id && n && /* @__PURE__ */ T(hn, {
						config: e,
						def: t,
						onCommit: (t, n) => a(e, t, n),
						onReset: (t) => o(e, t),
						onResetKeys: (t) => s(e, t),
						resolveColor: c,
						onClose: () => i(null)
					})
				]
			}, e.id);
		}), p && /* @__PURE__ */ T("button", {
			type: "button",
			className: j.legendToggle,
			title: p.expanded ? "Collapse indicators" : "Expand indicators",
			onMouseDown: (e) => e.stopPropagation(),
			onClick: p.onToggle,
			children: p.expanded ? /* @__PURE__ */ T(d, {
				size: 14,
				strokeWidth: 3
			}) : /* @__PURE__ */ T(u, {
				size: 14,
				strokeWidth: 3
			})
		})]
	});
}
function _n({ indicators: e, onIndicatorsChange: t, resolved: n, subpanes: r, marginTop: a, marginLeft: o, barCount: s, expanded: l, onExpandedChange: u, subscribeHoverIndex: d, priceFormatter: f, resolveColor: p }) {
	let [m, h] = c(null), g = () => u((e) => !e), [_, v] = c(null);
	i(() => {
		if (!l) {
			v(null);
			return;
		}
		return d(v);
	}, [l, d]);
	let y = (n, r, i) => {
		t(e.map((e) => e.id === n.id ? Ft(e.defKey, {
			id: e.id,
			enabled: e.enabled,
			settingsOverrides: {
				...e.settingsOverrides,
				[r]: i
			}
		}) ?? e : e));
	}, b = (e, t) => {
		x(e, [t]);
	}, x = (n, r) => {
		r.length !== 0 && t(e.map((e) => {
			if (e.id !== n.id) return e;
			let t = { ...e.settingsOverrides };
			for (let e of r) delete t[e];
			return Ft(e.defKey, {
				id: e.id,
				enabled: e.enabled,
				settingsOverrides: t
			}) ?? e;
		}));
	}, S = (n) => {
		m === n && h(null), t(e.filter((e) => e.id !== n));
	}, C = e.filter((e) => e.enabled), w = C.filter((e) => q(e.defKey)?.pane === "price"), D = (e) => C.filter((t) => {
		let n = q(t.defKey)?.pane;
		return typeof n == "object" && n.subpane === e;
	}), O = _ ?? s - 1, k = (e) => {
		if (O < 0) return [];
		let t = n.find((t) => t.config.id === e.id), r = q(e.defKey);
		return !t || !r ? [] : r.legend(t.series, O, e.settings, { priceFmt: f });
	};
	return /* @__PURE__ */ E("div", {
		className: j.legend,
		"data-chart-legend": "",
		children: [/* @__PURE__ */ T(gn, {
			configs: l ? w : [],
			top: a + 8 + mn,
			left: o + 8,
			openId: m,
			setOpenId: h,
			onCommit: y,
			onReset: b,
			onResetKeys: x,
			resolveColor: p,
			onRemove: S,
			rowsFor: k,
			toggle: w.length > 0 ? {
				expanded: l,
				onToggle: g
			} : void 0
		}), r.map((e) => /* @__PURE__ */ T(gn, {
			configs: l ? D(e.key) : [],
			top: a + e.top + 8,
			left: o + 8,
			openId: m,
			setOpenId: h,
			onCommit: y,
			onReset: b,
			onResetKeys: x,
			resolveColor: p,
			onRemove: S,
			rowsFor: k,
			toggle: {
				expanded: l,
				onToggle: g
			}
		}, e.key))]
	});
}
//#endregion
//#region src/controls/AutoFitMenu.tsx
function vn({ contributors: e, excluded: t, onExcludedChange: n, onClose: r, style: a }) {
	let o = s(null);
	i(() => {
		let e = (e) => {
			o.current && !o.current.contains(e.target) && r();
		}, t = (e) => {
			e.key === "Escape" && r();
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [r]);
	let c = (e) => {
		n(t.includes(e) ? t.filter((t) => t !== e) : [...t, e]);
	};
	return /* @__PURE__ */ E("div", {
		className: j.autoFitMenu,
		ref: o,
		style: a,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ E("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ T("span", {
				className: j.legendPopoverTitle,
				children: "Fit to…"
			}), /* @__PURE__ */ T("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: r,
				children: "×"
			})]
		}), /* @__PURE__ */ T("div", {
			className: j.panelScrollBody,
			children: e.length === 0 ? /* @__PURE__ */ T("div", {
				className: j.autoFitMenuEmpty,
				children: "No overlays to fit"
			}) : e.map((e) => /* @__PURE__ */ E("label", {
				className: j.autoFitMenuRow,
				children: [/* @__PURE__ */ T("input", {
					type: "checkbox",
					checked: !t.includes(e.key),
					onChange: () => c(e.key)
				}), /* @__PURE__ */ T("span", { children: e.label })]
			}, e.key))
		})]
	});
}
//#endregion
//#region src/stats/position.ts
function yn(e, t, n, r, i) {
	return {
		x: Math.min(Math.max(0, e.x), Math.max(0, t - r)),
		y: Math.min(Math.max(0, e.y), Math.max(0, n - i))
	};
}
function bn(e, t, n) {
	return {
		x: Math.max(0, e - t - n - 8),
		y: 8
	};
}
var Q = {
	statsHost: "_statsHost_uvo8j_5",
	statsPanel: "_statsPanel_uvo8j_12",
	statsTable: "_statsTable_uvo8j_27",
	lvlStrong: "_lvlStrong_uvo8j_39",
	lvlUp: "_lvlUp_uvo8j_42",
	lvlNeutral: "_lvlNeutral_uvo8j_45",
	lvlDown: "_lvlDown_uvo8j_48",
	lvlText: "_lvlText_uvo8j_51",
	lvlMuted: "_lvlMuted_uvo8j_54",
	sizeTiny: "_sizeTiny_uvo8j_59",
	sizeSmall: "_sizeSmall_uvo8j_62",
	sizeNormal: "_sizeNormal_uvo8j_65",
	sizeLarge: "_sizeLarge_uvo8j_68",
	dragging: "_dragging_uvo8j_73"
}, xn = {
	tiny: Q.sizeTiny,
	small: Q.sizeSmall,
	normal: Q.sizeNormal,
	large: Q.sizeLarge
}, Sn = {
	strong: Q.lvlStrong,
	up: Q.lvlUp,
	neutral: Q.lvlNeutral,
	down: Q.lvlDown,
	text: Q.lvlText,
	muted: Q.lvlMuted
};
function Cn({ model: e, size: t, marginRight: n, position: r, onPositionChange: o }) {
	let l = s(null), u = s(null), [d, f] = c(null), [p, m] = c(null), [h, g] = c(!1), _ = s(null), v = () => {
		let e = l.current, t = u.current;
		if (!e || !t) return null;
		let n = e.getBoundingClientRect(), r = t.getBoundingClientRect();
		return {
			hostW: n.width,
			hostH: n.height,
			panelW: r.width,
			panelH: r.height
		};
	};
	a(() => {
		let e = l.current, t = u.current;
		if (!e || !t) return;
		let n = () => {
			let e = v();
			e && f((t) => t && t.hostW === e.hostW && t.hostH === e.hostH && t.panelW === e.panelW && t.panelH === e.panelH ? t : e);
		};
		n();
		let r = new ResizeObserver(n);
		return r.observe(e), r.observe(t), () => r.disconnect();
	}, []), i(() => {
		_.current || m(null);
	}, [r]);
	let y = d ? bn(d.hostW, d.panelW, n) : null, b = p ?? r ?? y, x = b && d ? yn(b, d.hostW, d.hostH, d.panelW, d.panelH) : b;
	return e.rows.length === 0 ? null : /* @__PURE__ */ T("div", {
		ref: l,
		className: Q.statsHost,
		"data-chart-stats": "",
		children: /* @__PURE__ */ T("div", {
			ref: u,
			className: `${Q.statsPanel} ${xn[t]} ${h ? Q.dragging : ""}`,
			style: x ? {
				left: x.x,
				top: x.y
			} : { visibility: "hidden" },
			onPointerDown: (e) => {
				x && (e.stopPropagation(), e.preventDefault(), u.current?.setPointerCapture(e.pointerId), _.current = {
					pointerId: e.pointerId,
					mx: e.clientX,
					my: e.clientY,
					startX: x.x,
					startY: x.y
				}, g(!0));
			},
			onPointerMove: (e) => {
				let t = _.current;
				!t || e.pointerId !== t.pointerId || (e.stopPropagation(), d && m(yn({
					x: t.startX + (e.clientX - t.mx),
					y: t.startY + (e.clientY - t.my)
				}, d.hostW, d.hostH, d.panelW, d.panelH)));
			},
			onPointerUp: (e) => {
				let t = _.current;
				if (!t || e.pointerId !== t.pointerId || (e.stopPropagation(), !d)) return;
				let n = yn({
					x: t.startX + (e.clientX - t.mx),
					y: t.startY + (e.clientY - t.my)
				}, d.hostW, d.hostH, d.panelW, d.panelH);
				m(n), o?.(n), _.current = null, g(!1), u.current?.releasePointerCapture(e.pointerId);
			},
			onPointerCancel: (e) => {
				let t = _.current;
				!t || e.pointerId !== t.pointerId || (e.stopPropagation(), _.current = null, g(!1), u.current?.releasePointerCapture(e.pointerId));
			},
			children: /* @__PURE__ */ T("table", {
				className: Q.statsTable,
				children: /* @__PURE__ */ T("tbody", { children: e.rows.map((e, t) => e.kind === "merged" ? /* @__PURE__ */ T("tr", { children: /* @__PURE__ */ T("td", {
					colSpan: 3,
					className: Sn[e.cell.level],
					children: e.cell.text
				}) }, t) : /* @__PURE__ */ T("tr", { children: e.cells.map((e, t) => /* @__PURE__ */ T("td", {
					className: Sn[e.level],
					children: e.text
				}, t)) }, t)) })
			})
		})
	});
}
//#endregion
//#region src/utils/toColumns.ts
var wn = /* @__PURE__ */ new WeakMap();
function Tn(e) {
	let t = wn.get(e);
	if (t) return t;
	let n = e.length, r = new Float64Array(n), i = new Float64Array(n), a = new Float64Array(n), o = new Float64Array(n), s = new Float64Array(n);
	for (let t = 0; t < n; t++) {
		let n = e[t];
		r[t] = n.open, i[t] = n.high, a[t] = n.low, o[t] = n.close, s[t] = n.volume;
	}
	let c = {
		o: r,
		h: i,
		l: a,
		c: o,
		v: s
	};
	return wn.set(e, c), c;
}
//#endregion
//#region src/stats/computeStats.ts
var En = {
	text: "",
	level: "muted"
};
function Dn(e) {
	return e < 10 ? e.toFixed(1) : String(Math.round(e));
}
function On(e) {
	return typeof e == "number" && Number.isFinite(e) && e !== 0 ? e : null;
}
function kn(e) {
	return e > 5 ? "strong" : e > 4 ? "up" : e > 3 ? "neutral" : "down";
}
function An(e) {
	let t = (e.length ? e[e.length - 1] : NaN) * 100;
	return Number.isFinite(t) ? {
		text: `${Dn(t * .5)} %`,
		level: kn(t)
	} : En;
}
function jn(e, t, n) {
	let r = e.length;
	if (r === 0) return { rows: [] };
	let { h: i, l: a, c: o } = Tn(e), s = o[r - 1], c = r >= 2 ? o[r - 2] : o[r - 1], l = at(i, a, o), u = new Float64Array(r);
	for (let e = 0; e < r; e++) u[e] = l[e] / o[e];
	let d = An(W(u, 125)), f = An(W(u, 63)), p = An(W(u, 21)), m = t ?? {}, h = (m.sector ?? "").trim(), g = (m.industry ?? "").trim(), _ = On(m.sharesOutstanding), v = On(m.freeFloatPercent), y = En;
	if (v !== null) {
		let e = v >= 60 ? "neutral" : v >= 30 ? "up" : v >= 20 ? "neutral" : "down";
		y = {
			text: `${Dn(v)} %`,
			level: e
		};
	}
	let b = En;
	if (_ !== null) if (n === "US") {
		let e = _ * c / 1e6;
		e !== 0 && Number.isFinite(e) && (b = {
			text: e > 1e3 ? `${Dn(e / 1e3)} B` : `${Dn(e)} M`,
			level: e >= 2e3 ? "up" : e >= 250 ? "neutral" : "down"
		});
	} else {
		let e = _ * c / 1e10;
		if (e !== 0 && Number.isFinite(e)) {
			let t = e >= 5 ? "up" : e >= 1 ? "neutral" : "down";
			b = {
				text: `${Dn(e)} K`,
				level: t
			};
		}
	}
	let x = En;
	if (typeof m.eps == "number" && Number.isFinite(m.eps)) {
		let e = H(m.eps);
		if (e !== 0) {
			let t = Math.round(s / e * 10) / 10;
			x = {
				text: String(t),
				level: "text"
			};
		}
	}
	let S = h !== "" || g !== "" || b.text !== "" || y.text !== "" || x.text !== "", C = [];
	return S && (C.push({
		kind: "merged",
		cell: {
			text: h,
			level: "text"
		}
	}), C.push({
		kind: "merged",
		cell: {
			text: g,
			level: "text"
		}
	}), C.push({
		kind: "cells",
		cells: [
			{
				text: "Mkt Cap",
				level: "muted"
			},
			{
				text: "Free Float",
				level: "muted"
			},
			{
				text: "PE Ratio",
				level: "muted"
			}
		]
	}), C.push({
		kind: "cells",
		cells: [
			b,
			y,
			x
		]
	})), C.push({
		kind: "cells",
		cells: [
			{
				text: "ATR 6M",
				level: "muted"
			},
			{
				text: "ATR 3M",
				level: "muted"
			},
			{
				text: "ATR 1M",
				level: "muted"
			}
		]
	}), C.push({
		kind: "cells",
		cells: [
			d,
			f,
			p
		]
	}), { rows: C };
}
//#endregion
//#region src/indicators/subpaneLayout.ts
function Mn(e) {
	let { totalHeight: t, subpaneKeys: n } = e, r = n.length, i = n.map((n) => {
		let r = e.userHeights?.[n];
		if (r != null) return r * t;
		let i = e.heightFactors?.[n] ?? 1;
		return t * e.heightRatio * i;
	}), a = i.reduce((e, t) => e + t, 0), o = t - a, s = i, c = t * e.floorRatio;
	if (r > 0 && o < c) {
		o = c;
		let e = t - c, n = a > 0 ? e / a : 0;
		s = i.map((e) => Math.max(4, e * n));
	}
	r === 0 && (o = t);
	let l = [], u = o;
	for (let e = 0; e < n.length; e++) {
		let t = u, r = t + s[e];
		l.push({
			key: n[e],
			top: t,
			bottom: r,
			height: s[e]
		}), u = r;
	}
	return {
		priceHeight: o,
		subpanes: l,
		fullHeight: r > 0 ? u : o
	};
}
function Nn(e) {
	let { bands: t, priceHeight: n, totalHeight: r, dividerIndex: i, minPanePx: a, floorRatio: o } = e, s = t.map((e) => e.height), c = e.dy;
	if (i <= 0) {
		let e = r * o, t = s[0] - a, i = n - e;
		c = Math.max(-i, Math.min(t, c)), s[0] -= c;
	} else {
		let e = i - 1, t = i, n = s[t] - a, r = s[e] - a;
		c = Math.max(-r, Math.min(n, c)), s[e] += c, s[t] -= c;
	}
	let l = {};
	for (let e = 0; e < t.length; e++) l[t[e].key] = s[e] / r;
	return l;
}
function Pn(e) {
	let { hint: t, lines: n, visStart: r, visEnd: i, defaultPad: a } = e;
	if (t?.fixedDomain) return t.fixedDomain;
	let o = Infinity, s = -Infinity;
	for (let e of n) {
		if (e.isMarker) continue;
		let t = e.values;
		for (let e = r; e < i && e < t.length; e++) {
			let n = t[e];
			Number.isNaN(n) || (n < o && (o = n), n > s && (s = n));
		}
	}
	if (!Number.isFinite(o)) return null;
	let c = !0, l = !0;
	t?.includeZero && (o > 0 && (o = 0, c = !1), s < 0 && (s = 0, l = !1));
	let u = t?.autofitPadding ?? a;
	if (t?.zeroLine) {
		let e = Math.max(Math.abs(o), Math.abs(s)) || 1, t = e * u;
		return [-(e + t), e + t];
	}
	if (s > o) {
		let e = (s - o) * u;
		return [o - (c ? e : 0), s + (l ? e : 0)];
	}
	let d = o === 0 ? 1 : Math.abs(o) * .1;
	return [o - d, o + d];
}
//#endregion
//#region src/utils/drawSeries.ts
function Fn(e, t) {
	let { dpr: n } = t;
	e.setTransform(n, 0, 0, n, 0, 0), e.clearRect(0, 0, t.cssWidth, t.cssHeight);
	let r = t.fullHeight + t.marginTop + t.marginBottom, i = e.createLinearGradient(0, r, 0, 0);
	i.addColorStop(0, t.background.bottomColor), i.addColorStop(1, t.background.topColor), e.save(), e.fillStyle = i, e.beginPath(), e.roundRect(0, 0, t.cssWidth, r, t.background.radius), e.fill(), e.restore(), e.save(), e.translate(t.marginLeft, t.marginTop), e.beginPath(), e.rect(0, -t.marginTop, t.width - t.rightBuffer, t.fullHeight + t.marginTop + t.marginBottom), e.clip(), e.translate(t.baseTranslateX, 0), t.chartType === "bar" ? Rn(e, t) : In(e, t), zn(e, t), e.restore();
}
function In(e, t) {
	let { xScale: n, yPrice: r, bandwidth: i, renderStart: a, renderSlice: o, colors: s } = t, c = new Path2D(), l = new Path2D(), u = [], d = [], f = Math.max(1, Math.round(i));
	f % 2 == 0 && (f = Math.max(1, f - 1));
	for (let e = 0; e < o.length; e++) {
		let t = e + a, i = o[e], s = n(t), p = i.close >= i.open, m = Math.round(s), h = m + Math.floor(f / 2) + .5, g = p ? c : l;
		g.moveTo(h, r(i.high)), g.lineTo(h, r(i.low));
		let _ = r(Math.max(i.open, i.close)), v = Math.max(1, Math.abs(r(i.open) - r(i.close)));
		(p ? u : d).push({
			x: m,
			y: _,
			w: f,
			h: v
		});
	}
	e.lineWidth = t.candle.wickWidth, e.strokeStyle = s.positive, e.stroke(c), e.strokeStyle = s.negative, e.stroke(l), e.fillStyle = s.positive;
	for (let t of u) e.fillRect(t.x, t.y, t.w, t.h);
	e.fillStyle = s.negative;
	for (let t of d) e.fillRect(t.x, t.y, t.w, t.h);
}
function Ln(e, t, n, r) {
	let i = (e) => Math.round(r(e)) + .5, a = Math.round(t + n / 2) + .5;
	return {
		stem: {
			x: a,
			yHigh: i(e.high),
			yLow: i(e.low)
		},
		openTick: {
			x0: t,
			x1: a,
			y: i(e.open)
		},
		closeTick: {
			x0: a,
			x1: t + n,
			y: i(e.close)
		}
	};
}
function Rn(e, t) {
	let { xScale: n, yPrice: r, bandwidth: i, renderStart: a, renderSlice: o, colors: s } = t, c = new Path2D(), l = new Path2D();
	for (let e = 0; e < o.length; e++) {
		let t = e + a, s = o[e], u = Ln(s, n(t), i, r), d = s.close >= s.open ? c : l;
		d.moveTo(u.stem.x, u.stem.yHigh), d.lineTo(u.stem.x, u.stem.yLow), d.moveTo(u.openTick.x0, u.openTick.y), d.lineTo(u.openTick.x1, u.openTick.y), d.moveTo(u.closeTick.x0, u.closeTick.y), d.lineTo(u.closeTick.x1, u.closeTick.y);
	}
	e.lineWidth = t.candle.wickWidth, e.strokeStyle = s.positive, e.stroke(c), e.strokeStyle = s.negative, e.stroke(l);
}
function zn(e, t) {
	if (t.indicators.length !== 0) for (let { config: n, series: r, meta: i } of t.indicators) {
		let a = q(n.defKey);
		if (!a) continue;
		let o = typeof a.pane == "object" && "subpane" in a.pane, s, c;
		if (o) {
			let e = a.pane.subpane, n = t.subpaneScales.get(e);
			if (!n) continue;
			s = n, c = n.range();
		} else s = t.yPrice, c = t.yPrice.range();
		let l = {
			xScale: t.xScale,
			yPrice: t.yPrice,
			y: (e) => s(e),
			bandwidth: t.bandwidth,
			data: t.data,
			renderStart: t.renderStart,
			renderEnd: t.renderEnd,
			paneTop: Math.min(...c),
			paneBottom: Math.max(...c)
		};
		a.draw(e, r, l, n.settings, t.resolveColor, i);
	}
}
//#endregion
//#region src/utils/resolveChartColors.ts
var Bn = "#888888";
function Vn(e) {
	let t = document.createElement("span");
	t.style.position = "absolute", t.style.width = "0", t.style.height = "0", t.style.visibility = "hidden", t.style.pointerEvents = "none", e.appendChild(t);
	let n = /* @__PURE__ */ new Map();
	return {
		resolve(e) {
			let r = n.get(e);
			if (r) return r;
			let i = Bn;
			try {
				t.style.color = "", t.style.color = e;
				let n = getComputedStyle(t).color;
				n && (i = n);
			} catch {
				i = Bn;
			}
			return n.set(e, i), i;
		},
		destroy() {
			n.clear(), t.remove();
		}
	};
}
//#endregion
//#region src/patterns/renderers/baseBreakout.ts
var Hn = 8, Un = 4, Wn = 10, Gn = 6;
function Kn(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function qn(e, t, n, r) {
	let i = e.markers;
	if (!Array.isArray(i?.levels) || i.levels.length === 0) return;
	let a = r.patternStyle.base_breakout, o = r.resolveColor, s = a.labelFontSize, c = null;
	for (let e of i.levels) {
		let n = A(r.bars, e.start), i = A(r.bars, e.end);
		if (n == null || i == null) continue;
		let s = Kn(n, r), l = Kn(i, r);
		if (s == null || l == null) continue;
		let u = r.yPrice(e.price), d = s + r.bandwidth / 2, f = l + r.bandwidth / 2;
		c = f, t.append("line").attr("class", "bb-resistance").attr("x1", d).attr("y1", u).attr("x2", f).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-dasharray", a.lineDash).attr("stroke-linecap", "round"), t.append("circle").attr("class", "bb-breakout-dot").attr("cx", f).attr("cy", u).attr("r", 3).attr("fill", o(a.dotFill));
		let p = Kn(Math.round((n + i) / 2), r);
		if (p != null && typeof e.base_days == "number" && typeof e.base_depth_pct == "number") {
			let n = p + r.bandwidth / 2, i = u - Gn;
			t.append("text").attr("class", "bb-stat").attr("x", n).attr("y", i).attr("text-anchor", "middle").attr("font-size", Wn).attr("fill", o(a.statColor)).attr("font-weight", 600).text(`${Math.round(e.base_days)}d · ${e.base_depth_pct.toFixed(1)}%`);
		}
	}
	let l = i.levels[0], u = r.yPrice(l.price), d = (Kn(r.dataLength - 1, r) ?? c ?? 0) + r.bandwidth + 2 * r.step + 4, f = s + 2 * Un, p = n.append("g").attr("class", "bb-label").attr("transform", `translate(${d},${u - f / 2})`), m = p.append("text").attr("class", "bb-label-text").attr("x", Hn).attr("y", f / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text("Base breakout").node(), h = (m ? m.getBBox().width : 91) + 2 * Hn;
	p.insert("rect", "text").attr("class", "bb-label-bg").attr("x", 0).attr("y", 0).attr("width", h).attr("height", f).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
//#endregion
//#region src/patterns/renderers/consolidation.ts
var Jn = 8, Yn = 4;
function Xn(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function Zn(e, t, n, r) {
	let i = e.markers;
	if (!i?.start_date || !i?.end_date || !Number.isFinite(i.range_high) || !Number.isFinite(i.range_low)) return;
	let a = r.patternStyle.consolidation, o = r.resolveColor, s = a.labelFontSize, c = A(r.bars, i.start_date), l = A(r.bars, i.end_date);
	if (c == null || l == null) return;
	let u = Xn(c, r), d = Xn(l, r);
	if (u == null || d == null) return;
	let f = u, p = d + r.bandwidth, m = r.yPrice(Math.max(i.range_high, i.range_low)), h = r.yPrice(Math.min(i.range_high, i.range_low));
	t.append("rect").attr("class", "consol-box").attr("x", f).attr("y", m).attr("width", Math.max(0, p - f)).attr("height", Math.max(0, h - m)).attr("fill", o(a.boxFill)).attr("fill-opacity", a.boxFillOpacity).attr("stroke", "none");
	let g = i.consolidation_days, _ = i.range_low > 0 ? (i.range_high - i.range_low) / i.range_low * 100 : null, v = ["Consolidation"];
	typeof g == "number" && v.push(`${Math.round(g)}d`), _ != null && v.push(`${_.toFixed(1)}%`);
	let y = v.join(" · ");
	typeof i.tightness == "number" && Number.isFinite(i.tightness) && (y += ` (${i.tightness.toFixed(2)}x ATR)`);
	let b = s + 2 * Yn, x = n.append("g").attr("class", "consol-label").style("display", "none"), S = (x.append("text").attr("class", "consol-label-text").attr("x", Jn).attr("y", b / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text(y).node()?.getBBox().width ?? y.length * 7) + 2 * Jn, C = (f + p) / 2;
	x.attr("transform", `translate(${C - S / 2},${h + 6})`), x.insert("rect", "text").attr("class", "consol-label-bg").attr("x", 0).attr("y", 0).attr("width", S).attr("height", b).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
	let w = x.node();
	w && r.registerHover?.({
		x0: f,
		x1: p,
		y0: m,
		y1: h,
		label: w
	});
}
//#endregion
//#region src/patterns/renderers/highTightFlag.ts
var Qn = 8, $n = 4;
function er(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function tr(e, t, n, r) {
	let i = e.markers;
	if (!i?.segments?.pole || !i?.segments?.flag) return;
	let a = r.patternStyle.high_tight_flag, o = r.resolveColor, s = a.labelFontSize, c = A(r.bars, i.segments.pole[0]), l = A(r.bars, i.segments.pole[1]), u = A(r.bars, i.segments.flag[0]), d = A(r.bars, i.segments.flag[1]);
	if (c == null || l == null || u == null || d == null) return;
	let f = er(c, r), p = er(l, r), m = er(u, r), h = er(d, r);
	if (f == null || p == null || m == null || h == null) return;
	let g = r.bars[c], _ = r.bars[l], v = r.yPrice(g.high), y = r.yPrice(_.high), b = -Infinity, x = Infinity;
	for (let e = u; e <= d; e++) {
		let t = r.bars[e];
		t.high > b && (b = t.high), t.low < x && (x = t.low);
	}
	if (!Number.isFinite(b) || !Number.isFinite(x)) return;
	let S = m, C = h + r.bandwidth, w = r.yPrice(b), T = r.yPrice(x), E = f + r.bandwidth / 2, D = p + r.bandwidth / 2;
	t.append("line").attr("class", "htf-pole").attr("x1", E).attr("y1", v).attr("x2", D).attr("y2", y).attr("stroke", o(a.poleColor)).attr("stroke-opacity", a.poleOpacity).attr("stroke-width", a.poleWidth).attr("stroke-linecap", "round"), t.append("rect").attr("class", "htf-flag").attr("x", S).attr("y", w).attr("width", Math.max(0, C - S)).attr("height", Math.max(0, T - w)).attr("fill", o(a.flagFill)).attr("fill-opacity", a.flagFillOpacity).attr("stroke", "none");
	let O = i.score, k = O != null && Number.isFinite(O) ? ` ${Math.round(O)}%` : "", ee = i.tier === "high" ? "High" : i.tier === "low" ? "Low" : null, te = `${ee ? `${ee} tight flag` : "Tight flag"}${k}`, ne = (er(r.dataLength - 1, r) ?? C) + r.bandwidth + 2 * r.step + 4, re = n.append("g").attr("class", "htf-label").attr("transform", `translate(${ne},${w})`), ie = s + 2 * $n, ae = re.append("text").attr("class", "htf-label-text").attr("x", Qn).attr("y", ie / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text(te).node(), oe = (ae ? ae.getBBox().width : te.length * 7) + 2 * Qn;
	re.insert("rect", "text").attr("class", "htf-label-bg").attr("x", 0).attr("y", 0).attr("width", oe).attr("height", ie).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
var nr = (e) => e + 8;
function rr(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function ir(e, t) {
	let { x: n, y: r, text: i, style: a, rc: o, center: s = !1, className: c } = t, l = a.labelFontSize, u = nr(l), d = e.append("g");
	c && d.attr("class", c);
	let f = (d.append("text").attr("x", 8).attr("y", u / 2).attr("dominant-baseline", "central").attr("font-size", l).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text(i).node()?.getBBox().width ?? i.length * 7) + 16;
	d.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", f).attr("height", u).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
	let p = s ? n - f / 2 : n;
	return d.attr("transform", `translate(${p},${r})`), {
		group: d,
		width: f,
		height: u
	};
}
function ar(e, t) {
	let { x: n, y: r, kind: i, color: a, opacity: o = 1, size: s = 6, rc: c } = t, l = c(a), u = s * 1.6;
	if (i === "dot") {
		e.append("circle").attr("cx", n).attr("cy", r).attr("r", s * .6).attr("fill", l).attr("fill-opacity", o);
		return;
	}
	let d;
	d = i === "arrowUp" ? `${n},${r} ${n - s},${r + u} ${n + s},${r + u}` : i === "arrowDown" ? `${n},${r} ${n - s},${r - u} ${n + s},${r - u}` : `${n},${r - s} ${n + s},${r} ${n},${r + s} ${n - s},${r}`, e.append("polygon").attr("points", d).attr("fill", l).attr("fill-opacity", o);
}
//#endregion
//#region src/patterns/renderers/gapUp.ts
var or = 3;
function sr(e, t, n, r) {
	let i = e.markers;
	if (!i?.gap_date || !Number.isFinite(i.prev_high) || !Number.isFinite(i.gap_low)) return;
	let a = r.patternStyle.gap_up, o = r.resolveColor, s = A(r.bars, i.gap_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth + or * r.step, u = r.yPrice(Math.max(i.prev_high, i.gap_low)), d = r.yPrice(Math.min(i.prev_high, i.gap_low));
	t.append("rect").attr("class", "gap-up-band").attr("x", c).attr("y", u).attr("width", Math.max(0, l - c)).attr("height", Math.max(0, d - u)).attr("fill", o(a.bandFill)).attr("fill-opacity", a.bandFillOpacity).attr("stroke", "none");
	let f = typeof i.gap_pct == "number" && Number.isFinite(i.gap_pct) ? ` · ${i.gap_pct.toFixed(1)}%` : "", p = (u + d) / 2;
	ir(n, {
		x: l + 6,
		y: p - nr(a.labelFontSize) / 2,
		text: `Gap up${f}`,
		style: a,
		rc: o,
		className: "gap-up-label"
	});
}
//#endregion
//#region src/patterns/renderers/volumeBreakout.ts
var cr = 6;
function lr(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_breakout, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + cr;
	ar(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	ir(n, {
		x: l,
		y: u + 6 * 1.6 + 4,
		text: `Vol breakout${d}`,
		style: a,
		rc: o,
		center: !0,
		className: "volume-breakout-label"
	});
}
//#endregion
//#region src/patterns/renderers/goldenCross.ts
function ur(e, t, n, r) {
	let i = e.markers;
	if (!i?.cross_date || !Number.isFinite(i.cross_price)) return;
	let a = r.patternStyle.golden_cross, o = r.resolveColor, s = A(r.bars, i.cross_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.cross_price);
	ar(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	}), ir(n, {
		x: l + 6 + 4,
		y: u - nr(a.labelFontSize) / 2,
		text: "Golden cross",
		style: a,
		rc: o,
		className: "golden-cross-label"
	});
}
//#endregion
//#region src/patterns/renderers/nr7.ts
var dr = 4;
function fr(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.bar_high) || !Number.isFinite(i.bar_low)) return;
	let a = r.patternStyle.nr7, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth, u = c + r.bandwidth / 2, d = r.yPrice(i.bar_high), f = r.yPrice(i.bar_low);
	for (let e of [d, f]) t.append("line").attr("class", "nr7-range").attr("x1", c).attr("y1", e).attr("x2", l).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let p = d - dr;
	ar(t, {
		x: u,
		y: p,
		kind: "arrowDown",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), ir(n, {
		x: u,
		y: p - 6 * 1.6 - nr(a.labelFontSize) - 2,
		text: "NR7",
		style: a,
		rc: o,
		center: !0,
		className: "nr7-label"
	});
}
//#endregion
//#region src/patterns/renderers/unusualVolume.ts
var pr = 8;
function mr(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.unusual_volume, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + pr;
	ar(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	ir(n, {
		x: l,
		y: u + 6 + 4,
		text: `Unusual vol${d}`,
		style: a,
		rc: o,
		center: !0,
		className: "unusual-volume-label"
	});
}
//#endregion
//#region src/patterns/renderers/volumeDryup.ts
var hr = 8;
function gr(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_dryup, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + hr;
	ar(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), ir(n, {
		x: l,
		y: u + 6 + 4,
		text: "Volume dry-up",
		style: a,
		rc: o,
		center: !0,
		className: "volume-dryup-label"
	});
}
//#endregion
//#region src/patterns/renderers/pocketPivot.ts
var _r = 6;
function vr(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.pocket_pivot, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + _r;
	ar(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), ir(n, {
		x: l,
		y: u + 6 * 1.6 + 4,
		text: "Pocket pivot",
		style: a,
		rc: o,
		center: !0,
		className: "pocket-pivot-label"
	});
}
//#endregion
//#region src/patterns/renderers/insideDay.ts
function yr(e, t, n, r) {
	let i = e.markers;
	if (!i?.inside_date || !i?.mother_date || !Number.isFinite(i.inside_high) || !Number.isFinite(i.inside_low) || !Number.isFinite(i.mother_high) || !Number.isFinite(i.mother_low)) return;
	let a = r.patternStyle.inside_day, o = r.resolveColor, s = A(r.bars, i.mother_date), c = A(r.bars, i.inside_date);
	if (s == null || c == null) return;
	let l = rr(s, r), u = rr(c, r);
	if (l == null || u == null) return;
	let d = l, f = u + r.bandwidth, p = r.yPrice(i.mother_high), m = r.yPrice(i.mother_low);
	for (let e of [p, m]) t.append("line").attr("class", "inside-day-mother").attr("x1", d).attr("y1", e).attr("x2", f).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let h = r.yPrice(Math.max(i.inside_high, i.inside_low)), g = r.yPrice(Math.min(i.inside_high, i.inside_low));
	t.append("rect").attr("class", "inside-day-box").attr("x", u).attr("y", h).attr("width", Math.max(0, r.bandwidth)).attr("height", Math.max(0, g - h)).attr("fill", "none").attr("stroke", o(a.boxStroke)).attr("stroke-opacity", a.boxStrokeOpacity).attr("stroke-width", a.boxStrokeWidth), ir(n, {
		x: f + 6,
		y: p - nr(a.labelFontSize) / 2,
		text: "Inside day",
		style: a,
		rc: o,
		className: "inside-day-label"
	});
}
//#endregion
//#region src/patterns/renderers/pullbackToEma.ts
function br(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.ema_value)) return;
	let a = r.patternStyle.pullback_to_ema, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = rr(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.ema_value);
	t.append("line").attr("class", "pullback-ema-tick").attr("x1", c).attr("y1", u).attr("x2", c + r.bandwidth).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round"), ar(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	});
	let d = i.ema_level ? ` ${i.ema_level}` : "";
	ir(n, {
		x: l + 6 + 4,
		y: u - nr(a.labelFontSize) / 2,
		text: `Pullback to${d}`,
		style: a,
		rc: o,
		className: "pullback-ema-label"
	});
}
//#endregion
//#region src/patterns/renderers/index.ts
var xr = {
	high_tight_flag: tr,
	base_breakout: qn,
	consolidation: Zn,
	gap_up: sr,
	volume_breakout: lr,
	golden_cross: ur,
	nr7: fr,
	unusual_volume: mr,
	volume_dryup: gr,
	pocket_pivot: vr,
	inside_day: yr,
	pullback_to_ema: br
}, Sr = (e) => `${e.pattern_name}:${e.detected_on}`;
function Cr(e) {
	let t = D.select(e), n = t.append("g").attr("class", "chart-pattern-overlay-clip").attr("clip-path", "url(#chart-price-viewport)"), r = n.append("g").attr("class", "chart-pattern-overlay"), i = t.append("g").attr("class", "chart-pattern-overlay-labels-clip"), a = i.append("g").attr("class", "chart-pattern-overlay-labels"), o = null, s = [], c = null, l = 0, u = () => {
		for (let e of s) {
			let t = !1;
			if (c) {
				let n = c.mx - l;
				t = n >= e.x0 && n <= e.x1 && c.my >= e.y0 && c.my <= e.y1;
			}
			e.label.style.display = t ? "" : "none";
		}
	}, d = (e, t) => {
		c = e == null || t == null ? null : {
			mx: e,
			my: t
		}, u();
	}, f = (e) => {
		l = e, r.attr("transform", `translate(${e},0)`), a.attr("transform", `translate(${e},0)`), u();
	}, p = (e) => {
		s = [], e.registerHover = (e) => s.push(e);
		let t = r.selectAll("g.chart-pattern-detection").data(e.detections, Sr);
		t.exit().remove();
		let n = t.enter().append("g").attr("class", "chart-pattern-detection").style("pointer-events", "none").merge(t), i = a.selectAll("g.chart-pattern-label-detection").data(e.detections, Sr);
		i.exit().remove();
		let o = i.enter().append("g").attr("class", "chart-pattern-label-detection").style("pointer-events", "none").merge(i);
		n.each(function(t, n) {
			let r = D.select(this), i = D.select(o.nodes()[n]);
			r.selectAll("*").remove(), i.selectAll("*").remove();
			let a = xr[t.pattern_name];
			a?.(t, r, i, e);
		}), u();
	};
	return {
		update: (e) => {
			p(e), o = e;
		},
		updateScales: (e) => {
			o && (o.xScale = e.xScale, o.yPrice = e.yPrice, o.step = e.step, o.bandwidth = e.bandwidth, o.baseTranslateX = e.baseTranslateX, o.width = e.width, o.priceHeight = e.priceHeight, o.dataLength = e.dataLength, l = e.baseTranslateX, f(e.baseTranslateX), p(o));
		},
		setTransform: f,
		setPointer: d,
		destroy: () => {
			n.remove(), i.remove();
		}
	};
}
//#endregion
//#region src/drawings/interaction.ts
var wr = {
	trendline: 2,
	ray: 2,
	ruler: 2,
	hline: 1,
	vline: 1,
	hray: 1,
	text: 1
};
function Tr(e) {
	return wr[e];
}
function Er(e, t, n) {
	switch (e) {
		case "trendline": return {
			id: n,
			type: e,
			a: t[0],
			b: t[1]
		};
		case "ray": return {
			id: n,
			type: e,
			a: t[0],
			b: t[1]
		};
		case "ruler": return {
			id: n,
			type: e,
			a: t[0],
			b: t[1]
		};
		case "hline": return {
			id: n,
			type: e,
			price: t[0].price
		};
		case "vline": return {
			id: n,
			type: e,
			date: t[0].date
		};
		case "hray": return {
			id: n,
			type: e,
			a: t[0]
		};
		case "text": return {
			id: n,
			type: e,
			a: t[0]
		};
	}
}
function Dr(e, t, n) {
	let { tool: r, makeId: i } = n;
	if (t.type === "escape") return {
		draft: { phase: "idle" },
		consumedPointer: e.phase !== "idle"
	};
	if (t.type === "up") return e.phase === "dragging" ? {
		draft: { phase: "idle" },
		commit: t.working ?? e.origin,
		consumedPointer: !0
	} : {
		draft: e,
		consumedPointer: e.phase !== "idle"
	};
	let { anchor: a, target: o } = t;
	if (e.phase === "placing") {
		let t = [...e.anchors, a];
		if (t.length >= Tr(e.tool)) {
			let n = Er(e.tool, t, i());
			return {
				draft: { phase: "idle" },
				commit: n,
				selectId: n.id,
				consumedPointer: !0
			};
		}
		return {
			draft: {
				phase: "placing",
				tool: e.tool,
				anchors: t
			},
			consumedPointer: !0
		};
	}
	if (r !== "cursor") {
		let e = r;
		if (Tr(e) === 1) {
			let t = Er(e, [a], i());
			return {
				draft: { phase: "idle" },
				commit: t,
				selectId: t.id,
				consumedPointer: !0
			};
		}
		return {
			draft: {
				phase: "placing",
				tool: e,
				anchors: [a]
			},
			consumedPointer: !0
		};
	}
	return o ? {
		draft: {
			phase: "dragging",
			id: o.id,
			grab: o.hit,
			origin: o.shape
		},
		selectId: o.id,
		consumedPointer: !0
	} : {
		draft: { phase: "idle" },
		selectId: null,
		consumedPointer: !1
	};
}
//#endregion
//#region src/drawings/projection.ts
function Or(e, t) {
	if (t.dataLength === 0) return 0;
	let n = A(t.data, e);
	return n == null ? e < t.data[0].date ? (t.xScale(0) ?? 0) + t.bandwidth / 2 : (t.xScale(t.dataLength - 1) ?? 0) + t.bandwidth / 2 : (t.xScale(n) ?? 0) + t.bandwidth / 2;
}
function kr(e, t) {
	let n = t.yPrice(e);
	return Number.isFinite(n) ? n : t.priceHeight;
}
function Ar(e, t) {
	if (t.dataLength === 0) return "";
	let n = t.xScale(0) ?? 0, r = Math.round((e - n - t.bandwidth / 2) / t.step);
	return r = Math.max(0, Math.min(t.dataLength - 1, r)), t.data[r].date;
}
function jr(e, t) {
	return t.yPrice.invert(e);
}
function Mr(e, t) {
	return {
		x: Or(e.date, t),
		y: kr(e.price, t)
	};
}
function Nr(e, t, n, r) {
	let i = t.x - e.x, a = t.y - e.y;
	if (i === 0 && a === 0) return {
		x2: t.x,
		y2: t.y
	};
	let o = Infinity;
	return i > 0 ? o = Math.min(o, (n - e.x) / i) : i < 0 && (o = Math.min(o, (0 - e.x) / i)), a > 0 ? o = Math.min(o, (r - e.y) / a) : a < 0 && (o = Math.min(o, (0 - e.y) / a)), Number.isFinite(o) || (o = 1), o = Math.max(o, 1), {
		x2: e.x + i * o,
		y2: e.y + a * o
	};
}
var Pr = 11;
function Fr(e, t, n, r, i, a) {
	let o = i - n, s = a - r, c = o * o + s * s;
	if (c === 0) return Math.hypot(e - n, t - r);
	let l = ((e - n) * o + (t - r) * s) / c;
	l = Math.max(0, Math.min(1, l));
	let u = n + l * o, d = r + l * s;
	return Math.hypot(e - u, t - d);
}
function Ir(e, t, n, r) {
	return Math.hypot(e - n.x, t - n.y) <= Pr ? {
		kind: "handle",
		index: 0
	} : Math.hypot(e - r.x, t - r.y) <= Pr ? {
		kind: "handle",
		index: 1
	} : Fr(e, t, n.x, n.y, r.x, r.y) <= 6 ? { kind: "body" } : null;
}
function Lr(e, t, n, r) {
	return Math.abs(t - n) <= 6 && e >= 0 && e <= r ? { kind: "body" } : null;
}
function Rr(e, t, n, r) {
	return Math.abs(e - n) <= 6 && t >= 0 && t <= r ? { kind: "body" } : null;
}
function zr(e, t, n) {
	return e >= n.x && e <= n.x + n.width && t >= n.y && t <= n.y + n.height ? { kind: "body" } : null;
}
function Br(e, t, n, r) {
	return Math.hypot(e - n.x, t - n.y) <= Pr ? {
		kind: "handle",
		index: 0
	} : Fr(e, t, n.x, n.y, r.x, r.y) <= 6 ? { kind: "body" } : null;
}
//#endregion
//#region src/drawings/renderers/_shared.ts
function Vr(e, t) {
	return e === 1 ? `${Math.max(4, t * 3)},${Math.max(3, t * 2)}` : e === 2 ? `${Math.max(1, t)},${Math.max(2, t * 2)}` : null;
}
function Hr(e) {
	return Kt(e.style);
}
function Ur(e, t, n, r) {
	e.append("circle").attr("cx", t).attr("cy", n).attr("r", 5).attr("fill", "#ffffff").attr("stroke", r).attr("stroke-width", 1.5).style("pointer-events", "none");
}
function Wr(e, t, n) {
	let r = Vr(t.style, t.width);
	e.attr("stroke", n(t.color)).attr("stroke-width", t.width).attr("stroke-opacity", t.opacity).attr("stroke-linecap", "round").style("pointer-events", "none"), r ? e.attr("stroke-dasharray", r) : e.attr("stroke-dasharray", null);
}
//#endregion
//#region src/drawings/renderers/trendline.ts
function Gr(e, t, n) {
	let r = Hr(e), i = Mr(e.a, n.s), a = Mr(e.b, n.s);
	if (Wr(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a.x).attr("y2", a.y), r, n.resolveColor), n.selected) {
		let e = n.resolveColor(r.color);
		Ur(t.label, i.x, i.y, e), Ur(t.label, a.x, a.y, e);
	}
	return (e, t, n) => Ir(e - n, t, i, a);
}
//#endregion
//#region src/drawings/renderers/ray.ts
function Kr(e, t, n) {
	let r = Hr(e), i = Mr(e.a, n.s), a = Mr(e.b, n.s), o = Nr(i, a, n.s.width, n.s.priceHeight);
	if (Wr(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", o.x2).attr("y2", o.y2), r, n.resolveColor), n.selected) {
		let e = n.resolveColor(r.color);
		Ur(t.label, i.x, i.y, e), Ur(t.label, a.x, a.y, e);
	}
	return (e, t, n) => {
		let r = e - n, s = Ir(r, t, i, a);
		return s && s.kind === "handle" ? s : Fr(r, t, i.x, i.y, o.x2, o.y2) <= 6 ? { kind: "body" } : null;
	};
}
//#endregion
//#region src/drawings/renderers/hline.ts
function qr(e, t, n) {
	let r = Hr(e), i = kr(e.price, n.s);
	if (i >= -2 && i <= n.s.priceHeight + 2) {
		let e = t.flat.append("line").attr("x1", 0).attr("y1", i).attr("x2", n.s.width).attr("y2", i);
		Wr(e, r, n.resolveColor), n.selected && e.attr("stroke-width", r.width + 1.5);
	}
	return (e, t) => Lr(e, t, i, n.s.width);
}
//#endregion
//#region src/drawings/renderers/vline.ts
function Jr(e, t, n) {
	let r = Hr(e), i = Or(e.date, n.s), a = t.pan.append("line").attr("x1", i).attr("y1", 0).attr("x2", i).attr("y2", n.s.priceHeight);
	return Wr(a, r, n.resolveColor), n.selected && a.attr("stroke-width", r.width + 1.5), (e, t, r) => Rr(e - r, t, i, n.s.priceHeight);
}
//#endregion
//#region src/drawings/renderers/hray.ts
function Yr(e, t, n) {
	let r = Hr(e), i = Mr(e.a, n.s), a = i.x + Math.max(n.s.width * 3, (n.s.dataLength + 50) * n.s.step);
	return Wr(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a).attr("y2", i.y), r, n.resolveColor), n.selected && Ur(t.label, i.x, i.y, n.resolveColor(r.color)), (e, t, n) => Br(e - n, t, i, {
		x: a,
		y: i.y
	});
}
//#endregion
//#region src/drawings/rulerStats.ts
function Xr(e, t, n) {
	let r = A(n, e.date), i = A(n, t.date), a = r != null && i != null ? Math.abs(i - r) : 0, o = t.price - e.price, s = e.price === 0 ? 0 : o / e.price * 100, c = o > 0 ? "up" : o < 0 ? "down" : "flat";
	return {
		bars: a,
		priceDelta: o,
		pricePct: s,
		startDate: e.date <= t.date ? e.date : t.date,
		endDate: e.date <= t.date ? t.date : e.date,
		direction: c
	};
}
//#endregion
//#region src/drawings/renderers/ruler.ts
function Zr(e, t, n) {
	let r = Hr(e), i = Mr(e.a, n.s), a = Mr(e.b, n.s), o = n.resolveColor;
	Wr(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a.x).attr("y2", a.y), r, o);
	let s = Xr(e.a, e.b, n.s.data), c = s.priceDelta >= 0 ? "+" : "", l = `${s.bars} bars  ${c}${s.priceDelta.toFixed(2)} (${c}${s.pricePct.toFixed(2)}%)`, u = t.label.append("g").attr("transform", `translate(${a.x + 8},${a.y - 18 - 4})`).style("pointer-events", "none"), d = u.append("text").attr("x", 6).attr("y", 4).attr("dominant-baseline", "hanging").attr("font-size", 10).attr("font-weight", 600).attr("fill", "#ffffff").text(l).node()?.getBBox().width ?? l.length * 6;
	if (u.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", d + 12).attr("height", 18).attr("rx", 3).attr("fill", o(r.color)).attr("fill-opacity", .85), n.selected) {
		let e = o(r.color);
		Ur(t.label, i.x, i.y, e), Ur(t.label, a.x, a.y, e);
	}
	return (e, t, n) => Ir(e - n, t, i, a);
}
//#endregion
//#region src/drawings/renderers/text.ts
function Qr(e, t, n) {
	let r = Hr(e), i = n.resolveColor, a = Mr(e.a, n.s), o = r.text || "Text", s = t.label.append("g").attr("transform", `translate(${a.x},${a.y})`).style("pointer-events", "none"), c = (s.append("text").attr("x", 6).attr("y", 4).attr("dominant-baseline", "hanging").attr("font-size", r.fontSize).attr("fill", i(r.color)).text(o).node()?.getBBox().width ?? o.length * 7) + 12, l = r.fontSize + 8;
	s.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", c).attr("height", l).attr("rx", 3).attr("fill", i(r.bgColor)).attr("fill-opacity", r.bgOpacity).attr("stroke", n.selected ? i(r.color) : "none").attr("stroke-width", +!!n.selected), n.selected && Ur(t.label, a.x, a.y, i(r.color));
	let u = {
		x: a.x,
		y: a.y,
		width: c,
		height: l
	};
	return (e, t, n) => zr(e - n, t, u);
}
//#endregion
//#region src/drawings/renderers/index.ts
function $r(e, t, n) {
	switch (e.type) {
		case "trendline": return Gr(e, t, n);
		case "ray": return Kr(e, t, n);
		case "hline": return qr(e, t, n);
		case "vline": return Jr(e, t, n);
		case "hray": return Yr(e, t, n);
		case "ruler": return Zr(e, t, n);
		case "text": return Qr(e, t, n);
		default: return () => null;
	}
}
//#endregion
//#region src/drawings/mountChartDrawingOverlay.ts
function ei(e) {
	let t = D.select(e), n = t.append("g").attr("class", "chart-drawing-clip").attr("clip-path", "url(#chart-price-viewport)"), r = n.append("g").attr("class", "chart-drawing-pan"), i = t.append("g").attr("class", "chart-drawing-flat"), a = t.append("g").attr("class", "chart-drawing-labels"), o = a.append("g").attr("class", "chart-drawing-labels-pan"), s = null, c = 0, l = [], u = (e) => {
		c = e, r.attr("transform", `translate(${e},0)`), o.attr("transform", `translate(${e},0)`);
	}, d = (e) => ({
		xScale: e.xScale,
		yPrice: e.yPrice,
		step: e.step,
		bandwidth: e.bandwidth,
		dataLength: e.dataLength,
		width: e.width,
		priceHeight: e.priceHeight,
		data: e.data
	}), f = (e) => {
		r.selectAll("*").remove(), i.selectAll("*").remove(), o.selectAll("*").remove(), l = [];
		let t = d(e), n = {
			pan: r,
			flat: i,
			label: o
		}, a = [...e.drawings].sort((t, n) => (t.id === e.selectedId) - +(n.id === e.selectedId));
		for (let r of a) {
			let i = $r(r, n, {
				s: t,
				resolveColor: e.resolveColor,
				selected: r.id === e.selectedId
			});
			l.push({
				id: r.id,
				locked: r.locked === !0,
				hit: i
			});
		}
		if (e.draft.phase === "placing" && e.draftPointer) {
			let r = Tr(e.draft.tool), i = [...e.draft.anchors];
			for (; i.length < r;) i.push(e.draftPointer);
			$r(Er(e.draft.tool, i, "__draft__"), n, {
				s: t,
				resolveColor: e.resolveColor,
				selected: !1
			});
		}
	};
	return {
		update: (e) => {
			s = e, c = e.baseTranslateX, u(e.baseTranslateX), f(e);
		},
		updateScales: (e) => {
			s && (s = {
				...s,
				...e
			}, c = e.baseTranslateX, u(e.baseTranslateX), f(s));
		},
		setTransform: u,
		setPointer: () => {},
		hitTest: (e, t) => {
			for (let n = l.length - 1; n >= 0; n--) {
				let r = l[n];
				if (r.locked) continue;
				let i = r.hit(e, t, c);
				if (i) return {
					id: r.id,
					hit: i
				};
			}
			return null;
		},
		destroy: () => {
			n.remove(), i.remove(), a.remove();
		}
	};
}
var ti = {
	drawingPopup: "_drawingPopup_1hh6n_3",
	drawingDeleteBtn: "_drawingDeleteBtn_1hh6n_21"
}, ni = {
	trendline: "Trend line",
	hline: "Horizontal line",
	vline: "Vertical line",
	hray: "Horizontal ray",
	ray: "Ray",
	text: "Text",
	ruler: "Ruler"
};
function ri({ shape: e, onChange: t, onDelete: n, resolveColor: r, onClose: a, style: o }) {
	let l = s(null), u = s(null), d = Kt(e.style), f = e.type === "text";
	i(() => {
		let e = (e) => {
			e.key === "Escape" && a();
		};
		return document.addEventListener("keydown", e), () => document.removeEventListener("keydown", e);
	}, [a]), i(() => {
		f && !e.style?.text && u.current?.focus();
	}, [e.id]);
	let p = (n) => t({
		...e,
		style: {
			...e.style,
			...n
		}
	}), m = (n) => {
		let r = { ...e.style };
		delete r[n], t({
			...e,
			style: r
		});
	}, [h, g] = c(e.style?.text ?? "");
	return i(() => g(e.style?.text ?? ""), [e.id, e.style?.text]), /* @__PURE__ */ E("div", {
		className: ti.drawingPopup,
		ref: l,
		style: o,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ E("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ T("span", {
				className: j.legendPopoverTitle,
				children: ni[e.type]
			}), /* @__PURE__ */ T("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: a,
				children: "×"
			})]
		}), /* @__PURE__ */ E("div", {
			className: j.panelScrollBody,
			children: [f ? /* @__PURE__ */ E(w, { children: [
				/* @__PURE__ */ E("label", {
					className: j.legendPopoverField,
					children: [/* @__PURE__ */ T("span", { children: "Text" }), /* @__PURE__ */ T("input", {
						ref: u,
						type: "text",
						value: h,
						spellCheck: !1,
						autoComplete: "off",
						onChange: (e) => {
							g(e.target.value), p({ text: e.target.value });
						}
					})]
				}),
				/* @__PURE__ */ T(an, {
					label: "Text color",
					colorExpr: e.style?.color ?? d.color,
					isOverridden: e.style?.color !== void 0,
					resolveColor: r,
					onCommit: (e) => p({ color: e }),
					onReset: () => m("color")
				}),
				/* @__PURE__ */ T(tn, {
					spec: {
						key: "fontSize",
						label: "Font size",
						kind: "number",
						default: d.fontSize,
						min: 6,
						max: 48,
						step: 1
					},
					value: d.fontSize,
					onCommit: (e) => p({ fontSize: e })
				}),
				/* @__PURE__ */ T(an, {
					label: "Background",
					colorExpr: e.style?.bgColor ?? d.bgColor,
					isOverridden: e.style?.bgColor !== void 0,
					resolveColor: r,
					onCommit: (e) => p({ bgColor: e }),
					onReset: () => m("bgColor")
				}),
				/* @__PURE__ */ T(on, {
					label: "Background opacity",
					value: d.bgOpacity,
					onCommit: (e) => p({ bgOpacity: e })
				})
			] }) : /* @__PURE__ */ E(w, { children: [
				/* @__PURE__ */ T(an, {
					label: "Color",
					colorExpr: e.style?.color ?? d.color,
					isOverridden: e.style?.color !== void 0,
					resolveColor: r,
					onCommit: (e) => p({ color: e }),
					onReset: () => m("color")
				}),
				/* @__PURE__ */ T(tn, {
					spec: {
						key: "width",
						label: "Width",
						kind: "number",
						default: d.width,
						min: .5,
						max: 10,
						step: .1
					},
					value: d.width,
					onCommit: (e) => p({ width: e })
				}),
				/* @__PURE__ */ T(nn, {
					spec: {
						key: "style",
						label: "Style",
						kind: "enum",
						default: d.style,
						options: _e
					},
					value: d.style,
					onChange: (e) => p({ style: e })
				}),
				/* @__PURE__ */ T(on, {
					label: "Opacity",
					value: d.opacity,
					onCommit: (e) => p({ opacity: e })
				})
			] }), /* @__PURE__ */ E("button", {
				type: "button",
				className: ti.drawingDeleteBtn,
				onClick: n,
				children: [/* @__PURE__ */ T(x, { size: 13 }), " Delete"]
			})]
		})]
	});
}
//#endregion
//#region src/context.tsx
function ii() {
	let e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Map(), n = {
		data: [],
		xScale: D.scaleBand(),
		yPrice: D.scaleLog(),
		subpaneScales: t,
		get ySub() {
			return this.subpaneScales.get("rs") ?? null;
		},
		step: 0,
		bandwidth: 0,
		baseTranslateX: 0,
		priceHeight: 0,
		width: 0,
		visibleBars: 0,
		visibleBarsInt: 0,
		visibleStartIdx: 0,
		dataLength: 0,
		indicators: [],
		subscribe(t) {
			return e.add(t), () => {
				e.delete(t);
			};
		}
	};
	return {
		api: n,
		notify: (t) => {
			for (let r of e) r(n, t);
		}
	};
}
var ai = t(null), oi = ai.Provider;
function si() {
	let e = r(ai);
	if (!e) throw Error("useChartScale must be used within a <Chart> (ChartScaleProvider)");
	return e;
}
var ci = t(null), li = ci.Provider;
function ui() {
	let e = r(ci);
	if (!e) throw Error("chart overlay hooks must be used within a <Chart> (ChartOverlayProvider)");
	return e;
}
function di(e) {
	let t = ui();
	return e === "trade" ? t.tradeHost : t.triggerHost;
}
function fi() {
	let e = ui();
	return {
		priceBottomPx: e.priceBottomPx,
		marginRight: e.marginRight
	};
}
function pi() {
	return ui().reportOverlayPriceBounds;
}
function mi() {
	return ui().subscribeBackgroundPointerDown;
}
//#endregion
//#region src/Chart.tsx
var $ = {
	top: 4,
	right: 60,
	bottom: 30,
	left: 0
}, hi = "'Helvetica Neue', Helvetica, Arial, sans-serif", gi = .13, _i = .45, vi = 24, yi = .08, bi = 18, xi = 12, Si = "currentColor", Ci = 10, wi = "var(--chart-tooltip-label)", Ti = D.format(",.0f"), Ei = 1.04;
function Di(e, t, n) {
	switch (e.type) {
		case "trendline":
		case "ray":
		case "ruler": return t === 0 ? {
			...e,
			a: n
		} : {
			...e,
			b: n
		};
		case "hray":
		case "text": return {
			...e,
			a: n
		};
		case "hline": return {
			...e,
			price: n.price
		};
		case "vline": return {
			...e,
			date: n.date
		};
		default: return e;
	}
}
function Oi(e, t, n, r) {
	let i = Mr(e, r);
	return {
		date: Ar(i.x + t, r),
		price: jr(i.y + n, r)
	};
}
function ki(e, t, n, r) {
	switch (e.type) {
		case "trendline":
		case "ray":
		case "ruler": return {
			...e,
			a: Oi(e.a, t, n, r),
			b: Oi(e.b, t, n, r)
		};
		case "hray":
		case "text": return {
			...e,
			a: Oi(e.a, t, n, r)
		};
		case "hline": return {
			...e,
			price: jr(kr(e.price, r) + n, r)
		};
		case "vline": return {
			...e,
			date: Ar(Or(e.date, r) + t, r)
		};
		default: return e;
	}
}
var Ai = e.memo(({ data: e, warmupSeed: t, benchmarkClose: r, quarterlyResults: u, subpaneHeights: d = null, onSubpaneHeightsChange: f, visibleBars: p, onVisibleBarsChange: h, onMaxVisibleBarsChange: g, panOffset: v, onPanOffsetChange: b, chartType: x, indicators: S, onIndicatorsChange: C, autoFitMode: O, onAutoFitModeChange: k, autoFitExcluded: ee, onAutoFitExcludedChange: te, infoBarExpanded: ne, onInfoBarExpandedChange: re, symbol: se, bare: ce, priceFormatter: le, patterns: ue, patternsEnabled: de, visiblePatterns: A, statsTable: fe, statsEnabled: M, statsMarket: N = "India", statsPosition: pe = null, onStatsPositionChange: P, statsSize: me = "small", appearance: he, onAppearanceChange: ge, drawings: _e, onDrawingsChange: ve, activeDrawingTool: F = "cursor", onActiveDrawingToolChange: ye, children: be }) => {
	let I = s(null), xe = s(null), Se = s(null), Ce = s(null), we = s(null), [L, Te] = c(0), [Ee, De] = c(0);
	a(() => {
		let e = I.current;
		if (!e) return;
		let t = e.getBoundingClientRect();
		t.width && Te(t.width), t.height && De(t.height);
	}, []);
	let Oe = e?.length ?? 0, R = o(() => Ht(he), [he]), ke = o(() => JSON.stringify(R.colors), [R]), Ae = o(() => JSON.stringify(R.background), [R]), je = o(() => JSON.stringify(R.candle), [R]), Me = o(() => JSON.stringify(R.axis), [R]), Ne = o(() => JSON.stringify(R.crosshair), [R]), Pe = o(() => JSON.stringify(R.patterns), [R]), [Fe, Ie] = c(0), [Le, Re] = c(!1), ze = s(null);
	ze.current ||= ii();
	let z = ze.current.api, Be = ze.current.notify, Ve = le ?? Ti, He = s(Ve);
	i(() => {
		He.current = Ve;
	}, [Ve]);
	let Ue = o(() => Oe > 0 ? D.range(Oe) : [], [Oe]), We = o(() => {
		let e = /* @__PURE__ */ new Set();
		for (let t of S) {
			if (!t.enabled) continue;
			let n = q(t.defKey)?.pane;
			n && typeof n == "object" && "subpane" in n && e.add(n.subpane);
		}
		let t = zt.filter((t) => e.has(t)), n = [...e].filter((e) => !zt.includes(e));
		return t.concat(n);
	}, [S]), [Ge, Ke] = c(d);
	i(() => {
		Ke(d);
	}, [d]);
	let qe = o(() => {
		let e = {};
		for (let t of S) {
			if (!t.enabled) continue;
			let n = q(t.defKey), r = n?.pane;
			if (!r || typeof r != "object" || !("subpane" in r)) continue;
			let i = n?.paneHeightFactor ?? 1;
			e[r.subpane] = Math.max(e[r.subpane] ?? 1, i);
		}
		return e;
	}, [S]), Je = o(() => ie(L), [L]), B = Math.max(10, Math.min(p, Je)), V = o(() => {
		if (!e || e.length === 0 || L === 0) return null;
		let t = Math.max(300, (Ee || 466) - $.top - $.bottom), n = -(B - 1), r = Math.max(0, e.length - B), i = Math.max(n, Math.min(v, r)), a = Math.max(0, Math.floor(e.length - B - i)), o = Math.min(e.length, Math.ceil(e.length - i)), s = e.slice(a, o);
		if (s.length === 0) return null;
		let c = Math.ceil(B), l = Math.max(0, a - c), u = Math.min(e.length, o + c), d = e.slice(l, u), { priceHeight: f, subpanes: p, fullHeight: m } = Mn({
			totalHeight: t,
			subpaneKeys: We,
			heightRatio: gi,
			floorRatio: _i,
			heightFactors: qe,
			userHeights: Ge ?? void 0
		}), h = L - $.left - $.right, g = (h - bi) / B, _ = (i + B - e.length) * g, y = D.scaleBand().domain(Ue).range([0, g * Math.max(1, e.length - .3)]).paddingInner(.3).paddingOuter(0);
		return {
			totalHeight: t,
			visStart: a,
			visEnd: o,
			visibleSlice: s,
			renderStart: l,
			renderEnd: u,
			renderSlice: d,
			priceHeight: f,
			fullHeight: m,
			subpanes: p,
			width: h,
			step: g,
			baseTranslateX: _,
			xScale: y,
			bandwidth: y.bandwidth(),
			visibleBarsInt: Math.floor(B),
			visibleStartIdx: Math.round(e.length - B - i),
			effectiveOffset: i
		};
	}, [
		e,
		B,
		v,
		L,
		Ee,
		Ue,
		We,
		qe,
		Ge
	]), H = o(() => {
		if (!e || e.length === 0) return [];
		let n = S.filter((e) => e.enabled);
		if (n.length === 0) return [];
		let i = t && t.length ? t : [], a = i.length ? i.concat(e) : e, o = {
			...Tn(a),
			bars: a
		};
		if (r) {
			let e = new Float64Array(a.length);
			for (let t = 0; t < a.length; t++) e[t] = r[a[t].date] ?? NaN;
			o.benchmarkClose = e;
		}
		u && (o.quarterlyResults = u), o.market = N;
		let s = i.length;
		return o.displayStart = s, n.map((e) => {
			let t = q(e.defKey);
			if (!t) return {
				config: e,
				series: {}
			};
			let { series: n, meta: r } = t.compute(o, e.settings), i = {};
			for (let e of Object.keys(n)) i[e] = s ? n[e].subarray(s) : n[e];
			return {
				config: e,
				series: i,
				meta: r
			};
		});
	}, [
		e,
		t,
		S,
		r,
		u,
		N
	]), Ye = o(() => !e || e.length === 0 ? null : jn(t && t.length ? t.concat(e) : e, fe, N), [
		e,
		t,
		fe,
		N
	]), U = s(null), W = n(() => {
		let e = Ce.current, t = U.current;
		!e || !t || Fn(e.ctx, {
			dpr: e.dpr,
			cssWidth: t.cssWidth,
			cssHeight: t.cssHeight,
			marginLeft: $.left,
			marginTop: $.top,
			marginBottom: $.bottom,
			rightBuffer: bi,
			width: t.width,
			fullHeight: t.fullHeight,
			priceHeight: t.priceHeight,
			bandwidth: t.bandwidth,
			baseTranslateX: z.baseTranslateX,
			renderStart: t.renderStart,
			renderEnd: t.renderEnd,
			renderSlice: t.renderSlice,
			chartType: t.chartType,
			xScale: z.xScale,
			yPrice: z.yPrice,
			subpaneScales: z.subpaneScales,
			data: t.data,
			colors: t.colors,
			background: t.background,
			candle: t.candle,
			indicators: t.indicators.map((e) => ({
				config: e.config,
				series: e.series,
				meta: e.meta
			})),
			resolveColor: (e) => we.current?.resolve(e) ?? "#888888"
		});
	}, [z]), Xe = o(() => V ? $.top + V.priceHeight : 0, [V]), G = s(null), Ze = n((e) => (t) => {
		V && (t.preventDefault(), t.stopPropagation(), t.currentTarget.setPointerCapture(t.pointerId), G.current = {
			index: e,
			startY: t.clientY,
			bands: V.subpanes,
			priceHeight: V.priceHeight,
			totalHeight: V.totalHeight,
			latest: null
		});
	}, [V]), Qe = n((e) => {
		let t = G.current;
		if (!t) return;
		let n = Nn({
			bands: t.bands,
			priceHeight: t.priceHeight,
			totalHeight: t.totalHeight,
			dividerIndex: t.index,
			dy: e.clientY - t.startY,
			minPanePx: vi,
			floorRatio: _i
		});
		t.latest = n, Ke(n);
	}, []), $e = n((e) => {
		let t = G.current;
		t && (e.currentTarget.releasePointerCapture?.(e.pointerId), G.current = null, t.latest && f?.(t.latest));
	}, [f]), [K, et] = c(1), tt = s(K);
	i(() => {
		tt.current = K;
	}, [K]);
	let [nt, rt] = c(!1), [it, at] = c(!1), [ot, st] = c(!1), ct = nt || it || ot, lt = s({
		active: !1,
		startX: 0,
		startOffset: 0,
		baseTx: 0,
		step: 1,
		minOff: 0,
		maxOff: 0
	}), ut = s(b);
	i(() => {
		ut.current = b;
	}, [b]);
	let dt = s(v);
	i(() => {
		dt.current = v;
	}, [v]);
	let ft = s(Je);
	ft.current = Je;
	let pt = s(h);
	i(() => {
		pt.current = h;
	}, [h]);
	let mt = s(g);
	i(() => {
		mt.current = g;
	}, [g]);
	let ht = s(null), gt = s(0), _t = s(null), vt = s(null), yt = s(null), bt = s(null), xt = s(null), St = s(null), Ct = s(null), wt = s(null), Tt = s(null), Et = s(null), Dt = s(null), Ot = s(null), kt = s(null), At = s(null), jt = s([]), Mt = s(null), Nt = s(null), Pt = s(null), Ft = s(null), It = s(null), Lt = s(null), Rt = s(null), J = s(null), Bt = s(null), Vt = s(/* @__PURE__ */ new Set()), Ut = n((e) => (Vt.current.add(e), () => {
		Vt.current.delete(e);
	}), []), Gt = s(null), Kt = s(null), qt = s(null), Y = s(null), Jt = s(F);
	i(() => {
		Jt.current = F;
	}, [F]);
	let X = s({ phase: "idle" }), Yt = s(null), Xt = s(null), [Zt, Qt] = c(null), $t = n((e) => {
		Xt.current = e, Qt(e);
	}, []), en = s(null), tn = s(null), nn = s(ve);
	i(() => {
		nn.current = ve;
	}, [ve]);
	let rn = s(ye);
	i(() => {
		rn.current = ye;
	}, [ye]);
	let an = o(() => (_e ?? []).map(Wt).filter((e) => e !== null), [_e]), on = s(an);
	on.current = an;
	let sn = n(() => ({
		xScale: z.xScale,
		yPrice: z.yPrice,
		step: z.step,
		bandwidth: z.bandwidth,
		dataLength: z.data.length,
		width: z.width,
		priceHeight: z.priceHeight,
		data: z.data
	}), [z]), cn = n((e, t) => {
		let n = sn();
		return {
			date: Ar(e - z.baseTranslateX, n),
			price: jr(t, n)
		};
	}, [sn, z]), Z = n(() => {
		let e = Y.current;
		!e || z.data.length === 0 || e.update({
			drawings: en.current ?? on.current,
			draft: X.current,
			draftPointer: Yt.current,
			selectedId: Xt.current,
			xScale: z.xScale,
			yPrice: z.yPrice,
			step: z.step,
			bandwidth: z.bandwidth,
			dataLength: z.data.length,
			width: z.width,
			priceHeight: z.priceHeight,
			data: z.data,
			baseTranslateX: z.baseTranslateX,
			marginTop: $.top,
			resolveColor: (e) => we.current?.resolve(e) ?? "#888888"
		});
	}, [z]), ln = n((e) => {
		let t = on.current, n = t.findIndex((t) => t.id === e.id) === -1 ? [...t, e] : t.map((t) => t.id === e.id ? e : t);
		nn.current?.(n);
	}, []), un = () => typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}-${Math.round(Math.random() * 1e9)}`, fn = n((e, t) => {
		let n = cn(e, t), r = Dr(X.current, {
			type: "down",
			anchor: n
		}, {
			tool: Jt.current,
			makeId: un
		});
		X.current = r.draft, r.selectId !== void 0 && $t(r.selectId), r.commit && (Yt.current = null, ln(r.commit), Jt.current !== "cursor" && (Jt.current = "cursor", rn.current?.("cursor"))), Z();
	}, [
		cn,
		$t,
		ln,
		Z
	]), pn = n((e, t, n) => {
		let r = on.current.find((t) => t.id === e.id);
		if (!r) return;
		let i = cn(t, n), a = Dr(X.current, {
			type: "down",
			anchor: i,
			target: {
				id: e.id,
				hit: e.hit,
				shape: r
			}
		}, {
			tool: "cursor",
			makeId: un
		});
		X.current = a.draft, a.selectId !== void 0 && $t(a.selectId), a.draft.phase === "dragging" && r.locked !== !0 && (tn.current = {
			id: r.id,
			grab: a.draft.grab,
			startMx: t,
			startMy: n,
			origin: r
		}, en.current = on.current.slice(), I.current && (I.current.style.cursor = "grabbing")), Z();
	}, [
		cn,
		$t,
		Z
	]), mn = o(() => Zt ? an.find((e) => e.id === Zt) ?? null : null, [Zt, an]);
	i(() => {
		let e = () => $t(null), t = kn.current;
		return t.add(e), () => {
			t.delete(e);
		};
	}, [$t]), i(() => {
		let e = (e) => {
			if (e.key === "Escape") {
				(X.current.phase !== "idle" || tn.current || Yt.current) && (X.current = Dr(X.current, { type: "escape" }, {
					tool: Jt.current,
					makeId: un
				}).draft, Yt.current = null, tn.current = null, en.current = null, Z());
				return;
			}
			if ((e.key === "Delete" || e.key === "Backspace") && Xt.current) {
				let t = e.target;
				if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
				let n = Xt.current;
				nn.current?.(on.current.filter((e) => e.id !== n)), $t(null);
			}
		};
		return document.addEventListener("keydown", e), () => document.removeEventListener("keydown", e);
	}, [$t, Z]), i(() => {
		let e = (e) => {
			let t = vt.current;
			if (!t) return;
			let n = tn.current;
			if (n) {
				let [r, i] = D.pointer(e, t.node()), a = sn(), o = n.grab && n.grab.kind === "handle" ? Di(n.origin, n.grab.index, cn(r, i)) : ki(n.origin, r - n.startMx, i - n.startMy, a);
				en.current = on.current.map((e) => e.id === n.id ? o : e), Z();
				return;
			}
			if (X.current.phase === "placing") {
				let [n, r] = D.pointer(e, t.node());
				Yt.current = cn(n, r), Z();
			}
		}, t = () => {
			let e = tn.current;
			if (!e) return;
			tn.current = null;
			let t = en.current?.find((t) => t.id === e.id) ?? null, n = Dr(X.current, {
				type: "up",
				working: t
			}, {
				tool: "cursor",
				makeId: un
			});
			X.current = n.draft, en.current = null, I.current && (I.current.style.cursor = ""), n.commit && ln(n.commit), Z();
		};
		return document.addEventListener("mousemove", e), document.addEventListener("mouseup", t), () => {
			document.removeEventListener("mousemove", e), document.removeEventListener("mouseup", t);
		};
	}, [
		sn,
		cn,
		Z,
		ln
	]);
	let [hn, gn] = c(null), [yn, bn] = c(null), [Q, xn] = c(null), [Sn, wn] = c(null), En = n((e, t) => {
		(e === "trade" ? xn : wn)((e) => e === t || e && t && e.min === t.min && e.max === t.max ? e : t);
	}, []), Dn = o(() => {
		let e = [], t = [];
		return Q && !ee.includes("trade") && (e.push(Q.min), t.push(Q.max)), Sn && !ee.includes("trigger") && (e.push(Sn.min), t.push(Sn.max)), e.length === 0 ? null : {
			min: Math.min(...e),
			max: Math.max(...t)
		};
	}, [
		Q,
		Sn,
		ee
	]), On = o(() => {
		let e = [], t = /* @__PURE__ */ new Set();
		for (let { config: n } of H) {
			let r = q(n.defKey);
			!r || typeof r.pane == "object" || t.has(n.defKey) || (t.add(n.defKey), e.push({
				key: n.defKey,
				label: r.longLabel ?? r.label
			}));
		}
		return Q != null && e.push({
			key: "trade",
			label: "Trade overlays"
		}), Sn != null && e.push({
			key: "trigger",
			label: "Trigger overlays"
		}), e;
	}, [
		H,
		Q,
		Sn
	]), kn = s(/* @__PURE__ */ new Set()), An = n((e) => {
		let t = kn.current;
		return t.add(e), () => {
			t.delete(e);
		};
	}, []), In = o(() => ({
		tradeHost: hn,
		triggerHost: yn,
		priceBottomPx: Xe,
		marginRight: $.right,
		reportOverlayPriceBounds: En,
		subscribeBackgroundPointerDown: An
	}), [
		hn,
		yn,
		Xe,
		En,
		An
	]);
	i(() => {
		let e = I.current;
		if (!e) return;
		let t, n = new ResizeObserver((e) => {
			t && clearTimeout(t), t = setTimeout(() => {
				let t = e[0]?.contentRect;
				t?.width && Te(t.width), t?.height && De(t.height);
			}, 150);
		});
		return n.observe(e), () => {
			t && clearTimeout(t), n.disconnect();
		};
	}, []);
	let Ln = V?.priceHeight ?? null;
	i(() => {
		if (Ln == null) return;
		let e = document.documentElement;
		return e.style.setProperty("--chart-price-height", `${Ln}px`), () => {
			e.style.removeProperty("--chart-price-height");
		};
	}, [Ln]), i(() => {
		let e = I.current;
		if (!e) return;
		let t = R.colors, n = Object.keys(t);
		for (let r of n) e.style.setProperty(`--${r}`, t[r]);
		let r = Vn(e);
		return we.current?.destroy(), we.current = r, Ie((e) => e + 1), () => {
			for (let t of n) e.style.removeProperty(`--${t}`);
			r.destroy(), we.current = null;
		};
	}, [ke]);
	let Rn = V?.totalHeight ?? null;
	i(() => {
		let e = Se.current;
		if (!e || Rn == null || L === 0) return;
		let t = L, n = Rn + $.top + $.bottom, r = null, i = () => a();
		function a() {
			let a = e;
			if (!a) return;
			let o = window.devicePixelRatio || 1;
			a.style.width = `${t}px`, a.style.height = `${n}px`, a.width = Math.round(t * o), a.height = Math.round(n * o);
			let s = a.getContext("2d");
			s && (s.setTransform(o, 0, 0, o, 0, 0), Ce.current = {
				ctx: s,
				dpr: o
			}, W()), r && r.removeEventListener("change", i), r = window.matchMedia(`(resolution: ${o}dppx)`), r.addEventListener("change", i);
		}
		return a(), () => {
			r && r.removeEventListener("change", i);
		};
	}, [
		L,
		Rn,
		W
	]), i(() => {
		let e = I.current;
		if (!e || !h) return;
		let t = 1, n = null;
		function r(e) {
			if (e.target?.closest?.("[data-chart-wheel-scroll]")) return;
			e.preventDefault();
			let r = e.deltaY > 0 ? Ei : 1 / Ei;
			t *= r, n ??= requestAnimationFrame(() => {
				n = null;
				let e = t;
				t = 1, h((t) => Math.min(ft.current, Math.max(10, t * e)));
			});
		}
		return e.addEventListener("wheel", r, { passive: !1 }), () => {
			e.removeEventListener("wheel", r), n != null && cancelAnimationFrame(n);
		};
	}, [h]), i(() => {
		let t = e?.length ?? 0;
		if (t === 0) return;
		let n = -(p - 1), r = Math.max(0, t - p);
		ut.current((e) => Math.max(n, Math.min(r, e)));
	}, [e?.length, p]), i(() => {
		L === 0 || !h || (p > Je || p < 10) && pt.current?.((e) => Math.min(Je, Math.max(10, e)));
	}, [
		Je,
		p,
		L,
		h
	]), i(() => {
		L === 0 || !g || mt.current?.(Je);
	}, [
		Je,
		L,
		g
	]);
	let [zn, Bn] = c(se);
	zn !== se && (Bn(se), K !== 1 && et(1)), i(() => {
		let e = () => {
			let e = lt.current;
			if (!e.active) return;
			e.active = !1, I.current && (I.current.style.cursor = ""), ht.current != null && (cancelAnimationFrame(ht.current), ht.current = null);
			let t = Math.round(gt.current / e.step), n = Math.max(e.minOff, Math.min(e.maxOff, e.startOffset + t));
			gt.current = 0, n === e.startOffset ? _t.current && (_t.current.setAttribute("transform", `translate(${e.baseTx},0)`), z.baseTranslateX = e.baseTx, Be("pan"), Kt.current?.setTransform(e.baseTx), Y.current?.setTransform(e.baseTx), W()) : ut.current(n);
		}, t = (t) => {
			let n = lt.current;
			if (n.active) {
				if (t.buttons === 0) {
					e();
					return;
				}
				gt.current = t.clientX - n.startX, ht.current ??= requestAnimationFrame(() => {
					ht.current = null;
					let e = n.baseTx + gt.current;
					_t.current && _t.current.setAttribute("transform", `translate(${e},0)`), z.baseTranslateX = e, Be("pan"), Kt.current?.setTransform(e), Y.current?.setTransform(e), W();
				});
			}
		};
		return document.addEventListener("mousemove", t), document.addEventListener("mouseup", e), () => {
			document.removeEventListener("mousemove", t), document.removeEventListener("mouseup", e), ht.current != null && (cancelAnimationFrame(ht.current), ht.current = null);
		};
	}, [
		z,
		Be,
		W
	]), i(() => {
		if (!xe.current) return;
		let e = D.select(xe.current);
		e.selectAll("*").remove();
		let t = e.append("g").attr("transform", `translate(${$.left},${$.top})`);
		vt.current = t;
		let n = t.append("defs");
		bt.current = n.append("clipPath").attr("id", "chart-viewport").append("rect").attr("x", 0).attr("y", -$.top), Lt.current = n.append("clipPath").attr("id", "chart-price-viewport").append("rect").attr("x", 0).attr("y", -$.top);
		let r = n.append("linearGradient").attr("id", "chart-bg-gradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
		r.append("stop").attr("offset", "0%").attr("stop-color", "#776a5a"), r.append("stop").attr("offset", "100%").attr("stop-color", "#6e7b8b");
		let i = n.append("linearGradient").attr("id", "chart-bg-gradient-user").attr("gradientUnits", "userSpaceOnUse");
		i.append("stop").attr("offset", "0%").attr("stop-color", "#6e7b8b"), i.append("stop").attr("offset", "100%").attr("stop-color", "#776a5a"), Rt.current = i, yt.current = t.append("rect").attr("x", -$.left).attr("y", -$.top).attr("rx", 12).attr("ry", 12).attr("fill", "transparent"), xt.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", hi).style("font-weight", "500").style("color", "var(--chart-axis-label)"), St.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", hi).style("font-weight", "500").style("color", "var(--chart-axis-label)").style("display", "none"), Ct.current = t.append("g").style("display", "none"), wt.current = t.append("g"), Tt.current = t.append("line").attr("y1", -$.top).attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), Gt.current = t.append("g").attr("class", "chart-pattern-overlays-container").node(), Kt.current = Cr(Gt.current);
		let a = t.append("g").attr("clip-path", "url(#chart-viewport)").append("g");
		Et.current = a, _t.current = a.node(), Dt.current = a.append("g").style("font-size", "var(--text-2hxs)").style("font-family", hi).style("font-weight", "500").style("color", "var(--chart-axis-label)"), Ot.current = t.append("line").attr("stroke", "currentColor").attr("stroke-opacity", .3).attr("stroke-dasharray", "3,3").attr("y1", 0).style("visibility", "hidden"), kt.current = t.append("line").attr("stroke", "currentColor").attr("stroke-opacity", .3).attr("stroke-dasharray", "3,3").attr("x1", 0).style("visibility", "hidden");
		let o = t.append("text").attr("x", 8).attr("y", 14).style("font-size", "var(--text-sm)").style("font-family", hi).style("font-weight", "500").attr("fill", "currentColor").style("visibility", "hidden");
		At.current = o, jt.current = [];
		for (let e = 0; e < xi; e++) jt.current.push(o.append("tspan"));
		let s = t.append("g").style("visibility", "hidden");
		Nt.current = s, s.append("rect").attr("width", 56).attr("height", 18).attr("rx", 3).attr("fill", "var(--bg-card)").attr("stroke", "currentColor").attr("stroke-opacity", .2), Pt.current = s.append("text").attr("x", 28).attr("y", 13).attr("text-anchor", "middle").style("font-size", "var(--text-3xs)").style("font-family", hi).style("font-weight", "500").attr("fill", "currentColor"), Ft.current = t.append("rect").attr("fill", "transparent"), It.current = t.append("rect").attr("fill", "transparent").style("cursor", "ns-resize").style("pointer-events", "all"), qt.current = t.append("g").attr("class", "chart-drawing-overlays-container").node(), Y.current = ei(qt.current);
		let c = t.append("g").attr("class", "trigger-overlays-container").node(), l = t.append("g").attr("class", "trade-overlays-container").node();
		return bn(c), gn(l), () => {
			J.current != null && (cancelAnimationFrame(J.current), J.current = null), Bt.current = null, e.selectAll("*").remove(), vt.current = null, yt.current = null, bt.current = null, xt.current = null, St.current = null, Ct.current = null, wt.current = null, Tt.current = null, Et.current = null, _t.current = null, Dt.current = null, Ot.current = null, kt.current = null, At.current = null, jt.current = [], Nt.current = null, Pt.current = null, Ft.current = null, It.current = null, Lt.current = null, Rt.current = null, bn(null), gn(null), Kt.current?.destroy(), Kt.current = null, Gt.current = null, Y.current?.destroy(), Y.current = null, qt.current = null;
		};
	}, []), i(() => {
		if (!e || !V || !xe.current || !vt.current || !Et.current) return;
		let { renderStart: t, renderEnd: n, priceHeight: r, fullHeight: i, subpanes: a, width: o, baseTranslateX: s, xScale: c, totalHeight: l } = V, u = l + $.top + $.bottom;
		D.select(xe.current).attr("width", L).attr("height", u), yt.current.attr("width", L).attr("height", i + $.top + $.bottom);
		let d = i + $.top + $.bottom;
		Rt.current.attr("x1", 0).attr("y1", -$.top).attr("x2", 0).attr("y2", -$.top + d), Rt.current.selectAll("stop").attr("stop-color", function() {
			return this.getAttribute("offset") === "0%" ? R.background.topColor : R.background.bottomColor;
		}), bt.current.attr("width", o - bi).attr("height", i + $.top + $.bottom), Lt.current.attr("width", o - bi).attr("height", $.top + r);
		let f = [];
		for (let r = Math.max(1, t); r < n; r++) e[r].date.slice(0, 7) !== e[r - 1].date.slice(0, 7) && f.push(r);
		xt.current.attr("transform", `translate(${o},0)`);
		let p = [];
		for (let e of a) p.push(e.top);
		a.length > 0 && p.push(i), wt.current.selectAll("line").data(p).join("line").attr("x1", 0).attr("x2", o).attr("y1", (e) => e).attr("y2", (e) => e).attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), Tt.current.attr("x1", o).attr("x2", o).attr("y2", i), Et.current.attr("transform", `translate(${s},0)`), Dt.current.attr("transform", `translate(0,${i})`).call(D.axisBottom(c).tickValues(f).tickSize(R.axis.tickSize).tickFormat((t) => {
			let n = e[t];
			if (!n) return "";
			let r = new Date(n.date);
			return D.timeFormat("%b %y")(r);
		})), Dt.current.select(".domain").remove(), Dt.current.selectAll("line").attr("stroke", Si).attr("stroke-opacity", R.axis.opacity), Ot.current.attr("y2", i), kt.current.attr("x2", o), Ft.current.attr("width", o).attr("height", i), It.current.attr("x", o).attr("y", 0).attr("width", $.right).attr("height", r);
	}, [
		V,
		L,
		e,
		We,
		Me,
		Ae
	]), i(() => {
		if (!e || !V || !xt.current) return;
		let { visibleSlice: t, visStart: n, visEnd: r, renderSlice: i, renderStart: a, renderEnd: o, priceHeight: s, fullHeight: c, subpanes: l, totalHeight: u, width: d, xScale: f, bandwidth: p, step: m, baseTranslateX: h, visibleBarsInt: g, visibleStartIdx: _ } = V, v = D.min(t, (e) => e.low) ?? 0, y = D.max(t, (e) => e.high) ?? 1;
		if (O === "priceAndOverlays") {
			for (let { config: e, series: t } of H) {
				let i = q(e.defKey);
				if (!i || typeof i.pane == "object" || ee.includes(e.defKey)) continue;
				let a = i.autofitKeys?.(e.settings) ?? Object.keys(t);
				for (let e of a) {
					let i = t[e];
					if (i) for (let e = n; e < r && e < i.length; e++) {
						let t = i[e];
						!Number.isNaN(t) && t > 0 && (t < v && (v = t), t > y && (y = t));
					}
				}
			}
			K === 1 && Dn && (v = Math.min(v, Dn.min), y = Math.max(y, Dn.max));
		}
		let b = Math.log(v), S = Math.log(y), C = (b + S) / 2, w = (S - b) / 2 / Math.max(.01, K), T = C - w, E = C + w, k = E - T, te = k * .06 || .01, ne = k * (K === 1 && O === "priceAndOverlays" ? .04 : .12) || .01, re = Math.exp(T - te), ie = Math.exp(E + ne), ae = D.scaleLog().domain([Math.max(1, re), ie]).range([s, 0]), [oe, se] = ae.domain(), ce = Math.log(oe), le = Math.log(se), ue = (e, t) => {
			if (e <= 0) return e;
			let n = 10 ** (Math.floor(Math.log10(e)) - (t - 1));
			return Math.round(e / n) * n;
		}, de = Array.from(new Set(D.range(Ci).map((e) => {
			let t = Math.exp(ce + e / (Ci - 1) * (le - ce));
			return ue(t, t >= 100 ? 3 : 2);
		}))).sort((e, t) => e - t).slice(0, -1), A = D.format(",.1f");
		xt.current.call(D.axisRight(ae).tickValues(de).tickSize(R.axis.tickSize).tickFormat((e) => A(Number(e)))), xt.current.select(".domain").remove(), xt.current.selectAll("line").attr("stroke", Si).attr("stroke-opacity", R.axis.opacity);
		let fe = /* @__PURE__ */ new Map(), j = /* @__PURE__ */ new Map(), M = /* @__PURE__ */ new Map();
		for (let e of H) {
			let t = q(e.config.defKey), n = t?.pane;
			if (!n || typeof n != "object" || !("subpane" in n)) continue;
			j.has(n.subpane) || j.set(n.subpane, t?.domain?.(e.series, e.config.settings) ?? void 0);
			let r = M.get(n.subpane) ?? [];
			r.push(e), M.set(n.subpane, r);
		}
		for (let e of l) {
			let t = j.get(e.key), i = [];
			for (let t of M.get(e.key) ?? []) {
				let e = q(t.config.defKey)?.autofitKeys?.(t.config.settings) ?? [];
				for (let n of e) {
					let e = t.series[n];
					e && i.push({
						values: e,
						isMarker: !1
					});
				}
			}
			let a = Pn({
				hint: t,
				lines: i,
				visStart: n,
				visEnd: r,
				defaultPad: yi
			});
			if (a) {
				let [n, r] = a, i = t?.topPadPx ?? 0, o = e.bottom - e.top;
				i > 0 && o > i && r > n && (r = n + (r - n) * (o / (o - i))), fe.set(e.key, D.scaleLinear().domain([n, r]).range([e.bottom, e.top]));
			}
		}
		if (St.current.selectAll("*").remove(), Ct.current.selectAll("*").remove(), fe.size > 0) {
			St.current.style("display", null), Ct.current.style("display", null);
			let e = D.format(".2~f");
			for (let t of l) {
				let n = fe.get(t.key);
				if (!n) continue;
				let r = j.get(t.key);
				if (!r?.hideAxis) {
					let t = r?.tickFormat ?? e, i = St.current.append("g").attr("transform", `translate(${d},0)`);
					i.call(D.axisRight(n).ticks(3).tickSize(R.axis.tickSize).tickFormat((e) => t(Number(e)))), i.select(".domain").remove(), i.selectAll("line").attr("stroke", Si).attr("stroke-opacity", R.axis.opacity);
				}
				let i = [...r?.guideLines ?? []];
				r?.zeroLine && i.push(0);
				for (let e of i) Ct.current.append("line").attr("x1", 0).attr("x2", d).attr("y1", n(e)).attr("y2", n(e)).attr("stroke", "var(--subpane-guide)").attr("stroke-opacity", .4).attr("stroke-dasharray", "3,3");
			}
		} else St.current.style("display", "none"), Ct.current.style("display", "none");
		z.data = e, z.subpaneScales = fe, z.xScale = f, z.yPrice = ae, z.step = m, z.bandwidth = p, z.visibleBars = B, z.visibleBarsInt = g, z.visibleStartIdx = _, z.priceHeight = s, z.width = d, z.baseTranslateX = h, z.dataLength = e.length, z.indicators = H, Be("rescale"), Kt.current?.updateScales({
			xScale: f,
			yPrice: ae,
			step: m,
			bandwidth: p,
			baseTranslateX: h,
			width: d,
			priceHeight: s,
			dataLength: e.length
		}), Y.current?.updateScales({
			xScale: f,
			yPrice: ae,
			step: m,
			bandwidth: p,
			dataLength: e.length,
			width: d,
			priceHeight: s,
			data: e,
			baseTranslateX: h
		});
		let N = (e) => we.current?.resolve(e) ?? "#888888";
		U.current = {
			cssWidth: L,
			cssHeight: u + $.top + $.bottom,
			width: d,
			fullHeight: c,
			priceHeight: s,
			bandwidth: p,
			renderStart: a,
			renderEnd: o,
			renderSlice: i,
			chartType: x,
			data: e,
			colors: {
				positive: N("var(--chart-positive)"),
				negative: N("var(--chart-negative)")
			},
			background: {
				topColor: N(R.background.topColor),
				bottomColor: N(R.background.bottomColor),
				radius: R.background.radius
			},
			candle: { wickWidth: R.candle.wickWidth },
			indicators: H
		}, W(), Bt.current || Mt.current?.();
	}, [
		V,
		H,
		K,
		x,
		e,
		B,
		O,
		ee,
		Dn,
		L,
		W,
		z,
		Be,
		Fe,
		Ae,
		je,
		Me
	]), i(() => {
		if (Oe === 0 || !_t.current || L === 0) return;
		let e = -(B - 1), t = Math.max(0, Oe - B), n = Math.max(e, Math.min(v, t)), r = (L - $.left - $.right - bi) / B, i = (n + B - Oe) * r;
		_t.current.setAttribute("transform", `translate(${i},0)`), z.baseTranslateX = i, Be("pan"), Kt.current?.setTransform(i), Y.current?.setTransform(i), W();
	}, [
		v,
		B,
		Oe,
		L,
		z,
		Be,
		W
	]);
	let Hn = o(() => {
		if (de === !1) return [];
		let e = ue ?? [];
		if (!A) return e;
		let t = new Set(A);
		return e.filter((e) => t.has(e.pattern_name));
	}, [
		ue,
		de,
		A ? [...A].sort().join(",") : "*"
	]);
	return i(() => {
		let e = Kt.current;
		!e || z.data.length === 0 || e.update({
			detections: Hn,
			bars: z.data,
			xScale: z.xScale,
			yPrice: z.yPrice,
			step: z.step,
			bandwidth: z.bandwidth,
			priceHeight: z.priceHeight,
			width: z.width,
			baseTranslateX: z.baseTranslateX,
			dataLength: z.data.length,
			marginTop: $.top,
			patternStyle: R.patterns,
			resolveColor: (e) => we.current?.resolve(e) ?? "#888888"
		});
	}, [
		Hn,
		V,
		z,
		Pe,
		Fe
	]), i(() => {
		Z();
	}, [
		an,
		Zt,
		V,
		z,
		Fe,
		Z
	]), i(() => {
		let e = Ot.current, t = kt.current;
		if (!(!e || !t)) for (let n of [e, t]) n.attr("stroke", R.crosshair.color).attr("stroke-opacity", R.crosshair.opacity).attr("stroke-dasharray", R.crosshair.dash);
	}, [Ne]), i(() => {
		let e = !1, t = 0, n = 1, r = null, i = 0, a = () => {
			r = null;
			let e = Math.exp(-i / 200);
			et(Math.max(.1, Math.min(20, n * e)));
		}, o = () => {
			e && (e = !1, I.current && (I.current.style.cursor = ""), r != null && (cancelAnimationFrame(r), r = null));
		}, s = (n) => {
			if (e) {
				if (n.buttons === 0) {
					o();
					return;
				}
				i = n.clientY - t, r ??= requestAnimationFrame(a);
			}
		};
		document.addEventListener("mousemove", s), document.addEventListener("mouseup", o);
		let c = () => {
			let r = It.current;
			r && (r.on("mousedown", function(r) {
				r.preventDefault(), r.stopPropagation(), e = !0, t = r.clientY, n = tt.current, I.current && (I.current.style.cursor = "ns-resize");
			}), r.on("dblclick", function(e) {
				e.preventDefault(), e.stopPropagation(), et(1);
			}), r.on("mouseenter", function() {
				rt(!0);
			}), r.on("mouseleave", function() {
				rt(!1);
			}));
		};
		c();
		let l = setTimeout(c, 0);
		return () => {
			clearTimeout(l), document.removeEventListener("mousemove", s), document.removeEventListener("mouseup", o);
			let e = It.current;
			e && e.on("mousedown", null).on("dblclick", null).on("mouseenter", null).on("mouseleave", null), r != null && cancelAnimationFrame(r);
		};
	}, []), i(() => {
		let e = Ft.current;
		if (!e) return;
		let t = (e) => {
			for (let t of Vt.current) t(e);
		}, n = (e) => {
			let t = z.data;
			if (t.length === 0) {
				At.current?.style("visibility", "hidden");
				return;
			}
			let n = e < 0 || e >= t.length ? t.length - 1 : e, r = t[n], i = n > 0 ? t[n - 1].close : r.open, a = r.close - i, o = (a / i * 100).toFixed(2), s = a >= 0 ? "+" : "", c = a >= 0 ? "var(--chart-positive)" : "var(--chart-negative)", l = [
				{
					text: `${r.date}  `,
					fill: c
				},
				{
					text: "O: ",
					fill: wi
				},
				{
					text: `${ae(r.open)}  `,
					fill: c
				},
				{
					text: "H: ",
					fill: wi
				},
				{
					text: `${ae(r.high)}  `,
					fill: c
				},
				{
					text: "L: ",
					fill: wi
				},
				{
					text: `${ae(r.low)}  `,
					fill: c
				},
				{
					text: "C: ",
					fill: wi
				},
				{
					text: `${ae(r.close)}  `,
					fill: c
				},
				{
					text: `${s}${o}%  `,
					fill: c
				},
				{
					text: "Vol: ",
					fill: wi
				},
				{
					text: oe(r.volume),
					fill: c
				}
			], u = jt.current;
			for (let e = 0; e < u.length; e++) u[e].text(l[e].text).attr("fill", l[e].fill);
			At.current.style("visibility", "visible");
		}, r = () => n(z.data.length - 1);
		Mt.current = r;
		let i = () => {
			Ot.current?.style("visibility", "hidden"), kt.current?.style("visibility", "hidden"), r(), t(null), Nt.current?.style("visibility", "hidden"), Kt.current?.setPointer(null, null);
		}, a = () => {
			J.current = null;
			let e = Bt.current;
			if (!e || z.data.length === 0) return;
			let { mx: i, my: a } = e;
			Kt.current?.setPointer(i, a);
			let { data: o, yPrice: s, step: c, bandwidth: l, visibleBarsInt: u, visibleStartIdx: d, priceHeight: f, width: p } = z;
			if (kt.current.attr("y1", a).attr("y2", a).style("visibility", "visible"), a <= f && i <= p) {
				let e = s.invert(a);
				Nt.current.attr("transform", `translate(${p + 2},${a - 9})`).style("visibility", "visible"), Pt.current.text(He.current(e));
			} else Nt.current.style("visibility", "hidden");
			let m = Math.floor(i / c);
			if (m < 0 || m >= u) {
				Ot.current.attr("x1", i).attr("x2", i).style("visibility", "visible"), r(), t(null);
				return;
			}
			let h = m * c + l / 2;
			Ot.current.attr("x1", h).attr("x2", h).style("visibility", "visible");
			let g = d + m;
			if (g < 0 || g >= o.length) {
				r(), t(null);
				return;
			}
			n(g), t(g);
		};
		e.on("mousedown", function(e) {
			if (e.preventDefault(), z.data.length === 0) return;
			let t = vt.current, [n, r] = t ? D.pointer(e, t.node()) : [0, 0];
			if (Jt.current !== "cursor") {
				fn(n, r);
				return;
			}
			let a = Y.current?.hitTest(n, r) ?? null;
			if (a) {
				pn(a, n, r);
				return;
			}
			for (let e of kn.current) e();
			lt.current = {
				active: !0,
				startX: e.clientX,
				startOffset: dt.current,
				baseTx: z.baseTranslateX,
				step: z.step,
				minOff: -(z.visibleBars - 1),
				maxOff: Math.max(0, z.data.length - z.visibleBars)
			}, gt.current = 0, J.current != null && (cancelAnimationFrame(J.current), J.current = null), Bt.current = null, i(), I.current && (I.current.style.cursor = "grabbing");
		});
		let o = D.select(xe.current);
		return o.on("mousemove.crosshair", function(e) {
			if (lt.current.active) return;
			let t = I.current;
			if (tn.current) return;
			if (Jt.current !== "cursor" || X.current.phase !== "idle") {
				t && (t.style.cursor = "crosshair");
				return;
			}
			let n = vt.current;
			if (!n) return;
			let [r, i] = D.pointer(e, n.node());
			if (t) {
				let e = Y.current?.hitTest(r, i);
				t.style.cursor = e ? "grab" : "";
			}
			Bt.current = {
				mx: r,
				my: i
			}, J.current ??= requestAnimationFrame(a);
		}).on("mouseleave.crosshair", function(e) {
			if (lt.current.active) return;
			!tn.current && I.current && (I.current.style.cursor = ""), J.current != null && (cancelAnimationFrame(J.current), J.current = null);
			let t = e.relatedTarget;
			if (t && typeof t.closest == "function" && (t.closest("[data-chart-legend]") || t.closest("[data-chart-stats]"))) {
				Ot.current?.style("visibility", "hidden"), kt.current?.style("visibility", "hidden"), Nt.current?.style("visibility", "hidden");
				return;
			}
			Bt.current = null, i();
		}), Bt.current || r(), () => {
			e.on("mousedown", null), o.on("mousemove.crosshair", null).on("mouseleave.crosshair", null), J.current != null && (cancelAnimationFrame(J.current), J.current = null);
		};
	}, [
		z,
		fn,
		pn
	]), !e || e.length === 0 ? /* @__PURE__ */ T("div", {
		className: ce ? j.chartWrapperBare : j.chartWrapper,
		ref: I,
		children: /* @__PURE__ */ T("div", {
			className: j.empty,
			children: se ? /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T(l, {
				size: 32,
				className: j.emptyIcon
			}), "No data available"] }) : /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T(m, {
				size: 32,
				className: j.emptyIcon
			}), "Select a stock to view chart"] })
		})
	}) : /* @__PURE__ */ T(oi, {
		value: z,
		children: /* @__PURE__ */ T(li, {
			value: In,
			children: /* @__PURE__ */ E("div", {
				className: ce ? j.chartWrapperBare : j.chartWrapper,
				ref: I,
				"data-trade-overlay-anchor": "",
				children: [
					/* @__PURE__ */ T("canvas", {
						ref: Se,
						className: j.seriesCanvas,
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ T("svg", {
						ref: xe,
						className: j.chartSvg
					}),
					V != null && /* @__PURE__ */ T(_n, {
						indicators: S,
						onIndicatorsChange: C,
						resolved: H,
						subpanes: V.subpanes,
						marginTop: $.top,
						marginLeft: $.left,
						barCount: Oe,
						expanded: ne,
						onExpandedChange: re,
						subscribeHoverIndex: Ut,
						priceFormatter: Ve,
						resolveColor: (e) => we.current?.resolve(e) ?? "#888888"
					}),
					V != null && V.subpanes.map((e, t) => {
						let n = $.top + e.top;
						return /* @__PURE__ */ T("div", {
							className: j.subpaneDivider,
							style: {
								top: n - 8 / 2,
								height: 8
							},
							onPointerDown: Ze(t),
							onPointerMove: Qe,
							onPointerUp: $e,
							children: /* @__PURE__ */ T("span", { className: j.subpaneDividerLine })
						}, e.key);
					}),
					M !== !1 && Ye && Oe > 0 && /* @__PURE__ */ T(Cn, {
						model: Ye,
						size: me,
						marginRight: $.right,
						position: pe ?? null,
						onPositionChange: P
					}),
					Xe > 0 && /* @__PURE__ */ T("button", {
						type: "button",
						className: `${j.resetPanBtn} ${v === 0 ? j.resetPanBtnInactive : ""}`,
						title: "Reset pan",
						onClick: () => b(0),
						disabled: v === 0,
						style: {
							top: Xe - 26,
							right: $.right + 2
						},
						children: /* @__PURE__ */ T(_, { size: 14 })
					}),
					Xe > 0 && ct && /* @__PURE__ */ T("button", {
						type: "button",
						className: `${j.autoFitBtn} ${K === 1 ? j.autoFitBtnActive : ""}`,
						title: K === 1 ? O === "priceAndOverlays" ? "Auto-fit: price + overlays (click for price-only)" : "Auto-fit: price-only (click to include overlays)" : "Auto-fit price scale (off — drag y-axis to enable)",
						onMouseDown: (e) => e.stopPropagation(),
						onClick: () => {
							if (st(!1), K !== 1) {
								et(1);
								return;
							}
							k(O === "priceAndOverlays" ? "price" : "priceAndOverlays");
						},
						onContextMenu: (e) => {
							e.preventDefault(), O === "priceAndOverlays" && K === 1 && st((e) => !e);
						},
						onMouseEnter: () => at(!0),
						onMouseLeave: () => at(!1),
						style: {
							top: Xe - 26,
							right: $.right - 26,
							color: K === 1 && O === "priceAndOverlays" ? "#22c55e" : void 0
						},
						children: "A"
					}),
					ot && O === "priceAndOverlays" && K === 1 && /* @__PURE__ */ T(vn, {
						contributors: On,
						excluded: ee,
						onExcludedChange: te,
						onClose: () => st(!1),
						style: {
							top: Xe - 30,
							right: $.right - 26,
							transform: "translateY(-100%)"
						}
					}),
					ge && /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T("button", {
						type: "button",
						className: j.settingsGearBtn,
						title: "Chart settings",
						onMouseDown: (e) => e.stopPropagation(),
						onClick: () => Re((e) => !e),
						style: {
							right: 4,
							bottom: 4
						},
						children: /* @__PURE__ */ T(y, { size: 14 })
					}), Le && /* @__PURE__ */ T(dn, {
						appearance: he ?? {},
						onAppearanceChange: ge,
						resolveColor: (e) => we.current?.resolve(e) ?? "#888888",
						onClose: () => Re(!1),
						style: {
							right: $.right + 4,
							bottom: $.bottom + 4
						}
					})] }),
					ve && mn && /* @__PURE__ */ T(ri, {
						shape: mn,
						onChange: (e) => ln(e),
						onDelete: () => {
							ve(an.filter((e) => e.id !== mn.id)), $t(null);
						},
						resolveColor: (e) => we.current?.resolve(e) ?? "#888888",
						onClose: () => $t(null),
						style: {
							left: 8,
							bottom: $.bottom + 8
						}
					}),
					be
				]
			})
		})
	});
}), ji = j.resetPanBtn;
//#endregion
export { J as APPEARANCE_DEFAULTS, Ai as Chart, Xt as ChartControls, Gt as DRAWING_DEFAULTS, _e as LINE_STYLE_OPTIONS, ee as MIN_BAR_STEP_PX, te as MIN_VISIBLE_BARS, Rt as OVERLAY_ORDER, ue as PATTERN_CATALOG, de as PATTERN_NAMES, O as RANGES, k as RANGE_DAYS, zt as SUBPANE_ORDER, dn as SettingsDialog, pn as ZoomSlider, A as barIndexForDate, lt as computeAdx, ct as computeAtr, st as computeDx, Ce as computeEMA, L as computeExpandingMax, we as computeRollingHigh, le as computeVolumeStats, ve as dashFor, fe as dateForBarIndex, Ft as defaultConfigFor, Qe as dema, Ht as effectiveAppearance, Kt as effectiveDrawingStyle, G as emaTalib, Lt as formatIndicatorParams, ae as formatPrice, oe as formatVolume, se as formatVolumeTick, q as getIndicator, F as lineStyleFrom, Mt as listIndicators, K as maDispatch, ie as maxVisibleBarsForWidth, Wt as normalizeDrawing, ji as panButtonClass, ut as rawStochK, jt as registerIndicator, rt as rollingMax, it as rollingMin, ot as rsi, W as sma, dt as stddevPop, $e as tema, at as trueRange, mi as useBackgroundPointerDown, fi as useChartGeometry, di as useChartOverlayHost, si as useChartScale, pi as useReportOverlayPriceBounds, tt as wilderSmooth, nt as wilderSum, Xe as wma };
