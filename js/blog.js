/* Páginas do blog e 404: links do WhatsApp, menu do celular e filtro de categorias.
   As mensagens e o número vêm de js/config.js (a mesma configuração da página inicial). */
(function(){
  const Z = window.ZETTA || { whatsapp: "", mensagens: {} };
  const num = (Z.whatsapp || "").replace(/\D/g, "");
  const ok = num.length >= 12;
  document.querySelectorAll("[data-wa]").forEach(a => {
    const msg = Z.mensagens[a.dataset.wa] || Z.mensagens.conversa || "";
    a.href = "https://wa.me/" + (ok ? num : "") + "?text=" + encodeURIComponent(msg);
    a.target = "_blank"; a.rel = "noopener";
  });
  if (!ok && document.querySelector("[data-wa]")) {
    const n = document.createElement("p");
    n.className = "config-note"; n.setAttribute("role", "note");
    n.innerHTML = "Configuração pendente: defina o número em <code>ZETTA.whatsapp</code> para os botões abrirem a conversa com a Zetta.";
    document.body.appendChild(n);
  }

  const btn = document.querySelector(".menu-btn"), nav = document.getElementById("menu");
  if (btn && nav) {
    const set = open => { btn.setAttribute("aria-expanded", open); nav.dataset.open = open; btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu"); };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => set(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.dataset.open === "true") { set(false); btn.focus(); } });
  }

  /* filtro por categoria: todos os artigos continuam no HTML; o filtro só esconde visualmente */
  const cats = document.querySelectorAll(".cat-btn");
  cats.forEach(b => b.addEventListener("click", () => {
    cats.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    document.querySelectorAll(".post-card").forEach(c => { c.hidden = !!b.dataset.cat && c.dataset.cat !== b.dataset.cat; });
  }));
})();
