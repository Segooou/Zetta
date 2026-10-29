(function(){
  const ZETTA = window.ZETTA;
  const num = (ZETTA.whatsapp || "").replace(/\D/g, "");
  const ok = num.length >= 12;
  document.querySelectorAll("[data-wa]").forEach(a => {
    const msg = ZETTA.mensagens[a.dataset.wa] || ZETTA.mensagens.conversa;
    a.href = "https://wa.me/" + (ok ? num : "") + "?text=" + encodeURIComponent(msg);
    a.target = "_blank";
    a.rel = "noopener";
  });
  const numEl = document.querySelector("[data-wa-number]");
  if (ok && numEl) {
    const d = num.slice(2);
    numEl.textContent = "WhatsApp: (" + d.slice(0,2) + ") " + d.slice(2, d.length-4) + "-" + d.slice(-4);
  }
  if (!ok) {
    const n = document.createElement("p");
    n.className = "config-note";
    n.setAttribute("role", "note");
    n.innerHTML = "Configuração pendente: defina o número em <code>ZETTA.whatsapp</code> para os botões abrirem a conversa com a Zetta.";
    document.body.appendChild(n);
  }

  /* Camadas do cortador (hero) e do coração (produto) */
  const NS = "http://www.w3.org/2000/svg";
  function build(target, href, n, step, sx, sy, ox, oy, w, d){
    const g = document.getElementById(target); if (!g) return;
    for (let i = 0; i < n; i++) {
      const top = i === n - 1;
      const outer = document.createElementNS(NS, "g");
      outer.setAttribute("transform", "translate(" + ox + "," + (oy + (n - 1 - i) * step) + ")");
      outer.setAttribute("class", "ly"); outer.style.setProperty("--i", i);
      const inner = document.createElementNS(NS, "g");
      inner.setAttribute("transform", "scale(" + sx + "," + sy + ")");
      const u = document.createElementNS(NS, "use");
      u.setAttribute("href", href);
      u.setAttribute("stroke", top ? "#B9A2EC" : (i % 2 ? "#8D6DD3" : "#7D5EC4"));
      u.setAttribute("stroke-width", w);
      inner.appendChild(u);
      if (top) {
        const e = document.createElementNS(NS, "use");
        e.setAttribute("href", href); e.setAttribute("stroke", "#1E1C24"); e.setAttribute("stroke-width", d);
        inner.appendChild(e);
      }
      outer.appendChild(inner); g.appendChild(outer);
    }
  }
  const CUT = {n: 11, step: 4.2, oy: 30};
  build("layers", "#cut", CUT.n, CUT.step, 1, .7, 0, CUT.oy, 15, 1.6);

  const heart = document.createElementNS(NS, "path");
  heart.setAttribute("id", "heart");
  heart.setAttribute("d", "M80 104 C40 78 18 58 18 36 C18 20 30 10 44 10 C58 10 70 18 80 32 C90 18 102 10 116 10 C130 10 142 20 142 36 C142 58 120 78 80 104 Z");
  const hs = document.querySelector("#heart-layers").ownerSVGElement;
  const defs = document.createElementNS(NS, "defs"); defs.appendChild(heart); hs.insertBefore(defs, hs.firstChild);
  build("heart-layers", "#heart", 8, 3.2, .78, .62, 17.6, 28, 9, 1.4);


  /* ================= MOVIMENTO ================= */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Impressão camada por camada (hero e coração) */
  function printer(groupId, opts){
    const layers = [...document.getElementById(groupId).children];
    const noz = opts.nozzle ? document.getElementById(opts.nozzle) : null;
    let raf = 0;
    function frame(start, now){
      const t = (now - start) / opts.per;
      layers.forEach((l, i) => { l.style.opacity = Math.max(0, Math.min(1, (t - i) * 1.6)); });
      if (noz && !reduce) {
        const i = Math.min(Math.floor(t), layers.length - 1);
        const x = 210 + 105 * Math.sin(t * Math.PI * 1.3);
        const y = 266 + opts.oy + (layers.length - 1 - i) * opts.step - (t > layers.length ? (t - layers.length) * 40 : 0);
        noz.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")");
        noz.setAttribute("opacity", t < layers.length ? 1 : Math.max(0, 1 - (t - layers.length) * 1.4));
      }
      if (t < layers.length + 1) raf = requestAnimationFrame(n => frame(start, n));
    }
    return {
      play(delay){
        cancelAnimationFrame(raf);
        layers.forEach(l => l.style.opacity = 0);
        setTimeout(() => { raf = requestAnimationFrame(n => frame(n, n)); }, delay || 0);
      }
    };
  }
  const heroPrint = printer("layers", {per: 115, nozzle: "nozzle", oy: CUT.oy, step: CUT.step});
  heroPrint.play(650);
  document.getElementById("replay").addEventListener("click", () => heroPrint.play(0));
  const heartPrint = printer("heart-layers", {per: 90});

  /* Cortador acompanha o ponteiro (inclinação 3D) */
  const plate = document.querySelector(".plate"), plateSvg = plate.querySelector("svg");
  if (fine && !reduce) {
    let tx = 0, ty = 0, cx = 0, cy = 0, run = false;
    const loop = () => {
      cx += (tx - cx) * .12; cy += (ty - cy) * .12;
      plateSvg.style.transform = "perspective(900px) rotateX(" + (cy * -10).toFixed(2) + "deg) rotateY(" + (cx * 14).toFixed(2) + "deg) translate3d(" + (cx * 6).toFixed(1) + "px," + (cy * 6).toFixed(1) + "px,0)";
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > .002) requestAnimationFrame(loop); else run = false;
    };
    const kick = () => { if (!run) { run = true; requestAnimationFrame(loop); } };
    plate.addEventListener("pointermove", e => {
      const r = plate.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; kick();
    });
    plate.addEventListener("pointerleave", () => { tx = 0; ty = 0; kick(); });
  }

  /* Botões com leve efeito magnético */
  if (fine && !reduce) {
    document.querySelectorAll(".hero .btn, .custom .btn, .final .btn").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * .12).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * .25).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }

  /* Ícones e etapas: índices para os atrasos em cascata */
  document.querySelectorAll(".send li").forEach((li, i) => {
    li.setAttribute("data-reveal", "right"); li.style.setProperty("--d", (i * 110 + 150) + "ms");
    li.querySelectorAll("svg path, svg rect, svg circle").forEach(el => el.setAttribute("pathLength", "1"));
  });
  document.querySelectorAll(".step").forEach((st, i) => {
    st.setAttribute("data-reveal", ""); st.style.setProperty("--d", (i * 140) + "ms");
    st.querySelectorAll(".stack i").forEach((b, k) => b.style.setProperty("--b", k));
  });
  document.querySelectorAll(".nav li").forEach((li, i) => li.style.setProperty("--k", i));

  /* Revelação no scroll */
  const onReveal = new Map();
  const peek = document.querySelector(".peek");
  const finalBox = document.querySelector(".final-box");
  const showPeek = (wait) => setTimeout(() => {
    peek.classList.remove("hide");
    setTimeout(() => peek.classList.add("ledge"), 520);
  }, wait || 0);
  /* espera o bloco terminar de aparecer antes da Mavi subir por trás da borda */
  onReveal.set(finalBox, () => showPeek(850));
  onReveal.set(document.querySelector(".product.is-featured"), () => heartPrint.play(250));
  /* no celular não existe hover: cada produto toca sua animação ao aparecer */
  document.querySelectorAll(".product:not(.is-featured)").forEach(pr => onReveal.set(pr, () => {
    setTimeout(() => pr.classList.add("play"), 450);
    setTimeout(() => pr.classList.remove("play"), 2200);
  }));

  if ("IntersectionObserver" in window) {
    /* títulos "impressos" usam clip-path, que o observador enxerga como recortado;
       por isso eles são observados pelo elemento pai */
    const targets = new Map();
    const reveal = el => { el.classList.remove("pre"); const fn = onReveal.get(el); if (fn) fn(); };
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      /* revela também o que foi pulado numa rolagem rápida (já ficou acima da tela) */
      if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
      (targets.get(e.target) || []).forEach(reveal);
      targets.delete(e.target); io.unobserve(e.target);
    }), {threshold: .12, rootMargin: "0px 0px -6% 0px"});
    document.querySelectorAll("[data-reveal]").forEach(el => {
      if (el.getBoundingClientRect().top > innerHeight * .9) {
        el.classList.add("pre");
        const t = el.dataset.reveal === "print" ? el.parentElement : el;
        if (!targets.has(t)) { targets.set(t, []); io.observe(t); }
        targets.get(t).push(el);
      } else { const fn = onReveal.get(el); if (fn) fn(); }
    });
    /* rede de segurança: ao pular direto para uma seção pelo menu, revela o que ficou para trás */
    let sweepQueued = false;
    const sweep = () => {
      sweepQueued = false;
      targets.forEach((els, t) => {
        if (t.getBoundingClientRect().top < innerHeight * .94) { els.forEach(reveal); targets.delete(t); io.unobserve(t); }
      });
    };
    addEventListener("scroll", () => { if (!sweepQueued && targets.size) { sweepQueued = true; setTimeout(sweep, 120); } }, {passive: true});
  } else { showPeek(); }

  /* Coração reimprime ao passar o mouse */
  const featured = document.querySelector(".product.is-featured");
  let heartBusy = 0;
  featured.addEventListener("pointerenter", () => {
    if (Date.now() - heartBusy < 1200) return;
    heartBusy = Date.now(); heartPrint.play(0);
  });

  /* Mavi acena ao passar o mouse ou tocar */
  const mavi = document.querySelector(".mavi");
  const wave = () => { mavi.classList.remove("wave"); void mavi.offsetWidth; mavi.classList.add("wave"); };
  mavi.querySelector("img").addEventListener("pointerenter", wave);
  mavi.querySelector("img").addEventListener("click", wave);

  /* Progresso de leitura + seção ativa no menu */
  const prog = document.querySelector(".progress");
  let ticking = false;
  const setProg = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.setProperty("--p", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(setProg); } }, {passive: true});
  setProg();
  const navLinks = [...document.querySelectorAll('.nav ul a')];
  const secIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id ? "true" : "false"));
  }), {rootMargin: "-45% 0px -50% 0px"});
  ["produtos", "sob-medida", "como-funciona", "sobre", "contato"].forEach(id => secIO.observe(document.getElementById(id)));

  /* Menu mobile */
  const btn = document.querySelector(".menu-btn"), nav = document.getElementById("menu");
  function setMenu(open){
    btn.setAttribute("aria-expanded", open); nav.dataset.open = open;
    btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  btn.addEventListener("click", () => setMenu(btn.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.dataset.open === "true") { setMenu(false); btn.focus(); } });
  const mq = matchMedia("(min-width: 861px)");
  mq.addEventListener("change", () => setMenu(false));

  /* Header com borda após rolar e barra fixa no mobile */
  const header = document.querySelector(".header"), bar = document.getElementById("mbar");
  const hero = document.querySelector(".hero"), fin = document.getElementById("contato");
  let heroVis = true, finVis = false;
  const upd = () => bar.classList.toggle("show", !heroVis && !finVis);
  new IntersectionObserver(([e]) => { heroVis = e.isIntersecting; header.classList.toggle("scrolled", !e.isIntersecting || e.boundingClientRect.top < 0); upd(); }, {threshold: .15}).observe(hero);
  new IntersectionObserver(([e]) => { finVis = e.isIntersecting; upd(); }).observe(fin);
  addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 8), {passive: true});

  document.getElementById("ano").textContent = new Date().getFullYear();
})();
