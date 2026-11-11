/**
 * BATCH TAGAR BOT (admin) — Order -> tab "📋 Batch Tagar". Butuh sql/koin-usdt-23-bot-batch.sql dan 23b.
 * Semua tagar pesanan Bot/Bulk yang sudah di-ACC dibagi per batch (per paket BEM/SEM/LEM), urutan = urutan di-ACC.
 * Isi per batch bisa diubah; centang batch = tagar terkirim; salin satu klik; download ZIP; batalkan pesanan (koin kembali).
 */
const BB = { size: 50, pending: 0, entries: [], orders: [], pkg: "BEM", loaded: false, bound: false };
const bbPin = () => sessionStorage.getItem("akun_admin_pin");
const bbNum = n => Number(n || 0).toLocaleString("id-ID");
const bbRp = n => "Rp " + bbNum(n);
const bbPkgs = ["BEM", "SEM", "LEM"];

async function bbRpc(name, params) {
    const res = await supabaseClient.rpc(name, { p_pin: bbPin(), ...params });
    if (res.error) {
        const m = res.error.message || ""; console.error(res.error);
        if (m.includes("PIN admin salah")) { sessionStorage.removeItem("akun_admin_pin"); ordRenderGate("batch"); showToast("PIN admin tidak valid, masukkan ulang", "danger"); }
        else if (/does not exist|schema cache|Could not find the function/i.test(m)) showToast("Jalankan dulu sql/koin-usdt-23-bot-batch.sql dan koin-usdt-23b-batch-admin.sql di Supabase SQL Editor", "danger");
        else showToast(m || "Terjadi kesalahan", "danger");
    }
    return res;
}

async function bbInit() {
    if (!bbPin()) { ordRenderGate("batch"); return; }
    const { data, error } = await bbRpc("bq_get", {});
    if (error) return;
    Object.assign(BB, { size: data.size, pending: data.pending, entries: data.entries || [], orders: data.orders || [], loaded: true });
    bbRender();
}
const bbBatches = pkg => {
    const m = new Map();
    BB.entries.filter(e => e.dashboard === pkg).forEach(e => { if (!m.has(e.batch)) m.set(e.batch, []); m.get(e.batch).push(e); });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
};
const bbTags = list => list.map(e => e.tagar).join("\n");

function bbRender() {
    const pane = document.getElementById("ordPane-batch");
    const all = BB.entries, unsent = all.filter(e => !e.sent), pkgCount = p => all.filter(e => e.dashboard === p).length;
    const batches = bbBatches(BB.pkg);
    pane.innerHTML = `
    <section class="panel table-section"><div class="panel-title">📋 Batch Tagar Bot <span class="panel-hint">semua tagar pesanan yang sudah di-ACC, dibagi per batch (urutan = urutan di-ACC)</span></div>
        <div class="bb-stats">
            <div><span>Total tagar</span><b>${bbNum(all.length)}</b></div>
            <div><span>Belum terkirim</span><b>${bbNum(unsent.length)}</b></div>
            <div><span>Sudah terkirim</span><b>${bbNum(all.length - unsent.length)}</b></div>
            <div><span>Menunggu ACC</span><b>${bbNum(BB.pending)} pesanan</b></div>
        </div>
        <div class="bb-tools">
            <label class="bb-size">Isi per batch <input type="number" id="bbSize" min="1" max="5000" value="${BB.size}" inputmode="numeric"> tagar</label>
            <button type="button" class="btn btn-primary" id="bbSaveSize">💾 Simpan</button>
            <span class="bb-sep"></span>
            <button type="button" class="btn btn-success" data-bbcopy="unsent-all" ${unsent.length ? "" : "disabled"}>📋 Salin semua belum terkirim (${bbNum(unsent.length)})</button>
            <button type="button" class="btn btn-ghost" data-bbcopy="all-all" ${all.length ? "" : "disabled"}>📋 Salin semua (${bbNum(all.length)})</button>
            <button type="button" class="btn btn-ghost" id="bbZip" ${all.length ? "" : "disabled"}>⬇ Download ZIP batch</button>
            <label class="bb-zipopt"><input type="checkbox" id="bbZipUnsent"> ZIP hanya yang belum terkirim</label>
        </div>
        <div class="hold-tabs bb-pkg">${bbPkgs.map(p => `<button type="button" data-bbpkg="${p}" class="${BB.pkg === p ? "on" : ""}">${p} <i>${bbNum(pkgCount(p))}</i></button>`).join("")}</div>
        <div class="bb-pkgtools"><button type="button" class="btn btn-ghost mini" data-bbcopy="unsent-pkg">📋 Salin ${BB.pkg} belum terkirim (${bbNum(all.filter(e => e.dashboard === BB.pkg && !e.sent).length)})</button>
            <button type="button" class="btn btn-ghost mini" data-bbcopy="all-pkg">📋 Salin semua ${BB.pkg} (${bbNum(pkgCount(BB.pkg))})</button></div>
        <div class="bb-grid">${batches.length ? batches.map(([no, list]) => bbCardHtml(BB.pkg, no, list)).join("") : `<div class="rn-empty" style="display:block;">Belum ada tagar ${BB.pkg} di antrian. Tagar masuk setelah pesanan di-ACC.</div>`}</div>
    </section>
    <section class="panel table-section"><div class="panel-title">🧾 Pesanan Aktif <span class="panel-hint">sudah di-ACC & belum selesai dikirim</span></div>
        <div class="table-wrap"><table style="min-width:720px;"><thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Paket</th><th>Tagar</th><th>Terkirim</th><th>Aksi</th></tr></thead><tbody>
        ${BB.orders.map(o => `<tr><td>#${o.id}<br><small>${bbWaktu(o.processed_at)}</small></td><td><b>${escapeHtml(o.username)}</b></td>
            <td>${o.dashboard === "BULK" ? "🧺 BULK" : escapeHtml(o.dashboard) + " Bot"}</td><td>${bbNum(o.n_total)}</td>
            <td>${o.n_sent ? `<span class="badge badge-warn">⏳ ${bbNum(o.n_sent)}/${bbNum(o.n_total)}</span>` : "—"}<br><small>${bbRp(o.total_harga)}</small></td>
            <td>${o.n_sent ? `<small>sebagian sudah dikirim — tidak bisa dibatalkan</small>` : `<button type="button" class="btn btn-danger mini" data-bbcancel="${o.id}">✖ Batalkan & kembalikan koin</button>`}</td></tr>`).join("")}
        </tbody></table></div>
        ${BB.orders.length ? "" : `<div class="rn-empty" style="display:block;">Tidak ada pesanan aktif.</div>`}
    </section>`;
    pane.querySelectorAll("input[data-bbmark]").forEach(c => { c.indeterminate = c.dataset.part === "1"; });
    if (!BB.bound) { BB.bound = true; pane.addEventListener("click", bbOnClick); pane.addEventListener("change", bbOnChange); }
}
const bbWaktu = iso => iso ? new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

