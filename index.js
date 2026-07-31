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
	"5Y",
	"10Y",
	"20Y"
], k = {
	"3M": 66,
	"6M": 132,
	"1Y": 252,
	"2Y": 504,
	"3Y": 756,
	"5Y": 1260
}, ee = {
	"3M": .25,
	"6M": .5,
	"1Y": 1,
	"2Y": 2,
	"3Y": 3,
	"5Y": 5,
	"10Y": 10,
	"20Y": 20
}, te = 30, ne = [
	"3M",
	"6M",
	"1Y",
	"2Y",
	"3Y",
	"5Y"
].map((e) => ({
	key: e,
	bars: k[e]
})), re = 2, ie = 10, ae = 78;
function oe(e) {
	return Math.floor((e - ae) / 2);
}
var se = 1440 * 60 * 1e3, ce = 365.25, le = 252;
function ue(e) {
	let t = e.length;
	if (t < 2) return 252;
	let n = Date.parse(e[0].date), r = Date.parse(e[t - 1].date);
	return !Number.isFinite(n) || !Number.isFinite(r) || r <= n ? 252 : ce / ((r - n) / se / (t - 1));
}
function de(e, t) {
	let n = ue(e);
	return O.map((e) => ({
		key: e,
		bars: Math.round(ee[e] * n)
	})).filter((e) => e.bars >= 30 && e.bars <= t);
}
function fe(e) {
	return Math.max(10, oe(e));
}
function pe(e, t) {
	return {
		minOffset: -(t - 1),
		maxOffset: Math.max(0, e - 1)
	};
}
function me(e, t, n) {
	let { minOffset: r, maxOffset: i } = pe(t, n);
	return Math.max(r, Math.min(e, i));
}
function he(e, t, n, r, i) {
	let a = (n - t) * i, o = (r - t) * i;
	return Math.max(a, Math.min(o, e));
}
var ge = (e) => e == null ? "" : e.toLocaleString("en-IN", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), _e = (e) => e == null ? "" : e >= 1e9 ? (e / 1e9).toFixed(2) + "B" : e >= 1e6 ? (e / 1e6).toFixed(2) + "M" : e >= 1e3 ? (e / 1e3).toFixed(0) + "K" : e.toString(), ve = (e) => e == null ? "" : e >= 1e9 ? Math.round(e / 1e9) + "B" : e >= 1e6 ? Math.round(e / 1e6) + "M" : e >= 1e3 ? Math.round(e / 1e3) + "K" : e.toString(), ye = 1440 * 60 * 1e3;
function be(e, t = 30, n = 365) {
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
	let l = new Date(e[r - 1].date).getTime() - n * ye, u = -1, d = 0;
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
var xe = [
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
], Se = xe.map((e) => e.name);
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
function Ce(e, t) {
	return e.length === 0 ? "" : e[Math.max(0, Math.min(e.length - 1, t))].date;
}
var we = 864e5;
function Te(e, t = 20) {
	let n = e.length;
	if (n < 2) return we;
	let r = [];
	for (let i = Math.max(1, n - t); i < n; i++) r.push(Date.parse(e[i].date) - Date.parse(e[i - 1].date));
	r.sort((e, t) => e - t);
	let i = r[r.length >> 1];
	return i > 0 ? i : we;
}
function Ee(e, t) {
	if (e.length === 0) return "";
	let n = Date.parse(e[e.length - 1].date);
	return new Date(n + t * Te(e)).toISOString().slice(0, 10);
}
function De(e, t) {
	if (e.length === 0) return 0;
	let n = Date.parse(e[e.length - 1].date), r = (Date.parse(t) - n) / Te(e);
	return Math.max(0, Math.round(r));
}
function Oe(e, t) {
	if (e.length === 0) return 0;
	let n = A(e, t);
	if (n != null) return n;
	let r = Te(e), i = Date.parse(t);
	if (t < e[0].date) return Math.floor((i - Date.parse(e[0].date)) / r);
	let a = e.length - 1;
	return a + Math.floor((i - Date.parse(e[a].date)) / r);
}
function ke(e, t) {
	if (e.length === 0) return "";
	let n = e.length - 1;
	if (t >= 0 && t <= n) return e[Math.round(t)].date;
	let r = Te(e), i = t < 0 ? 0 : n, a = Date.parse(e[i].date) + (t - i) * r;
	return new Date(a).toISOString().slice(0, 10);
}
var j = {
	chartWrapper: "_chartWrapper_83h0v_1",
	chartWrapperBare: "_chartWrapperBare_83h0v_14",
	seriesCanvas: "_seriesCanvas_83h0v_27",
	chartSvg: "_chartSvg_83h0v_34",
	empty: "_empty_83h0v_42",
	emptyIcon: "_emptyIcon_83h0v_52",
	resetPanBtn: "_resetPanBtn_83h0v_57",
	resetPanBtnInactive: "_resetPanBtnInactive_83h0v_84",
	autoFitBtn: "_autoFitBtn_83h0v_93",
	autoFitBtnActive: "_autoFitBtnActive_83h0v_118",
	subpaneDivider: "_subpaneDivider_83h0v_129",
	subpaneDividerLine: "_subpaneDividerLine_83h0v_140",
	legend: "_legend_83h0v_156",
	legendBlock: "_legendBlock_83h0v_164",
	legendItem: "_legendItem_83h0v_172",
	legendValues: "_legendValues_83h0v_191",
	legendToggle: "_legendToggle_83h0v_200",
	legendDot: "_legendDot_83h0v_218",
	legendLabel: "_legendLabel_83h0v_225",
	legendBtn: "_legendBtn_83h0v_230",
	legendPopover: "_legendPopover_83h0v_258",
	legendPopoverHeader: "_legendPopoverHeader_83h0v_275",
	legendPopoverTitle: "_legendPopoverTitle_83h0v_295",
	legendPopoverSummary: "_legendPopoverSummary_83h0v_305",
	legendPopoverClose: "_legendPopoverClose_83h0v_311",
	panelScrollBody: "_panelScrollBody_83h0v_333",
	legendPopoverField: "_legendPopoverField_83h0v_341",
	legendColorField: "_legendColorField_83h0v_418",
	legendColorControls: "_legendColorControls_83h0v_437",
	legendColorHex: "_legendColorHex_83h0v_470",
	fieldResetBtn: "_fieldResetBtn_83h0v_503",
	lineFieldControls: "_lineFieldControls_83h0v_537",
	lineFieldSelect: "_lineFieldSelect_83h0v_569",
	lineFieldWidth: "_lineFieldWidth_83h0v_582",
	lineFieldOpacity: "_lineFieldOpacity_83h0v_603",
	sliderControl: "_sliderControl_83h0v_609",
	sliderValue: "_sliderValue_83h0v_619",
	settingsGearBtn: "_settingsGearBtn_83h0v_627",
	settingsDialog: "_settingsDialog_83h0v_654",
	centeredPanel: "_centeredPanel_83h0v_681",
	autoFitMenu: "_autoFitMenu_83h0v_696",
	autoFitMenuRow: "_autoFitMenuRow_83h0v_714",
	autoFitMenuEmpty: "_autoFitMenuEmpty_83h0v_728",
	settingsSectionTitle: "_settingsSectionTitle_83h0v_734",
	settingsGroupTitle: "_settingsGroupTitle_83h0v_748"
}, M = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
function N(e, t, n) {
	if (!e || t < 0 || t >= e.length) return "";
	let r = e[t];
	return Number.isNaN(r) ? "" : n(r);
}
function Ae(e, t, n, r, i) {
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
		r && Ae(e, n, r, i.st, (e) => !Number.isNaN(r[e]));
	}
}
function je(e, t, n, r, i) {
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
function Me(e, t, n, r, i, a = 2.5) {
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
var F = [
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
], I = [
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
function Ne(e) {
	return e === 1 ? [4, 3] : e === 2 ? [1, 2] : null;
}
//#endregion
//#region src/indicators/lineSettings.ts
function L(e, t, n) {
	return {
		color: n(String(e[`${t}Color`])),
		width: Number(e[`${t}Width`]),
		dash: Ne(Number(e[`${t}Style`])),
		opacity: Number(e[`${t}Opacity`])
	};
}
//#endregion
//#region src/indicators/builtins/rollingHigh.ts
function Pe(e, t) {
	let n = new Float64Array(e.length);
	for (let r = 0; r < e.length; r++) n[r] = e[r][t] ?? NaN;
	return n;
}
function Fe(e, t, n, r) {
	let i = n[e][t];
	if (Number.isNaN(i)) return !1;
	let a = r[t];
	if (a && i === a.high) return !1;
	if (e === "highAll") return !0;
	let o = n[e === "high1y" ? "high2y" : e === "high2y" ? "high3y" : "highAll"][t];
	return Number.isNaN(o) ? !1 : Math.abs(i - o) / o > .01;
}
var R = [
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
], Ie = {
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
		high1y: Pe(e.bars, "high1y"),
		high2y: Pe(e.bars, "high2y"),
		high3y: Pe(e.bars, "high3y"),
		highAll: Pe(e.bars, "highAll")
	} }),
	draw: (e, t, n, r, i) => {
		for (let a of R) {
			let o = t[a.key];
			o && Ae(e, n, o, L(r, a.key, i), (e) => Fe(a.key, e, t, n.data));
		}
	},
	autofitKeys: () => [
		"high1y",
		"high2y",
		"high3y",
		"highAll"
	],
	legend: (e, t, n, r) => R.map((i) => ({
		color: String(n[`${i.key}Color`]),
		label: i.label,
		value: N(e[i.key], t, r.priceFmt)
	}))
}, Le = (e) => Math.round(e * 100) / 100;
function Re(e, t) {
	let n = e.length, r = new Float64Array(n), i = 2 / (t + 1), a = NaN;
	for (let t = 0; t < n; t++) {
		let n = e[t];
		if (Number.isNaN(n)) {
			r[t] = NaN, a = NaN;
			continue;
		}
		a = Number.isNaN(a) ? n : i * n + (1 - i) * a, r[t] = Le(a);
	}
	return r;
}
function ze(e, t) {
	let n = e.length, r = new Float64Array(n), i = [], a = 0;
	for (let o = 0; o < n; o++) {
		let n = e[o];
		if (Number.isNaN(n)) {
			r[o] = NaN;
			continue;
		}
		for (; i.length - a > 0 && i[a] <= o - t;) a++;
		for (; i.length - a > 0 && e[i[i.length - 1]] <= n;) i.pop();
		i.push(o), r[o] = Le(e[i[a]]);
	}
	return r;
}
function Be(e) {
	let t = e.length, n = new Float64Array(t), r = NaN;
	for (let i = 0; i < t; i++) {
		let t = e[i];
		if (Number.isNaN(t)) {
			n[i] = NaN;
			continue;
		}
		r = Number.isNaN(r) ? t : Math.max(r, t), n[i] = Le(r);
	}
	return n;
}
//#endregion
//#region src/indicators/builtins/rsLine.ts
var Ve = (e) => Math.round(e * 100) / 100, He = {
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
		for (let e = 0; e < n; e++) r[e] = Number.isNaN(o[e]) ? NaN : Ve(o[e] * c);
		let l = ze(r, t.lookback), u = ze(e.h, t.lookback);
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
		a && (Ae(e, n, a, L(r, "line", i), (e) => !Number.isNaN(a[e])), o && Me(e, n, a, {
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
}, Ue = 12, We = .18, Ge = {
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
		let { xScale: o, bandwidth: s, renderStart: c, renderEnd: l } = n, u = Math.max(...n.yPrice.range()), d = u - Ue;
		e.save(), e.fillStyle = i(r.bandColor), e.globalAlpha = We;
		let f = -1, p = (t) => {
			let n = o(f), r = o(t) + s;
			e.fillRect(n, d, r - n, Ue);
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
}, Ke = 40, qe = 70, Je = 65, Ye = "500 10px 'Helvetica Neue', Helvetica, Arial, sans-serif", Xe = 864e5, Ze = 365 * Xe, Qe = 48, z = (e) => e.toLocaleString("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
}), $e = (e) => `${e >= 0 ? "+" : ""}${e.toFixed(1)}%`;
function et(e, t) {
	let n = e.length, r = new Float64Array(n);
	r.fill(NaN);
	let i = e.map((e) => new Date(e.date).getTime());
	for (let a = 0; a < n; a++) {
		let o = e[a][t];
		if (o == null || !Number.isFinite(o)) continue;
		let s = i[a] - Ze, c = -1, l = Infinity;
		for (let e = 0; e < n; e++) {
			let t = Math.abs(i[e] - s) / Xe;
			t <= Ke && t < l && (l = t, c = e);
		}
		if (c < 0) continue;
		let u = e[c][t];
		u == null || !Number.isFinite(u) || u === 0 || (r[a] = (o - u) / Math.abs(u) * 100);
	}
	return r;
}
function tt(e, t) {
	let n = Array(e.length).fill(!1), r = Infinity;
	for (let i = e.length - 1; i >= 0; i--) (r === Infinity || Math.abs(r - e[i]) >= t) && (n[i] = !0, r = e[i]);
	return n;
}
function nt(e) {
	let t = [...e.quarterlyResults ?? []].sort((e, t) => e.date < t.date ? -1 : +(e.date > t.date)), n = et(t, "eps"), r = et(t, "rps"), i = e.market === "US" ? "$" : "₹", a = t.map((e, t) => {
		let a = e.eps == null ? NaN : e.eps, o = e.rps == null ? NaN : e.rps, s = n[t], c = r[t];
		return {
			label: e.label,
			eps: a,
			rps: o,
			epsText: Number.isFinite(a) ? i + z(a) : "--",
			rpsText: Number.isFinite(o) ? i + z(o) : "--",
			epsGrowthText: Number.isNaN(s) ? "" : $e(s),
			rpsGrowthText: Number.isNaN(c) ? "" : $e(c),
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
function rt(e, t, n, r) {
	let i = e.textAlign;
	e.textAlign = "left";
	let a = r.map((t) => e.measureText(t.text).width), o = t - (a.reduce((e, t) => e + t, 0) + 4 * Math.max(0, r.length - 1)) / 2;
	for (let t = 0; t < r.length; t++) e.fillStyle = r[t].color, e.fillText(r[t].text, o, n), o += a[t] + 4;
	e.textAlign = i;
}
var it = (e, t, n, r, i, a) => {
	let o = a;
	if (!o) return;
	let s = r.display === 1 ? "bars" : "text", { xScale: c, bandwidth: l, renderStart: u, renderEnd: d } = n, f = n.paneTop ?? 0, p = n.paneBottom ?? 0, m = p - f;
	if (m <= 0) return;
	let h = i(r.epsColor), g = i(r.rpsColor), _ = i(r.growthUpColor), v = i(r.growthDownColor), y = i(r.labelColor);
	e.save(), e.beginPath(), e.rect(-1e6, f, 2e6, m), e.clip(), e.font = Ye;
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
		let t = tt(b.map((e) => e.x), qe);
		e.textAlign = "center", e.textBaseline = "alphabetic";
		for (let e = 0; e < b.length; e++) {
			if (!t[e]) continue;
			let r = b[e].g;
			n.hit?.add({
				spanAt: (e) => e === r ? [f, p] : null,
				halfWidth: qe / 2,
				interpolate: !1
			});
		}
		if (m >= Je) {
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
				e.fillStyle = y, e.fillText(s.label, o, r), rt(e, o, i, [
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
				]), rt(e, o, a, [
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
	let w = C * c.step(), T = Math.min(Qe, w * .3), E = Math.min(4, T * .12), D = Math.max(1, (T - E) / 2), O = (t, r, i) => {
		if (!Number.isFinite(r)) return;
		let a = n.y(r), o = Math.min(x, a), s = Math.max(1, Math.abs(x - a));
		e.fillStyle = i, e.fillRect(t, o, D, s);
	}, k = tt(b.map((e) => e.x), qe);
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
}, at = {
	fixedDomain: [0, 1],
	hideAxis: !0
}, ot = {
	includeZero: !0,
	guideLines: [0],
	autofitPadding: 0,
	topPadPx: 17
}, st = {
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
	compute: (e) => nt(e),
	draw: it,
	autofitKeys: (e) => e.display === 1 ? ["eps", "rps"] : [],
	domain: (e, t) => t.display === 1 ? ot : at,
	legend: (e, t, n) => [{
		color: n.rpsColor,
		label: "RPS",
		value: N(e.rps, t, M)
	}, {
		color: n.epsColor,
		label: "EPS",
		value: N(e.eps, t, M)
	}]
}, ct = .5, lt = 2, B = 9, V = "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";
function ut(e, t) {
	let n = e.c.length, r = e.displayStart ?? 0, i = e.bars.slice(r), a = be(i, t.smaPeriod), o = new Float64Array(n).fill(NaN), s = new Float64Array(n).fill(NaN), c = new Float64Array(n).fill(NaN), l = new Float64Array(n).fill(NaN);
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
var dt = {
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
			default: ct,
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
	compute: (e, t) => ({ series: ut(e, t) }),
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
			e.fillStyle = m, e.font = V, e.textAlign = "center", e.textBaseline = "alphabetic";
			for (let t = s; t < c; t++) {
				let r = g[t];
				if (Number.isNaN(r)) continue;
				let i = l[t];
				if (!i) continue;
				let s = Math.max(n.y(i.volume) - lt, u + B);
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
		tickFormat: ve
	}),
	legend: (e, t, n) => [{
		color: n.upColor,
		label: "Vol",
		value: N(e.volumeUp, t, _e)
	}, {
		color: n.downColor,
		label: "Vol",
		value: N(e.volumeDown, t, _e)
	}]
}, H = (e) => Number.isNaN(e) ? NaN : Math.round(e * 100) / 100;
function ft(e) {
	for (let t = 0; t < e.length; t++) if (!Number.isNaN(e[t])) return t;
	return e.length;
}
function U(e) {
	let t = new Float64Array(e);
	return t.fill(NaN), t;
}
function W(e, t) {
	let n = e.length, r = U(n), i = ft(e);
	if (t < 1 || i + t > n) return r;
	let a = 0;
	for (let o = i; o < n; o++) a += e[o], o >= i + t && (a -= e[o - t]), o >= i + t - 1 && (r[o] = a / t);
	return r;
}
function pt(e, t) {
	let n = e.length, r = U(n), i = ft(e), a = i + t - 1;
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
	return mt(e, t, ft(e) + t - 1);
}
function mt(e, t, n) {
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
function ht(e, t) {
	let n = e.length, r = G(e, t), i = G(r, t), a = U(n);
	for (let e = 0; e < n; e++) !Number.isNaN(r[e]) && !Number.isNaN(i[e]) && (a[e] = 2 * r[e] - i[e]);
	return a;
}
function gt(e, t) {
	let n = e.length, r = G(e, t), i = G(r, t), a = G(i, t), o = U(n);
	for (let e = 0; e < n; e++) Number.isNaN(a[e]) || (o[e] = 3 * r[e] - 3 * i[e] + a[e]);
	return o;
}
function _t(e, t, n) {
	switch (e) {
		case 1: return G(t, n);
		case 2: return pt(t, n);
		case 3: return ht(t, n);
		case 4: return gt(t, n);
		default: return W(t, n);
	}
}
function vt(e, t) {
	switch (e) {
		case 3: return 2 * (t - 1);
		case 4: return 3 * (t - 1);
		default: return t - 1;
	}
}
function yt(e, t, n) {
	let r = e.length, i = U(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t <= a; t++) o += e[t];
	let s = o / t;
	i[a] = s;
	for (let n = a + 1; n < r; n++) s = (s * (t - 1) + e[n]) / t, i[n] = s;
	return i;
}
function bt(e, t, n) {
	let r = e.length, i = U(r), a = n + t - 1;
	if (t < 1 || a >= r) return i;
	let o = 0;
	for (let t = n; t < a; t++) o += e[t];
	o = o - o / t + e[a], i[a] = o;
	for (let n = a + 1; n < r; n++) o = o - o / t + e[n], i[n] = o;
	return i;
}
function xt(e, t) {
	let n = e.length, r = U(n), i = ft(e);
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
function St(e, t) {
	let n = e.length, r = U(n), i = ft(e);
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
function Ct(e, t, n) {
	let r = e.length, i = U(r);
	for (let a = 1; a < r; a++) {
		let r = e[a] - t[a], o = Math.abs(e[a] - n[a - 1]), s = Math.abs(t[a] - n[a - 1]);
		i[a] = Math.max(r, o, s);
	}
	return i;
}
function wt(e, t) {
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
function Tt(e, t, n, r) {
	let i = e.length, a = U(i);
	if (r < 1 || r >= i) return a;
	let o = Ct(e, t, n), s = U(i), c = U(i);
	for (let n = 1; n < i; n++) {
		let r = e[n] - e[n - 1], i = t[n - 1] - t[n];
		s[n] = r > i && r > 0 ? r : 0, c[n] = i > r && i > 0 ? i : 0;
	}
	let l = bt(o, r, 1), u = bt(s, r, 1), d = bt(c, r, 1);
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
function Et(e, t, n, r) {
	return yt(Ct(e, t, n), r, 1);
}
function Dt(e, t, n, r) {
	return yt(Tt(e, t, n, r), r, r);
}
function Ot(e, t, n, r) {
	let i = e.length, a = xt(e, r), o = St(t, r), s = U(i);
	for (let e = 0; e < i; e++) {
		if (Number.isNaN(a[e]) || Number.isNaN(o[e]) || Number.isNaN(n[e])) continue;
		let t = a[e] - o[e];
		s[e] = t === 0 ? 0 : 100 * (n[e] - o[e]) / t;
	}
	return s;
}
function kt(e, t) {
	let n = e.length, r = U(n), i = ft(e);
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
var At = {
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
		st: L(r, "line", i)
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
function jt(e) {
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
var Mt = {
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
		let t = jt(e.period);
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
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["ema"],
	legend: (e, t, n, r) => [{
		color: n.labelColor,
		label: "EMA",
		value: N(e.ema, t, r.priceFmt)
	}]
}, Nt = {
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
		let n = pt(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { wma: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "wma",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["wma"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "WMA",
		value: N(e.wma, t, r.priceFmt)
	}]
}, Pt = {
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
		let n = ht(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { dema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "dema",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["dema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "DEMA",
		value: N(e.dema, t, r.priceFmt)
	}]
}, Ft = {
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
		let n = gt(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { tema: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "tema",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["tema"],
	legend: (e, t, n, r) => [{
		color: n.lineColor,
		label: "TEMA",
		value: N(e.tema, t, r.priceFmt)
	}]
}, It = {
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
			options: F
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
	warmupBars: (e) => Math.max(vt(e.matype, e.period), e.period - 1) + Math.max(250, 5 * e.period),
	compute: (e, t) => {
		let n = e.c.length, r = _t(t.matype, e.c, t.period), i = kt(e.c, t.period), a = new Float64Array(n), o = new Float64Array(n), s = new Float64Array(n);
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
			st: L(r, "upper", i)
		},
		{
			key: "middleband",
			st: L(r, "mid", i)
		},
		{
			key: "lowerband",
			st: L(r, "lower", i)
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
}, Lt = {
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
		let n = wt(e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { rsi: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "rsi",
		st: L(r, "line", i)
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
}, Rt = {
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
		let n = e.c.length, r = mt(e.c, t.fast, t.slow - 1), i = G(e.c, t.slow), a = new Float64Array(n);
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
		t.macdhist && je(e, n, t.macdhist, {
			color: i(r.histUpColor),
			width: 1
		}, i(r.histDownColor)), P(e, t, n, [{
			key: "macd",
			st: L(r, "macd", i)
		}, {
			key: "macdsignal",
			st: L(r, "macdsignal", i)
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
}, zt = {
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
			options: F
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
			options: F
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
		let n = Ot(e.h, e.l, e.c, t.fastk), r = _t(t.slowk_matype, n, t.slowk), i = _t(t.slowd_matype, r, t.slowd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = H(r[e]), i[e] = H(i[e]);
		return { series: {
			slowk: r,
			slowd: i
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "slowk",
		st: L(r, "k", i)
	}, {
		key: "slowd",
		st: L(r, "d", i)
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
}, Bt = {
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
			options: F
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
		let n = Ot(e.h, e.l, e.c, t.fastk), r = _t(t.fastd_matype, n, t.fastd);
		for (let e = 0; e < n.length; e++) Number.isNaN(r[e]) && (n[e] = NaN), n[e] = H(n[e]), r[e] = H(r[e]);
		return { series: {
			fastk: n,
			fastd: r
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "fastk",
		st: L(r, "k", i)
	}, {
		key: "fastd",
		st: L(r, "d", i)
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
}, Vt = {
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
			options: F
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
		let n = wt(e.c, t.timeperiod), r = Ot(n, n, n, t.fastk), i = _t(t.fastd_matype, r, t.fastd);
		for (let e = 0; e < r.length; e++) Number.isNaN(i[e]) && (r[e] = NaN), r[e] = H(r[e]), i[e] = H(i[e]);
		return { series: {
			fastk: r,
			fastd: i
		} };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "fastk",
		st: L(r, "k", i)
	}, {
		key: "fastd",
		st: L(r, "d", i)
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
}, Ht = {
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
		let n = e.c.length, r = xt(e.h, t.period), i = St(e.l, t.period), a = new Float64Array(n);
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
		st: L(r, "line", i)
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
}, Ut = {
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
		let n = Dt(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { adx: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "adx",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["adx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ADX",
		value: N(e.adx, t, M)
	}]
}, Wt = {
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
		let n = Tt(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { dx: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "dx",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["dx"],
	domain: () => ({ fixedDomain: [0, 100] }),
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "DX",
		value: N(e.dx, t, M)
	}]
}, Gt = {
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
		let n = Et(e.h, e.l, e.c, t.period);
		for (let e = 0; e < n.length; e++) n[e] = H(n[e]);
		return { series: { atr: n } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "atr",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["atr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "ATR",
		value: N(e.atr, t, M)
	}]
}, Kt = {
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
		let n = e.c.length, r = Et(e.h, e.l, e.c, t.period), i = new Float64Array(n);
		i.fill(NaN);
		for (let t = 0; t < n; t++) Number.isNaN(r[t]) || e.c[t] === 0 || (i[t] = H(100 * r[t] / e.c[t]));
		return { series: { natr: i } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "natr",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["natr"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "NATR",
		value: N(e.natr, t, M)
	}]
}, qt = {
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
		let t = Ct(e.h, e.l, e.c);
		for (let e = 0; e < t.length; e++) t[e] = H(t[e]);
		return { series: { trange: t } };
	},
	draw: (e, t, n, r, i) => P(e, t, n, [{
		key: "trange",
		st: L(r, "line", i)
	}]),
	autofitKeys: () => ["trange"],
	legend: (e, t, n) => [{
		color: n.lineColor,
		label: "TRANGE",
		value: N(e.trange, t, M)
	}]
}, Jt = /* @__PURE__ */ new Map();
function Yt(e) {
	Jt.set(e.key, e);
}
function K(e) {
	return Jt.get(e);
}
function Xt() {
	return [...Jt.values()];
}
function Zt(e) {
	let t = {};
	for (let n of e) n.kind === "line" ? (t[`${n.key}Color`] = n.default.color, t[`${n.key}Width`] = n.default.width, t[`${n.key}Style`] = n.default.style ?? 0, t[`${n.key}Opacity`] = n.default.opacity ?? 1) : t[n.key] = n.default;
	return t;
}
function Qt(e, t) {
	let n = Zt(e.settingsSchema), r = {
		...n,
		...t
	}, i = e.deriveDefaults?.(r) ?? {};
	return {
		...n,
		...i,
		...t
	};
}
function $t(e, t) {
	let n = K(e);
	if (!n) return;
	let r = { ...t?.settingsOverrides }, i = Qt(n, r);
	return {
		id: t?.id ?? e,
		defKey: e,
		label: n.label,
		enabled: t?.enabled ?? !1,
		settings: i,
		settingsOverrides: r
	};
}
Yt(Ie), Yt(He), Yt(Ge), Yt(st), Yt(dt);
var en = [
	At,
	Mt,
	Nt,
	Pt,
	Ft,
	It,
	Lt,
	Rt,
	zt,
	Bt,
	Vt,
	Ht,
	Ut,
	Wt,
	Gt,
	Kt,
	qt
];
for (let e of en) Yt(e);
function tn(e) {
	let t = K(e.defKey);
	return t?.formatParams ? t.formatParams(e.settings) : "";
}
var nn = [
	"ti:ema",
	"ti:sma",
	"ti:wma",
	"ti:dema",
	"ti:tema",
	"ti:bbands",
	"highs",
	"stage2"
], rn = [
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
], an = 11;
function on(e, t, n, r, i, a) {
	let o = i - n, s = a - r, c = o * o + s * s;
	if (c === 0) return Math.hypot(e - n, t - r);
	let l = ((e - n) * o + (t - r) * s) / c;
	l = Math.max(0, Math.min(1, l));
	let u = n + l * o, d = r + l * s;
	return Math.hypot(e - u, t - d);
}
function sn(e, t, n, r) {
	return Math.hypot(e - n.x, t - n.y) <= an ? {
		kind: "handle",
		index: 0
	} : Math.hypot(e - r.x, t - r.y) <= an ? {
		kind: "handle",
		index: 1
	} : on(e, t, n.x, n.y, r.x, r.y) <= 6 ? { kind: "body" } : null;
}
function cn(e, t, n, r) {
	return Math.abs(t - n) <= 6 && e >= 0 && e <= r ? { kind: "body" } : null;
}
function ln(e, t, n, r) {
	return Math.abs(e - n) <= 6 && t >= 0 && t <= r ? { kind: "body" } : null;
}
function q(e, t, n) {
	return e >= n.x && e <= n.x + n.width && t >= n.y && t <= n.y + n.height ? { kind: "body" } : null;
}
function un(e, t, n, r) {
	return Math.hypot(e - n.x, t - n.y) <= an ? {
		kind: "handle",
		index: 0
	} : on(e, t, n.x, n.y, r.x, r.y) <= 6 ? { kind: "body" } : null;
}
//#endregion
//#region src/indicators/hitRegions.ts
var dn = "__candles__", fn = 6, pn = 2;
function mn(e, t, n, r, i, a) {
	let o = r.spanAt(n);
	if (!o) return !1;
	let s = Math.min(a / 2, r.halfWidth + 2);
	if (Math.abs(e - i(n)) > s) return !1;
	let c = Math.min(o[0], o[1]) - 2, l = Math.max(o[0], o[1]) + 2;
	return t >= c && t <= l;
}
function hn(e, t, n, r, i, a, o) {
	let s = 0, c = 0, l = !1;
	for (let u = n - a; u <= n + a; u++) {
		let n = r.spanAt(u);
		if (!n) {
			l = !1;
			continue;
		}
		let a = i(u), d = (n[0] + n[1]) / 2;
		if (l && on(e, t, s, c, a, d) <= o) return !0;
		s = a, c = d, l = !0;
	}
	return !1;
}
function gn(e, t, n, r, i, a, o = 6) {
	if (!Number.isFinite(n) || r.length === 0) return null;
	let s = Math.max(1, Math.ceil(o / Math.max(a, 1e-6)));
	for (let c = r.length - 1; c >= 0; c--) {
		let l = r[c];
		if (l.interpolate ? hn(e, t, n, l, i, s, o) : mn(e, t, n, l, i, a)) return l;
	}
	return null;
}
//#endregion
//#region src/appearance/registry.ts
var _n = [
	13,
	27,
	34,
	40,
	47,
	54
], vn = .35, yn = 1 / 6, bn = {
	colors: {},
	background: {
		topColor: "#6e7b8b",
		bottomColor: "#776a5a",
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
}, xn = (e) => typeof e == "object" && !!e && !Array.isArray(e);
function Sn(e, t) {
	if (t === void 0) return e;
	if (!xn(e) || !xn(t)) return t;
	let n = { ...e };
	for (let r of Object.keys(t)) n[r] = Sn(e[r], t[r]);
	return n;
}
function Cn(e) {
	return Sn(bn, e);
}
//#endregion
//#region src/drawings/types.ts
function wn(e) {
	return !!e && typeof e == "object" && typeof e.date == "string" && typeof e.price == "number" && Number.isFinite(e.price);
}
function Tn(e) {
	if (!e || typeof e != "object") return null;
	let t = e;
	if (typeof t.id != "string" || t.id === "" || typeof t.type != "string") return null;
	switch (t.type) {
		case "trendline":
		case "ray":
		case "ruler": return wn(t.a) && wn(t.b) ? e : null;
		case "hray":
		case "text": return wn(t.a) ? e : null;
		case "hline": return typeof t.price == "number" && Number.isFinite(t.price) ? e : null;
		case "vline": return typeof t.date == "string" ? e : null;
		default: return e;
	}
}
//#endregion
//#region src/drawings/defaults.ts
var J = {
	color: "var(--chart-drawing)",
	width: 1.5,
	style: 0,
	opacity: 1,
	text: "",
	fontSize: 12,
	bgColor: "var(--chart-drawing-bg)",
	bgOpacity: .85
};
function En(e) {
	return {
		color: e?.color ?? J.color,
		width: e?.width ?? J.width,
		style: e?.style ?? J.style,
		opacity: e?.opacity ?? J.opacity,
		text: e?.text ?? J.text,
		fontSize: e?.fontSize ?? J.fontSize,
		bgColor: e?.bgColor ?? J.bgColor,
		bgOpacity: e?.bgOpacity ?? J.bgOpacity
	};
}
//#endregion
//#region src/internal/cn.ts
function Y(...e) {
	return e.filter(Boolean).join(" ");
}
var X = {
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
}, Dn = [
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
function On(e, t) {
	let n = t.indexOf(e);
	return n === -1 ? t.length : n;
}
function kn(e) {
	let t = e.pane;
	return typeof t == "object" ? t.subpane : "";
}
function An({ chartType: e, onChartTypeChange: t, indicators: n, onIndicatorsChange: r, patternsEnabled: a, onPatternsToggle: o, visiblePatterns: l, onVisiblePatternsChange: u, statsEnabled: d, onStatsToggle: f, activeDrawingTool: p = "cursor", onActiveDrawingToolChange: m, hasDrawings: h, onDeleteAllDrawings: g, className: _ }) {
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
	let ee = (e) => l ? l.includes(e) : !0, te = l ? l.length : Se.length, ne = (e) => {
		if (!u) return;
		let t = l ?? Se;
		u(t.includes(e) ? t.filter((t) => t !== e) : [...t, e]);
	}, re = Xt().filter((e) => e.pane === "price").sort((e, t) => On(e.key, nn) - On(t.key, nn)), ie = Xt().filter((e) => typeof e.pane == "object").sort((e, t) => On(kn(e), rn) - On(kn(t), rn)), ae = (e) => {
		let t = $t(e.key, {
			id: crypto.randomUUID(),
			enabled: !0
		});
		t && r([...n, t]);
	}, oe = (e) => /* @__PURE__ */ E("div", {
		className: X.pickerRow,
		children: [/* @__PURE__ */ T("span", {
			className: X.pickerLabel,
			children: e.label
		}), /* @__PURE__ */ T("button", {
			type: "button",
			className: X.pickerAdd,
			title: `Add ${e.label}`,
			onClick: () => ae(e),
			children: "+"
		})]
	}, e.key);
	return /* @__PURE__ */ E("div", {
		className: Y(X.chartControls, _),
		children: [
			/* @__PURE__ */ E("div", {
				className: "pill-toggle-group",
				children: [/* @__PURE__ */ T("button", {
					className: Y("pill-toggle-btn", "pill-toggle-btn-sm", e === "candlestick" && "is-active"),
					onClick: () => t("candlestick"),
					children: "Candles"
				}), /* @__PURE__ */ T("button", {
					className: Y("pill-toggle-btn", "pill-toggle-btn-sm", e === "bar" && "is-active"),
					onClick: () => t("bar"),
					children: "Bars"
				})]
			}),
			/* @__PURE__ */ E("div", {
				className: X.indicatorPicker,
				ref: b,
				children: [/* @__PURE__ */ E("button", {
					type: "button",
					className: Y("pill-toggle-btn", "pill-toggle-btn-sm", v && "is-active"),
					onClick: () => y((e) => !e),
					children: [
						"Indicators ·",
						" ",
						/* @__PURE__ */ T("span", {
							className: X.pickerCount,
							children: n.length
						})
					]
				}), v && /* @__PURE__ */ T("div", {
					className: X.pickerPanel,
					children: /* @__PURE__ */ E("div", {
						className: X.pickerScroll,
						children: [
							/* @__PURE__ */ T("div", {
								className: X.pickerSection,
								children: "Overlays"
							}),
							re.map(oe),
							/* @__PURE__ */ T("div", {
								className: X.pickerSection,
								children: "Oscillators"
							}),
							ie.map(oe)
						]
					})
				})]
			}),
			/* @__PURE__ */ E("div", {
				className: X.indicatorPicker,
				ref: C,
				children: [/* @__PURE__ */ E("button", {
					type: "button",
					className: Y("pill-toggle-btn", "pill-toggle-btn-sm", a && "is-active"),
					onClick: () => S((e) => !e),
					children: [
						"Patterns ·",
						" ",
						/* @__PURE__ */ T("span", {
							className: X.pickerCount,
							children: a ? te : 0
						})
					]
				}), x && /* @__PURE__ */ T("div", {
					className: X.pickerPanel,
					children: /* @__PURE__ */ E("div", {
						className: X.pickerScroll,
						children: [
							/* @__PURE__ */ E("label", {
								className: X.pickerCheckRow,
								children: [/* @__PURE__ */ T("span", {
									className: X.pickerLabel,
									children: "Show patterns"
								}), /* @__PURE__ */ T("input", {
									type: "checkbox",
									checked: a,
									onChange: o
								})]
							}),
							/* @__PURE__ */ T("div", {
								className: X.pickerSection,
								children: "Patterns"
							}),
							xe.map(({ name: e, label: t }) => /* @__PURE__ */ E("label", {
								className: X.pickerCheckRow,
								children: [/* @__PURE__ */ T("span", {
									className: X.pickerLabel,
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
				className: X.indicatorPicker,
				ref: k,
				children: [/* @__PURE__ */ T("button", {
					type: "button",
					className: Y("pill-toggle-btn", "pill-toggle-btn-sm", (D || p !== "cursor") && "is-active"),
					onClick: () => O((e) => !e),
					children: "Draw ▾"
				}), D && /* @__PURE__ */ T("div", {
					className: X.pickerPanel,
					children: /* @__PURE__ */ E("div", {
						className: X.pickerScroll,
						children: [Dn.map(({ tool: e, label: t, Icon: n }) => /* @__PURE__ */ E("button", {
							type: "button",
							className: Y(X.drawToolRow, p === e && X.drawToolRowActive),
							onClick: () => {
								m(e), O(!1);
							},
							children: [/* @__PURE__ */ T(n, { size: 14 }), /* @__PURE__ */ T("span", {
								className: X.pickerLabel,
								children: t
							})]
						}, e)), g && /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T("div", { className: X.drawToolDivider }), /* @__PURE__ */ T("button", {
							type: "button",
							className: X.drawToolRow,
							disabled: !h,
							onClick: () => {
								g(), O(!1);
							},
							children: /* @__PURE__ */ T("span", {
								className: X.pickerLabel,
								children: "Delete all"
							})
						})] })]
					})
				})]
			}),
			/* @__PURE__ */ T("div", {
				className: "pill-toggle-group",
				children: /* @__PURE__ */ T("button", {
					className: Y("pill-toggle-btn", "pill-toggle-btn-sm", d && "is-active"),
					onClick: f,
					children: "Stats"
				})
			})
		]
	});
}
//#endregion
//#region src/utils/toHex6.ts
var jn = "#888888", Z = (e) => Math.max(0, Math.min(255, Math.round(e))).toString(16).padStart(2, "0");
function Mn(e) {
	let t = e.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
	let n = t.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
	if (n) return `#${Z(+n[1])}${Z(+n[2])}${Z(+n[3])}`;
	let r = t.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
	return r ? `#${Z(r[1] * 255)}${Z(r[2] * 255)}${Z(r[3] * 255)}` : jn;
}
//#endregion
//#region src/controls/SettingsFields.tsx
function Nn(e, t) {
	let n = e;
	return t.min != null && (n = Math.max(t.min, n)), t.max != null && (n = Math.min(t.max, n)), n;
}
function Pn({ spec: e, value: t, onCommit: n }) {
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
				r.trim() !== "" && Number.isFinite(a) && /^\d*\.?\d*$/.test(r) && n(Nn(o ? Math.round(a) : a, e));
			},
			onBlur: () => i(String(t))
		})]
	});
}
function Fn({ spec: e, value: t, onChange: n }) {
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
function In({ label: e, value: t, onChange: n }) {
	return /* @__PURE__ */ E("label", {
		className: j.legendPopoverField,
		children: [/* @__PURE__ */ T("span", { children: e }), /* @__PURE__ */ T("input", {
			type: "checkbox",
			checked: t,
			onChange: (e) => n(e.target.checked)
		})]
	});
}
function Ln({ label: e, colorExpr: t, isOverridden: n, resolveColor: r, onCommit: a, onReset: o }) {
	let s = Mn(r(t)), [l, u] = c(s);
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
function Rn({ label: e, value: t, onCommit: n, min: r = 0, max: i = 1, step: a = .05 }) {
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
function zn({ label: e, prefix: t, settings: n, settingsOverrides: r, resolveColor: i, onCommit: a, onResetKeys: o }) {
	let s = `${t}Color`, c = `${t}Width`, l = `${t}Style`, u = `${t}Opacity`, d = Mn(i(String(n[s] ?? ""))), f = Number(n[c] ?? 1), p = Number(n[l] ?? 0), m = Number(n[u] ?? 1), h = [
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
					children: I.map((e) => /* @__PURE__ */ T("option", {
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
					className: j.fieldResetBtn,
					title: h ? "Reset line to default" : "Already the default line",
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
//#region src/controls/appearanceFields.tsx
function Bn(e, t) {
	let n = e;
	for (let e of t) {
		if (typeof n != "object" || !n) return;
		n = n[e];
	}
	return n;
}
function Vn(e, t, n) {
	let [r, ...i] = t, a = { ...e ?? {} };
	return i.length === 0 ? a[r] = n : a[r] = Vn(a[r], i, n), a;
}
function Hn(e, t) {
	let [n, ...r] = t, i = { ...e ?? {} };
	if (r.length === 0) delete i[n];
	else {
		let e = i[n];
		if (e && typeof e == "object") {
			let t = Hn(e, r);
			Object.keys(t).length === 0 ? delete i[n] : i[n] = t;
		}
	}
	return i;
}
function Un(e) {
	let { appearance: t, onAppearanceChange: n, resolveColor: r } = e, i = Cn(t), a = (e, r) => n(Vn(t, e, r)), o = (e) => n(Hn(t, e));
	return {
		eff: i,
		commit: a,
		reset: o,
		colorVarRow: (e, n) => {
			let i = t.colors?.[e];
			return /* @__PURE__ */ T(Ln, {
				label: n,
				colorExpr: i ?? `var(--${e})`,
				isOverridden: i !== void 0,
				resolveColor: r,
				onCommit: (t) => a(["colors", e], t),
				onReset: () => o(["colors", e])
			}, e);
		},
		colorRow: (e, n) => /* @__PURE__ */ T(Ln, {
			label: n,
			colorExpr: String(Bn(i, e)),
			isOverridden: Bn(t, e) !== void 0,
			resolveColor: r,
			onCommit: (t) => a(e, t),
			onReset: () => o(e)
		}, e.join(".")),
		numberRow: (e, t, n = {}) => {
			let r = Number(Bn(i, e));
			return /* @__PURE__ */ T(Pn, {
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
		sliderRow: (e, t) => /* @__PURE__ */ T(Rn, {
			label: t,
			value: Number(Bn(i, e)),
			onCommit: (t) => a(e, t)
		}, e.join("."))
	};
}
function Wn(e) {
	let { colorVarRow: t, sliderRow: n } = Un(e);
	return /* @__PURE__ */ E(w, { children: [
		t("candle-up", "Up color"),
		t("candle-down", "Down color"),
		n(["candle", "opacity"], "Opacity")
	] });
}
//#endregion
//#region src/controls/SettingsDialog.tsx
function Gn({ label: e, value: t, onCommit: n }) {
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
function Kn({ appearance: e, onAppearanceChange: t, resolveColor: n, onClose: r, style: a }) {
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
	let c = {
		appearance: e,
		onAppearanceChange: t,
		resolveColor: n
	}, { eff: l, commit: u, colorVarRow: d, colorRow: f, numberRow: p, sliderRow: m } = Un(c), h = (e, t) => /* @__PURE__ */ T(Gn, {
		label: t,
		value: String(Bn(l, e)),
		onCommit: (t) => u(e, t)
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
				d("chart-positive", "Price up"),
				d("chart-negative", "Price down"),
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
					className: j.settingsGroupTitle,
					children: "Candles"
				}),
				/* @__PURE__ */ T(Wn, { ...c }),
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
var qn = {
	zoomSlider: "_zoomSlider_1ol61_4",
	marks: "_marks_1ol61_16",
	mark: "_mark_1ol61_16"
};
//#endregion
//#region src/controls/ZoomSlider.tsx
function Jn({ visibleBars: e, onVisibleBarsChange: t, maxVisibleBars: n, marks: r, onPanReset: i }) {
	let a = Math.max(10, n), o = (r ?? ne).filter((e) => e.bars <= a), s = o.length ? Math.min(...o.map((e) => e.bars)) : Math.min(k["3M"], a), c = Math.max(s, Math.min(e, a)), l = Math.log(s), u = Math.log(a), d = u - l, f = (e) => d > 0 ? (Math.log(e) - l) / d * 100 : 0, p = (e) => {
		let n = Math.max(s, Math.min(e, a));
		t(n), o.some((e) => e.bars === n) && i?.();
	};
	return /* @__PURE__ */ E("div", {
		className: qn.zoomSlider,
		children: [/* @__PURE__ */ T("input", {
			type: "range",
			min: l,
			max: u,
			step: "any",
			value: Math.log(c),
			onChange: (e) => p(Math.round(Math.exp(Number(e.target.value)))),
			"aria-label": "Zoom (visible range)"
		}), /* @__PURE__ */ T("div", {
			className: qn.marks,
			children: o.map((e) => /* @__PURE__ */ T("button", {
				type: "button",
				className: qn.mark,
				style: { left: `${f(e.bars)}%` },
				onClick: () => p(e.bars),
				children: e.key
			}, e.key))
		})]
	});
}
//#endregion
//#region src/indicators/applySettings.ts
function Yn(e, t, n, r) {
	return e.map((e) => e.id === t ? $t(e.defKey, {
		id: e.id,
		enabled: e.enabled,
		settingsOverrides: {
			...e.settingsOverrides,
			[n]: r
		}
	}) ?? e : e);
}
function Xn(e, t, n) {
	return n.length === 0 ? e : e.map((e) => {
		if (e.id !== t) return e;
		let r = { ...e.settingsOverrides };
		for (let e of n) delete r[e];
		return $t(e.defKey, {
			id: e.id,
			enabled: e.enabled,
			settingsOverrides: r
		}) ?? e;
	});
}
//#endregion
//#region src/controls/IndicatorSettingsPopover.tsx
function Zn({ config: e, def: t, onCommit: n, onReset: r, onResetKeys: a, resolveColor: o, onClose: c, className: l, style: u }) {
	let d = s(null);
	i(() => {
		let e = (e) => {
			d.current && !d.current.contains(e.target) && c();
		}, t = (e) => {
			e.key === "Escape" && c();
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [c]);
	let f = tn(e), p = o ?? ((e) => e);
	return /* @__PURE__ */ E("div", {
		className: Y(j.legendPopover, l),
		ref: d,
		style: u,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ E("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ E("span", {
				className: j.legendPopoverTitle,
				children: [t.longLabel ?? t.label, f && /* @__PURE__ */ T("span", {
					className: j.legendPopoverSummary,
					children: f
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
					case "number": return /* @__PURE__ */ T(Pn, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onCommit: (e) => n(t.key, e)
					}, t.key);
					case "enum": return /* @__PURE__ */ T(Fn, {
						spec: t,
						value: Number(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "toggle": return /* @__PURE__ */ T(In, {
						label: t.label,
						value: !!(e.settings[t.key] ?? t.default),
						onChange: (e) => n(t.key, e)
					}, t.key);
					case "color": return /* @__PURE__ */ T(Ln, {
						label: t.label,
						colorExpr: String(e.settings[t.key] ?? t.default),
						isOverridden: t.key in e.settingsOverrides,
						resolveColor: p,
						onCommit: (e) => n(t.key, e),
						onReset: () => r(t.key)
					}, t.key);
					case "line": return /* @__PURE__ */ T(zn, {
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
//#endregion
//#region src/controls/IndicatorLegend.tsx
var Qn = 18;
function $n({ configs: e, top: t, left: n, openId: r, setOpenId: i, onCommit: a, onReset: o, onResetKeys: s, resolveColor: c, onRemove: l, rowsFor: f, toggle: p }) {
	if (e.length === 0 && !p) return null;
	let m = c ?? ((e) => e);
	return /* @__PURE__ */ E("div", {
		className: j.legendBlock,
		style: {
			top: t,
			left: n
		},
		children: [e.map((e) => {
			let t = K(e.defKey);
			if (!t) return null;
			let n = (t.settingsSchema?.length ?? 0) > 0, u = tn(e), d = f(e), p = d[0]?.color ? m(d[0].color) : "transparent", h = d.filter((e) => e.value).map((e) => ({
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
					r === e.id && n && /* @__PURE__ */ T(Zn, {
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
function er({ indicators: e, onIndicatorsChange: t, resolved: n, subpanes: r, marginTop: a, marginLeft: o, barCount: s, expanded: l, onExpandedChange: u, subscribeHoverIndex: d, priceFormatter: f, resolveColor: p }) {
	let [m, h] = c(null), g = () => u((e) => !e), [_, v] = c(null);
	i(() => {
		if (!l) {
			v(null);
			return;
		}
		return d(v);
	}, [l, d]);
	let y = (n, r, i) => t(Yn(e, n.id, r, i)), b = (n, r) => t(Xn(e, n.id, [r])), x = (n, r) => {
		r.length !== 0 && t(Xn(e, n.id, r));
	}, S = (n) => {
		m === n && h(null), t(e.filter((e) => e.id !== n));
	}, C = e.filter((e) => e.enabled), w = C.filter((e) => K(e.defKey)?.pane === "price"), D = (e) => C.filter((t) => {
		let n = K(t.defKey)?.pane;
		return typeof n == "object" && n.subpane === e;
	}), O = _ ?? s - 1, k = (e) => {
		if (O < 0) return [];
		let t = n.find((t) => t.config.id === e.id), r = K(e.defKey);
		return !t || !r ? [] : r.legend(t.series, O, e.settings, { priceFmt: f });
	};
	return /* @__PURE__ */ E("div", {
		className: j.legend,
		"data-chart-legend": "",
		children: [/* @__PURE__ */ T($n, {
			configs: l ? w : [],
			top: a + 8 + Qn,
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
		}), r.map((e) => /* @__PURE__ */ T($n, {
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
//#region src/controls/CandleSettingsPopup.tsx
function tr({ appearance: e, onAppearanceChange: t, resolveColor: n, onClose: r, className: a, style: o }) {
	let c = s(null);
	return i(() => {
		let e = (e) => {
			c.current && !c.current.contains(e.target) && r();
		}, t = (e) => {
			e.key === "Escape" && r();
		};
		return document.addEventListener("mousedown", e), document.addEventListener("keydown", t), () => {
			document.removeEventListener("mousedown", e), document.removeEventListener("keydown", t);
		};
	}, [r]), /* @__PURE__ */ E("div", {
		className: Y(j.legendPopover, a),
		ref: c,
		style: o,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ E("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ T("span", {
				className: j.legendPopoverTitle,
				children: "Candles"
			}), /* @__PURE__ */ T("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: r,
				children: "×"
			})]
		}), /* @__PURE__ */ T("div", {
			className: j.panelScrollBody,
			children: /* @__PURE__ */ T(Wn, {
				appearance: e,
				onAppearanceChange: t,
				resolveColor: n
			})
		})]
	});
}
//#endregion
//#region src/controls/AutoFitMenu.tsx
function nr({ contributors: e, excluded: t, onExcludedChange: n, onClose: r, style: a }) {
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
function rr(e, t, n, r, i) {
	return {
		x: Math.min(Math.max(0, e.x), Math.max(0, t - r)),
		y: Math.min(Math.max(0, e.y), Math.max(0, n - i))
	};
}
function ir(e, t, n) {
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
}, ar = {
	tiny: Q.sizeTiny,
	small: Q.sizeSmall,
	normal: Q.sizeNormal,
	large: Q.sizeLarge
}, or = {
	strong: Q.lvlStrong,
	up: Q.lvlUp,
	neutral: Q.lvlNeutral,
	down: Q.lvlDown,
	text: Q.lvlText,
	muted: Q.lvlMuted
};
function sr({ model: e, size: t, marginRight: n, position: r, onPositionChange: o }) {
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
	let y = d ? ir(d.hostW, d.panelW, n) : null, b = p ?? r ?? y, x = b && d ? rr(b, d.hostW, d.hostH, d.panelW, d.panelH) : b;
	return e.rows.length === 0 ? null : /* @__PURE__ */ T("div", {
		ref: l,
		className: Q.statsHost,
		"data-chart-stats": "",
		children: /* @__PURE__ */ T("div", {
			ref: u,
			className: `${Q.statsPanel} ${ar[t]} ${h ? Q.dragging : ""}`,
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
				!t || e.pointerId !== t.pointerId || (e.stopPropagation(), d && m(rr({
					x: t.startX + (e.clientX - t.mx),
					y: t.startY + (e.clientY - t.my)
				}, d.hostW, d.hostH, d.panelW, d.panelH)));
			},
			onPointerUp: (e) => {
				let t = _.current;
				if (!t || e.pointerId !== t.pointerId || (e.stopPropagation(), !d)) return;
				let n = rr({
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
					className: or[e.cell.level],
					children: e.cell.text
				}) }, t) : /* @__PURE__ */ T("tr", { children: e.cells.map((e, t) => /* @__PURE__ */ T("td", {
					className: or[e.level],
					children: e.text
				}, t)) }, t)) })
			})
		})
	});
}
//#endregion
//#region src/utils/toColumns.ts
var cr = /* @__PURE__ */ new WeakMap();
function lr(e) {
	let t = cr.get(e);
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
	return cr.set(e, c), c;
}
//#endregion
//#region src/stats/computeStats.ts
var ur = {
	text: "",
	level: "muted"
}, dr = 252;
function fr(e) {
	return e < 10 ? e.toFixed(1) : String(Math.round(e));
}
function pr(e) {
	return typeof e == "number" && Number.isFinite(e) && e !== 0 ? e : null;
}
function mr(e, t) {
	return e > 5 * t ? "strong" : e > 4 * t ? "up" : e > 3 * t ? "neutral" : "down";
}
function hr(e, t) {
	let n = (e.length ? e[e.length - 1] : NaN) * 100;
	return Number.isFinite(n) ? {
		text: `${fr(n * .5)} %`,
		level: mr(n, t)
	} : ur;
}
function gr(e, t, n, r = dr) {
	let i = e.length;
	if (i === 0) return { rows: [] };
	let { h: a, l: o, c: s } = lr(e), c = s[i - 1], l = i >= 2 ? s[i - 2] : s[i - 1], u = Number.isFinite(r) && r > 0 ? r : dr, d = (e) => Math.max(1, Math.round(u * e)), f = Math.sqrt(dr / u), p = Ct(a, o, s), m = new Float64Array(i);
	for (let e = 0; e < i; e++) m[e] = p[e] / s[e];
	let h = hr(W(m, d(1 / 2)), f), g = hr(W(m, d(1 / 4)), f), _ = hr(W(m, d(1 / 12)), f), v = t ?? {}, y = (v.sector ?? "").trim(), b = (v.industry ?? "").trim(), x = pr(v.sharesOutstanding), S = pr(v.freeFloatPercent), C = ur;
	if (S !== null) {
		let e = S >= 60 ? "neutral" : S >= 30 ? "up" : S >= 20 ? "neutral" : "down";
		C = {
			text: `${fr(S)} %`,
			level: e
		};
	}
	let w = ur;
	if (x !== null) if (n === "US") {
		let e = x * l / 1e6;
		e !== 0 && Number.isFinite(e) && (w = {
			text: e > 1e3 ? `${fr(e / 1e3)} B` : `${fr(e)} M`,
			level: e >= 2e3 ? "up" : e >= 250 ? "neutral" : "down"
		});
	} else {
		let e = x * l / 1e10;
		if (e !== 0 && Number.isFinite(e)) {
			let t = e >= 5 ? "up" : e >= 1 ? "neutral" : "down";
			w = {
				text: `${fr(e)} K`,
				level: t
			};
		}
	}
	let T = ur;
	if (typeof v.eps == "number" && Number.isFinite(v.eps)) {
		let e = H(v.eps);
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
//#endregion
//#region src/indicators/subpaneLayout.ts
function _r(e) {
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
function vr(e) {
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
function yr(e) {
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
function br(e, t) {
	let { hRatio: n, vRatio: r } = t, i = [];
	e.setTransform(n, 0, 0, r, 0, 0), e.clearRect(0, 0, t.cssWidth, t.cssHeight);
	let a = t.fullHeight + t.marginTop + t.marginBottom, o = e.createLinearGradient(0, a, 0, 0);
	return o.addColorStop(0, t.background.bottomColor), o.addColorStop(1, t.background.topColor), e.save(), e.fillStyle = o, e.beginPath(), e.roundRect(0, 0, t.cssWidth, a, t.background.radius), e.fill(), e.restore(), e.save(), xr(e, t, t.marginTop + t.priceHeight), Fr(e, t, !1, i), t.chartType === "bar" ? Pr(e, t, i) : Tr(e, t, i), e.restore(), e.save(), xr(e, t, t.marginTop + t.fullHeight + t.marginBottom), Fr(e, t, !0, i), e.restore(), i;
}
function xr(e, t, n) {
	let r = Math.round(t.marginLeft * t.hRatio), i = Math.round((t.marginLeft + t.width - t.rightBuffer) * t.hRatio), a = Math.round(n * t.vRatio);
	e.setTransform(1, 0, 0, 1, 0, 0), e.beginPath(), e.rect(r, 0, i - r, a), e.clip(), e.setTransform(t.hRatio, 0, 0, t.vRatio, 0, 0), e.translate(t.marginLeft + t.baseTranslateX, t.marginTop);
}
var Sr = (e) => (e.marginLeft + e.baseTranslateX) * e.hRatio, Cr = (e) => e.marginTop * e.vRatio;
function wr(e, t, n) {
	e.fillStyle = t;
	for (let t of n) e.fillRect(t[0], t[1], t[2], t[3]);
}
function Tr(e, t, n) {
	let { xScale: r, yPrice: i, bandwidth: a, renderStart: o, renderSlice: s, colors: c } = t, l = Sr(t), u = Cr(t), d = Math.max(1, Math.floor(t.vRatio)), f = Math.max(1, Math.round(a));
	f % 2 == 0 && (f = Math.max(1, f - 1));
	let p = Math.max(1, Math.round(f * t.hRatio)), m = Math.min(p, Math.max(Math.max(1, Math.floor(t.hRatio)), Math.round(p * yn))), h = [], g = [];
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
	e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.globalAlpha = t.candle.opacity, wr(e, c.positive, h), wr(e, c.negative, g), e.restore(), n.push(Er(t, p / (2 * t.hRatio)));
}
function Er(e, t) {
	return {
		sourceId: dn,
		spanAt: (t) => {
			let n = e.data[t];
			return n ? [e.yPrice(n.high), e.yPrice(n.low)] : null;
		},
		halfWidth: t,
		interpolate: !1
	};
}
var Dr = 2, Or = 2, kr = 6;
function Ar(e, t, n, r) {
	let i = e * Dr, a = e * t, o = Or;
	for (let e of n) i >= e && o++;
	let s = Math.max(Math.max(1, Math.floor(t)), Math.round(o * t / Dr)), c = Math.round(r * a);
	return {
		markW: s,
		sideW: Math.max(s, c - Math.floor(s / 2)),
		drawTicks: i >= kr
	};
}
function jr(e, t, n, r) {
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
function Mr(e, t, n) {
	let r = Sr(e) + (e.xScale(n) + e.bandwidth / 2) * e.hRatio, i = Math.min(t.markW + 2 * t.sideW, Math.max(t.markW, Math.floor(e.step * e.hRatio)));
	return {
		left: Math.round(r - i / 2),
		width: i
	};
}
function Nr(e) {
	return Ar(e.step, e.hRatio, _n, vn);
}
function Pr(e, t, n) {
	let { xScale: r, yPrice: i, bandwidth: a, renderStart: o, renderSlice: s, colors: c } = t, l = Nr(t), u = Sr(t), d = Cr(t), f = (e) => Math.round(d + i(e) * t.vRatio), p = [], m = [];
	for (let e = 0; e < s.length; e++) {
		let n = e + o, i = s[e], c = u + (r(n) + a / 2) * t.hRatio;
		(i.close >= i.open ? p : m).push(...jr(i, c, l, f));
	}
	e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.globalAlpha = t.candle.opacity, wr(e, c.positive, p), wr(e, c.negative, m), e.restore();
	let h = Mr(t, l, t.renderStart).width;
	n.push(Er(t, h / (2 * t.hRatio)));
}
function Fr(e, t, n, r) {
	if (t.indicators.length === 0) return;
	let i = Nr(t), a = (e) => Mr(t, i, e), o = Sr(t), s = Cr(t);
	for (let { config: i, series: c, meta: l } of t.indicators) {
		let u = K(i.defKey);
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
//#region src/utils/resolveChartColors.ts
var Ir = "#888888";
function Lr(e) {
	let t = document.createElement("span");
	t.style.position = "absolute", t.style.width = "0", t.style.height = "0", t.style.visibility = "hidden", t.style.pointerEvents = "none", e.appendChild(t);
	let n = /* @__PURE__ */ new Map();
	return {
		resolve(e) {
			let r = n.get(e);
			if (r) return r;
			let i = Ir;
			try {
				t.style.color = "", t.style.color = e;
				let n = getComputedStyle(t).color;
				n && (i = n);
			} catch {
				i = Ir;
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
var Rr = 8, zr = 4, Br = 10, Vr = 6;
function Hr(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function Ur(e, t, n, r) {
	let i = e.markers;
	if (!Array.isArray(i?.levels) || i.levels.length === 0) return;
	let a = r.patternStyle.base_breakout, o = r.resolveColor, s = a.labelFontSize, c = null;
	for (let e of i.levels) {
		let n = A(r.bars, e.start), i = A(r.bars, e.end);
		if (n == null || i == null) continue;
		let s = Hr(n, r), l = Hr(i, r);
		if (s == null || l == null) continue;
		let u = r.yPrice(e.price), d = s + r.bandwidth / 2, f = l + r.bandwidth / 2;
		c = f, t.append("line").attr("class", "bb-resistance").attr("x1", d).attr("y1", u).attr("x2", f).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-dasharray", a.lineDash).attr("stroke-linecap", "round"), t.append("circle").attr("class", "bb-breakout-dot").attr("cx", f).attr("cy", u).attr("r", 3).attr("fill", o(a.dotFill));
		let p = Hr(Math.round((n + i) / 2), r);
		if (p != null && typeof e.base_days == "number" && typeof e.base_depth_pct == "number") {
			let n = p + r.bandwidth / 2, i = u - Vr;
			t.append("text").attr("class", "bb-stat").attr("x", n).attr("y", i).attr("text-anchor", "middle").attr("font-size", Br).attr("fill", o(a.statColor)).attr("font-weight", 600).text(`${Math.round(e.base_days)}d · ${e.base_depth_pct.toFixed(1)}%`);
		}
	}
	let l = i.levels[0], u = r.yPrice(l.price), d = (Hr(r.dataLength - 1, r) ?? c ?? 0) + r.bandwidth + 2 * r.step + 4, f = s + 2 * zr, p = n.append("g").attr("class", "bb-label").attr("transform", `translate(${d},${u - f / 2})`), m = p.append("text").attr("class", "bb-label-text").attr("x", Rr).attr("y", f / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text("Base breakout").node(), h = (m ? m.getBBox().width : 91) + 2 * Rr;
	p.insert("rect", "text").attr("class", "bb-label-bg").attr("x", 0).attr("y", 0).attr("width", h).attr("height", f).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
//#endregion
//#region src/patterns/renderers/consolidation.ts
var Wr = 8, Gr = 4;
function Kr(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function qr(e, t, n, r) {
	let i = e.markers;
	if (!i?.start_date || !i?.end_date || !Number.isFinite(i.range_high) || !Number.isFinite(i.range_low)) return;
	let a = r.patternStyle.consolidation, o = r.resolveColor, s = a.labelFontSize, c = A(r.bars, i.start_date), l = A(r.bars, i.end_date);
	if (c == null || l == null) return;
	let u = Kr(c, r), d = Kr(l, r);
	if (u == null || d == null) return;
	let f = u, p = d + r.bandwidth, m = r.yPrice(Math.max(i.range_high, i.range_low)), h = r.yPrice(Math.min(i.range_high, i.range_low));
	t.append("rect").attr("class", "consol-box").attr("x", f).attr("y", m).attr("width", Math.max(0, p - f)).attr("height", Math.max(0, h - m)).attr("fill", o(a.boxFill)).attr("fill-opacity", a.boxFillOpacity).attr("stroke", "none");
	let g = i.consolidation_days, _ = i.range_low > 0 ? (i.range_high - i.range_low) / i.range_low * 100 : null, v = ["Consolidation"];
	typeof g == "number" && v.push(`${Math.round(g)}d`), _ != null && v.push(`${_.toFixed(1)}%`);
	let y = v.join(" · ");
	typeof i.tightness == "number" && Number.isFinite(i.tightness) && (y += ` (${i.tightness.toFixed(2)}x ATR)`);
	let b = s + 2 * Gr, x = n.append("g").attr("class", "consol-label").style("display", "none"), S = (x.append("text").attr("class", "consol-label-text").attr("x", Wr).attr("y", b / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text(y).node()?.getBBox().width ?? y.length * 7) + 2 * Wr, C = (f + p) / 2;
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
var Jr = 8, Yr = 4;
function Xr(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function Zr(e, t, n, r) {
	let i = e.markers;
	if (!i?.segments?.pole || !i?.segments?.flag) return;
	let a = r.patternStyle.high_tight_flag, o = r.resolveColor, s = a.labelFontSize, c = A(r.bars, i.segments.pole[0]), l = A(r.bars, i.segments.pole[1]), u = A(r.bars, i.segments.flag[0]), d = A(r.bars, i.segments.flag[1]);
	if (c == null || l == null || u == null || d == null) return;
	let f = Xr(c, r), p = Xr(l, r), m = Xr(u, r), h = Xr(d, r);
	if (f == null || p == null || m == null || h == null) return;
	let g = r.bars[c], _ = r.bars[l], v = r.yPrice(g.high), y = r.yPrice(_.high), b = -Infinity, x = Infinity;
	for (let e = u; e <= d; e++) {
		let t = r.bars[e];
		t.high > b && (b = t.high), t.low < x && (x = t.low);
	}
	if (!Number.isFinite(b) || !Number.isFinite(x)) return;
	let S = m, C = h + r.bandwidth, w = r.yPrice(b), T = r.yPrice(x), E = f + r.bandwidth / 2, D = p + r.bandwidth / 2;
	t.append("line").attr("class", "htf-pole").attr("x1", E).attr("y1", v).attr("x2", D).attr("y2", y).attr("stroke", o(a.poleColor)).attr("stroke-opacity", a.poleOpacity).attr("stroke-width", a.poleWidth).attr("stroke-linecap", "round"), t.append("rect").attr("class", "htf-flag").attr("x", S).attr("y", w).attr("width", Math.max(0, C - S)).attr("height", Math.max(0, T - w)).attr("fill", o(a.flagFill)).attr("fill-opacity", a.flagFillOpacity).attr("stroke", "none");
	let O = i.score, k = O != null && Number.isFinite(O) ? ` ${Math.round(O)}%` : "", ee = i.tier === "high" ? "High" : i.tier === "low" ? "Low" : null, te = `${ee ? `${ee} tight flag` : "Tight flag"}${k}`, ne = (Xr(r.dataLength - 1, r) ?? C) + r.bandwidth + 2 * r.step + 4, re = n.append("g").attr("class", "htf-label").attr("transform", `translate(${ne},${w})`), ie = s + 2 * Yr, ae = re.append("text").attr("class", "htf-label-text").attr("x", Jr).attr("y", ie / 2).attr("dominant-baseline", "central").attr("font-size", s).attr("fill", o(a.labelTextColor)).attr("font-weight", 600).text(te).node(), oe = (ae ? ae.getBBox().width : te.length * 7) + 2 * Jr;
	re.insert("rect", "text").attr("class", "htf-label-bg").attr("x", 0).attr("y", 0).attr("width", oe).attr("height", ie).attr("rx", 3).attr("fill", o(a.labelBg)).attr("fill-opacity", a.labelBgOpacity);
}
var Qr = (e) => e + 8;
function $r(e, t) {
	if (t.dataLength === 0) return null;
	if (e >= 0 && e < t.dataLength) return t.xScale(e) ?? null;
	if (e >= t.dataLength) {
		let n = t.xScale(t.dataLength - 1) ?? null;
		return n == null ? null : n + (e - (t.dataLength - 1)) * t.step;
	}
	return null;
}
function ei(e, t) {
	let { x: n, y: r, text: i, style: a, rc: o, center: s = !1, className: c } = t, l = a.labelFontSize, u = Qr(l), d = e.append("g");
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
function ti(e, t) {
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
var ni = 3;
function ri(e, t, n, r) {
	let i = e.markers;
	if (!i?.gap_date || !Number.isFinite(i.prev_high) || !Number.isFinite(i.gap_low)) return;
	let a = r.patternStyle.gap_up, o = r.resolveColor, s = A(r.bars, i.gap_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth + ni * r.step, u = r.yPrice(Math.max(i.prev_high, i.gap_low)), d = r.yPrice(Math.min(i.prev_high, i.gap_low));
	t.append("rect").attr("class", "gap-up-band").attr("x", c).attr("y", u).attr("width", Math.max(0, l - c)).attr("height", Math.max(0, d - u)).attr("fill", o(a.bandFill)).attr("fill-opacity", a.bandFillOpacity).attr("stroke", "none");
	let f = typeof i.gap_pct == "number" && Number.isFinite(i.gap_pct) ? ` · ${i.gap_pct.toFixed(1)}%` : "", p = (u + d) / 2;
	ei(n, {
		x: l + 6,
		y: p - Qr(a.labelFontSize) / 2,
		text: `Gap up${f}`,
		style: a,
		rc: o,
		className: "gap-up-label"
	});
}
//#endregion
//#region src/patterns/renderers/volumeBreakout.ts
var ii = 6;
function ai(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_breakout, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + ii;
	ti(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	ei(n, {
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
function oi(e, t, n, r) {
	let i = e.markers;
	if (!i?.cross_date || !Number.isFinite(i.cross_price)) return;
	let a = r.patternStyle.golden_cross, o = r.resolveColor, s = A(r.bars, i.cross_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.cross_price);
	ti(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	}), ei(n, {
		x: l + 6 + 4,
		y: u - Qr(a.labelFontSize) / 2,
		text: "Golden cross",
		style: a,
		rc: o,
		className: "golden-cross-label"
	});
}
//#endregion
//#region src/patterns/renderers/nr7.ts
var si = 4;
function ci(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.bar_high) || !Number.isFinite(i.bar_low)) return;
	let a = r.patternStyle.nr7, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth, u = c + r.bandwidth / 2, d = r.yPrice(i.bar_high), f = r.yPrice(i.bar_low);
	for (let e of [d, f]) t.append("line").attr("class", "nr7-range").attr("x1", c).attr("y1", e).attr("x2", l).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let p = d - si;
	ti(t, {
		x: u,
		y: p,
		kind: "arrowDown",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), ei(n, {
		x: u,
		y: p - 6 * 1.6 - Qr(a.labelFontSize) - 2,
		text: "NR7",
		style: a,
		rc: o,
		center: !0,
		className: "nr7-label"
	});
}
//#endregion
//#region src/patterns/renderers/unusualVolume.ts
var li = 8;
function ui(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.unusual_volume, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + li;
	ti(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	});
	let d = typeof i.volume_ratio == "number" && Number.isFinite(i.volume_ratio) ? ` · ${i.volume_ratio.toFixed(1)}x` : "";
	ei(n, {
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
var di = 8;
function fi(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.volume_dryup, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + di;
	ti(t, {
		x: l,
		y: u,
		kind: "diamond",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), ei(n, {
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
var pi = 6;
function mi(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.anchor_low)) return;
	let a = r.patternStyle.pocket_pivot, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.anchor_low) + pi;
	ti(t, {
		x: l,
		y: u,
		kind: "arrowUp",
		color: a.markerColor,
		opacity: a.markerOpacity,
		rc: o
	}), ei(n, {
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
function hi(e, t, n, r) {
	let i = e.markers;
	if (!i?.inside_date || !i?.mother_date || !Number.isFinite(i.inside_high) || !Number.isFinite(i.inside_low) || !Number.isFinite(i.mother_high) || !Number.isFinite(i.mother_low)) return;
	let a = r.patternStyle.inside_day, o = r.resolveColor, s = A(r.bars, i.mother_date), c = A(r.bars, i.inside_date);
	if (s == null || c == null) return;
	let l = $r(s, r), u = $r(c, r);
	if (l == null || u == null) return;
	let d = l, f = u + r.bandwidth, p = r.yPrice(i.mother_high), m = r.yPrice(i.mother_low);
	for (let e of [p, m]) t.append("line").attr("class", "inside-day-mother").attr("x1", d).attr("y1", e).attr("x2", f).attr("y2", e).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round");
	let h = r.yPrice(Math.max(i.inside_high, i.inside_low)), g = r.yPrice(Math.min(i.inside_high, i.inside_low));
	t.append("rect").attr("class", "inside-day-box").attr("x", u).attr("y", h).attr("width", Math.max(0, r.bandwidth)).attr("height", Math.max(0, g - h)).attr("fill", "none").attr("stroke", o(a.boxStroke)).attr("stroke-opacity", a.boxStrokeOpacity).attr("stroke-width", a.boxStrokeWidth), ei(n, {
		x: f + 6,
		y: p - Qr(a.labelFontSize) / 2,
		text: "Inside day",
		style: a,
		rc: o,
		className: "inside-day-label"
	});
}
//#endregion
//#region src/patterns/renderers/pullbackToEma.ts
function gi(e, t, n, r) {
	let i = e.markers;
	if (!i?.event_date || !Number.isFinite(i.ema_value)) return;
	let a = r.patternStyle.pullback_to_ema, o = r.resolveColor, s = A(r.bars, i.event_date);
	if (s == null) return;
	let c = $r(s, r);
	if (c == null) return;
	let l = c + r.bandwidth / 2, u = r.yPrice(i.ema_value);
	t.append("line").attr("class", "pullback-ema-tick").attr("x1", c).attr("y1", u).attr("x2", c + r.bandwidth).attr("y2", u).attr("stroke", o(a.lineColor)).attr("stroke-opacity", a.lineOpacity).attr("stroke-width", a.lineWidth).attr("stroke-linecap", "round"), ti(t, {
		x: l,
		y: u,
		kind: "dot",
		color: a.dotFill,
		rc: o
	});
	let d = i.ema_level ? ` ${i.ema_level}` : "";
	ei(n, {
		x: l + 6 + 4,
		y: u - Qr(a.labelFontSize) / 2,
		text: `Pullback to${d}`,
		style: a,
		rc: o,
		className: "pullback-ema-label"
	});
}
//#endregion
//#region src/patterns/renderers/index.ts
var _i = {
	high_tight_flag: Zr,
	base_breakout: Ur,
	consolidation: qr,
	gap_up: ri,
	volume_breakout: ai,
	golden_cross: oi,
	nr7: ci,
	unusual_volume: ui,
	volume_dryup: fi,
	pocket_pivot: mi,
	inside_day: hi,
	pullback_to_ema: gi
}, vi = (e) => `${e.pattern_name}:${e.detected_on}`;
function yi(e) {
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
		let t = r.selectAll("g.chart-pattern-detection").data(e.detections, vi);
		t.exit().remove();
		let n = t.enter().append("g").attr("class", "chart-pattern-detection").style("pointer-events", "none").merge(t), i = a.selectAll("g.chart-pattern-label-detection").data(e.detections, vi);
		i.exit().remove();
		let o = i.enter().append("g").attr("class", "chart-pattern-label-detection").style("pointer-events", "none").merge(i);
		n.each(function(t, n) {
			let r = D.select(this), i = D.select(o.nodes()[n]);
			r.selectAll("*").remove(), i.selectAll("*").remove();
			let a = _i[t.pattern_name];
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
var bi = {
	trendline: 2,
	ray: 2,
	ruler: 2,
	hline: 1,
	vline: 1,
	hray: 1,
	text: 1
};
function xi(e) {
	return bi[e];
}
function Si(e, t, n) {
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
function Ci(e, t, n) {
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
		if (t.length >= xi(e.tool)) {
			let n = Si(e.tool, t, i());
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
		if (xi(e) === 1) {
			let t = Si(e, [a], i());
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
function wi(e, t) {
	if (t.dataLength === 0) return 0;
	let n = A(t.data, e);
	return n == null ? e < t.data[0].date ? (t.xScale(0) ?? 0) + t.bandwidth / 2 : (t.xScale(t.dataLength - 1) ?? 0) + t.bandwidth / 2 + De(t.data, e) * t.step : (t.xScale(n) ?? 0) + t.bandwidth / 2;
}
function Ti(e, t) {
	let n = t.yPrice(e);
	return Number.isFinite(n) ? n : t.priceHeight;
}
function Ei(e, t) {
	if (t.dataLength === 0) return "";
	let n = t.xScale(0) ?? 0, r = Math.round((e - n - t.bandwidth / 2) / t.step);
	if (r < 0 && (r = 0), r <= t.dataLength - 1) return t.data[r].date;
	let i = Math.max(0, Math.ceil(t.width / t.step)), a = Math.min(r - (t.dataLength - 1), i);
	return Ee(t.data, a);
}
function Di(e, t) {
	return t.yPrice.invert(e);
}
function Oi(e, t) {
	return {
		x: wi(e.date, t),
		y: Ti(e.price, t)
	};
}
function ki(e, t, n, r) {
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
//#region src/drawings/renderers/_shared.ts
function Ai(e, t) {
	return e === 1 ? `${Math.max(4, t * 3)},${Math.max(3, t * 2)}` : e === 2 ? `${Math.max(1, t)},${Math.max(2, t * 2)}` : null;
}
function ji(e) {
	return En(e.style);
}
function Mi(e, t, n, r) {
	e.append("circle").attr("cx", t).attr("cy", n).attr("r", 5).attr("fill", "#ffffff").attr("stroke", r).attr("stroke-width", 1.5).style("pointer-events", "none");
}
function Ni(e, t, n) {
	let r = Ai(t.style, t.width);
	e.attr("stroke", n(t.color)).attr("stroke-width", t.width).attr("stroke-opacity", t.opacity).attr("stroke-linecap", "round").style("pointer-events", "none"), r ? e.attr("stroke-dasharray", r) : e.attr("stroke-dasharray", null);
}
//#endregion
//#region src/drawings/renderers/trendline.ts
function Pi(e, t, n) {
	let r = ji(e), i = Oi(e.a, n.s), a = Oi(e.b, n.s);
	if (Ni(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a.x).attr("y2", a.y), r, n.resolveColor), n.selected) {
		let e = n.resolveColor(r.color);
		Mi(t.label, i.x, i.y, e), Mi(t.label, a.x, a.y, e);
	}
	return (e, t, n) => sn(e - n, t, i, a);
}
//#endregion
//#region src/drawings/renderers/ray.ts
function Fi(e, t, n) {
	let r = ji(e), i = Oi(e.a, n.s), a = Oi(e.b, n.s), o = ki(i, a, n.s.width, n.s.priceHeight);
	if (Ni(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", o.x2).attr("y2", o.y2), r, n.resolveColor), n.selected) {
		let e = n.resolveColor(r.color);
		Mi(t.label, i.x, i.y, e), Mi(t.label, a.x, a.y, e);
	}
	return (e, t, n) => {
		let r = e - n, s = sn(r, t, i, a);
		return s && s.kind === "handle" ? s : on(r, t, i.x, i.y, o.x2, o.y2) <= 6 ? { kind: "body" } : null;
	};
}
//#endregion
//#region src/drawings/renderers/hline.ts
function Ii(e, t, n) {
	let r = ji(e), i = Ti(e.price, n.s);
	if (i >= -2 && i <= n.s.priceHeight + 2) {
		let e = t.flat.append("line").attr("x1", 0).attr("y1", i).attr("x2", n.s.width).attr("y2", i);
		Ni(e, r, n.resolveColor), n.selected && e.attr("stroke-width", r.width + 1.5);
	}
	return (e, t) => cn(e, t, i, n.s.width);
}
//#endregion
//#region src/drawings/renderers/vline.ts
function Li(e, t, n) {
	let r = ji(e), i = wi(e.date, n.s), a = t.pan.append("line").attr("x1", i).attr("y1", 0).attr("x2", i).attr("y2", n.s.priceHeight);
	return Ni(a, r, n.resolveColor), n.selected && a.attr("stroke-width", r.width + 1.5), (e, t, r) => ln(e - r, t, i, n.s.priceHeight);
}
//#endregion
//#region src/drawings/renderers/hray.ts
function Ri(e, t, n) {
	let r = ji(e), i = Oi(e.a, n.s), a = i.x + Math.max(n.s.width * 3, (n.s.dataLength + 50) * n.s.step);
	return Ni(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a).attr("y2", i.y), r, n.resolveColor), n.selected && Mi(t.label, i.x, i.y, n.resolveColor(r.color)), (e, t, n) => un(e - n, t, i, {
		x: a,
		y: i.y
	});
}
//#endregion
//#region src/drawings/rulerStats.ts
function zi(e, t) {
	return A(e, t) ?? (e.length > 0 && t > e[e.length - 1].date ? e.length - 1 + De(e, t) : null);
}
function Bi(e, t, n) {
	let r = zi(n, e.date), i = zi(n, t.date), a = r != null && i != null ? Math.abs(i - r) : 0, o = t.price - e.price, s = e.price === 0 ? 0 : o / e.price * 100, c = o > 0 ? "up" : o < 0 ? "down" : "flat";
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
function Vi(e, t, n) {
	let r = ji(e), i = Oi(e.a, n.s), a = Oi(e.b, n.s), o = n.resolveColor;
	Ni(t.pan.append("line").attr("x1", i.x).attr("y1", i.y).attr("x2", a.x).attr("y2", a.y), r, o);
	let s = Bi(e.a, e.b, n.s.data), c = s.priceDelta >= 0 ? "+" : "", l = `${s.bars} bars  ${c}${s.priceDelta.toFixed(2)} (${c}${s.pricePct.toFixed(2)}%)`, u = t.label.append("g").attr("transform", `translate(${a.x + 8},${a.y - 18 - 4})`).style("pointer-events", "none"), d = u.append("text").attr("x", 6).attr("y", 4).attr("dominant-baseline", "hanging").attr("font-size", 10).attr("font-weight", 600).attr("fill", "#ffffff").text(l).node()?.getBBox().width ?? l.length * 6;
	if (u.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", d + 12).attr("height", 18).attr("rx", 3).attr("fill", o(r.color)).attr("fill-opacity", .85), n.selected) {
		let e = o(r.color);
		Mi(t.label, i.x, i.y, e), Mi(t.label, a.x, a.y, e);
	}
	return (e, t, n) => sn(e - n, t, i, a);
}
//#endregion
//#region src/drawings/renderers/text.ts
function Hi(e, t, n) {
	let r = ji(e), i = n.resolveColor, a = Oi(e.a, n.s), o = r.text || "Text", s = t.label.append("g").attr("transform", `translate(${a.x},${a.y})`).style("pointer-events", "none"), c = (s.append("text").attr("x", 6).attr("y", 4).attr("dominant-baseline", "hanging").attr("font-size", r.fontSize).attr("fill", i(r.color)).text(o).node()?.getBBox().width ?? o.length * 7) + 12, l = r.fontSize + 8;
	s.insert("rect", "text").attr("x", 0).attr("y", 0).attr("width", c).attr("height", l).attr("rx", 3).attr("fill", i(r.bgColor)).attr("fill-opacity", r.bgOpacity).attr("stroke", n.selected ? i(r.color) : "none").attr("stroke-width", +!!n.selected), n.selected && Mi(t.label, a.x, a.y, i(r.color));
	let u = {
		x: a.x,
		y: a.y,
		width: c,
		height: l
	};
	return (e, t, n) => q(e - n, t, u);
}
//#endregion
//#region src/drawings/renderers/index.ts
function Ui(e, t, n) {
	switch (e.type) {
		case "trendline": return Pi(e, t, n);
		case "ray": return Fi(e, t, n);
		case "hline": return Ii(e, t, n);
		case "vline": return Li(e, t, n);
		case "hray": return Ri(e, t, n);
		case "ruler": return Vi(e, t, n);
		case "text": return Hi(e, t, n);
		default: return () => null;
	}
}
//#endregion
//#region src/drawings/mountChartDrawingOverlay.ts
function Wi(e) {
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
			let i = Ui(r, n, {
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
			let r = xi(e.draft.tool), i = [...e.draft.anchors];
			for (; i.length < r;) i.push(e.draftPointer);
			Ui(Si(e.draft.tool, i, "__draft__"), n, {
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
var Gi = {
	drawingPopup: "_drawingPopup_1hh6n_3",
	drawingDeleteBtn: "_drawingDeleteBtn_1hh6n_21"
}, Ki = {
	trendline: "Trend line",
	hline: "Horizontal line",
	vline: "Vertical line",
	hray: "Horizontal ray",
	ray: "Ray",
	text: "Text",
	ruler: "Ruler"
};
function qi({ shape: e, onChange: t, onDelete: n, resolveColor: r, onClose: a, className: o, style: l }) {
	let u = s(null), d = s(null), f = En(e.style), p = e.type === "text";
	i(() => {
		let e = performance.now(), t = (t) => {
			t.timeStamp <= e || u.current && !u.current.contains(t.target) && a();
		}, n = (e) => {
			e.key === "Escape" && a();
		};
		return document.addEventListener("mousedown", t), document.addEventListener("keydown", n), () => {
			document.removeEventListener("mousedown", t), document.removeEventListener("keydown", n);
		};
	}, [a]), i(() => {
		p && !e.style?.text && d.current?.focus();
	}, [e.id]);
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
	}, [g, _] = c(e.style?.text ?? "");
	return i(() => _(e.style?.text ?? ""), [e.id, e.style?.text]), /* @__PURE__ */ E("div", {
		className: Y(Gi.drawingPopup, o),
		ref: u,
		style: l,
		"data-chart-wheel-scroll": !0,
		children: [/* @__PURE__ */ E("div", {
			className: j.legendPopoverHeader,
			children: [/* @__PURE__ */ T("span", {
				className: j.legendPopoverTitle,
				children: Ki[e.type]
			}), /* @__PURE__ */ T("button", {
				type: "button",
				className: j.legendPopoverClose,
				title: "Close",
				onClick: a,
				children: "×"
			})]
		}), /* @__PURE__ */ E("div", {
			className: j.panelScrollBody,
			children: [p ? /* @__PURE__ */ E(w, { children: [
				/* @__PURE__ */ E("label", {
					className: j.legendPopoverField,
					children: [/* @__PURE__ */ T("span", { children: "Text" }), /* @__PURE__ */ T("input", {
						ref: d,
						type: "text",
						value: g,
						spellCheck: !1,
						autoComplete: "off",
						onChange: (e) => {
							_(e.target.value), m({ text: e.target.value });
						}
					})]
				}),
				/* @__PURE__ */ T(Ln, {
					label: "Text color",
					colorExpr: e.style?.color ?? f.color,
					isOverridden: e.style?.color !== void 0,
					resolveColor: r,
					onCommit: (e) => m({ color: e }),
					onReset: () => h("color")
				}),
				/* @__PURE__ */ T(Pn, {
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
				/* @__PURE__ */ T(Ln, {
					label: "Background",
					colorExpr: e.style?.bgColor ?? f.bgColor,
					isOverridden: e.style?.bgColor !== void 0,
					resolveColor: r,
					onCommit: (e) => m({ bgColor: e }),
					onReset: () => h("bgColor")
				}),
				/* @__PURE__ */ T(Rn, {
					label: "Background opacity",
					value: f.bgOpacity,
					onCommit: (e) => m({ bgOpacity: e })
				})
			] }) : /* @__PURE__ */ E(w, { children: [
				/* @__PURE__ */ T(Ln, {
					label: "Color",
					colorExpr: e.style?.color ?? f.color,
					isOverridden: e.style?.color !== void 0,
					resolveColor: r,
					onCommit: (e) => m({ color: e }),
					onReset: () => h("color")
				}),
				/* @__PURE__ */ T(Pn, {
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
				/* @__PURE__ */ T(Fn, {
					spec: {
						key: "style",
						label: "Style",
						kind: "enum",
						default: f.style,
						options: I
					},
					value: f.style,
					onChange: (e) => m({ style: e })
				}),
				/* @__PURE__ */ T(Rn, {
					label: "Opacity",
					value: f.opacity,
					onCommit: (e) => m({ opacity: e })
				})
			] }), /* @__PURE__ */ E("button", {
				type: "button",
				className: Gi.drawingDeleteBtn,
				onClick: n,
				children: [/* @__PURE__ */ T(x, { size: 13 }), " Delete"]
			})]
		})]
	});
}
//#endregion
//#region src/context.tsx
function Ji() {
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
var Yi = t(null), Xi = Yi.Provider;
function Zi() {
	let e = r(Yi);
	if (!e) throw Error("useChartScale must be used within a <Chart> (ChartScaleProvider)");
	return e;
}
var Qi = t(null), $i = Qi.Provider;
function ea() {
	let e = r(Qi);
	if (!e) throw Error("chart overlay hooks must be used within a <Chart> (ChartOverlayProvider)");
	return e;
}
function ta(e) {
	let t = ea();
	return e === "trade" ? t.tradeHost : t.triggerHost;
}
function na() {
	let e = ea();
	return {
		priceBottomPx: e.priceBottomPx,
		marginRight: e.marginRight
	};
}
function ra() {
	return ea().reportOverlayPriceBounds;
}
function ia() {
	return ea().subscribeBackgroundPointerDown;
}
//#endregion
//#region src/Chart.tsx
var $ = {
	top: 4,
	right: 60,
	bottom: 30,
	left: 0
}, aa = "'Helvetica Neue', Helvetica, Arial, sans-serif", oa = .13, sa = .45, ca = 24, la = .08, ua = 18, da = 12, fa = "currentColor", pa = 56, ma = 10, ha = "var(--chart-tooltip-label)", ga = D.format(",.0f"), _a = 1.04, va = 700;
function ya(e, t, n) {
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
function ba(e, t, n, r) {
	let i = Oi(e, r);
	return {
		date: Ei(i.x + t, r),
		price: Di(i.y + n, r)
	};
}
function xa(e, t, n, r) {
	switch (e.type) {
		case "trendline":
		case "ray":
		case "ruler": return {
			...e,
			a: ba(e.a, t, n, r),
			b: ba(e.b, t, n, r)
		};
		case "hray":
		case "text": return {
			...e,
			a: ba(e.a, t, n, r)
		};
		case "hline": return {
			...e,
			price: Di(Ti(e.price, r) + n, r)
		};
		case "vline": return {
			...e,
			date: Ei(wi(e.date, r) + t, r)
		};
		default: return e;
	}
}
var Sa = e.memo(({ data: e, warmupSeed: t, benchmarkClose: r, quarterlyResults: u, subpaneHeights: d = null, onSubpaneHeightsChange: f, visibleBars: p, onVisibleBarsChange: h, onMaxVisibleBarsChange: g, onRangeMarksChange: v, panOffset: b, onPanOffsetChange: x, chartType: S, indicators: C, onIndicatorsChange: O, autoFitMode: k, onAutoFitModeChange: ee, autoFitExcluded: te, onAutoFitExcludedChange: ne, infoBarExpanded: re, onInfoBarExpandedChange: ie, symbol: ae, bare: oe, priceFormatter: se, patterns: ce, patternsEnabled: le, visiblePatterns: ve, statsTable: ye, statsEnabled: be, statsMarket: xe = "India", statsPosition: Se = null, onStatsPositionChange: A, statsSize: Ce = "small", appearance: we, onAppearanceChange: Te, drawings: Ee, onDrawingsChange: De, activeDrawingTool: Oe = "cursor", onActiveDrawingToolChange: ke, children: M }) => {
	let N = s(null), Ae = s(null), P = s(null), je = s(null), Me = s({
		cssWidth: 0,
		cssHeight: 0,
		suggested: null
	}), F = s(null), [I, Ne] = c(0), [L, Pe] = c(0);
	a(() => {
		let e = N.current;
		if (!e) return;
		let t = e.getBoundingClientRect();
		t.width && Ne(t.width), t.height && Pe(t.height);
	}, []);
	let Fe = e?.length ?? 0, R = o(() => Cn(we), [we]), Ie = o(() => JSON.stringify(R.colors), [R]), Le = o(() => JSON.stringify(R.background), [R]), Re = o(() => JSON.stringify(R.candle), [R]), ze = o(() => JSON.stringify(R.axis), [R]), Be = o(() => JSON.stringify(R.crosshair), [R]), Ve = o(() => JSON.stringify(R.patterns), [R]), [He, Ue] = c(0), [We, Ge] = c(!1), [Ke, qe] = c(null), Je = n((e) => {
		Ge(!1), qe(e);
	}, []), Ye = n(() => qe(null), []), Xe = s(Je);
	Xe.current = Je;
	let Ze = s(!1);
	Ze.current = Te != null;
	let Qe = s(null);
	Qe.current ||= Ji();
	let z = Qe.current.api, $e = Qe.current.notify, et = se ?? ga, tt = s(et);
	i(() => {
		tt.current = et;
	}, [et]);
	let nt = o(() => Fe > 0 ? D.range(Fe) : [], [Fe]), rt = o(() => {
		let e = /* @__PURE__ */ new Set();
		for (let t of C) {
			if (!t.enabled) continue;
			let n = K(t.defKey)?.pane;
			n && typeof n == "object" && "subpane" in n && e.add(n.subpane);
		}
		let t = rn.filter((t) => e.has(t)), n = [...e].filter((e) => !rn.includes(e));
		return t.concat(n);
	}, [C]), [it, at] = c(d);
	i(() => {
		at(d);
	}, [d]);
	let ot = o(() => {
		let e = {};
		for (let t of C) {
			if (!t.enabled) continue;
			let n = K(t.defKey), r = n?.pane;
			if (!r || typeof r != "object" || !("subpane" in r)) continue;
			let i = n?.paneHeightFactor ?? 1;
			e[r.subpane] = Math.max(e[r.subpane] ?? 1, i);
		}
		return e;
	}, [C]), st = o(() => ue(e ?? []), [e]), ct = o(() => de(e ?? [], e?.length ?? 0), [e]), lt = o(() => fe(I), [I]), B = Math.max(10, Math.min(p, lt)), V = o(() => {
		if (!e || e.length === 0 || I === 0) return null;
		let t = Math.max(300, (L || 466) - $.top - $.bottom), n = me(b, e.length, B), r = Math.max(0, Math.floor(e.length - B - n)), i = Math.min(e.length, Math.ceil(e.length - n)), a = e.slice(r, i);
		if (a.length === 0) return null;
		let o = Math.ceil(B), s = Math.max(0, r - o), c = Math.min(e.length, i + o), l = e.slice(s, c), { priceHeight: u, subpanes: d, fullHeight: f } = _r({
			totalHeight: t,
			subpaneKeys: rt,
			heightRatio: oa,
			floorRatio: sa,
			heightFactors: ot,
			userHeights: it ?? void 0
		}), p = I - $.left - $.right, m = (p - ua) / B, h = (n + B - e.length) * m, g = D.scaleBand().domain(nt).range([0, m * Math.max(1, e.length - .3)]).paddingInner(.3).paddingOuter(0);
		return {
			totalHeight: t,
			visStart: r,
			visEnd: i,
			visibleSlice: a,
			renderStart: s,
			renderEnd: c,
			renderSlice: l,
			priceHeight: u,
			fullHeight: f,
			subpanes: d,
			width: p,
			step: m,
			baseTranslateX: h,
			xScale: g,
			bandwidth: g.bandwidth(),
			visibleBarsInt: Math.floor(B),
			visibleStartIdx: Math.round(e.length - B - n),
			effectiveOffset: n
		};
	}, [
		e,
		B,
		b,
		I,
		L,
		nt,
		rt,
		ot,
		it
	]), ut = o(() => {
		if (!e || e.length === 0) return [];
		let n = C.filter((e) => e.enabled);
		if (n.length === 0) return [];
		let i = t && t.length ? t : [], a = i.length ? i.concat(e) : e, o = {
			...lr(a),
			bars: a
		};
		if (r) {
			let e = new Float64Array(a.length);
			for (let t = 0; t < a.length; t++) e[t] = r[a[t].date] ?? NaN;
			o.benchmarkClose = e;
		}
		u && (o.quarterlyResults = u), o.market = xe;
		let s = i.length;
		return o.displayStart = s, n.map((e) => {
			let t = K(e.defKey);
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
		C,
		r,
		u,
		xe
	]), dt = o(() => !e || e.length === 0 ? null : gr(t && t.length ? t.concat(e) : e, ye, xe, st), [
		e,
		t,
		ye,
		xe,
		st
	]), H = s(null), ft = s([]), U = n(() => {
		let e = P.current, t = je.current, n = Me.current;
		if (!e || !t || !n.suggested) return;
		let { width: r, height: i } = n.suggested;
		n.suggested = null, e.width !== r && (e.width = r), e.height !== i && (e.height = i), t.hRatio = n.cssWidth > 0 ? r / n.cssWidth : 1, t.vRatio = n.cssHeight > 0 ? i / n.cssHeight : 1;
	}, []), W = n(() => {
		let e = je.current, t = H.current;
		!e || !t || (U(), ft.current = br(e.ctx, {
			hRatio: e.hRatio,
			vRatio: e.vRatio,
			cssWidth: t.cssWidth,
			cssHeight: t.cssHeight,
			marginLeft: $.left,
			marginTop: $.top,
			marginBottom: $.bottom,
			rightBuffer: ua,
			width: t.width,
			fullHeight: t.fullHeight,
			priceHeight: t.priceHeight,
			bandwidth: t.bandwidth,
			step: z.step,
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
			resolveColor: (e) => F.current?.resolve(e) ?? "#888888"
		}));
	}, [z, U]), pt = o(() => V ? $.top + V.priceHeight : 0, [V]), G = s(null), mt = n((e) => (t) => {
		V && (t.preventDefault(), t.stopPropagation(), t.currentTarget.setPointerCapture(t.pointerId), G.current = {
			index: e,
			startY: t.clientY,
			bands: V.subpanes,
			priceHeight: V.priceHeight,
			totalHeight: V.totalHeight,
			latest: null
		});
	}, [V]), ht = n((e) => {
		let t = G.current;
		if (!t) return;
		let n = vr({
			bands: t.bands,
			priceHeight: t.priceHeight,
			totalHeight: t.totalHeight,
			dividerIndex: t.index,
			dy: e.clientY - t.startY,
			minPanePx: ca,
			floorRatio: sa
		});
		t.latest = n, at(n);
	}, []), gt = n((e) => {
		let t = G.current;
		t && (e.currentTarget.releasePointerCapture?.(e.pointerId), G.current = null, t.latest && f?.(t.latest));
	}, [f]), [_t, vt] = c(null), yt = s(_t);
	i(() => {
		yt.current = _t;
	}, [_t]);
	let bt = _t === null, [xt, St] = c(!1), [Ct, wt] = c(!1), [Tt, Et] = c(!1), Dt = xt || Ct || Tt, Ot = s({
		active: !1,
		startX: 0,
		startOffset: 0,
		baseTx: 0,
		step: 1,
		minOffset: 0,
		maxOffset: 0,
		startY: 0,
		panY: !1,
		startLoLog: 0,
		startHiLog: 0,
		pxPerLog: 1,
		panCapLog: 0
	}), kt = s(x);
	i(() => {
		kt.current = x;
	}, [x]);
	let At = s(b);
	i(() => {
		At.current = b;
	}, [b]);
	let jt = s(lt);
	jt.current = lt;
	let Mt = s(h);
	i(() => {
		Mt.current = h;
	}, [h]);
	let Nt = s(g);
	i(() => {
		Nt.current = g;
	}, [g]);
	let Pt = s(v);
	i(() => {
		Pt.current = v;
	}, [v]);
	let Ft = s(null), It = s(0), Lt = s(0), Rt = s(!1), zt = s(null), Bt = s(null), Vt = s(null), Ht = s(null), Ut = s(null), Wt = s(null), Gt = s(null), Kt = s(null), qt = s(null), Jt = s(null), Yt = s(null), Xt = s(null), Zt = s(null), Qt = s(null), $t = s([]), en = s(null), tn = s(null), nn = s(null), an = s(null), on = s(null), sn = s(null), cn = s(null), ln = s(null), q = s(null), un = s(null), dn = s(/* @__PURE__ */ new Set()), fn = n((e) => (dn.current.add(e), () => {
		dn.current.delete(e);
	}), []), pn = s(null), mn = s(null), hn = s(null), _n = s(null), vn = s(Oe);
	i(() => {
		vn.current = Oe;
	}, [Oe]);
	let yn = s({ phase: "idle" }), bn = s(null), xn = s(null), [Sn, wn] = c(null), J = n((e) => {
		xn.current = e, wn(e);
	}, []), En = s(null), Y = s(null), X = s(De);
	i(() => {
		X.current = De;
	}, [De]);
	let Dn = s(ke);
	i(() => {
		Dn.current = ke;
	}, [ke]);
	let On = o(() => (Ee ?? []).map(Tn).filter((e) => e !== null), [Ee]), kn = s(On);
	kn.current = On;
	let An = n(() => ({
		xScale: z.xScale,
		yPrice: z.yPrice,
		step: z.step,
		bandwidth: z.bandwidth,
		dataLength: z.data.length,
		width: z.width,
		priceHeight: z.priceHeight,
		data: z.data
	}), [z]), jn = n((e, t) => {
		let n = An();
		return {
			date: Ei(e - z.baseTranslateX, n),
			price: Di(t, n)
		};
	}, [An, z]), Z = n(() => {
		let e = _n.current;
		!e || z.data.length === 0 || e.update({
			drawings: En.current ?? kn.current,
			draft: yn.current,
			draftPointer: bn.current,
			selectedId: xn.current,
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
			resolveColor: (e) => F.current?.resolve(e) ?? "#888888"
		});
	}, [z]), Mn = n((e) => {
		let t = kn.current, n = t.findIndex((t) => t.id === e.id) === -1 ? [...t, e] : t.map((t) => t.id === e.id ? e : t);
		X.current?.(n);
	}, []), Nn = () => typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}-${Math.round(Math.random() * 1e9)}`, Pn = s(0), Fn = n((e, t) => {
		let n = jn(e, t), r = Ci(yn.current, {
			type: "down",
			anchor: n
		}, {
			tool: vn.current,
			makeId: Nn
		});
		yn.current = r.draft, r.selectId !== void 0 && J(r.selectId), r.commit && (bn.current = null, Pn.current = performance.now(), Mn(r.commit), r.commit.type === "text" && Je({
			kind: "drawing",
			id: r.commit.id
		}), vn.current !== "cursor" && (vn.current = "cursor", Dn.current?.("cursor"))), Z();
	}, [
		jn,
		J,
		Mn,
		Z,
		Je
	]), In = n((e, t, n) => {
		let r = kn.current.find((t) => t.id === e.id);
		if (!r) return;
		let i = jn(t, n), a = Ci(yn.current, {
			type: "down",
			anchor: i,
			target: {
				id: e.id,
				hit: e.hit,
				shape: r
			}
		}, {
			tool: "cursor",
			makeId: Nn
		});
		yn.current = a.draft, a.selectId !== void 0 && J(a.selectId), a.draft.phase === "dragging" && r.locked !== !0 && (Y.current = {
			id: r.id,
			grab: a.draft.grab,
			startMx: t,
			startMy: n,
			origin: r
		}, En.current = kn.current.slice(), N.current && (N.current.style.cursor = "grabbing")), Z();
	}, [
		jn,
		J,
		Z
	]), Ln = o(() => Ke?.kind === "drawing" ? On.find((e) => e.id === Ke.id) ?? null : null, [Ke, On]), Rn = o(() => Ke?.kind === "indicator" ? C.find((e) => e.id === Ke.id) ?? null : null, [Ke, C]);
	i(() => {
		let e = () => J(null), t = rr.current;
		return t.add(e), () => {
			t.delete(e);
		};
	}, [J]), i(() => {
		let e = (e) => {
			if (e.key === "Escape") {
				(yn.current.phase !== "idle" || Y.current || bn.current) && (yn.current = Ci(yn.current, { type: "escape" }, {
					tool: vn.current,
					makeId: Nn
				}).draft, bn.current = null, Y.current = null, En.current = null, Z());
				return;
			}
			if ((e.key === "Delete" || e.key === "Backspace") && xn.current) {
				let t = e.target;
				if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
				let n = xn.current;
				X.current?.(kn.current.filter((e) => e.id !== n)), J(null);
			}
		};
		return document.addEventListener("keydown", e), () => document.removeEventListener("keydown", e);
	}, [J, Z]), i(() => {
		let e = (e) => {
			let t = Bt.current;
			if (!t) return;
			let n = Y.current;
			if (n) {
				let [r, i] = D.pointer(e, t.node()), a = An(), o = n.grab && n.grab.kind === "handle" ? ya(n.origin, n.grab.index, jn(r, i)) : xa(n.origin, r - n.startMx, i - n.startMy, a);
				En.current = kn.current.map((e) => e.id === n.id ? o : e), Z();
				return;
			}
			if (yn.current.phase === "placing") {
				let [n, r] = D.pointer(e, t.node());
				bn.current = jn(n, r), Z();
			}
		}, t = () => {
			let e = Y.current;
			if (!e) return;
			Y.current = null;
			let t = En.current?.find((t) => t.id === e.id) ?? null, n = Ci(yn.current, {
				type: "up",
				working: t
			}, {
				tool: "cursor",
				makeId: Nn
			});
			yn.current = n.draft, En.current = null, N.current && (N.current.style.cursor = ""), n.commit && Mn(n.commit), Z();
		};
		return document.addEventListener("mousemove", e), document.addEventListener("mouseup", t), () => {
			document.removeEventListener("mousemove", e), document.removeEventListener("mouseup", t);
		};
	}, [
		An,
		jn,
		Z,
		Mn
	]);
	let [zn, Bn] = c(null), [Vn, Hn] = c(null), [Un, Wn] = c(null), [Gn, qn] = c(null), Jn = n((e, t) => {
		(e === "trade" ? Wn : qn)((e) => e === t || e && t && e.min === t.min && e.max === t.max ? e : t);
	}, []), Qn = o(() => {
		let e = [], t = [];
		return Un && !te.includes("trade") && (e.push(Un.min), t.push(Un.max)), Gn && !te.includes("trigger") && (e.push(Gn.min), t.push(Gn.max)), e.length === 0 ? null : {
			min: Math.min(...e),
			max: Math.max(...t)
		};
	}, [
		Un,
		Gn,
		te
	]), $n = o(() => {
		let e = [], t = /* @__PURE__ */ new Set();
		for (let { config: n } of ut) {
			let r = K(n.defKey);
			!r || typeof r.pane == "object" || t.has(n.defKey) || (t.add(n.defKey), e.push({
				key: n.defKey,
				label: r.longLabel ?? r.label
			}));
		}
		return Un != null && e.push({
			key: "trade",
			label: "Trade overlays"
		}), Gn != null && e.push({
			key: "trigger",
			label: "Trigger overlays"
		}), e;
	}, [
		ut,
		Un,
		Gn
	]), rr = s(/* @__PURE__ */ new Set()), ir = n((e) => {
		let t = rr.current;
		return t.add(e), () => {
			t.delete(e);
		};
	}, []), Q = o(() => ({
		tradeHost: zn,
		triggerHost: Vn,
		priceBottomPx: pt,
		marginRight: $.right,
		reportOverlayPriceBounds: Jn,
		subscribeBackgroundPointerDown: ir
	}), [
		zn,
		Vn,
		pt,
		Jn,
		ir
	]);
	i(() => {
		let e = N.current;
		if (!e) return;
		let t, n = new ResizeObserver((e) => {
			t && clearTimeout(t), t = setTimeout(() => {
				let t = e[0]?.contentRect;
				t?.width && Ne(t.width), t?.height && Pe(t.height);
			}, 150);
		});
		return n.observe(e), () => {
			t && clearTimeout(t), n.disconnect();
		};
	}, []);
	let ar = V?.priceHeight ?? null;
	i(() => {
		if (ar == null) return;
		let e = document.documentElement;
		return e.style.setProperty("--chart-price-height", `${ar}px`), () => {
			e.style.removeProperty("--chart-price-height");
		};
	}, [ar]), i(() => {
		let e = N.current;
		if (!e) return;
		let t = R.colors, n = Object.keys(t);
		for (let r of n) e.style.setProperty(`--${r}`, t[r]);
		let r = Lr(e);
		return F.current?.destroy(), F.current = r, Ue((e) => e + 1), () => {
			for (let t of n) e.style.removeProperty(`--${t}`);
			r.destroy(), F.current = null;
		};
	}, [Ie]);
	let or = V?.totalHeight ?? null;
	i(() => {
		let e = P.current;
		if (!e || or == null || I === 0) return;
		let t = I, n = or + $.top + $.bottom;
		e.style.width = `${t}px`, e.style.height = `${n}px`;
		let r = e.getContext("2d");
		if (!r) return;
		(!je.current || je.current.ctx !== r) && (je.current = {
			ctx: r,
			hRatio: 1,
			vRatio: 1
		});
		function i(e) {
			let r = P.current;
			if (!r) return;
			let i = e?.devicePixelContentBoxSize?.[0], a, o;
			if (i) a = i.inlineSize, o = i.blockSize;
			else {
				let e = window.devicePixelRatio || 1, t = r.getBoundingClientRect();
				a = Math.round(t.left * e + t.width * e) - Math.round(t.left * e), o = Math.round(t.top * e + t.height * e) - Math.round(t.top * e);
			}
			Me.current = {
				cssWidth: t,
				cssHeight: n,
				suggested: {
					width: Math.max(1, a),
					height: Math.max(1, o)
				}
			}, W();
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
		I,
		or,
		W
	]), i(() => {
		let e = N.current;
		if (!e || !h) return;
		let t = 1, n = null;
		function r(e) {
			if (e.target?.closest?.("[data-chart-wheel-scroll]")) return;
			e.preventDefault();
			let r = e.deltaY > 0 ? _a : 1 / _a;
			t *= r, n ??= requestAnimationFrame(() => {
				n = null;
				let e = t;
				t = 1, h((t) => Math.min(jt.current, Math.max(10, t * e)));
			});
		}
		return e.addEventListener("wheel", r, { passive: !1 }), () => {
			e.removeEventListener("wheel", r), n != null && cancelAnimationFrame(n);
		};
	}, [h]), i(() => {
		let t = e?.length ?? 0;
		t !== 0 && kt.current((e) => me(e, t, p));
	}, [e?.length, p]), i(() => {
		I === 0 || !h || (p > lt || p < 10) && Mt.current?.((e) => Math.min(lt, Math.max(10, e)));
	}, [
		lt,
		p,
		I,
		h
	]), i(() => {
		I === 0 || !g || Nt.current?.(lt);
	}, [
		lt,
		I,
		g
	]), i(() => {
		v && Pt.current?.(ct);
	}, [ct, v]);
	let [cr, ur] = c(ae);
	cr !== ae && (ur(ae), _t !== null && vt(null)), i(() => {
		let e = () => {
			let e = Ot.current;
			if (!e.active) return;
			e.active = !1, Rt.current = !1, N.current && (N.current.style.cursor = ""), Ft.current != null && (cancelAnimationFrame(Ft.current), Ft.current = null);
			let t = Math.round(It.current / e.step), n = Math.max(e.minOffset, Math.min(e.maxOffset, e.startOffset + t));
			It.current = 0, n === e.startOffset ? zt.current && (zt.current.setAttribute("transform", `translate(${e.baseTx},0)`), z.baseTranslateX = e.baseTx, $e("pan"), mn.current?.setTransform(e.baseTx), _n.current?.setTransform(e.baseTx), W()) : kt.current(n);
		}, t = (t) => {
			let n = Ot.current;
			if (!n.active) return;
			if (t.buttons === 0) {
				e();
				return;
			}
			let r = t.clientX - n.startX, i = he(r, n.startOffset, n.minOffset, n.maxOffset, n.step);
			i !== r && (n.startX += r - i), It.current = i, n.panY && (Lt.current = t.clientY - n.startY), Ft.current ??= requestAnimationFrame(() => {
				Ft.current = null;
				let e = n.baseTx + It.current;
				if (zt.current && zt.current.setAttribute("transform", `translate(${e},0)`), z.baseTranslateX = e, $e("pan"), mn.current?.setTransform(e), _n.current?.setTransform(e), W(), n.panY) {
					let e = Lt.current / n.pxPerLog;
					e = Math.max(-n.panCapLog, Math.min(n.panCapLog, e)), vt([Math.exp(n.startLoLog + e), Math.exp(n.startHiLog + e)]);
				}
			});
		};
		return document.addEventListener("mousemove", t), document.addEventListener("mouseup", e), () => {
			document.removeEventListener("mousemove", t), document.removeEventListener("mouseup", e), Ft.current != null && (cancelAnimationFrame(Ft.current), Ft.current = null);
		};
	}, [
		z,
		$e,
		W
	]), i(() => {
		if (!Ae.current) return;
		let e = D.select(Ae.current);
		e.selectAll("*").remove();
		let t = e.append("g").attr("transform", `translate(${$.left},${$.top})`);
		Bt.current = t;
		let n = t.append("defs");
		Ht.current = n.append("clipPath").attr("id", "chart-viewport").append("rect").attr("x", 0).attr("y", -$.top), cn.current = n.append("clipPath").attr("id", "chart-price-viewport").append("rect").attr("x", 0).attr("y", -$.top);
		let r = n.append("linearGradient").attr("id", "chart-bg-gradient").attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
		r.append("stop").attr("offset", "0%").attr("stop-color", "#776a5a"), r.append("stop").attr("offset", "100%").attr("stop-color", "#6e7b8b");
		let i = n.append("linearGradient").attr("id", "chart-bg-gradient-user").attr("gradientUnits", "userSpaceOnUse");
		i.append("stop").attr("offset", "0%").attr("stop-color", "#6e7b8b"), i.append("stop").attr("offset", "100%").attr("stop-color", "#776a5a"), ln.current = i, Vt.current = t.append("rect").attr("x", -$.left).attr("y", -$.top).attr("rx", 12).attr("ry", 12).attr("fill", "transparent"), Ut.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", aa).style("font-weight", "500").style("color", "var(--chart-axis-label)"), Wt.current = t.append("g").style("font-size", "var(--text-2hxs)").style("font-family", aa).style("font-weight", "500").style("color", "var(--chart-axis-label)").style("display", "none"), Gt.current = t.append("g").style("display", "none"), Kt.current = t.append("g"), qt.current = t.append("line").attr("y1", -$.top).attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), pn.current = t.append("g").attr("class", "chart-pattern-overlays-container").node(), mn.current = yi(pn.current);
		let a = t.append("g").attr("clip-path", "url(#chart-viewport)").append("g");
		Jt.current = a, zt.current = a.node(), Yt.current = a.append("g").style("font-size", "var(--text-2hxs)").style("font-family", aa).style("font-weight", "500").style("color", "var(--chart-axis-label)"), Xt.current = t.append("line").attr("stroke", "currentColor").attr("stroke-opacity", .3).attr("stroke-dasharray", "3,3").attr("y1", 0).style("visibility", "hidden"), Zt.current = t.append("line").attr("stroke", "currentColor").attr("stroke-opacity", .3).attr("stroke-dasharray", "3,3").attr("x1", 0).style("visibility", "hidden");
		let o = t.append("text").attr("x", 8).attr("y", 14).style("font-size", "var(--text-sm)").style("font-family", aa).style("font-weight", "500").attr("fill", "currentColor").style("visibility", "hidden");
		Qt.current = o, $t.current = [];
		for (let e = 0; e < da; e++) $t.current.push(o.append("tspan"));
		let s = t.append("g").style("visibility", "hidden");
		nn.current = s, s.append("rect").attr("width", 56).attr("height", 18).attr("rx", 3).attr("fill", "var(--bg-card)").attr("stroke", "currentColor").attr("stroke-opacity", .2), an.current = s.append("text").attr("x", 28).attr("y", 13).attr("text-anchor", "middle").style("font-size", "var(--text-3xs)").style("font-family", aa).style("font-weight", "500").attr("fill", "currentColor"), on.current = t.append("rect").attr("fill", "transparent"), sn.current = t.append("rect").attr("fill", "transparent").style("cursor", "ns-resize").style("pointer-events", "all"), hn.current = t.append("g").attr("class", "chart-drawing-overlays-container").node(), _n.current = Wi(hn.current);
		let c = t.append("g").attr("class", "trigger-overlays-container").node(), l = t.append("g").attr("class", "trade-overlays-container").node();
		return Hn(c), Bn(l), () => {
			q.current != null && (cancelAnimationFrame(q.current), q.current = null), un.current = null, e.selectAll("*").remove(), Bt.current = null, Vt.current = null, Ht.current = null, Ut.current = null, Wt.current = null, Gt.current = null, Kt.current = null, qt.current = null, Jt.current = null, zt.current = null, Yt.current = null, Xt.current = null, Zt.current = null, Qt.current = null, $t.current = [], nn.current = null, an.current = null, on.current = null, sn.current = null, cn.current = null, ln.current = null, Hn(null), Bn(null), mn.current?.destroy(), mn.current = null, pn.current = null, _n.current?.destroy(), _n.current = null, hn.current = null;
		};
	}, []), i(() => {
		if (!e || !V || !Ae.current || !Bt.current || !Jt.current) return;
		let { renderStart: t, renderEnd: n, priceHeight: r, fullHeight: i, subpanes: a, width: o, step: s, baseTranslateX: c, xScale: l, totalHeight: u } = V, d = u + $.top + $.bottom;
		D.select(Ae.current).attr("width", I).attr("height", d), Vt.current.attr("width", I).attr("height", i + $.top + $.bottom);
		let f = i + $.top + $.bottom;
		ln.current.attr("x1", 0).attr("y1", -$.top).attr("x2", 0).attr("y2", -$.top + f), ln.current.selectAll("stop").attr("stop-color", function() {
			return this.getAttribute("offset") === "0%" ? R.background.topColor : R.background.bottomColor;
		}), Ht.current.attr("width", o - ua).attr("height", i + $.top + $.bottom), cn.current.attr("width", o - ua).attr("height", $.top + r);
		let p = [], m = [];
		for (let r = Math.max(1, t); r < n; r++) {
			let t = e[r].date, n = e[r - 1].date;
			t.slice(0, 7) !== n.slice(0, 7) && p.push(r), t.slice(0, 4) !== n.slice(0, 4) && m.push(r);
		}
		let h = s > 0 ? pa / s : 0, g = p.some((e, t) => t > 0 && e - p[t - 1] < h), _ = [];
		for (let e of g ? m : p) {
			let t = _[_.length - 1];
			(t === void 0 || e - t >= h) && _.push(e);
		}
		Ut.current.attr("transform", `translate(${o},0)`);
		let v = [];
		for (let e of a) v.push(e.top);
		a.length > 0 && v.push(i), Kt.current.selectAll("line").data(v).join("line").attr("x1", 0).attr("x2", o).attr("y1", (e) => e).attr("y2", (e) => e).attr("stroke", "var(--chart-separator)").attr("stroke-opacity", 1), qt.current.attr("x1", o).attr("x2", o).attr("y2", i), Jt.current.attr("transform", `translate(${c},0)`), Yt.current.attr("transform", `translate(0,${i})`).call(D.axisBottom(l).tickValues(_).tickSize(R.axis.tickSize).tickFormat((t) => {
			let n = e[t];
			if (!n) return "";
			let r = new Date(n.date);
			return D.timeFormat(g ? "%Y" : "%b %y")(r);
		})), Yt.current.select(".domain").remove(), Yt.current.selectAll("line").attr("stroke", fa).attr("stroke-opacity", R.axis.opacity), Xt.current.attr("y2", i), Zt.current.attr("x2", o), on.current.attr("width", o).attr("height", i), sn.current.attr("x", o).attr("y", 0).attr("width", $.right).attr("height", r);
	}, [
		V,
		I,
		e,
		rt,
		ze,
		Le
	]), i(() => {
		if (!e || !V || !Ut.current) return;
		let { visibleSlice: t, visStart: n, visEnd: r, renderSlice: i, renderStart: a, renderEnd: o, priceHeight: s, fullHeight: c, subpanes: l, totalHeight: u, width: d, xScale: f, bandwidth: p, step: m, baseTranslateX: h, visibleBarsInt: g, visibleStartIdx: _ } = V, v, y;
		if (_t) [v, y] = _t;
		else {
			let e = D.min(t, (e) => e.low) ?? 0, i = D.max(t, (e) => e.high) ?? 1;
			if (k === "priceAndOverlays") {
				for (let { config: t, series: a } of ut) {
					let o = K(t.defKey);
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
				Qn && (e = Math.min(e, Qn.min), i = Math.max(i, Qn.max));
			}
			let a = Math.log(e), o = Math.log(i), s = (a + o) / 2, c = (o - a) / 2, l = s - c, u = s + c, d = u - l, f = d * .06 || .01, p = d * (k === "priceAndOverlays" ? .04 : .12) || .01;
			v = Math.exp(l - f), y = Math.exp(u + p);
		}
		let b = D.scaleLog().domain([Math.max(1, v), y]).range([s, 0]), [x, C] = b.domain(), w = Math.log(x), T = Math.log(C), E = (e, t) => {
			if (e <= 0) return e;
			let n = 10 ** (Math.floor(Math.log10(e)) - (t - 1));
			return Math.round(e / n) * n;
		}, O = Array.from(new Set(D.range(ma).map((e) => {
			let t = Math.exp(w + e / (ma - 1) * (T - w));
			return E(t, t >= 100 ? 3 : 2);
		}))).sort((e, t) => e - t).slice(0, -1), ee = D.format(",.1f");
		Ut.current.call(D.axisRight(b).tickValues(O).tickSize(R.axis.tickSize).tickFormat((e) => ee(Number(e)))), Ut.current.select(".domain").remove(), Ut.current.selectAll("line").attr("stroke", fa).attr("stroke-opacity", R.axis.opacity);
		let ne = /* @__PURE__ */ new Map(), re = /* @__PURE__ */ new Map(), ie = /* @__PURE__ */ new Map();
		for (let e of ut) {
			let t = K(e.config.defKey), n = t?.pane;
			if (!n || typeof n != "object" || !("subpane" in n)) continue;
			re.has(n.subpane) || re.set(n.subpane, t?.domain?.(e.series, e.config.settings) ?? void 0);
			let r = ie.get(n.subpane) ?? [];
			r.push(e), ie.set(n.subpane, r);
		}
		for (let e of l) {
			let t = re.get(e.key), i = [];
			for (let t of ie.get(e.key) ?? []) {
				let e = K(t.config.defKey)?.autofitKeys?.(t.config.settings) ?? [];
				for (let n of e) {
					let e = t.series[n];
					e && i.push({
						values: e,
						isMarker: !1
					});
				}
			}
			let a = yr({
				hint: t,
				lines: i,
				visStart: n,
				visEnd: r,
				defaultPad: la
			});
			if (a) {
				let [n, r] = a, i = t?.topPadPx ?? 0, o = e.bottom - e.top;
				i > 0 && o > i && r > n && (r = n + (r - n) * (o / (o - i))), ne.set(e.key, D.scaleLinear().domain([n, r]).range([e.bottom, e.top]));
			}
		}
		if (Wt.current.selectAll("*").remove(), Gt.current.selectAll("*").remove(), ne.size > 0) {
			Wt.current.style("display", null), Gt.current.style("display", null);
			let e = D.format(".2~f");
			for (let t of l) {
				let n = ne.get(t.key);
				if (!n) continue;
				let r = re.get(t.key);
				if (!r?.hideAxis) {
					let t = r?.tickFormat ?? e, i = Wt.current.append("g").attr("transform", `translate(${d},0)`);
					i.call(D.axisRight(n).ticks(3).tickSize(R.axis.tickSize).tickFormat((e) => t(Number(e)))), i.select(".domain").remove(), i.selectAll("line").attr("stroke", fa).attr("stroke-opacity", R.axis.opacity);
				}
				let i = [...r?.guideLines ?? []];
				r?.zeroLine && i.push(0);
				for (let e of i) Gt.current.append("line").attr("x1", 0).attr("x2", d).attr("y1", n(e)).attr("y2", n(e)).attr("stroke", "var(--subpane-guide)").attr("stroke-opacity", .4).attr("stroke-dasharray", "3,3");
			}
		} else Wt.current.style("display", "none"), Gt.current.style("display", "none");
		let ae = Rt.current ? z.baseTranslateX : h;
		z.data = e, z.subpaneScales = ne, z.xScale = f, z.yPrice = b, z.step = m, z.bandwidth = p, z.visibleBars = B, z.visibleBarsInt = g, z.visibleStartIdx = _, z.maxVisibleBars = lt, z.priceHeight = s, z.width = d, z.baseTranslateX = ae, z.dataLength = e.length, z.indicators = ut, $e("rescale"), mn.current?.updateScales({
			xScale: f,
			yPrice: b,
			step: m,
			bandwidth: p,
			baseTranslateX: ae,
			width: d,
			priceHeight: s,
			dataLength: e.length
		}), _n.current?.updateScales({
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
		let oe = (e) => F.current?.resolve(e) ?? "#888888";
		H.current = {
			cssWidth: I,
			cssHeight: u + $.top + $.bottom,
			width: d,
			fullHeight: c,
			priceHeight: s,
			bandwidth: p,
			renderStart: a,
			renderEnd: o,
			renderSlice: i,
			chartType: S,
			data: e,
			colors: {
				positive: oe("var(--candle-up)"),
				negative: oe("var(--candle-down)")
			},
			background: {
				topColor: oe(R.background.topColor),
				bottomColor: oe(R.background.bottomColor),
				radius: R.background.radius
			},
			candle: R.candle,
			indicators: ut
		}, W(), un.current ? tn.current?.() : en.current?.();
	}, [
		V,
		ut,
		_t,
		S,
		e,
		B,
		k,
		te,
		Qn,
		I,
		W,
		z,
		$e,
		He,
		Le,
		Re,
		ze
	]), i(() => {
		if (Fe === 0 || !zt.current || I === 0) return;
		let e = me(b, Fe, B), t = (I - $.left - $.right - ua) / B, n = (e + B - Fe) * t;
		zt.current.setAttribute("transform", `translate(${n},0)`), z.baseTranslateX = n, $e("pan"), mn.current?.setTransform(n), _n.current?.setTransform(n), W();
	}, [
		b,
		B,
		Fe,
		I,
		z,
		$e,
		W
	]);
	let dr = o(() => {
		if (le === !1) return [];
		let e = ce ?? [];
		if (!ve) return e;
		let t = new Set(ve);
		return e.filter((e) => t.has(e.pattern_name));
	}, [
		ce,
		le,
		ve ? [...ve].sort().join(",") : "*"
	]);
	return i(() => {
		let e = mn.current;
		!e || z.data.length === 0 || e.update({
			detections: dr,
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
			resolveColor: (e) => F.current?.resolve(e) ?? "#888888"
		});
	}, [
		dr,
		V,
		z,
		Ve,
		He
	]), i(() => {
		Z();
	}, [
		On,
		Sn,
		V,
		z,
		He,
		Z
	]), i(() => {
		let e = Xt.current, t = Zt.current;
		if (!(!e || !t)) for (let n of [e, t]) n.attr("stroke", R.crosshair.color).attr("stroke-opacity", R.crosshair.opacity).attr("stroke-dasharray", R.crosshair.dash);
	}, [Be]), i(() => {
		let e = !1, t = 0, n = 0, r = 0, i = null, a = 0, o = () => {
			i = null;
			let e = Math.exp(-a / 200), t = (n + r) / 2, o = Math.max(.002, Math.min(4, (r - n) / 2 / e));
			vt([Math.exp(t - o), Math.exp(t + o)]);
		}, s = () => {
			e && (e = !1, N.current && (N.current.style.cursor = ""), i != null && (cancelAnimationFrame(i), i = null));
		}, c = (n) => {
			if (e) {
				if (n.buttons === 0) {
					s();
					return;
				}
				a = n.clientY - t, i ??= requestAnimationFrame(o);
			}
		};
		document.addEventListener("mousemove", c), document.addEventListener("mouseup", s);
		let l = () => {
			let i = sn.current;
			i && (i.on("mousedown", function(i) {
				i.preventDefault(), i.stopPropagation(), e = !0, t = i.clientY;
				let a = yt.current ?? z.yPrice.domain();
				n = Math.log(a[0]), r = Math.log(a[1]), N.current && (N.current.style.cursor = "ns-resize");
			}), i.on("dblclick", function(e) {
				e.preventDefault(), e.stopPropagation(), vt(null);
			}), i.on("mouseenter", function() {
				St(!0);
			}), i.on("mouseleave", function() {
				St(!1);
			}));
		};
		l();
		let u = setTimeout(l, 0);
		return () => {
			clearTimeout(u), document.removeEventListener("mousemove", c), document.removeEventListener("mouseup", s);
			let e = sn.current;
			e && e.on("mousedown", null).on("dblclick", null).on("mouseenter", null).on("mouseleave", null), i != null && cancelAnimationFrame(i);
		};
	}, []), i(() => {
		let e = on.current;
		if (!e) return;
		let t = (e) => {
			for (let t of dn.current) t(e);
		}, n = (e) => {
			let t = z.data;
			if (t.length === 0) {
				Qt.current?.style("visibility", "hidden");
				return;
			}
			let n = e < 0 || e >= t.length ? t.length - 1 : e, r = t[n], i = n > 0 ? t[n - 1].close : r.open, a = r.close - i, o = (a / i * 100).toFixed(2), s = a >= 0 ? "+" : "", c = a >= 0 ? "var(--chart-positive)" : "var(--chart-negative)", l = [
				{
					text: `${r.date}  `,
					fill: c
				},
				{
					text: "O: ",
					fill: ha
				},
				{
					text: `${ge(r.open)}  `,
					fill: c
				},
				{
					text: "H: ",
					fill: ha
				},
				{
					text: `${ge(r.high)}  `,
					fill: c
				},
				{
					text: "L: ",
					fill: ha
				},
				{
					text: `${ge(r.low)}  `,
					fill: c
				},
				{
					text: "C: ",
					fill: ha
				},
				{
					text: `${ge(r.close)}  `,
					fill: c
				},
				{
					text: `${s}${o}%  `,
					fill: c
				},
				{
					text: "Vol: ",
					fill: ha
				},
				{
					text: _e(r.volume),
					fill: c
				}
			], u = $t.current;
			for (let e = 0; e < u.length; e++) u[e].text(l[e].text).attr("fill", l[e].fill);
			Qt.current.style("visibility", "visible");
		}, r = () => n(z.data.length - 1);
		en.current = r;
		let i = () => {
			Xt.current?.style("visibility", "hidden"), Zt.current?.style("visibility", "hidden"), r(), t(null), nn.current?.style("visibility", "hidden"), mn.current?.setPointer(null, null);
		}, a = () => {
			q.current = null;
			let e = un.current;
			if (!e || z.data.length === 0) return;
			let { mx: i, my: a } = e;
			mn.current?.setPointer(i, a);
			let { data: o, yPrice: s, step: c, bandwidth: l, visibleBarsInt: u, visibleStartIdx: d, priceHeight: f, width: p } = z;
			if (Zt.current.attr("y1", a).attr("y2", a).style("visibility", "visible"), a <= f && i <= p) {
				let e = s.invert(a);
				nn.current.attr("transform", `translate(${p + 2},${a - 9})`).style("visibility", "visible"), an.current.text(tt.current(e));
			} else nn.current.style("visibility", "hidden");
			let m = Math.floor(i / c);
			if (m < 0 || m >= u) {
				Xt.current.attr("x1", i).attr("x2", i).style("visibility", "visible"), r(), t(null);
				return;
			}
			let h = m * c + l / 2;
			Xt.current.attr("x1", h).attr("x2", h).style("visibility", "visible");
			let g = d + m;
			if (g < 0 || g >= o.length) {
				r(), t(null);
				return;
			}
			n(g), t(g);
		};
		tn.current = a, e.on("mousedown", function(e) {
			if (e.preventDefault(), z.data.length === 0) return;
			let t = Bt.current, [n, r] = t ? D.pointer(e, t.node()) : [0, 0];
			if (vn.current !== "cursor") {
				Fn(n, r);
				return;
			}
			let a = _n.current?.hitTest(n, r) ?? null;
			if (a) {
				In(a, n, r);
				return;
			}
			for (let e of rr.current) e();
			let o = yt.current, s = o !== null, c = 0, l = 0, u = 1, d = 0;
			s && o && (c = Math.log(o[0]), l = Math.log(o[1]), u = z.priceHeight / (l - c), d = (l - c) * 3), Ot.current = {
				active: !0,
				startX: e.clientX,
				startOffset: me(At.current, z.data.length, z.visibleBars),
				baseTx: z.baseTranslateX,
				step: z.step,
				...pe(z.data.length, z.visibleBars),
				startY: e.clientY,
				panY: s,
				startLoLog: c,
				startHiLog: l,
				pxPerLog: u,
				panCapLog: d
			}, It.current = 0, Lt.current = 0, Rt.current = !0, q.current != null && (cancelAnimationFrame(q.current), q.current = null), un.current = null, i(), N.current && (N.current.style.cursor = "grabbing");
		});
		let o = (e, t) => {
			if (z.data.length === 0) return null;
			let n = _n.current?.hitTest(e, t) ?? null;
			if (n) return {
				kind: "drawing",
				id: n.id
			};
			let { step: r, bandwidth: i, visibleBarsInt: a, visibleStartIdx: o, xScale: s } = z, c = Math.floor(e / r);
			if (c < 0 || c >= a) return null;
			let l = o + c;
			if (l < 0 || l >= z.data.length) return null;
			let u = gn(e - z.baseTranslateX, t, l, ft.current, (e) => s(e) + i / 2, r);
			return u ? u.sourceId === "__candles__" ? Ze.current ? { kind: "candles" } : null : {
				kind: "indicator",
				id: u.sourceId
			} : null;
		};
		e.on("dblclick", function(e) {
			if (e.preventDefault(), performance.now() - Pn.current < va) {
				Pn.current = 0;
				return;
			}
			let t = Bt.current, [n, r] = t ? D.pointer(e, t.node()) : [0, 0], i = o(n, r);
			i && Xe.current(i);
		});
		let s = D.select(Ae.current);
		return s.on("mousemove.crosshair", function(e) {
			if (Ot.current.active) return;
			let t = N.current;
			if (Y.current) return;
			if (vn.current !== "cursor" || yn.current.phase !== "idle") {
				t && (t.style.cursor = "crosshair");
				return;
			}
			let n = Bt.current;
			if (!n) return;
			let [r, i] = D.pointer(e, n.node());
			if (t) {
				let e = o(r, i);
				t.style.cursor = e ? e.kind === "drawing" ? "grab" : "pointer" : "";
			}
			un.current = {
				mx: r,
				my: i
			}, q.current ??= requestAnimationFrame(a);
		}).on("mouseleave.crosshair", function(e) {
			if (Ot.current.active) return;
			!Y.current && N.current && (N.current.style.cursor = ""), q.current != null && (cancelAnimationFrame(q.current), q.current = null);
			let t = e.relatedTarget;
			if (t && typeof t.closest == "function" && (t.closest("[data-chart-legend]") || t.closest("[data-chart-stats]"))) {
				Xt.current?.style("visibility", "hidden"), Zt.current?.style("visibility", "hidden"), nn.current?.style("visibility", "hidden");
				return;
			}
			un.current = null, i();
		}), un.current || r(), () => {
			e.on("mousedown", null).on("dblclick", null), s.on("mousemove.crosshair", null).on("mouseleave.crosshair", null), q.current != null && (cancelAnimationFrame(q.current), q.current = null);
		};
	}, [
		z,
		Fn,
		In
	]), !e || e.length === 0 ? /* @__PURE__ */ T("div", {
		className: oe ? j.chartWrapperBare : j.chartWrapper,
		ref: N,
		children: /* @__PURE__ */ T("div", {
			className: j.empty,
			children: ae ? /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T(l, {
				size: 32,
				className: j.emptyIcon
			}), "No data available"] }) : /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T(m, {
				size: 32,
				className: j.emptyIcon
			}), "Select a stock to view chart"] })
		})
	}) : /* @__PURE__ */ T(Xi, {
		value: z,
		children: /* @__PURE__ */ T($i, {
			value: Q,
			children: /* @__PURE__ */ E("div", {
				className: oe ? j.chartWrapperBare : j.chartWrapper,
				ref: N,
				"data-trade-overlay-anchor": "",
				children: [
					/* @__PURE__ */ T("canvas", {
						ref: P,
						className: j.seriesCanvas,
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ T("svg", {
						ref: Ae,
						className: j.chartSvg
					}),
					V != null && /* @__PURE__ */ T(er, {
						indicators: C,
						onIndicatorsChange: O,
						resolved: ut,
						subpanes: V.subpanes,
						marginTop: $.top,
						marginLeft: $.left,
						barCount: Fe,
						expanded: re,
						onExpandedChange: ie,
						subscribeHoverIndex: fn,
						priceFormatter: et,
						resolveColor: (e) => F.current?.resolve(e) ?? "#888888"
					}),
					V != null && V.subpanes.map((e, t) => {
						let n = $.top + e.top;
						return /* @__PURE__ */ T("div", {
							className: j.subpaneDivider,
							style: {
								top: n - 8 / 2,
								height: 8
							},
							onPointerDown: mt(t),
							onPointerMove: ht,
							onPointerUp: gt,
							children: /* @__PURE__ */ T("span", { className: j.subpaneDividerLine })
						}, e.key);
					}),
					be !== !1 && dt && Fe > 0 && /* @__PURE__ */ T(sr, {
						model: dt,
						size: Ce,
						marginRight: $.right,
						position: Se ?? null,
						onPositionChange: A
					}),
					pt > 0 && /* @__PURE__ */ T("button", {
						type: "button",
						className: `${j.resetPanBtn} ${b === 0 ? j.resetPanBtnInactive : ""}`,
						title: "Reset pan",
						onClick: () => x(0),
						disabled: b === 0,
						style: {
							top: pt - 26,
							right: $.right + 2
						},
						children: /* @__PURE__ */ T(_, { size: 14 })
					}),
					pt > 0 && Dt && /* @__PURE__ */ T("button", {
						type: "button",
						className: `${j.autoFitBtn} ${bt ? j.autoFitBtnActive : ""}`,
						title: bt ? k === "priceAndOverlays" ? "Auto-fit: price + overlays (click for price-only)" : "Auto-fit: price-only (click to include overlays)" : "Auto-fit price scale (off — drag y-axis to enable)",
						onMouseDown: (e) => e.stopPropagation(),
						onClick: () => {
							if (Et(!1), !bt) {
								vt(null);
								return;
							}
							ee(k === "priceAndOverlays" ? "price" : "priceAndOverlays");
						},
						onContextMenu: (e) => {
							e.preventDefault(), k === "priceAndOverlays" && bt && Et((e) => !e);
						},
						onMouseEnter: () => wt(!0),
						onMouseLeave: () => wt(!1),
						style: {
							top: pt - 26,
							right: $.right - 26,
							color: bt && k === "priceAndOverlays" ? "#22c55e" : void 0
						},
						children: "A"
					}),
					Tt && k === "priceAndOverlays" && bt && /* @__PURE__ */ T(nr, {
						contributors: $n,
						excluded: te,
						onExcludedChange: ne,
						onClose: () => Et(!1),
						style: {
							top: pt - 30,
							right: $.right - 26,
							transform: "translateY(-100%)"
						}
					}),
					Te && /* @__PURE__ */ E(w, { children: [/* @__PURE__ */ T("button", {
						type: "button",
						className: j.settingsGearBtn,
						title: "Chart settings",
						onMouseDown: (e) => e.stopPropagation(),
						onClick: () => {
							qe(null), Ge((e) => !e);
						},
						style: {
							right: 4,
							bottom: 4
						},
						children: /* @__PURE__ */ T(y, { size: 14 })
					}), We && /* @__PURE__ */ T(Kn, {
						appearance: we ?? {},
						onAppearanceChange: Te,
						resolveColor: (e) => F.current?.resolve(e) ?? "#888888",
						onClose: () => Ge(!1),
						style: {
							right: $.right + 4,
							bottom: $.bottom + 4
						}
					})] }),
					Ke?.kind === "candles" && Te && /* @__PURE__ */ T(tr, {
						appearance: we ?? {},
						onAppearanceChange: Te,
						resolveColor: (e) => F.current?.resolve(e) ?? "#888888",
						onClose: Ye,
						className: j.centeredPanel
					}),
					Rn && (() => {
						let e = K(Rn.defKey);
						return !e || (e.settingsSchema?.length ?? 0) === 0 ? null : /* @__PURE__ */ T(Zn, {
							config: Rn,
							def: e,
							onCommit: (e, t) => O(Yn(C, Rn.id, e, t)),
							onReset: (e) => O(Xn(C, Rn.id, [e])),
							onResetKeys: (e) => e.length > 0 && O(Xn(C, Rn.id, e)),
							resolveColor: (e) => F.current?.resolve(e) ?? "#888888",
							onClose: Ye,
							className: j.centeredPanel
						});
					})(),
					De && Ln && /* @__PURE__ */ T(qi, {
						shape: Ln,
						onChange: (e) => Mn(e),
						onDelete: () => {
							De(On.filter((e) => e.id !== Ln.id)), J(null), Ye();
						},
						resolveColor: (e) => F.current?.resolve(e) ?? "#888888",
						onClose: Ye,
						className: j.centeredPanel
					}),
					M
				]
			})
		})
	});
}), Ca = j.resetPanBtn;
//#endregion
export { bn as APPEARANCE_DEFAULTS, dn as CANDLE_SOURCE, Sa as Chart, An as ChartControls, le as DEFAULT_BARS_PER_YEAR, ne as DEFAULT_RANGE_MARKS, J as DRAWING_DEFAULTS, pn as FILLED_HIT_PAD, I as LINE_STYLE_OPTIONS, re as MIN_BAR_STEP_PX, te as MIN_MARK_BARS, ie as MIN_VISIBLE_BARS, nn as OVERLAY_ORDER, xe as PATTERN_CATALOG, Se as PATTERN_NAMES, O as RANGES, k as RANGE_DAYS, ee as RANGE_YEARS, fn as REGION_HIT_TOLERANCE, rn as SUBPANE_ORDER, Kn as SettingsDialog, Jn as ZoomSlider, A as barIndexForDate, Oe as barIndexForDateProjected, ue as barsPerYear, Dt as computeAdx, Et as computeAtr, Tt as computeDx, Re as computeEMA, Be as computeExpandingMax, ze as computeRollingHigh, be as computeVolumeStats, Ne as dashFor, Ce as dateForBarIndex, ke as dateForBarIndexProjected, $t as defaultConfigFor, ht as dema, Cn as effectiveAppearance, En as effectiveDrawingStyle, G as emaTalib, tn as formatIndicatorParams, ge as formatPrice, _e as formatVolume, ve as formatVolumeTick, K as getIndicator, L as lineStyleFrom, Xt as listIndicators, _t as maDispatch, fe as maxVisibleBarsForWidth, Tn as normalizeDrawing, Ca as panButtonClass, gn as pickHitRegion, de as rangeMarks, Ot as rawStochK, Yt as registerIndicator, xt as rollingMax, St as rollingMin, wt as rsi, W as sma, kt as stddevPop, gt as tema, Ct as trueRange, ia as useBackgroundPointerDown, na as useChartGeometry, ta as useChartOverlayHost, Zi as useChartScale, ra as useReportOverlayPriceBounds, yt as wilderSmooth, bt as wilderSum, pt as wma };
