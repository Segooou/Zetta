#!/usr/bin/env node
/*
  Build do site da Zetta (sem dependências: só Node).

  - Copia o site estático para dist/
  - Gera o blog a partir de content/blog/*.md (Markdown com cabeçalho de campos)
  - Gera sitemap.xml e robots.txt
  - Preenche {{SITE_URL}} nos HTML com o endereço de site.config.json

  Rascunhos (rascunho: true):
  - Produção (VERCEL_ENV=production ou sem flag): ficam de fora, não aparecem em lugar nenhum.
  - Preview da Vercel (VERCEL_ENV=preview) ou `node scripts/build.mjs --rascunhos`:
    aparecem com a faixa "Rascunho" e com noindex, para revisão.

  Uso local:
    node scripts/build.mjs              # igual à produção
    node scripts/build.mjs --rascunhos  # inclui rascunhos para revisar
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const SITE = CFG.siteUrl.replace(/\/$/, "");
const ENV = process.env.VERCEL_ENV || "local";
const WITH_DRAFTS = process.argv.includes("--rascunhos") || ENV === "preview" || ENV === "development";
const IS_PREVIEW = WITH_DRAFTS;

const STATIC = ["index.html", "404.html", "css", "js", "assets"];
const errors = [], warnings = [];

/* ---------------- utilidades ---------------- */
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const dataBR = iso => { const [y, m, d] = iso.split("-").map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };
const abs = p => p.startsWith("http") ? p : SITE + (p.startsWith("/") ? p : "/" + p);

function copyDir(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) copyDir(path.join(src, f), path.join(dst, f));
  } else fs.copyFileSync(src, dst);
}
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

/* ---------------- Markdown (subconjunto) ----------------
   ## Título 2, ### Título 3, parágrafos, listas (- e 1.), citações (>),
   **negrito**, *itálico*, `código`, [link](url).
   Uma citação que começa com [CONFIRMAR] vira um aviso interno de revisão. */
function inline(t) {
  let s = esc(t);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
    const ext = /^https?:\/\//.test(url) && !url.startsWith(SITE);
    return `<a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`;
  });
  return s;
}
function markdown(src) {
  const lines = src.replace(/\r/g, "").split("\n");
  const out = [], toc = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{2,3})\s+(.*)$/))) {
      const lvl = m[1].length, txt = m[2].trim(), id = slugify(txt);
      if (lvl === 2) toc.push({ id, txt });
      out.push(`<h${lvl} id="${id}">${inline(txt)}</h${lvl}>`); i++; continue;
    }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      const text = buf.join(" ").trim();
      if (text.startsWith("[CONFIRMAR]")) out.push(`<aside class="confirmar"><strong>A confirmar pela Zetta:</strong> ${inline(text.replace("[CONFIRMAR]", "").trim())}</aside>`);
      else out.push(`<blockquote><p>${inline(text)}</p></blockquote>`);
      continue;
    }
    if (/^- /.test(l)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) { items.push(`<li>${inline(lines[i].slice(2).trim())}</li>`); i++; }
      out.push(`<ul>${items.join("")}</ul>`); continue;
    }
    if (/^\d+\. /.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\d+\. /, "").trim())}</li>`); i++; }
      out.push(`<ol>${items.join("")}</ol>`); continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>|- |\d+\. )/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return { html: out.join("\n"), toc };
}

/* ---------------- leitura dos artigos ---------------- */
function parsePost(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/\r/g, "");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { errors.push(`${path.basename(file)}: cabeçalho --- ausente`); return null; }
  const meta = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim().replace(/^"(.*)"$/, "$1");
    if (v === "true") v = true; else if (v === "false") v = false;
    meta[mm[1]] = v;
  }
  const req = ["titulo", "slug", "resumo", "categoria", "capa", "capa_alt", "publicado", "atualizado", "seo_titulo", "seo_descricao"];
  const name = path.basename(file);
  const bad = req.filter(k => !meta[k]);
  const list = meta.rascunho ? warnings : errors;
  if (bad.length) list.push(`${name}: campos faltando: ${bad.join(", ")}`);
  if (meta.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(meta.slug)) errors.push(`${name}: slug inválido "${meta.slug}" (use letras minúsculas, números e hífens)`);
  for (const k of ["publicado", "atualizado"]) if (meta[k] && !/^\d{4}-\d{2}-\d{2}$/.test(meta[k])) errors.push(`${name}: ${k} deve estar no formato AAAA-MM-DD`);
  if (meta.capa && !fs.existsSync(path.join(ROOT, meta.capa.replace(/^\//, "")))) list.push(`${name}: capa não encontrada (${meta.capa})`);
  if (!meta.rascunho && m[2].includes("[CONFIRMAR]")) errors.push(`${name}: artigo publicado ainda tem trechos [CONFIRMAR]; revise antes de publicar`);
  if (meta.seo_descricao && meta.seo_descricao.length > 165) warnings.push(`${name}: seo_descricao com ${meta.seo_descricao.length} caracteres (o ideal é até ~160)`);
  if (meta.seo_titulo && meta.seo_titulo.length > 65) warnings.push(`${name}: seo_titulo com ${meta.seo_titulo.length} caracteres (o ideal é até ~60)`);
  const body = m[2].trim();
  const words = body.replace(/[#>*`\[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
  return { ...meta, file: name, body, words, minutos: Math.max(1, Math.round(words / 200)) };
}

