import e, { createContext as t, useCallback as n, useContext as r, useEffect as i, useLayoutEffect as a, useMemo as o, useRef as s, useState as c } from "react";
import { Fragment as l, jsx as u, jsxs as d } from "react/jsx-runtime";
import { BarChart3 as f, ChevronDown as p, ChevronUp as m, MousePointerClick as h, RotateCcw as g, Settings as _ } from "lucide-react";
import * as v from "d3";
//#region src/types.ts
var y = [
	"3M",
	"6M",
	"1Y",
	"2Y",
	"3Y",
	"5Y"
], b = {
	"3M": 66,
	"6M": 132,
	"1Y": 252,
	"2Y": 504,
	"3Y": 756,
	"5Y": 1260
}, x = 2, S = 10, C = 78;
function w(e) {
	return Math.floor((e - C) / 2);
}
function T(e) {
	let t = w(e), n = Object.values(b).sort((e, t) => e - t).filter((e) => e <= t);
	return n.length ? Math.max(...n) : Math.max(10, t);
}
var E = (e) => e == null ? "" : e.toLocaleString("en-IN", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), D = (e) => e == null ? "" : e >= 1e9 ? (e / 1e9).toFixed(2) + "B" : e >= 1e6 ? (e / 1e6).toFixed(2) + "M" : e >= 1e3 ? (e / 1e3).toFixed(0) + "K" : e.toString(), O = (e) => e == null ? "" : e >= 1e9 ? Math.round(e / 1e9) + "B" : e >= 1e6 ? Math.round(e / 1e6) + "M" : e >= 1e3 ? Math.round(e / 1e3) + "K" : e.toString(), k = 1440 * 60 * 1e3;
function ee(e, t = 30, n = 365) {
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
	let l = new Date(e[r - 1].date).getTime() - n * k, u = -1, d = 0;
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
var A = [
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
], te = A.map((e) => e.name);
//#endregion
//#region src/utils/dateBarIndex.ts
function j(e, t) {
	if (e.length === 0 || t < e[0].date || t > e[e.length - 1].date) return null;
	let n = 0, r = e.length - 1;
	for (; n <= r;) {
		let i = n + r >>> 1, a = e[i].date;
		if (a === t) return i;
		a < t ? n = i + 1 : r = i - 1;
	}
	return n - 1;
}
function ne(e, t) {
	return e.length === 0 ? "" : e[Math.max(0, Math.min(e.length - 1, t))].date;
}
var M = {
	chartWrapper: "_chartWrapper_p921i_1",
	chartWrapperBare: "_chartWrapperBare_p921i_14",
	seriesCanvas: "_seriesCanvas_p921i_27",
	chartSvg: "_chartSvg_p921i_34",
	empty: "_empty_p921i_42",
	emptyIcon: "_emptyIcon_p921i_52",
	resetPanBtn: "_resetPanBtn_p921i_57",
	resetPanBtnInactive: "_resetPanBtnInactive_p921i_84",
	autoFitBtn: "_autoFitBtn_p921i_93",
	autoFitBtnActive: "_autoFitBtnActive_p921i_118",
	subpaneDivider: "_subpaneDivider_p921i_129",
	subpaneDividerLine: "_subpaneDividerLine_p921i_140",
	legend: "_legend_p921i_156",
	legendBlock: "_legendBlock_p921i_164",
	legendItem: "_legendItem_p921i_172",
	legendValues: "_legendValues_p921i_191",
	legendToggle: "_legendToggle_p921i_200",
	legendDot: "_legendDot_p921i_218",
	legendLabel: "_legendLabel_p921i_225",
	legendBtn: "_legendBtn_p921i_230",
	legendPopover: "_legendPopover_p921i_258",
	legendPopoverHeader: "_legendPopoverHeader_p921i_275",
	legendPopoverTitle: "_legendPopoverTitle_p921i_295",
	legendPopoverSummary: "_legendPopoverSummary_p921i_305",
	legendPopoverClose: "_legendPopoverClose_p921i_311",
	panelScrollBody: "_panelScrollBody_p921i_333",
	legendPopoverField: "_legendPopoverField_p921i_341",
	legendColorField: "_legendColorField_p921i_418",
	legendColorControls: "_legendColorControls_p921i_431",
	legendColorHex: "_legendColorHex_p921i_463",
	lineFieldControls: "_lineFieldControls_p921i_493",
	lineFieldSelect: "_lineFieldSelect_p921i_522",
	lineFieldWidth: "_lineFieldWidth_p921i_535",
	lineFieldOpacity: "_lineFieldOpacity_p921i_556",
	sliderControl: "_sliderControl_p921i_561",
	sliderValue: "_sliderValue_p921i_571",
	settingsGearBtn: "_settingsGearBtn_p921i_579",
	settingsDialog: "_settingsDialog_p921i_606",
	settingsSectionTitle: "_settingsSectionTitle_p921i_624",
	settingsGroupTitle: "_settingsGroupTitle_p921i_638"
}, N = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
function P(e, t, n) {
	if (!e || t < 0 || t >= e.length) return "";
	let r = e[t];
	return Number.isNaN(r) ? "" : n(r);
}
function re(e, t, n, r, i) {
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
function F(e, t, n, r) {
	for (let i of r) {
		let r = t[i.key];
		r && re(e, n, r, i.st, (e) => !Number.isNaN(r[e]));
	}
}
function ie(e, t, n, r, i) {
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
function ae(e, t, n, r, i, a = 2.5) {
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
var oe = [
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
], se = [
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
function ce(e) {
	return e === 1 ? [4, 3] : e === 2 ? [1, 2] : null;
}
//#endregion
//#region src/indicators/lineSettings.ts
function I(e, t, n) {
	return {
		color: n(String(e[`${t}Color`])),
		width: Number(e[`${t}Width`]),
		dash: ce(Number(e[`${t}Style`])),
		opacity: Number(e[`${t}Opacity`])
	};
}
//#endregion
//#region src/indicators/builtins/rollingHigh.ts
function le(e, t) {
	let n = new Float64Array(e.length);
	for (let r = 0; r < e.length; r++) n[r] = e[r][t] ?? NaN;
	return n;
}
function ue(e, t, n, r) {
	let i = n[e][t];
	if (Number.isNaN(i)) return !1;
	let a = r[t];
	if (a && i === a.high) return !1;
	if (e === "highAll") return !0;
	let o = n[e === "high1y" ? "high2y" : e === "high2y" ? "high3y" : "highAll"][t];
	return Number.isNaN(o) ? !1 : Math.abs(i - o) / o > .01;
}
var de = [
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
], fe = {
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
		high1y: le(e.bars, "high1y"),
		high2y: le(e.bars, "high2y"),
		high3y: le(e.bars, "high3y"),
		highAll: le(e.bars, "highAll")
	} }),
	draw: (e, t, n, r, i) => {
		for (let a of de) {
			let o = t[a.key];
			o && re(e, n, o, I(r, a.key, i), (e) => ue(a.key, e, t, n.data));
		}
	},
	autofitKeys: () => [
		"high1y",
		"high2y",
		"high3y",
		"highAll"
	],
	legend: (e, t, n, r) => de.map((i) => ({
		color: String(n[`${i.key}Color`]),
		label: i.label,
		value: P(e[i.key], t, r.priceFmt)
	}))
}, pe = (e) => Math.round(e * 100) / 100;
function L(e, t) {
	let n = e.length, r = new Float64Array(n), i = 2 / (t + 1), a = NaN;
	for (let t = 0; t < n; t++) {
		let n = e[t];
		if (Number.isNaN(n)) {
			r[t] = NaN, a = NaN;
			continue;
		}
		a = Number.isNaN(a) ? n : i * n + (1 - i) * a, r[t] = pe(a);
	}
	return r;
}
function me(e, t) {
	let n = e.length, r = new Float64Array(n), i = [], a = 0;
	for (let o = 0; o < n; o++) {
		let n = e[o];
		if (Number.isNaN(n)) {
			r[o] = NaN;
			continue;
		}
		for (; i.length - a > 0 && i[a] <= o - t;) a++;
		for (; i.length - a > 0 && e[i[i.length - 1]] <= n;) i.pop();
		i.push(o), r[o] = pe(e[i[a]]);
	}
	return r;
}
function he(e) {
	let t = e.length, n = new Float64Array(t), r = NaN;
	for (let i = 0; i < t; i++) {
		let t = e[i];
		if (Number.isNaN(t)) {
			n[i] = NaN;
			continue;
		}
		r = Number.isNaN(r) ? t : Math.max(r, t), n[i] = pe(r);
	}
	return n;
}
//#endregion
//#region src/indicators/builtins/rsLine.ts
var ge = (e) => Math.round(e * 100) / 100, _e = {
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
		for (let e = 0; e < n; e++) r[e] = Number.isNaN(o[e]) ? NaN : ge(o[e] * c);
		let l = me(r, t.lookback), u = me(e.h, t.lookback);
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
		a && (re(e, n, a, I(r, "line", i), (e) => !Number.isNaN(a[e])), o && ae(e, n, a, {
			color: i(r.signalColor),
			width: 1.3
		}, (e) => o[e] === 1 && !Number.isNaN(a[e])));
	},
	autofitKeys: () => ["rs"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "RS",
		value: P(e.rs, t, N)
	}]
}, R = 12, ve = .18, ye = {
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
		let { xScale: o, bandwidth: s, renderStart: c, renderEnd: l } = n, u = Math.max(...n.yPrice.range()) - R;
		e.save(), e.fillStyle = i(r.bandColor), e.globalAlpha = ve;
		let d = -1, f = (t) => {
			let n = o(d), r = o(t) + s;
			e.fillRect(n, u, r - n, R);
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
}, be = 40, z = 70, B = 65, xe = "500 10px 'Helvetica Neue', Helvetica, Arial, sans-serif", Se = 864e5, Ce = 365 * Se, we = 48, Te = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), Ee = (e) => `${e >= 0 ? "+" : ""}${e.toFixed(1)}%`;
function De(e, t) {
	let n = e.length, r = new Float64Array(n);
	r.fill(NaN);
	let i = e.map((e) => new Date(e.date).getTime());
	for (let a = 0; a < n; a++) {
		let o = e[a][t];
		if (o == null || !Number.isFinite(o)) continue;
		let s = i[a] - Ce, c = -1, l = Infinity;
		for (let e = 0; e < n; e++) {
			let t = Math.abs(i[e] - s) / Se;
			t <= be && t < l && (l = t, c = e);
		}
		if (c < 0) continue;
		let u = e[c][t];
		u == null || !Number.isFinite(u) || u === 0 || (r[a] = (o - u) / Math.abs(u) * 100);
	}
	return r;
}
function Oe(e, t) {
	let n = Array(e.length).fill(!1), r = Infinity;
	for (let i = e.length - 1; i >= 0; i--) (r === Infinity || Math.abs(r - e[i]) >= t) && (n[i] = !0, r = e[i]);
	return n;
}
function ke(e) {
	let t = [...e.quarterlyResults ?? []].sort((e, t) => e.date < t.date ? -1 : +(e.date > t.date)), n = De(t, "eps"), r = De(t, "rps"), i = e.market === "US" ? "$" : "₹", a = t.map((e, t) => {
		let a = e.eps == null ? NaN : e.eps, o = e.rps == null ? NaN : e.rps, s = n[t], c = r[t];
		return {
			label: e.label,
			eps: a,
			rps: o,
			epsText: Number.isFinite(a) ? i + Te(a) : "--",
			rpsText: Number.isFinite(o) ? i + Te(o) : "--",
			epsGrowthText: Number.isNaN(s) ? "" : Ee(s),
			rpsGrowthText: Number.isNaN(c) ? "" : Ee(c),
			epsGrowthUp: s >= 0,
			rpsGrowthUp: c >= 0
		};
	}), o = e.c.length, s = new Float64Array(o).fill(NaN), c = new Float64Array(o).fill(NaN), l = new Float64Array(o).fill(NaN), u = new Float64Array(o).fill(NaN), d = new Float64Array(o).fill(NaN);
	for (let n = 0; n < t.length; n++) {
		let r = j(e.bars, t[n].date);
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
function Ae(e, t, n, r) {
	let i = e.textAlign;
	e.textAlign = "left";
	let a = r.map((t) => e.measureText(t.text).width), o = t - (a.reduce((e, t) => e + t, 0) + 4 * Math.max(0, r.length - 1)) / 2;
	for (let t = 0; t < r.length; t++) e.fillStyle = r[t].color, e.fillText(r[t].text, o, n), o += a[t] + 4;
	e.textAlign = i;
}
var je = (e, t, n, r, i, a) => {
	let o = a;
	if (!o) return;
	let s = r.display === 1 ? "bars" : "text", { xScale: c, bandwidth: l, renderStart: u, renderEnd: d } = n, f = n.paneTop ?? 0, p = (n.paneBottom ?? 0) - f;
	if (p <= 0) return;
	let m = i(r.epsColor), h = i(r.rpsColor), g = i(r.growthUpColor), _ = i(r.growthDownColor), v = i(r.labelColor);
	e.save(), e.beginPath(), e.rect(-1e6, f, 2e6, p), e.clip(), e.font = xe;
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
		let t = Oe(y.map((e) => e.x), z);
		if (e.textAlign = "center", e.textBaseline = "alphabetic", p >= B) {
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
				e.fillStyle = v, e.fillText(s.label, o, r), Ae(e, o, i, [
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
				]), Ae(e, o, a, [
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
	let C = S * c.step(), w = Math.min(we, C * .3), T = Math.min(4, w * .12), E = Math.max(1, (w - T) / 2), D = (t, r, i) => {
		if (!Number.isFinite(r)) return;
		let a = n.y(r), o = Math.min(b, a), s = Math.max(1, Math.abs(b - a));
		e.fillStyle = i, e.fillRect(t, o, E, s);
	}, O = Oe(y.map((e) => e.x), z);
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
}, V = {
	fixedDomain: [0, 1],
	hideAxis: !0
}, Me = {
	includeZero: !0,
	guideLines: [0],
	autofitPadding: 0,
	topPadPx: 17
}, Ne = {
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
	compute: (e) => ke(e),
	draw: je,
	autofitKeys: (e) => e.display === 1 ? ["eps", "rps"] : [],
	domain: (e, t) => t.display === 1 ? Me : V,
	legend: (e, t, n) => [{
		color: n.rpsColor,
		label: "RPS",
		value: P(e.rps, t, N)
	}, {
		color: n.epsColor,
		label: "EPS",
		value: P(e.eps, t, N)
	}]
}, Pe = .5, Fe = 2, Ie = 9, Le = "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";
function Re(e, t) {
	let n = e.c.length, r = e.displayStart ?? 0, i = e.bars.slice(r), a = ee(i, t.smaPeriod), o = new Float64Array(n).fill(NaN), s = new Float64Array(n).fill(NaN), c = new Float64Array(n).fill(NaN), l = new Float64Array(n).fill(NaN);
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
var ze = {
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
			default: Pe,
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
	compute: (e, t) => ({ series: Re(e, t) }),
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
			e.fillStyle = m, e.font = Le, e.textAlign = "center", e.textBaseline = "alphabetic";
			for (let t = s; t < c; t++) {
				let r = g[t];
				if (Number.isNaN(r)) continue;
				let i = l[t];
				if (!i) continue;
				let s = Math.max(n.y(i.volume) - Fe, u + Ie);
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
		tickFormat: O
	}),
	legend: (e, t, n) => [{
		color: n.upColor,
		label: "Vol",
		value: P(e.volumeUp, t, D)
	}, {
		color: n.downColor,
		label: "Vol",
		value: P(e.volumeDown, t, D)
	}]
}, H = (e) => Number.isNaN(e) ? NaN : Math.round(e * 100) / 100;
function U(e) {
	for (let t = 0; t < e.length; t++) if (!Number.isNaN(e[t])) return t;
	return e.length;
}
function W(e) {
	let t = new Float64Array(e);
	return t.fill(NaN), t;
}
function G(e, t) {
	let n = e.length, r = W(n), i = U(e);
	if (t < 1 || i + t > n) return r;
	let a = 0;
	for (let o = i; o < n; o++) a += e[o], o >= i + t && (a -= e[o - t]), o >= i + t - 1 && (r[o] = a / t);
	return r;
}
function Be(e, t) {
	let n = e.length, r = W(n), i = U(e), a = i + t - 1;
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
function K(e, t) {
	return Ve(e, t, U(e) + t - 1);
}
function Ve(e, t, n) {
	let r = e.length, i = W(r);
	if (t < 1 || n < t - 1 || n >= r) return i;
	let a = 0;
	for (let r = n - t + 1; r <= n; r++) a += e[r];
	let o = a / t;
	i[n] = o;
	let s = 2 / (t + 1);
	for (let t = n + 1; t < r; t++) o = s * e[t] + (1 - s) * o, i[t] = o;
	return i;
}
function He(e, t) {
	let n = e.length, r = K(e, t), i = K(r, t), a = W(n);
	for (let e = 0; e < n; e++) !Number.isNaN(r[e]) && !Number.isNaN(i[e]) && (a[e] = 2 * r[e] - i[e]);
	return a;
}
function Ue(e, t) {
	let n = e.length, r = K(e, t), i = K(r, t), a = K(i, t), o = W(n);
	for (let e = 0; e < n; e++) Number.isNaN(a[e]) || (o[e] = 3 * r[e] - 3 * i[e] + a[e]);
	return o;
}
function We(e, t, n) {
	switch (e) {
		case 1: return K(t, n);
		case 2: return Be(t, n);
		case 3: return He(t, n);
		case 4: return Ue(t, n);
		default: return G(t, n);
	}
}
function Ge(e, t) {
	switch (e) {
		case 3: return 2 * (t - 1);
		case 4: return 3 * (t - 1);
		default: return t - 1;
	}
}
function Ke(e, t, n) {
	let r = e.length, i = W(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t <= a; t++) o += e[t];
	let s = o / t;
	i[a] = s;
	for (let n = a + 1; n < r; n++) s = (s * (t - 1) + e[n]) / t, i[n] = s;
	return i;
}
function q(e, t, n) {
	let r = e.length, i = W(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t < a; t++) o += e[t];
	o = o - o / t + e[a], i[a] = o;
	for (let n = a + 1; n < r; n++) o = o - o / t + e[n], i[n] = o;
	return i;
}
function qe(e, t) {
	let n = e.length, r = W(n), i = U(e);
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
function Je(e, t) {
	let n = e.length, r = W(n), i = U(e);
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
function Ye(e, t, n) {
	let r = e.length, i = W(r);
	for (let a = 1; a < r; a++) {
		let r = e[a] - t[a], o = Math.abs(e[a] - n[a - 1]), s = Math.abs(t[a] - n[a - 1]);
		i[a] = Math.max(r, o, s);
	}
	return i;
}
function Xe(e, t) {
	let n = e.length, r = W(n);
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
function Ze(e, t, n, r) {
	let i = e.length, a = W(i);
	if (r < 1 || r >= i) return a;
	let o = Ye(e, t, n), s = W(i), c = W(i);
	for (let n = 1; n < i; n++) {
		let r = e[n] - e[n - 1], i = t[n - 1] - t[n];
		s[n] = r > i && r > 0 ? r : 0, c[n] = i > r && i > 0 ? i : 0;
	}
	let l = q(o, r, 1), u = q(s, r, 1), d = q(c, r, 1);
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
function Qe(e, t, n, r) {
	return Ke(Ye(e, t, n), r, 1);
}
function $e(e, t, n, r) {
	return Ke(Ze(e, t, n, r), r, r);
}
function et(e, t, n, r) {
	let i = e.length, a = qe(e, r), o = Je(t, r), s = W(i);
	for (let e = 0; e < i; e++) {
		if (Number.isNaN(a[e]) || Number.isNaN(o[e]) || Number.isNaN(n[e])) continue;
		let t = a[e] - o[e];
		s[e] = t === 0 ? 0 : 100 * (n[e] - o[e]) / t;
	}
	return s;
}
function tt(e, t) {
	let n = e.length, r = W(n), i = U(e);
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
var nt = {
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
		let n = G(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { sma: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "sma",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["sma"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "SMA",
		value: P(e.sma, t, r.priceFmt)
	}]
};
//#endregion
//#region src/indicators/builtins/emaTalib.ts
function rt(e) {
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
var it = {
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
		let t = rt(e.period);
		return {
			lineColor: t.line,
			labelColor: t.label
		};
	},
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period - 1 + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = K(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { ema: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "ema",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["ema"],
	legend: (e, t, n, r) => [{
		color: n.labelColor,
		label: "EMA",
		value: P(e.ema, t, r.priceFmt)
	}]
}, at = {
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
		let n = Be(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { wma: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "wma",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["wma"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "WMA",
		value: P(e.wma, t, r.priceFmt)
	}]
}, ot = {
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
		let n = He(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { dema: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "dema",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["dema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "DEMA",
		value: P(e.dema, t, r.priceFmt)
	}]
}, st = {
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
		let n = Ue(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { tema: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "tema",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["tema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "TEMA",
		value: P(e.tema, t, r.priceFmt)
	}]
}, ct = {
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
			options: oe
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
	warmupBars: (e) => Math.max(Ge(e.matype, e.period), e.period - 1) + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = e.c.length, r = We(t.matype, e.c, t.period), i = tt(e.c, t.period), a = new Float64Array(n), o = new Float64Array(n), s = new Float64Array(n);
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
	draw: (e, t, n, r, i) => F(e, t, n, [
		{
			key: "upperband",
			st: I(r, "upper", i)
		},
		{
			key: "middleband",
			st: I(r, "mid", i)
		},
		{
			key: "lowerband",
			st: I(r, "lower", i)
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
			value: P(e.upperband, t, r.priceFmt)
		},
		{
			color: n.midColor,
			label: "Mid",
			value: P(e.middleband, t, r.priceFmt)
		},
		{
			color: n.lowerColor,
			label: "Lower",
			value: P(e.lowerband, t, r.priceFmt)
		}
	]
}, lt = {
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
		let n = Xe(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { rsi: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "rsi",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["rsi"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [30, 70]
	}),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "RSI",
		value: P(e.rsi, t, N)
	}]
}, ut = {
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
		let n = e.c.length, r = Ve(e.c, t.fast, t.slow - 1), i = K(e.c, t.slow), a = new Float64Array(n);
		a.fill(NaN);
		for (let e = 0; e < n; e++) !Number.isNaN(r[e]) && !Number.isNaN(i[e]) && (a[e] = r[e] - i[e]);
		let o = K(a, t.signal), s = new Float64Array(n), c = new Float64Array(n), l = new Float64Array(n);
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
		t.macdhist && ie(e, n, t.macdhist, {
			color: i(r.histUpColor),
			width: 1
		}, i(r.histDownColor)), F(e, t, n, [{
			key: "macd",
			st: I(r, "macd", i)
		}, {
			key: "macdsignal",
			st: I(r, "macdsignal", i)
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
			value: P(e.macd, t, N)
		},
		{
			color: n.macdsignalColor,
			label: "Signal",
			value: P(e.macdsignal, t, N)
		},
		{
			color: n.histUpColor,
			label: "Hist",
			value: P(e.macdhist, t, N)
		}
	]
}, dt = {
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
			options: oe
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
			options: oe
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
		let n = et(e.h, e.l, e.c, t.fastk), r = We(t.slowk_matype, n, t.slowk), i = We(t.slowd_matype, r, t.slowd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = H(r[e]), i[e] = H(i[e]);
		return { series: {
			slowk: r,
			slowd: i
		} };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "slowk",
		st: I(r, "k", i)
	}, {
		key: "slowd",
		st: I(r, "d", i)
	}]),
	autofitKeys: () => ["slowk", "slowd"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [20, 80]
	}),
	legend: (e, t, n) => [{
		color: n.kColor,
		label: "%K",
		value: P(e.slowk, t, N)
	}, {
		color: n.dColor,
		label: "%D",
		value: P(e.slowd, t, N)
	}]
}, ft = {
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
			options: oe
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
		let n = et(e.h, e.l, e.c, t.fastk), r = We(t.fastd_matype, n, t.fastd);
		for (let e = 0; e < n.length; e++) Number.isNaN(r[e]) && (n[e] = NaN), n[e] = H(n[e]), r[e] = H(r[e]);
		return { series: {
			fastk: n,
			fastd: r
		} };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "fastk",
		st: I(r, "k", i)
	}, {
		key: "fastd",
		st: I(r, "d", i)
	}]),
	autofitKeys: () => ["fastk", "fastd"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [20, 80]
	}),
	legend: (e, t, n) => [{
		color: n.kColor,
		label: "%K",
		value: P(e.fastk, t, N)
	}, {
		color: n.dColor,
		label: "%D",
		value: P(e.fastd, t, N)
	}]
}, pt = {
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
			options: oe
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
		let n = Xe(e.c, t.timeperiod), r = et(n, n, n, t.fastk), i = We(t.fastd_matype, r, t.fastd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = H(r[e]), i[e] = H(i[e]);
		return { series: {
			fastk: r,
			fastd: i
		} };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "fastk",
		st: I(r, "k", i)
	}, {
		key: "fastd",
		st: I(r, "d", i)
	}]),
	autofitKeys: () => ["fastk", "fastd"],
	domain: () => ({
		fixedDomain: [0, 100],
		guideLines: [20, 80]
	}),
	legend: (e, t, n) => [{
		color: n.kColor,
		label: "%K",
		value: P(e.fastk, t, N)
	}, {
		color: n.dColor,
		label: "%D",
		value: P(e.fastd, t, N)
	}]
}, mt = {
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
		let n = e.c.length, r = qe(e.h, t.period), i = Je(e.l, t.period), a = new Float64Array(n);
		a.fill(NaN);
		for (let t = 0; t < n; t++) {
			if (Number.isNaN(r[t]) || Number.isNaN(i[t])) continue;
			let n = r[t] - i[t];
			a[t] = H(n === 0 ? 0 : -100 * (r[t] - e.c[t]) / n);
		}
		return { series: { willr: a } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "willr",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["willr"],
	domain: () => ({
		fixedDomain: [-100, 0],
		guideLines: [-20, -80]
	}),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "WILLR",
		value: P(e.willr, t, N)
	}]
}, ht = {
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
		let n = $e(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { adx: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "adx",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["adx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ADX",
		value: P(e.adx, t, N)
	}]
}, gt = {
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
		let n = Ze(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { dx: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "dx",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["dx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "DX",
		value: P(e.dx, t, N)
	}]
}, _t = {
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
		let n = Qe(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { atr: n } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "atr",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["atr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ATR",
		value: P(e.atr, t, N)
	}]
}, vt = {
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
		let n = e.c.length, r = Qe(e.h, e.l, e.c, t.period), i = new Float64Array(n);
		i.fill(NaN);
		for (let t = 0; t < n; t++) Number.isNaN(r[t]) || e.c[t] === 0 || (i[t] = H(100 * r[t] / e.c[t]));
		return { series: { natr: i } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "natr",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["natr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "NATR",
		value: P(e.natr, t, N)
	}]
}, yt = {
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
		let t = Ye(e.h, e.l, e.c);
		for (let e = 0; e < t.length; e++) t[e] = H(t[e]);
		return { series: { trange: t } };
	},
	draw: (e, t, n, r, i) => F(e, t, n, [{
		key: "trange",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["trange"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "TRANGE",
		value: P(e.trange, t, N)
	}]
}, bt = /* @__PURE__ */ new Map();
function xt(e) {
	bt.set(e.key, e);
}
function J(e) {
	return bt.get(e);
}
function St() {
	return [...bt.values()];
}
function Ct(e) {
	let t = {};
	for (let n of e) n.kind === "line" ? (t[`${n.key}Color`] = n.default.color, t[`${n.key}Width`] = n.default.width, t[`${n.key}Style`] = n.default.style ?? 0, t[`${n.key}Opacity`] = n.default.opacity ?? 1) : t[n.key] = n.default;
	return t;
}
function wt(e, t) {
	let n = Ct(e.settingsSchema), r = {
		...n,
		...t
	}, i = e.deriveDefaults?.(r) ?? {};
	return {
		...n,
		...i,
		...t
	};
}
function Tt(e, t) {
	let n = J(e);
	if (!n) return;
	let r = { ...t?.settingsOverrides }, i = wt(n, r);
	return {
		id: t?.id ?? e,
		defKey: e,
		label: n.label,
		enabled: t?.enabled ?? !1,
		settings: i,
		settingsOverrides: r
	};
}
xt(fe), xt(_e), xt(ye), xt(Ne), xt(ze);
var Et = [
	nt,
	it,
	at,
	ot,
	st,
	ct,
	lt,
	ut,
	dt,
	ft,
	pt,
	mt,
	ht,
	gt,
	_t,
	vt,
	yt
];
for (let e of Et) xt(e);
function Dt(e) {
	let t = J(e.defKey);
	return t?.formatParams ? t.formatParams(e.settings) : "";
}
var Ot = [
	"ti:ema",
	"ti:sma",
	"ti:wma",
	"ti:dema",
	"ti:tema",
	"ti:bbands",
	"highs",
	"stage2"
], kt = [
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
], At = {
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
}, Y = (e) => typeof e == "object" && !!e && !Array.isArray(e);
function jt(e, t) {
	if (t === void 0) return e;
	if (!Y(e) || !Y(t)) return t;
	let n = { ...e };
	for (let r of Object.keys(t)) n[r] = jt(e[r], t[r]);
	return n;
}
function Mt(e) {
	return jt(At, e);
}
//#endregion
//#region src/internal/cn.ts
function Nt(...e) {
	return e.filter(Boolean).join(" ");
}
var X = {
	chartControls: "_chartControls_8hb22_1",
	indicatorPicker: "_indicatorPicker_8hb22_8",
	pickerPanel: "_pickerPanel_8hb22_13",
	pickerScroll: "_pickerScroll_8hb22_25",
	pickerCount: "_pickerCount_8hb22_61",
	pickerSection: "_pickerSection_8hb22_68",
	pickerRow: "_pickerRow_8hb22_77",
	pickerCheckRow: "_pickerCheckRow_8hb22_92",
	pickerLabel: "_pickerLabel_8hb22_111",
	pickerAdd: "_pickerAdd_8hb22_117"
};
//#endregion
//#region src/controls/ChartControls.tsx
function Pt(e, t) {
	let n = t.indexOf(e);
	return n === -1 ? t.length : n;
}
function Z(e) {
	let t = e.pane;
	return typeof t == "object" ? t.subpane : "";
}
function Ft({ chartType: e, onChartTypeChange: t, indicators: n, onIndicatorsChange: r, patternsEnabled: a, onPatternsToggle: o, visiblePatterns: l, onVisiblePatternsChange: f, statsEnabled: p, onStatsToggle: m, className: h }) {
	let [g, _] = c(!1), v = s(null), [y, b] = c(!1), x = s(null);
	i(() => {
		if (!g) return;
		let e = (e) => {
			v.current && !v.current.contains(e.target) && _(!1);
		}, t = (e) => {
			e.key === "Escape" && _(!1);
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [g]), i(() => {
		if (!y) return;
		let e = (e) => {
			x.current && !x.current.contains(e.target) && b(!1);
		}, t = (e) => {
			e.key === "Escape" && b(!1);
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [y]);
	let S = (e) => l ? l.includes(e) : !0, C = l ? l.length : te.length, w = (e) => {
		if (!f) return;
		let t = l ?? te;
		f(t.includes(e) ? t.filter((t) => t !== e) : [...t, e]);
	}, T = St().filter((e) => e.pane === "price").sort((e, t) => Pt(e.key, Ot) - Pt(t.key, Ot)), E = St().filter((e) => typeof e.pane == "object").sort((e, t) => Pt(Z(e), kt) - Pt(Z(t), kt)), D = (e) => {
		let t = Tt(e.key, {
			id: crypto.randomUUID(),
			enabled: !0
		});
		t && r([...n, t]);
	}, O = (e) => /* @__PURE__ */ d("div", {
		className: X.pickerRow,
		children: [/* @__PURE__ */ u("span", {
			className: X.pickerLabel,
			children: e.label
		}), /* @__PURE__ */ u("button", {
			type: "button",
			className: X.pickerAdd,
			title: `Add ${e.label}`,
			onClick: () => D(e),
			children: "+"
		})]
	}, e.key);
	return /* @__PURE__ */ d("div", {
		className: Nt(X.chartControls, h),
		children: [
			/* @__PURE__ */ d("div", {
				className: "pill-toggle-group",
				children: [/* @__PURE__ */ u("button", {
					className: Nt("pill-toggle-btn", "pill-toggle-btn-sm", e === "candlestick" && "is-active"),
					onClick: () => t("candlestick"),
					children: "Candles"
				}), /* @__PURE__ */ u("button", {
					className: Nt("pill-toggle-btn", "pill-toggle-btn-sm", e === "bar" && "is-active"),
					onClick: () => t("bar"),
					children: "Bars"
				})]
			}),
			/* @__PURE__ */ d("div", {
				className: X.indicatorPicker,
				ref: v,
				children: [/* @__PURE__ */ d("button", {
					type: "button",
					className: Nt("pill-toggle-btn", "pill-toggle-btn-sm", g && "is-active"),
					onClick: () => _((e) => !e),
					children: [
						"Indicators ·",
						" ",
						/* @__PURE__ */ u("span", {
							className: X.pickerCount,
							children: n.length
						})
					]
				}), g && /* @__PURE__ */ u("div", {
					className: X.pickerPanel,
					children: /* @__PURE__ */ d("div", {
						className: X.pickerScroll,
						children: [
							/* @__PURE__ */ u("div", {
								className: X.pickerSection,
								children: "Overlays"
							}),
							T.map(O),
							/* @__PURE__ */ u("div", {
								className: X.pickerSection,
								children: "Oscillators"
							}),
							E.map(O)
						]
					})
				})]
			}),
			/* @__PURE__ */ d("div", {
				className: X.indicatorPicker,
				ref: x,
				children: [/* @__PURE__ */ d("button", {
					type: "button",
					className: Nt("pill-toggle-btn", "pill-toggle-btn-sm", a && "is-active"),
					onClick: () => b((e) => !e),
					children: [
						"Patterns ·",
						" ",
						/* @__PURE__ */ u("span", {
							className: X.pickerCount,
							children: a ? C : 0
						})
					]
				}), y && /* @__PURE__ */ u("div", {
					className: X.pickerPanel,
					children: /* @__PURE__ */ d("div", {
						className: X.pickerScroll,
						children: [
							/* @__PURE__ */ d("label", {
								className: X.pickerCheckRow,
								children: [/* @__PURE__ */ u("span", {
									className: X.pickerLabel,
									children: "Show patterns"
								}), /* @__PURE__ */ u("input", {
									type: "checkbox",
									checked: a,
									onChange: o
								})]
							}),
							/* @__PURE__ */ u("div", {
								className: X.pickerSection,
								children: "Patterns"
							}),
							A.map(({ name: e, label: t }) => /* @__PURE__ */ d("label", {
								className: X.pickerCheckRow,
								children: [/* @__PURE__ */ u("span", {
									className: X.pickerLabel,
									children: t
								}), /* @__PURE__ */ u("input", {
									type: "checkbox",
									disabled: !a || !f,
									checked: S(e),
									onChange: () => w(e)
								})]
							}, e))
						]
					})
				})]
			}),
			/* @__PURE__ */ u("div", {
				className: "pill-toggle-group",
				children: /* @__PURE__ */ u("button", {
					className: Nt("pill-toggle-btn", "pill-toggle-btn-sm", p && "is-active"),
					onClick: m,
					children: "Stats"
				})
			})
		]
	});
}
//#endregion
//#region src/utils/toHex6.ts
var It = "#888888", Lt = (e) => Math.max(0, Math.min(255, Math.round(e))).toString(16).padStart(2, "0");
function Rt(e) {
	let t = e.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
	let n = t.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
	if (n) return `#${Lt(+n[1])}${Lt(+n[2])}${Lt(+n[3])}`;
	let r = t.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
	return r ? `#${Lt(r[1] * 255)}${Lt(r[2] * 255)}${Lt(r[3] * 255)}` : It;
}
//#endregion
//#region src/controls/SettingsFields.tsx
function zt(e, t) {
	let n = e;
	return t.min != null && (n = Math.max(t.min, n)), t.max != null && (n = Math.min(t.max, n)), n;
}
function Bt({ spec: e, value: t, onCommit: n }) {
	let [r, i] = c(String(t)), a = e.step ?? 1, o = Number.isInteger(a), s = o ? `Whole number${e.min == null ? "" : ` ≥ ${e.min}`}` : `Number${e.min == null ? "" : ` ≥ ${e.min}`}, step ${a}`;
	return /* @__PURE__ */ d("label", {
		className: M.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e.label }), /* @__PURE__ */ u("input", {
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
				r.trim() !== "" && Number.isFinite(a) && /^\d*\.?\d*$/.test(r) && n(zt(o ? Math.round(a) : a, e));
			},
			onBlur: () => i(String(t))
		})]
	});
}
function Vt({ spec: e, value: t, onChange: n }) {
	return /* @__PURE__ */ d("label", {
		className: M.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e.label }), /* @__PURE__ */ u("select", {
			value: t,
			onChange: (e) => n(Number(e.target.value)),
			children: e.options.map((e) => /* @__PURE__ */ u("option", {
				value: e.value,
				children: e.label
			}, e.value))
		})]
	});
}
function Ht({ label: e, value: t, onChange: n }) {
	return /* @__PURE__ */ d("label", {
		className: M.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ u("input", {
			type: "checkbox",
			checked: t,
			onChange: (e) => n(e.target.checked)
		})]
	});
}
function Ut({ label: e, colorExpr: t, isOverridden: n, resolveColor: r, onCommit: a, onReset: o }) {
	let s = Rt(r(t)), [l, f] = c(s);
	return i(() => f(s), [s]), /* @__PURE__ */ d("div", {
		className: M.legendColorField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ d("div", {
			className: M.legendColorControls,
			children: [
				/* @__PURE__ */ u("input", {
					type: "color",
					value: s,
					title: `${e} color`,
					onChange: (e) => a(e.target.value)
				}),
				/* @__PURE__ */ u("input", {
					type: "text",
					className: M.legendColorHex,
					value: l,
					spellCheck: !1,
					autoComplete: "off",
					onChange: (e) => f(e.target.value),
					onBlur: () => {
						let e = l.trim().toLowerCase();
						/^#[0-9a-f]{6}$/.test(e) ? a(e) : f(s);
					},
					onKeyDown: (e) => {
						e.key === "Enter" && e.currentTarget.blur();
					}
				}),
				/* @__PURE__ */ u("button", {
					type: "button",
					className: M.legendBtn,
					title: "Reset to default color",
					disabled: !n,
					onClick: o,
					children: "↺"
				})
			]
		})]
	});
}
function Wt({ label: e, value: t, onCommit: n, min: r = 0, max: i = 1, step: a = .05 }) {
	return /* @__PURE__ */ d("label", {
		className: M.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ d("span", {
			className: M.sliderControl,
			children: [/* @__PURE__ */ u("input", {
				type: "range",
				min: r,
				max: i,
				step: a,
				value: t,
				onChange: (e) => n(Number(e.target.value))
			}), /* @__PURE__ */ u("span", {
				className: M.sliderValue,
				children: t.toFixed(2)
			})]
		})]
	});
}
function Gt({ label: e, prefix: t, settings: n, settingsOverrides: r, resolveColor: i, onCommit: a, onResetKeys: o }) {
	let s = `${t}Color`, c = `${t}Width`, l = `${t}Style`, f = `${t}Opacity`, p = Rt(i(String(n[s] ?? ""))), m = Number(n[c] ?? 1), h = Number(n[l] ?? 0), g = Number(n[f] ?? 1), _ = [
		s,
		c,
		l,
		f
	].some((e) => e in r);
	return /* @__PURE__ */ d("div", {
		className: M.legendColorField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ d("div", {
			className: M.lineFieldControls,
			children: [
				/* @__PURE__ */ u("input", {
					type: "color",
					value: p,
					title: `${e} color`,
					onChange: (e) => a(s, e.target.value)
				}),
				/* @__PURE__ */ u("select", {
					className: M.lineFieldSelect,
					value: h,
					title: `${e} style`,
					onChange: (e) => a(l, Number(e.target.value)),
					children: se.map((e) => /* @__PURE__ */ u("option", {
						value: e.value,
						children: e.label
					}, e.value))
				}),
				/* @__PURE__ */ u("input", {
					type: "number",
					className: M.lineFieldWidth,
					min: .5,
					max: 10,
					step: .1,
					value: m,
					title: `${e} width`,
					onWheel: (e) => e.currentTarget.blur(),
					onChange: (e) => {
						let t = Number(e.target.value);
						Number.isFinite(t) && t > 0 && a(c, t);
					}
				}),
				/* @__PURE__ */ u("input", {
					type: "range",
					className: M.lineFieldOpacity,
					min: 0,
					max: 1,
					step: .05,
					value: g,
					title: `${e} opacity`,
					onChange: (e) => a(f, Number(e.target.value))
				}),
				/* @__PURE__ */ u("button", {
					type: "button",
					className: M.legendBtn,
					title: "Reset line to default",
					disabled: !_,
					onClick: () => o([
						s,
						c,
						l,
						f
					].filter((e) => e in r)),
					children: "↺"
				})
			]
		})]
	});
}
//#endregion
//#region src/controls/SettingsDialog.tsx
function Kt(e, t) {
	let n = e;
	for (let e of t) {
		if (typeof n != "object" || !n) return;
		n = n[e];
	}
	return n;
}
function qt(e, t, n) {
	let [r, ...i] = t, a = { ...e ?? {} };
	return i.length === 0 ? a[r] = n : a[r] = qt(a[r], i, n), a;
}
function Jt(e, t) {
	let [n, ...r] = t, i = { ...e ?? {} };
	if (r.length === 0) delete i[n];
	else {
		let e = i[n];
		if (e && typeof e == "object") {
			let t = Jt(e, r);
			Object.keys(t).length === 0 ? delete i[n] : i[n] = t;
		}
	}
	return i;
}
function Yt({ label: e, value: t, onCommit: n }) {
	let [r, a] = c(t);
	return i(() => a(t), [t]), /* @__PURE__ */ d("label", {
		className: M.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ u("input", {
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
function Xt({ appearance: e, onAppearanceChange: t, resolveColor: n, onClose: r, style: a }) {
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
	let c = Mt(e), l = (n, r) => t(qt(e, n, r)), f = (n) => t(Jt(e, n)), p = (t, r) => {
		let i = e.colors?.[t];
		return /* @__PURE__ */ u(Ut, {
			label: r,
			colorExpr: i ?? `var(--${t})`,
			isOverridden: i !== void 0,
			resolveColor: n,
			onCommit: (e) => l(["colors", t], e),
			onReset: () => f(["colors", t])
		}, t);
	}, m = (t, r) => /* @__PURE__ */ u(Ut, {
		label: r,
		colorExpr: String(Kt(c, t)),
		isOverridden: Kt(e, t) !== void 0,
		resolveColor: n,
		onCommit: (e) => l(t, e),
		onReset: () => f(t)
	}, t.join(".")), h = (e, t, n = {}) => {
		let r = Number(Kt(c, e));
		return /* @__PURE__ */ u(Bt, {
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
	}, g = (e, t) => /* @__PURE__ */ u(Wt, {
		label: t,
		value: Number(Kt(c, e)),
		onCommit: (t) => l(e, t)
	}, e.join(".")), _ = (e, t) => /* @__PURE__ */ u(Yt, {
		label: t,
		value: String(Kt(c, e)),
		onCommit: (t) => l(e, t)
	}, e.join("."));
	return /* @__PURE__ */ d("div", {
		className: M.settingsDialog,
		ref: o,
		style: a,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ d("div", {
			className: M.legendPopoverHeader,
			children: [/* @__PURE__ */ u("span", {
				className: M.legendPopoverTitle,
				children: "Chart settings"
			}), /* @__PURE__ */ u("button", {
				type: "button",
				className: M.legendPopoverClose,
				title: "Close",
				onClick: r,
				children: "×"
			})]
		}), /* @__PURE__ */ d("div", {
			className: M.panelScrollBody,
			children: [
				/* @__PURE__ */ u("div", {
					className: M.settingsSectionTitle,
					children: "Chart appearance"
				}),
				p("chart-positive", "Candle up"),
				p("chart-negative", "Candle down"),
				h(["candle", "wickWidth"], "Wick width", {
					min: .5,
					max: 6,
					step: .05
				}),
				m(["background", "topColor"], "Background top"),
				m(["background", "bottomColor"], "Background bottom"),
				h(["background", "radius"], "Background radius", {
					min: 0,
					max: 48,
					step: 1
				}),
				p("chart-axis-label", "Axis label"),
				g(["axis", "opacity"], "Axis opacity"),
				h(["axis", "tickSize"], "Tick size", {
					min: 0,
					max: 16,
					step: 1
				}),
				m(["crosshair", "color"], "Crosshair"),
				g(["crosshair", "opacity"], "Crosshair opacity"),
				_(["crosshair", "dash"], "Crosshair dash"),
				p("chart-separator", "Separator"),
				p("subpane-guide", "Subpane guide"),
				/* @__PURE__ */ u("div", {
					className: M.settingsSectionTitle,
					children: "Patterns"
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Base breakout"
				}),
				m([
					"patterns",
					"base_breakout",
					"lineColor"
				], "Line"),
				h([
					"patterns",
					"base_breakout",
					"lineWidth"
				], "Line width", {
					min: .5,
					max: 8,
					step: .1
				}),
				g([
					"patterns",
					"base_breakout",
					"lineOpacity"
				], "Line opacity"),
				_([
					"patterns",
					"base_breakout",
					"lineDash"
				], "Line dash"),
				m([
					"patterns",
					"base_breakout",
					"statColor"
				], "Stat text"),
				m([
					"patterns",
					"base_breakout",
					"dotFill"
				], "Breakout dot"),
				m([
					"patterns",
					"base_breakout",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"base_breakout",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"base_breakout",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"base_breakout",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Consolidation"
				}),
				m([
					"patterns",
					"consolidation",
					"boxFill"
				], "Box fill"),
				g([
					"patterns",
					"consolidation",
					"boxFillOpacity"
				], "Box opacity"),
				m([
					"patterns",
					"consolidation",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"consolidation",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"consolidation",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"consolidation",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "High tight flag"
				}),
				m([
					"patterns",
					"high_tight_flag",
					"poleColor"
				], "Pole"),
				h([
					"patterns",
					"high_tight_flag",
					"poleWidth"
				], "Pole width", {
					min: .5,
					max: 8,
					step: .1
				}),
				g([
					"patterns",
					"high_tight_flag",
					"poleOpacity"
				], "Pole opacity"),
				m([
					"patterns",
					"high_tight_flag",
					"flagFill"
				], "Flag fill"),
				g([
					"patterns",
					"high_tight_flag",
					"flagFillOpacity"
				], "Flag opacity"),
				m([
					"patterns",
					"high_tight_flag",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"high_tight_flag",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"high_tight_flag",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"high_tight_flag",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Gap up"
				}),
				m([
					"patterns",
					"gap_up",
					"bandFill"
				], "Band fill"),
				g([
					"patterns",
					"gap_up",
					"bandFillOpacity"
				], "Band opacity"),
				m([
					"patterns",
					"gap_up",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"gap_up",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"gap_up",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"gap_up",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Volume breakout"
				}),
				m([
					"patterns",
					"volume_breakout",
					"markerColor"
				], "Marker"),
				g([
					"patterns",
					"volume_breakout",
					"markerOpacity"
				], "Marker opacity"),
				m([
					"patterns",
					"volume_breakout",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"volume_breakout",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"volume_breakout",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"volume_breakout",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Golden cross"
				}),
				m([
					"patterns",
					"golden_cross",
					"dotFill"
				], "Dot"),
				m([
					"patterns",
					"golden_cross",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"golden_cross",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"golden_cross",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"golden_cross",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "NR7"
				}),
				m([
					"patterns",
					"nr7",
					"lineColor"
				], "Line"),
				h([
					"patterns",
					"nr7",
					"lineWidth"
				], "Line width", {
					min: .5,
					max: 8,
					step: .1
				}),
				g([
					"patterns",
					"nr7",
					"lineOpacity"
				], "Line opacity"),
				m([
					"patterns",
					"nr7",
					"markerColor"
				], "Marker"),
				g([
					"patterns",
					"nr7",
					"markerOpacity"
				], "Marker opacity"),
				m([
					"patterns",
					"nr7",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"nr7",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"nr7",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"nr7",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Unusual volume"
				}),
				m([
					"patterns",
					"unusual_volume",
					"markerColor"
				], "Marker"),
				g([
					"patterns",
					"unusual_volume",
					"markerOpacity"
				], "Marker opacity"),
				m([
					"patterns",
					"unusual_volume",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"unusual_volume",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"unusual_volume",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"unusual_volume",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Volume dry-up"
				}),
				m([
					"patterns",
					"volume_dryup",
					"markerColor"
				], "Marker"),
				g([
					"patterns",
					"volume_dryup",
					"markerOpacity"
				], "Marker opacity"),
				m([
					"patterns",
					"volume_dryup",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"volume_dryup",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"volume_dryup",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"volume_dryup",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Pocket pivot"
				}),
				m([
					"patterns",
					"pocket_pivot",
					"markerColor"
				], "Marker"),
				g([
					"patterns",
					"pocket_pivot",
					"markerOpacity"
				], "Marker opacity"),
				m([
					"patterns",
					"pocket_pivot",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"pocket_pivot",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"pocket_pivot",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"pocket_pivot",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Inside day"
				}),
				m([
					"patterns",
					"inside_day",
					"lineColor"
				], "Mother line"),
				h([
					"patterns",
					"inside_day",
					"lineWidth"
				], "Mother line width", {
					min: .5,
					max: 8,
					step: .1
				}),
				g([
					"patterns",
					"inside_day",
					"lineOpacity"
				], "Mother line opacity"),
				m([
					"patterns",
					"inside_day",
					"boxStroke"
				], "Inside box"),
				h([
					"patterns",
					"inside_day",
					"boxStrokeWidth"
				], "Inside box width", {
					min: .5,
					max: 8,
					step: .1
				}),
				g([
					"patterns",
					"inside_day",
					"boxStrokeOpacity"
				], "Inside box opacity"),
				m([
					"patterns",
					"inside_day",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"inside_day",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"inside_day",
					"labelTextColor"
				], "Label text"),
				h([
					"patterns",
					"inside_day",
					"labelFontSize"
				], "Label font size", {
					min: 6,
					max: 24,
					step: 1
				}),
				/* @__PURE__ */ u("div", {
					className: M.settingsGroupTitle,
					children: "Pullback to EMA"
				}),
				m([
					"patterns",
					"pullback_to_ema",
					"dotFill"
				], "Dot"),
				m([
					"patterns",
					"pullback_to_ema",
					"lineColor"
				], "Tick"),
				h([
					"patterns",
					"pullback_to_ema",
					"lineWidth"
				], "Tick width", {
					min: .5,
					max: 8,
					step: .1
				}),
				g([
					"patterns",
					"pullback_to_ema",
					"lineOpacity"
				], "Tick opacity"),
				m([
					"patterns",
					"pullback_to_ema",
					"labelBg"
				], "Label bg"),
				g([
					"patterns",
					"pullback_to_ema",
					"labelBgOpacity"
				], "Label bg opacity"),
				m([
					"patterns",
					"pullback_to_ema",
					"labelTextColor"
				], "Label text"),
				h([
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
var Zt = {
	zoomSlider: "_zoomSlider_1ol61_4",
	marks: "_marks_1ol61_16",
	mark: "_mark_1ol61_16"
};
//#endregion
//#region src/controls/ZoomSlider.tsx
function Qt({ visibleBars: e, onVisibleBarsChange: t, maxVisibleBars: n, onPanReset: r }) {
	let i = Math.max(10, n), a = Math.min(b["3M"], i), o = Math.max(a, Math.min(e, i)), s = Math.log(a), c = Math.log(i), l = c - s, f = y.map((e) => ({
		key: e,
		bars: b[e]
	})).filter((e) => e.bars >= a && e.bars <= i), p = (e) => l > 0 ? (Math.log(e) - s) / l * 100 : 0, m = (e) => {
		let n = Math.max(a, Math.min(e, i));
		t(n), f.some((e) => e.bars === n) && r?.();
	};
	return /* @__PURE__ */ d("div", {
		className: Zt.zoomSlider,
		children: [/* @__PURE__ */ u("input", {
			type: "range",
			min: s,
			max: c,
			step: "any",
			value: Math.log(o),
			onChange: (e) => m(Math.round(Math.exp(Number(e.target.value)))),
			"aria-label": "Zoom (visible range)"
		}), /* @__PURE__ */ u("div", {
			className: Zt.marks,
			children: f.map((e) => /* @__PURE__ */ u("button", {
				type: "button",
				className: Zt.mark,
				style: { left: `${p(e.bars)}%` },
				onClick: () => m(e.bars),
				children: e.key
			}, e.key))
		})]
	});
}
//#endregion
//#region src/controls/IndicatorLegend.tsx
var $t = 18;
function en({ config: e, def: t, onCommit: n, onReset: r, onResetKeys: a, resolveColor: o, onClose: c }) {
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
	let f = Dt(e), p = o ?? ((e) => e);
	return /* @__PURE__ */ d("div", {
		className: M.legendPopover,
		ref: l,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ d("div", {
			className: M.legendPopoverHeader,
			children: [/* @__PURE__ */ d("span", {
				className: M.legendPopoverTitle,
				children: [t.longLabel ?? t.label, f && /* @__PURE__ */ u("span", {
					className: M.legendPopoverSummary,
					children: f
				})]
			}), /* @__PURE__ */ u("button", {
				type: "button",
				className: M.legendPopoverClose,
				title: "Close",
				onClick: c,
				children: "×"
			})]
		}), /* @__PURE__ */ u("div", {
			className: M.panelScrollBody,
			children: t.settingsSchema.map((t) => {
				switch (t.kind) {
					case "number": return /* @__PURE__ */ u(Bt, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onCommit: (e) => n(t.key, e)
					}, t.key);
					case "enum": return /* @__PURE__ */ u(Vt, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "toggle": return /* @__PURE__ */ u(Ht, {
						label: t.label,
						value: !!(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "color": return /* @__PURE__ */ u(Ut, {
						label: t.label,
						colorExpr: String(e.settings[t.key] ?? t.default),
						isOverridden: t.key in e.settingsOverrides,
						resolveColor: p,
						onCommit: (e) => n(t.key, e),
						onReset: () => r(t.key)
					}, t.key);
					case "line": return /* @__PURE__ */ u(Gt, {
						label: t.label,
						prefix: t.key,
						settings: e.settings,
						settingsOverrides: e.settingsOverrides,
						resolveColor: p,
						onCommit: (e, t) => n(e, t),
						onResetKeys: (e) => a(e)
					}, t.key);
				}
			})
		})]
	});
}
function tn({ configs: e, top: t, left: n, openId: r, setOpenId: i, onCommit: a, onReset: o, onResetKeys: s, resolveColor: c, onRemove: l, rowsFor: f, toggle: h }) {
	if (e.length === 0 && !h) return null;
	let g = c ?? ((e) => e);
	return /* @__PURE__ */ d("div", {
		className: M.legendBlock,
		style: {
			top: t,
			left: n
		},
		children: [e.map((e) => {
			let t = J(e.defKey);
			if (!t) return null;
			let n = (t.settingsSchema?.length ?? 0) > 0, p = Dt(e), m = f(e), h = m[0]?.color ? g(m[0].color) : "transparent", _ = m.filter((e) => e.value).map((e) => ({
				text: e.value,
				color: g(e.color)
			}));
			return /* @__PURE__ */ d("div", {
				className: M.legendItem,
				children: [
					/* @__PURE__ */ u("span", {
						className: M.legendDot,
						style: { background: h }
					}),
					/* @__PURE__ */ d("span", {
						className: M.legendLabel,
						children: [t.label, p ? ` ${p}` : ""]
					}),
					_.length > 0 && /* @__PURE__ */ u("span", {
						className: M.legendValues,
						children: _.map((e, t) => /* @__PURE__ */ u("span", {
							style: { color: e.color },
							children: e.text
						}, t))
					}),
					n && /* @__PURE__ */ u("button", {
						type: "button",
						className: M.legendBtn,
						title: `Edit ${t.label}`,
						onMouseDown: (e) => e.stopPropagation(),
						onClick: () => i(r === e.id ? null : e.id),
						children: "⚙"
					}),
					/* @__PURE__ */ u("button", {
						type: "button",
						className: M.legendBtn,
						title: `Remove ${t.label}`,
						onClick: () => l(e.id),
						children: "×"
					}),
					r === e.id && n && /* @__PURE__ */ u(en, {
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
		}), h && /* @__PURE__ */ u("button", {
			type: "button",
			className: M.legendToggle,
			title: h.expanded ? "Collapse indicators" : "Expand indicators",
			onMouseDown: (e) => e.stopPropagation(),
			onClick: h.onToggle,
			children: h.expanded ? /* @__PURE__ */ u(m, {
				size: 14,
				strokeWidth: 3
			}) : /* @__PURE__ */ u(p, {
				size: 14,
				strokeWidth: 3
			})
		})]
	});
}
function nn({ indicators: e, onIndicatorsChange: t, resolved: n, subpanes: r, marginTop: a, marginLeft: o, barCount: s, expanded: l, onExpandedChange: f, subscribeHoverIndex: p, priceFormatter: m, resolveColor: h }) {
	let [g, _] = c(null), v = () => f((e) => !e), [y, b] = c(null);
	i(() => {
		if (!l) {
			b(null);
			return;
		}
		return p(b);
	}, [l, p]);
	let x = (n, r, i) => {
		t(e.map((e) => e.id === n.id ? Tt(e.defKey, {
			id: e.id,
			enabled: e.enabled,
			settingsOverrides: {
				...e.settingsOverrides,
				[r]: i
			}
		}) ?? e : e));
	}, S = (e, t) => {
		C(e, [t]);
	}, C = (n, r) => {
		r.length !== 0 && t(e.map((e) => {
			if (e.id !== n.id) return e;
			let t = { ...e.settingsOverrides };
			for (let e of r) delete t[e];
			return Tt(e.defKey, {
				id: e.id,
				enabled: e.enabled,
				settingsOverrides: t
			}) ?? e;
		}));
	}, w = (n) => {
		g === n && _(null), t(e.filter((e) => e.id !== n));
	}, T = e.filter((e) => e.enabled), E = T.filter((e) => J(e.defKey)?.pane === "price"), D = (e) => T.filter((t) => {
		let n = J(t.defKey)?.pane;
		return typeof n == "object" && n.subpane === e;
	}), O = y ?? s - 1, k = (e) => {
		if (O < 0) return [];
		let t = n.find((t) => t.config.id === e.id), r = J(e.defKey);
		return !t || !r ? [] : r.legend(t.series, O, e.settings, { priceFmt: m });
	};
	return /* @__PURE__ */ d("div", {
		className: M.legend,
		"data-chart-legend": "",
		children: [/* @__PURE__ */ u(tn, {
			configs: l ? E : [],
			top: a + 8 + $t,
			left: o + 8,
			openId: g,
			setOpenId: _,
			onCommit: x,
			onReset: S,
			onResetKeys: C,
			resolveColor: h,
			onRemove: w,
			rowsFor: k,
			toggle: E.length > 0 ? {
				expanded: l,
				onToggle: v
			} : void 0
		}), r.map((e) => /* @__PURE__ */ u(tn, {
			configs: l ? D(e.key) : [],
			top: a + e.top + 8,
			left: o + 8,
			openId: g,
			setOpenId: _,
			onCommit: x,
			onReset: S,
			onResetKeys: C,
			resolveColor: h,
			onRemove: w,
			rowsFor: k,
			toggle: {
				expanded: l,
				onToggle: v
			}
		}, e.key))]
	});
}
//#endregion
//#region src/stats/position.ts
function rn(e, t, n, r, i) {
	return {
		x: Math.min(Math.max(0, e.x), Math.max(0, t - r)),
		y: Math.min(Math.max(0, e.y), Math.max(0, n - i))
	};
}
function an(e, t, n) {
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
}, on = {
	tiny: Q.sizeTiny,
	small: Q.sizeSmall,
	normal: Q.sizeNormal,
	large: Q.sizeLarge
}, sn = {
	strong: Q.lvlStrong,
	up: Q.lvlUp,
	neutral: Q.lvlNeutral,
	down: Q.lvlDown,
	text: Q.lvlText,
	muted: Q.lvlMuted
};
function cn({ model: e, size: t, marginRight: n, position: r, onPositionChange: o }) {
	let l = s(null), d = s(null), [f, p] = c(r), [m, h] = c(!1), g = s(null), _ = s(r);
	i(() => {
		_.current = f;
	}, [f]), i(() => {
		g.current || p(r);
	}, [r]);
	let v = () => {
		let e = l.current, t = d.current;
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
		if (f !== null) return;
		let e = v();
		e && p(an(e.hostW, e.panelW, n));
	}, [f, n]);
	let y = r !== null;
	i(() => {
		let e = l.current, t = d.current;
		if (!e || !t) return;
		let r = new ResizeObserver(() => {
			if (g.current) return;
			let e = v();
			e && p((t) => t === null ? t : y ? rn(t, e.hostW, e.hostH, e.panelW, e.panelH) : an(e.hostW, e.panelW, n));
		});
		return r.observe(e), r.observe(t), () => r.disconnect();
	}, [y, n]);
	let b = (e) => {
		f && (e.stopPropagation(), e.preventDefault(), d.current?.setPointerCapture(e.pointerId), g.current = {
			pointerId: e.pointerId,
			mx: e.clientX,
			my: e.clientY,
			startX: f.x,
			startY: f.y
		}, h(!0));
	}, x = (e) => {
		let t = g.current;
		if (!t || e.pointerId !== t.pointerId) return;
		e.stopPropagation();
		let n = v();
		if (!n) return;
		let r = rn({
			x: t.startX + (e.clientX - t.mx),
			y: t.startY + (e.clientY - t.my)
		}, n.hostW, n.hostH, n.panelW, n.panelH);
		_.current = r, p(r);
	}, S = (e) => {
		let t = g.current;
		if (!t || e.pointerId !== t.pointerId) return;
		e.stopPropagation(), g.current = null, h(!1), d.current?.releasePointerCapture(e.pointerId);
		let n = v(), r = _.current;
		if (r === null) return;
		let i = n ? rn(r, n.hostW, n.hostH, n.panelW, n.panelH) : r;
		_.current = i, p(i), o?.(i);
	};
	return e.rows.length === 0 ? null : /* @__PURE__ */ u("div", {
		ref: l,
		className: Q.statsHost,
		"data-chart-stats": "",
		children: /* @__PURE__ */ u("div", {
			ref: d,
			className: `${Q.statsPanel} ${on[t]} ${m ? Q.dragging : ""}`,
			style: f ? {
				left: f.x,
				top: f.y
			} : { visibility: "hidden" },
			onPointerDown: b,
			onPointerMove: x,
			onPointerUp: S,
			onPointerCancel: S,
			children: /* @__PURE__ */ u("table", {
				className: Q.statsTable,
				children: /* @__PURE__ */ u("tbody", { children: e.rows.map((e, t) => e.kind === "merged" ? /* @__PURE__ */ u("tr", { children: /* @__PURE__ */ u("td", {
					colSpan: 3,
					className: sn[e.cell.level],
					children: e.cell.text
				}) }, t) : /* @__PURE__ */ u("tr", { children: e.cells.map((e, t) => /* @__PURE__ */ u("td", {
					className: sn[e.level],
					children: e.text
				}, t)) }, t)) })
			})
		})
	});
}
//#endregion
//#region src/utils/toColumns.ts
var ln = /* @__PURE__ */ new WeakMap();
function un(e) {
	let t = ln.get(e);
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
	return ln.set(e, c), c;
}
//#endregion
//#region src/stats/computeStats.ts
var dn = {
	text: "",
	level: "muted"
};
function fn(e) {
	return e < 10 ? e.toFixed(1) : String(Math.round(e));
}
function pn(e) {
	return typeof e == "number" && Number.isFinite(e) && e !== 0 ? e : null;
}
function mn(e) {
	return e > 5 ? "strong" : e > 4 ? "up" : e > 3 ? "neutral" : "down";
}
function hn(e) {
	let t = (e.length ? e[e.length - 1] : NaN) * 100;
	return Number.isFinite(t) ? {
		text: `${fn(t * .5)} %`,
		level: mn(t)
	} : dn;
}
function gn(e, t, n) {
	let r = e.length;
	if (r === 0) return { rows: [] };
	let { h: i, l: a, c: o } = un(e), s = o[r - 1], c = r >= 2 ? o[r - 2] : o[r - 1], l = Ye(i, a, o), u = new Float64Array(r);
	for (let e = 0; e < r; e++) u[e] = l[e] / o[e];
	let d = hn(G(u, 125)), f = hn(G(u, 63)), p = hn(G(u, 21)), m = t ?? {}, h = (m.sector ?? "").trim(), g = (m.industry ?? "").trim(), _ = pn(m.sharesOutstanding), v = pn(m.freeFloatPercent), y = dn;
	if (v !== null) {
		let e = v >= 60 ? "neutral" : v >= 30 ? "up" : v >= 20 ? "neutral" : "down";
		y = {
			text: `${fn(v)} %`,
			level: e
		};
	}
	let b = dn;
	if (_ !== null) if (n === "US") {
		let e = _ * c / 1e6;
		e !== 0 && Number.isFinite(e) && (b = {
			text: e > 1e3 ? `${fn(e / 1e3)} B` : `${fn(e)} M`,
			level: e >= 2e3 ? "up" : e >= 250 ? "neutral" : "down"
		});
	} else {
		let e = _ * c / 1e10;
		if (e !== 0 && Number.isFinite(e)) {
			let t = e >= 5 ? "up" : e >= 1 ? "neutral" : "down";
			b = {
				text: `${fn(e)} K`,
				level: t
			};
		}
	}
	let x = dn;
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
function _n(e) {
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
function vn(e) {
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
function yn(e) {
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
function bn(e, t) {
	let { dpr: n } = t;
	e.setTransform(n, 0, 0, n, 0, 0), e.clearRect(0, 0, t.cssWidth, t.cssHeight);
	let r = t.fullHeight + t.marginTop + t.marginBottom, i = e.createLinearGradient(0, r, 0, 0);
	i.addColorStop(0, t.background.bottomColor), i.addColorStop(1, t.background.topColor), e.save(), e.fillStyle = i, e.beginPath(), e.roundRect(0, 0, t.cssWidth, r, t.background.radius), e.fill(), e.restore(), e.save(), e.translate(t.marginLeft, t.marginTop), e.beginPath(), e.rect(0, -t.marginTop, t.width - t.rightBuffer, t.fullHeight + t.marginTop + t.marginBottom), e.clip(), e.translate(t.baseTranslateX, 0), t.chartType === "bar" ? Sn(e, t) : xn(e, t), Cn(e, t), e.restore();
}
function xn(e, t) {
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
function Sn(e, t) {
	let { xScale: n, yPrice: r, bandwidth: i, renderStart: a, renderSlice: o, colors: s } = t, c = i / 2, l = new Path2D(), u = new Path2D();
	for (let e = 0; e < o.length; e++) {
		let t = e + a, s = o[e], d = n(t), f = Math.round(d + i / 2) + .5, p = s.close >= s.open ? l : u;
		p.moveTo(f, r(s.high)), p.lineTo(f, r(s.low));
		let m = Math.round(r(s.open)) + .5;
		p.moveTo(d, m), p.lineTo(d + c, m);
		let h = Math.round(r(s.close)) + .5;
		p.moveTo(d + c, h), p.lineTo(d + i, h);
	}
	e.lineWidth = t.candle.wickWidth, e.strokeStyle = s.positive, e.stroke(l), e.strokeStyle = s.negative, e.stroke(u);
}
function Cn(e, t) {
	if (t.indicators.length !== 0) for (let { config: n, series: r, meta: i } of t.indicators) {
		let a = J(n.defKey);
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
var wn = "#888888";
function Tn(e) {
	let t = document.createElement("span");
	t.style.position = "absolute", t.style.width = "0", t.style.height = "0", t.style.visibility = "hidden", t.style.pointerEvents = "none", e.appendChild(t);
	let n = /* @__PURE__ */ new Map();
	return {
		resolve(e) {
			let r = n.get(e);
			if (r) return r;
			let i = wn;
			try {
				t.style.color = "", t.style.color = e;
				let n = getComputedStyle(t).color;
				n && (i = n);
			} catch {
				i = wn;
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
var En = 8, Dn = 4, On = 10, kn = 6;
function An(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function jn(e, t, n, r) {
	let i = e.markers;
	if (!Array.isArray(i?.levels) || i.levels.length === 0) return;
	let a = r.patternStyle.base_breakout, o = r.resolveColor, s = a.labelFontSize, c = null;
	for (let e of i.levels) {
		let n = j(r.bars, e.start), i = j(r.bars, e.end);
		if (n == null || i == null) continue;
		let s = An(n, r), l = An(i, r);
		if (s == null || l == null) continue;
		let u = r.yPrice(e.price), d = s + r.bandwidth / 2, f = l + r.bandwidth / 2;
		c = f, t.append("line").attr("class", "bb-resistance").attr("x1", d).attr("y1", u).attr("x2", f).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-dasharray", a.lineDash).attr("stroke-linecap", "round"), t.append("circle").attr("class", "bb-breakout-dot").attr("cx", f).attr("cy", u).attr("r", 3).attr("fill", o(a.dotFill));
		let p = An(Math.round((n + i) / 2), r);
		if (p != null && typeof e.base_days == "number" && typeof e.base_depth_pct == "number") {
			let n = p + r.bandwidth / 2, i = u - kn;
			t.append("text").attr("class", "bb-stat").attr("x", n).attr("y", i).attr("text-anchor", "middle").attr("font-size", On).attr("fill", o(a.statColor)).attr("font-weight", 600).text(`${Math.round(e.base_days)}d · ${e.base_depth_pct.toFixed(1)}%`);
		}
	}
	let l = i.levels[0], u = r.yPrice(l.price), d = (An(r.dataLength - 1, r) ?? c ?? 0) + r.bandwidth + 2 * r.step + 4, f = s + 2 * Dn, p = n.append("g").attr("class", "bb-label").attr("transform", `translate(${d},${u - f / 2})`), m = p.append("text").attr("class", "bb-label-text").attr("x", En).attr("y", f / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text("Base breakout").node(), h = (m ? m.getBBox().width : 91) + 2 * En;
	p.insert("rect", "text").attr("class", "bb-label-bg").attr("x", 0).attr("y", 0).attr("width", h).attr("height", f).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
//#endregion
//#region src/patterns/renderers/consolidation.ts
var Mn = 8, Nn = 4;
function Pn(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function Fn(e, t, n, r) {
	let i = e.markers;
	if (!i?.start_date || !i?.end_date || !Number.isFinite(i.range_high) || !Number.isFinite(i.range_low)) return;
	let a = r.patternStyle.consolidation, o = r.resolveColor, s = a.labelFontSize, c = j(r.bars, i.start_date), l = j(r.bars, i.end_date);
	if (c == null || l == null) return;
	let u = Pn(c, r), d = Pn(l, r);
	if (u == null || d == null) return;
	let f = u, p = d + r.bandwidth, m = r.yPrice(Math.max(i.range_high, i.range_low)), h = r.yPrice(Math.min(i.range_high, i.range_low));
	t.append("rect").attr("class", "consol-box").attr("x", f).attr("y", m).attr("width", Math.max(0, p - f)).attr("height", Math.max(0, h - m)).attr("fill", o(a.boxFill)).attr("fill-opacity", a.boxFillOpacity).attr("stroke", "none");
	let g = i.consolidation_days, _ = i.range_low > 0 ? (i.range_high - i.range_low) / i.range_low * 100 : null, v = ["Consolidation"];
	typeof g == "number" && v.push(`${Math.round(g)}d`), _ != null && v.push(`${_.toFixed(1)}%`);
	let y = v.join(" · ");
	typeof i.tightness == "number" && Number.isFinite(i.tightness) && (y += ` (${i.tightness.toFixed(2)}x ATR)`);
	let b = s + 2 * Nn, x = n.append("g").attr("class", "consol-label").style("display", "none"), S = (x.append("text").attr("class", "consol-label-text").attr("x", Mn).attr("y", b / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text(y).node()?.getBBox().width ?? y.length * 7) + 2 * Mn, C = (f + p) / 2;
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
var In = 8, Ln = 4;
function Rn(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function zn(e, t, n, r) {
	let i = e.markers;
	if (!i?.segments?.pole || !i?.segments?.flag) return;
	let a = r.patternStyle.high_tight_flag, o = r.resolveColor, s = a.labelFontSize, c = j(r.bars, i.segments.pole[0]), l = j(r.bars, i.segments.pole[1]), u = j(r.bars, i.segments.flag[0]), d = j(r.bars, i.segments.flag[1]);
	if (c == null || l == null || u == null || d == null) return;
	let f = Rn(c, r), p = Rn(l, r), m = Rn(u, r), h = Rn(d, r);
	if (f == null || p == null || m == null || h == null) return;
	let g = r.bars[c], _ = r.bars[l], v = r.yPrice(g.high), y = r.yPrice(_.high), b = -Infinity, x = Infinity;
	for (let e = u; e <= d; e++) {
		let t = r.bars[e];
		t.high > b && (b = t.high), t.low < x && (x = t.low);
	}
	if (!Number.isFinite(b) || !Number.isFinite(x)) return;
	let S = m, C = h + r.bandwidth, w = r.yPrice(b), T = r.yPrice(x), E = f + r.bandwidth / 2, D = p + r.bandwidth / 2;
	t.append("line").attr("class", "htf-pole").attr("x1", E).attr("y1", v).attr("x2", D).attr("y2", y).attr("stroke", o(a.poleColor)).attr("stroke-opacity", a.poleOpacity).attr("stroke-width", a.poleWidth).attr("stroke-linecap", "round"), t.append("rect").attr("class", "htf-flag").attr("x", S).attr("y", w).attr("width", Math.max(0, C - S)).attr("height", Math.max(0, T - w)).attr("fill", o(a.flagFill)).attr("fill-opacity", a.flagFillOpacity).attr("stroke", "none");
	let O = i.score, k = O != null && Number.isFinite(O) ? ` ${Math.round(O)}%` : "", ee = i.tier === "high" ? "High" : i.tier === "low" ? "Low" : null, A = `${ee ? `${ee} tight flag` : "Tight flag"}${k}`, te = (Rn(r.dataLength - 1, r) ?? C) + r.bandwidth + 2 * r.step + 4, ne = n.append("g").attr("class", "htf-label").attr("transform", `translate(${te},${w})`), M = s + 2 * Ln, N = ne.append("text").attr("class", "htf-label-text").attr("x", In).attr("y", M / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text(A).node(), P = (N ? N.getBBox().width : A.length * 7) + 2 * In;
	ne.insert("rect", "text").attr("class", "htf-label-bg").attr("x", 0).attr("y", 0).attr("width", P).attr("height", M).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
var Bn = (e) => e + 8;
function Vn(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function Hn(e, t) {
	let { x: n, y: r, text: i, style: a, rc: o, center: s = !1, className: c } = t, l = a.labelFontSize, u = Bn(l), d = e.append("g");
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
function Un(e, t) {
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
var Wn = 3;
function Gn(e, t, n, r) {
	let i = e.markers;
	if (!i?.gap_date || !Number.isFinite(i.prev_high) || !Number.isFinite(i.gap_low)) return;
	let a = r.patternStyle.gap_up, o = r.resolveColor, s = j(r.bars, i.gap_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth + Wn * r.step, u = r.yPrice(Math.max(i.prev_high, i.gap_low)), d = r.yPrice(Math.min(i.prev_high, i.gap_low));
	t.append("rect").attr("class", "gap-up-band").attr("x", c).attr("y", u).attr("width", Math.max(0, l - c)).attr("height", Math.max(0, d - u)).attr("fill", o(a.bandFill)).attr("fill-opacity", a.bandFillOpacity).attr("stroke", "none");
	let f = typeof i.gap_pct == "number" && Number.isFinite(i.gap_pct) ? ` · ${i.gap_pct.toFixed(1)}%` : "", p = (u + d) / 2;
	Hn(n, {
		x: l + 6,
		y: p - Bn(a.labelFontSize) / 2,
		text: `Gap up${f}`,
		style: a,
		rc: o,
		className: "gap-up-label"
	});
}
//#endregion
//#region src/patterns/renderers/volumeBreakout.ts
var Kn = 6;
function qn(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_breakout, o = r.resolveColor, s = j(r.bars, i.event_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + Kn;
	Un(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	Hn(n, {
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
function Jn(e, t, n, r) {
	let i = e.markers;
	if (!i?.cross_date || !Number.isFinite(i.cross_price)) return;
	let a = r.patternStyle.golden_cross, o = r.resolveColor, s = j(r.bars, i.cross_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.cross_price);
	Un(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	}), Hn(n, {
		x: l + 6 + 4,
		y: u - Bn(a.labelFontSize) / 2,
		text: "Golden cross",
		style: a,
		rc: o,
		className: "golden-cross-label"
	});
}
//#endregion
//#region src/patterns/renderers/nr7.ts
var Yn = 4;
function Xn(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.bar_high) || !Number.isFinite(i.bar_low)) return;
	let a = r.patternStyle.nr7, o = r.resolveColor, s = j(r.bars, i.event_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth, u = c + r.bandwidth / 2, d = r.yPrice(i.bar_high), f = r.yPrice(i.bar_low);
	for (let e of [d, f]) t.append("line").attr("class", "nr7-range").attr("x1", c).attr("y1", e).attr("x2", l).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let p = d - Yn;
	Un(t, {
		x: u,
		y: p,
		kind: "arrowDown",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), Hn(n, {
		x: u,
		y: p - 6 * 1.6 - Bn(a.labelFontSize) - 2,
		text: "NR7",
		style: a,
		rc: o,
		center: !0,
		className: "nr7-label"
	});
}
//#endregion
//#region src/patterns/renderers/unusualVolume.ts
var Zn = 8;
function Qn(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.unusual_volume, o = r.resolveColor, s = j(r.bars, i.event_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + Zn;
	Un(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	Hn(n, {
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
var $n = 8;
function er(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_dryup, o = r.resolveColor, s = j(r.bars, i.event_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + $n;
	Un(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), Hn(n, {
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
var tr = 6;
function nr(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.pocket_pivot, o = r.resolveColor, s = j(r.bars, i.event_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + tr;
	Un(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), Hn(n, {
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
function rr(e, t, n, r) {
	let i = e.markers;
	if (!i?.inside_date || !i?.mother_date || !Number.isFinite(i.inside_high) || !Number.isFinite(i.inside_low) || !Number.isFinite(i.mother_high) || !Number.isFinite(i.mother_low)) return;
	let a = r.patternStyle.inside_day, o = r.resolveColor, s = j(r.bars, i.mother_date), c = j(r.bars, i.inside_date);
	if (s == null || c == null) return;
	let l = Vn(s, r), u = Vn(c, r);
	if (l == null || u == null) return;
	let d = l, f = u + r.bandwidth, p = r.yPrice(i.mother_high), m = r.yPrice(i.mother_low);
	for (let e of [p, m]) t.append("line").attr("class", "inside-day-mother").attr("x1", d).attr("y1", e).attr("x2", f).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let h = r.yPrice(Math.max(i.inside_high, i.inside_low)), g = r.yPrice(Math.min(i.inside_high, i.inside_low));
	t.append("rect").attr("class", "inside-day-box").attr("x", u).attr("y", h).attr("width", Math.max(0, r.bandwidth)).attr("height", Math.max(0, g - h)).attr("fill", "none").attr("stroke", o(a.boxStroke)).attr("stroke-opacity", a.boxStrokeOpacity).attr("stroke-width", a.boxStrokeWidth), Hn(n, {
		x: f + 6,
		y: p - Bn(a.labelFontSize) / 2,
		text: "Inside day",
		style: a,
		rc: o,
		className: "inside-day-label"
	});
}
//#endregion
//#region src/patterns/renderers/pullbackToEma.ts
function ir(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.ema_value)) return;
	let a = r.patternStyle.pullback_to_ema, o = r.resolveColor, s = j(r.bars, i.event_date);
	if (s == null) return;
	let c = Vn(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.ema_value);
	t.append("line").attr("class", "pullback-ema-tick").attr("x1", c).attr("y1", u).attr("x2", c + r.bandwidth).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round"), Un(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	});
	let d = i.ema_level ? ` ${i.ema_level}` : "";
	Hn(n, {
		x: l + 6 + 4,
		y: u - Bn(a.labelFontSize) / 2,
		text: `Pullback to${d}`,
		style: a,
		rc: o,
		className: "pullback-ema-label"
	});
}
//#endregion
//#region src/patterns/renderers/index.ts
var ar = {
	high_tight_flag: zn,
	base_breakout: jn,
	consolidation: Fn,
	gap_up: Gn,
	volume_breakout: qn,
	golden_cross: Jn,
	nr7: Xn,
	unusual_volume: Qn,
	volume_dryup: er,
	pocket_pivot: nr,
	inside_day: rr,
	pullback_to_ema: ir
}, or = (e) => `${e.pattern_name}:${e.detected_on}`;
function sr(e) {
	let t = v.select(e), n = t.append("g").attr("class", "chart-pattern-overlay-clip").attr("clip-path", "url(#chart-price-viewport)"), r = n.append("g").attr("class", "chart-pattern-overlay"), i = t.append("g").attr("class", "chart-pattern-overlay-labels-clip"), a = i.append("g").attr("class", "chart-pattern-overlay-labels"), o = null, s = [], c = null, l = 0, u = () => {
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
		let t = r.selectAll("g.chart-pattern-detection").data(e.detections, or);
		t.exit().remove();
		let n = t.enter().append("g").attr("class", "chart-pattern-detection").style("pointer-events", "none").merge(t), i = a.selectAll("g.chart-pattern-label-detection").data(e.detections, or);
		i.exit().remove();
		let o = i.enter().append("g").attr("class", "chart-pattern-label-detection").style("pointer-events", "none").merge(i);
		n.each(function(t, n) {
			let r = v.select(this), i = v.select(o.nodes()[n]);
			r.selectAll("*").remove(), i.selectAll("*").remove();
			let a = ar[t.pattern_name];
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
//#region src/context.tsx
function cr() {
	let e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Map(), n = {
		data: [],
		xScale: v.scaleBand(),
		yPrice: v.scaleLog(),
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
var lr = t(null), ur = lr.Provider;
function dr() {
	let e = r(lr);
	if (!e) throw Error("useChartScale must be used within a <Chart> (ChartScaleProvider)");
	return e;
}
var fr = t(null), pr = fr.Provider;
function mr() {
	let e = r(fr);
	if (!e) throw Error("chart overlay hooks must be used within a <Chart> (ChartOverlayProvider)");
	return e;
}
function hr(e) {
	let t = mr();
	return e === "trade" ? t.tradeHost : t.triggerHost;
}
function gr() {
	let e = mr();
	return {
		priceBottomPx: e.priceBottomPx,
		marginRight: e.marginRight
	};
}
function _r() {
	return mr().reportOverlayPriceBounds;
}
function vr() {
	return mr().subscribeBackgroundPointerDown;
}
//#endregion
//#region src/Chart.tsx
var $ = {
	top: 4,
	right: 60,
	bottom: 30,
	left: 0
}, yr = "'Helvetica Neue', Helvetica, Arial, sans-serif", br = .13, xr = .45, Sr = 24, Cr = .08, wr = 18, Tr = 12, Er = "currentColor", Dr = 10, Or = "var(--chart-tooltip-label)", kr = v.format(",.0f"), Ar = 1.04, jr = e.memo(({ data: e, warmupSeed: t, benchmarkClose: r, quarterlyResults: p, subpaneHeights: m = null, onSubpaneHeightsChange: y, visibleBars: b, onVisibleBarsChange: x, onMaxVisibleBarsChange: S, panOffset: C, onPanOffsetChange: w, chartType: O, indicators: k, onIndicatorsChange: ee, autoFitMode: A, onAutoFitModeChange: te, infoBarExpanded: j, onInfoBarExpandedChange: ne, symbol: N, bare: P, priceFormatter: re, patterns: F, patternsEnabled: ie, visiblePatterns: ae, statsTable: oe, statsEnabled: se, statsMarket: ce = "India", statsPosition: I = null, onStatsPositionChange: le, statsSize: ue = "small", appearance: de, onAppearanceChange: fe, children: pe }) => {
	let L = s(null), me = s(null), he = s(null), ge = s(null), _e = s(null), [R, ve] = c(0), [ye, be] = c(0);
	a(() => {
		let e = L.current;
		if (!e) return;
		let t = e.getBoundingClientRect();
		t.width && ve(t.width), t.height && be(t.height);
	}, []);
	let z = e?.length ?? 0, B = o(() => Mt(de), [de]), xe = o(() => JSON.stringify(B.colors), [B]), Se = o(() => JSON.stringify(B.background), [B]), Ce = o(() => JSON.stringify(B.candle), [B]), we = o(() => JSON.stringify(B.axis), [B]), Te = o(() => JSON.stringify(B.crosshair), [B]), Ee = o(() => JSON.stringify(B.patterns), [B]), [De, Oe] = c(0), [ke, Ae] = c(!1), je = s(null);
	je.current ||= cr();
	let V = je.current.api, Me = je.current.notify, Ne = re ?? kr, Pe = s(Ne);
	i(() => {
		Pe.current = Ne;
	}, [Ne]);
	let Fe = o(() => z > 0 ? v.range(z) : [], [z]), Ie = o(() => {
		let e = /* @__PURE__ */ new Set();
		for (let t of k) {
			if (!t.enabled) continue;
			let n = J(t.defKey)?.pane;
			n && typeof n == "object" && "subpane" in n && e.add(n.subpane);
		}
		let t = kt.filter((t) => e.has(t)), n = [...e].filter((e) => !kt.includes(e));
		return t.concat(n);
	}, [k]), [Le, Re] = c(m);
	i(() => {
		Re(m);
	}, [m]);
	let ze = o(() => {
		let e = {};
		for (let t of k) {
			if (!t.enabled) continue;
			let n = J(t.defKey), r = n?.pane;
			if (!r || typeof r != "object" || !("subpane" in r)) continue;
			let i = n?.paneHeightFactor ?? 1;
			e[r.subpane] = Math.max(e[r.subpane] ?? 1, i);
		}
		return e;
	}, [k]), H = o(() => T(R), [R]), U = Math.max(10, Math.min(b, H)), W = o(() => {
		if (!e || e.length === 0 || R === 0) return null;
		let t = Math.max(300, (ye || 466) - $.top - $.bottom), n = -(U - 1), r = Math.max(0, e.length - U), i = Math.max(n, Math.min(C, r)), a = Math.max(0, Math.floor(e.length - U - i)), o = Math.min(e.length, Math.ceil(e.length - i)), s = e.slice(a, o);
		if (s.length === 0) return null;
		let c = Math.ceil(U), l = Math.max(0, a - c), u = Math.min(e.length, o + c), d = e.slice(l, u), { priceHeight: f, subpanes: p, fullHeight: m } = _n({
			totalHeight: t,
			subpaneKeys: Ie,
			heightRatio: br,
			floorRatio: xr,
			heightFactors: ze,
			userHeights: Le ?? void 0
		}), h = R - $.left - $.right, g = (h - wr) / U, _ = (i + U - e.length) * g, y = v.scaleBand().domain(Fe).range([0, g * Math.max(1, e.length - .3)]).paddingInner(.3).paddingOuter(0);
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
			visibleBarsInt: Math.floor(U),
			visibleStartIdx: Math.round(e.length - U - i),
			effectiveOffset: i
		};
	}, [
		e,
		U,
		C,
		R,
		ye,
		Fe,
		Ie,
		ze,
		Le
	]), G = o(() => {
		if (!e || e.length === 0) return [];
		let n = k.filter((e) => e.enabled);
		if (n.length === 0) return [];
		let i = t && t.length ? t : [], a = i.length ? i.concat(e) : e, o = {
			...un(a),
			bars: a
		};
		if (r) {
			let e = new Float64Array(a.length);
			for (let t = 0; t < a.length; t++) e[t] = r[a[t].date] ?? NaN;
			o.benchmarkClose = e;
		}
		p && (o.quarterlyResults = p), o.market = ce;
		let s = i.length;
		return o.displayStart = s, n.map((e) => {
			let t = J(e.defKey);
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
		k,
		r,
		p,
		ce
	]), Be = o(() => !e || e.length === 0 ? null : gn(t && t.length ? t.concat(e) : e, oe, ce), [
		e,
		t,
		oe,
		ce
	]), K = s(null), Ve = n(() => {
		let e = ge.current, t = K.current;
		!e || !t || bn(e.ctx, {
			dpr: e.dpr,
			cssWidth: t.cssWidth,
			cssHeight: t.cssHeight,
			marginLeft: $.left,
			marginTop: $.top,
			marginBottom: $.bottom,
			rightBuffer: wr,
			width: t.width,
			fullHeight: t.fullHeight,
			priceHeight: t.priceHeight,
			bandwidth: t.bandwidth,
			baseTranslateX: V.baseTranslateX,
			renderStart: t.renderStart,
			renderEnd: t.renderEnd,
			renderSlice: t.renderSlice,
			chartType: t.chartType,
			xScale: V.xScale,
			yPrice: V.yPrice,
			subpaneScales: V.subpaneScales,
			data: t.data,
			colors: t.colors,
			background: t.background,
			candle: t.candle,
			indicators: t.indicators.map((e) => ({
				config: e.config,
				series: e.series,
				meta: e.meta
			})),
			resolveColor: (e) => _e.current?.resolve(e) ?? "#888888"
		});
	}, [V]), He = o(() => W ? $.top + W.priceHeight : 0, [W]), Ue = s(null), We = n((e) => (t) => {
		W && (t.preventDefault(), t.stopPropagation(), t.currentTarget.setPointerCapture(t.pointerId), Ue.current = {
			index: e,
			startY: t.clientY,
			bands: W.subpanes,
			priceHeight: W.priceHeight,
			totalHeight: W.totalHeight,
			latest: null
		});
	}, [W]), Ge = n((e) => {
		let t = Ue.current;
		if (!t) return;
		let n = vn({
			bands: t.bands,
			priceHeight: t.priceHeight,
			totalHeight: t.totalHeight,
			dividerIndex: t.index,
			dy: e.clientY - t.startY,
			minPanePx: Sr,
			floorRatio: xr
		});
		t.latest = n, Re(n);
	}, []), Ke = n((e) => {
		let t = Ue.current;
		t && (e.currentTarget.releasePointerCapture?.(e.pointerId), Ue.current = null, t.latest && y?.(t.latest));
	}, [y]), [q, qe] = c(1), Je = s(q);
	i(() => {
		Je.current = q;
	}, [q]);
	let [Ye, Xe] = c(!1), [Ze, Qe] = c(!1), $e = Ye || Ze, et = s({
		active: !1,
		startX: 0,
		startOffset: 0,
		baseTx: 0,
		step: 1,
		minOff: 0,
		maxOff: 0
	}), tt = s(w);
	i(() => {
		tt.current = w;
	}, [w]);
	let nt = s(C);
	i(() => {
		nt.current = C;
	}, [C]);
	let rt = s(H);
	rt.current = H;
	let it = s(x);
	i(() => {
		it.current = x;
	}, [x]);
	let at = s(S);
	i(() => {
		at.current = S;
	}, [S]);
	let ot = s(null), st = s(0), ct = s(null), lt = s(null), ut = s(null), dt = s(null), ft = s(null), pt = s(null), mt = s(null), ht = s(null), gt = s(null), _t = s(null), vt = s(null), yt = s(null), bt = s(null), xt = s(null), St = s([]), Ct = s(null), wt = s(null), Tt = s(null), Et = s(null), Dt = s(null), Ot = s(null), At = s(null), Y = s(null), jt = s(null), Nt = s(/* @__PURE__ */ new Set()), X = n((e) => (Nt.current.add(e), () => {
		Nt.current.delete(e);
	}), []), Pt = s(null), Z = s(null), [Ft, It] = c(null), [Lt, Rt] = c(null), [zt, Bt] = c(null), [Vt, Ht] = c(null), Ut = n((e, t) => {
		(e === "trade" ? Bt : Ht)((e) => e === t || e && t && e.min === t.min && e.max === t.max ? e : t);
	}, []), Wt = o(() => {
		let e = [], t = [];
		return zt && (e.push(zt.min), t.push(zt.max)), Vt && (e.push(Vt.min), t.push(Vt.max)), e.length === 0 ? null : {
			min: Math.min(...e),
			max: Math.max(...t)
		};
	}, [zt, Vt]), Gt = s(/* @__PURE__ */ new Set()), Kt = n((e) => {
		let t = Gt.current;
		return t.add(e), () => {
			t.delete(e);
		};
	}, []), qt = o(() => ({
		tradeHost: Ft,
		triggerHost: Lt,
		priceBottomPx: He,
		marginRight: $.right,
		reportOverlayPriceBounds: Ut,
		subscribeBackgroundPointerDown: Kt
	}), [
		Ft,
		Lt,
		He,
		Ut,
		Kt
	]);
	i(() => {
		let e = L.current;
		if (!e) return;
		let t, n = new ResizeObserver((e) => {
			t && clearTimeout(t), t = setTimeout(() => {
				let t = e[0]?.contentRect;
				t?.width && ve(t.width), t?.height && be(t.height);
			}, 150);
		});
		return n.observe(e), () => {
			t && clearTimeout(t), n.disconnect();
		};
	}, []);
	let Jt = W?.priceHeight ?? null;
	i(() => {
		if (Jt == null) return;
		let e = document.documentElement;
		return e.style.setProperty("--chart-price-height", `${Jt}px`), () => e.style.removeProperty("--chart-price-height");
	}, [Jt]), i(() => {
		let e = L.current;
		if (!e) return;
		let t = B.colors, n = Object.keys(t);
		for (let r of n) e.style.setProperty(`--${r}`, t[r]);
		let r = Tn(e);
		return _e.current?.destroy(), _e.current = r, Oe((e) => e + 1), () => {
			for (let t of n) e.style.removeProperty(`--${t}`);
			r.destroy(), _e.current = null;
		};
	}, [xe]);
	let Yt = W?.totalHeight ?? null;
	i(() => {
		let e = he.current;
		if (!e || Yt == null || R === 0) return;
		let t = R, n = Yt + $.top + $.bottom, r = null, i = () => a();
		function a() {
			let a = e;
			if (!a) return;
			let o = window.devicePixelRatio || 1;
			a.style.width = `${t}px`, a.style.height = `${n}px`, a.width = Math.round(t * o), a.height = Math.round(n * o);
			let s = a.getContext("2d");
			s && (s.setTransform(o, 0, 0, o, 0, 0), ge.current = {
				ctx: s,
				dpr: o
			}, Ve()), r && r.removeEventListener("change", i), r = window.matchMedia(`(resolution: ${o}dppx)`), r.addEventListener("change", i);
		}
		return a(), () => {
			r && r.removeEventListener("change", i);
		};
	}, [
		R,
		Yt,
		Ve
	]), i(() => {
		let e = L.current;
		if (!e || !x) return;
		let t = 1, n = null;
		function r(e) {
			if (e.target?.closest?.("[data-chart-wheel-scroll]")) return;
			e.preventDefault();
			let r = e.deltaY > 0 ? Ar : 1 / Ar;
			t *= r, n ??= requestAnimationFrame(() => {
				n = null;
				let e = t;
				t = 1, x((t) => Math.min(rt.current, Math.max(10, t * e)));
			});
		}
		return e.addEventListener("wheel", r, { passive: !1 }), () => {
			e.removeEventListener("wheel", r), n != null && cancelAnimationFrame(n);
		};
	}, [x]), i(() => {
		let t = e?.length ?? 0;
		if (t === 0) return;
		let n = -(b - 1), r = Math.max(0, t - b);
		tt.current((e) => Math.max(n, Math.min(r, e)));
	}, [e?.length, b]), i(() => {
		R === 0 || !x || (b > H || b < 10) && it.current?.((e) => Math.min(H, Math.max(10, e)));
	}, [
		H,
		b,
		R,
		x
	]), i(() => {
		R === 0 || !S || at.current?.(H);
	}, [
		H,
		R,
		S
	]);
	let [Zt, Qt] = c(N);
	Zt !== N && (Qt(N), q !== 1 && qe(1)), i(() => {
		let e = () => {
			let e = et.current;
			if (!e.active) return;
			e.active = !1, L.current && (L.current.style.cursor = ""), ot.current != null && (cancelAnimationFrame(ot.current), ot.current = null);
			let t = Math.round(st.current / e.step), n = Math.max(e.minOff, Math.min(e.maxOff, e.startOffset + t));
			st.current = 0, n === e.startOffset ? ct.current && (ct.current.setAttribute("transform", `translate(${e.baseTx},0)`), V.baseTranslateX = e.baseTx, Me("pan"), Z.current?.setTransform(e.baseTx), Ve()) : tt.current(n);
		}, t = (t) => {
			let n = et.current;
			if (n.active) {
				if (t.buttons === 0) {
					e();
					return;
				}
				st.current = t.clientX - n.startX, ot.current ??= requestAnimationFrame(() => {
					ot.current = null;
					let e = n.baseTx + st.current;
					ct.current && ct.current.setAttribute("transform", `translate(${e},0)`), V.baseTranslateX = e, Me("pan"), Z.current?.setTransform(e), Ve();
				});
			}
		};
		return document.addEventListener("mousemove", t), document.addEventListener("mouseup", e), () => {
			document.removeEventListener("mousemove", t), document.removeEventListener("mouseup", e), ot.current != null && (cancelAnimationFrame(ot.current), ot.current = null);
		};
	}, [
		V,
		Me,
		Ve
	]), i(() => {
		if (!me.current) return;
		let e = v.select(me.current);
		e.selectAll("*").remove();
		let t = e.append("g").attr("transform", `translate(${$.left},${$.top})`);
		lt.current = t;
		let n = t.append("defs");
		dt.current = n.append("clipPath").attr("id", "chart-viewport").append("rect").attr("x", 0).attr("y", -$.top), Ot.current = n.append("clipPath").attr("id", "chart-price-viewport").append("rect").attr("x", 0).attr("y", -$.top);
		let r = n.append("linearGradient").attr("id", "chart-bg-gradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
		r.append("stop").attr("offset", "0%").attr("stop-color", "#776a5a"), r.append("stop").attr("offset", "100%").attr("stop-color", "#6e7b8b");
		let i = n.append("linearGradient").attr("id", "chart-bg-gradient-user").attr("gradientUnits", "userSpaceOnUse");
		i.append("stop").attr("offset", "0%").attr("stop-color", "#6e7b8b"), i.append("stop").attr("offset", "100%").attr("stop-color", "#776a5a"), At.current = i, ut.current = t.append("rect").attr("x", -$.left).attr("y", -$.top).attr("rx", 12).attr("ry", 12).attr("fill", "transparent"), ft.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", yr).style("font-weight", "500").style("color", "var(--chart-axis-label)"), pt.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", yr).style("font-weight", "500").style("color", "var(--chart-axis-label)").style("display", "none"), mt.current = t.append("g").style("display", "none"), ht.current = t.append("g"), gt.current = t.append("line").attr("y1", -$.top).attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), Pt.current = t.append("g").attr("class", "chart-pattern-overlays-container").node(), Z.current = sr(Pt.current);
		let a = t.append("g").attr("clip-path", "url(#chart-viewport)").append("g");
		_t.current = a, ct.current = a.node(), vt.current = a.append("g").style("font-size", "var(--text-2hxs)").style("font-family", yr).style("font-weight", "500").style("color", "var(--chart-axis-label)"), yt.current = t.append("line").attr("stroke", "currentColor").attr("stroke-opacity", .3).attr("stroke-dasharray", "3,3").attr("y1", 0).style("visibility", "hidden"), bt.current = t.append("line").attr("stroke", "currentColor").attr("stroke-opacity", .3).attr("stroke-dasharray", "3,3").attr("x1", 0).style("visibility", "hidden");
		let o = t.append("text").attr("x", 8).attr("y", 14).style("font-size", "var(--text-sm)").style("font-family", yr).style("font-weight", "500").attr("fill", "currentColor").style("visibility", "hidden");
		xt.current = o, St.current = [];
		for (let e = 0; e < Tr; e++) St.current.push(o.append("tspan"));
		let s = t.append("g").style("visibility", "hidden");
		wt.current = s, s.append("rect").attr("width", 56).attr("height", 18).attr("rx", 3).attr("fill", "var(--bg-card)").attr("stroke", "currentColor").attr("stroke-opacity", .2), Tt.current = s.append("text").attr("x", 28).attr("y", 13).attr("text-anchor", "middle").style("font-size", "var(--text-3xs)").style("font-family", yr).style("font-weight", "500").attr("fill", "currentColor"), Et.current = t.append("rect").attr("fill", "transparent"), Dt.current = t.append("rect").attr("fill", "transparent").style("cursor", "ns-resize").style("pointer-events", "all");
		let c = t.append("g").attr("class", "trigger-overlays-container").node(), l = t.append("g").attr("class", "trade-overlays-container").node();
		return Rt(c), It(l), () => {
			Y.current != null && (cancelAnimationFrame(Y.current), Y.current = null), jt.current = null, e.selectAll("*").remove(), lt.current = null, ut.current = null, dt.current = null, ft.current = null, pt.current = null, mt.current = null, ht.current = null, gt.current = null, _t.current = null, ct.current = null, vt.current = null, yt.current = null, bt.current = null, xt.current = null, St.current = [], wt.current = null, Tt.current = null, Et.current = null, Dt.current = null, Ot.current = null, At.current = null, Rt(null), It(null), Z.current?.destroy(), Z.current = null, Pt.current = null;
		};
	}, []), i(() => {
		if (!e || !W || !me.current || !lt.current || !_t.current) return;
		let { renderStart: t, renderEnd: n, priceHeight: r, fullHeight: i, subpanes: a, width: o, baseTranslateX: s, xScale: c, totalHeight: l } = W, u = l + $.top + $.bottom;
		v.select(me.current).attr("width", R).attr("height", u), ut.current.attr("width", R).attr("height", i + $.top + $.bottom);
		let d = i + $.top + $.bottom;
		At.current.attr("x1", 0).attr("y1", -$.top).attr("x2", 0).attr("y2", -$.top + d), At.current.selectAll("stop").attr("stop-color", function() {
			return this.getAttribute("offset") === "0%" ? B.background.topColor : B.background.bottomColor;
		}), dt.current.attr("width", o - wr).attr("height", i + $.top + $.bottom), Ot.current.attr("width", o - wr).attr("height", $.top + r);
		let f = [];
		for (let r = Math.max(1, t); r < n; r++) e[r].date.slice(0, 7) !== e[r - 1].date.slice(0, 7) && f.push(r);
		ft.current.attr("transform", `translate(${o},0)`);
		let p = [];
		for (let e of a) p.push(e.top);
		a.length > 0 && p.push(i), ht.current.selectAll("line").data(p).join("line").attr("x1", 0).attr("x2", o).attr("y1", (e) => e).attr("y2", (e) => e).attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), gt.current.attr("x1", o).attr("x2", o).attr("y2", i), _t.current.attr("transform", `translate(${s},0)`), vt.current.attr("transform", `translate(0,${i})`).call(v.axisBottom(c).tickValues(f).tickSize(B.axis.tickSize).tickFormat((t) => {
			let n = e[t];
			if (!n) return "";
			let r = new Date(n.date);
			return v.timeFormat("%b %y")(r);
		})), vt.current.select(".domain").remove(), vt.current.selectAll("line").attr("stroke", Er).attr("stroke-opacity", B.axis.opacity), yt.current.attr("y2", i), bt.current.attr("x2", o), Et.current.attr("width", o).attr("height", i), Dt.current.attr("x", o).attr("y", 0).attr("width", $.right).attr("height", r);
	}, [
		W,
		R,
		e,
		Ie,
		we,
		Se
	]), i(() => {
		if (!e || !W || !ft.current) return;
		let { visibleSlice: t, visStart: n, visEnd: r, renderSlice: i, renderStart: a, renderEnd: o, priceHeight: s, fullHeight: c, subpanes: l, totalHeight: u, width: d, xScale: f, bandwidth: p, step: m, baseTranslateX: h, visibleBarsInt: g, visibleStartIdx: _ } = W, y = v.min(t, (e) => e.low) ?? 0, b = v.max(t, (e) => e.high) ?? 1;
		if (A === "priceAndOverlays") {
			for (let { config: e, series: t } of G) {
				let i = J(e.defKey);
				if (!i || typeof i.pane == "object") continue;
				let a = i.autofitKeys?.(e.settings) ?? Object.keys(t);
				for (let e of a) {
					let i = t[e];
					if (i) for (let e = n; e < r && e < i.length; e++) {
						let t = i[e];
						!Number.isNaN(t) && t > 0 && (t < y && (y = t), t > b && (b = t));
					}
				}
			}
			q === 1 && Wt && (y = Math.min(y, Wt.min), b = Math.max(b, Wt.max));
		}
		let x = Math.log(y), S = Math.log(b), C = (x + S) / 2, w = (S - x) / 2 / Math.max(.01, q), T = C - w, E = C + w, D = E - T, k = D * .06 || .01, ee = D * (q === 1 && A === "priceAndOverlays" ? .04 : .12) || .01, te = Math.exp(T - k), j = Math.exp(E + ee), ne = v.scaleLog().domain([Math.max(1, te), j]).range([s, 0]), [M, N] = ne.domain(), P = Math.log(M), re = Math.log(N), F = (e, t) => {
			if (e <= 0) return e;
			let n = 10 ** (Math.floor(Math.log10(e)) - (t - 1));
			return Math.round(e / n) * n;
		}, ie = Array.from(new Set(v.range(Dr).map((e) => {
			let t = Math.exp(P + e / (Dr - 1) * (re - P));
			return F(t, t >= 100 ? 3 : 2);
		}))).sort((e, t) => e - t).slice(0, -1), ae = v.format(",.1f");
		ft.current.call(v.axisRight(ne).tickValues(ie).tickSize(B.axis.tickSize).tickFormat((e) => ae(Number(e)))), ft.current.select(".domain").remove(), ft.current.selectAll("line").attr("stroke", Er).attr("stroke-opacity", B.axis.opacity);
		let oe = /* @__PURE__ */ new Map(), se = /* @__PURE__ */ new Map(), ce = /* @__PURE__ */ new Map();
		for (let e of G) {
			let t = J(e.config.defKey), n = t?.pane;
			if (!n || typeof n != "object" || !("subpane" in n)) continue;
			se.has(n.subpane) || se.set(n.subpane, t?.domain?.(e.series, e.config.settings) ?? void 0);
			let r = ce.get(n.subpane) ?? [];
			r.push(e), ce.set(n.subpane, r);
		}
		for (let e of l) {
			let t = se.get(e.key), i = [];
			for (let t of ce.get(e.key) ?? []) {
				let e = J(t.config.defKey)?.autofitKeys?.(t.config.settings) ?? [];
				for (let n of e) {
					let e = t.series[n];
					e && i.push({
						values: e,
						isMarker: !1
					});
				}
			}
			let a = yn({
				hint: t,
				lines: i,
				visStart: n,
				visEnd: r,
				defaultPad: Cr
			});
			if (a) {
				let [n, r] = a, i = t?.topPadPx ?? 0, o = e.bottom - e.top;
				i > 0 && o > i && r > n && (r = n + (r - n) * (o / (o - i))), oe.set(e.key, v.scaleLinear().domain([n, r]).range([e.bottom, e.top]));
			}
		}
		if (pt.current.selectAll("*").remove(), mt.current.selectAll("*").remove(), oe.size > 0) {
			pt.current.style("display", null), mt.current.style("display", null);
			let e = v.format(".2~f");
			for (let t of l) {
				let n = oe.get(t.key);
				if (!n) continue;
				let r = se.get(t.key);
				if (!r?.hideAxis) {
					let t = r?.tickFormat ?? e, i = pt.current.append("g").attr("transform", `translate(${d},0)`);
					i.call(v.axisRight(n).ticks(3).tickSize(B.axis.tickSize).tickFormat((e) => t(Number(e)))), i.select(".domain").remove(), i.selectAll("line").attr("stroke", Er).attr("stroke-opacity", B.axis.opacity);
				}
				let i = [...r?.guideLines ?? []];
				r?.zeroLine && i.push(0);
				for (let e of i) mt.current.append("line").attr("x1", 0).attr("x2", d).attr("y1", n(e)).attr("y2", n(e)).attr("stroke", "var(--subpane-guide)").attr("stroke-opacity", .4).attr("stroke-dasharray", "3,3");
			}
		} else pt.current.style("display", "none"), mt.current.style("display", "none");
		V.data = e, V.subpaneScales = oe, V.xScale = f, V.yPrice = ne, V.step = m, V.bandwidth = p, V.visibleBars = U, V.visibleBarsInt = g, V.visibleStartIdx = _, V.priceHeight = s, V.width = d, V.baseTranslateX = h, V.dataLength = e.length, V.indicators = G, Me("rescale"), Z.current?.updateScales({
			xScale: f,
			yPrice: ne,
			step: m,
			bandwidth: p,
			baseTranslateX: h,
			width: d,
			priceHeight: s,
			dataLength: e.length
		});
		let I = (e) => _e.current?.resolve(e) ?? "#888888";
		K.current = {
			cssWidth: R,
			cssHeight: u + $.top + $.bottom,
			width: d,
			fullHeight: c,
			priceHeight: s,
			bandwidth: p,
			renderStart: a,
			renderEnd: o,
			renderSlice: i,
			chartType: O,
			data: e,
			colors: {
				positive: I("var(--chart-positive)"),
				negative: I("var(--chart-negative)")
			},
			background: {
				topColor: I(B.background.topColor),
				bottomColor: I(B.background.bottomColor),
				radius: B.background.radius
			},
			candle: { wickWidth: B.candle.wickWidth },
			indicators: G
		}, Ve(), jt.current || Ct.current?.();
	}, [
		W,
		G,
		q,
		O,
		e,
		U,
		A,
		Wt,
		R,
		Ve,
		V,
		Me,
		De,
		Se,
		Ce,
		we
	]), i(() => {
		if (z === 0 || !ct.current || R === 0) return;
		let e = -(U - 1), t = Math.max(0, z - U), n = Math.max(e, Math.min(C, t)), r = (R - $.left - $.right - wr) / U, i = (n + U - z) * r;
		ct.current.setAttribute("transform", `translate(${i},0)`), V.baseTranslateX = i, Me("pan"), Z.current?.setTransform(i), Ve();
	}, [
		C,
		U,
		z,
		R,
		V,
		Me,
		Ve
	]);
	let $t = o(() => {
		if (ie === !1) return [];
		let e = F ?? [];
		if (!ae) return e;
		let t = new Set(ae);
		return e.filter((e) => t.has(e.pattern_name));
	}, [
		F,
		ie,
		ae ? [...ae].sort().join(",") : "*"
	]);
	return i(() => {
		let e = Z.current;
		!e || V.data.length === 0 || e.update({
			detections: $t,
			bars: V.data,
			xScale: V.xScale,
			yPrice: V.yPrice,
			step: V.step,
			bandwidth: V.bandwidth,
			priceHeight: V.priceHeight,
			width: V.width,
			baseTranslateX: V.baseTranslateX,
			dataLength: V.data.length,
			marginTop: $.top,
			patternStyle: B.patterns,
			resolveColor: (e) => _e.current?.resolve(e) ?? "#888888"
		});
	}, [
		$t,
		W,
		V,
		Ee,
		De
	]), i(() => {
		let e = yt.current, t = bt.current;
		if (!(!e || !t)) for (let n of [e, t]) n.attr("stroke", B.crosshair.color).attr("stroke-opacity", B.crosshair.opacity).attr("stroke-dasharray", B.crosshair.dash);
	}, [Te]), i(() => {
		let e = !1, t = 0, n = 1, r = null, i = 0, a = () => {
			r = null;
			let e = Math.exp(-i / 200);
			qe(Math.max(.1, Math.min(20, n * e)));
		}, o = () => {
			e && (e = !1, L.current && (L.current.style.cursor = ""), r != null && (cancelAnimationFrame(r), r = null));
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
			let r = Dt.current;
			r && (r.on("mousedown", function(r) {
				r.preventDefault(), r.stopPropagation(), e = !0, t = r.clientY, n = Je.current, L.current && (L.current.style.cursor = "ns-resize");
			}), r.on("dblclick", function(e) {
				e.preventDefault(), e.stopPropagation(), qe(1);
			}), r.on("mouseenter", function() {
				Xe(!0);
			}), r.on("mouseleave", function() {
				Xe(!1);
			}));
		};
		c();
		let l = setTimeout(c, 0);
		return () => {
			clearTimeout(l), document.removeEventListener("mousemove", s), document.removeEventListener("mouseup", o);
			let e = Dt.current;
			e && e.on("mousedown", null).on("dblclick", null).on("mouseenter", null).on("mouseleave", null), r != null && cancelAnimationFrame(r);
		};
	}, []), i(() => {
		let e = Et.current;
		if (!e) return;
		let t = (e) => {
			for (let t of Nt.current) t(e);
		}, n = (e) => {
			let t = V.data;
			if (t.length === 0) {
				xt.current?.style("visibility", "hidden");
				return;
			}
			let n = e < 0 || e >= t.length ? t.length - 1 : e, r = t[n], i = n > 0 ? t[n - 1].close : r.open, a = r.close - i, o = (a / i * 100).toFixed(2), s = a >= 0 ? "+" : "", c = a >= 0 ? "var(--chart-positive)" : "var(--chart-negative)", l = [
				{
					text: `${r.date}  `,
					fill: c
				},
				{
					text: "O: ",
					fill: Or
				},
				{
					text: `${E(r.open)}  `,
					fill: c
				},
				{
					text: "H: ",
					fill: Or
				},
				{
					text: `${E(r.high)}  `,
					fill: c
				},
				{
					text: "L: ",
					fill: Or
				},
				{
					text: `${E(r.low)}  `,
					fill: c
				},
				{
					text: "C: ",
					fill: Or
				},
				{
					text: `${E(r.close)}  `,
					fill: c
				},
				{
					text: `${s}${o}%  `,
					fill: c
				},
				{
					text: "Vol: ",
					fill: Or
				},
				{
					text: D(r.volume),
					fill: c
				}
			], u = St.current;
			for (let e = 0; e < u.length; e++) u[e].text(l[e].text).attr("fill", l[e].fill);
			xt.current.style("visibility", "visible");
		}, r = () => n(V.data.length - 1);
		Ct.current = r;
		let i = () => {
			yt.current?.style("visibility", "hidden"), bt.current?.style("visibility", "hidden"), r(), t(null), wt.current?.style("visibility", "hidden"), Z.current?.setPointer(null, null);
		}, a = () => {
			Y.current = null;
			let e = jt.current;
			if (!e || V.data.length === 0) return;
			let { mx: i, my: a } = e;
			Z.current?.setPointer(i, a);
			let { data: o, yPrice: s, step: c, bandwidth: l, visibleBarsInt: u, visibleStartIdx: d, priceHeight: f, width: p } = V;
			if (bt.current.attr("y1", a).attr("y2", a).style("visibility", "visible"), a <= f && i <= p) {
				let e = s.invert(a);
				wt.current.attr("transform", `translate(${p + 2},${a - 9})`).style("visibility", "visible"), Tt.current.text(Pe.current(e));
			} else wt.current.style("visibility", "hidden");
			let m = Math.floor(i / c);
			if (m < 0 || m >= u) {
				yt.current.attr("x1", i).attr("x2", i).style("visibility", "visible"), r(), t(null);
				return;
			}
			let h = m * c + l / 2;
			yt.current.attr("x1", h).attr("x2", h).style("visibility", "visible");
			let g = d + m;
			if (g < 0 || g >= o.length) {
				r(), t(null);
				return;
			}
			n(g), t(g);
		};
		e.on("mousedown", function(e) {
			e.preventDefault();
			for (let e of Gt.current) e();
			V.data.length !== 0 && (et.current = {
				active: !0,
				startX: e.clientX,
				startOffset: nt.current,
				baseTx: V.baseTranslateX,
				step: V.step,
				minOff: -(V.visibleBars - 1),
				maxOff: Math.max(0, V.data.length - V.visibleBars)
			}, st.current = 0, Y.current != null && (cancelAnimationFrame(Y.current), Y.current = null), jt.current = null, i(), L.current && (L.current.style.cursor = "grabbing"));
		});
		let o = v.select(me.current);
		return o.on("mousemove.crosshair", function(e) {
			if (et.current.active) return;
			let t = lt.current;
			if (!t) return;
			let [n, r] = v.pointer(e, t.node());
			jt.current = {
				mx: n,
				my: r
			}, Y.current ??= requestAnimationFrame(a);
		}).on("mouseleave.crosshair", function(e) {
			if (et.current.active) return;
			Y.current != null && (cancelAnimationFrame(Y.current), Y.current = null);
			let t = e.relatedTarget;
			if (t && typeof t.closest == "function" && (t.closest("[data-chart-legend]") || t.closest("[data-chart-stats]"))) {
				yt.current?.style("visibility", "hidden"), bt.current?.style("visibility", "hidden"), wt.current?.style("visibility", "hidden");
				return;
			}
			jt.current = null, i();
		}), jt.current || r(), () => {
			e.on("mousedown", null), o.on("mousemove.crosshair", null).on("mouseleave.crosshair", null), Y.current != null && (cancelAnimationFrame(Y.current), Y.current = null);
		};
	}, [V]), !e || e.length === 0 ? /* @__PURE__ */ u("div", {
		className: P ? M.chartWrapperBare : M.chartWrapper,
		ref: L,
		children: /* @__PURE__ */ u("div", {
			className: M.empty,
			children: N ? /* @__PURE__ */ d(l, { children: [/* @__PURE__ */ u(f, {
				size: 32,
				className: M.emptyIcon
			}), "No data available"] }) : /* @__PURE__ */ d(l, { children: [/* @__PURE__ */ u(h, {
				size: 32,
				className: M.emptyIcon
			}), "Select a stock to view chart"] })
		})
	}) : /* @__PURE__ */ u(ur, {
		value: V,
		children: /* @__PURE__ */ u(pr, {
			value: qt,
			children: /* @__PURE__ */ d("div", {
				className: P ? M.chartWrapperBare : M.chartWrapper,
				ref: L,
				"data-trade-overlay-anchor": "",
				children: [
					/* @__PURE__ */ u("canvas", {
						ref: he,
						className: M.seriesCanvas,
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ u("svg", {
						ref: me,
						className: M.chartSvg
					}),
					W != null && /* @__PURE__ */ u(nn, {
						indicators: k,
						onIndicatorsChange: ee,
						resolved: G,
						subpanes: W.subpanes,
						marginTop: $.top,
						marginLeft: $.left,
						barCount: z,
						expanded: j,
						onExpandedChange: ne,
						subscribeHoverIndex: X,
						priceFormatter: Ne,
						resolveColor: (e) => _e.current?.resolve(e) ?? "#888888"
					}),
					W != null && W.subpanes.map((e, t) => {
						let n = $.top + e.top;
						return /* @__PURE__ */ u("div", {
							className: M.subpaneDivider,
							style: {
								top: n - 8 / 2,
								height: 8
							},
							onPointerDown: We(t),
							onPointerMove: Ge,
							onPointerUp: Ke,
							children: /* @__PURE__ */ u("span", { className: M.subpaneDividerLine })
						}, e.key);
					}),
					se !== !1 && Be && z > 0 && /* @__PURE__ */ u(cn, {
						model: Be,
						size: ue,
						marginRight: $.right,
						position: I ?? null,
						onPositionChange: le
					}),
					He > 0 && /* @__PURE__ */ u("button", {
						type: "button",
						className: `${M.resetPanBtn} ${C === 0 ? M.resetPanBtnInactive : ""}`,
						title: "Reset pan",
						onClick: () => w(0),
						disabled: C === 0,
						style: {
							top: He - 26,
							right: $.right + 2
						},
						children: /* @__PURE__ */ u(g, { size: 14 })
					}),
					He > 0 && $e && /* @__PURE__ */ u("button", {
						type: "button",
						className: `${M.autoFitBtn} ${q === 1 ? M.autoFitBtnActive : ""}`,
						title: q === 1 ? A === "priceAndOverlays" ? "Auto-fit: price + overlays (click for price-only)" : "Auto-fit: price-only (click to include overlays)" : "Auto-fit price scale (off — drag y-axis to enable)",
						onClick: () => {
							if (q !== 1) {
								qe(1);
								return;
							}
							te(A === "priceAndOverlays" ? "price" : "priceAndOverlays");
						},
						onMouseEnter: () => Qe(!0),
						onMouseLeave: () => Qe(!1),
						style: {
							top: He - 26,
							right: $.right - 26,
							color: q === 1 && A === "priceAndOverlays" ? "#22c55e" : void 0
						},
						children: "A"
					}),
					fe && /* @__PURE__ */ d(l, { children: [/* @__PURE__ */ u("button", {
						type: "button",
						className: M.settingsGearBtn,
						title: "Chart settings",
						onMouseDown: (e) => e.stopPropagation(),
						onClick: () => Ae((e) => !e),
						style: {
							right: 4,
							bottom: 4
						},
						children: /* @__PURE__ */ u(_, { size: 14 })
					}), ke && /* @__PURE__ */ u(Xt, {
						appearance: de ?? {},
						onAppearanceChange: fe,
						resolveColor: (e) => _e.current?.resolve(e) ?? "#888888",
						onClose: () => Ae(!1),
						style: {
							right: $.right + 4,
							bottom: $.bottom + 4
						}
					})] }),
					pe
				]
			})
		})
	});
}), Mr = M.resetPanBtn;
//#endregion
export { At as APPEARANCE_DEFAULTS, jr as Chart, Ft as ChartControls, se as LINE_STYLE_OPTIONS, x as MIN_BAR_STEP_PX, S as MIN_VISIBLE_BARS, Ot as OVERLAY_ORDER, A as PATTERN_CATALOG, te as PATTERN_NAMES, y as RANGES, b as RANGE_DAYS, kt as SUBPANE_ORDER, Xt as SettingsDialog, Qt as ZoomSlider, j as barIndexForDate, $e as computeAdx, Qe as computeAtr, Ze as computeDx, L as computeEMA, he as computeExpandingMax, me as computeRollingHigh, ee as computeVolumeStats, ce as dashFor, ne as dateForBarIndex, Tt as defaultConfigFor, He as dema, Mt as effectiveAppearance, K as emaTalib, Dt as formatIndicatorParams, E as formatPrice, D as formatVolume, O as formatVolumeTick, J as getIndicator, I as lineStyleFrom, St as listIndicators, We as maDispatch, T as maxVisibleBarsForWidth, Mr as panButtonClass, et as rawStochK, xt as registerIndicator, qe as rollingMax, Je as rollingMin, Xe as rsi, G as sma, tt as stddevPop, Ue as tema, Ye as trueRange, vr as useBackgroundPointerDown, gr as useChartGeometry, hr as useChartOverlayHost, dr as useChartScale, _r as useReportOverlayPriceBounds, Ke as wilderSmooth, q as wilderSum, Be as wma };
