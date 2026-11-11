const waDigitsRow = v => String(v || "").replace(/[^0-9]/g, "");

let dashHold = "aktif";           // "aktif" | "tunda"  (halaman daftar langganan)
const holdSel = new Set();         // id langganan yang dicentang untuk ditunda / diaktifkan

async function loadData() {
    const loadingState = document.getElementById("tableLoadingState");
    const emptyState = document.getElementById("tableEmptyState");
    const todayUTC = getUTCDate();

    loadingState.style.display = "flex";
    emptyState.style.display = "none";
    tbody.innerHTML = "";
    if (typeof loadRenewals === "function") loadRenewals();

    const { data, error } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("dashboard", currentDashboard)
        .order("id", { ascending: true });

    loadingState.style.display = "none";

    if (error) {
        console.error(error);
        showToast("Gagal memuat data pesanan", "danger");
        return;
    }

    // Data arsip kini disimpan di tabel `archives` Supabase — pesanan yang
    // sudah diarsipkan sudah dihapus dari tabel `orders`, jadi tidak perlu
    // difilter lagi di sisi frontend.
    const liveRows = data.filter(x => !x.hold), heldRows = data.filter(x => x.hold);
    const activeData = dashHold === "tunda" ? heldRows : liveRows;      // yang ditampilkan di tabel
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt("holdCntAktif", liveRows.length); setTxt("holdCntTunda", heldRows.length);
    document.querySelectorAll("#holdTabs button").forEach(b => b.classList.toggle("on", b.dataset.hold === dashHold));
    setTxt("tableEmptyTitle", dashHold === "tunda" ? "Tidak ada langganan yang ditunda" : "Belum ada pesanan aktif");
    [...holdSel].forEach(id => { if (!activeData.some(x => x.id === id)) holdSel.delete(id); });

    // ringkasan & statistik hanya dari langganan AKTIF (yang ditunda tidak dihitung)
    const total = liveRows.length;
    const selesai = liveRows.filter(x => x.paket_terkirim >= x.paket_total).length;
    const mendekatiLimit = liveRows.filter(x => {
        const s = getOrderStatus(x.paket_terkirim, x.paket_total);
        return s.key === "mendekati";
    }).length;
    const proses = total - selesai;

    document.getElementById("totalOrder").innerText = total;
    document.getElementById("prosesOrder").innerText = proses;
    document.getElementById("selesaiOrder").innerText = selesai;
    document.getElementById("limitOrder").innerText = mendekatiLimit;
    document.getElementById("archiveCountBadge").innerText = await getArchiveCount();

    loadUncheckedStats();

    if (typeof renderDashStats === "function") renderDashStats(liveRows, { proses: proses - mendekatiLimit, mendekati: mendekatiLimit, selesai });

    if (activeData.length === 0) {
        emptyState.style.display = "flex";
        holdUpdateBar();
        return;
    }

    for (let i = 0; i < activeData.length; i++) {
        const item = activeData[i];

        const sudahCheck = item.last_check_utc === todayUTC;
        const status = getOrderStatus(item.paket_terkirim, item.paket_total);
        const limitReached = item.paket_terkirim >= item.paket_total;
        const percent = Math.min(100, Math.round((item.paket_terkirim / item.paket_total) * 100));

        const wa = item.nomor_whatsapp || "-";
        const ket = item.keterangan || "";

        const tr = document.createElement("tr");
        tr.dataset.status = status.key;
        tr.dataset.id = item.id;
        tr.dataset.wa = waDigitsRow(item.nomor_whatsapp);

        const isHold = !!item.hold;
        const actionsHtml = isHold
            ? `
                <button class="btn btn-success btn-icon" onclick="holdOrders([${item.id}], false)" title="Aktifkan kembali">▶</button>
                <button class="btn btn-ghost btn-icon" onclick="editOrder(${item.id})" title="Edit">✏️</button>
                <button class="btn btn-danger btn-icon" onclick="deleteOrder(${item.id})" title="Hapus">🗑</button>
            `
            : limitReached
            ? `
                <button class="btn btn-archive btn-wrap" style="padding:8px 12px; font-size:12px;" onclick="handleArchiveOrder(${item.id})">📥 Simpan ke Arsip</button>
                <button class="btn btn-ghost btn-icon" onclick="editOrder(${item.id})" title="Edit">✏️</button>
                <button class="btn btn-danger btn-icon" onclick="deleteOrder(${item.id})" title="Hapus">🗑</button>
            `
            : `
                <button class="btn btn-success btn-icon" onclick="checkDaily(${item.id})" ${sudahCheck ? "disabled" : ""} title="Centang kirim hari ini">✓</button>
                <button class="btn btn-ghost btn-icon" onclick="editOrder(${item.id})" title="Edit">✏️</button>
                <button class="btn btn-danger btn-icon" onclick="deleteOrder(${item.id})" title="Hapus">🗑</button>
            `;

        // --- Kolom tanggal & sisa durasi (gaya monitoring: mulai / est. selesai / sisa) ---
        const sisaHari = Math.max(0, item.paket_total - item.paket_terkirim);
        const mulaiDate = item.created_at ? new Date(item.created_at) : null;
        const hariTersisaSetelahHariIni = Math.max(0, sisaHari - (sudahCheck ? 0 : 1));
        const selesaiDate = (limitReached || isHold) ? null : addDays(new Date(), hariTersisaSetelahHariIni);

        tr.dataset.nama = (item.nomor_pesanan || "").toLowerCase();
        tr.dataset.tagar = (item.tagar || "").toLowerCase();
        tr.dataset.statusRank = ({ mendekati: 0, proses: 1, selesai: 2 })[status.key] ?? 1;
        tr.dataset.persen = percent;
        tr.dataset.mulai = mulaiDate ? mulaiDate.getTime() : 0;
        tr.dataset.selesai = selesaiDate ? selesaiDate.getTime() : 0;
        tr.dataset.sisa = sisaHari;

        const sisaClass = limitReached ? "sisa-done" : (sisaHari <= 1 ? "sisa-danger" : (sisaHari <= 3 ? "sisa-warn" : "sisa-ok"));
        const sisaLabel = limitReached ? "Selesai" : `${sisaHari} hari`;

        // Tombol pengingat WhatsApp untuk langganan yang hampir/sudah habis
        const waDigits = (item.nomor_whatsapp || "").replace(/[^0-9]/g, "");
        const perluIngatkan = !isHold && (limitReached || sisaHari <= 3) && waDigits;
        const pesanIngat = limitReached
            ? `Halo ${item.nomor_pesanan}, langganan tagar ${item.tagar} sudah mencapai limit (H${item.paket_terkirim}/H${item.paket_total}). Silakan lakukan perpanjangan ya 🙏`
            : `Halo ${item.nomor_pesanan}, langganan tagar ${item.tagar} tersisa ${sisaHari} hari lagi (H${item.paket_terkirim}/H${item.paket_total}). Yuk perpanjang sebelum habis 🙏`;
        const remindBtn = perluIngatkan
            ? `<a class="btn btn-outline btn-icon" href="https://wa.me/${waDigits}?text=${encodeURIComponent(pesanIngat)}" target="_blank" rel="noopener" title="Ingatkan via WhatsApp">💬</a>`
            : "";

        tr.innerHTML = `
            <td data-label="No" class="col-no">${i + 1}</td>

            <td data-label="Pemesan">
                <div class="customer-name"><input type="checkbox" class="hold-sel" data-id="${item.id}" ${holdSel.has(item.id) ? "checked" : ""} title="Pilih untuk ${isHold ? "diaktifkan" : "ditunda"}"> ${escapeHtml(item.nomor_pesanan)}</div>
                <div class="cell-sub">${escapeHtml(wa)}</div>
            </td>

            <td data-label="Tagar">
                <span class="copy-tag" onclick="copyTag('${escapeHtml(item.tagar)}')">${escapeHtml(item.tagar)}</span>
            </td>

            <td data-label="Status">
                ${isHold ? `<span class="badge badge-hold">⏸ Ditunda</span>` : `<span class="badge ${status.badgeClass}">${status.icon} ${status.label}</span>`}
            </td>

            <td data-label="Progress" class="progress-cell">
                <div class="progress-text">H${item.paket_terkirim}/H${item.paket_total} <span class="progress-pct">${percent}%</span></div>
                <div class="progress-track">
                    <div class="progress-fill ${status.barClass}" style="width:${percent}%;"></div>
                </div>
            </td>

            <td data-label="Tgl Mulai" class="date-cell">${mulaiDate ? fmtTanggal(mulaiDate) : "-"}</td>

            <td data-label="Est. Selesai" class="date-cell">${selesaiDate ? fmtTanggal(selesaiDate) : "-"}</td>

            <td data-label="Sisa Durasi"><span class="sisa-pill ${sisaClass}">${sisaLabel}</span></td>

            <td data-label="Keterangan">
                <span class="keterangan-text" data-copy="${escapeHtml(ket)}" onclick="copyKeterangan('${escapeHtml(ket)}')">${escapeHtml(ket)}</span>
            </td>

            <td data-label="Aksi" class="col-aksi">
                <div class="actions-cell">${actionsHtml}${remindBtn}</div>
            </td>
        `;

        tbody.appendChild(tr);
    }

    // terapkan ulang urutan kolom (jika sedang diurutkan) & filter pencarian
    if (typeof applyDashboardSort === "function") applyDashboardSort();
    filterTable();
    holdUpdateBar();
    if (typeof orqRefresh === "function") orqRefresh();
}