function bbCardHtml(pkg, no, list) {
    const sent = list.filter(e => e.sent).length, full = sent === list.length, part = sent > 0 && !full;
    const open = bbCardHtml.open && bbCardHtml.open.has(pkg + ":" + no);
    return `<div class="bb-card ${full ? "done" : part ? "part" : ""}">
        <div class="bb-card-head"><b>Batch ${no}</b><span>${bbNum(list.length)} tagar${list.length < BB.size ? ` <small>(isi ${list.length}/${BB.size})</small>` : ""}</span></div>
        <div class="bb-card-state">${full ? "✅ Semua terkirim" : part ? `⏳ ${bbNum(sent)}/${bbNum(list.length)} terkirim` : "⏳ Belum dikirim"}</div>
        <label class="bb-check"><input type="checkbox" data-bbmark="${pkg}:${no}" data-part="${part ? 1 : 0}" ${full ? "checked" : ""}> Sudah dikirim</label>
        <div class="bb-card-actions"><button type="button" class="btn btn-ghost mini" data-bbcopy="batch" data-pkg="${pkg}" data-no="${no}">📋 Salin batch</button></div>
        <details ${open ? "open" : ""} data-bbdet="${pkg}:${no}"><summary>Lihat tagar</summary>
            <ol class="bb-list">${list.map(e => `<li class="${e.sent ? "sent" : ""}"><button type="button" class="copy-chip" data-copy="${escapeHtml(e.tagar)}" title="Klik untuk menyalin">${escapeHtml(e.tagar)}</button> <small>${escapeHtml(e.username)}</small></li>`).join("")}</ol></details>
    </div>`;
}

