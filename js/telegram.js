/**
 * TELEGRAM (admin) — SETTING -> Telegram. Notifikasi order masuk ke bot Telegram khusus admin.
 * Butuh sql/koin-usdt-24-telegram.sql dan 24b. Database memanggil API Telegram langsung (pg_net).
 */
const tgEl = id => document.getElementById(id);
const tgPin = () => sessionStorage.getItem("akun_admin_pin");
let tgInited = false, tgState = null;
const TG_EVENTS = [
    ["langganan", "Langganan baru / perpanjang (BEM·SEM·LEM)"], ["bot", "Bot Order"], ["bulk", "Bulk Order"], ["koin", "Koin Hayday"], ["voucher", "Voucher"],
    ["supply", "Supply & Stock"], ["preorder", "Pre Order"], ["topup", "Top Up Koin"], ["request", "Request pelanggan (tunda / arsip / aktifkan)"],
    ["farm", "Pembelian Farm Token (otomatis)"], ["hav", "Pembelian HAV Token (otomatis)"]
];

async function tgRpc(name, params) {
    const res = await supabaseClient.rpc(name, { p_pin: tgPin(), ...params });
    if (res.error) {
        const m = res.error.message || ""; console.error(res.error);
        if (m.includes("PIN admin salah")) { sessionStorage.removeItem("akun_admin_pin"); tgEl("tgPinGate").style.display = "block"; tgEl("tgContent").style.display = "none"; showToast("PIN admin tidak valid, masukkan ulang", "danger"); }
        else if (/does not exist|schema cache|Could not find the function/i.test(m)) showToast("Jalankan dulu sql/koin-usdt-24-telegram.sql dan 24b di Supabase SQL Editor", "danger");
        else showToast(m || "Terjadi kesalahan", "danger");
    }
    return res;
}
function initTelegramPage() {
    if (!tgInited) {
        tgInited = true;
        const go = async () => {
            const pin = tgEl("tgPinInput").value; if (!pin) return;
            const { data, error } = await supabaseClient.rpc("admin_verify_pin", { p_pin: pin });
            if (error) { showToast("Error database: " + error.message, "danger"); return; }
            if (!data) { showToast("PIN admin salah", "danger"); return; }
            sessionStorage.setItem("akun_admin_pin", pin); tgEl("tgPinInput").value = ""; tgShow();
        };
        tgEl("tgPinSubmit").addEventListener("click", go);
        tgEl("tgPinInput").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
        tgEl("tgSave").addEventListener("click", tgSave);
        tgEl("tgTest").addEventListener("click", tgTest);
        tgEl("tgFindChat").addEventListener("click", tgFindChat);
        tgEl("tgEvents").innerHTML = TG_EVENTS.map(([k, l]) => `<label class="tg-ev"><input type="checkbox" data-tgev="${k}"> ${l}</label>`).join("");
    }
    if (tgPin()) tgShow(); else { tgEl("tgPinGate").style.display = "block"; tgEl("tgContent").style.display = "none"; }
}
async function tgShow() {
    tgEl("tgPinGate").style.display = "none"; tgEl("tgContent").style.display = "block";
    const { data, error } = await tgRpc("tg_get", {});
    if (error) return;
    tgState = data;
    tgEl("tgAktif").checked = !!data.aktif; tgEl("tgChat").value = data.chat_id || ""; tgEl("tgToken").value = "";
    tgEl("tgToken").placeholder = data.token_set ? `Token tersimpan (${data.token_hint}) — kosongkan bila tidak diganti` : "Tempel token dari @BotFather";
    document.querySelectorAll("[data-tgev]").forEach(c => { c.checked = (data.events || {})[c.dataset.tgev] !== false; });
    tgEl("tgStatus").innerHTML = data.pg_net === false ? `<span class="tg-bad">⚠️ Ekstensi pg_net belum aktif — aktifkan di Dashboard Supabase → Database → Extensions → pg_net.</span>`
        : data.aktif && data.token_set ? `<span class="tg-ok">✅ Notifikasi AKTIF</span>` : `<span class="tg-off">⏸ Notifikasi belum aktif</span>`;
}
async function tgSave() {
    const events = {}; document.querySelectorAll("[data-tgev]").forEach(c => { events[c.dataset.tgev] = c.checked; });
    const { error } = await tgRpc("tg_save", { p_token: tgEl("tgToken").value.trim() || null, p_chat_id: tgEl("tgChat").value.trim() || null, p_aktif: tgEl("tgAktif").checked, p_events: events });
    if (error) return;
    showToast("Pengaturan Telegram disimpan", "success"); tgShow();
}
async function tgTest() {
    const out = tgEl("tgTestOut"); out.textContent = "Mengirim tes…";
    const { data: id, error } = await tgRpc("tg_test", {});
    if (error) { out.textContent = ""; return; }
    for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1200));
        const { data } = await tgRpc("tg_check", { p_req: id });
        if (data && !data.pending) {
            if (data.ok) out.innerHTML = `<span class="tg-ok">✅ Terkirim. Periksa Telegram Anda.</span>`;
            else { let msg = ""; try { msg = JSON.parse(data.body).description; } catch (_) {} out.innerHTML = `<span class="tg-bad">❌ Gagal (${data.status || "tanpa respons"}): ${escapeHtml(msg || data.error || data.body || "periksa token & Chat ID")}</span>`; }
            return;
        }
    }
    out.innerHTML = `<span class="tg-bad">Belum ada respons dari Telegram. Coba cek lagi beberapa detik lagi.</span>`;
}
/** cari Chat ID otomatis: butuh token yang diketik + sudah mengirim /start ke bot (dari browser ke api.telegram.org) */
async function tgFindChat() {
    const token = tgEl("tgToken").value.trim();
    if (!token) { showToast("Tempel token bot dulu di kolom Token, lalu kirim /start ke bot Anda", "danger"); return; }
    try {
        const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getUpdates`), j = await res.json();
        if (!j.ok) { showToast("Telegram: " + (j.description || "token ditolak"), "danger"); return; }
        const list = (j.result || []).map(u => (u.message || u.channel_post || u.my_chat_member || {}).chat).filter(Boolean);
        if (!list.length) { showToast("Belum ada pesan. Buka bot Anda di Telegram, kirim /start, lalu coba lagi.", "danger"); return; }
        const c = list[list.length - 1]; tgEl("tgChat").value = String(c.id);
        showToast(`Chat ID ditemukan: ${c.id}${c.first_name ? " (" + c.first_name + ")" : ""}`, "success");
    } catch (e) { showToast("Tidak bisa menghubungi Telegram dari browser. Isi Chat ID manual (lihat petunjuk di halaman).", "danger"); }
}