/* ---------------- TUNDA / AKTIFKAN langganan (checklist) ---------------- */
function holdUpdateBar() {
    const n = holdSel.size, bar = document.getElementById("holdBar"); if (!bar) return;
    bar.classList.toggle("has-sel", n > 0);
    document.getElementById("holdSelInfo").textContent = `${n} dipilih`;
    document.getElementById("holdDoBtn").textContent = dashHold === "tunda" ? "▶ Aktifkan yang dipilih" : "⏸ Tunda yang dipilih";
    document.getElementById("holdDoBtn").disabled = n === 0;
    document.getElementById("holdArchiveBtn").disabled = n === 0;
    const vis = [...document.querySelectorAll("#tableBody .hold-sel")].filter(c => c.closest("tr").style.display !== "none");
    document.getElementById("holdSelAll").checked = vis.length > 0 && vis.every(c => c.checked);
}
async function holdOrders(ids, hold) {
    if (!ids.length) return;
    const { error } = await supabaseClient.from("orders").update({ hold: !!hold, hold_at: hold ? new Date().toISOString() : null }).in("id", ids);
    if (error) {
        console.error(error);
        showToast(/hold/i.test(error.message || "") ? "Jalankan dulu sql/koin-usdt-18-hold-tagar.sql di Supabase SQL Editor" : "Gagal mengubah status langganan", "danger");
        return;
    }
    holdSel.clear();
    showToast(hold ? `${ids.length} langganan ditunda (pindah ke tab Tunda)` : `${ids.length} langganan diaktifkan kembali`, "success");
    loadData();
}
document.getElementById("holdTabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-hold]"); if (!b || b.dataset.hold === dashHold) return;
    dashHold = b.dataset.hold; holdSel.clear();
    if (typeof orqApplyView === "function") orqApplyView();
    loadData();
});
document.getElementById("tableBody").addEventListener("change", e => {
    const c = e.target.closest(".hold-sel"); if (!c) return;
    const id = Number(c.dataset.id); if (c.checked) holdSel.add(id); else holdSel.delete(id); holdUpdateBar();
});
document.getElementById("holdSelAll").addEventListener("change", e => {
    document.querySelectorAll("#tableBody .hold-sel").forEach(c => {
        if (c.closest("tr").style.display === "none") return;
        c.checked = e.target.checked; const id = Number(c.dataset.id); if (e.target.checked) holdSel.add(id); else holdSel.delete(id);
    });
    holdUpdateBar();
});
document.getElementById("holdClearBtn").addEventListener("click", () => { holdSel.clear(); document.querySelectorAll("#tableBody .hold-sel").forEach(c => { c.checked = false; }); holdUpdateBar(); });
document.getElementById("holdDoBtn").addEventListener("click", () => holdOrders([...holdSel], dashHold !== "tunda"));