const postDir = path.join(ROOT, "content", "blog");
let posts = fs.existsSync(postDir) ? fs.readdirSync(postDir).filter(f => f.endsWith(".md")).map(f => parsePost(path.join(postDir, f))).filter(Boolean) : [];
const slugs = new Set();
for (const p of posts) { if (slugs.has(p.slug)) errors.push(`slug repetido: ${p.slug}`); slugs.add(p.slug); }
posts = posts.filter(p => WITH_DRAFTS || !p.rascunho).sort((a, b) => b.publicado.localeCompare(a.publicado) || a.titulo.localeCompare(b.titulo));
const published = posts.filter(p => !p.rascunho);

if (errors.length) {
  console.error("\nO build parou por causa destes problemas:\n- " + errors.join("\n- ") + "\n");
  process.exit(1);
}

/* ---------------- templates ---------------- */
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&family=Unbounded:wght@400;500;600&display=swap">`;

function head({ title, description, canonical, ogType = "website", image, imageAlt, noindex, jsonld }) {
  return `<!doctype html>
<html lang="${CFG.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ""}<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="${esc(CFG.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs(image || CFG.defaultOgImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${imageAlt ? `<meta property="og:image:alt" content="${esc(imageAlt)}">\n` : ""}<meta property="og:locale" content="${CFG.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F4F3F7">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="alternate" type="application/rss+xml" title="Blog da Zetta" href="/blog/feed.xml">
${FONTS}
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/blog.css">
<script src="/js/config.js" defer></script>
<script src="/js/blog.js" defer></script>
${jsonld ? `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>\n` : ""}</head>`;
}

const ICON_WA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H8.5L4 20.5z"/><path d="M8.5 9h7M8.5 12h4.5"/></svg>`;

function header(current) {
  return `<body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
${IS_PREVIEW ? '<div class="preview-bar" role="note">Versão de revisão: rascunhos visíveis e páginas fora dos buscadores.</div>\n' : ""}<header class="header scrolled" id="topo">
  <div class="wrap">
    <a class="brand" href="/" aria-label="Zetta, página inicial">
      <img src="/assets/zetta-logo.webp" width="480" height="356" alt="">
      <span>Zetta</span>
    </a>
    <button class="menu-btn" type="button" aria-controls="menu" aria-expanded="false" aria-label="Abrir menu"><span></span></button>
    <nav class="nav" id="menu" aria-label="Principal" data-open="false">
      <ul>
        <li><a href="/#produtos">Produtos</a></li>
        <li><a href="/#sob-medida">Sob medida</a></li>
        <li><a href="/#como-funciona">Como funciona</a></li>
        <li><a href="/blog"${current === "blog" ? ' aria-current="page"' : ""}>Blog</a></li>
      </ul>
      <a class="btn btn-primary" data-wa="orcamento" href="/#contato">Pedir orçamento</a>
    </nav>
  </div>
</header>`;
}

const footer = `<footer class="footer">
  <div class="wrap">
    <div>
      <a class="brand" href="/" aria-label="Zetta, página inicial">
        <img src="/assets/zetta-logo.webp" width="480" height="356" alt="" loading="lazy">
        <span>Zetta</span>
      </a>
      <p class="slogan">Ideias que ganham forma. Impressão 3D e peças personalizadas.</p>
    </div>
    <nav aria-label="Rodapé">
      <ul>
        <li><a href="/#produtos">Produtos</a></li>
        <li><a href="/#sob-medida">Sob medida</a></li>
        <li><a href="/#como-funciona">Como funciona</a></li>
        <li><a href="/#sobre">Sobre</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a data-wa="conversa" href="/#contato">WhatsApp</a></li>
      </ul>
    </nav>
    <p class="copy">© ${new Date().getFullYear()} Zetta. Todos os direitos reservados.</p>
  </div>
</footer>
</body>
</html>
`;

