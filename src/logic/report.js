// src/logic/report.js
// Laporan HTML/CSS rapi -> cetak ke PDF lewat dialog browser (Save as PDF).
// Mendukung: CSV massal, satu kampanye, tren waktu, dan riwayat.

const GRADE_COLOR = { A: "#16a34a", B: "#65a30d", C: "#ca8a04", D: "#ea580c", E: "#dc2626", "-": "#6b7280" };
const SEV_COLOR = { high: "#dc2626", warning: "#ca8a04", good: "#16a34a", neutral: "#4f46e5" };
const RATE_COLOR = { good: "#16a34a", avg: "#ca8a04", bad: "#dc2626" };
const PROFIT_COLOR = {
  untung: ["#ecfdf5", "#16a34a"], tipis: ["#f7fee7", "#65a30d"],
  bep: ["#fffbeb", "#ca8a04"], boncos: ["#fef2f2", "#dc2626"],
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function money(v, currency) {
  if (v == null) return "-";
  return currency === "idr" ? "Rp" + Math.round(v).toLocaleString("id-ID") : "$" + v;
}
// metrik dari engine (cpm/cpa ter-normalisasi USD) -> tampil sesuai mata uang
function fmtVal(k, v, currency) {
  if (v == null) return "-";
  if (k === "ctr" || k === "cvr") return v + "%";
  if (k === "roas") return v + "x";
  return currency === "idr" ? "Rp" + Math.round(v).toLocaleString("id-ID") : "$" + v;
}

function metricChips(r) {
  const labels = { cpm: "CPM", ctr: "CTR", cpc: "CPC", cvr: "CVR", cpa: "CPA", roas: "ROAS" };
  return ["cpm", "ctr", "cpc", "cvr", "cpa", "roas"].map((k) => {
    if (r.metrics[k] == null) return "";
    const rate = r.ratings[k];
    const col = RATE_COLOR[rate] || "#6b7280";
    const val = fmtVal(k, r.metrics[k], r.currency, r.rate);
    return `<span class="chip"><b>${labels[k]}</b> <b style="color:#111827">${esc(val)}</b>` +
      (rate ? ` <span class="dot" style="background:${col}"></span><span style="color:${col};font-weight:700">${rate.toUpperCase()}</span>` : "") +
      `</span>`;
  }).join(" ");
}

function diagsHtml(r) {
  return r.diagnoses.map((d) => {
    const sc = SEV_COLOR[d.severity] || SEV_COLOR.neutral;
    const acts = d.actions.map((a) => `<li>${esc(a)}</li>`).join("");
    return `<div class="diag"><div class="diag-title"><span class="sev" style="background:${sc}"></span>${esc(d.title)}</div><div class="diag-body">${esc(d.body)}</div><ul class="acts">${acts}</ul></div>`;
  }).join("");
}

function profitBanner(r) {
  if (!r.profit) return "";
  const [bg, fg] = PROFIT_COLOR[r.profit.status] || ["#eef2ff", "#4f46e5"];
  return `<div class="profit" style="background:${bg};border-color:${fg}">
    <div class="profit-row"><span class="profit-label" style="color:${fg}">${esc(r.profit.label)}</span>
    <span class="profit-nums">POAS <b>${r.poas}x</b> &middot; ROI <b>${r.roiPct > 0 ? "+" : ""}${r.roiPct}%</b></span></div>
    <div class="profit-note">${esc(r.profit.note)}</div></div>`;
}

function simBlock(r) {
  const s = r.simulation;
  if (!s) return "";
  const items = [`<li>ROAS sekarang <b>${s.roasNow}x</b> — balik modal di <b>${s.roasBEP}x</b>, untung sehat di <b>${s.roasHealthy}x</b>.</li>`];
  if (s.priceHealthy != null) items.push(`<li>Atau naikkan harga jual dari ${money(s.priceNow, r.currency)} ke ~<b>${money(s.priceHealthy, r.currency)}</b> biar untung sehat.</li>`);
  if (s.hppMaxBEP != null) items.push(`<li>Atau tekan modal/HPP di bawah <b>${money(s.hppMaxBEP, r.currency)}</b> (sekarang ${money(s.hppNow, r.currency)}) biar balik modal.</li>`);
  return `<div class="sim"><div class="sim-title">Simulasi Target — biar untung</div><ul class="acts">${items.join("")}</ul></div>`;
}

function strengthsHtml(r) {
  if (!r.strengths || !r.strengths.length) return "";
  const items = r.strengths.map((s) =>
    `<div class="diag"><div class="diag-title"><span class="sev" style="background:#16a34a"></span>${esc(s.title)}</div><div class="diag-body">${esc(s.body)}</div><ul class="acts">${s.keep.map((k) => `<li>${esc(k)}</li>`).join("")}</ul></div>`
  ).join("");
  return `<h2>Yang sudah bagus — pertahankan</h2>${items}`;
}

function scorecard(r) {
  const g = GRADE_COLOR[r.grade] || GRADE_COLOR["-"];
  return `<div class="scorecard"><div class="score-big" style="color:${g}">${r.healthScore ?? "-"}<span>/100</span></div><div class="grade-big">Grade ${r.grade}</div></div><div class="chips">${metricChips(r)}</div>`;
}

const REPORT_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif; color:#111827; margin:0; font-size:12px; line-height:1.55; }
  .header { background:#4f46e5; color:#fff; padding:20px 24px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; }
  .header h1 { margin:0; font-size:21px; font-weight:700; }
  .header .sub { font-size:12px; opacity:.85; margin-top:3px; }
  .header .meta { font-size:11px; opacity:.92; text-align:right; line-height:1.7; }
  h2 { font-size:14px; font-weight:700; margin:22px 0 8px; }
  h2 .hint { font-weight:400; color:#9ca3af; font-size:11px; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  th { text-align:left; font-size:9.5px; font-weight:700; letter-spacing:.05em; color:#6b7280; padding:7px 10px; border-bottom:1.5px solid #d1d5db; }
  td { padding:8px 10px; border-bottom:1px solid #eef0f2; font-size:12px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  td.wrap { white-space:normal; line-height:1.4; }
  tr.alt td { background:#f9fafb; }
  td.num { text-align:center; font-variant-numeric:tabular-nums; font-weight:700; }
  td.r { text-align:right; font-variant-numeric:tabular-nums; }
  td.gradecell { text-align:center; }
  .grade { display:inline-block; min-width:22px; color:#fff; font-weight:700; font-size:11px; padding:2px 0; border-radius:999px; text-align:center; }
  .card { border:1px solid #e5e7eb; border-left:4px solid #999; border-radius:10px; padding:15px 18px; margin:12px 0; page-break-inside:avoid; }
  .card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
  .card-name { font-size:14px; font-weight:700; }
  .score-badge { color:#fff; font-weight:700; font-size:12px; padding:4px 0; border-radius:999px; min-width:64px; text-align:center; font-variant-numeric:tabular-nums; }
  .chips { margin-bottom:8px; line-height:2; }
  .chip { display:inline-block; background:#f3f4f6; border-radius:6px; padding:3px 9px; font-size:10.5px; margin:0 5px 4px 0; font-variant-numeric:tabular-nums; color:#374151; }
  .chip .dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin:0 2px 0 5px; vertical-align:middle; }
  .diag { margin:9px 0; }
  .diag-title { font-weight:700; font-size:12.5px; color:#111827; }
  .diag-title .sev { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:7px; vertical-align:middle; }
  .diag-body { color:#374151; margin:3px 0 5px; padding-left:14px; }
  .acts { margin:0; padding-left:30px; color:#1f2937; }
  .acts li { margin:3px 0; }
  .profit { border:1.5px solid; border-radius:10px; padding:12px 14px; margin:14px 0; }
  .profit-row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; }
  .profit-label { font-size:16px; font-weight:800; }
  .profit-nums { font-size:12px; color:#374151; }
  .profit-note { font-size:11.5px; color:#374151; margin-top:3px; }
  .scorecard { display:flex; align-items:baseline; gap:14px; margin:14px 0 6px; }
  .score-big { font-size:34px; font-weight:800; line-height:1; }
  .score-big span { font-size:14px; color:#9ca3af; font-weight:600; }
  .grade-big { font-size:18px; font-weight:700; color:#374151; }
  .sim { background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px; padding:12px 14px; margin:14px 0; }
  .sim-title { font-weight:700; color:#4338ca; margin-bottom:4px; }
  .tiles { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0; }
  .tile { border:1px solid #e5e7eb; border-radius:8px; padding:8px 12px; min-width:84px; }
  .tile .l { font-size:9.5px; color:#6b7280; }
  .tile .v { font-size:14px; font-weight:700; color:#111827; }
  .note { background:#f9fafb; border:1px solid #eef0f2; border-radius:8px; padding:8px 12px; font-size:11.5px; color:#374151; margin:6px 0; }
  .note.warn { background:#fef2f2; border-color:#fecaca; color:#b91c1c; }
  .foot { margin-top:22px; padding-top:10px; border-top:1px solid #e5e7eb; font-size:9.5px; color:#9ca3af; font-style:italic; }
`;

function htmlDoc({ brand, title, sub, meta, body }) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(brand || title)}</title><style>${REPORT_CSS}</style></head>
<body>
  <div class="header"><div><h1>${esc(brand || title)}</h1><div class="sub">${esc(sub)}</div></div><div class="meta">${meta}</div></div>
  ${body}
  <div class="foot">Benchmark = patokan kasar lintas industri, bukan target mutlak. Patokan terbaik tetap baseline akun sendiri.${brand ? " &middot; " + esc(brand) : ""}</div>
</body></html>`;
}

function printHtml(html) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const d = iframe.contentWindow.document;
  d.open(); d.write(html); d.close();
  const cleanup = () => { try { document.body.removeChild(iframe); } catch (e) {} };
  iframe.contentWindow.onafterprint = cleanup;
  setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(cleanup, 60000); }, 400);
}

const today = () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

// ---------- 1) CSV massal ----------
export function generateReport({ brand, context, rows }) {
  const summaryRows = rows.map((row, i) => {
    const r = row.result, g = GRADE_COLOR[r.grade] || GRADE_COLOR["-"];
    return `<tr${i % 2 ? ' class="alt"' : ""}><td title="${esc(row.name)}">${esc(row.name)}</td><td class="num" style="color:${g}">${r.healthScore ?? "-"}</td><td class="gradecell"><span class="grade" style="background:${g}">${r.grade}</span></td><td class="wrap">${esc(r.diagnoses[0].title)}</td></tr>`;
  }).join("");
  const cards = rows.map((row) => {
    const r = row.result, g = GRADE_COLOR[r.grade] || GRADE_COLOR["-"];
    return `<div class="card" style="border-left-color:${g}"><div class="card-head"><div class="card-name">${esc(row.name)}</div><div class="score-badge" style="background:${g}">${r.healthScore ?? "-"} &middot; ${r.grade}</div></div><div class="chips">${metricChips(r)}</div>${profitBanner(r)}${diagsHtml(r)}</div>`;
  }).join("");
  const body = `<h2>Ringkasan Kampanye <span class="hint">(terburuk dulu)</span></h2>
    <table><colgroup><col style="width:38%"><col style="width:11%"><col style="width:11%"><col style="width:40%"></colgroup>
    <thead><tr><th>KAMPANYE</th><th style="text-align:center">SKOR</th><th style="text-align:center">GRADE</th><th>MASALAH UTAMA</th></tr></thead><tbody>${summaryRows}</tbody></table>
    <h2>Detail &amp; Rekomendasi</h2>${cards}`;
  const meta = `${esc(context.platformLabel)}<br>${esc(context.industryLabel)} &middot; Margin ${esc(context.margin || "-")}%<br>${today()}`;
  printHtml(htmlDoc({ brand, title: "Ads Performance Report", sub: "Laporan Diagnosa Performa Iklan", meta, body }));
}

// ---------- 2) Satu kampanye ----------
export function generateSingleReport({ brand, campaignName, periodLabel, context, result }) {
  const body = `<h2>${esc(campaignName || "Kampanye")}</h2>
    ${profitBanner(result)}
    ${scorecard(result)}
    <h2>Diagnosa &amp; Rekomendasi</h2>${diagsHtml(result)}
    ${simBlock(result)}
    ${strengthsHtml(result)}`;
  const meta = `${esc(context.platformLabel)}<br>${esc(context.industryLabel)}<br>${esc(periodLabel || today())}`;
  printHtml(htmlDoc({ brand, title: "Laporan Kampanye", sub: "Diagnosa Performa Iklan", meta, body }));
}

// ---------- 3) Tren waktu ----------
export function generateTrendReport({ brand, context, analysis }) {
  const s = analysis.summary, cur = context.currency;
  const tile = (l, v) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  const tiles = [
    tile("Impr", s.impressions != null ? s.impressions.toLocaleString("id-ID") : "-"),
    tile("Cost", money(s.spend, cur)),
    tile("Clicks", s.clicks != null ? s.clicks.toLocaleString("id-ID") : "-"),
    tile("CTR", s.ctr != null ? s.ctr + "%" : "-"),
    tile("CPM", money(s.cpm, cur)),
    tile("Konversi", s.conversions != null ? s.conversions.toLocaleString("id-ID") : "-"),
    tile("CPA", money(s.cpa, cur)),
    tile("ROAS", s.roas != null ? s.roas + "x" : "-"),
  ].join("");
  const TM = { spend: "Spend", impressions: "Impression", ctr: "CTR", cpm: "CPM", cpa: "CPA", roas: "ROAS", conversions: "Konversi" };
  const trendRows = Object.keys(TM).filter((k) => analysis.trends[k]).map((k) => {
    const t = analysis.trends[k];
    const cls = t.good == null ? "trend-flat" : t.good ? "trend-up" : "trend-down";
    const arrow = t.dir === "up" ? "▲" : t.dir === "down" ? "▼" : "▬";
    return `<tr><td>${TM[k]}</td><td class="r" style="font-weight:700" >${arrow} ${t.changePct > 0 ? "+" : ""}${t.changePct}%</td></tr>`;
  }).join("");
  const notes = analysis.notes.map((n, i) => `<div class="note${analysis.fatigue && i === 0 ? " warn" : ""}">${esc(n)}</div>`).join("");
  const body = `<h2>Ringkasan Periode</h2><div class="tiles">${tiles}</div>
    ${notes}
    <h2>Tren Metrik</h2><table><colgroup><col style="width:60%"><col style="width:40%"></colgroup><thead><tr><th>METRIK</th><th style="text-align:right">PERUBAHAN</th></tr></thead><tbody>${trendRows}</tbody></table>
    <h2>Diagnosa Total Periode</h2>${profitBanner(analysis.result)}<div class="chips">${metricChips(analysis.result)}</div>${diagsHtml(analysis.result)}${simBlock(analysis.result)}`;
  const meta = `${esc(context.platformLabel)} &middot; ${esc(context.industryLabel)}<br>${esc(analysis.dateRange.label)}: ${esc(analysis.dateRange.from)} – ${esc(analysis.dateRange.to)}<br>${today()}`;
  printHtml(htmlDoc({ brand, title: "Laporan Tren Waktu", sub: "Performa Iklan per Periode", meta, body }));
}

// ---------- 4) Riwayat ----------
export function generateHistoryReport({ brand, history }) {
  const rows = history.map((h, i) => {
    const g = GRADE_COLOR[h.grade] || GRADE_COLOR["-"];
    const prev = history[i - 1];
    const d = prev && h.healthScore != null && prev.healthScore != null ? h.healthScore - prev.healthScore : null;
    return `<tr${i % 2 ? ' class="alt"' : ""}><td class="wrap">${esc(h.campaignName || "-")}<div style="font-size:9px;color:#9ca3af">${esc(h.periodLabel)}</div></td>
      <td class="r">${h.ctr != null ? h.ctr + "%" : "-"}</td>
      <td class="r">${h.cpa != null ? fmtVal("cpa", h.cpa, h.currency, h.rate) : "-"}</td>
      <td class="r">${h.roas != null ? h.roas + "x" : "-"}</td>
      <td class="r" style="color:${h.poas == null ? "#6b7280" : h.poas >= 1 ? "#16a34a" : "#dc2626"}">${h.poas != null ? h.poas + "x" : "-"}</td>
      <td class="num" style="color:${g}">${h.healthScore ?? "-"}</td>
      <td class="r" style="color:${d == null ? "#9ca3af" : d >= 0 ? "#16a34a" : "#dc2626"};font-weight:700">${d == null ? "-" : (d > 0 ? "+" : "") + d}</td></tr>`;
  }).join("");
  const body = `<h2>Riwayat Performa (${history.length} entri)</h2>
    <table><colgroup><col style="width:34%"><col style="width:11%"><col style="width:14%"><col style="width:10%"><col style="width:10%"><col style="width:10%"><col style="width:11%"></colgroup>
    <thead><tr><th>KAMPANYE / PERIODE</th><th style="text-align:right">CTR</th><th style="text-align:right">CPA</th><th style="text-align:right">ROAS</th><th style="text-align:right">POAS</th><th style="text-align:center">SKOR</th><th style="text-align:right">Δ</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="note" style="margin-top:12px">Δ = selisih Health Score dibanding entri sebelumnya (urut periode). Hijau = membaik, merah = memburuk.</div>`;
  printHtml(htmlDoc({ brand, title: "Riwayat Performa Iklan", sub: "Perbandingan Antar Periode", meta: today(), body }));
}