/* Arsipkan langganan yang dicentang (aktif maupun tunda), walau BELUM selesai. Otomatis muncul juga di Arsip pelanggan. */
document.getElementById("holdArchiveBtn").addEventListener("click", async () => {
    const ids = [...holdSel]; if (!ids.length) return;
    const { data, error } = await supabaseClient.from("orders").select("*").in("id", ids);
    if (error || !data || !data.length) { showToast("Gagal memuat data pesanan", "danger"); return; }
    const belum = data.filter(o => o.paket_terkirim < o.paket_total).length, held = data.filter(o => o.hold).length;
    openConfirmModal({
        icon: "📥", iconClass: "archive", title: `Arsipkan ${data.length} langganan?`,
        body: `<b>${data.length} langganan</b> terpilih${held ? ` (${held} di antaranya sedang ditunda)` : ""} akan dipindahkan ke <b>Data Arsip</b>.`
            + (belum ? `<br><br>⚠️ <b>${belum}</b> di antaranya <b>belum selesai</b> (sisa hari masih ada) dan tetap diarsipkan. Langganan ini juga akan muncul di <b>Arsip pelanggan</b>.` : `<br><br>Langganan ini juga akan muncul di <b>Arsip pelanggan</b>.`),
        confirmText: `Ya, Arsipkan ${data.length}`, confirmClass: "btn-archive",
        onConfirm: async () => {
            const ok = await moveOrdersToArchive(data);
            holdSel.clear(); loadData();
            if (ok) showToast(`${data.length} langganan dipindahkan ke Data Arsip`, "archive");
        }
    });
});

