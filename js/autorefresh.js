/**
 * AUTO-REFRESH (admin) — memuat ulang data halaman yang sedang dibuka saat ada perubahan
 * (pesanan baru dari pelanggan, perubahan dari admin lain, dll). Butuh sql/koin-usdt-21-autorefresh.sql.
 * Tidak menimpa pekerjaan: ditunda bila kotak dialog terbuka, sedang mengetik, atau Mode Edit List-Farm aktif.
 */
(function () {
    const INTERVAL = 12000;
    let last = null, pending = new Set(), busyFetch = false, fails = 0, timer = null;

    const safe = fn => { try { const r = typeof fn === "function" ? fn() : null; if (r && r.catch) r.catch(e => console.warn("autorefresh:", e)); } catch (e) { console.warn("autorefresh:", e); } };
    const modalOpen = () => { const m = document.getElementById("modalOverlay"); return !!(m && m.classList.contains("show")); };
    const typing = () => {
        const a = document.activeElement; if (!a) return false;
        if (a.tagName === "TEXTAREA" || a.tagName === "SELECT") return true;
        return a.tagName === "INPUT" && !["checkbox", "radio", "button", "submit"].includes(a.type);
    };
    const blocked = () => modalOpen() || typing() || (typeof produkEditAll !== "undefined" && produkEditAll);
    const page = () => { const b = document.querySelector("#pageNav button.active"); return b ? b.dataset.page : "dashboard"; };

    function apply(scopes) {
        const has = (...s) => s.some(x => scopes.has(x));
        // lencana / notifikasi selalu diperbarui
        if (has("requests", "orders")) {
            safe(typeof loadRenewals === "function" && loadRenewals); safe(() => typeof orqRefresh === "function" && orqRefresh(true));
            safe(typeof boRefreshBadge === "function" && boRefreshBadge); safe(typeof kcRefreshBadges === "function" && kcRefreshBadges);
            safe(typeof kmRefreshBadge === "function" && kmRefreshBadge); safe(typeof poRefreshBadge === "function" && poRefreshBadge);
            safe(typeof loadUncheckedStats === "function" && loadUncheckedStats);
        }
        const p = page();
        const run = (cond, fn) => { if (cond && typeof fn === "function") safe(fn); };
        if (p === "dashboard") run(has("orders", "requests"), loadData);
        else if (p === "arsip") run(has("orders"), typeof renderArchivePage === "function" ? renderArchivePage : null);
        else if (p === "akun") run(has("coin", "orders", "requests"), typeof initAkunPelangganPage === "function" ? initAkunPelangganPage : null);
        else if (p === "supply") run(has("requests", "catalog"), typeof initSupplyPage === "function" ? initSupplyPage : null);
        else if (p === "order") run(has("requests", "coin", "catalog", "orders"), typeof initOrderPage === "function" ? initOrderPage : null);
        else if (p === "farmsell") run(has("catalog", "requests"), typeof initFarmSellPage === "function" ? initFarmSellPage : null);
        else if (p === "havsell") run(has("catalog", "requests"), typeof initHavSellPage === "function" ? initHavSellPage : null);
        else if (p === "kvcatalog") run(has("catalog", "requests"), typeof initKvPage === "function" ? initKvPage : null);
        else if (p === "statistik") run(has("orders"), typeof initGrafikPage === "function" ? initGrafikPage : null);
        else if (p === "pengumuman") run(has("announce"), typeof initAnnouncePage === "function" ? initAnnouncePage : null);
        // halaman dengan formulir (Price, Panel, CashFlow, BSL, Modal, Custom Price, ...) sengaja TIDAK dimuat ulang otomatis
    }

    async function tick() {
        if (busyFetch || document.hidden || typeof supabaseClient === "undefined") return;
        busyFetch = true;
        try {
            const { data, error } = await supabaseClient.rpc("sync_get");
            if (error || !data) { if (++fails >= 3) stop(); return; }
            fails = 0;
            if (last === null) { last = data; return; }                       // pembacaan pertama = acuan
            Object.keys(data).forEach(k => { if (data[k] !== last[k]) pending.add(k); });
            last = data;
            if (pending.size && !blocked()) { const s = pending; pending = new Set(); apply(s); }
        } finally { busyFetch = false; }
    }
    function start() { if (!timer) timer = setInterval(tick, INTERVAL); tick(); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
    window.addEventListener("online", tick);
    document.addEventListener("DOMContentLoaded", () => setTimeout(start, 2500));
})();