async function bbCopy(text, label) {
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (__) {} ta.remove(); }
    showToast(`${label} tersalin`, "success");
}
async function bbOnClick(e) {
    const pk = e.target.closest("[data-bbpkg]"); if (pk) { BB.pkg = pk.dataset.bbpkg; bbRender(); return; }
    const det = e.target.closest("details[data-bbdet]");
    if (det && e.target.closest("summary")) { bbCardHtml.open = bbCardHtml.open || new Set(); const k = det.dataset.bbdet; setTimeout(() => { if (det.open) bbCardHtml.open.add(k); else bbCardHtml.open.delete(k); }, 0); return; }
    const c = e.target.closest("[data-bbcopy]");
    if (c) {
        const k = c.dataset.bbcopy, all = BB.entries;
        if (k === "unsent-all") { const l = all.filter(x => !x.sent); bbCopy(bbTags(l), `${bbNum(l.length)} tagar`); }
        else if (k === "all-all") bbCopy(bbTags(all), `${bbNum(all.length)} tagar`);
        else if (k === "unsent-pkg") { const l = all.filter(x => x.dashboard === BB.pkg && !x.sent); bbCopy(bbTags(l), `${bbNum(l.length)} tagar ${BB.pkg}`); }
        else if (k === "all-pkg") { const l = all.filter(x => x.dashboard === BB.pkg); bbCopy(bbTags(l), `${bbNum(l.length)} tagar ${BB.pkg}`); }
        else if (k === "batch") { const l = all.filter(x => x.dashboard === c.dataset.pkg && x.batch === Number(c.dataset.no)); bbCopy(bbTags(l), `Batch ${c.dataset.no} (${bbNum(l.length)} tagar)`); }
        return;
    }
    if (e.target.closest("#bbSaveSize")) { bbSaveSize(); return; }
    if (e.target.closest("#bbZip")) { bbDownloadZip(); return; }
    const cx = e.target.closest("[data-bbcancel]"); if (cx) bbCancel(Number(cx.dataset.bbcancel));
}
async function bbOnChange(e) {
    const c = e.target.closest("input[data-bbmark]"); if (!c) return;
    const [pkg, no] = c.dataset.bbmark.split(":"), ids = BB.entries.filter(x => x.dashboard === pkg && x.batch === Number(no)).map(x => x.id);
    const { error } = await bbRpc("bq_mark", { p_ids: ids, p_sent: c.checked });
    if (error) { c.checked = !c.checked; return; }
    showToast(c.checked ? `Batch ${no} ${pkg} ditandai terkirim` : `Batch ${no} ${pkg} dikembalikan ke belum terkirim`, "success");
    bbInit();
}
async function bbSaveSize() {
    const n = parseInt(document.getElementById("bbSize").value, 10);
    if (!n || n < 1 || n > 5000) { showToast("Isi per batch harus 1 – 5000", "danger"); return; }
    const { error } = await bbRpc("bq_set_size", { p_size: n });
    if (!error) { showToast(`Isi per batch = ${n}. Batch pelanggan ikut menyesuaikan.`, "success"); bbInit(); }
}
function bbCancel(id) {
    const o = BB.orders.find(x => x.id === id); if (!o) return;
    openConfirmModal({ icon: "✖", iconClass: "danger", title: "Batalkan pesanan?",
        body: `Pesanan <b>#${o.id}</b> milik <b>${escapeHtml(o.username)}</b> (${bbNum(o.n_total)} tagar) dibatalkan. Tagarnya keluar dari antrian batch, dicatat ditolak, catatan BSL Profit dihapus, dan koin <b>${bbRp(o.koin || o.total_harga)}</b> dikembalikan ke pelanggan.`,
        confirmText: "Ya, Batalkan", confirmClass: "btn-danger",
        onConfirm: async () => { const { error } = await bbRpc("bot_cancel_approved", { p_id: id }); if (!error) { showToast("Pesanan dibatalkan, koin dikembalikan", "success"); bbInit(); } } });
}

/* ---------------- ZIP (tanpa pustaka: format "stored") ---------------- */
function bbCrcTable() { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
function bbZip(files) {
    const enc = new TextEncoder(), table = bbCrcTable(), parts = [], central = []; let offset = 0;
    const d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(f => {
        const name = enc.encode(f.name), data = enc.encode(f.text); let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        crc = (crc ^ 0xFFFFFFFF) >>> 0;
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
        lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
        lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
        parts.push(new Uint8Array(lh.buffer), name, data);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
        ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
        ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);
        offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}
function bbDownloadZip() {
    const onlyUnsent = document.getElementById("bbZipUnsent").checked, files = [];
    bbPkgs.forEach(p => bbBatches(p).forEach(([no, list]) => {
        const l = onlyUnsent ? list.filter(e => !e.sent) : list; if (!l.length) return;
        files.push({ name: `${p}/batch-${String(no).padStart(3, "0")}.txt`, text: bbTags(l) + "\n" });
    }));
    if (!files.length) { showToast("Tidak ada tagar untuk diunduh", "danger"); return; }
    const sum = bbPkgs.map(p => `${p}: ${bbBatches(p).length} batch, ${BB.entries.filter(e => e.dashboard === p).length} tagar`).join("\n");
    files.push({ name: "ringkasan.txt", text: `Isi per batch: ${BB.size}\nDibuat: ${new Date().toLocaleString("id-ID")}\n${onlyUnsent ? "Hanya yang belum terkirim\n" : ""}${sum}\n` });
    const url = URL.createObjectURL(bbZip(files)), a = document.createElement("a");
    a.href = url; a.download = `batch-tagar-${new Date().toISOString().slice(0, 10)}.zip`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`ZIP berisi ${files.length - 1} file batch diunduh`, "success");
}