/**
 * Jumlah langganan AKTIF (belum limit) yang belum dicentang / dikirim hari ini,
 * total dan per dashboard (BEM / SEM / LEM).
 */
async function loadUncheckedStats() {
    const { data, error } = await supabaseClient.from("orders").select("*");
    if (error || !data) return;
    const today = getUTCDate(), c = { BEM: 0, SEM: 0, LEM: 0, "FAST-BEM": 0, "FAST-SEM": 0, "FAST-LEM": 0 };
    data.forEach(o => {
        const k = (o.dashboard || "").toUpperCase();
        if (k in c && !o.hold && o.paket_terkirim < o.paket_total && o.last_check_utc !== today) c[k]++;
    });
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    set("ucTotal", total);
    Object.keys(c).forEach(k => set("uc" + k, c[k]));
    const bar = document.getElementById("uncheckedBar");
    if (bar) bar.classList.toggle("all-done", total === 0);
}
setInterval(loadUncheckedStats, 60000);
document.querySelectorAll(".uc-chip[data-uc]").forEach(ch => ch.addEventListener("click", () => {
    const tab = document.querySelector(`#dashboardTabs .tab[data-dashboard="${ch.dataset.uc}"]`);
    if (tab) tab.click();
}));

/**
 * Pindahkan pesanan ke tabel `archives` lalu hapus dari `orders`.
 * Hapus hanya dilakukan kalau penyimpanan ke arsip berhasil (tidak ada data yang hilang).
 * Pelanggan otomatis mendapat notifikasi arsip baru (dibaca dari archives.archived_at).
 */
async function moveOrdersToArchive(list) {
    if (!list || !list.length) return true;
    const rows = list.map(o => ({
        order_id: o.id, dashboard: o.dashboard, nomor_pesanan: o.nomor_pesanan, tagar: o.tagar,
        nomor_whatsapp: o.nomor_whatsapp || "", paket_total: o.paket_total, paket_terkirim: o.paket_terkirim,
        keterangan: o.keterangan || "", created_at: o.created_at || null
    }));
    const { error: insErr } = await supabaseClient.from("archives").insert(rows);
    if (insErr) { console.error(insErr); showToast("Gagal menyimpan ke arsip — tidak ada data yang dipindahkan", "danger"); return false; }
    const { error: delErr } = await supabaseClient.from("orders").delete().in("id", list.map(o => o.id));
    if (delErr) { console.error(delErr); showToast("Tersimpan ke arsip, tapi gagal dihapus dari daftar aktif", "danger"); return false; }
    return true;
}
const isFastDash = d => String(d || "").toUpperCase().startsWith("FAST-");

