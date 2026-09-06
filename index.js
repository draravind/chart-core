import e, { createContext as t, useCallback as n, useContext as r, useEffect as i, useLayoutEffect as a, useMemo as o, useRef as s, useState as c } from "react";
import { Fragment as l, jsx as u, jsxs as d } from "react/jsx-runtime";
import { BarChart3 as f, ChevronDown as p, ChevronUp as m, GripHorizontal as h, Minus as g, MousePointer2 as _, MousePointerClick as v, MoveHorizontal as y, MoveVertical as b, RotateCcw as x, Ruler as S, Settings as C, Slash as w, Trash2 as T, TrendingUp as E, Type as D } from "lucide-react";
import * as O from "d3";
//#region src/types.ts
var k = [
	"3M",
	"6M",
	"1Y",
	"2Y",
	"3Y",
	"5Y",
	"10Y",
	"20Y"
], ee = {
	"3M": 66,
	"6M": 132,
	"1Y": 252,
	"2Y": 504,
	"3Y": 756,
	"5Y": 1260
}, te = {
	"3M": .25,
	"6M": .5,
	"1Y": 1,
	"2Y": 2,
	"3Y": 3,
	"5Y": 5,
	"10Y": 10,
	"20Y": 20
}, ne = 30, re = [
	"3M",
	"6M",
	"1Y",
	"2Y",
	"3Y",
	"5Y"
].map((e) => ({
	key: e,
	bars: ee[e]
})), ie = 2, ae = 10, oe = 78;
function se(e) {
	return Math.floor((e - oe) / 2);
}
var ce = 1440 * 60 * 1e3, le = 365.25, ue = 252;
function de(e) {
	let t = e.length;
	if (t < 2) return 252;
	let n = Date.parse(e[0].date), r = Date.parse(e[t - 1].date);
	return !Number.isFinite(n) || !Number.isFinite(r) || r <= n ? 252 : le / ((r - n) / ce / (t - 1));
}
function fe(e, t) {
	let n = de(e);
	return k.map((e) => ({
		key: e,
		bars: Math.round(te[e] * n)
	})).filter((e) => e.bars >= 30 && e.bars <= t);
}
function pe(e) {
	return Math.max(10, se(e));
}
function me(e, t) {
	return {
		minOffset: -(t - 1),
		maxOffset: Math.max(0, e - 1)
	};
}
function he(e, t, n) {
	let { minOffset: r, maxOffset: i } = me(t, n);
	return Math.max(r, Math.min(e, i));
}
function ge(e, t, n, r, i) {
	let a = (n - t) * i, o = (r - t) * i;
	return Math.max(a, Math.min(o, e));
}
var _e = (e) => e == null ? "" : e.toLocaleString("en-IN", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), ve = (e) => e == null ? "" : e >= 1e9 ? (e / 1e9).toFixed(2) + "B" : e >= 1e6 ? (e / 1e6).toFixed(2) + "M" : e >= 1e3 ? (e / 1e3).toFixed(0) + "K" : e.toString(), ye = (e) => e == null ? "" : e >= 1e9 ? Math.round(e / 1e9) + "B" : e >= 1e6 ? Math.round(e / 1e6) + "M" : e >= 1e3 ? Math.round(e / 1e3) + "K" : e.toString(), be = 1440 * 60 * 1e3;
function xe(e, t = 30, n = 365) {
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
	let l = new Date(e[r - 1].date).getTime() - n * be, u = -1, d = 0;
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
var Se = [
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
], Ce = Se.map((e) => e.name);
//#endregion
//#region src/stats/position.ts
function we(e, t, n, r) {
	return {
		left: t.left + e.ax * (t.width - n) + e.dx,
		top: t.top + e.ay * (t.height - r) + e.dy
	};
}
function Te(e, t, n, r, i) {
	return {
		left: Math.min(Math.max(n.left, e), n.left + Math.max(0, n.width - r)),
		top: Math.min(Math.max(n.top, t), n.top + Math.max(0, n.height - i))
	};
}
function Ee(e, t, n, r, i) {
	let a = n.width ? (e + r / 2 - n.left) / n.width : .5, o = n.height ? (t + i / 2 - n.top) / n.height : .5, s = a < 1 / 3 ? 0 : a < 2 / 3 ? .5 : 1, c = o < 1 / 3 ? 0 : o < 2 / 3 ? .5 : 1;
	return {
		v: 2,
		ax: s,
		ay: c,
		dx: e - (n.left + s * (n.width - r)),
		dy: t - (n.top + c * (n.height - i))
	};
}
function De(e, t, n, r) {
	return {
		v: 2,
		ax: e,
		ay: t,
		dx: n,
		dy: r
	};
}
function Oe() {
	return De(1, 1, -8, -8);
}
function ke(e) {
	if (!e || typeof e != "object") return null;
	let t = e;
	return t.v === 2 ? je(t.ax) && je(t.ay) && je(t.dx) && je(t.dy) ? e : null : t.v === void 0 && je(t.x) && je(t.y) ? e : null;
}
function Ae(e, t, n, r) {
	let i = Te(e.x, e.y, t, n, r);
	return Ee(i.left, i.top, t, n, r);
}
function je(e) {
	return typeof e == "number" && Number.isFinite(e);
}
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
function Me(e, t) {
	return e.length === 0 ? "" : e[Math.max(0, Math.min(e.length - 1, t))].date;
}
var Ne = 864e5;
function Pe(e, t = 20) {
	let n = e.length;
	if (n < 2) return Ne;
	let r = [];
	for (let i = Math.max(1, n - t); i < n; i++) r.push(Date.parse(e[i].date) - Date.parse(e[i - 1].date));
	r.sort((e, t) => e - t);
	let i = r[r.length >> 1];
	return i > 0 ? i : Ne;
}
function Fe(e, t) {
	if (e.length === 0) return "";
	let n = Date.parse(e[e.length - 1].date);
	return new Date(n + t * Pe(e)).toISOString().slice(0, 10);
}
function Ie(e, t) {
	if (e.length === 0) return 0;
	let n = Date.parse(e[e.length - 1].date), r = (Date.parse(t) - n) / Pe(e);
	return Math.max(0, Math.round(r));
}
function Le(e, t) {
	if (e.length === 0) return 0;
	let n = A(e, t);
	if (n != null) return n;
	let r = Pe(e), i = Date.parse(t);
	if (t < e[0].date) return Math.floor((i - Date.parse(e[0].date)) / r);
	let a = e.length - 1;
	return a + Math.floor((i - Date.parse(e[a].date)) / r);
}
function Re(e, t) {
	if (e.length === 0) return "";
	let n = e.length - 1;
	if (t >= 0 && t <= n) return e[Math.round(t)].date;
	let r = Pe(e), i = t < 0 ? 0 : n, a = Date.parse(e[i].date) + (t - i) * r;
	return new Date(a).toISOString().slice(0, 10);
}
var j = {
	chartWrapper: "_chartWrapper_1hwba_4",
	chartWrapperBare: "_chartWrapperBare_1hwba_15",
	chartFrame: "_chartFrame_1hwba_31",
	chartFrameBare: "_chartFrameBare_1hwba_37",
	seriesCanvas: "_seriesCanvas_1hwba_47",
	chartSvg: "_chartSvg_1hwba_54",
	empty: "_empty_1hwba_72",
	emptyIcon: "_emptyIcon_1hwba_82",
	resetPanBtn: "_resetPanBtn_1hwba_87",
	resetPanBtnInactive: "_resetPanBtnInactive_1hwba_114",
	autoFitBtn: "_autoFitBtn_1hwba_123",
	autoFitBtnActive: "_autoFitBtnActive_1hwba_148",
	subpaneDivider: "_subpaneDivider_1hwba_159",
	subpaneDividerLine: "_subpaneDividerLine_1hwba_170",
	legend: "_legend_1hwba_186",
	legendBlock: "_legendBlock_1hwba_194",
	legendItem: "_legendItem_1hwba_202",
	legendValues: "_legendValues_1hwba_221",
	legendToggle: "_legendToggle_1hwba_230",
	legendDot: "_legendDot_1hwba_248",
	legendLabel: "_legendLabel_1hwba_255",
	legendBtn: "_legendBtn_1hwba_260",
	legendPopover: "_legendPopover_1hwba_288",
	legendPopoverHeader: "_legendPopoverHeader_1hwba_303",
	legendPopoverTitle: "_legendPopoverTitle_1hwba_323",
	legendPopoverSummary: "_legendPopoverSummary_1hwba_333",
	legendPopoverClose: "_legendPopoverClose_1hwba_339",
	panelScrollBody: "_panelScrollBody_1hwba_361",
	legendPopoverField: "_legendPopoverField_1hwba_369",
	selectWrap: "_selectWrap_1hwba_442",
	legendColorField: "_legendColorField_1hwba_470",
	legendColorControls: "_legendColorControls_1hwba_489",
	legendColorHex: "_legendColorHex_1hwba_522",
	fieldResetBtn: "_fieldResetBtn_1hwba_555",
	lineFieldControls: "_lineFieldControls_1hwba_589",
	lineFieldSelect: "_lineFieldSelect_1hwba_621",
	lineFieldWidth: "_lineFieldWidth_1hwba_634",
	lineFieldOpacity: "_lineFieldOpacity_1hwba_655",
	sliderControl: "_sliderControl_1hwba_661",
	sliderValue: "_sliderValue_1hwba_671",
	settingsGearBtn: "_settingsGearBtn_1hwba_679",
	settingsDialog: "_settingsDialog_1hwba_706",
	centeredPanel: "_centeredPanel_1hwba_731",
	autoFitMenu: "_autoFitMenu_1hwba_746",
	autoFitMenuRow: "_autoFitMenuRow_1hwba_762",
	autoFitMenuEmpty: "_autoFitMenuEmpty_1hwba_776",
	settingsSectionTitle: "_settingsSectionTitle_1hwba_782",
	settingsGroupTitle: "_settingsGroupTitle_1hwba_796"
}, M = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
function N(e, t, n) {
	if (!e || t < 0 || t >= e.length) return "";
	let r = e[t];
	return Number.isNaN(r) ? "" : n(r);
}
function ze(e, t, n, r, i) {
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
	e.stroke(), e.restore(), t.hit?.add({
		spanAt: (e) => {
			let r = n[e];
			if (r === void 0 || Number.isNaN(r) || !i(e)) return null;
			let a = t.y(r);
			return [a, a];
		},
		halfWidth: 0,
		interpolate: !0
	});
}
function P(e, t, n, r) {
	for (let i of r) {
		let r = t[i.key];
		r && ze(e, n, r, i.st, (e) => !Number.isNaN(r[e]));
	}
}
function Be(e, t, n, r, i) {
	let { renderStart: a, renderEnd: o } = t, s = Math.round(t.originY + t.y(0) * t.vRatio), c = Math.max(1, Math.floor(t.vRatio));
	e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.globalAlpha = r.opacity ?? 1;
	for (let l = a; l < o; l++) {
		let a = n[l];
		if (Number.isNaN(a)) continue;
		let { left: o, width: u } = t.barSlot(l), d = Math.round(t.originY + t.y(a) * t.vRatio);
		e.fillStyle = a >= 0 ? r.color : i ?? r.color;
		let f = Math.min(d, s);
		e.fillRect(o, f, u, Math.max(c, Math.abs(s - d)));
	}
	if (e.restore(), o > a) {
		let e = t.y(0), r = t.barSlot(a).width / (2 * t.hRatio);
		t.hit?.add({
			spanAt: (r) => {
				let i = n[r];
				return i === void 0 || Number.isNaN(i) ? null : [e, t.y(i)];
			},
			halfWidth: r,
			interpolate: !1
		});
	}
}
function F(e, t, n, r, i, a = 2.5) {
	let { xScale: o, bandwidth: s, renderStart: c, renderEnd: l } = t;
	e.save(), e.fillStyle = r.color, e.globalAlpha = r.opacity ?? 1;
	for (let r = c; r < l; r++) {
		if (!i(r) || Number.isNaN(n[r])) continue;
		let c = o(r) + s / 2;
		e.beginPath(), e.arc(c, t.y(n[r]), a, 0, Math.PI * 2), e.fill();
	}
	e.restore(), t.hit?.add({
		spanAt: (e) => {
			let r = n[e];
			if (r === void 0 || Number.isNaN(r) || !i(e)) return null;
			let o = t.y(r);
			return [o - a, o + a];
		},
		halfWidth: a,
		interpolate: !1
	});
}
//#endregion
//#region src/indicators/settingsOptions.ts
var Ve = [
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
], He = [
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
function Ue(e) {
	return e === 1 ? [4, 3] : e === 2 ? [1, 2] : null;
}
//#endregion
//#region src/indicators/lineSettings.ts
function I(e, t, n) {
	return {
		color: n(String(e[`${t}Color`])),
		width: Number(e[`${t}Width`]),
		dash: Ue(Number(e[`${t}Style`])),
		opacity: Number(e[`${t}Opacity`])
	};
}
//#endregion
//#region src/indicators/builtins/rollingHigh.ts
function We(e, t) {
	let n = new Float64Array(e.length);
	for (let r = 0; r < e.length; r++) n[r] = e[r][t] ?? NaN;
	return n;
}
function L(e, t, n, r) {
	let i = n[e][t];
	if (Number.isNaN(i)) return !1;
	let a = r[t];
	if (a && i === a.high) return !1;
	if (e === "highAll") return !0;
	let o = n[e === "high1y" ? "high2y" : e === "high2y" ? "high3y" : "highAll"][t];
	return Number.isNaN(o) ? !1 : Math.abs(i - o) / o > .01;
}
var Ge = [
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
], Ke = {
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
		high1y: We(e.bars, "high1y"),
		high2y: We(e.bars, "high2y"),
		high3y: We(e.bars, "high3y"),
		highAll: We(e.bars, "highAll")
	} }),
	draw: (e, t, n, r, i) => {
		for (let a of Ge) {
			let o = t[a.key];
			o && ze(e, n, o, I(r, a.key, i), (e) => L(a.key, e, t, n.data));
		}
	},
	autofitKeys: () => [
		"high1y",
		"high2y",
		"high3y",
		"highAll"
	],
	legend: (e, t, n, r) => Ge.map((i) => ({
		color: String(n[`${i.key}Color`]),
		label: i.label,
		value: N(e[i.key], t, r.priceFmt)
	}))
}, qe = (e) => Math.round(e * 100) / 100;
function Je(e, t) {
	let n = e.length, r = new Float64Array(n), i = 2 / (t + 1), a = NaN;
	for (let t = 0; t < n; t++) {
		let n = e[t];
		if (Number.isNaN(n)) {
			r[t] = NaN, a = NaN;
			continue;
		}
		a = Number.isNaN(a) ? n : i * n + (1 - i) * a, r[t] = qe(a);
	}
	return r;
}
function R(e, t) {
	let n = e.length, r = new Float64Array(n), i = [], a = 0;
	for (let o = 0; o < n; o++) {
		let n = e[o];
		if (Number.isNaN(n)) {
			r[o] = NaN;
			continue;
		}
		for (; i.length - a > 0 && i[a] <= o - t;) a++;
		for (; i.length - a > 0 && e[i[i.length - 1]] <= n;) i.pop();
		i.push(o), r[o] = qe(e[i[a]]);
	}
	return r;
}
function Ye(e) {
	let t = e.length, n = new Float64Array(t), r = NaN;
	for (let i = 0; i < t; i++) {
		let t = e[i];
		if (Number.isNaN(t)) {
			n[i] = NaN;
			continue;
		}
		r = Number.isNaN(r) ? t : Math.max(r, t), n[i] = qe(r);
	}
	return n;
}
//#endregion
//#region src/indicators/builtins/rsLine.ts
var z = (e) => Math.round(e * 100) / 100, Xe = {
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
		for (let e = 0; e < n; e++) r[e] = Number.isNaN(o[e]) ? NaN : z(o[e] * c);
		let l = R(r, t.lookback), u = R(e.h, t.lookback);
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
		a && (ze(e, n, a, I(r, "line", i), (e) => !Number.isNaN(a[e])), o && F(e, n, a, {
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
}, Ze = 12, Qe = .18, $e = {
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
		let { xScale: o, bandwidth: s, renderStart: c, renderEnd: l } = n, u = Math.max(...n.yPrice.range()), d = u - Ze;
		e.save(), e.fillStyle = i(r.bandColor), e.globalAlpha = Qe;
		let f = -1, p = (t) => {
			let n = o(f), r = o(t) + s;
			e.fillRect(n, d, r - n, Ze);
		};
		for (let e = c; e < l; e++) a[e] === 1 ? f === -1 && (f = e) : f !== -1 && (p(e - 1), f = -1);
		f !== -1 && p(l - 1), e.restore(), n.hit?.add({
			spanAt: (e) => a[e] === 1 ? [d, u] : null,
			halfWidth: o.step() / 2,
			interpolate: !1
		});
	},
	autofitKeys: () => [],
	legend: (e, t, n) => [{
		color: n.bandColor,
		label: "Stage 2",
		value: null
	}]
}, et = "#888888";
function tt(e) {
	let t = document.createElement("span");
	t.style.position = "absolute", t.style.width = "0", t.style.height = "0", t.style.visibility = "hidden", t.style.pointerEvents = "none", e.appendChild(t);
	let n = /* @__PURE__ */ new Map();
	return {
		resolve(e, r = "color") {
			let i = `${r}|${e}`, a = n.get(i);
			if (a !== void 0) return a;
			let o = r === "color" ? et : "", s = o;
			try {
				t.style.setProperty(r, ""), t.style.setProperty(r, e);
				let n = getComputedStyle(t).getPropertyValue(r);
				n && (s = n);
			} catch {
				s = o;
			}
			return n.set(i, s), s;
		},
		destroy() {
			n.clear(), t.remove();
		}
	};
}
function nt(e, t, n, r) {
	let i = e(t, "font-weight"), a = e(n, "font-size"), o = e("var(--font-family-base)", "font-family");
	return !i || !a || !o ? r : `${i} ${a} ${o}`;
}
//#endregion
//#region src/indicators/builtins/quarterlyResults.ts
var rt = 40, it = 70, at = 65, ot = "500 10px 'Helvetica Neue', Helvetica, Arial, sans-serif", st = 864e5, ct = 365 * st, lt = 48, ut = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), dt = (e) => `${e >= 0 ? "+" : ""}${e.toFixed(1)}%`;
function ft(e, t) {
	let n = e[t] - ct, r = -1, i = Infinity;
	for (let t = 0; t < e.length; t++) {
		let a = Math.abs(e[t] - n) / st;
		a <= rt && a < i && (i = a, r = t);
	}
	return r;
}
function pt(e, t) {
	let n = e.length, r = new Float64Array(n);
	r.fill(NaN);
	let i = e.map((e) => new Date(e.date).getTime());
	for (let a = 0; a < n; a++) {
		let n = e[a][t];
		if (n == null || !Number.isFinite(n)) continue;
		let o = ft(i, a);
		if (o < 0) continue;
		let s = e[o][t];
		s == null || !Number.isFinite(s) || s === 0 || (r[a] = (n - s) / Math.abs(s) * 100);
	}
	return r;
}
function mt(e, t) {
	let n = Array(e.length).fill(!1), r = Infinity;
	for (let i = e.length - 1; i >= 0; i--) (r === Infinity || Math.abs(r - e[i]) >= t) && (n[i] = !0, r = e[i]);
	return n;
}
function B(e) {
	let t = [...e.quarterlyResults ?? []].sort((e, t) => e.date < t.date ? -1 : +(e.date > t.date)), n = pt(t, "eps"), r = pt(t, "rps"), i = e.market === "US" ? "$" : "₹", a = t.map((e, t) => {
		let a = e.eps == null ? NaN : e.eps, o = e.rps == null ? NaN : e.rps, s = n[t], c = r[t];
		return {
			label: e.label,
			eps: a,
			rps: o,
			epsText: Number.isFinite(a) ? i + ut(a) : "--",
			rpsText: Number.isFinite(o) ? i + ut(o) : "--",
			epsGrowthText: Number.isNaN(s) ? "" : dt(s),
			rpsGrowthText: Number.isNaN(c) ? "" : dt(c),
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
function ht(e, t, n, r) {
	let i = e.textAlign;
	e.textAlign = "left";
	let a = r.map((t) => e.measureText(t.text).width), o = t - (a.reduce((e, t) => e + t, 0) + 4 * Math.max(0, r.length - 1)) / 2;
	for (let t = 0; t < r.length; t++) e.fillStyle = r[t].color, e.fillText(r[t].text, o, n), o += a[t] + 4;
	e.textAlign = i;
}
var gt = (e, t, n, r, i, a) => {
	let o = a;
	if (!o) return;
	let s = r.display === 1 ? "bars" : "text", { xScale: c, bandwidth: l, renderStart: u, renderEnd: d } = n, f = n.paneTop ?? 0, p = n.paneBottom ?? 0, m = p - f;
	if (m <= 0) return;
	let h = i(r.epsColor), g = i(r.rpsColor), _ = i(r.growthUpColor), v = i(r.growthDownColor), y = i(r.labelColor);
	e.save(), e.beginPath(), e.rect(-1e6, f, 2e6, m), e.clip(), e.font = nt(i, "var(--font-weight-medium)", "var(--text-3xs)", ot);
	let b = [];
	for (let e = u; e < d; e++) {
		let n = t.anchor[e];
		if (Number.isNaN(n)) continue;
		let r = o[n];
		r && b.push({
			g: e,
			x: (c(e) ?? 0) + l / 2,
			row: r
		});
	}
	if (s === "text") {
		let t = mt(b.map((e) => e.x), it);
		e.textAlign = "center", e.textBaseline = "alphabetic";
		for (let e = 0; e < b.length; e++) {
			if (!t[e]) continue;
			let r = b[e].g;
			n.hit?.add({
				spanAt: (e) => e === r ? [f, p] : null,
				halfWidth: it / 2,
				interpolate: !1
			});
		}
		if (m >= at) {
			let n = m / 5.5, r = f + n * .9, i = f + n * 1.9, a = f + n * 2.7, o = f + n * 3.9, s = f + n * 4.7;
			for (let n = 0; n < b.length; n++) {
				if (!t[n]) continue;
				let { x: c, row: l } = b[n];
				e.fillStyle = y, e.fillText(l.label, c, r), e.fillStyle = Number.isFinite(l.eps) ? h : y, e.fillText(l.epsText, c, i), l.epsGrowthText && (e.fillStyle = l.epsGrowthUp ? _ : v, e.fillText(l.epsGrowthText, c, a)), e.fillStyle = Number.isFinite(l.rps) ? g : y, e.fillText(l.rpsText, c, o), l.rpsGrowthText && (e.fillStyle = l.rpsGrowthUp ? _ : v, e.fillText(l.rpsGrowthText, c, s));
			}
		} else {
			let n = m / 3.2, r = f + n * .9, i = f + n * 1.9, a = f + n * 2.9;
			for (let n = 0; n < b.length; n++) {
				if (!t[n]) continue;
				let { x: o, row: s } = b[n];
				e.fillStyle = y, e.fillText(s.label, o, r), ht(e, o, i, [
					{
						text: "EPS",
						color: y
					},
					{
						text: s.epsText,
						color: Number.isFinite(s.eps) ? h : y
					},
					...s.epsGrowthText ? [{
						text: s.epsGrowthText,
						color: s.epsGrowthUp ? _ : v
					}] : []
				]), ht(e, o, a, [
					{
						text: "RPS",
						color: y
					},
					{
						text: s.rpsText,
						color: Number.isFinite(s.rps) ? g : y
					},
					...s.rpsGrowthText ? [{
						text: s.rpsGrowthText,
						color: s.rpsGrowthUp ? _ : v
					}] : []
				]);
			}
		}
		e.restore();
		return;
	}
	let x = n.y(0), S = [];
	for (let e = 0; e < t.anchor.length; e++) Number.isNaN(t.anchor[e]) || S.push(e);
	let C = 63;
	if (S.length >= 2) {
		let e = [];
		for (let t = 1; t < S.length; t++) e.push(S[t] - S[t - 1]);
		e.sort((e, t) => e - t), C = e[Math.floor(e.length / 2)];
	}
	let w = C * c.step(), T = Math.min(lt, w * .3), E = Math.min(4, T * .12), D = Math.max(1, (T - E) / 2), O = (t, r, i) => {
		if (!Number.isFinite(r)) return;
		let a = n.y(r), o = Math.min(x, a), s = Math.max(1, Math.abs(x - a));
		e.fillStyle = i, e.fillRect(t, o, D, s);
	}, k = mt(b.map((e) => e.x), it);
	e.textAlign = "center";
	for (let t = 0; t < b.length; t++) {
		let { x: r, row: i } = b[t], a = r - E / 2 - D, o = r + E / 2;
		O(a, i.rps, g), O(o, i.eps, h);
		let s = b[t].g, c = [x];
		Number.isFinite(i.rps) && c.push(n.y(i.rps)), Number.isFinite(i.eps) && c.push(n.y(i.eps));
		let l = Math.min(...c), u = Math.max(...c);
		if (n.hit?.add({
			spanAt: (e) => e === s ? [l, u] : null,
			halfWidth: T / 2,
			interpolate: !1
		}), !k[t]) continue;
		let d = (t, r, i, a) => {
			if (!i || !Number.isFinite(r)) return;
			let o = Math.min(x, n.y(r));
			e.fillStyle = a ? _ : v, e.textBaseline = "bottom", e.fillText(i, t + D / 2, o - 2);
		};
		d(a, i.rps, i.rpsGrowthText, i.rpsGrowthUp), d(o, i.eps, i.epsGrowthText, i.epsGrowthUp);
	}
	e.restore();
}, _t = {
	fixedDomain: [0, 1],
	hideAxis: !0
}, vt = {
	includeZero: !0,
	guideLines: [0],
	autofitPadding: 0,
	topPadPx: 17
}, yt = {
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
	compute: (e) => B(e),
	draw: gt,
	autofitKeys: (e) => e.display === 1 ? ["eps", "rps"] : [],
	domain: (e, t) => t.display === 1 ? vt : _t,
	legend: (e, t, n) => [{
		color: n.rpsColor,
		label: "RPS",
		value: N(e.rps, t, M)
	}, {
		color: n.epsColor,
		label: "EPS",
		value: N(e.eps, t, M)
	}]
}, bt = .5, xt = 2, St = 9, Ct = "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";
function wt(e, t) {
	let n = e.c.length, r = e.displayStart ?? 0, i = e.bars.slice(r), a = xe(i, t.smaPeriod), o = new Float64Array(n).fill(NaN), s = new Float64Array(n).fill(NaN), c = new Float64Array(n).fill(NaN), l = new Float64Array(n).fill(NaN);
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
var Tt = {
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
			default: bt,
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
	compute: (e, t) => ({ series: wt(e, t) }),
	draw: (e, t, n, r, i) => {
		let { xScale: a, bandwidth: o, renderStart: s, renderEnd: c, data: l } = n, u = n.paneTop ?? 0, d = n.paneBottom ?? 0;
		if (d <= u) return;
		let f = i(r.upColor), p = i(r.downColor), m = i(r.labelColor), h = t.volSma, g = t.volLabel;
		e.save(), e.beginPath(), e.rect(-1e6, u, 2e6, d - u), e.clip();
		let _ = Math.round(n.originY + n.y(0) * n.vRatio), v = Math.max(1, Math.floor(n.vRatio));
		e.save(), e.setTransform(1, 0, 0, 1, 0, 0);
		for (let t = s; t < c; t++) {
			let i = l[t];
			if (!i || i.volume <= 0) continue;
			let { left: a, width: o } = n.barSlot(t), s = Math.round(n.originY + n.y(i.volume) * n.vRatio), c = i.close >= i.open, u = h?.[t], d = u !== void 0 && Number.isFinite(u) && i.volume < u;
			e.fillStyle = c ? f : p, e.globalAlpha = d ? r.fadeOpacity : r.standardOpacity, e.fillRect(a, s, o, Math.max(v, _ - s));
		}
		if (e.restore(), e.globalAlpha = 1, c > s) {
			let e = n.y(0), t = n.barSlot(s).width / (2 * n.hRatio);
			n.hit?.add({
				spanAt: (t) => {
					let r = l[t];
					return !r || r.volume <= 0 ? null : [e, n.y(r.volume)];
				},
				halfWidth: t,
				interpolate: !1
			});
		}
		if (g) {
			e.fillStyle = m, e.font = nt(i, "var(--font-weight-semibold)", "var(--text-2hxs)", Ct), e.textAlign = "center", e.textBaseline = "alphabetic";
			for (let t = s; t < c; t++) {
				let r = g[t];
				if (Number.isNaN(r)) continue;
				let i = l[t];
				if (!i) continue;
				let s = Math.max(n.y(i.volume) - xt, u + St);
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
		tickFormat: ye
	}),
	legend: (e, t, n) => [{
		color: n.upColor,
		label: "Vol",
		value: N(e.volumeUp, t, ve)
	}, {
		color: n.downColor,
		label: "Vol",
		value: N(e.volumeDown, t, ve)
	}]
}, V = (e) => Number.isNaN(e) ? NaN : Math.round(e * 100) / 100;
function H(e) {
	for (let t = 0; t < e.length; t++) if (!Number.isNaN(e[t])) return t;
	return e.length;
}
function U(e) {
	let t = new Float64Array(e);
	return t.fill(NaN), t;
}
function Et(e, t) {
	let n = e.length, r = U(n), i = H(e);
	if (t < 1 || i + t > n) return r;
	let a = 0;
	for (let o = i; o < n; o++) a += e[o], o >= i + t && (a -= e[o - t]), o >= i + t - 1 && (r[o] = a / t);
	return r;
}
function Dt(e, t) {
	let n = e.length, r = U(n), i = H(e), a = i + t - 1;
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
function Ot(e, t) {
	return kt(e, t, H(e) + t - 1);
}
function kt(e, t, n) {
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
function At(e, t) {
	let n = e.length, r = Ot(e, t), i = Ot(r, t), a = U(n);
	for (let e = 0; e < n; e++) !Number.isNaN(r[e]) && !Number.isNaN(i[e]) && (a[e] = 2 * r[e] - i[e]);
	return a;
}
function jt(e, t) {
	let n = e.length, r = Ot(e, t), i = Ot(r, t), a = Ot(i, t), o = U(n);
	for (let e = 0; e < n; e++) Number.isNaN(a[e]) || (o[e] = 3 * r[e] - 3 * i[e] + a[e]);
	return o;
}
function Mt(e, t, n) {
	switch (e) {
		case 1: return Ot(t, n);
		case 2: return Dt(t, n);
		case 3: return At(t, n);
		case 4: return jt(t, n);
		default: return Et(t, n);
	}
}
function Nt(e, t) {
	switch (e) {
		case 3: return 2 * (t - 1);
		case 4: return 3 * (t - 1);
		default: return t - 1;
	}
}
function Pt(e, t, n) {
	let r = e.length, i = U(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t <= a; t++) o += e[t];
	let s = o / t;
	i[a] = s;
	for (let n = a + 1; n < r; n++) s = (s * (t - 1) + e[n]) / t, i[n] = s;
	return i;
}
function Ft(e, t, n) {
	let r = e.length, i = U(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t < a; t++) o += e[t];
	o = o - o / t + e[a], i[a] = o;
	for (let n = a + 1; n < r; n++) o = o - o / t + e[n], i[n] = o;
	return i;
}
function It(e, t) {
	let n = e.length, r = U(n), i = H(e);
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
function Lt(e, t) {
	let n = e.length, r = U(n), i = H(e);
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
function Rt(e, t, n) {
	let r = e.length, i = U(r);
	for (let a = 1; a < r; a++) {
		let r = e[a] - t[a], o = Math.abs(e[a] - n[a - 1]), s = Math.abs(t[a] - n[a - 1]);
		i[a] = Math.max(r, o, s);
	}
	return i;
}
function zt(e, t) {
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
function Bt(e, t, n, r) {
	let i = e.length, a = U(i);
	if (r < 1 || r >= i) return a;
	let o = Rt(e, t, n), s = U(i), c = U(i);
	for (let n = 1; n < i; n++) {
		let r = e[n] - e[n - 1], i = t[n - 1] - t[n];
		s[n] = r > i && r > 0 ? r : 0, c[n] = i > r && i > 0 ? i : 0;
	}
	let l = Ft(o, r, 1), u = Ft(s, r, 1), d = Ft(c, r, 1);
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
function Vt(e, t, n, r) {
	return Pt(Rt(e, t, n), r, 1);
}
function Ht(e, t, n, r) {
	return Pt(Bt(e, t, n, r), r, r);
}
function Ut(e, t, n, r) {
	let i = e.length, a = It(e, r), o = Lt(t, r), s = U(i);
	for (let e = 0; e < i; e++) {
		if (Number.isNaN(a[e]) || Number.isNaN(o[e]) || Number.isNaN(n[e])) continue;
		let t = a[e] - o[e];
		s[e] = t === 0 ? 0 : 100 * (n[e] - o[e]) / t;
	}
	return s;
}
function Wt(e, t) {
	let n = e.length, r = U(n), i = H(e);
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
var Gt = {
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
		let n = Et(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { sma: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "sma",
		st: I(r, "line", i)
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
function Kt(e) {
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
var qt = {
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
		let t = Kt(e.period);
		return {
			lineColor: t.line,
			labelColor: t.label
		};
	},
	formatParams: (e) => String(e.period),
	warmupBars: (e) => e.period - 1 + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = Ot(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { ema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "ema",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["ema"],
	legend: (e, t, n, r) => [{
		color: n.labelColor,
		label: "EMA",
		value: N(e.ema, t, r.priceFmt)
	}]
}, Jt = {
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
		let n = Dt(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { wma: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "wma",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["wma"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "WMA",
		value: N(e.wma, t, r.priceFmt)
	}]
}, Yt = {
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
		let n = At(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { dema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "dema",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["dema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "DEMA",
		value: N(e.dema, t, r.priceFmt)
	}]
}, W = {
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
		let n = jt(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { tema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "tema",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["tema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "TEMA",
		value: N(e.tema, t, r.priceFmt)
	}]
}, Xt = {
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
			options: Ve
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
	warmupBars: (e) => Math.max(Nt(e.matype, e.period), e.period - 1) + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = e.c.length, r = Mt(t.matype, e.c, t.period), i = Wt(e.c, t.period), a = new Float64Array(n), o = new Float64Array(n), s = new Float64Array(n);
		for (let e = 0; e < n; e++) {
			if (Number.isNaN(r[e]) || Number.isNaN(i[e])) {
				a[e] = NaN, o[e] = NaN, s[e] = NaN;
				continue;
			}
			o[e] = V(r[e]), a[e] = V(r[e] + t.nbdevup * i[e]), s[e] = V(r[e] - t.nbdevdn * i[e]);
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
}, Zt = {
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
		let n = zt(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { rsi: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
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
		value: N(e.rsi, t, M)
	}]
}, Qt = {
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
		let n = e.c.length, r = kt(e.c, t.fast, t.slow - 1), i = Ot(e.c, t.slow), a = new Float64Array(n);
		a.fill(NaN);
		for (let e = 0; e < n; e++) !Number.isNaN(r[e]) && !Number.isNaN(i[e]) && (a[e] = r[e] - i[e]);
		let o = Ot(a, t.signal), s = new Float64Array(n), c = new Float64Array(n), l = new Float64Array(n);
		for (let e = 0; e < n; e++) {
			if (Number.isNaN(o[e])) {
				s[e] = NaN, c[e] = NaN, l[e] = NaN;
				continue;
			}
			s[e] = V(a[e]), c[e] = V(o[e]), l[e] = V(a[e] - o[e]);
		}
		return { series: {
			macd: s,
			macdsignal: c,
			macdhist: l
		} };
	},
	draw: (e, t, n, r, i) => {
		t.macdhist && Be(e, n, t.macdhist, {
			color: i(r.histUpColor),
			width: 1
		}, i(r.histDownColor)), P(e, t, n, [{
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
}, $t = {
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
			options: Ve
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
			options: Ve
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
		let n = Ut(e.h, e.l, e.c, t.fastk), r = Mt(t.slowk_matype, n, t.slowk), i = Mt(t.slowd_matype, r, t.slowd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = V(r[e]), i[e] = V(i[e]);
		return { series: {
			slowk: r,
			slowd: i
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
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
		value: N(e.slowk, t, M)
	}, {
		color: n.dColor,
		label: "%D",
		value: N(e.slowd, t, M)
	}]
}, en = {
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
			options: Ve
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
		let n = Ut(e.h, e.l, e.c, t.fastk), r = Mt(t.fastd_matype, n, t.fastd);
		for (let e = 0; e < n.length; e++) Number.isNaN(r[e]) && (n[e] = NaN), n[e] = V(n[e]), r[e] = V(r[e]);
		return { series: {
			fastk: n,
			fastd: r
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
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
		value: N(e.fastk, t, M)
	}, {
		color: n.dColor,
		label: "%D",
		value: N(e.fastd, t, M)
	}]
}, tn = {
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
			options: Ve
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
		let n = zt(e.c, t.timeperiod), r = Ut(n, n, n, t.fastk), i = Mt(t.fastd_matype, r, t.fastd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = V(r[e]), i[e] = V(i[e]);
		return { series: {
			fastk: r,
			fastd: i
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
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
		value: N(e.fastk, t, M)
	}, {
		color: n.dColor,
		label: "%D",
		value: N(e.fastd, t, M)
	}]
}, nn = {
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
		let n = e.c.length, r = It(e.h, t.period), i = Lt(e.l, t.period), a = new Float64Array(n);
		a.fill(NaN);
		for (let t = 0; t < n; t++) {
			if (Number.isNaN(r[t]) || Number.isNaN(i[t])) continue;
			let n = r[t] - i[t];
			a[t] = V(n === 0 ? 0 : -100 * (r[t] - e.c[t]) / n);
		}
		return { series: { willr: a } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
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
		value: N(e.willr, t, M)
	}]
}, rn = {
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
		let n = Ht(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { adx: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "adx",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["adx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ADX",
		value: N(e.adx, t, M)
	}]
}, an = {
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
		let n = Bt(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { dx: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "dx",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["dx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "DX",
		value: N(e.dx, t, M)
	}]
}, on = {
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
		let n = Vt(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = V(n[e]);
		return { series: { atr: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "atr",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["atr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ATR",
		value: N(e.atr, t, M)
	}]
}, sn = {
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
		let n = e.c.length, r = Vt(e.h, e.l, e.c, t.period), i = new Float64Array(n);
		i.fill(NaN);
		for (let t = 0; t < n; t++) Number.isNaN(r[t]) || e.c[t] === 0 || (i[t] = V(100 * r[t] / e.c[t]));
		return { series: { natr: i } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "natr",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["natr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "NATR",
		value: N(e.natr, t, M)
	}]
}, cn = {
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
		let t = Rt(e.h, e.l, e.c);
		for (let e = 0; e < t.length; e++) t[e] = V(t[e]);
		return { series: { trange: t } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "trange",
		st: I(r, "line", i)
	}]),
	autofitKeys: () => ["trange"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "TRANGE",
		value: N(e.trange, t, M)
	}]
}, ln = /* @__PURE__ */ new Map();
function un(e) {
	ln.set(e.key, e);
}
function G(e) {
	return ln.get(e);
}
function dn() {
	return [...ln.values()];
}
function fn(e) {
	let t = {};
	for (let n of e) n.kind === "line" ? (t[`${n.key}Color`] = n.default.color, t[`${n.key}Width`] = n.default.width, t[`${n.key}Style`] = n.default.style ?? 0, t[`${n.key}Opacity`] = n.default.opacity ?? 1) : t[n.key] = n.default;
	return t;
}
function pn(e, t) {
	let n = fn(e.settingsSchema), r = {
		...n,
		...t
	}, i = e.deriveDefaults?.(r) ?? {};
	return {
		...n,
		...i,
		...t
	};
}
function mn(e, t) {
	let n = G(e);
	if (!n) return;
	let r = { ...t?.settingsOverrides }, i = pn(n, r);
	return {
		id: t?.id ?? e,
		defKey: e,
		label: n.label,
		enabled: t?.enabled ?? !1,
		settings: i,
		settingsOverrides: r
	};
}
un(Ke), un(Xe), un($e), un(yt), un(Tt);
var hn = [
	Gt,
	qt,
	Jt,
	Yt,
	W,
	Xt,
	Zt,
	Qt,
	$t,
	en,
	tn,
	nn,
	rn,
	an,
	on,
	sn,
	cn
];
for (let e of hn) un(e);
function gn(e) {
	let t = G(e.defKey);
	return t?.formatParams ? t.formatParams(e.settings) : "";
}
var _n = [
	"ti:ema",
	"ti:sma",
	"ti:wma",
	"ti:dema",
	"ti:tema",
	"ti:bbands",
	"highs",
	"stage2"
], vn = [
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
], yn = 11;
function bn(e, t, n, r, i, a) {
	let o = i - n, s = a - r, c = o * o + s * s;
	if (c === 0) return Math.hypot(e - n, t - r);
	let l = ((e - n) * o + (t - r) * s) / c;
	l = Math.max(0, Math.min(1, l));
	let u = n + l * o, d = r + l * s;
	return Math.hypot(e - u, t - d);
}
function xn(e, t, n, r) {
	return Math.hypot(e - n.x, t - n.y) <= yn ? {
		kind: "handle",
		index: 0
	} : Math.hypot(e - r.x, t - r.y) <= yn ? {
		kind: "handle",
		index: 1
	} : bn(e, t, n.x, n.y, r.x, r.y) <= 6 ? { kind: "body" } : null;
}
function Sn(e, t, n, r) {
	return Math.abs(t - n) <= 6 && e >= 0 && e <= r ? { kind: "body" } : null;
}
function Cn(e, t, n, r) {
	return Math.abs(e - n) <= 6 && t >= 0 && t <= r ? { kind: "body" } : null;
}
function wn(e, t, n, r = 0) {
	return e >= n.x - r && e <= n.x + n.width + r && t >= n.y - r && t <= n.y + n.height + r ? { kind: "body" } : null;
}
function Tn(e, t, n, r) {
	return Math.hypot(e - n.x, t - n.y) <= yn ? {
		kind: "handle",
		index: 0
	} : bn(e, t, n.x, n.y, r.x, r.y) <= 6 ? { kind: "body" } : null;
}
//#endregion
//#region src/indicators/hitRegions.ts
var En = "__candles__", Dn = 6, On = 2;
function kn(e, t, n, r, i, a) {
	let o = r.spanAt(n);
	if (!o) return !1;
	let s = Math.min(a / 2, r.halfWidth + 2);
	if (Math.abs(e - i(n)) > s) return !1;
	let c = Math.min(o[0], o[1]) - 2, l = Math.max(o[0], o[1]) + 2;
	return t >= c && t <= l;
}
function An(e, t, n, r, i, a, o) {
	let s = 0, c = 0, l = !1;
	for (let u = n - a; u <= n + a; u++) {
		let n = r.spanAt(u);
		if (!n) {
			l = !1;
			continue;
		}
		let a = i(u), d = (n[0] + n[1]) / 2;
		if (l && bn(e, t, s, c, a, d) <= o) return !0;
		s = a, c = d, l = !0;
	}
	return !1;
}
function jn(e, t, n, r, i, a, o = 6) {
	if (!Number.isFinite(n) || r.length === 0) return null;
	let s = Math.max(1, Math.ceil(o / Math.max(a, 1e-6)));
	for (let c = r.length - 1; c >= 0; c--) {
		let l = r[c];
		if (l.interpolate ? An(e, t, n, l, i, s, o) : kn(e, t, n, l, i, a)) return l;
	}
	return null;
}
//#endregion
//#region src/appearance/registry.ts
var Mn = [
	13,
	27,
	34,
	40,
	47,
	54
], Nn = .35, Pn = 1 / 6, Fn = {
	colors: {},
	background: {
		topColor: "var(--chart-bg-top)",
		bottomColor: "var(--chart-bg-bottom)",
		radius: 12
	},
	candle: { opacity: 1 },
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
			lineColor: "var(--chart-pattern-fill)",
			lineWidth: 1.5,
			lineOpacity: .5,
			lineDash: "5 4",
			statColor: "var(--chart-pattern-fill)",
			dotFill: "var(--chart-pattern-fill)",
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		consolidation: {
			boxFill: "var(--chart-pattern-fill)",
			boxFillOpacity: .1,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		high_tight_flag: {
			poleColor: "var(--chart-pattern-fill)",
			poleWidth: 2,
			poleOpacity: .35,
			flagFill: "var(--chart-pattern-fill)",
			flagFillOpacity: .12,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		gap_up: {
			bandFill: "var(--chart-pattern-fill)",
			bandFillOpacity: .1,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		volume_breakout: {
			markerColor: "var(--chart-pattern-fill)",
			markerOpacity: .9,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		golden_cross: {
			dotFill: "var(--chart-pattern-fill)",
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		nr7: {
			lineColor: "var(--chart-pattern-fill)",
			lineWidth: 1,
			lineOpacity: .5,
			markerColor: "var(--chart-pattern-fill)",
			markerOpacity: .9,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		unusual_volume: {
			markerColor: "var(--chart-pattern-fill)",
			markerOpacity: .9,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		volume_dryup: {
			markerColor: "var(--chart-pattern-fill)",
			markerOpacity: .9,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		pocket_pivot: {
			markerColor: "var(--chart-pattern-fill)",
			markerOpacity: .9,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		inside_day: {
			lineColor: "var(--chart-pattern-fill)",
			lineWidth: 1.5,
			lineOpacity: .5,
			boxStroke: "var(--chart-pattern-fill)",
			boxStrokeWidth: 1.5,
			boxStrokeOpacity: .6,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		},
		pullback_to_ema: {
			dotFill: "var(--chart-pattern-fill)",
			lineColor: "var(--chart-pattern-fill)",
			lineWidth: 1.5,
			lineOpacity: .5,
			labelBg: "var(--chart-pattern-fill)",
			labelBgOpacity: .7,
			labelTextColor: "var(--chart-pattern-label-text)",
			labelFontSize: 11
		}
	}
}, In = (e) => typeof e == "object" && !!e && !Array.isArray(e);
function Ln(e, t) {
	if (t === void 0) return e;
	if (!In(e) || !In(t)) return t;
	let n = { ...e };
	for (let r of Object.keys(t)) n[r] = Ln(e[r], t[r]);
	return n;
}
function Rn(e) {
	return Ln(Fn, e);
}
//#endregion
//#region src/drawings/types.ts
function zn(e) {
	return !!e && typeof e == "object" && typeof e.date == "string" && typeof e.price == "number" && Number.isFinite(e.price);
}
function Bn(e) {
	if (!e || typeof e != "object") return null;
	let t = e;
	if (typeof t.id != "string" || t.id === "" || typeof t.type != "string") return null;
	switch (t.type) {
		case "trendline":
		case "ray":
		case "ruler": return zn(t.a) && zn(t.b) ? e : null;
		case "hray":
		case "text": return zn(t.a) ? e : null;
		case "hline": return typeof t.price == "number" && Number.isFinite(t.price) ? e : null;
		case "vline": return typeof t.date == "string" ? e : null;
		default: return e;
	}
}
//#endregion
//#region src/drawings/defaults.ts
var Vn = {
	color: "var(--chart-drawing)",
	width: 1.5,
	style: 0,
	opacity: 1,
	text: "",
	fontSize: 12,
	bgColor: "var(--chart-drawing-bg)",
	bgOpacity: .85
};
function Hn(e) {
	return {
		color: e?.color ?? Vn.color,
		width: e?.width ?? Vn.width,
		style: e?.style ?? Vn.style,
		opacity: e?.opacity ?? Vn.opacity,
		text: e?.text ?? Vn.text,
		fontSize: e?.fontSize ?? Vn.fontSize,
		bgColor: e?.bgColor ?? Vn.bgColor,
		bgOpacity: e?.bgOpacity ?? Vn.bgOpacity
	};
}
//#endregion
//#region src/internal/cn.ts
function K(...e) {
	return e.filter(Boolean).join(" ");
}
//#endregion
//#region src/controls/useDismissable.ts
var Un = [], Wn = !1;
function Gn(e) {
	let t = Un[Un.length - 1];
	if (!t || !t.outsidePress) return;
	let n = e.target;
	for (let e of t.els) {
		let t = e.current;
		if (t && n && t.contains(n)) return;
	}
	t.onDismiss();
}
function Kn(e) {
	if (e.key !== "Escape" || e.isComposing) return;
	let t = Un[Un.length - 1];
	t && t.onDismiss();
}
function qn() {
	Wn ||= (document.addEventListener("pointerdown", Gn, !0), document.addEventListener("keydown", Kn, !1), !0);
}
function Jn() {
	!Wn || Un.length > 0 || (document.removeEventListener("pointerdown", Gn, !0), document.removeEventListener("keydown", Kn, !1), Wn = !1);
}
function Yn(e) {
	return Un.push(e), qn(), () => {
		let t = Un.lastIndexOf(e);
		t !== -1 && Un.splice(t, 1), Jn();
	};
}
function q(e, t, n, r) {
	let a = s({
		els: n,
		onDismiss: t,
		outsidePress: r?.outsidePress ?? !0
	});
	a.current.els = n, a.current.onDismiss = t, a.current.outsidePress = r?.outsidePress ?? !0, i(() => {
		if (e) return Yn(a.current);
	}, [e]);
}
var J = {
	chartControls: "_chartControls_bruvo_1",
	indicatorPicker: "_indicatorPicker_bruvo_8",
	pickerPanel: "_pickerPanel_bruvo_13",
	pickerScroll: "_pickerScroll_bruvo_25",
	pickerCount: "_pickerCount_bruvo_61",
	pickerSection: "_pickerSection_bruvo_68",
	pickerRow: "_pickerRow_bruvo_77",
	pickerCheckRow: "_pickerCheckRow_bruvo_92",
	pickerLabel: "_pickerLabel_bruvo_111",
	pickerAdd: "_pickerAdd_bruvo_117"
};
//#endregion
//#region src/controls/ChartControls.tsx
function Xn(e, t) {
	let n = t.indexOf(e);
	return n === -1 ? t.length : n;
}
function Zn(e) {
	let t = e.pane;
	return typeof t == "object" ? t.subpane : "";
}
function Qn() {
	return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : `ind-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}
function $n({ chartType: e, onChartTypeChange: t, indicators: n, onIndicatorsChange: r, patternsEnabled: i, onPatternsToggle: a, visiblePatterns: o, onVisiblePatternsChange: l, statsEnabled: f, onStatsToggle: p, earningsEnabled: m, onEarningsToggle: h, className: g }) {
	let [_, v] = c(!1), y = s(null), [b, x] = c(!1), S = s(null);
	q(_, () => v(!1), [y]), q(b, () => x(!1), [S]);
	let C = (e) => o ? o.includes(e) : !0, w = o ? o.length : Ce.length, T = (e) => {
		if (!l) return;
		let t = o ?? Ce;
		l(t.includes(e) ? t.filter((t) => t !== e) : [...t, e]);
	}, E = dn().filter((e) => e.pane === "price").sort((e, t) => Xn(e.key, _n) - Xn(t.key, _n)), D = dn().filter((e) => typeof e.pane == "object").sort((e, t) => Xn(Zn(e), vn) - Xn(Zn(t), vn)), O = (e) => {
		let t = mn(e.key, {
			id: Qn(),
			enabled: !0
		});
		t && r([...n, t]);
	}, k = (e) => /* @__PURE__ */ d("div", {
		className: J.pickerRow,
		children: [/* @__PURE__ */ u("span", {
			className: J.pickerLabel,
			children: e.label
		}), /* @__PURE__ */ u("button", {
			type: "button",
			className: J.pickerAdd,
			title: `Add ${e.label}`,
			onClick: () => O(e),
			children: "+"
		})]
	}, e.key);
	return /* @__PURE__ */ d("div", {
		className: K(J.chartControls, g),
		children: [
			/* @__PURE__ */ d("div", {
				className: "pill-toggle-group",
				children: [/* @__PURE__ */ u("button", {
					className: K("pill-toggle-btn", "pill-toggle-btn-sm", e === "candlestick" && "is-active"),
					onClick: () => t("candlestick"),
					children: "Candles"
				}), /* @__PURE__ */ u("button", {
					className: K("pill-toggle-btn", "pill-toggle-btn-sm", e === "bar" && "is-active"),
					onClick: () => t("bar"),
					children: "Bars"
				})]
			}),
			/* @__PURE__ */ d("div", {
				className: J.indicatorPicker,
				ref: y,
				children: [/* @__PURE__ */ d("button", {
					type: "button",
					className: K("pill-toggle-btn", "pill-toggle-btn-sm", _ && "is-active"),
					onClick: () => v((e) => !e),
					children: [
						"Indicators ·",
						" ",
						/* @__PURE__ */ u("span", {
							className: J.pickerCount,
							children: n.length
						})
					]
				}), _ && /* @__PURE__ */ u("div", {
					className: J.pickerPanel,
					children: /* @__PURE__ */ d("div", {
						className: J.pickerScroll,
						children: [
							/* @__PURE__ */ u("div", {
								className: J.pickerSection,
								children: "Overlays"
							}),
							E.map(k),
							/* @__PURE__ */ u("div", {
								className: J.pickerSection,
								children: "Oscillators"
							}),
							D.map(k)
						]
					})
				})]
			}),
			/* @__PURE__ */ d("div", {
				className: J.indicatorPicker,
				ref: S,
				children: [/* @__PURE__ */ d("button", {
					type: "button",
					className: K("pill-toggle-btn", "pill-toggle-btn-sm", i && "is-active"),
					onClick: () => x((e) => !e),
					children: [
						"Patterns ·",
						" ",
						/* @__PURE__ */ u("span", {
							className: J.pickerCount,
							children: i ? w : 0
						})
					]
				}), b && /* @__PURE__ */ u("div", {
					className: J.pickerPanel,
					children: /* @__PURE__ */ d("div", {
						className: J.pickerScroll,
						children: [
							/* @__PURE__ */ d("label", {
								className: J.pickerCheckRow,
								children: [/* @__PURE__ */ u("span", {
									className: J.pickerLabel,
									children: "Show patterns"
								}), /* @__PURE__ */ u("input", {
									type: "checkbox",
									checked: i,
									onChange: a
								})]
							}),
							/* @__PURE__ */ u("div", {
								className: J.pickerSection,
								children: "Patterns"
							}),
							Se.map(({ name: e, label: t }) => /* @__PURE__ */ d("label", {
								className: J.pickerCheckRow,
								children: [/* @__PURE__ */ u("span", {
									className: J.pickerLabel,
									children: t
								}), /* @__PURE__ */ u("input", {
									type: "checkbox",
									disabled: !i || !l,
									checked: C(e),
									onChange: () => T(e)
								})]
							}, e))
						]
					})
				})]
			}),
			/* @__PURE__ */ d("div", {
				className: "pill-toggle-group",
				children: [/* @__PURE__ */ u("button", {
					className: K("pill-toggle-btn", "pill-toggle-btn-sm", f && "is-active"),
					onClick: p,
					children: "Stats"
				}), h && /* @__PURE__ */ u("button", {
					className: K("pill-toggle-btn", "pill-toggle-btn-sm", m && "is-active"),
					onClick: h,
					children: "Earnings"
				})]
			})
		]
	});
}
//#endregion
//#region src/utils/toHex6.ts
var Y = (e) => Math.max(0, Math.min(255, Math.round(e))).toString(16).padStart(2, "0");
function er(e) {
	let t = e.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
	let n = t.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
	if (n) return `#${Y(+n[1])}${Y(+n[2])}${Y(+n[3])}`;
	let r = t.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
	return r ? `#${Y(r[1] * 255)}${Y(r[2] * 255)}${Y(r[3] * 255)}` : et;
}
//#endregion
//#region src/controls/SettingsFields.tsx
function tr(e, t) {
	let n = e;
	return t.min != null && (n = Math.max(t.min, n)), t.max != null && (n = Math.min(t.max, n)), n;
}
function nr({ spec: e, value: t, onCommit: n }) {
	let [r, i] = c(String(t)), a = e.step ?? 1, o = Number.isInteger(a), s = o ? `Whole number${e.min == null ? "" : ` ≥ ${e.min}`}` : `Number${e.min == null ? "" : ` ≥ ${e.min}`}, step ${a}`;
	return /* @__PURE__ */ d("label", {
		className: j.legendPopoverField,
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
				r.trim() !== "" && Number.isFinite(a) && /^\d*\.?\d*$/.test(r) && n(tr(o ? Math.round(a) : a, e));
			},
			onBlur: () => i(String(t))
		})]
	});
}
function rr({ spec: e, value: t, onChange: n }) {
	return /* @__PURE__ */ d("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e.label }), /* @__PURE__ */ u("span", {
			className: j.selectWrap,
			children: /* @__PURE__ */ u("select", {
				value: t,
				onChange: (e) => n(Number(e.target.value)),
				children: e.options.map((e) => /* @__PURE__ */ u("option", {
					value: e.value,
					children: e.label
				}, e.value))
			})
		})]
	});
}
function ir({ label: e, value: t, onChange: n }) {
	return /* @__PURE__ */ d("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ u("input", {
			type: "checkbox",
			checked: t,
			onChange: (e) => n(e.target.checked)
		})]
	});
}
function ar({ label: e, colorExpr: t, isOverridden: n, resolveColor: r, onCommit: a, onReset: o }) {
	let s = er(r(t)), [l, f] = c(s);
	return i(() => f(s), [s]), /* @__PURE__ */ d("div", {
		className: j.legendColorField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ d("div", {
			className: j.legendColorControls,
			children: [
				/* @__PURE__ */ u("input", {
					type: "color",
					value: s,
					title: `${e} color`,
					onChange: (e) => a(e.target.value)
				}),
				/* @__PURE__ */ u("input", {
					type: "text",
					className: j.legendColorHex,
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
					className: j.fieldResetBtn,
					title: n ? "Reset to default color" : "Already the default color",
					disabled: !n,
					onClick: o,
					children: "↺"
				})
			]
		})]
	});
}
function or({ label: e, value: t, onCommit: n, min: r = 0, max: i = 1, step: a = .05 }) {
	return /* @__PURE__ */ d("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ d("span", {
			className: j.sliderControl,
			children: [/* @__PURE__ */ u("input", {
				type: "range",
				min: r,
				max: i,
				step: a,
				value: t,
				onChange: (e) => n(Number(e.target.value))
			}), /* @__PURE__ */ u("span", {
				className: j.sliderValue,
				children: t.toFixed(2)
			})]
		})]
	});
}
function sr({ label: e, prefix: t, settings: n, settingsOverrides: r, resolveColor: i, onCommit: a, onResetKeys: o }) {
	let s = `${t}Color`, c = `${t}Width`, l = `${t}Style`, f = `${t}Opacity`, p = er(i(String(n[s] ?? ""))), m = Number(n[c] ?? 1), h = Number(n[l] ?? 0), g = Number(n[f] ?? 1), _ = [
		s,
		c,
		l,
		f
	].some((e) => e in r);
	return /* @__PURE__ */ d("div", {
		className: j.legendColorField,
		children: [/* @__PURE__ */ u("span", { children: e }), /* @__PURE__ */ d("div", {
			className: j.lineFieldControls,
			children: [
				/* @__PURE__ */ u("input", {
					type: "color",
					value: p,
					title: `${e} color`,
					onChange: (e) => a(s, e.target.value)
				}),
				/* @__PURE__ */ u("select", {
					className: j.lineFieldSelect,
					value: h,
					title: `${e} style`,
					onChange: (e) => a(l, Number(e.target.value)),
					children: He.map((e) => /* @__PURE__ */ u("option", {
						value: e.value,
						children: e.label
					}, e.value))
				}),
				/* @__PURE__ */ u("input", {
					type: "number",
					className: j.lineFieldWidth,
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
					className: j.lineFieldOpacity,
					min: 0,
					max: 1,
					step: .05,
					value: g,
					title: `${e} opacity`,
					onChange: (e) => a(f, Number(e.target.value))
				}),
				/* @__PURE__ */ u("button", {
					type: "button",
					className: j.fieldResetBtn,
					title: _ ? "Reset line to default" : "Already the default line",
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
//#region src/controls/appearanceFields.tsx
function cr(e, t) {
	let n = e;
	for (let e of t) {
		if (typeof n != "object" || !n) return;
		n = n[e];
	}
	return n;
}
function lr(e, t, n) {
	let [r, ...i] = t, a = { ...e ?? {} };
	return i.length === 0 ? a[r] = n : a[r] = lr(a[r], i, n), a;
}
function ur(e, t) {
	let [n, ...r] = t, i = { ...e ?? {} };
	if (r.length === 0) delete i[n];
	else {
		let e = i[n];
		if (e && typeof e == "object") {
			let t = ur(e, r);
			Object.keys(t).length === 0 ? delete i[n] : i[n] = t;
		}
	}
	return i;
}
function dr(e) {
	let { appearance: t, onAppearanceChange: n, resolveColor: r } = e, i = Rn(t), a = (e, r) => n(lr(t, e, r)), o = (e) => n(ur(t, e));
	return {
		eff: i,
		commit: a,
		reset: o,
		colorVarRow: (e, n) => {
			let i = t.colors?.[e];
			return /* @__PURE__ */ u(ar, {
				label: n,
				colorExpr: i ?? `var(--${e})`,
				isOverridden: i !== void 0,
				resolveColor: r,
				onCommit: (t) => a(["colors", e], t),
				onReset: () => o(["colors", e])
			}, e);
		},
		colorRow: (e, n) => /* @__PURE__ */ u(ar, {
			label: n,
			colorExpr: String(cr(i, e)),
			isOverridden: cr(t, e) !== void 0,
			resolveColor: r,
			onCommit: (t) => a(e, t),
			onReset: () => o(e)
		}, e.join(".")),
		numberRow: (e, t, n = {}) => {
			let r = Number(cr(i, e));
			return /* @__PURE__ */ u(nr, {
				spec: {
					key: e.join("."),
					label: t,
					kind: "number",
					default: r,
					...n
				},
				value: r,
				onCommit: (t) => a(e, t)
			}, e.join("."));
		},
		sliderRow: (e, t) => /* @__PURE__ */ u(or, {
			label: t,
			value: Number(cr(i, e)),
			onCommit: (t) => a(e, t)
		}, e.join("."))
	};
}
function fr(e) {
	let { colorVarRow: t, sliderRow: n } = dr(e);
	return /* @__PURE__ */ d(l, { children: [
		t("candle-up", "Up color"),
		t("candle-down", "Down color"),
		n(["candle", "opacity"], "Opacity")
	] });
}
//#endregion
//#region src/controls/SettingsDialog.tsx
function pr({ label: e, value: t, onCommit: n }) {
	let [r, a] = c(t);
	return i(() => a(t), [t]), /* @__PURE__ */ d("label", {
		className: j.legendPopoverField,
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
function mr({ appearance: e, onAppearanceChange: t, resolveColor: n, onClose: r, triggerRef: i, style: a }) {
	let o = s(null);
	q(!0, r, i ? [o, i] : [o]);
	let c = {
		appearance: e,
		onAppearanceChange: t,
		resolveColor: n
	}, { eff: l, commit: f, colorVarRow: p, colorRow: m, numberRow: h, sliderRow: g } = dr(c), _ = (e, t) => /* @__PURE__ */ u(pr, {
		label: t,
		value: String(cr(l, e)),
		onCommit: (t) => f(e, t)
	}, e.join("."));
	return /* @__PURE__ */ d("div", {
		className: j.settingsDialog,
		ref: o,
		style: a,
		"data-chart-wheel-scroll": !0,
		"data-chart-native-menu": !0,
		children: [/* @__PURE__ */ d("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ u("span", {
				className: j.legendPopoverTitle,
				children: "Chart settings"
			}), /* @__PURE__ */ u("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: r,
				children: "×"
			})]
		}), /* @__PURE__ */ d("div", {
			className: j.panelScrollBody,
			children: [
				/* @__PURE__ */ u("div", {
					className: j.settingsSectionTitle,
					children: "Chart appearance"
				}),
				p("chart-positive", "Price up"),
				p("chart-negative", "Price down"),
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
					className: j.settingsGroupTitle,
					children: "Candles"
				}),
				/* @__PURE__ */ u(fr, { ...c }),
				/* @__PURE__ */ u("div", {
					className: j.settingsSectionTitle,
					children: "Patterns"
				}),
				/* @__PURE__ */ u("div", {
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
					className: j.settingsGroupTitle,
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
var hr = {
	zoomSlider: "_zoomSlider_cr2qi_4",
	marks: "_marks_cr2qi_16",
	mark: "_mark_cr2qi_16"
};
//#endregion
//#region src/controls/ZoomSlider.tsx
function gr({ visibleBars: e, onVisibleBarsChange: t, maxVisibleBars: n, marks: r, onPanReset: i }) {
	let a = Math.max(10, n), o = (r ?? re).filter((e) => e.bars <= a), s = o.length ? Math.min(...o.map((e) => e.bars)) : Math.min(ee["3M"], a), c = Math.max(s, Math.min(e, a)), l = Math.log(s), f = Math.log(a), p = f - l, m = (e) => p > 0 ? (Math.log(e) - l) / p * 100 : 0, h = (e) => {
		let n = Math.max(s, Math.min(e, a));
		t(n), o.some((e) => e.bars === n) && i?.();
	};
	return /* @__PURE__ */ d("div", {
		className: hr.zoomSlider,
		children: [/* @__PURE__ */ u("input", {
			type: "range",
			min: l,
			max: f,
			step: "any",
			value: Math.log(c),
			onChange: (e) => h(Math.round(Math.exp(Number(e.target.value)))),
			"aria-label": "Zoom (visible range)"
		}), /* @__PURE__ */ u("div", {
			className: hr.marks,
			children: o.map((e) => /* @__PURE__ */ u("button", {
				type: "button",
				className: hr.mark,
				style: { left: `${m(e.bars)}%` },
				onClick: () => h(e.bars),
				children: e.key
			}, e.key))
		})]
	});
}
//#endregion
//#region src/indicators/applySettings.ts
function _r(e, t, n, r) {
	return e.map((e) => e.id === t ? mn(e.defKey, {
		id: e.id,
		enabled: e.enabled,
		settingsOverrides: {
			...e.settingsOverrides,
			[n]: r
		}
	}) ?? e : e);
}
function vr(e, t, n) {
	return n.length === 0 ? e : e.map((e) => {
		if (e.id !== t) return e;
		let r = { ...e.settingsOverrides };
		for (let e of n) delete r[e];
		return mn(e.defKey, {
			id: e.id,
			enabled: e.enabled,
			settingsOverrides: r
		}) ?? e;
	});
}
//#endregion
//#region src/controls/IndicatorSettingsPopover.tsx
function yr({ config: e, def: t, onCommit: n, onReset: r, onResetKeys: i, resolveColor: a, onClose: o, triggerRef: c, className: l, style: f }) {
	let p = s(null);
	q(!0, o, c ? [p, c] : [p]);
	let m = gn(e), h = a ?? ((e) => e);
	return /* @__PURE__ */ d("div", {
		className: K(j.legendPopover, l),
		ref: p,
		style: f,
		"data-chart-wheel-scroll": !0,
		"data-chart-native-menu": !0,
		children: [/* @__PURE__ */ d("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ d("span", {
				className: j.legendPopoverTitle,
				children: [t.longLabel ?? t.label, m && /* @__PURE__ */ u("span", {
					className: j.legendPopoverSummary,
					children: m
				})]
			}), /* @__PURE__ */ u("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: o,
				children: "×"
			})]
		}), /* @__PURE__ */ u("div", {
			className: j.panelScrollBody,
			children: t.settingsSchema.map((t) => {
				switch (t.kind) {
					case "number": return /* @__PURE__ */ u(nr, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onCommit: (e) => n(t.key, e)
					}, t.key);
					case "enum": return /* @__PURE__ */ u(rr, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "toggle": return /* @__PURE__ */ u(ir, {
						label: t.label,
						value: !!(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "color": return /* @__PURE__ */ u(ar, {
						label: t.label,
						colorExpr: String(e.settings[t.key] ?? t.default),
						isOverridden: t.key in e.settingsOverrides,
						resolveColor: h,
						onCommit: (e) => n(t.key, e),
						onReset: () => r(t.key)
					}, t.key);
					case "line": return /* @__PURE__ */ u(sr, {
						label: t.label,
						prefix: t.key,
						settings: e.settings,
						settingsOverrides: e.settingsOverrides,
						resolveColor: h,
						onCommit: (e, t) => n(e, t),
						onResetKeys: (e) => i(e)
					}, t.key);
				}
			})
		})]
	});
}
//#endregion
//#region src/controls/IndicatorLegend.tsx
function br({ configs: e, top: t, left: n, openId: r, setOpenId: i, onCommit: a, onReset: o, onResetKeys: c, resolveColor: l, onRemove: f, rowsFor: h, toggle: g }) {
	let _ = s(null);
	if (e.length === 0 && !g) return null;
	let v = l ?? ((e) => e);
	return /* @__PURE__ */ d("div", {
		className: j.legendBlock,
		style: {
			top: t,
			left: n
		},
		children: [e.map((e) => {
			let t = G(e.defKey);
			if (!t) return null;
			let n = (t.settingsSchema?.length ?? 0) > 0, s = gn(e), p = h(e), m = p[0]?.color ? v(p[0].color) : "transparent", g = p.filter((e) => e.value).map((e) => ({
				text: e.value,
				color: v(e.color)
			}));
			return /* @__PURE__ */ d("div", {
				className: j.legendItem,
				children: [
					/* @__PURE__ */ u("span", {
						className: j.legendDot,
						style: { background: m }
					}),
					/* @__PURE__ */ d("span", {
						className: j.legendLabel,
						children: [t.label, s ? ` ${s}` : ""]
					}),
					g.length > 0 && /* @__PURE__ */ u("span", {
						className: j.legendValues,
						children: g.map((e, t) => /* @__PURE__ */ u("span", {
							style: { color: e.color },
							children: e.text
						}, t))
					}),
					n && /* @__PURE__ */ u("button", {
						type: "button",
						className: j.legendBtn,
						title: `Edit ${t.label}`,
						ref: r === e.id ? _ : null,
						onClick: () => i(r === e.id ? null : e.id),
						children: "⚙"
					}),
					/* @__PURE__ */ u("button", {
						type: "button",
						className: j.legendBtn,
						title: `Remove ${t.label}`,
						onClick: () => f(e.id),
						children: "×"
					}),
					r === e.id && n && /* @__PURE__ */ u(yr, {
						config: e,
						def: t,
						onCommit: (t, n) => a(e, t, n),
						onReset: (t) => o(e, t),
						onResetKeys: (t) => c(e, t),
						resolveColor: l,
						triggerRef: _,
						onClose: () => i(null)
					})
				]
			}, e.id);
		}), g && /* @__PURE__ */ u("button", {
			type: "button",
			className: j.legendToggle,
			title: g.expanded ? "Collapse indicators" : "Expand indicators",
			onClick: g.onToggle,
			children: g.expanded ? /* @__PURE__ */ u(m, {
				size: 14,
				strokeWidth: 3
			}) : /* @__PURE__ */ u(p, {
				size: 14,
				strokeWidth: 3
			})
		})]
	});
}
function xr({ indicators: e, onIndicatorsChange: t, resolved: n, subpanes: r, marginTop: a, marginLeft: o, infoBarHeight: s, barCount: l, expanded: f, onExpandedChange: p, subscribeHoverIndex: m, priceFormatter: h, resolveColor: g }) {
	let [_, v] = c(null), y = () => p((e) => !e), [b, x] = c(null);
	i(() => {
		if (!f) {
			x(null);
			return;
		}
		return m(x);
	}, [f, m]);
	let S = (n, r, i) => t(_r(e, n.id, r, i)), C = (n, r) => t(vr(e, n.id, [r])), w = (n, r) => {
		r.length !== 0 && t(vr(e, n.id, r));
	}, T = (n) => {
		_ === n && v(null), t(e.filter((e) => e.id !== n));
	}, E = e.filter((e) => e.enabled), D = E.filter((e) => G(e.defKey)?.pane === "price"), O = (e) => E.filter((t) => {
		let n = G(t.defKey)?.pane;
		return typeof n == "object" && n.subpane === e;
	}), k = b ?? l - 1, ee = (e) => {
		if (k < 0) return [];
		let t = n.find((t) => t.config.id === e.id), r = G(e.defKey);
		return !t || !r ? [] : r.legend(t.series, k, e.settings, { priceFmt: h });
	};
	return /* @__PURE__ */ d("div", {
		className: j.legend,
		"data-chart-legend": "",
		children: [/* @__PURE__ */ u(br, {
			configs: f ? D : [],
			top: a + 8 + s,
			left: o + 8,
			openId: _,
			setOpenId: v,
			onCommit: S,
			onReset: C,
			onResetKeys: w,
			resolveColor: g,
			onRemove: T,
			rowsFor: ee,
			toggle: D.length > 0 ? {
				expanded: f,
				onToggle: y
			} : void 0
		}), r.map((e) => /* @__PURE__ */ u(br, {
			configs: f ? O(e.key) : [],
			top: a + e.top + 8,
			left: o + 8,
			openId: _,
			setOpenId: v,
			onCommit: S,
			onReset: C,
			onResetKeys: w,
			resolveColor: g,
			onRemove: T,
			rowsFor: ee,
			toggle: {
				expanded: f,
				onToggle: y
			}
		}, e.key))]
	});
}
//#endregion
//#region src/controls/CandleSettingsPopup.tsx
function Sr({ appearance: e, onAppearanceChange: t, resolveColor: n, onClose: r, className: i, style: a }) {
	let o = s(null);
	return q(!0, r, [o]), /* @__PURE__ */ d("div", {
		className: K(j.legendPopover, i),
		ref: o,
		style: a,
		"data-chart-wheel-scroll": !0,
		"data-chart-native-menu": !0,
		children: [/* @__PURE__ */ d("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ u("span", {
				className: j.legendPopoverTitle,
				children: "Candles"
			}), /* @__PURE__ */ u("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: r,
				children: "×"
			})]
		}), /* @__PURE__ */ u("div", {
			className: j.panelScrollBody,
			children: /* @__PURE__ */ u(fr, {
				appearance: e,
				onAppearanceChange: t,
				resolveColor: n
			})
		})]
	});
}
//#endregion
//#region src/controls/AutoFitMenu.tsx
function Cr({ contributors: e, excluded: t, onExcludedChange: n, onClose: r, triggerRef: i, style: a }) {
	let o = s(null);
	q(!0, r, i ? [o, i] : [o]);
	let c = (e) => {
		n(t.includes(e) ? t.filter((t) => t !== e) : [...t, e]);
	};
	return /* @__PURE__ */ d("div", {
		className: j.autoFitMenu,
		ref: o,
		style: a,
		"data-chart-wheel-scroll": !0,
		"data-chart-native-menu": !0,
		children: [/* @__PURE__ */ d("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ u("span", {
				className: j.legendPopoverTitle,
				children: "Fit to…"
			}), /* @__PURE__ */ u("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: r,
				children: "×"
			})]
		}), /* @__PURE__ */ u("div", {
			className: j.panelScrollBody,
			children: e.length === 0 ? /* @__PURE__ */ u("div", {
				className: j.autoFitMenuEmpty,
				children: "No overlays to fit"
			}) : e.map((e) => /* @__PURE__ */ d("label", {
				className: j.autoFitMenuRow,
				children: [/* @__PURE__ */ u("input", {
					type: "checkbox",
					checked: !t.includes(e.key),
					onChange: () => c(e.key)
				}), /* @__PURE__ */ u("span", { children: e.label })]
			}, e.key))
		})]
	});
}
//#endregion
//#region src/panel/useDraggablePanel.ts
function wr(e) {
	let { pane: t, position: r, onPositionChange: a, defaultPosition: o } = e, l = s(null), u = s(null), [d, f] = c(null), [p, m] = c(null), [h, g] = c(null), [_, v] = c(!1), y = s(null), b = s(null), x = n((e) => {
		if (u.current &&= (u.current.disconnect(), null), l.current = e, !e) return;
		let t = () => {
			let t = e.getBoundingClientRect(), n = {
				panelW: t.width,
				panelH: t.height
			};
			f((e) => e && e.panelW === n.panelW && e.panelH === n.panelH ? e : n);
		};
		t();
		let n = new ResizeObserver(t);
		n.observe(e), u.current = n;
	}, []);
	i(() => {
		y.current || m(null);
	}, [r]);
	let S = r && !("v" in r) ? r : null, C = p || (r && "v" in r ? r : S ? d ? Ae(S, t, d.panelW, d.panelH) : null : o), w = null;
	if (d && C) if (_ && h) w = h;
	else {
		let e = we(C, t, d.panelW, d.panelH);
		w = Te(e.left, e.top, t, d.panelW, d.panelH);
	}
	return i(() => {
		!S || !d || b.current !== S && (b.current = S, a?.(Ae(S, t, d.panelW, d.panelH)));
	}, [
		S,
		d,
		t,
		a
	]), {
		panelRef: x,
		rendered: w,
		dragging: _,
		handlers: {
			onPointerDown: (e) => {
				w && (e.stopPropagation(), e.preventDefault(), l.current?.setPointerCapture(e.pointerId), y.current = {
					pointerId: e.pointerId,
					mx: e.clientX,
					my: e.clientY,
					startX: w.left,
					startY: w.top
				}, v(!0));
			},
			onPointerMove: (e) => {
				let n = y.current;
				!n || e.pointerId !== n.pointerId || (e.stopPropagation(), d && g(Te(n.startX + (e.clientX - n.mx), n.startY + (e.clientY - n.my), t, d.panelW, d.panelH)));
			},
			onPointerUp: (e) => {
				let n = y.current;
				if (!n || e.pointerId !== n.pointerId || (e.stopPropagation(), !d)) return;
				let r = Te(n.startX + (e.clientX - n.mx), n.startY + (e.clientY - n.my), t, d.panelW, d.panelH), i = Ee(r.left, r.top, t, d.panelW, d.panelH);
				a?.(i), m(i), g(null), y.current = null, v(!1), l.current?.releasePointerCapture(e.pointerId);
			},
			onPointerCancel: (e) => {
				let n = y.current;
				!n || e.pointerId !== n.pointerId || (e.stopPropagation(), h && d && m(Ee(h.left, h.top, t, d.panelW, d.panelH)), g(null), y.current = null, v(!1), l.current?.releasePointerCapture(e.pointerId));
			}
		}
	};
}
//#endregion
//#region src/controls/drawTools.ts
var Tr = [
	{
		tool: "cursor",
		label: "Cursor",
		Icon: _
	},
	{
		tool: "trendline",
		label: "Trend line",
		Icon: E
	},
	{
		tool: "ray",
		label: "Ray",
		Icon: w
	},
	{
		tool: "hline",
		label: "Horizontal line",
		Icon: g
	},
	{
		tool: "vline",
		label: "Vertical line",
		Icon: b
	},
	{
		tool: "hray",
		label: "Horizontal ray",
		Icon: y
	},
	{
		tool: "text",
		label: "Text",
		Icon: D
	},
	{
		tool: "ruler",
		label: "Ruler",
		Icon: S
	}
], X = {
	host: "_host_1txv5_3",
	card: "_card_1txv5_10",
	dragging: "_dragging_1txv5_29",
	toolBtn: "_toolBtn_1txv5_34",
	grip: "_grip_1txv5_38",
	toolBtnActive: "_toolBtnActive_1txv5_69",
	trashWrap: "_trashWrap_1txv5_82",
	confirmPopover: "_confirmPopover_1txv5_87",
	confirmText: "_confirmText_1txv5_104",
	confirmActions: "_confirmActions_1txv5_110",
	confirmCancel: "_confirmCancel_1txv5_116",
	confirmDelete: "_confirmDelete_1txv5_117",
	divider: "_divider_1txv5_147"
};
//#endregion
//#region src/controls/DrawToolbar.tsx
function Er(e) {
	let { panelRef: t, rendered: n, dragging: r, handlers: a } = wr({
		pane: e.pane,
		position: e.position,
		onPositionChange: e.onPositionChange,
		defaultPosition: De(0, .5, 8, 0)
	}), { onPointerDown: o, ...f } = a, p = (e) => {
		e.target.closest("[data-drag-handle]") && o?.(e);
	}, [m, g] = c(!1), _ = s(null), v = s(null), y = () => g(!1);
	return q(m, y, [v, _]), i(() => {
		e.drawingCount === 0 && g(!1);
	}, [e.drawingCount]), /* @__PURE__ */ u("div", {
		className: X.host,
		"data-chart-drawtoolbar": "",
		children: /* @__PURE__ */ d("div", {
			ref: t,
			role: "toolbar",
			"aria-orientation": "vertical",
			"aria-label": "Drawing tools",
			className: K(X.card, r && X.dragging),
			style: n ? {
				left: n.left,
				top: n.top
			} : { visibility: "hidden" },
			...f,
			onPointerDown: p,
			children: [
				/* @__PURE__ */ u("div", {
					className: X.grip,
					"data-drag-handle": "",
					title: "Drag to move",
					"aria-hidden": "true",
					children: /* @__PURE__ */ u(h, { size: 14 })
				}),
				Tr.map(({ tool: t, label: n, Icon: r }) => /* @__PURE__ */ u("button", {
					type: "button",
					title: n,
					"aria-label": n,
					"aria-pressed": e.activeTool === t,
					className: K(X.toolBtn, e.activeTool === t && X.toolBtnActive),
					onClick: () => e.onToolChange(t),
					children: /* @__PURE__ */ u(r, { size: 16 })
				}, t)),
				e.onDeleteAll && /* @__PURE__ */ d(l, { children: [/* @__PURE__ */ u("div", { className: X.divider }), /* @__PURE__ */ d("div", {
					className: X.trashWrap,
					children: [/* @__PURE__ */ u("button", {
						ref: _,
						type: "button",
						title: "Delete all",
						"aria-label": "Delete all drawings",
						"aria-haspopup": "dialog",
						"aria-expanded": m,
						className: K(X.toolBtn, m && X.toolBtnActive),
						disabled: e.drawingCount === 0,
						onClick: () => g((e) => !e),
						children: /* @__PURE__ */ u(T, { size: 16 })
					}), m && /* @__PURE__ */ d("div", {
						ref: v,
						className: X.confirmPopover,
						role: "dialog",
						"aria-label": "Delete all drawings",
						children: [/* @__PURE__ */ u("div", {
							className: X.confirmText,
							children: "Delete all drawings?"
						}), /* @__PURE__ */ d("div", {
							className: X.confirmActions,
							children: [/* @__PURE__ */ u("button", {
								type: "button",
								className: X.confirmCancel,
								onClick: y,
								children: "Cancel"
							}), /* @__PURE__ */ u("button", {
								type: "button",
								className: X.confirmDelete,
								onClick: () => {
									y(), e.onDeleteAll?.();
								},
								children: "Delete"
							})]
						})]
					})]
				})] })
			]
		})
	});
}
var Z = {
	statsHost: "_statsHost_517qz_6",
	statsPanel: "_statsPanel_517qz_13",
	statsTable: "_statsTable_517qz_29",
	lvlStrong: "_lvlStrong_517qz_42",
	lvlUp: "_lvlUp_517qz_45",
	lvlNeutral: "_lvlNeutral_517qz_48",
	lvlDown: "_lvlDown_517qz_51",
	lvlText: "_lvlText_517qz_54",
	lvlMuted: "_lvlMuted_517qz_57",
	sizeTiny: "_sizeTiny_517qz_62",
	sizeSmall: "_sizeSmall_517qz_65",
	sizeNormal: "_sizeNormal_517qz_68",
	sizeLarge: "_sizeLarge_517qz_71",
	dragging: "_dragging_517qz_76"
}, Dr = {
	tiny: Z.sizeTiny,
	small: Z.sizeSmall,
	normal: Z.sizeNormal,
	large: Z.sizeLarge
}, Or = {
	strong: Z.lvlStrong,
	up: Z.lvlUp,
	neutral: Z.lvlNeutral,
	down: Z.lvlDown,
	text: Z.lvlText,
	muted: Z.lvlMuted
};
function kr({ model: e, size: t, pane: n, position: r, onPositionChange: i }) {
	let { panelRef: a, rendered: o, dragging: s, handlers: c } = wr({
		pane: n,
		position: r,
		onPositionChange: i,
		defaultPosition: Oe()
	});
	return e.rows.length === 0 ? null : /* @__PURE__ */ u("div", {
		className: Z.statsHost,
		"data-chart-stats": "",
		children: /* @__PURE__ */ u("div", {
			ref: a,
			className: `${Z.statsPanel} ${Dr[t]} ${s ? Z.dragging : ""}`,
			style: o ? {
				left: o.left,
				top: o.top
			} : { visibility: "hidden" },
			...c,
			children: /* @__PURE__ */ u("table", {
				className: Z.statsTable,
				children: /* @__PURE__ */ u("tbody", { children: e.rows.map((e, t) => e.kind === "merged" ? /* @__PURE__ */ u("tr", { children: /* @__PURE__ */ u("td", {
					colSpan: 3,
					className: Or[e.cell.level],
					children: e.cell.text
				}) }, t) : /* @__PURE__ */ u("tr", { children: e.cells.map((e, t) => /* @__PURE__ */ u("td", {
					className: Or[e.level],
					children: e.text
				}, t)) }, t)) })
			})
		})
	});
}
//#endregion
//#region src/utils/toColumns.ts
var Ar = /* @__PURE__ */ new WeakMap();
function jr(e) {
	let t = Ar.get(e);
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
	return Ar.set(e, c), c;
}
//#endregion
//#region src/stats/computeStats.ts
var Mr = {
	text: "",
	level: "muted"
}, Nr = 252;
function Pr(e) {
	return e < 10 ? e.toFixed(1) : String(Math.round(e));
}
function Fr(e) {
	return typeof e == "number" && Number.isFinite(e) && e !== 0 ? e : null;
}
function Ir(e, t) {
	return e > 5 * t ? "strong" : e > 4 * t ? "up" : e > 3 * t ? "neutral" : "down";
}
function Lr(e, t) {
	let n = (e.length ? e[e.length - 1] : NaN) * 100;
	return Number.isFinite(n) ? {
		text: `${Pr(n * .5)} %`,
		level: Ir(n, t)
	} : Mr;
}
function Rr(e, t, n, r = Nr) {
	let i = e.length;
	if (i === 0) return { rows: [] };
	let { h: a, l: o, c: s } = jr(e), c = s[i - 1], l = i >= 2 ? s[i - 2] : s[i - 1], u = Number.isFinite(r) && r > 0 ? r : Nr, d = (e) => Math.max(1, Math.round(u * e)), f = Math.sqrt(Nr / u), p = Rt(a, o, s), m = new Float64Array(i);
	for (let e = 0; e < i; e++) m[e] = p[e] / s[e];
	let h = Lr(Et(m, d(1 / 2)), f), g = Lr(Et(m, d(1 / 4)), f), _ = Lr(Et(m, d(1 / 12)), f), v = t ?? {}, y = (v.sector ?? "").trim(), b = (v.industry ?? "").trim(), x = Fr(v.sharesOutstanding), S = Fr(v.freeFloatPercent), C = Mr;
	if (S !== null) {
		let e = S >= 60 ? "neutral" : S >= 30 ? "up" : S >= 20 ? "neutral" : "down";
		C = {
			text: `${Pr(S)} %`,
			level: e
		};
	}
	let w = Mr;
	if (x !== null) if (n === "US") {
		let e = x * l / 1e6;
		e !== 0 && Number.isFinite(e) && (w = {
			text: e > 1e3 ? `${Pr(e / 1e3)} B` : `${Pr(e)} M`,
			level: e >= 2e3 ? "up" : e >= 250 ? "neutral" : "down"
		});
	} else {
		let e = x * l / 1e10;
		if (e !== 0 && Number.isFinite(e)) {
			let t = e >= 5 ? "up" : e >= 1 ? "neutral" : "down";
			w = {
				text: `${Pr(e)} K`,
				level: t
			};
		}
	}
	let T = Mr;
	if (typeof v.eps == "number" && Number.isFinite(v.eps)) {
		let e = V(v.eps);
		if (e !== 0) {
			let t = Math.round(c / e * 10) / 10;
			T = {
				text: String(t),
				level: "text"
			};
		}
	}
	let E = y !== "" || b !== "" || w.text !== "" || C.text !== "" || T.text !== "", D = [];
	return E && (D.push({
		kind: "merged",
		cell: {
			text: y,
			level: "text"
		}
	}), D.push({
		kind: "merged",
		cell: {
			text: b,
			level: "text"
		}
	}), D.push({
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
	}), D.push({
		kind: "cells",
		cells: [
			w,
			C,
			T
		]
	})), D.push({
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
	}), D.push({
		kind: "cells",
		cells: [
			h,
			g,
			_
		]
	}), { rows: D };
}
var Q = {
	earningsHost: "_earningsHost_cbwe3_6",
	earningsPanel: "_earningsPanel_cbwe3_13",
	earningsTable: "_earningsTable_cbwe3_29",
	label: "_label_cbwe3_42",
	score: "_score_cbwe3_47",
	lvlStrong: "_lvlStrong_cbwe3_52",
	lvlUp: "_lvlUp_cbwe3_55",
	lvlNeutral: "_lvlNeutral_cbwe3_58",
	lvlDown: "_lvlDown_cbwe3_61",
	lvlText: "_lvlText_cbwe3_64",
	lvlMuted: "_lvlMuted_cbwe3_67",
	sizeTiny: "_sizeTiny_cbwe3_72",
	sizeSmall: "_sizeSmall_cbwe3_75",
	sizeNormal: "_sizeNormal_cbwe3_78",
	sizeLarge: "_sizeLarge_cbwe3_81",
	dragging: "_dragging_cbwe3_86"
}, zr = {
	tiny: Q.sizeTiny,
	small: Q.sizeSmall,
	normal: Q.sizeNormal,
	large: Q.sizeLarge
}, Br = {
	strong: Q.lvlStrong,
	up: Q.lvlUp,
	neutral: Q.lvlNeutral,
	down: Q.lvlDown,
	text: Q.lvlText,
	muted: Q.lvlMuted
}, Vr = [
	"EPS",
	"YoY",
	"RPS",
	"YoY",
	"NPM",
	"YoY",
	"Score"
], Hr = Vr.length - 1;
function Ur({ model: e, size: t, pane: n, position: r, onPositionChange: i }) {
	let { panelRef: a, rendered: o, dragging: s, handlers: c } = wr({
		pane: n,
		position: r,
		onPositionChange: i,
		defaultPosition: De(1, 0, -8, 8)
	});
	return e.rows.length === 0 ? null : /* @__PURE__ */ u("div", {
		className: Q.earningsHost,
		"data-chart-earnings": "",
		children: /* @__PURE__ */ u("div", {
			ref: a,
			className: `${Q.earningsPanel} ${zr[t]} ${s ? Q.dragging : ""}`,
			style: o ? {
				left: o.left,
				top: o.top
			} : { visibility: "hidden" },
			...c,
			children: /* @__PURE__ */ u("table", {
				className: Q.earningsTable,
				children: /* @__PURE__ */ d("tbody", { children: [/* @__PURE__ */ d("tr", { children: [/* @__PURE__ */ u("td", {
					className: `${Q.label} ${Br[e.freeFloat.level]}`,
					children: e.freeFloat.text
				}), Vr.map((e, t) => /* @__PURE__ */ u("td", {
					className: `${Br.muted} ${t === Hr ? Q.score : ""}`,
					children: e
				}, t))] }), e.rows.map((e, t) => /* @__PURE__ */ d("tr", { children: [/* @__PURE__ */ u("td", {
					className: `${Q.label} ${Br.text}`,
					children: e.label
				}), e.cells.map((e, t) => /* @__PURE__ */ u("td", {
					className: `${Br[e.level]} ${t === Hr ? Q.score : ""}`,
					children: e.text
				}, t))] }, t))] })
			})
		})
	});
}
//#endregion
//#region src/earnings/computeEarnings.ts
var Wr = .5, Gr = 1, Kr = -25, qr = [
	{
		margin: 20,
		gEps: 0,
		gRev: 0
	},
	{
		margin: 10,
		gEps: 10,
		gRev: 10
	},
	{
		margin: 5,
		gEps: 25,
		gRev: 25
	},
	{
		margin: 0,
		gEps: 40,
		gRev: 40
	}
], Jr = 20, Yr = 6, Xr = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
], Zr = {
	text: "",
	level: "muted"
};
function Qr(e) {
	return typeof e == "number" && Number.isFinite(e) ? e : NaN;
}
function $r(e) {
	let t = new Date(e).getTime();
	if (!Number.isFinite(t)) return e;
	let n = new Date(t), r = n.getUTCMonth() - 1, i = n.getUTCFullYear();
	return r < 0 && (r = 11, --i), `${Xr[r]}-${String(i % 100).padStart(2, "0")}`;
}
function ei(e) {
	return e < 10 ? e.toFixed(1) : String(Math.round(e));
}
function ti(e, t) {
	let n = e[t];
	if (!Number.isFinite(n)) return Zr;
	let r = 0, i = !0;
	for (let n = 1; n <= 4; n++) {
		let a = t - n >= 0 ? e[t - n] : NaN;
		if (!Number.isFinite(a)) {
			i = !1;
			break;
		}
		r += a;
	}
	let a = i ? r / 4 : NaN, o = n > 0 ? n > a * 1.75 ? "strong" : n > a * 1.25 ? "up" : "neutral" : "down";
	return {
		text: ei(n),
		level: o
	};
}
function ni(e) {
	if (!Number.isFinite(e)) return Zr;
	let t = e <= 5 ? "down" : e <= 12 ? "neutral" : "up";
	return {
		text: (e < 10 ? e.toFixed(1) : String(Math.round(e))) + "%",
		level: t
	};
}
function ri(e, t, n) {
	if (!Number.isFinite(e)) return Zr;
	let r;
	r = t > 0 ? n ? e >= 0 ? "up" : "down" : e > 25 ? "up" : e > -5 ? "neutral" : "down" : "down";
	let i = Math.round(e);
	return {
		text: `${i >= 0 ? "+" : ""}${i}%`,
		level: r
	};
}
function ii(e) {
	if (e == null || !Number.isFinite(e)) return {
		text: "--",
		level: "muted"
	};
	let t = e > 60 ? "neutral" : e > 30 ? "up" : e > 20 ? "neutral" : "down";
	return {
		text: (e < 10 ? e.toFixed(1) : String(Math.round(e))) + "%",
		level: t
	};
}
function ai(e, t, n, r, i, a, o) {
	let s = !Number.isFinite(e) || e <= 0 || !Number.isFinite(t) || t <= 0, c = Number.isFinite(n), l = Number.isFinite(a) && Number.isFinite(o) && Math.abs(a) >= Wr && Math.abs(o) >= Gr, u;
	return u = l ? s || r < Kr ? "down" : c && qr.some((e) => n > e.margin && r > e.gEps && i > e.gRev) ? "up" : "neutral" : s ? "down" : c && n > Jr ? "up" : "neutral", {
		text: "●",
		level: u
	};
}
function oi(e, t) {
	let n = ii(t), r = [...(e ?? []).filter((e) => Number.isFinite(new Date(e.date).getTime()))].sort((e, t) => e.date < t.date ? -1 : +(e.date > t.date)), i = r.length;
	if (i === 0) return {
		rows: [],
		freeFloat: n
	};
	let a = r.map((e) => new Date(e.date).getTime()), o = r.map((e) => Qr(e.eps)), s = r.map((e) => Qr(e.rps)), c = r.map((e) => Qr(e.npm)), l = pt(r, "eps"), u = pt(r, "rps"), d = new Float64Array(i).fill(NaN);
	for (let e = 0; e < i; e++) {
		let t = c[e];
		if (!Number.isFinite(t)) continue;
		let n = ft(a, e);
		if (n < 0) continue;
		let r = c[n];
		!Number.isFinite(r) || r === 0 || (d[e] = (t - r) / Math.abs(r) * 100);
	}
	let f = [];
	for (let e = i - 1; e >= Math.max(0, i - Yr); e--) {
		let t = ft(a, e), n = t >= 0 ? o[t] : NaN, i = t >= 0 ? s[t] : NaN;
		f.push({
			label: $r(r[e].date),
			cells: [
				ti(o, e),
				ri(l[e], o[e], !1),
				ti(s, e),
				ri(u[e], s[e], !1),
				ni(c[e]),
				ri(d[e], c[e], !0),
				ai(o[e], s[e], c[e], l[e], u[e], n, i)
			]
		});
	}
	return {
		rows: f,
		freeFloat: n
	};
}
//#endregion
//#region src/indicators/subpaneLayout.ts
function si(e) {
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
		let r = s.reduce((e, t) => e + t, 0);
		if (r > e && r > 0) {
			let t = e / r;
			s = s.map((e) => e * t);
		}
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
function ci(e) {
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
function li(e) {
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
//#region src/gestures/chartRegion.ts
function ui(e) {
	let { mx: t, my: n, width: r, priceHeight: i, fullHeight: a, bands: o, dividerHalfPx: s } = e;
	if (n > a) return { kind: "none" };
	if (t > r) return { kind: "gutter" };
	for (let e of o) if (Math.abs(n - e.top) <= s) return { kind: "none" };
	if (n <= i) return { kind: "price" };
	for (let e = 0; e < o.length; e++) {
		let t = o[e], r = e === o.length - 1;
		if (n >= t.top && (r ? n <= t.bottom : n < t.bottom)) return {
			kind: "subpane",
			key: t.key
		};
	}
	return { kind: "none" };
}
//#endregion
//#region src/gestures/thresholds.ts
var di = 4, fi = 10, pi = (e) => e === "touch" ? fi : di, mi = (e) => e === 0 ? "idle" : e === 1 ? "pan" : "pinch";
function hi(e) {
	let t = e.values(), n = t.next().value, r = t.next().value;
	return !n || !r ? 0 : Math.hypot(n.x - r.x, n.y - r.y);
}
function gi(e, t) {
	if (t.type === "down") return e.set(t.pointerId, {
		x: t.x,
		y: t.y
	}), { mode: mi(e.size) };
	if (t.type === "up" || t.type === "cancel") return e.delete(t.pointerId), { mode: mi(e.size) };
	let n = e.get(t.pointerId);
	if (!n) return { mode: mi(e.size) };
	if (e.size === 1) {
		let e = t.x - n.x, r = t.y - n.y;
		return n.x = t.x, n.y = t.y, {
			mode: "pan",
			panDx: e,
			panDy: r
		};
	}
	let r = hi(e);
	n.x = t.x, n.y = t.y;
	let i = hi(e), a = { mode: "pinch" };
	return r > 0 && (a.zoomRatio = i / r), a;
}
//#endregion
//#region src/chartSizing.ts
function _i(e) {
	let { propWidth: t, propHeight: n, measuredWidth: r, measuredHeight: i, margin: a, rightBuffer: o } = e, s = t ?? r, c = n ?? i, l = s === 0 || c === 0, u = s - a.right - o, d = !l && u <= 0, f = !l && !d;
	return {
		width: Math.max(1, s - a.left - a.right),
		height: c,
		totalHeight: Math.max(1, c - a.top - a.bottom),
		draw: f,
		tooSmall: d
	};
}
//#endregion
//#region src/xAxisTicks.ts
var vi = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
function yi(e) {
	return Math.floor(Date.parse(e) / 864e5);
}
function bi(e) {
	return Math.floor((yi(e) + 3) / 7);
}
function xi(e) {
	if (e.length === 0) return Infinity;
	let t = [...e].sort((e, t) => e - t), n = t.length >> 1;
	return t.length % 2 ? t[n] : (t[n - 1] + t[n]) / 2;
}
function Si(e, t, n) {
	let r = e(t), i = t > 0 ? e(t - 1) : void 0, a = r.slice(0, 4), o = vi[r.slice(5, 7) - 1] ?? "", s = +r.slice(8, 10), c = !i || r.slice(0, 4) !== i.slice(0, 4), l = !i || r.slice(0, 7) !== i.slice(0, 7);
	return c ? a : l ? n ? `${o} ${a}` : o : n ? `${o} ${s}` : String(s);
}
function Ci(e) {
	return `${+e.slice(8, 10)} ${vi[e.slice(5, 7) - 1] ?? ""} '${e.slice(2, 4)}`;
}
function wi(e) {
	let { dateAt: t, from: n, to: r, step: i, minGapPx: a } = e, o = Math.max(1, n), s = r;
	if (s <= o || i <= 0) return [];
	let c = a / i, l = (e) => +t(e).slice(5, 7), u = (e) => +t(e).slice(0, 4), d = (e) => t(e).slice(0, 7) !== t(e - 1).slice(0, 7), f = (e) => t(e).slice(0, 4) !== t(e - 1).slice(0, 4), p = (e) => bi(t(e)) !== bi(t(e - 1)), m = (e) => {
		let t = [];
		for (let n = o; n < s; n++) e(n) && t.push(n);
		return t;
	}, h = [
		() => {
			let e = [];
			for (let t = o; t < s; t++) e.push(t);
			return e;
		},
		() => m(p),
		() => m(d),
		() => m((e) => d(e) && (l(e) - 1) % 3 == 0),
		() => m((e) => d(e) && (l(e) === 1 || l(e) === 7)),
		() => m(f),
		() => m((e) => f(e) && u(e) % 2 == 0),
		() => m((e) => f(e) && u(e) % 5 == 0),
		() => m((e) => f(e) && u(e) % 10 == 0)
	], g = [];
	for (let e of h) {
		g = e();
		let t = [];
		for (let e = 1; e < g.length; e++) t.push(g[e] - g[e - 1]);
		if (xi(t) >= c || g.length <= 1) break;
	}
	let _ = [];
	for (let e of g) {
		let t = _[_.length - 1];
		(t === void 0 || e - t >= c) && _.push(e);
	}
	return _.map((e, n) => ({
		index: e,
		label: Si(t, e, n === 0)
	}));
}
//#endregion
//#region src/utils/drawSeries.ts
function Ti(e, t) {
	let { hRatio: n, vRatio: r } = t, i = [];
	e.setTransform(n, 0, 0, r, 0, 0), e.clearRect(0, 0, t.cssWidth, t.cssHeight);
	let a = t.fullHeight + t.marginTop + t.marginBottom, o = e.createLinearGradient(0, a, 0, 0);
	return o.addColorStop(0, t.background.bottomColor), o.addColorStop(1, t.background.topColor), e.save(), e.fillStyle = o, e.beginPath(), e.roundRect(0, 0, t.cssWidth, a, t.background.radius), e.fill(), e.restore(), e.save(), Ei(e, t, t.marginTop + t.priceHeight), Bi(e, t, !1, i), t.chartType === "bar" ? zi(e, t, i) : Ai(e, t, i), e.restore(), e.save(), Ei(e, t, t.marginTop + t.fullHeight + t.marginBottom), Bi(e, t, !0, i), e.restore(), i;
}
function Ei(e, t, n) {
	let r = Math.round(t.marginLeft * t.hRatio), i = Math.round((t.marginLeft + t.width - t.rightBuffer) * t.hRatio), a = Math.round(n * t.vRatio);
	e.setTransform(1, 0, 0, 1, 0, 0), e.beginPath(), e.rect(r, 0, i - r, a), e.clip(), e.setTransform(t.hRatio, 0, 0, t.vRatio, 0, 0), e.translate(t.marginLeft + t.baseTranslateX, t.marginTop);
}
var Di = (e) => (e.marginLeft + e.baseTranslateX) * e.hRatio, Oi = (e) => e.marginTop * e.vRatio;
function ki(e, t, n) {
	e.fillStyle = t;
	for (let t of n) e.fillRect(t[0], t[1], t[2], t[3]);
}
function Ai(e, t, n) {
	let { xScale: r, yPrice: i, bandwidth: a, renderStart: o, renderSlice: s, colors: c } = t, l = Di(t), u = Oi(t), d = Math.max(1, Math.floor(t.vRatio)), f = Math.max(1, Math.round(a));
	f % 2 == 0 && (f = Math.max(1, f - 1));
	let p = Math.max(1, Math.round(f * t.hRatio)), m = Math.min(p, Math.max(Math.max(1, Math.floor(t.hRatio)), Math.round(p * Pn))), h = [], g = [];
	for (let e = 0; e < s.length; e++) {
		let n = e + o, c = s[e], f = l + (r(n) + a / 2) * t.hRatio, _ = (e) => Math.round(u + i(e) * t.vRatio), v = c.close >= c.open ? h : g, y = _(c.high);
		v.push([
			Math.round(f - m / 2),
			y,
			m,
			Math.max(d, _(c.low) - y)
		]);
		let b = _(Math.max(c.open, c.close));
		v.push([
			Math.round(f - p / 2),
			b,
			p,
			Math.max(d, _(Math.min(c.open, c.close)) - b)
		]);
	}
	e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.globalAlpha = t.candle.opacity, ki(e, c.positive, h), ki(e, c.negative, g), e.restore(), n.push(ji(t, p / (2 * t.hRatio)));
}
function ji(e, t) {
	return {
		sourceId: En,
		spanAt: (t) => {
			let n = e.data[t];
			return n ? [e.yPrice(n.high), e.yPrice(n.low)] : null;
		},
		halfWidth: t,
		interpolate: !1
	};
}
var Mi = 2, Ni = 2, Pi = 6;
function Fi(e, t, n, r) {
	let i = e * Mi, a = e * t, o = Ni;
	for (let e of n) i >= e && o++;
	let s = Math.max(Math.max(1, Math.floor(t)), Math.round(o * t / Mi)), c = Math.round(r * a);
	return {
		markW: s,
		sideW: Math.max(s, c - Math.floor(s / 2)),
		drawTicks: i >= Pi
	};
}
function Ii(e, t, n, r) {
	let { markW: i, sideW: a } = n, o = Math.round(t - i / 2), s = r(e.high), c = Math.max(i, r(e.low) - s), l = [[
		o,
		s,
		i,
		c
	]];
	if (n.drawTicks) {
		let t = (e) => Math.min(Math.max(r(e), s), s + c - i);
		l.push([
			o - a,
			t(e.open),
			a,
			i
		]), l.push([
			o + i,
			t(e.close),
			a,
			i
		]);
	}
	return l;
}
function Li(e, t, n) {
	let r = Di(e) + (e.xScale(n) + e.bandwidth / 2) * e.hRatio, i = Math.min(t.markW + 2 * t.sideW, Math.max(t.markW, Math.floor(e.step * e.hRatio)));
	return {
		left: Math.round(r - i / 2),
		width: i
	};
}
function Ri(e) {
	return Fi(e.step, e.hRatio, Mn, Nn);
}
function zi(e, t, n) {
	let { xScale: r, yPrice: i, bandwidth: a, renderStart: o, renderSlice: s, colors: c } = t, l = Ri(t), u = Di(t), d = Oi(t), f = (e) => Math.round(d + i(e) * t.vRatio), p = [], m = [];
	for (let e = 0; e < s.length; e++) {
		let n = e + o, i = s[e], c = u + (r(n) + a / 2) * t.hRatio;
		(i.close >= i.open ? p : m).push(...Ii(i, c, l, f));
	}
	e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.globalAlpha = t.candle.opacity, ki(e, c.positive, p), ki(e, c.negative, m), e.restore();
	let h = Li(t, l, t.renderStart).width;
	n.push(ji(t, h / (2 * t.hRatio)));
}
function Bi(e, t, n, r) {
	if (t.indicators.length === 0) return;
	let i = Ri(t), a = (e) => Li(t, i, e), o = Di(t), s = Oi(t);
	for (let { config: i, series: c, meta: l } of t.indicators) {
		let u = G(i.defKey);
		if (!u) continue;
		let d = typeof u.pane == "object" && "subpane" in u.pane;
		if (d !== n) continue;
		let f, p;
		if (d) {
			let e = u.pane.subpane, n = t.subpaneScales.get(e);
			if (!n) continue;
			f = n, p = n.range();
		} else f = t.yPrice, p = t.yPrice.range();
		r.length;
		let m = {
			hit: { add: (e) => r.push({
				...e,
				sourceId: i.id
			}) },
			xScale: t.xScale,
			yPrice: t.yPrice,
			y: (e) => f(e),
			bandwidth: t.bandwidth,
			data: t.data,
			renderStart: t.renderStart,
			renderEnd: t.renderEnd,
			paneTop: Math.min(...p),
			paneBottom: Math.max(...p),
			hRatio: t.hRatio,
			vRatio: t.vRatio,
			originX: o,
			originY: s,
			barSlot: a
		};
		u.draw(e, c, m, i.settings, t.resolveColor, l);
	}
}
//#endregion
//#region src/patterns/renderers/baseBreakout.ts
var Vi = 8, Hi = 4, Ui = 6;
function Wi(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function Gi(e, t, n, r) {
	let i = e.markers;
	if (!Array.isArray(i?.levels) || i.levels.length === 0) return;
	let a = r.patternStyle.base_breakout, o = r.resolveColor, s = a.labelFontSize, c = null;
	for (let e of i.levels) {
		let n = A(r.bars, e.start), i = A(r.bars, e.end);
		if (n == null || i == null) continue;
		let s = Wi(n, r), l = Wi(i, r);
		if (s == null || l == null) continue;
		let u = r.yPrice(e.price), d = s + r.bandwidth / 2, f = l + r.bandwidth / 2;
		c = f, t.append("line").attr("class", "bb-resistance").attr("x1", d).attr("y1", u).attr("x2", f).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-dasharray", a.lineDash).attr("stroke-linecap", "round"), t.append("circle").attr("class", "bb-breakout-dot").attr("cx", f).attr("cy", u).attr("r", 3).attr("fill", o(a.dotFill));
		let p = Wi(Math.round((n + i) / 2), r);
		if (p != null && typeof e.base_days == "number" && typeof e.base_depth_pct == "number") {
			let n = p + r.bandwidth / 2, i = u - Ui;
			t.append("text").attr("class", "bb-stat").attr("x", n).attr("y", i).attr("text-anchor", "middle").style("font-size", "var(--text-3xs)").attr("fill", o(a.statColor)).style("font-weight", "var(--font-weight-semibold)").text(`${Math.round(e.base_days)}d · ${e.base_depth_pct.toFixed(1)}%`);
		}
	}
	let l = i.levels[0], u = r.yPrice(l.price), d = (Wi(r.dataLength - 1, r) ?? c ?? 0) + r.bandwidth + 2 * r.step + 4, f = s + 2 * Hi, p = n.append("g").attr("class", "bb-label").attr("transform", `translate(${d},${u - f / 2})`), m = p.append("text").attr("class", "bb-label-text").attr("x", Vi).attr("y", f / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).style("font-weight", "var(--font-weight-semibold)").text("Base breakout").node(), h = (m ? m.getBBox().width : 91) + 2 * Vi;
	p.insert("rect", "text").attr("class", "bb-label-bg").attr("x", 0).attr("y", 0).attr("width", h).attr("height", f).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
//#endregion
//#region src/patterns/renderers/consolidation.ts
var Ki = 8, qi = 4;
function Ji(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function Yi(e, t, n, r) {
	let i = e.markers;
	if (!i?.start_date || !i?.end_date || !Number.isFinite(i.range_high) || !Number.isFinite(i.range_low)) return;
	let a = r.patternStyle.consolidation, o = r.resolveColor, s = a.labelFontSize, c = A(r.bars, i.start_date), l = A(r.bars, i.end_date);
	if (c == null || l == null) return;
	let u = Ji(c, r), d = Ji(l, r);
	if (u == null || d == null) return;
	let f = u, p = d + r.bandwidth, m = r.yPrice(Math.max(i.range_high, i.range_low)), h = r.yPrice(Math.min(i.range_high, i.range_low));
	t.append("rect").attr("class", "consol-box").attr("x", f).attr("y", m).attr("width", Math.max(0, p - f)).attr("height", Math.max(0, h - m)).attr("fill", o(a.boxFill)).attr("fill-opacity", a.boxFillOpacity).attr("stroke", "none");
	let g = i.consolidation_days, _ = i.range_low > 0 ? (i.range_high - i.range_low) / i.range_low * 100 : null, v = ["Consolidation"];
	typeof g == "number" && v.push(`${Math.round(g)}d`), _ != null && v.push(`${_.toFixed(1)}%`);
	let y = v.join(" · ");
	typeof i.tightness == "number" && Number.isFinite(i.tightness) && (y += ` (${i.tightness.toFixed(2)}x ATR)`);
	let b = s + 2 * qi, x = n.append("g").attr("class", "consol-label").style("display", "none"), S = (x.append("text").attr("class", "consol-label-text").attr("x", Ki).attr("y", b / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).style("font-weight", "var(--font-weight-semibold)").text(y).node()?.getBBox().width ?? y.length * 7) + 2 * Ki, C = (f + p) / 2;
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
var Xi = 8, Zi = 4;
function Qi(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function $i(e, t, n, r) {
	let i = e.markers;
	if (!i?.segments?.pole || !i?.segments?.flag) return;
	let a = r.patternStyle.high_tight_flag, o = r.resolveColor, s = a.labelFontSize, c = A(r.bars, i.segments.pole[0]), l = A(r.bars, i.segments.pole[1]), u = A(r.bars, i.segments.flag[0]), d = A(r.bars, i.segments.flag[1]);
	if (c == null || l == null || u == null || d == null) return;
	let f = Qi(c, r), p = Qi(l, r), m = Qi(u, r), h = Qi(d, r);
	if (f == null || p == null || m == null || h == null) return;
	let g = r.bars[c], _ = r.bars[l], v = r.yPrice(g.high), y = r.yPrice(_.high), b = -Infinity, x = Infinity;
	for (let e = u; e <= d; e++) {
		let t = r.bars[e];
		t.high > b && (b = t.high), t.low < x && (x = t.low);
	}
	if (!Number.isFinite(b) || !Number.isFinite(x)) return;
	let S = m, C = h + r.bandwidth, w = r.yPrice(b), T = r.yPrice(x), E = f + r.bandwidth / 2, D = p + r.bandwidth / 2;
	t.append("line").attr("class", "htf-pole").attr("x1", E).attr("y1", v).attr("x2", D).attr("y2", y).attr("stroke", o(a.poleColor)).attr("stroke-opacity", a.poleOpacity).attr("stroke-width", a.poleWidth).attr("stroke-linecap", "round"), t.append("rect").attr("class", "htf-flag").attr("x", S).attr("y", w).attr("width", Math.max(0, C - S)).attr("height", Math.max(0, T - w)).attr("fill", o(a.flagFill)).attr("fill-opacity", a.flagFillOpacity).attr("stroke", "none");
	let O = i.score, k = O != null && Number.isFinite(O) ? ` ${Math.round(O)}%` : "", ee = i.tier === "high" ? "High" : i.tier === "low" ? "Low" : null, te = `${ee ? `${ee} tight flag` : "Tight flag"}${k}`, ne = (Qi(r.dataLength - 1, r) ?? C) + r.bandwidth + 2 * r.step + 4, re = n.append("g").attr("class", "htf-label").attr("transform", `translate(${ne},${w})`), ie = s + 2 * Zi, ae = re.append("text").attr("class", "htf-label-text").attr("x", Xi).attr("y", ie / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).style("font-weight", "var(--font-weight-semibold)").text(te).node(), oe = (ae ? ae.getBBox().width : te.length * 7) + 2 * Xi;
	re.insert("rect", "text").attr("class", "htf-label-bg").attr("x", 0).attr("y", 0).attr("width", oe).attr("height", ie).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
var ea = (e) => e + 8;
function ta(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function na(e, t) {
	let { x: n, y: r, text: i, style: a, rc: o, center: s = !1, className: c } = t, l = a.labelFontSize, u = ea(l), d = e.append("g");
	c && d.attr("class", c);
	let f = (d.append("text").attr("x", 8).attr("y", u / 2).attr("dominant-baseline", "central").attr("font-size", l).attr("fill", o(a.labelTextColor)).style("font-weight", "var(--font-weight-semibold)").text(i).node()?.getBBox().width ?? i.length * 7) + 16;
	d.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", f).attr("height", u).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
	let p = s ? n - f / 2 : n;
	return d.attr("transform", `translate(${p},${r})`), {
		group: d,
		width: f,
		height: u
	};
}
function ra(e, t) {
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
var ia = 3;
function aa(e, t, n, r) {
	let i = e.markers;
	if (!i?.gap_date || !Number.isFinite(i.prev_high) || !Number.isFinite(i.gap_low)) return;
	let a = r.patternStyle.gap_up, o = r.resolveColor, s = A(r.bars, i.gap_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth + ia * r.step, u = r.yPrice(Math.max(i.prev_high, i.gap_low)), d = r.yPrice(Math.min(i.prev_high, i.gap_low));
	t.append("rect").attr("class", "gap-up-band").attr("x", c).attr("y", u).attr("width", Math.max(0, l - c)).attr("height", Math.max(0, d - u)).attr("fill", o(a.bandFill)).attr("fill-opacity", a.bandFillOpacity).attr("stroke", "none");
	let f = typeof i.gap_pct == "number" && Number.isFinite(i.gap_pct) ? ` · ${i.gap_pct.toFixed(1)}%` : "", p = (u + d) / 2;
	na(n, {
		x: l + 6,
		y: p - ea(a.labelFontSize) / 2,
		text: `Gap up${f}`,
		style: a,
		rc: o,
		className: "gap-up-label"
	});
}
//#endregion
//#region src/patterns/renderers/volumeBreakout.ts
var oa = 6;
function sa(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_breakout, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + oa;
	ra(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	na(n, {
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
function ca(e, t, n, r) {
	let i = e.markers;
	if (!i?.cross_date || !Number.isFinite(i.cross_price)) return;
	let a = r.patternStyle.golden_cross, o = r.resolveColor, s = A(r.bars, i.cross_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.cross_price);
	ra(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	}), na(n, {
		x: l + 6 + 4,
		y: u - ea(a.labelFontSize) / 2,
		text: "Golden cross",
		style: a,
		rc: o,
		className: "golden-cross-label"
	});
}
//#endregion
//#region src/patterns/renderers/nr7.ts
var la = 4;
function ua(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.bar_high) || !Number.isFinite(i.bar_low)) return;
	let a = r.patternStyle.nr7, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth, u = c + r.bandwidth / 2, d = r.yPrice(i.bar_high), f = r.yPrice(i.bar_low);
	for (let e of [d, f]) t.append("line").attr("class", "nr7-range").attr("x1", c).attr("y1", e).attr("x2", l).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let p = d - la;
	ra(t, {
		x: u,
		y: p,
		kind: "arrowDown",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), na(n, {
		x: u,
		y: p - 6 * 1.6 - ea(a.labelFontSize) - 2,
		text: "NR7",
		style: a,
		rc: o,
		center: !0,
		className: "nr7-label"
	});
}
//#endregion
//#region src/patterns/renderers/unusualVolume.ts
var da = 8;
function fa(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.unusual_volume, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + da;
	ra(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	na(n, {
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
var pa = 8;
function ma(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_dryup, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + pa;
	ra(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), na(n, {
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
var ha = 6;
function ga(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.pocket_pivot, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + ha;
	ra(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), na(n, {
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
function _a(e, t, n, r) {
	let i = e.markers;
	if (!i?.inside_date || !i?.mother_date || !Number.isFinite(i.inside_high) || !Number.isFinite(i.inside_low) || !Number.isFinite(i.mother_high) || !Number.isFinite(i.mother_low)) return;
	let a = r.patternStyle.inside_day, o = r.resolveColor, s = A(r.bars, i.mother_date), c = A(r.bars, i.inside_date);
	if (s == null || c == null) return;
	let l = ta(s, r), u = ta(c, r);
	if (l == null || u == null) return;
	let d = l, f = u + r.bandwidth, p = r.yPrice(i.mother_high), m = r.yPrice(i.mother_low);
	for (let e of [p, m]) t.append("line").attr("class", "inside-day-mother").attr("x1", d).attr("y1", e).attr("x2", f).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let h = r.yPrice(Math.max(i.inside_high, i.inside_low)), g = r.yPrice(Math.min(i.inside_high, i.inside_low));
	t.append("rect").attr("class", "inside-day-box").attr("x", u).attr("y", h).attr("width", Math.max(0, r.bandwidth)).attr("height", Math.max(0, g - h)).attr("fill", "none").attr("stroke", o(a.boxStroke)).attr("stroke-opacity", a.boxStrokeOpacity).attr("stroke-width", a.boxStrokeWidth), na(n, {
		x: f + 6,
		y: p - ea(a.labelFontSize) / 2,
		text: "Inside day",
		style: a,
		rc: o,
		className: "inside-day-label"
	});
}
//#endregion
//#region src/patterns/renderers/pullbackToEma.ts
function va(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.ema_value)) return;
	let a = r.patternStyle.pullback_to_ema, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = ta(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.ema_value);
	t.append("line").attr("class", "pullback-ema-tick").attr("x1", c).attr("y1", u).attr("x2", c + r.bandwidth).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round"), ra(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	});
	let d = i.ema_level ? ` ${i.ema_level}` : "";
	na(n, {
		x: l + 6 + 4,
		y: u - ea(a.labelFontSize) / 2,
		text: `Pullback to${d}`,
		style: a,
		rc: o,
		className: "pullback-ema-label"
	});
}
//#endregion
//#region src/patterns/renderers/index.ts
var ya = {
	high_tight_flag: $i,
	base_breakout: Gi,
	consolidation: Yi,
	gap_up: aa,
	volume_breakout: sa,
	golden_cross: ca,
	nr7: ua,
	unusual_volume: fa,
	volume_dryup: ma,
	pocket_pivot: ga,
	inside_day: _a,
	pullback_to_ema: va
}, ba = (e) => `${e.pattern_name}:${e.detected_on}`;
function xa(e) {
	let t = O.select(e), n = t.append("g").attr("class", "chart-pattern-overlay-clip").attr("clip-path", "url(#chart-price-viewport)"), r = n.append("g").attr("class", "chart-pattern-overlay"), i = t.append("g").attr("class", "chart-pattern-overlay-labels-clip"), a = i.append("g").attr("class", "chart-pattern-overlay-labels"), o = null, s = [], c = null, l = 0, u = () => {
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
		let t = r.selectAll("g.chart-pattern-detection").data(e.detections, ba);
		t.exit().remove();
		let n = t.enter().append("g").attr("class", "chart-pattern-detection").style("pointer-events", "none").merge(t), i = a.selectAll("g.chart-pattern-label-detection").data(e.detections, ba);
		i.exit().remove();
		let o = i.enter().append("g").attr("class", "chart-pattern-label-detection").style("pointer-events", "none").merge(i);
		n.each(function(t, n) {
			let r = O.select(this), i = O.select(o.nodes()[n]);
			r.selectAll("*").remove(), i.selectAll("*").remove();
			let a = ya[t.pattern_name];
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
var Sa = {
	trendline: 2,
	ray: 2,
	ruler: 2,
	hline: 1,
	vline: 1,
	hray: 1,
	text: 1
};
function Ca(e) {
	return Sa[e];
}
function wa(e, t, n) {
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
function Ta(e, t, n) {
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
		if (t.length >= Ca(e.tool)) {
			let n = wa(e.tool, t, i());
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
		if (Ca(e) === 1) {
			let t = wa(e, [a], i());
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
function Ea(e, t) {
	if (t.dataLength === 0) return 0;
	let n = A(t.data, e);
	return n == null ? e < t.data[0].date ? (t.xScale(0) ?? 0) + t.bandwidth / 2 : (t.xScale(t.dataLength - 1) ?? 0) + t.bandwidth / 2 + Ie(t.data, e) * t.step : (t.xScale(n) ?? 0) + t.bandwidth / 2;
}
function Da(e, t) {
	let n = t.yPrice(e);
	return Number.isFinite(n) ? n : t.priceHeight;
}
function Oa(e, t) {
	if (t.dataLength === 0) return "";
	let n = t.xScale(0) ?? 0, r = Math.round((e - n - t.bandwidth / 2) / t.step);
	if (r < 0 && (r = 0), r <= t.dataLength - 1) return t.data[r].date;
	let i = Math.max(0, Math.ceil(t.width / t.step)), a = Math.min(r - (t.dataLength - 1), i);
	return Fe(t.data, a);
}
function ka(e, t) {
	return t.yPrice.invert(e);
}
function Aa(e, t) {
	return {
		x: Ea(e.date, t),
		y: Da(e.price, t)
	};
}
function ja(e, t, n, r) {
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
//#endregion
//#region src/drawings/rulerStats.ts
function Ma(e, t) {
	return A(e, t) ?? (e.length > 0 && t > e[e.length - 1].date ? e.length - 1 + Ie(e, t) : null);
}
var Na = 864e5;
function Pa(e, t, n) {
	let r = Ma(n, e.date), i = Ma(n, t.date), a = r != null && i != null ? Math.abs(i - r) : 0, o = t.price - e.price, s = e.price === 0 ? 0 : o / e.price * 100, c = o > 0 ? "up" : o < 0 ? "down" : "flat", l = e.date <= t.date ? e.date : t.date, u = e.date <= t.date ? t.date : e.date, d = Math.round((Date.parse(u) - Date.parse(l)) / Na), f = 0;
	if (r != null && i != null && n.length > 0) {
		let e = Math.max(0, Math.min(r, i)), t = Math.min(n.length - 1, Math.max(r, i));
		for (let r = e; r <= t; r++) f += n[r].volume;
	}
	return {
		bars: a,
		priceDelta: o,
		pricePct: s,
		startDate: l,
		endDate: u,
		direction: c,
		calendarDays: d,
		volume: f
	};
}
function Fa(e, t, n) {
	return t?.color === void 0 ? n(e.direction === "up" ? "var(--chart-positive)" : e.direction === "down" ? "var(--chart-negative)" : Vn.color) : n(t.color);
}
//#endregion
//#region src/drawings/renderers/_shared.ts
function Ia(e, t) {
	return e === 1 ? `${Math.max(4, t * 3)},${Math.max(3, t * 2)}` : e === 2 ? `${Math.max(1, t)},${Math.max(2, t * 2)}` : null;
}
function La(e) {
	return Hn(e.style);
}
function Ra(e, t, n, r, i) {
	e.append("circle").attr("cx", t).attr("cy", n).attr("r", 5).attr("fill", i).attr("stroke", r).attr("stroke-width", 1.5).style("pointer-events", "none");
}
function za(e, t) {
	let { x: n, tipY: r, dir: i, color: a, size: o } = t, s = o * .7, c = r - i * o;
	e.append("polygon").attr("points", `${n},${r} ${n - s},${c} ${n + s},${c}`).attr("fill", a).style("pointer-events", "none");
}
function Ba(e, t, n) {
	let r = Ia(t.style, t.width);
	e.attr("stroke", n(t.color)).attr("stroke-width", t.width).attr("stroke-opacity", t.opacity).attr("stroke-linecap", "round").style("pointer-events", "none"), r ? e.attr("stroke-dasharray", r) : e.attr("stroke-dasharray", null);
}
//#endregion
//#region src/drawings/renderers/trendline.ts
function Va(e, t, n) {
	let r = La(e), i = Aa(e.a, n.s), a = Aa(e.b, n.s);
	if (Ba(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a.x).attr("y2", a.y), r, n.resolveColor), n.selected) {
		let e = n.resolveColor(r.color), o = n.resolveColor("var(--chart-drawing-handle)");
		Ra(t.label, i.x, i.y, e, o), Ra(t.label, a.x, a.y, e, o);
	}
	return (e, t, n) => xn(e - n, t, i, a);
}
//#endregion
//#region src/drawings/renderers/ray.ts
function Ha(e, t, n) {
	let r = La(e), i = Aa(e.a, n.s), a = Aa(e.b, n.s), o = ja(i, a, n.s.width, n.s.priceHeight);
	if (Ba(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", o.x2).attr("y2", o.y2), r, n.resolveColor), n.selected) {
		let e = n.resolveColor(r.color), o = n.resolveColor("var(--chart-drawing-handle)");
		Ra(t.label, i.x, i.y, e, o), Ra(t.label, a.x, a.y, e, o);
	}
	return (e, t, n) => {
		let r = e - n, s = xn(r, t, i, a);
		return s && s.kind === "handle" ? s : bn(r, t, i.x, i.y, o.x2, o.y2) <= 6 ? { kind: "body" } : null;
	};
}
//#endregion
//#region src/drawings/renderers/hline.ts
function Ua(e, t, n) {
	let r = La(e), i = Da(e.price, n.s);
	if (i >= -2 && i <= n.s.priceHeight + 2) {
		let e = t.flat.append("line").attr("x1", 0).attr("y1", i).attr("x2", n.s.width).attr("y2", i);
		Ba(e, r, n.resolveColor), n.selected && e.attr("stroke-width", r.width + 1.5);
	}
	return (e, t) => Sn(e, t, i, n.s.width);
}
//#endregion
//#region src/drawings/renderers/vline.ts
function Wa(e, t, n) {
	let r = La(e), i = Ea(e.date, n.s), a = t.pan.append("line").attr("x1", i).attr("y1", 0).attr("x2", i).attr("y2", n.s.priceHeight);
	return Ba(a, r, n.resolveColor), n.selected && a.attr("stroke-width", r.width + 1.5), (e, t, r) => Cn(e - r, t, i, n.s.priceHeight);
}
//#endregion
//#region src/drawings/renderers/hray.ts
function Ga(e, t, n) {
	let r = La(e), i = Aa(e.a, n.s), a = i.x + Math.max(n.s.width * 3, (n.s.dataLength + 50) * n.s.step);
	return Ba(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a).attr("y2", i.y), r, n.resolveColor), n.selected && Ra(t.label, i.x, i.y, n.resolveColor(r.color), n.resolveColor("var(--chart-drawing-handle)")), (e, t, n) => Tn(e - n, t, i, {
		x: a,
		y: i.y
	});
}
//#endregion
//#region src/drawings/renderers/ruler.ts
function Ka(e, t, n, r, i) {
	let a = t + i;
	if (a + n <= r) return a;
	let o = e - i - n;
	return o >= 0 ? o : Math.max(0, Math.min(r - n, a));
}
function qa(e, t, n) {
	let r = La(e), i = Aa(e.a, n.s), a = Aa(e.b, n.s), o = n.resolveColor, s = Pa(e.a, e.b, n.s.data), c = Fa(s, e.style, o), l = Math.min(i.x, a.x), u = Math.max(i.x, a.x), d = Math.min(i.y, a.y), f = Math.max(i.y, a.y), p = u - l, m = f - d, h = (i.x + a.x) / 2;
	t.pan.append("rect").attr("x", l).attr("y", d).attr("width", p).attr("height", m).attr("fill", c).attr("fill-opacity", .28 * r.opacity).style("pointer-events", "none");
	let g = a.y - i.y;
	if (Math.abs(g) >= 8) {
		let e = g > 0 ? 1 : -1, n = a.y, s = t.pan.append("line").attr("x1", h).attr("y1", i.y).attr("x2", h).attr("y2", n - e * 8);
		Ba(s, r, o), s.attr("stroke", c), za(t.pan, {
			x: h,
			tipY: n,
			dir: e,
			color: c,
			size: 8
		});
	}
	let _ = s.priceDelta >= 0 ? "+" : "", v = `${_}${s.priceDelta.toFixed(2)}  (${_}${s.pricePct.toFixed(2)}%)`, y = `${s.bars} bars · ${s.calendarDays}d · ${ve(s.volume)}`, b = t.label.append("g").style("pointer-events", "none"), x = b.append("text").attr("dominant-baseline", "hanging").attr("text-anchor", "middle").style("font-size", "var(--text-3xs)").style("font-weight", "var(--font-weight-semibold)").attr("fill", o("var(--chart-drawing-label-text)")), S = x.append("tspan").attr("dy", 0).text(v), C = x.append("tspan").attr("dy", 12).text(y), w = (x.node()?.getBBox().width ?? Math.max(v.length, y.length) * 6) + 12, T = w / 2;
	x.attr("x", T).attr("y", 4), S.attr("x", T), C.attr("x", T);
	let E = Ka(d, f, 32, n.s.priceHeight, 6);
	if (b.attr("transform", `translate(${h - w / 2},${E})`), b.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", w).attr("height", 32).attr("rx", 3).attr("fill", c).attr("fill-opacity", .85), n.selected) {
		let e = o("var(--chart-drawing-handle)");
		Ra(t.label, i.x, i.y, c, e), Ra(t.label, a.x, a.y, c, e);
	}
	let D = {
		x: l,
		y: d,
		width: p,
		height: m
	};
	return (e, t, n) => {
		let r = xn(e - n, t, i, a);
		return r && r.kind === "handle" ? r : wn(e - n, t, D, 6);
	};
}
var Ja = (e) => e * 10;
function Ya(e, t, n) {
	let r = Math.round(t * 1.35), i = e.length > 0, a = i ? e.split("\n") : [""];
	return {
		lines: a,
		boxWidth: (i ? a.reduce((e, t) => Math.max(e, n(t)), 0) : Ja(t)) + 12,
		boxHeight: a.length * r + 8
	};
}
//#endregion
//#region src/drawings/renderers/text.ts
function Xa(e, t, n) {
	let r = La(e), i = n.resolveColor, a = Aa(e.a, n.s), o = Math.round(r.fontSize * 1.35), s = n.editingId != null && n.editingId === e.id, c = t.label.append("g").attr("transform", `translate(${a.x},${a.y})`).style("pointer-events", "none"), l = c.append("text").attr("x", 6).attr("y", 4).attr("dominant-baseline", "hanging").attr("xml:space", "preserve").attr("font-size", r.fontSize).style("font-family", "var(--font-family-base)").attr("fill", i(r.color)), u = l.node(), { lines: d, boxWidth: f, boxHeight: p } = Ya(r.text, r.fontSize, (e) => u ? (u.textContent = e, u.getComputedTextLength()) : e.length * r.fontSize * .6);
	u && (u.textContent = ""), d.forEach((e, t) => {
		l.append("tspan").attr("x", 6).attr("dy", t === 0 ? 0 : o).text(e.length === 0 ? "​" : e);
	}), s && l.style("visibility", "hidden"), c.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", f).attr("height", p).attr("rx", 3).attr("fill", i(r.bgColor)).attr("fill-opacity", s ? 0 : r.bgOpacity).attr("stroke", n.selected && !s ? i(r.color) : "none").attr("stroke-width", n.selected && !s ? 1 : 0), n.selected && !s && Ra(t.label, a.x, a.y, i(r.color), i("var(--chart-drawing-handle)"));
	let m = {
		x: a.x,
		y: a.y,
		width: f,
		height: p
	};
	return (e, t, n) => wn(e - n, t, m);
}
//#endregion
//#region src/drawings/renderers/index.ts
function Za(e, t, n) {
	switch (e.type) {
		case "trendline": return Va(e, t, n);
		case "ray": return Ha(e, t, n);
		case "hline": return Ua(e, t, n);
		case "vline": return Wa(e, t, n);
		case "hray": return Ga(e, t, n);
		case "ruler": return qa(e, t, n);
		case "text": return Xa(e, t, n);
		default: return () => null;
	}
}
//#endregion
//#region src/drawings/mountChartDrawingOverlay.ts
function Qa(e, t, n, r, i) {
	let a = Pa(t, n, r.data), o = Fa(a, void 0, i), s = a.priceDelta >= 0 ? "+" : "", c = `${s}${a.priceDelta.toFixed(2)}  (${s}${a.pricePct.toFixed(2)}%)`, l = Aa(n, r), u = e.append("g").attr("transform", `translate(${l.x + 12},${l.y - 12 - 8 - 6})`).style("pointer-events", "none"), d = u.append("text").attr("x", 6).attr("y", 4).attr("dominant-baseline", "hanging").style("font-size", "var(--text-3xs)").style("font-weight", "var(--font-weight-semibold)").attr("fill", i("var(--chart-drawing-label-text)")).text(c).node()?.getBBox().width ?? c.length * 6;
	u.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", d + 12).attr("height", 20).attr("rx", 3).attr("fill", o).attr("fill-opacity", .85);
}
function $a(e) {
	let t = O.select(e), n = t.append("g").attr("class", "chart-drawing-clip").attr("clip-path", "url(#chart-price-viewport)"), r = n.append("g").attr("class", "chart-drawing-pan"), i = t.append("g").attr("class", "chart-drawing-flat"), a = t.append("g").attr("class", "chart-drawing-labels"), o = a.append("g").attr("class", "chart-drawing-labels-pan"), s = null, c = 0, l = [], u = (e) => {
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
			let i = Za(r, n, {
				s: t,
				resolveColor: e.resolveColor,
				selected: r.id === e.selectedId,
				editingId: e.editingId
			});
			l.push({
				id: r.id,
				locked: r.locked === !0,
				hit: i
			});
		}
		if (e.draft.phase === "placing" && e.draftPointer) {
			let r = Ca(e.draft.tool), i = [...e.draft.anchors];
			for (; i.length < r;) i.push(e.draftPointer);
			Za(wa(e.draft.tool, i, "__draft__"), n, {
				s: t,
				resolveColor: e.resolveColor,
				selected: !1,
				editingId: e.editingId
			}), e.draft.anchors.length >= 1 && e.draft.tool !== "ruler" && Qa(o, e.draft.anchors[0], e.draftPointer, t, e.resolveColor);
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
var eo = {
	drawingPopup: "_drawingPopup_1do0c_3",
	drawingDeleteBtn: "_drawingDeleteBtn_1do0c_26"
}, to = {
	trendline: "Trend line",
	hline: "Horizontal line",
	vline: "Vertical line",
	hray: "Horizontal ray",
	ray: "Ray",
	text: "Text",
	ruler: "Ruler"
};
function no({ shape: e, onChange: t, onDelete: n, resolveColor: r, onClose: i, className: a, style: o }) {
	let c = s(null), f = Hn(e.style), p = e.type === "text";
	q(!0, i, [c]);
	let m = (n) => t({
		...e,
		style: {
			...e.style,
			...n
		}
	}), h = (n) => {
		let r = { ...e.style };
		delete r[n], t({
			...e,
			style: r
		});
	};
	return /* @__PURE__ */ d("div", {
		className: K(eo.drawingPopup, a),
		ref: c,
		style: o,
		"data-chart-wheel-scroll": !0,
		"data-chart-native-menu": !0,
		children: [/* @__PURE__ */ d("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ u("span", {
				className: j.legendPopoverTitle,
				children: to[e.type]
			}), /* @__PURE__ */ u("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: i,
				children: "×"
			})]
		}), /* @__PURE__ */ d("div", {
			className: j.panelScrollBody,
			children: [p ? /* @__PURE__ */ d(l, { children: [
				/* @__PURE__ */ u(ar, {
					label: "Text color",
					colorExpr: e.style?.color ?? f.color,
					isOverridden: e.style?.color !== void 0,
					resolveColor: r,
					onCommit: (e) => m({ color: e }),
					onReset: () => h("color")
				}),
				/* @__PURE__ */ u(nr, {
					spec: {
						key: "fontSize",
						label: "Font size",
						kind: "number",
						default: f.fontSize,
						min: 6,
						max: 48,
						step: 1
					},
					value: f.fontSize,
					onCommit: (e) => m({ fontSize: e })
				}),
				/* @__PURE__ */ u(ar, {
					label: "Background",
					colorExpr: e.style?.bgColor ?? f.bgColor,
					isOverridden: e.style?.bgColor !== void 0,
					resolveColor: r,
					onCommit: (e) => m({ bgColor: e }),
					onReset: () => h("bgColor")
				}),
				/* @__PURE__ */ u(or, {
					label: "Background opacity",
					value: f.bgOpacity,
					onCommit: (e) => m({ bgOpacity: e })
				})
			] }) : /* @__PURE__ */ d(l, { children: [
				/* @__PURE__ */ u(ar, {
					label: "Color",
					colorExpr: e.style?.color ?? f.color,
					isOverridden: e.style?.color !== void 0,
					resolveColor: r,
					onCommit: (e) => m({ color: e }),
					onReset: () => h("color")
				}),
				/* @__PURE__ */ u(nr, {
					spec: {
						key: "width",
						label: "Width",
						kind: "number",
						default: f.width,
						min: .5,
						max: 10,
						step: .1
					},
					value: f.width,
					onCommit: (e) => m({ width: e })
				}),
				/* @__PURE__ */ u(rr, {
					spec: {
						key: "style",
						label: "Style",
						kind: "enum",
						default: f.style,
						options: He
					},
					value: f.style,
					onChange: (e) => m({ style: e })
				}),
				/* @__PURE__ */ u(or, {
					label: "Opacity",
					value: f.opacity,
					onCommit: (e) => m({ opacity: e })
				})
			] }), /* @__PURE__ */ d("button", {
				type: "button",
				className: eo.drawingDeleteBtn,
				onClick: n,
				children: [/* @__PURE__ */ u(T, { size: 13 }), " Delete"]
			})]
		})]
	});
}
//#endregion
//#region src/drawings/TextEditorOverlay.tsx
var ro = 6, io = 4;
function ao({ shape: e, scaleApi: t, buildProjScale: r, marginLeft: o, marginTop: l, resolveColor: d, onCommit: f, onDeleteEmpty: p }) {
	let m = s(null), h = s(null), g = Hn(e.style), [_, v] = c(e.style?.text ?? ""), y = n(() => {
		let n = m.current;
		if (!n) return;
		let i = Aa(e.a, r());
		n.style.left = `${o + t.baseTranslateX + i.x}px`, n.style.top = `${l + i.y}px`;
	}, [
		e.a,
		t,
		r,
		o,
		l
	]), b = n(() => {
		let e = h.current;
		e && (e.style.height = "auto", e.style.height = `${e.scrollHeight}px`, e.style.width = "0px", e.style.width = `${Math.max(e.scrollWidth, Ja(g.fontSize) + 2 * ro)}px`);
	}, [g.fontSize]);
	a(() => {
		y(), b();
		let e = h.current;
		if (e) {
			e.focus();
			let t = e.value.length;
			e.setSelectionRange(t, t);
		}
	}, [e.id]), i(() => t.subscribe(() => y()), [t, y]);
	let x = s(!1), S = () => {
		x.current || (x.current = !0, _.trim() === "" ? p() : f(_));
	};
	return q(!0, S, [m]), /* @__PURE__ */ u("div", {
		ref: m,
		style: {
			position: "absolute",
			left: 0,
			top: 0,
			zIndex: 4
		},
		"data-chart-wheel-scroll": !0,
		"data-chart-native-menu": !0,
		"data-chart-texteditor": !0,
		children: /* @__PURE__ */ u("textarea", {
			ref: h,
			value: _,
			spellCheck: !1,
			autoComplete: "off",
			wrap: "off",
			onChange: (e) => {
				v(e.target.value), b();
			},
			onBlur: S,
			onKeyDown: (e) => {
				(e.key === "Enter" && !e.shiftKey || e.key === "Escape") && (e.preventDefault(), S());
			},
			style: {
				boxSizing: "border-box",
				padding: `${io}px ${ro}px`,
				resize: "none",
				overflow: "hidden",
				whiteSpace: "pre",
				border: `1px solid ${d(g.color)}`,
				borderRadius: 3,
				outline: "none",
				margin: 0,
				fontSize: g.fontSize,
				lineHeight: 1.35,
				fontFamily: "var(--font-family-base)",
				color: d(g.color),
				background: d(g.bgColor)
			}
		})
	});
}
//#endregion
//#region src/context.tsx
function oo() {
	let e = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Map(), n = {
		data: [],
		xScale: O.scaleBand(),
		yPrice: O.scaleLog(),
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
		maxVisibleBars: 0,
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
var so = t(null), co = so.Provider;
function lo() {
	let e = r(so);
	if (!e) throw Error("useChartScale must be used within a <Chart> (ChartScaleProvider)");
	return e;
}
var uo = t(null), fo = uo.Provider;
function po() {
	let e = r(uo);
	if (!e) throw Error("chart overlay hooks must be used within a <Chart> (ChartOverlayProvider)");
	return e;
}
function mo(e) {
	let t = po();
	return e === "trade" ? t.tradeHost : t.triggerHost;
}
function ho() {
	let e = po();
	return {
		priceBottomPx: e.priceBottomPx,
		marginRight: e.marginRight,
		marginTop: e.marginTop,
		marginBottom: e.marginBottom
	};
}
function go() {
	return po().reportOverlayPriceBounds;
}
function _o() {
	return po().subscribeBackgroundPointerDown;
}
//#endregion
//#region src/Chart.tsx
var $ = {
	top: 4,
	right: 60,
	bottom: 30,
	left: 0
}, vo = 72, yo = "var(--font-family-base)", bo = 18, xo = 8, So = .13, Co = .45, wo = 24, To = .08, Eo = 18, Do = 12, Oo = "currentColor", ko = 56, Ao = 10, jo = "var(--chart-tooltip-label)", Mo = O.format(",.0f"), No = 1.04, Po = 4, Fo = 700, Io = (e) => e.pointerType;
function Lo(e, t, n) {
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
function Ro(e, t, n, r) {
	let i = Aa(e, r);
	return {
		date: Oa(i.x + t, r),
		price: ka(i.y + n, r)
	};
}
function zo(e, t, n, r) {
	switch (e.type) {
		case "trendline":
		case "ray":
		case "ruler": return {
			...e,
			a: Ro(e.a, t, n, r),
			b: Ro(e.b, t, n, r)
		};
		case "hray":
		case "text": return {
			...e,
			a: Ro(e.a, t, n, r)
		};
		case "hline": return {
			...e,
			price: ka(Da(e.price, r) + n, r)
		};
		case "vline": return {
			...e,
			date: Oa(Ea(e.date, r) + t, r)
		};
		default: return e;
	}
}
var Bo = e.memo(({ data: e, warmupSeed: t, benchmarkClose: r, quarterlyResults: p, subpaneHeights: m = null, onSubpaneHeightsChange: h, visibleBars: g, onVisibleBarsChange: _, onMaxVisibleBarsChange: y, onRangeMarksChange: b, panOffset: S, onPanOffsetChange: w, chartType: T, indicators: E, onIndicatorsChange: D, autoFitMode: k, onAutoFitModeChange: ee, autoFitExcluded: te, onAutoFitExcludedChange: ne, infoBarExpanded: re, onInfoBarExpandedChange: ie, symbol: ae, bare: oe, width: se, height: ce, priceFormatter: le, patterns: ue, patternsEnabled: ye, visiblePatterns: be, statsTable: xe, statsEnabled: Se, statsMarket: Ce = "India", statsPosition: we = null, onStatsPositionChange: Te, statsSize: Ee = "small", earningsEnabled: De, earningsResults: Oe, earningsFreeFloatPercent: Ae, earningsPosition: je = null, onEarningsPositionChange: A, appearance: Ne, onAppearanceChange: Pe, drawings: Fe, onDrawingsChange: Ie, activeDrawingTool: Le = "cursor", onActiveDrawingToolChange: Re, drawToolbarEnabled: M = !1, drawToolbarPosition: N = null, onDrawToolbarPositionChange: ze, onContextMenu: P, children: Be }) => {
	let F = s(null), Ve = s(null), He = s(null), Ue = s(null), I = s(null), We = s({
		cssWidth: 0,
		cssHeight: 0,
		suggested: null
	}), L = s(null), [Ge, Ke] = c(0), [qe, Je] = c(0), R = se ?? Ge;
	a(() => {
		let e = Ve.current;
		if (!e) return;
		let t = e.getBoundingClientRect();
		t.width && Ke(t.width), t.height && Je(t.height);
	}, []);
	let Ye = e?.length ?? 0, z = o(() => Rn(Ne), [Ne]), Xe = o(() => JSON.stringify(z.colors), [z]), Ze = o(() => JSON.stringify(z.background), [z]), Qe = o(() => JSON.stringify(z.candle), [z]), $e = o(() => JSON.stringify(z.axis), [z]), et = o(() => JSON.stringify(z.crosshair), [z]), nt = o(() => JSON.stringify(z.patterns), [z]), [rt, it] = c(0), [at, ot] = c(!1), st = s(null), [ct, lt] = c(null), ut = n((e) => {
		ot(!1), lt(e);
	}, []), dt = n(() => lt(null), []), ft = s(ut);
	ft.current = ut;
	let pt = s(!1);
	pt.current = Pe != null;
	let mt = s(null);
	mt.current ||= oo();
	let B = mt.current.api, ht = mt.current.notify, gt = le ?? Mo, _t = s(gt);
	i(() => {
		_t.current = gt;
	}, [gt]);
	let vt = o(() => Ye > 0 ? O.range(Ye) : [], [Ye]), yt = o(() => {
		let e = /* @__PURE__ */ new Set();
		for (let t of E) {
			if (!t.enabled) continue;
			let n = G(t.defKey)?.pane;
			n && typeof n == "object" && "subpane" in n && e.add(n.subpane);
		}
		let t = vn.filter((t) => e.has(t)), n = [...e].filter((e) => !vn.includes(e));
		return t.concat(n);
	}, [E]), [bt, xt] = c(m);
	i(() => {
		xt(m);
	}, [m]);
	let St = o(() => {
		let e = {};
		for (let t of E) {
			if (!t.enabled) continue;
			let n = G(t.defKey), r = n?.pane;
			if (!r || typeof r != "object" || !("subpane" in r)) continue;
			let i = n?.paneHeightFactor ?? 1;
			e[r.subpane] = Math.max(e[r.subpane] ?? 1, i);
		}
		return e;
	}, [E]), Ct = o(() => de(e ?? []), [e]), wt = o(() => fe(e ?? [], e?.length ?? 0), [e]), Tt = o(() => pe(R), [R]), V = Math.max(10, Math.min(g, Tt)), H = o(() => {
		let t = _i({
			propWidth: se,
			propHeight: ce,
			measuredWidth: Ge,
			measuredHeight: qe,
			margin: $,
			rightBuffer: Eo
		});
		if (!e || e.length === 0 || !t.draw) return t.tooSmall, null;
		let n = t.totalHeight, r = he(S, e.length, V), i = Math.max(0, Math.floor(e.length - V - r)), a = Math.min(e.length, Math.ceil(e.length - r)), o = e.slice(i, a);
		if (o.length === 0) return null;
		let s = Math.ceil(V), c = Math.max(0, i - s), l = Math.min(e.length, a + s), u = e.slice(c, l), { priceHeight: d, subpanes: f, fullHeight: p } = si({
			totalHeight: n,
			subpaneKeys: yt,
			heightRatio: So,
			floorRatio: Co,
			heightFactors: St,
			userHeights: bt ?? void 0
		}), m = t.width, h = (m - Eo) / V, g = (r + V - e.length) * h, _ = O.scaleBand().domain(vt).range([0, h * Math.max(1, e.length - .3)]).paddingInner(.3).paddingOuter(0);
		return {
			totalHeight: n,
			visStart: i,
			visEnd: a,
			visibleSlice: o,
			renderStart: c,
			renderEnd: l,
			renderSlice: u,
			priceHeight: d,
			fullHeight: p,
			subpanes: f,
			width: m,
			step: h,
			baseTranslateX: g,
			xScale: _,
			bandwidth: _.bandwidth(),
			visibleBarsInt: Math.floor(V),
			visibleStartIdx: Math.round(e.length - V - r),
			effectiveOffset: r
		};
	}, [
		e,
		V,
		S,
		se,
		ce,
		Ge,
		qe,
		vt,
		yt,
		St,
		bt
	]), U = o(() => {
		if (!e || e.length === 0) return [];
		let n = E.filter((e) => e.enabled);
		if (n.length === 0) return [];
		let i = t && t.length ? t : [], a = i.length ? i.concat(e) : e, o = {
			...jr(a),
			bars: a
		};
		if (r) {
			let e = new Float64Array(a.length);
			for (let t = 0; t < a.length; t++) e[t] = r[a[t].date] ?? NaN;
			o.benchmarkClose = e;
		}
		p && (o.quarterlyResults = p), o.market = Ce;
		let s = i.length;
		return o.displayStart = s, n.map((e) => {
			let t = G(e.defKey);
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
		E,
		r,
		p,
		Ce
	]), Et = o(() => !e || e.length === 0 ? null : Rr(t && t.length ? t.concat(e) : e, xe, Ce, Ct), [
		e,
		t,
		xe,
		Ce,
		Ct
	]), Dt = o(() => oi(Oe, Ae), [Oe, Ae]), Ot = s(null), kt = s([]), At = n(() => {
		let e = Ue.current, t = I.current, n = We.current;
		if (!e || !t || !n.suggested) return;
		let { width: r, height: i } = n.suggested;
		n.suggested = null, e.width !== r && (e.width = r), e.height !== i && (e.height = i), t.hRatio = n.cssWidth > 0 ? r / n.cssWidth : 1, t.vRatio = n.cssHeight > 0 ? i / n.cssHeight : 1;
	}, []), jt = n(() => {
		let e = I.current, t = Ot.current;
		!e || !t || (At(), kt.current = Ti(e.ctx, {
			hRatio: e.hRatio,
			vRatio: e.vRatio,
			cssWidth: t.cssWidth,
			cssHeight: t.cssHeight,
			marginLeft: $.left,
			marginTop: $.top,
			marginBottom: $.bottom,
			rightBuffer: Eo,
			width: t.width,
			fullHeight: t.fullHeight,
			priceHeight: t.priceHeight,
			bandwidth: t.bandwidth,
			step: B.step,
			baseTranslateX: B.baseTranslateX,
			renderStart: t.renderStart,
			renderEnd: t.renderEnd,
			renderSlice: t.renderSlice,
			chartType: t.chartType,
			xScale: B.xScale,
			yPrice: B.yPrice,
			subpaneScales: B.subpaneScales,
			data: t.data,
			colors: t.colors,
			background: t.background,
			candle: t.candle,
			indicators: t.indicators.map((e) => ({
				config: e.config,
				series: e.series,
				meta: e.meta
			})),
			resolveColor: (e, t) => L.current?.resolve(e, t) ?? "#888888"
		}));
	}, [B, At]), Mt = o(() => H ? $.top + H.priceHeight : 0, [H]), Nt = s(null), Pt = n((e) => (t) => {
		H && (t.button !== 0 || t.ctrlKey || (t.preventDefault(), t.stopPropagation(), t.currentTarget.setPointerCapture(t.pointerId), Nt.current = {
			index: e,
			startY: t.clientY,
			bands: H.subpanes,
			priceHeight: H.priceHeight,
			totalHeight: H.totalHeight,
			prev: bt,
			latest: null
		}));
	}, [H, bt]), Ft = n((e) => {
		let t = Nt.current;
		if (!t) return;
		let n = ci({
			bands: t.bands,
			priceHeight: t.priceHeight,
			totalHeight: t.totalHeight,
			dividerIndex: t.index,
			dy: e.clientY - t.startY,
			minPanePx: wo,
			floorRatio: Co
		});
		t.latest = n, xt(n);
	}, []), It = n((e) => {
		let t = Nt.current;
		t && (e.currentTarget.releasePointerCapture?.(e.pointerId), Nt.current = null, t.latest && h?.(t.latest));
	}, [h]), Lt = n((e) => {
		let t = Nt.current;
		t && (e.currentTarget.releasePointerCapture?.(e.pointerId), Nt.current = null, xt(t.prev));
	}, []), [Rt, zt] = c(null), Bt = s(Rt);
	i(() => {
		Bt.current = Rt;
	}, [Rt]);
	let Vt = Rt === null, [Ht, Ut] = c(!1), [Wt, Gt] = c(!1), [Kt, qt] = c(!1), Jt = s(null), Yt = Ht || Wt || Kt, W = s({ kind: "idle" }), Xt = s(/* @__PURE__ */ new Map()), Zt = () => W.current.kind !== "idle" || J.current.phase !== "idle", Qt = s(w);
	i(() => {
		Qt.current = w;
	}, [w]);
	let $t = s(S);
	i(() => {
		$t.current = S;
	}, [S]);
	let en = s(Tt);
	en.current = Tt;
	let tn = s(_);
	i(() => {
		tn.current = _;
	}, [_]);
	let nn = s(y);
	i(() => {
		nn.current = y;
	}, [y]);
	let rn = s(b);
	i(() => {
		rn.current = b;
	}, [b]);
	let an = s(null), on = s(0), sn = s(0), cn = s(null), ln = s(0), un = () => W.current.kind === "pan" && W.current.phase === "dragging", dn = s(null), fn = s(null), pn = s(null), mn = s(null), hn = s(null), gn = s(null), _n = s(null), yn = s(null), bn = s(null), xn = s(null), Sn = s(null), Cn = s(null), wn = s(null), Tn = s(null), En = s(null), Dn = s([]), On = s(null), kn = s(null), An = s(null), Mn = s(null), Nn = s(null), Pn = s(null), Fn = s(null), In = s(null), Ln = s(null), zn = s(0), Vn = s(null), Hn = s(null), K = s(null), Un = s(null), Wn = s(/* @__PURE__ */ new Set()), Gn = n((e) => (Wn.current.add(e), () => {
		Wn.current.delete(e);
	}), []), Kn = s(null), qn = s(null), Jn = s(null), Yn = s(null), q = s(Le);
	i(() => {
		q.current = Le;
	}, [Le]);
	let J = s({ phase: "idle" }), Xn = s(null), Zn = s(null), [Qn, $n] = c(null), Y = n((e) => {
		Zn.current = e, $n(e);
	}, []), [er, tr] = c(null), nr = s(null);
	nr.current = er;
	let rr = s(null), ir = s(Ie);
	i(() => {
		ir.current = Ie;
	}, [Ie]);
	let ar = s(Re);
	i(() => {
		ar.current = Re;
	}, [Re]);
	let or = s(P);
	i(() => {
		or.current = P;
	}, [P]);
	let sr = s({
		fullHeight: 0,
		bands: []
	}), cr = o(() => (Fe ?? []).map(Bn).filter((e) => e !== null), [Fe]), lr = s(cr);
	lr.current = cr;
	let ur = o(() => ke(we), [we]), dr = o(() => {
		let e = ke(je);
		return e && "v" in e ? e : null;
	}, [je]), fr = o(() => {
		let e = ke(N);
		return e && "v" in e ? e : null;
	}, [N]), pr = n(() => ({
		xScale: B.xScale,
		yPrice: B.yPrice,
		step: B.step,
		bandwidth: B.bandwidth,
		dataLength: B.data.length,
		width: B.width,
		priceHeight: B.priceHeight,
		data: B.data
	}), [B]), hr = n((e, t) => {
		let n = pr();
		return {
			date: Oa(e - B.baseTranslateX, n),
			price: ka(t, n)
		};
	}, [pr, B]), gr = n(() => {
		let e = Yn.current;
		!e || B.data.length === 0 || e.update({
			drawings: rr.current ?? lr.current,
			draft: J.current,
			draftPointer: Xn.current,
			selectedId: Zn.current,
			editingId: nr.current,
			xScale: B.xScale,
			yPrice: B.yPrice,
			step: B.step,
			bandwidth: B.bandwidth,
			dataLength: B.data.length,
			width: B.width,
			priceHeight: B.priceHeight,
			data: B.data,
			baseTranslateX: B.baseTranslateX,
			marginTop: $.top,
			resolveColor: (e, t) => L.current?.resolve(e, t) ?? "#888888"
		});
	}, [B]), br = n((e) => {
		let t = lr.current, n = t.findIndex((t) => t.id === e.id) === -1 ? [...t, e] : t.map((t) => t.id === e.id ? e : t);
		ir.current?.(n);
	}, []), wr = () => typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}-${Math.round(Math.random() * 1e9)}`, Tr = s(0), X = n((e, t) => {
		let n = hr(e, t), r = Ta(J.current, {
			type: "down",
			anchor: n
		}, {
			tool: q.current,
			makeId: wr
		});
		J.current = r.draft, r.selectId !== void 0 && Y(r.selectId), r.commit && (Xn.current = null, Tr.current = performance.now(), br(r.commit), r.commit.type === "text" && tr(r.commit.id), q.current !== "cursor" && (q.current = "cursor", ar.current?.("cursor"))), gr();
	}, [
		hr,
		Y,
		br,
		gr
	]), Z = n((e, t, n, r) => {
		let i = lr.current.find((t) => t.id === e.id);
		if (!i) return;
		let a = hr(t, n), o = Ta(J.current, {
			type: "down",
			anchor: a,
			target: {
				id: e.id,
				hit: e.hit,
				shape: i
			}
		}, {
			tool: "cursor",
			makeId: wr
		});
		J.current = o.draft, o.selectId !== void 0 && Y(o.selectId), o.draft.phase === "dragging" && i.locked !== !0 && (W.current = {
			kind: "drawingDrag",
			phase: "armed",
			pointerId: r,
			id: i.id,
			grab: o.draft.grab,
			startMx: t,
			startMy: n,
			origin: i
		}, rr.current = lr.current.slice(), F.current && (F.current.style.cursor = "grabbing")), gr();
	}, [
		hr,
		Y,
		gr
	]), Dr = o(() => ct?.kind === "drawing" ? cr.find((e) => e.id === ct.id) ?? null : null, [ct, cr]), Or = o(() => ct?.kind === "indicator" ? E.find((e) => e.id === ct.id) ?? null : null, [ct, E]), Ar = o(() => {
		if (!er) return null;
		let e = cr.find((e) => e.id === er);
		return e && e.type === "text" ? e : null;
	}, [er, cr]), Mr = n((e) => {
		let t = lr.current.find((e) => e.id === nr.current);
		t && t.type === "text" && br({
			...t,
			style: {
				...t.style,
				text: e
			}
		}), tr(null);
	}, [br]), Nr = n(() => {
		let e = nr.current;
		e && (ir.current?.(lr.current.filter((t) => t.id !== e)), Zn.current === e && Y(null)), tr(null);
	}, [Y]);
	i(() => {
		let e = () => Y(null), t = Kr.current;
		return t.add(e), () => {
			t.delete(e);
		};
	}, [Y]), i(() => {
		let e = (e) => {
			if (e.key === "Escape") {
				(J.current.phase !== "idle" || W.current.kind === "drawingDrag" || Xn.current) && (J.current = Ta(J.current, { type: "escape" }, {
					tool: q.current,
					makeId: wr
				}).draft, Xn.current = null, W.current.kind === "drawingDrag" && (W.current = { kind: "idle" }), rr.current = null, gr());
				return;
			}
			if ((e.key === "Delete" || e.key === "Backspace") && Zn.current) {
				let t = e.target;
				if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
				let n = Zn.current;
				ir.current?.(lr.current.filter((e) => e.id !== n)), Y(null);
			}
		};
		return document.addEventListener("keydown", e), () => document.removeEventListener("keydown", e);
	}, [Y, gr]);
	let [Pr, Fr] = c(null), [Ir, Lr] = c(null), [Q, zr] = c(null), [Br, Vr] = c(null), Hr = n((e, t) => {
		(e === "trade" ? zr : Vr)((e) => e === t || e && t && e.min === t.min && e.max === t.max ? e : t);
	}, []), Wr = o(() => {
		let e = [], t = [];
		return Q && !te.includes("trade") && (e.push(Q.min), t.push(Q.max)), Br && !te.includes("trigger") && (e.push(Br.min), t.push(Br.max)), e.length === 0 ? null : {
			min: Math.min(...e),
			max: Math.max(...t)
		};
	}, [
		Q,
		Br,
		te
	]), Gr = o(() => {
		let e = [], t = /* @__PURE__ */ new Set();
		for (let { config: n } of U) {
			let r = G(n.defKey);
			!r || typeof r.pane == "object" || t.has(n.defKey) || (t.add(n.defKey), e.push({
				key: n.defKey,
				label: r.longLabel ?? r.label
			}));
		}
		return Q != null && e.push({
			key: "trade",
			label: "Trade overlays"
		}), Br != null && e.push({
			key: "trigger",
			label: "Trigger overlays"
		}), e;
	}, [
		U,
		Q,
		Br
	]), Kr = s(/* @__PURE__ */ new Set()), qr = n((e) => {
		let t = Kr.current;
		return t.add(e), () => {
			t.delete(e);
		};
	}, []), Jr = o(() => ({
		tradeHost: Pr,
		triggerHost: Ir,
		priceBottomPx: Mt,
		marginRight: $.right,
		marginTop: $.top,
		marginBottom: $.bottom,
		reportOverlayPriceBounds: Hr,
		subscribeBackgroundPointerDown: qr
	}), [
		Pr,
		Ir,
		Mt,
		Hr,
		qr
	]);
	i(() => {
		let e = Ve.current;
		if (!e) return;
		let t = 0, n = new ResizeObserver((e) => {
			let n = e[0]?.contentRect;
			n && (t && cancelAnimationFrame(t), t = requestAnimationFrame(() => {
				n.width && Ke(n.width), n.height && Je(n.height);
			}));
		});
		return n.observe(e), () => {
			t && cancelAnimationFrame(t), n.disconnect();
		};
	}, []);
	let Yr = H?.priceHeight ?? null;
	i(() => {
		if (Yr == null) return;
		let e = document.documentElement;
		return e.style.setProperty("--chart-price-height", `${Yr}px`), () => {
			e.style.removeProperty("--chart-price-height");
		};
	}, [Yr]), i(() => {
		let e = F.current;
		if (!e) return;
		let t = z.colors, n = Object.keys(t);
		for (let r of n) e.style.setProperty(`--${r}`, t[r]);
		let r = tt(e);
		return L.current?.destroy(), L.current = r, it((e) => e + 1), () => {
			for (let t of n) e.style.removeProperty(`--${t}`);
			r.destroy(), L.current = null;
		};
	}, [Xe]);
	let Xr = H?.totalHeight ?? null;
	i(() => {
		let e = Ue.current;
		if (!e || Xr == null || R === 0) return;
		let t = R, n = Xr + $.top + $.bottom;
		e.style.width = `${t}px`, e.style.height = `${n}px`;
		let r = e.getContext("2d");
		if (!r) return;
		(!I.current || I.current.ctx !== r) && (I.current = {
			ctx: r,
			hRatio: 1,
			vRatio: 1
		});
		function i(e) {
			let r = Ue.current;
			if (!r) return;
			let i = e?.devicePixelContentBoxSize?.[0], a, o;
			if (i) a = i.inlineSize, o = i.blockSize;
			else {
				let e = window.devicePixelRatio || 1, t = r.getBoundingClientRect();
				a = Math.round(t.left * e + t.width * e) - Math.round(t.left * e), o = Math.round(t.top * e + t.height * e) - Math.round(t.top * e);
			}
			We.current = {
				cssWidth: t,
				cssHeight: n,
				suggested: {
					width: Math.max(1, a),
					height: Math.max(1, o)
				}
			}, jt();
		}
		let a = new ResizeObserver((e) => i(e[0]));
		try {
			a.observe(e, { box: "device-pixel-content-box" });
		} catch {
			a.observe(e);
		}
		i();
		let o = null, s = () => {
			i(), c();
		};
		function c() {
			o && o.removeEventListener("change", s), o = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`), o.addEventListener("change", s);
		}
		return c(), () => {
			a.disconnect(), o && o.removeEventListener("change", s);
		};
	}, [
		R,
		Xr,
		jt
	]);
	let Zr = s(1), Qr = s(null), $r = n((e) => {
		tn.current && (Zr.current *= e, Qr.current ??= requestAnimationFrame(() => {
			Qr.current = null;
			let e = Zr.current;
			Zr.current = 1, tn.current?.((t) => Math.min(en.current, Math.max(10, t * e)));
		}));
	}, []);
	i(() => {
		let e = F.current;
		if (!e || !_) return;
		function t(e) {
			e.target?.closest?.("[data-chart-wheel-scroll]") || (e.preventDefault(), $r(e.deltaY > 0 ? No : 1 / No));
		}
		return e.addEventListener("wheel", t, { passive: !1 }), () => {
			e.removeEventListener("wheel", t);
		};
	}, [_, $r]), i(() => {
		let e = Ve.current;
		if (!e) return;
		let t = (e) => {
			if (!or.current || e.target?.closest?.("[data-chart-native-menu],[data-chart-legend],[data-chart-stats],[data-chart-earnings],[data-chart-drawtoolbar]")) return;
			if (Zt()) {
				e.preventDefault();
				return;
			}
			e.preventDefault();
			let t = fn.current, [n, r] = t ? O.pointer(e, t.node()) : [0, 0], i = ui({
				mx: n,
				my: r,
				width: B.width,
				priceHeight: B.priceHeight,
				fullHeight: sr.current.fullHeight,
				bands: sr.current.bands,
				dividerHalfPx: Po
			}), a = null, o = null, s = null, c = null;
			if (i.kind === "price" || i.kind === "subpane") {
				let e = Math.floor(n / B.step), t = B.visibleStartIdx + e;
				e >= 0 && t >= 0 && t < B.data.length && (a = t, o = Me(B.data, t));
			}
			if (i.kind === "price") s = B.yPrice.invert(r);
			else if (i.kind === "subpane") {
				let e = B.subpaneScales.get(i.key);
				e && (c = e.invert(r));
			}
			or.current({
				clientX: e.clientX,
				clientY: e.clientY,
				barIndex: a,
				date: o,
				price: s,
				value: c,
				pane: i
			});
		};
		return e.addEventListener("contextmenu", t), () => e.removeEventListener("contextmenu", t);
	}, [B, e]), i(() => {
		let t = e?.length ?? 0;
		t !== 0 && Qt.current((e) => he(e, t, g));
	}, [e?.length, g]), i(() => {
		R === 0 || !_ || (g > Tt || g < 10) && tn.current?.((e) => Math.min(Tt, Math.max(10, e)));
	}, [
		Tt,
		g,
		R,
		_
	]), i(() => {
		R === 0 || !y || nn.current?.(Tt);
	}, [
		Tt,
		R,
		y
	]), i(() => {
		b && rn.current?.(wt);
	}, [wt, b]);
	let [ei, ti] = c(ae);
	ei !== ae && (ti(ae), Rt !== null && zt(null));
	let ni = n((e) => {
		if (!(e < 0)) for (let t of [In.current, Ln.current]) try {
			t?.node()?.releasePointerCapture?.(e);
		} catch {}
	}, []), ri = n((e, t, n) => {
		let r = Bt.current, i = r !== null, a = 0, o = 0, s = 1, c = 0;
		return i && r && (a = Math.log(r[0]), o = Math.log(r[1]), s = B.priceHeight / (o - a), c = (o - a) * 3), {
			kind: "pan",
			phase: "armed",
			pointerId: e,
			startX: t,
			startOffset: he($t.current, B.data.length, B.visibleBars),
			baseTx: B.baseTranslateX,
			step: B.step,
			...me(B.data.length, B.visibleBars),
			startY: n,
			panY: i,
			startLoLog: a,
			startHiLog: o,
			pxPerLog: s,
			panCapLog: c
		};
	}, [B]), ii = n(() => {
		let e = W.current;
		if (e.kind !== "pan") return;
		ni(e.pointerId);
		let t = e.phase === "dragging";
		W.current = { kind: "idle" }, an.current != null && (cancelAnimationFrame(an.current), an.current = null), on.current = 0, sn.current = 0, F.current && (F.current.style.cursor = ""), t && (dn.current && dn.current.setAttribute("transform", `translate(${e.baseTx},0)`), B.baseTranslateX = e.baseTx, ht("pan"), qn.current?.setTransform(e.baseTx), Yn.current?.setTransform(e.baseTx), e.panY && zt([Math.exp(e.startLoLog), Math.exp(e.startHiLog)]), jt());
	}, [
		B,
		ht,
		jt,
		ni
	]);
	i(() => {
		let e = () => {
			let e = W.current;
			if (e.kind !== "pan") return;
			if (e.phase === "armed") {
				W.current = { kind: "idle" };
				return;
			}
			F.current && (F.current.style.cursor = ""), an.current != null && (cancelAnimationFrame(an.current), an.current = null), W.current = { kind: "idle" };
			let t = Math.round(on.current / e.step), n = Math.max(e.minOffset, Math.min(e.maxOffset, e.startOffset + t));
			on.current = 0, n === e.startOffset ? dn.current && (dn.current.setAttribute("transform", `translate(${e.baseTx},0)`), B.baseTranslateX = e.baseTx, ht("pan"), qn.current?.setTransform(e.baseTx), Yn.current?.setTransform(e.baseTx), jt()) : Qt.current(n);
		}, t = (e) => {
			let t = W.current;
			if (t.kind !== "pan") return;
			if (t.phase === "armed") {
				if (Math.hypot(e.clientX - t.startX, e.clientY - t.startY) < pi(Io(e))) return;
				t.phase = "dragging", K.current != null && (cancelAnimationFrame(K.current), K.current = null), Un.current = null, An.current?.(), F.current && (F.current.style.cursor = "grabbing");
			}
			let n = e.clientX - t.startX, r = ge(n, t.startOffset, t.minOffset, t.maxOffset, t.step);
			r !== n && (t.startX += n - r), on.current = r, t.panY && (sn.current = e.clientY - t.startY), an.current ??= requestAnimationFrame(() => {
				an.current = null;
				let e = t.baseTx + on.current;
				if (dn.current && dn.current.setAttribute("transform", `translate(${e},0)`), B.baseTranslateX = e, ht("pan"), qn.current?.setTransform(e), Yn.current?.setTransform(e), jt(), t.panY) {
					let e = sn.current / t.pxPerLog;
					e = Math.max(-t.panCapLog, Math.min(t.panCapLog, e)), zt([Math.exp(t.startLoLog + e), Math.exp(t.startHiLog + e)]);
				}
			});
		}, n = (e) => {
			let t = fn.current;
			if (!t) return;
			let n = W.current;
			if (n.kind !== "drawingDrag") return;
			let [r, i] = O.pointer(e, t.node());
			if (n.phase === "armed") {
				if (Math.hypot(r - n.startMx, i - n.startMy) < pi(Io(e))) return;
				n.phase = "dragging";
			}
			let a = pr(), o = n.grab && n.grab.kind === "handle" ? Lo(n.origin, n.grab.index, hr(r, i)) : zo(n.origin, r - n.startMx, i - n.startMy, a);
			rr.current = lr.current.map((e) => e.id === n.id ? o : e), gr();
		}, r = (e) => {
			let t = fn.current;
			if (!t || J.current.phase !== "placing") return;
			let [n, r] = O.pointer(e, t.node());
			Xn.current = hr(n, r), gr();
		}, i = () => {
			let e = W.current;
			if (e.kind !== "drawingDrag") return;
			let t = e.phase === "dragging";
			W.current = { kind: "idle" };
			let n = rr.current?.find((t) => t.id === e.id) ?? null, r = Ta(J.current, {
				type: "up",
				working: n
			}, {
				tool: "cursor",
				makeId: wr
			});
			J.current = r.draft, rr.current = null, F.current && (F.current.style.cursor = ""), t && r.commit && br(r.commit), gr();
		}, a = () => {
			W.current.kind === "drawingDrag" && (W.current = { kind: "idle" }, J.current = Ta(J.current, { type: "escape" }, {
				tool: "cursor",
				makeId: wr
			}).draft, rr.current = null, F.current && (F.current.style.cursor = ""), gr());
		}, o = () => {
			cn.current = null;
			let e = W.current;
			if (e.kind !== "yAxis") return;
			let t = Math.exp(-ln.current / 200), n = (e.startLoLog + e.startHiLog) / 2, r = Math.max(.002, Math.min(4, (e.startHiLog - e.startLoLog) / 2 / t));
			zt([Math.exp(n - r), Math.exp(n + r)]);
		}, s = (e) => {
			let t = W.current;
			t.kind === "yAxis" && (ln.current = e.clientY - t.startY, cn.current ??= requestAnimationFrame(o));
		}, c = () => {
			W.current.kind === "yAxis" && (W.current = { kind: "idle" }, F.current && (F.current.style.cursor = ""), cn.current != null && (cancelAnimationFrame(cn.current), cn.current = null));
		}, l = () => {
			let e = W.current;
			e.kind === "yAxis" && (W.current = { kind: "idle" }, F.current && (F.current.style.cursor = ""), cn.current != null && (cancelAnimationFrame(cn.current), cn.current = null), zt(e.priceViewAtStart));
		}, u = () => {
			if (Xt.current.size === 1) {
				let [e, t] = [...Xt.current.entries()][0];
				on.current = 0, sn.current = 0, W.current = ri(e, t.x, t.y);
			} else Xt.current.size === 0 && (W.current = { kind: "idle" });
		}, d = (e) => {
			let i = W.current;
			if (i.kind === "pinch") {
				let t = gi(Xt.current, {
					type: "move",
					pointerId: e.pointerId,
					x: e.clientX,
					y: e.clientY
				});
				t.zoomRatio && t.zoomRatio > 0 && $r(1 / t.zoomRatio);
				return;
			}
			if (i.kind === "idle") {
				r(e);
				return;
			}
			e.pointerId === i.pointerId && (i.kind === "pan" ? t(e) : i.kind === "drawingDrag" ? n(e) : i.kind === "yAxis" && s(e));
		}, f = (t) => {
			ni(t.pointerId), gi(Xt.current, {
				type: "up",
				pointerId: t.pointerId,
				x: t.clientX,
				y: t.clientY
			});
			let n = W.current;
			if (n.kind === "pinch") {
				u();
				return;
			}
			n.kind !== "idle" && t.pointerId === n.pointerId && (n.kind === "pan" ? e() : n.kind === "drawingDrag" ? i() : n.kind === "yAxis" && c());
		}, p = (e) => {
			ni(e.pointerId), gi(Xt.current, {
				type: "cancel",
				pointerId: e.pointerId,
				x: e.clientX,
				y: e.clientY
			});
			let t = W.current;
			if (t.kind === "pinch") {
				u();
				return;
			}
			t.kind !== "idle" && e.pointerId === t.pointerId && (t.kind === "pan" ? ii() : t.kind === "drawingDrag" ? a() : t.kind === "yAxis" && l());
		};
		return document.addEventListener("pointermove", d), document.addEventListener("pointerup", f), document.addEventListener("pointercancel", p), () => {
			document.removeEventListener("pointermove", d), document.removeEventListener("pointerup", f), document.removeEventListener("pointercancel", p), an.current != null && (cancelAnimationFrame(an.current), an.current = null), cn.current != null && (cancelAnimationFrame(cn.current), cn.current = null);
		};
	}, [
		B,
		ht,
		jt,
		pr,
		hr,
		gr,
		br,
		$r,
		ii,
		ri,
		ni
	]), i(() => {
		let e = (e) => {
			e.key === "Escape" && ii();
		}, t = () => ii(), n = () => {
			document.visibilityState === "hidden" && ii();
		};
		return window.addEventListener("keydown", e), window.addEventListener("blur", t), document.addEventListener("visibilitychange", n), () => {
			window.removeEventListener("keydown", e), window.removeEventListener("blur", t), document.removeEventListener("visibilitychange", n);
		};
	}, [ii]), i(() => {
		if (!He.current) return;
		let e = O.select(He.current);
		e.selectAll("*").remove();
		let t = e.append("g").attr("transform", `translate(${$.left},${$.top})`);
		fn.current = t;
		let n = t.append("defs");
		mn.current = n.append("clipPath").attr("id", "chart-viewport").append("rect").attr("x", 0).attr("y", -$.top), Vn.current = n.append("clipPath").attr("id", "chart-price-viewport").append("rect").attr("x", 0).attr("y", -$.top);
		let r = L.current?.resolve(z.background.topColor) ?? "#888888", i = L.current?.resolve(z.background.bottomColor) ?? "#888888", a = n.append("linearGradient").attr("id", "chart-bg-gradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
		a.append("stop").attr("offset", "0%").attr("stop-color", i), a.append("stop").attr("offset", "100%").attr("stop-color", r);
		let o = n.append("linearGradient").attr("id", "chart-bg-gradient-user").attr("gradientUnits", "userSpaceOnUse");
		o.append("stop").attr("offset", "0%").attr("stop-color", r), o.append("stop").attr("offset", "100%").attr("stop-color", i), Hn.current = o, pn.current = t.append("rect").attr("x", -$.left).attr("y", -$.top).attr("rx", 12).attr("ry", 12).attr("fill", "transparent"), hn.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", yo).style("font-weight", "500").style("color", "var(--chart-axis-label)"), gn.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", yo).style("font-weight", "500").style("color", "var(--chart-axis-label)").style("display", "none"), _n.current = t.append("g").style("display", "none"), yn.current = t.append("g"), bn.current = t.append("line").attr("y1", -$.top).attr("data-chart-role", "y-axis-border").attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), xn.current = t.append("line").attr("x1", 0).attr("data-chart-role", "x-axis-baseline").attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), Kn.current = t.append("g").attr("class", "chart-pattern-overlays-container").node(), qn.current = xa(Kn.current);
		let s = t.append("g").attr("clip-path", "url(#chart-viewport)").append("g");
		Sn.current = s, dn.current = s.node(), Cn.current = s.append("g").style("font-size", "var(--text-2hxs)").style("font-family", yo).style("font-weight", "500").style("color", "var(--chart-axis-label)"), wn.current = t.append("line").attr("stroke", z.crosshair.color).attr("stroke-opacity", z.crosshair.opacity).attr("stroke-dasharray", z.crosshair.dash).attr("y1", 0).style("visibility", "hidden"), Tn.current = t.append("line").attr("stroke", z.crosshair.color).attr("stroke-opacity", z.crosshair.opacity).attr("stroke-dasharray", z.crosshair.dash).attr("x1", 0).style("visibility", "hidden");
		let c = t.append("text").attr("x", 8).attr("y", 14).style("font-size", "var(--text-sm)").style("font-family", yo).style("font-weight", "500").attr("fill", "currentColor").style("visibility", "hidden");
		En.current = c, Dn.current = [];
		for (let e = 0; e < Do; e++) Dn.current.push(c.append("tspan"));
		let l = t.append("g").style("visibility", "hidden");
		Mn.current = l, l.append("rect").attr("width", 56).attr("height", 18).attr("rx", 3).attr("fill", "var(--bg-card)").attr("stroke", "currentColor").attr("stroke-opacity", .2), Nn.current = l.append("text").attr("x", 28).attr("y", 13).attr("text-anchor", "middle").style("font-size", "var(--text-3xs)").style("font-family", yo).style("font-weight", "500").attr("fill", "currentColor");
		let u = t.append("g").style("visibility", "hidden");
		Pn.current = u, u.append("rect").attr("width", vo).attr("height", 18).attr("rx", 3).attr("fill", "var(--bg-card)").attr("stroke", "currentColor").attr("stroke-opacity", .2), Fn.current = u.append("text").attr("x", vo / 2).attr("y", 13).attr("text-anchor", "middle").style("font-size", "var(--text-3xs)").style("font-family", yo).style("font-weight", "500").attr("fill", "currentColor"), In.current = t.append("rect").attr("fill", "transparent"), Ln.current = t.append("rect").attr("fill", "transparent").style("cursor", "ns-resize").style("pointer-events", "all"), Jn.current = t.append("g").attr("class", "chart-drawing-overlays-container").node(), Yn.current = $a(Jn.current);
		let d = t.append("g").attr("class", "trigger-overlays-container").node(), f = t.append("g").attr("class", "trade-overlays-container").node();
		return Lr(d), Fr(f), () => {
			K.current != null && (cancelAnimationFrame(K.current), K.current = null), Un.current = null, e.selectAll("*").remove(), fn.current = null, pn.current = null, mn.current = null, hn.current = null, gn.current = null, _n.current = null, yn.current = null, bn.current = null, xn.current = null, Sn.current = null, dn.current = null, Cn.current = null, wn.current = null, Tn.current = null, En.current = null, Dn.current = [], Mn.current = null, Nn.current = null, Pn.current = null, Fn.current = null, In.current = null, Ln.current = null, Vn.current = null, Hn.current = null, Lr(null), Fr(null), qn.current?.destroy(), qn.current = null, Kn.current = null, Yn.current?.destroy(), Yn.current = null, Jn.current = null;
		};
	}, []), i(() => {
		if (!e || !H || !He.current || !fn.current || !Sn.current) return;
		let { renderStart: t, renderEnd: n, priceHeight: r, fullHeight: i, subpanes: a, width: o, step: s, baseTranslateX: c, xScale: l, totalHeight: u } = H, d = u + $.top + $.bottom;
		O.select(He.current).attr("width", R).attr("height", d), pn.current.attr("width", R).attr("height", i + $.top + $.bottom);
		let f = i + $.top + $.bottom, p = L.current?.resolve(z.background.topColor) ?? "#888888", m = L.current?.resolve(z.background.bottomColor) ?? "#888888";
		Hn.current.attr("x1", 0).attr("y1", -$.top).attr("x2", 0).attr("y2", -$.top + f), Hn.current.selectAll("stop").attr("stop-color", function() {
			return this.getAttribute("offset") === "0%" ? p : m;
		}), mn.current.attr("width", o - Eo).attr("height", i + $.top + $.bottom), Vn.current.attr("width", o - Eo).attr("height", $.top + r);
		let h = wi({
			dateAt: (t) => e[t].date,
			from: t,
			to: n,
			step: s,
			minGapPx: ko
		}), g = h.map((e) => e.index), _ = new Map(h.map((e) => [e.index, e.label]));
		hn.current.attr("transform", `translate(${o},0)`);
		let v = [];
		for (let e of a) v.push(e.top);
		a.length > 0 && v.push(i), yn.current.selectAll("line").data(v).join("line").attr("x1", 0).attr("x2", o).attr("y1", (e) => e).attr("y2", (e) => e).attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), bn.current.attr("x1", o).attr("x2", o).attr("y2", i), xn.current.attr("x1", 0).attr("x2", o).attr("y1", i).attr("y2", i), Sn.current.attr("transform", `translate(${c},0)`), Cn.current.attr("transform", `translate(0,${i})`).call(O.axisBottom(l).tickValues(g).tickSize(z.axis.tickSize).tickFormat((e) => _.get(e) ?? "")), Cn.current.select(".domain").remove(), Cn.current.selectAll("line").attr("stroke", Oo).attr("stroke-opacity", z.axis.opacity), wn.current.attr("y2", i), Tn.current.attr("x2", o), In.current.attr("width", o).attr("height", i), zn.current = r, Ln.current.attr("x", o).attr("y", 0).attr("width", $.right).attr("height", i);
	}, [
		H,
		R,
		e,
		yt,
		$e,
		Ze
	]), i(() => {
		if (!e || !H || !hn.current) return;
		let { visibleSlice: t, visStart: n, visEnd: r, renderSlice: i, renderStart: a, renderEnd: o, priceHeight: s, fullHeight: c, subpanes: l, totalHeight: u, width: d, xScale: f, bandwidth: p, step: m, baseTranslateX: h, visibleBarsInt: g, visibleStartIdx: _ } = H, v, y;
		if (Rt) [v, y] = Rt;
		else {
			let e = O.min(t, (e) => e.low) ?? 0, i = O.max(t, (e) => e.high) ?? 1;
			if (k === "priceAndOverlays") {
				for (let { config: t, series: a } of U) {
					let o = G(t.defKey);
					if (!o || typeof o.pane == "object" || te.includes(t.defKey)) continue;
					let s = o.autofitKeys?.(t.settings) ?? Object.keys(a);
					for (let t of s) {
						let o = a[t];
						if (o) for (let t = n; t < r && t < o.length; t++) {
							let n = o[t];
							!Number.isNaN(n) && n > 0 && (n < e && (e = n), n > i && (i = n));
						}
					}
				}
				Wr && (e = Math.min(e, Wr.min), i = Math.max(i, Wr.max));
			}
			let a = Math.log(e), o = Math.log(i), c = (a + o) / 2, l = (o - a) / 2, u = c - l, d = c + l, f = d - u;
			if (f <= 0) v = Math.exp(u) * .99, y = Math.exp(d) * 1.01;
			else {
				let e = s - bo, t = f / Math.max(1, e - 2 * xo);
				v = Math.exp(u - xo * t), y = Math.exp(d + xo * t);
			}
		}
		let b = O.scaleLog().domain([Math.max(1, v), y]).range([s, bo]), [x, S] = b.domain(), C = Math.log(x), w = Math.log(S), E = (e, t) => {
			if (e <= 0) return e;
			let n = 10 ** (Math.floor(Math.log10(e)) - (t - 1));
			return Math.round(e / n) * n;
		}, D = Array.from(new Set(O.range(Ao).map((e) => {
			let t = Math.exp(C + e / (Ao - 1) * (w - C));
			return E(t, t >= 100 ? 3 : 2);
		}))).sort((e, t) => e - t).slice(0, -1), ee = O.format(",.1f");
		hn.current.call(O.axisRight(b).tickValues(D).tickSize(z.axis.tickSize).tickFormat((e) => ee(Number(e)))), hn.current.select(".domain").remove(), hn.current.selectAll("line").attr("stroke", Oo).attr("stroke-opacity", z.axis.opacity);
		let ne = /* @__PURE__ */ new Map(), re = /* @__PURE__ */ new Map(), ie = /* @__PURE__ */ new Map();
		for (let e of U) {
			let t = G(e.config.defKey), n = t?.pane;
			if (!n || typeof n != "object" || !("subpane" in n)) continue;
			re.has(n.subpane) || re.set(n.subpane, t?.domain?.(e.series, e.config.settings) ?? void 0);
			let r = ie.get(n.subpane) ?? [];
			r.push(e), ie.set(n.subpane, r);
		}
		for (let e of l) {
			let t = re.get(e.key), i = [];
			for (let t of ie.get(e.key) ?? []) {
				let e = G(t.config.defKey)?.autofitKeys?.(t.config.settings) ?? [];
				for (let n of e) {
					let e = t.series[n];
					e && i.push({
						values: e,
						isMarker: !1
					});
				}
			}
			let a = li({
				hint: t,
				lines: i,
				visStart: n,
				visEnd: r,
				defaultPad: To
			});
			if (a) {
				let [n, r] = a, i = t?.topPadPx ?? 0, o = e.bottom - e.top;
				i > 0 && o > i && r > n && (r = n + (r - n) * (o / (o - i))), ne.set(e.key, O.scaleLinear().domain([n, r]).range([e.bottom, e.top]));
			}
		}
		if (gn.current.selectAll("*").remove(), _n.current.selectAll("*").remove(), ne.size > 0) {
			gn.current.style("display", null), _n.current.style("display", null);
			let e = O.format(".2~f");
			for (let t of l) {
				let n = ne.get(t.key);
				if (!n) continue;
				let r = re.get(t.key);
				if (!r?.hideAxis) {
					let t = r?.tickFormat ?? e, i = gn.current.append("g").attr("transform", `translate(${d},0)`);
					i.call(O.axisRight(n).ticks(3).tickSize(z.axis.tickSize).tickFormat((e) => t(Number(e)))), i.select(".domain").remove(), i.selectAll("line").attr("stroke", Oo).attr("stroke-opacity", z.axis.opacity);
				}
				let i = [...r?.guideLines ?? []];
				r?.zeroLine && i.push(0);
				for (let e of i) _n.current.append("line").attr("x1", 0).attr("x2", d).attr("y1", n(e)).attr("y2", n(e)).attr("stroke", "var(--subpane-guide)").attr("stroke-opacity", .4).attr("stroke-dasharray", "3,3");
			}
		} else gn.current.style("display", "none"), _n.current.style("display", "none");
		let ae = un() ? B.baseTranslateX : h;
		B.data = e, B.subpaneScales = ne, B.xScale = f, B.yPrice = b, B.step = m, B.bandwidth = p, B.visibleBars = V, B.visibleBarsInt = g, B.visibleStartIdx = _, B.maxVisibleBars = Tt, B.priceHeight = s, B.width = d, B.baseTranslateX = ae, B.dataLength = e.length, B.indicators = U, sr.current = {
			fullHeight: c,
			bands: l
		}, ht("rescale"), qn.current?.updateScales({
			xScale: f,
			yPrice: b,
			step: m,
			bandwidth: p,
			baseTranslateX: ae,
			width: d,
			priceHeight: s,
			dataLength: e.length
		}), Yn.current?.updateScales({
			xScale: f,
			yPrice: b,
			step: m,
			bandwidth: p,
			dataLength: e.length,
			width: d,
			priceHeight: s,
			data: e,
			baseTranslateX: ae
		});
		let oe = (e) => L.current?.resolve(e) ?? "#888888";
		Ot.current = {
			cssWidth: R,
			cssHeight: u + $.top + $.bottom,
			width: d,
			fullHeight: c,
			priceHeight: s,
			bandwidth: p,
			renderStart: a,
			renderEnd: o,
			renderSlice: i,
			chartType: T,
			data: e,
			colors: {
				positive: oe("var(--candle-up)"),
				negative: oe("var(--candle-down)")
			},
			background: {
				topColor: oe(z.background.topColor),
				bottomColor: oe(z.background.bottomColor),
				radius: z.background.radius
			},
			candle: z.candle,
			indicators: U
		}, jt(), Un.current ? kn.current?.() : On.current?.();
	}, [
		H,
		U,
		Rt,
		T,
		e,
		V,
		k,
		te,
		Wr,
		R,
		jt,
		B,
		ht,
		rt,
		Ze,
		Qe,
		$e
	]), i(() => {
		if (Ye === 0 || !dn.current || R === 0) return;
		let e = he(S, Ye, V), t = (R - $.left - $.right - Eo) / V, n = (e + V - Ye) * t;
		dn.current.setAttribute("transform", `translate(${n},0)`), B.baseTranslateX = n, ht("pan"), qn.current?.setTransform(n), Yn.current?.setTransform(n), jt();
	}, [
		S,
		V,
		Ye,
		R,
		B,
		ht,
		jt
	]);
	let ai = o(() => {
		if (ye === !1) return [];
		let e = ue ?? [];
		if (!be) return e;
		let t = new Set(be);
		return e.filter((e) => t.has(e.pattern_name));
	}, [
		ue,
		ye,
		be ? [...be].sort().join(",") : "*"
	]);
	return i(() => {
		let e = qn.current;
		!e || B.data.length === 0 || e.update({
			detections: ai,
			bars: B.data,
			xScale: B.xScale,
			yPrice: B.yPrice,
			step: B.step,
			bandwidth: B.bandwidth,
			priceHeight: B.priceHeight,
			width: B.width,
			baseTranslateX: B.baseTranslateX,
			dataLength: B.data.length,
			marginTop: $.top,
			patternStyle: z.patterns,
			resolveColor: (e, t) => L.current?.resolve(e, t) ?? "#888888"
		});
	}, [
		ai,
		H,
		B,
		nt,
		rt
	]), i(() => {
		gr();
	}, [
		cr,
		Qn,
		er,
		H,
		B,
		rt,
		gr
	]), i(() => {
		let e = wn.current, t = Tn.current;
		if (!(!e || !t)) for (let n of [e, t]) n.attr("stroke", z.crosshair.color).attr("stroke-opacity", z.crosshair.opacity).attr("stroke-dasharray", z.crosshair.dash);
	}, [et]), i(() => {
		let e = In.current;
		if (!e) return;
		let t = (e) => {
			for (let t of Wn.current) t(e);
		}, n = (e) => {
			let t = B.data;
			if (t.length === 0) {
				En.current?.style("visibility", "hidden");
				return;
			}
			let n = e < 0 || e >= t.length ? t.length - 1 : e, r = t[n], i = n > 0 ? t[n - 1].close : r.open, a = r.close - i, o = (a / i * 100).toFixed(2), s = a >= 0 ? "+" : "", c = a >= 0 ? "var(--chart-positive)" : "var(--chart-negative)", l = [
				{
					text: `${r.date}  `,
					fill: c
				},
				{
					text: "O: ",
					fill: jo
				},
				{
					text: `${_e(r.open)}  `,
					fill: c
				},
				{
					text: "H: ",
					fill: jo
				},
				{
					text: `${_e(r.high)}  `,
					fill: c
				},
				{
					text: "L: ",
					fill: jo
				},
				{
					text: `${_e(r.low)}  `,
					fill: c
				},
				{
					text: "C: ",
					fill: jo
				},
				{
					text: `${_e(r.close)}  `,
					fill: c
				},
				{
					text: `${s}${o}%  `,
					fill: c
				},
				{
					text: "Vol: ",
					fill: jo
				},
				{
					text: ve(r.volume),
					fill: c
				}
			], u = Dn.current;
			for (let e = 0; e < u.length; e++) u[e].text(l[e].text).attr("fill", l[e].fill);
			En.current.style("visibility", "visible");
		}, r = () => n(B.data.length - 1);
		On.current = r;
		let i = () => {
			wn.current?.style("visibility", "hidden"), Tn.current?.style("visibility", "hidden"), r(), t(null), Mn.current?.style("visibility", "hidden"), Pn.current?.style("visibility", "hidden"), qn.current?.setPointer(null, null);
		};
		An.current = i;
		let a = () => {
			K.current = null;
			let e = Un.current;
			if (!e || B.data.length === 0) return;
			let { mx: i, my: a } = e;
			qn.current?.setPointer(i, a);
			let { data: o, yPrice: s, step: c, bandwidth: l, visibleBarsInt: u, visibleStartIdx: d, priceHeight: f, width: p } = B;
			Tn.current.attr("y1", a).attr("y2", a).style("visibility", "visible");
			let m = Math.floor(i / c), h = m >= 0 && m < u, g = h ? d + m : -1, _ = g >= 0 && g < o.length, v = h ? m * c + l / 2 : i;
			if (wn.current.attr("x1", v).attr("x2", v).style("visibility", "visible"), _ ? (n(g), t(g)) : (r(), t(null)), a <= f && i <= p) {
				Mn.current.attr("transform", `translate(${p + 2},${a - 9})`).style("visibility", "visible"), Nn.current.text(_t.current(s.invert(a)));
				let e = _ ? o[g].date : Oa(i - B.baseTranslateX, pr()), t = Math.max(0, Math.min(p - vo, v - vo / 2)), n = sr.current.fullHeight + 4;
				Pn.current.attr("transform", `translate(${t},${n})`).style("visibility", "visible"), Fn.current.text(Ci(e));
			} else Mn.current.style("visibility", "hidden"), Pn.current.style("visibility", "hidden");
		};
		kn.current = a, e.on("pointerdown", function(e) {
			if (e.button !== 0 || e.ctrlKey || (e.preventDefault(), B.data.length === 0)) return;
			this.setPointerCapture?.(e.pointerId);
			let t = gi(Xt.current, {
				type: "down",
				pointerId: e.pointerId,
				x: e.clientX,
				y: e.clientY
			}), n = W.current.kind;
			if (t.mode === "pinch" && (n === "pan" || n === "idle" || n === "pinch")) {
				n === "pan" && ii(), W.current = {
					kind: "pinch",
					pointers: Xt.current,
					prevDist: hi(Xt.current)
				}, An.current?.();
				return;
			}
			if (!e.isPrimary) return;
			let r = fn.current, [i, a] = r ? O.pointer(e, r.node()) : [0, 0];
			if (q.current !== "cursor") {
				X(i, a);
				return;
			}
			let o = Yn.current?.hitTest(i, a) ?? null;
			if (o) {
				Z(o, i, a, e.pointerId);
				return;
			}
			for (let e of Kr.current) e();
			W.current = ri(e.pointerId, e.clientX, e.clientY), on.current = 0, sn.current = 0;
		});
		let o = Ln.current;
		o?.on("pointerdown", function(e) {
			if (e.button !== 0 || e.ctrlKey || O.pointer(e, this)[1] > zn.current) return;
			e.preventDefault(), e.stopPropagation(), this.setPointerCapture?.(e.pointerId);
			let t = Bt.current ?? B.yPrice.domain();
			W.current = {
				kind: "yAxis",
				pointerId: e.pointerId,
				startY: e.clientY,
				startLoLog: Math.log(t[0]),
				startHiLog: Math.log(t[1]),
				priceViewAtStart: Bt.current
			}, F.current && (F.current.style.cursor = "ns-resize");
		}), o?.on("dblclick", function(e) {
			O.pointer(e, this)[1] > zn.current || (e.preventDefault(), e.stopPropagation(), zt(null));
		}), o?.on("mouseenter", function() {
			Ut(!0);
		}), o?.on("mouseleave", function() {
			Ut(!1);
		}), o?.on("pointermove", function(e) {
			this.style.cursor = O.pointer(e, this)[1] <= zn.current ? "ns-resize" : "";
		});
		let s = (e, t) => {
			if (B.data.length === 0) return null;
			let n = Yn.current?.hitTest(e, t) ?? null;
			if (n) return {
				kind: "drawing",
				id: n.id
			};
			let { step: r, bandwidth: i, visibleBarsInt: a, visibleStartIdx: o, xScale: s } = B, c = Math.floor(e / r);
			if (c < 0 || c >= a) return null;
			let l = o + c;
			if (l < 0 || l >= B.data.length) return null;
			let u = jn(e - B.baseTranslateX, t, l, kt.current, (e) => s(e) + i / 2, r);
			return u ? u.sourceId === "__candles__" ? pt.current ? { kind: "candles" } : null : {
				kind: "indicator",
				id: u.sourceId
			} : null;
		};
		e.on("dblclick", function(e) {
			if (e.preventDefault(), performance.now() - Tr.current < Fo) {
				Tr.current = 0;
				return;
			}
			let t = fn.current, [n, r] = t ? O.pointer(e, t.node()) : [0, 0], i = s(n, r);
			i && ft.current(i), i?.kind === "drawing" && lr.current.find((e) => e.id === i.id)?.type === "text" && tr(i.id);
		});
		let c = O.select(He.current);
		return c.on("pointermove.crosshair", function(e) {
			if (un()) return;
			let t = F.current;
			if (W.current.kind === "drawingDrag") return;
			let n = fn.current;
			if (!n) return;
			let [r, i] = O.pointer(e, n.node());
			if (q.current !== "cursor" || J.current.phase !== "idle") t && (t.style.cursor = "crosshair");
			else if (t) {
				let e = s(r, i);
				t.style.cursor = e ? e.kind === "drawing" ? "grab" : "pointer" : "";
			}
			Un.current = {
				mx: r,
				my: i
			}, K.current ??= requestAnimationFrame(a);
		}).on("pointerleave.crosshair", function(e) {
			if (un()) return;
			W.current.kind !== "drawingDrag" && F.current && (F.current.style.cursor = ""), K.current != null && (cancelAnimationFrame(K.current), K.current = null);
			let t = e.relatedTarget;
			if (t && typeof t.closest == "function" && (t.closest("[data-chart-legend]") || t.closest("[data-chart-stats]") || t.closest("[data-chart-earnings]") || t.closest("[data-chart-drawtoolbar]") || t.closest("[data-chart-texteditor]"))) {
				wn.current?.style("visibility", "hidden"), Tn.current?.style("visibility", "hidden"), Mn.current?.style("visibility", "hidden"), Pn.current?.style("visibility", "hidden");
				return;
			}
			Un.current = null, i();
		}), Un.current || r(), () => {
			e.on("pointerdown", null).on("dblclick", null), Ln.current?.on("pointerdown", null).on("dblclick", null).on("mouseenter", null).on("mouseleave", null).on("pointermove", null), c.on("pointermove.crosshair", null).on("pointerleave.crosshair", null), K.current != null && (cancelAnimationFrame(K.current), K.current = null);
		};
	}, [
		B,
		X,
		Z,
		pr
	]), !e || e.length === 0 ? /* @__PURE__ */ u("div", {
		className: oe ? j.chartWrapperBare : j.chartWrapper,
		ref: F,
		children: /* @__PURE__ */ u("div", {
			className: j.empty,
			children: ae ? /* @__PURE__ */ d(l, { children: [/* @__PURE__ */ u(f, {
				size: 32,
				className: j.emptyIcon
			}), "No data available"] }) : /* @__PURE__ */ d(l, { children: [/* @__PURE__ */ u(v, {
				size: 32,
				className: j.emptyIcon
			}), "Select a stock to view chart"] })
		})
	}) : /* @__PURE__ */ u(co, {
		value: B,
		children: /* @__PURE__ */ u(fo, {
			value: Jr,
			children: /* @__PURE__ */ u("div", {
				className: oe ? j.chartWrapperBare : j.chartWrapper,
				ref: F,
				children: /* @__PURE__ */ d("div", {
					ref: Ve,
					className: oe ? j.chartFrameBare : j.chartFrame,
					"data-trade-overlay-anchor": "",
					children: [
						/* @__PURE__ */ u("canvas", {
							ref: Ue,
							className: j.seriesCanvas,
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ u("svg", {
							ref: He,
							className: j.chartSvg
						}),
						H != null && /* @__PURE__ */ u(xr, {
							indicators: E,
							onIndicatorsChange: D,
							resolved: U,
							subpanes: H.subpanes,
							marginTop: $.top,
							marginLeft: $.left,
							infoBarHeight: bo,
							barCount: Ye,
							expanded: re,
							onExpandedChange: ie,
							subscribeHoverIndex: Gn,
							priceFormatter: gt,
							resolveColor: (e) => L.current?.resolve(e) ?? "#888888"
						}),
						H != null && H.subpanes.map((e, t) => {
							let n = $.top + e.top;
							return /* @__PURE__ */ u("div", {
								className: j.subpaneDivider,
								style: {
									top: n - 8 / 2,
									height: 8
								},
								onPointerDown: Pt(t),
								onPointerMove: Ft,
								onPointerUp: It,
								onPointerCancel: Lt,
								children: /* @__PURE__ */ u("span", { className: j.subpaneDividerLine })
							}, e.key);
						}),
						H != null && Se !== !1 && Et && Ye > 0 && /* @__PURE__ */ u(kr, {
							model: Et,
							size: Ee,
							pane: {
								left: $.left,
								top: $.top,
								width: H.width,
								height: H.priceHeight
							},
							position: ur,
							onPositionChange: Te
						}),
						H != null && De && Dt && Ye > 0 && /* @__PURE__ */ u(Ur, {
							model: Dt,
							size: Ee,
							pane: {
								left: $.left,
								top: $.top,
								width: H.width,
								height: H.priceHeight
							},
							position: dr,
							onPositionChange: A
						}),
						H != null && M && Re && /* @__PURE__ */ u(Er, {
							activeTool: Le,
							onToolChange: Re,
							drawingCount: Fe?.length ?? 0,
							onDeleteAll: Ie ? () => Ie([]) : void 0,
							pane: {
								left: $.left,
								top: $.top,
								width: H.width,
								height: H.priceHeight
							},
							position: fr,
							onPositionChange: ze
						}),
						Mt > 0 && /* @__PURE__ */ u("button", {
							type: "button",
							"data-chart-native-menu": "",
							className: `${j.resetPanBtn} ${S === 0 ? j.resetPanBtnInactive : ""}`,
							title: "Reset pan",
							onClick: () => w(0),
							disabled: S === 0,
							style: {
								bottom: $.bottom + 2,
								right: $.right + 2
							},
							children: /* @__PURE__ */ u(x, { size: 14 })
						}),
						Mt > 0 && Yt && /* @__PURE__ */ u("button", {
							type: "button",
							ref: Jt,
							"data-chart-native-menu": "",
							className: `${j.autoFitBtn} ${Vt ? j.autoFitBtnActive : ""}`,
							title: Vt ? k === "priceAndOverlays" ? "Auto-fit: price + overlays (click for price-only)" : "Auto-fit: price-only (click to include overlays)" : "Auto-fit price scale (off — drag y-axis to enable)",
							onClick: () => {
								if (qt(!1), !Vt) {
									zt(null);
									return;
								}
								ee(k === "priceAndOverlays" ? "price" : "priceAndOverlays");
							},
							onContextMenu: (e) => {
								e.preventDefault(), k === "priceAndOverlays" && Vt && qt((e) => !e);
							},
							onMouseEnter: () => Gt(!0),
							onMouseLeave: () => Gt(!1),
							style: {
								bottom: $.bottom + 2,
								right: $.right - 26,
								color: Vt && k === "priceAndOverlays" ? "#22c55e" : void 0
							},
							children: "A"
						}),
						Kt && k === "priceAndOverlays" && Vt && /* @__PURE__ */ u(Cr, {
							contributors: Gr,
							excluded: te,
							onExcludedChange: ne,
							triggerRef: Jt,
							onClose: () => qt(!1),
							style: {
								bottom: $.bottom + 28,
								right: $.right - 26
							}
						}),
						Pe && /* @__PURE__ */ d(l, { children: [/* @__PURE__ */ u("button", {
							type: "button",
							ref: st,
							"data-chart-native-menu": "",
							className: j.settingsGearBtn,
							title: "Chart settings",
							onClick: () => {
								lt(null), ot((e) => !e);
							},
							style: {
								right: 4,
								bottom: 4
							},
							children: /* @__PURE__ */ u(C, { size: 14 })
						}), at && /* @__PURE__ */ u(mr, {
							appearance: Ne ?? {},
							onAppearanceChange: Pe,
							resolveColor: (e) => L.current?.resolve(e) ?? "#888888",
							triggerRef: st,
							onClose: () => ot(!1),
							style: {
								right: $.right + 4,
								bottom: $.bottom + 4
							}
						})] }),
						ct?.kind === "candles" && Pe && /* @__PURE__ */ u(Sr, {
							appearance: Ne ?? {},
							onAppearanceChange: Pe,
							resolveColor: (e) => L.current?.resolve(e) ?? "#888888",
							onClose: dt,
							className: j.centeredPanel
						}),
						Or && (() => {
							let e = G(Or.defKey);
							return !e || (e.settingsSchema?.length ?? 0) === 0 ? null : /* @__PURE__ */ u(yr, {
								config: Or,
								def: e,
								onCommit: (e, t) => D(_r(E, Or.id, e, t)),
								onReset: (e) => D(vr(E, Or.id, [e])),
								onResetKeys: (e) => e.length > 0 && D(vr(E, Or.id, e)),
								resolveColor: (e) => L.current?.resolve(e) ?? "#888888",
								onClose: dt,
								className: j.centeredPanel
							});
						})(),
						Ie && Dr && /* @__PURE__ */ u(no, {
							shape: Dr,
							onChange: (e) => br(e),
							onDelete: () => {
								Ie(cr.filter((e) => e.id !== Dr.id)), Y(null), dt();
							},
							resolveColor: (e) => L.current?.resolve(e) ?? "#888888",
							onClose: dt,
							className: j.centeredPanel
						}),
						Ie && Ar && /* @__PURE__ */ u(ao, {
							shape: Ar,
							scaleApi: B,
							buildProjScale: pr,
							marginLeft: $.left,
							marginTop: $.top,
							resolveColor: (e) => L.current?.resolve(e) ?? "#888888",
							onCommit: Mr,
							onDeleteEmpty: Nr
						}, Ar.id),
						Be
					]
				})
			})
		})
	});
}), Vo = j.resetPanBtn;
//#endregion
export { Fn as APPEARANCE_DEFAULTS, En as CANDLE_SOURCE, Bo as Chart, $n as ChartControls, ue as DEFAULT_BARS_PER_YEAR, re as DEFAULT_RANGE_MARKS, Vn as DRAWING_DEFAULTS, On as FILLED_HIT_PAD, He as LINE_STYLE_OPTIONS, ie as MIN_BAR_STEP_PX, ne as MIN_MARK_BARS, ae as MIN_VISIBLE_BARS, _n as OVERLAY_ORDER, Se as PATTERN_CATALOG, Ce as PATTERN_NAMES, k as RANGES, ee as RANGE_DAYS, te as RANGE_YEARS, Dn as REGION_HIT_TOLERANCE, vn as SUBPANE_ORDER, mr as SettingsDialog, gr as ZoomSlider, A as barIndexForDate, Le as barIndexForDateProjected, de as barsPerYear, Ht as computeAdx, Vt as computeAtr, Bt as computeDx, Je as computeEMA, Ye as computeExpandingMax, R as computeRollingHigh, xe as computeVolumeStats, Ue as dashFor, Me as dateForBarIndex, Re as dateForBarIndexProjected, mn as defaultConfigFor, At as dema, Rn as effectiveAppearance, Hn as effectiveDrawingStyle, Ot as emaTalib, gn as formatIndicatorParams, _e as formatPrice, ve as formatVolume, ye as formatVolumeTick, G as getIndicator, I as lineStyleFrom, dn as listIndicators, Mt as maDispatch, pe as maxVisibleBarsForWidth, Bn as normalizeDrawing, ke as normalizeStatsPosition, Vo as panButtonClass, jn as pickHitRegion, fe as rangeMarks, Ut as rawStochK, un as registerIndicator, It as rollingMax, Lt as rollingMin, zt as rsi, Et as sma, Wt as stddevPop, jt as tema, Rt as trueRange, _o as useBackgroundPointerDown, ho as useChartGeometry, mo as useChartOverlayHost, lo as useChartScale, go as useReportOverlayPriceBounds, Pt as wilderSmooth, Ft as wilderSum, Dt as wma };