const crumbs = items => `<nav class="crumbs" aria-label="Você está em"><ol>${items.map((c, i) =>
  i === items.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${c.href}">${esc(c.name)}</a></li>`).join("")}</ol></nav>`;
const crumbsLd = items => ({ "@type": "BreadcrumbList", itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })) });

function card(p, big) {
  return `<li class="post-card${big ? " is-big" : ""}" data-cat="${esc(slugify(p.categoria))}">
  <a class="post-link" href="/blog/${p.slug}">
    <img src="${p.capa}" width="1200" height="630" alt="${esc(p.capa_alt)}" loading="lazy" decoding="async">
    <span class="post-meta"><span class="cat">${esc(p.categoria)}</span>${p.rascunho ? '<span class="draft-tag">Rascunho</span>' : ""}<span>${p.minutos} min de leitura</span></span>
    <span class="post-title">${esc(p.titulo)}</span>
    <span class="post-excerpt">${esc(p.resumo)}</span>
  </a>
</li>`;
}

function cta(msgKey = "blog") {
  return `<section class="post-cta" aria-labelledby="cta-title">
  <img src="/assets/mavi/mavi-acenando.webp" width="480" height="495" alt="" loading="lazy">
  <div>
    <h2 id="cta-title">Tem uma ideia para tirar do papel?</h2>
    <p>Mande seu desenho, uma foto de referência ou só a ideia. A Zetta avalia os detalhes e passa o orçamento pelo WhatsApp.</p>
    <a class="btn btn-lav" data-wa="${msgKey}" href="/#contato">${ICON_WA}Pedir orçamento pelo WhatsApp</a>
  </div>
</section>`;
}

/* ---------------- páginas ---------------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of STATIC) copyDir(path.join(ROOT, f), path.join(OUT, f));

// listagem
{
  const cats = [...new Set(posts.map(p => p.categoria))];
  const items = [{ name: "Início", href: "/" }, { name: "Blog", href: "/blog" }];
  const empty = !posts.length;
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Blog", "@id": `${SITE}/blog#blog`, name: CFG.blog.heading, description: CFG.blog.description, url: `${SITE}/blog`, inLanguage: CFG.lang,
      publisher: { "@type": "Organization", name: CFG.siteName, url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/assets/favicon.png" } },
      blogPost: published.map(p => ({ "@type": "BlogPosting", headline: p.titulo, url: `${SITE}/blog/${p.slug}`, datePublished: p.publicado, dateModified: p.atualizado })) },
    crumbsLd(items)] };
  write("blog/index.html", head({ title: CFG.blog.title, description: CFG.blog.description, canonical: `${SITE}/blog`, noindex: IS_PREVIEW || !published.length, jsonld: ld })
  + header("blog") + `
<main id="conteudo" class="blog">
  <div class="wrap">
    ${crumbs(items)}
    <div class="blog-head">
      <h1>${esc(CFG.blog.heading)}</h1>
      <p>${esc(CFG.blog.intro)}</p>
    </div>
    ${cats.length > 1 ? `<div class="cats" role="group" aria-label="Filtrar por categoria">
      <button type="button" class="cat-btn" aria-pressed="true" data-cat="">Todos</button>
      ${cats.map(c => `<button type="button" class="cat-btn" aria-pressed="false" data-cat="${esc(slugify(c))}">${esc(c)}</button>`).join("\n      ")}
    </div>` : ""}
    ${empty ? `<div class="blog-empty">
      <img src="/assets/mavi/mavi-sob-medida.webp" width="720" height="661" alt="" loading="lazy">
      <div><h2>Os primeiros artigos estão em preparação</h2>
      <p>Enquanto isso, veja <a href="/#produtos">o que dá para encomendar</a> ou <a href="/#como-funciona">como funciona um pedido</a>.</p></div>
    </div>` : `<ul class="post-list">
${posts.map((p, i) => card(p, i === 0)).join("\n")}
    </ul>`}
  </div>
  <div class="wrap">${cta()}</div>
</main>
` + footer);
}