/**
 * Arsipkan SEMUA langganan yang sudah mencapai limit pada dashboard yang sedang dibuka.
 */
async function archiveAllLimit() {
    const { data, error } = await supabaseClient.from("orders").select("*").eq("dashboard", currentDashboard);
    if (error || !data) { showToast("Gagal memuat data pesanan", "danger"); return; }
    const limited = data.filter(o => !o.hold && o.paket_terkirim >= o.paket_total);
    if (limited.length === 0) { showToast("Tidak ada langganan yang sudah mencapai limit", "danger"); return; }

    openConfirmModal({
        icon: "📥",
        iconClass: "archive",
        title: "Arsipkan Semua yang Limit?",
        body: `<b>${limited.length} langganan</b> di dashboard <b>${currentDashboard}</b> yang sudah mencapai limit akan dipindahkan ke <b>Data Arsip</b>. Data tidak hilang dan bisa dipulihkan kapan saja.`,
        confirmText: `Ya, Arsipkan ${limited.length}`,
        confirmClass: "btn-archive",
        onConfirm: async () => {
            const ok = await moveOrdersToArchive(limited);
            loadData();
            if (ok) showToast(`${limited.length} langganan dipindahkan ke Data Arsip`, "archive");
        }
    });
}
document.getElementById("archiveAllLimitBtn").addEventListener("click", archiveAllLimit);

function handleArchiveOrder(id) {
    openConfirmModal({
        icon: "📥",
        iconClass: "archive",
        title: "Simpan ke Arsip?",
        body: "Pesanan ini sudah mencapai limit pengiriman dan akan dipindahkan ke <b>Data Arsip</b>. Data tidak akan hilang dan bisa dipulihkan kapan saja.",
        confirmText: "Simpan ke Arsip",
        confirmClass: "btn-archive",
        onConfirm: async () => {
            const { data, error } = await supabaseClient
                .from("orders")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !data) {
                showToast("Gagal mengambil data pesanan", "danger");
                return;
            }

            const success = await archiveOrder(data);
            if (!success) return;

            loadData();
            showToast("Pesanan dipindahkan ke Data Arsip", "archive");
        }
    });
}

async function deleteOrder(id) {
    openConfirmModal({
        icon: "🗑",
        iconClass: "danger",
        title: "Hapus Pesanan?",
        body: "Tindakan ini akan menghapus data pesanan secara permanen dan tidak dapat dibatalkan.",
        confirmText: "Ya, Hapus",
        confirmClass: "btn-danger",
        onConfirm: async () => {
            await supabaseClient.from("orders").delete().eq("id", id);
            loadData();
            showToast("Pesanan berhasil dihapus", "danger");
        }
    });
}

async function editOrder(id) {
    const { data, error } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        showToast("Gagal memuat data pesanan", "danger");
        return;
    }

    openEditModal(data, async ({ nomor, tagar, wa, paket, terkirim, dashboard }) => {
        const ket = createKeterangan(tagar, terkirim, paket, wa);

        const { error: updateError } = await supabaseClient
            .from("orders")
            .update({
                nomor_pesanan: nomor,
                tagar: tagar,
                nomor_whatsapp: wa,
                paket_total: paket,
                paket_terkirim: terkirim,
                keterangan: ket,
                dashboard: dashboard || data.dashboard
            })
            .eq("id", id);

        if (updateError) {
            console.error(updateError);
            showToast("Gagal menyimpan perubahan pesanan", "danger");
            return;
        }

        loadData();
        const pindah = dashboard && String(dashboard).toUpperCase() !== String(data.dashboard).toUpperCase();
        showToast(pindah ? `Pesanan dipindah ke paket ${dashboard.replace("FAST-", "⚡ Fast ")}` : "Perubahan pesanan disimpan", "success");
    });
}
