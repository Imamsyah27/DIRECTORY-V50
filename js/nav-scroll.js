/** Menu atas yang bisa digeser: saat tombol / grup menu diklik atau halaman dibuka, geser otomatis agar tombolnya terlihat penuh. */
(function () {
    const nav = () => document.getElementById("pageNav");
    const reveal = el => { try { if (el) el.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" }); } catch (_) {} };
    document.addEventListener("click", e => {
        const b = e.target.closest("#pageNav button"); if (!b) return;
        setTimeout(() => reveal(b), 40);                                           // tombol yang diklik
        if (b.classList.contains("nav-toggle")) setTimeout(() => reveal(b.closest(".nav-group")), 340);   // grup yang baru membuka (animasi .3 dtk)
    });
    window.addEventListener("load", () => setTimeout(() => { const n = nav(); if (n) reveal(n.querySelector("button.active")); }, 400));
    window.addEventListener("orientationchange", () => setTimeout(() => { const n = nav(); if (n) reveal(n.querySelector("button.active")); }, 350));
})();