// artigos
posts.forEach((p, idx) => {
  const { html, toc } = markdown(p.body);
  const url = `${SITE}/blog/${p.slug}`;
  const items = [{ name: "Início", href: "/" }, { name: "Blog", href: "/blog" }, { name: p.titulo, href: `/blog/${p.slug}` }];
  const newer = posts[idx - 1], older = posts[idx + 1];
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "BlogPosting", "@id": `${url}#artigo`, headline: p.titulo, description: p.seo_descricao, image: abs(p.capa_og || p.capa),
      datePublished: p.publicado, dateModified: p.atualizado, inLanguage: CFG.lang, mainEntityOfPage: url, wordCount: p.words,
      articleSection: p.categoria,
      author: { "@type": "Organization", name: p.autor || CFG.editorial, url: SITE + "/" },
      publisher: { "@type": "Organization", name: CFG.siteName, url: SITE + "/", logo: { "@type": "ImageObject", url: SITE + "/assets/favicon.png" } } },
    crumbsLd(items)] };
  write(`blog/${p.slug}.html`, head({ title: p.seo_titulo, description: p.seo_descricao, canonical: url, ogType: "article", image: p.capa_og || p.capa, imageAlt: p.capa_alt, noindex: IS_PREVIEW || p.rascunho, jsonld: ld })
  .replace("</head>", `<meta property="article:published_time" content="${p.publicado}">\n<meta property="article:modified_time" content="${p.atualizado}">\n<meta property="article:section" content="${esc(p.categoria)}">\n</head>`)
  + header("blog") + `
<main id="conteudo" class="blog">
  <article class="post">
    <div class="wrap narrow">
      ${crumbs(items)}
      ${p.rascunho ? '<p class="draft-banner" role="note"><strong>Rascunho.</strong> Este artigo ainda não foi publicado. Revise os trechos marcados antes de publicar.</p>' : ""}
      <header class="post-header">
        <p class="post-meta"><a class="cat" href="/blog">${esc(p.categoria)}</a><span>${p.minutos} min de leitura</span></p>
        <h1>${esc(p.titulo)}</h1>
        <p class="lede">${esc(p.resumo)}</p>
        <p class="byline">Por ${esc(p.autor || CFG.editorial)} · <time datetime="${p.publicado}">Publicado em ${dataBR(p.publicado)}</time>${p.atualizado !== p.publicado ? ` · <time datetime="${p.atualizado}">Atualizado em ${dataBR(p.atualizado)}</time>` : ""}</p>
      </header>
    </div>
    <figure class="post-cover wrap">
      <img src="${p.capa}" width="1200" height="630" alt="${esc(p.capa_alt)}" fetchpriority="high" decoding="async">
    </figure>
    <div class="wrap narrow">
      ${toc.length > 2 ? `<nav class="toc" aria-labelledby="toc-title"><h2 id="toc-title">Neste artigo</h2><ol>${toc.map(t => `<li><a href="#${t.id}">${inline(t.txt.replace(/^\d+\.\s*/, ""))}</a></li>`).join("")}</ol></nav>` : ""}
      <div class="prose">
${html}
      </div>
      ${cta(p.mensagem_whatsapp || "blog")}
      <nav class="post-nav" aria-label="Outros artigos">
        ${newer ? `<a class="prev" href="/blog/${newer.slug}"><span>Artigo mais recente</span>${esc(newer.titulo)}</a>` : "<span></span>"}
        ${older ? `<a class="next" href="/blog/${older.slug}"><span>Artigo anterior</span>${esc(older.titulo)}</a>` : "<span></span>"}
      </nav>
      <p class="back"><a href="/blog">Ver todos os artigos</a></p>
    </div>
  </article>
</main>
` + footer);
});

// feed RSS (só publicados)
write("blog/feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(CFG.blog.heading)}</title><link>${SITE}/blog</link><description>${esc(CFG.blog.description)}</description><language>pt-BR</language>
${published.map(p => `<item><title>${esc(p.titulo)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(p.publicado + "T12:00:00Z").toUTCString()}</pubDate><description>${esc(p.resumo)}</description></item>`).join("\n")}
</channel></rss>
`);

// sitemap: só páginas públicas e indexáveis
const today = new Date().toISOString().slice(0, 10);
const urls = [{ loc: `${SITE}/`, lastmod: today }];
if (published.length) {
  urls.push({ loc: `${SITE}/blog`, lastmod: published.map(p => p.atualizado).sort().pop() });
  for (const p of published) urls.push({ loc: `${SITE}/blog/${p.slug}`, lastmod: p.atualizado });
}
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`);
write("robots.txt", IS_PREVIEW
  ? "User-agent: *\nDisallow: /\n"
  : `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// {{SITE_URL}} e link do blog no menu da página inicial
for (const f of ["index.html", "404.html"]) {
  let s = fs.readFileSync(path.join(OUT, f), "utf8").replaceAll("{{SITE_URL}}", SITE);
  const link = (published.length || IS_PREVIEW) ? '<li><a href="/blog">Blog</a></li>' : "";
  s = s.replace(/<!--BLOG_NAV-->[\s\S]*?<!--\/BLOG_NAV-->/g, link);
  if (IS_PREVIEW) s = s.replace("<head>", '<head>\n<meta name="robots" content="noindex, nofollow">');
  fs.writeFileSync(path.join(OUT, f), s);
}

console.log(`Build ok (${ENV}${WITH_DRAFTS ? ", com rascunhos" : ""}): ${published.length} publicado(s), ${posts.length - published.length} rascunho(s) incluído(s), ${urls.length} URL(s) no sitemap.`);
if (warnings.length) console.log("Avisos:\n- " + warnings.join("\n- "));
