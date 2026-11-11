/**
 * REQUEST PELANGGAN (admin) — arsip / tunda / aktifkan kembali langganan. Butuh sql/koin-usdt-20-request-langganan.sql.
 * Tampil di Dashboard -> tab "📨 Request" (di samping tab Tunda). Setujui = langsung menjalankan aksinya.
 */
let orqAll = [], orqFilter = "pending", orqLast = 0;
const orqEl = id => document.getElementById(id);
const orqPin = () => sessionStorage.getItem("akun_admin_pin");
const orqLabel = { hold: ["⏸ Tunda", "hold"], activate: ["▶ Aktifkan kembali", "activate"], archive: ["📥 Arsipkan", "archive"] };
const orqWaktu = iso => iso ? new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

async function orqRpc(name, params) {
    const res = await supabaseClient.rpc(name, { p_pin: orqPin(), ...params });
    if (res.error) {
        const m = res.error.message || ""; console.error(res.error);
        if (m.includes("PIN admin salah")) { sessionStorage.removeItem("akun_admin_pin"); orqRender(); showToast("PIN admin tidak valid, masukkan ulang", "danger"); }
        else if (/does not exist|schema cache|Could not find the function/i.test(m)) showToast("Jalankan dulu sql/koin-usdt-20-request-langganan.sql di Supabase SQL Editor", "danger");
        else showToast(m || "Terjadi kesalahan", "danger");
    }
    return res;
}
/** muat daftar request (dibatasi 1x / 15 dtk kecuali force) lalu perbarui angka di tab */
async function orqRefresh(force) {
    if (!orqEl("holdCntReq")) return;
    if (!orqPin()) { orqEl("holdCntReq").textContent = "•"; return; }
    if (!force && Date.now() - orqLast < 15000) return;
    orqLast = Date.now();
    const { data, error } = await supabaseClient.rpc("orq_list", { p_pin: orqPin() });
    if (error) { if (force) await orqRpc("orq_list", {}); return; }
    orqAll = data || [];
    orqEl("holdCntReq").textContent = orqAll.filter(r => r.status === "pending").length;
    orqEl("holdCntReq").parentElement.classList.toggle("has-pending", orqAll.some(r => r.status === "pending"));
    if (dashHold === "req") orqRender();
}
/** tampilkan / sembunyikan halaman Request di dalam bagian Daftar Langganan */
function orqApplyView() {
    const on = dashHold === "req", sec = orqEl("holdTabs").parentElement;
    sec.classList.toggle("orq-mode", on);
    orqEl("reqPanel").style.display = on ? "block" : "none";
    if (on) { orqLast = 0; orqRender(); orqRefresh(true); }
}
function orqRender() {
    const box = orqEl("reqPanel"); if (!box || dashHold !== "req") return;
    if (!orqPin()) {
        box.innerHTML = `<div class="orq-gate"><p class="muted-note">Masukkan PIN admin untuk melihat request pelanggan (sama dengan Akun Pelanggan / Order).</p>
            <div class="orq-gate-row"><input type="password" id="orqPinInput" placeholder="PIN admin" autocomplete="off"><button class="btn btn-primary" id="orqPinBtn">Buka</button></div></div>`;
        const go = async () => {
            const pin = orqEl("orqPinInput").value; if (!pin) return;
            const { data, error } = await supabaseClient.rpc("admin_verify_pin", { p_pin: pin });
            if (error) { showToast("Error database: " + error.message, "danger"); return; }
            if (!data) { showToast("PIN admin salah", "danger"); return; }
            sessionStorage.setItem("akun_admin_pin", pin); orqRefresh(true);
        };
        orqEl("orqPinBtn").addEventListener("click", go); orqEl("orqPinInput").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
        return;
    }
    const nP = orqAll.filter(r => r.status === "pending").length;
    const rows = orqAll.filter(r => orqFilter === "all" ? true : orqFilter === "pending" ? r.status === "pending" : r.status !== "pending");
    const stBadge = r => ({ pending: `<span class="badge badge-warn">⏳ Menunggu</span>`, approved: `<span class="badge badge-ok">✅ Disetujui</span>`,
        rejected: `<span class="badge badge-bad">✖ Ditolak</span>`, cancelled: `<span class="badge badge-hold">Dibatalkan</span>` })[r.status] || r.status;
    box.innerHTML = `<div class="orq-tools">
            <div class="orq-filter">${[["pending", `Menunggu (${nP})`], ["done", "Sudah diproses"], ["all", "Semua"]].map(([k, l]) => `<button type="button" data-orqf="${k}" class="${orqFilter === k ? "on" : ""}">${l}</button>`).join("")}</div>
            ${nP ? `<button type="button" class="btn btn-success" id="orqApproveAll">✅ Setujui semua yang menunggu (${nP})</button>` : ""}
        </div>
        <div class="table-wrap"><table class="orq-table"><thead><tr><th>Waktu</th><th>Pelanggan</th><th>Langganan</th><th>Request</th><th>Catatan pelanggan</th><th>Status</th><th class="col-aksi">Aksi</th></tr></thead><tbody>
        ${rows.map(r => {
            const [lb, cls] = orqLabel[r.jenis] || [r.jenis, ""];
            const info = r.masih_ada ? `H${r.paket_terkirim}/H${r.paket_total}${r.hold_now ? " · ⏸ ditunda" : ""}` : "<small>sudah tidak di daftar aktif</small>";
            return `<tr><td>${orqWaktu(r.created_at)}<br><small>#${r.id}</small></td><td><b>${escapeHtml(r.nomor_pesanan || r.username)}</b><br><small>${escapeHtml(r.username)}</small></td>
                <td><b>${escapeHtml(r.tagar || "-")}</b><br><span class="dash-chip">${escapeHtml(r.dashboard || "")}</span> <small>${info}</small></td>
                <td><span class="orq-chip ${cls}">${lb}</span></td><td class="orq-note">${r.catatan ? escapeHtml(r.catatan) : "—"}</td>
                <td>${stBadge(r)}${r.catatan_admin ? `<div class="orq-note"><small>${escapeHtml(r.catatan_admin)}</small></div>` : ""}</td>
                <td class="col-aksi">${r.status === "pending" ? `<div class="actions-cell"><button type="button" class="btn btn-success btn-wrap" data-orqa="ok" data-id="${r.id}">✓ Setujui</button><button type="button" class="btn btn-danger btn-wrap" data-orqa="no" data-id="${r.id}">✖ Tolak</button></div>` : "—"}</td></tr>`;
        }).join("")}
        </tbody></table></div>
        ${rows.length ? "" : `<div class="state-block"><div class="state-icon">📨</div><div class="state-title">${orqFilter === "pending" ? "Tidak ada request yang menunggu" : "Belum ada request"}</div></div>`}`;
}
function orqApprove(id) {
    const r = orqAll.find(x => x.id === id); if (!r) return;
    const [lb] = orqLabel[r.jenis];
    openConfirmModal({ icon: "✅", iconClass: "archive", title: `Setujui request ${lb.replace(/^\S+\s/, "")}?`,
        body: `<b>${escapeHtml(r.nomor_pesanan || r.username)}</b> — ${escapeHtml(r.tagar || "")} (${escapeHtml(r.dashboard || "")}).<br>` + (r.jenis === "archive" ? "Langganan akan <b>dipindahkan ke Data Arsip</b> dan muncul di Arsip pelanggan, walau belum selesai." : r.jenis === "hold" ? "Langganan akan <b>ditunda</b> (pindah ke tab Tunda)." : "Langganan akan <b>diaktifkan kembali</b> (pindah ke tab Aktif)."),
        confirmText: "Ya, Setujui", confirmClass: "btn-success",
        onConfirm: async () => { const { error } = await orqRpc("orq_process", { p_id: id, p_approve: true }); if (!error) showToast("Request disetujui", "success"); await orqRefresh(true); loadData(); } });
}
function orqReject(id) {
    const r = orqAll.find(x => x.id === id); if (!r) return;
    modalBox.innerHTML = `<div class="modal-icon danger">✖</div><div class="modal-title">Tolak Request?</div>
        <div class="modal-body">Request <b>${escapeHtml(orqLabel[r.jenis][0])}</b> untuk <b>${escapeHtml(r.nomor_pesanan || r.username)}</b> (${escapeHtml(r.tagar || "")}) akan ditandai Ditolak.</div>
        <div class="modal-form"><div class="field"><label for="orqAlasan">Catatan untuk pelanggan (opsional)</label><input type="text" id="orqAlasan" maxlength="200" placeholder="cth. Langganan masih berjalan"></div></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost btn-wrap" id="orqNo">Batal</button><button type="button" class="btn btn-danger btn-wrap" id="orqYes">Tolak</button></div>`;
    modalOverlay.classList.add("show");
    orqEl("orqNo").addEventListener("click", closeModal);
    orqEl("orqYes").addEventListener("click", async () => {
        const catatan = orqEl("orqAlasan").value.trim(); closeModal();
        const { error } = await orqRpc("orq_process", { p_id: id, p_approve: false, p_catatan: catatan });
        if (!error) showToast("Request ditolak", "danger"); orqRefresh(true);
    });
}
function orqApproveAll() {
    const list = orqAll.filter(r => r.status === "pending"); if (!list.length) return;
    const n = (j) => list.filter(r => r.jenis === j).length;
    openConfirmModal({ icon: "✅", iconClass: "archive", title: `Setujui ${list.length} request?`,
        body: `Tunda: <b>${n("hold")}</b> · Aktifkan: <b>${n("activate")}</b> · Arsipkan: <b>${n("archive")}</b>. Semuanya langsung dijalankan.`, confirmText: "Ya, Setujui Semua", confirmClass: "btn-success",
        onConfirm: async () => {
            let ok = 0; for (const r of list) { const { error } = await supabaseClient.rpc("orq_process", { p_pin: orqPin(), p_id: r.id, p_approve: true }); if (!error) ok++; }
            showToast(`${ok} dari ${list.length} request disetujui`, ok === list.length ? "success" : "danger"); await orqRefresh(true); loadData();
        } });
}
document.addEventListener("click", e => {
    const f = e.target.closest("[data-orqf]"); if (f) { orqFilter = f.dataset.orqf; orqRender(); return; }
    const a = e.target.closest("[data-orqa]"); if (a) { const id = Number(a.dataset.id); if (a.dataset.orqa === "ok") orqApprove(id); else orqReject(id); return; }
    if (e.target.closest("#orqApproveAll")) orqApproveAll();
});
