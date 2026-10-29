# Zetta — site institucional e blog

Landing page e blog da **Zetta**, impressão 3D e peças personalizadas. *Ideias que ganham forma.*

Site estático (HTML, CSS e JavaScript). O blog é gerado a partir de arquivos Markdown por um script em Node **sem dependências**: não há banco de dados, painel administrativo nem pacotes para instalar.

Endereço oficial: https://zetta3d.vercel.app (o endereço antigo zetta-woad.vercel.app redireciona para ele)

## Estrutura

```
index.html            página inicial
404.html              página de erro
css/style.css         estilos do site
css/blog.css          estilos do blog
js/config.js          ← número do WhatsApp e mensagens (edite aqui)
js/main.js            animações e interações da página inicial
js/blog.js            menu, WhatsApp e filtro de categorias do blog
assets/               logo, favicon, imagem de compartilhamento
assets/mavi/          ilustrações da Mavi
assets/blog/          capas dos artigos (1200 × 630)
content/blog/*.md     artigos do blog
scripts/build.mjs     gera o site final em dist/
site.config.json      endereço do site e textos do blog
vercel.json           build, pasta de saída e cabeçalhos na Vercel
```

A Vercel roda `node scripts/build.mjs` a cada envio ao GitHub e publica a pasta `dist/`. A pasta `dist/` não vai para o repositório.

## Configurações

- **WhatsApp:** em `js/config.js`, preencha `whatsapp: "55DDDNUMERO"` (só dígitos, ex.: `5511912345678`).
- **Endereço do site:** em `site.config.json`, campo `siteUrl`. Ele é usado nas URLs canônicas, no Open Graph, nos dados estruturados, no `sitemap.xml` e no `robots.txt`. Se a Zetta passar a usar um domínio próprio, troque só esse campo.

## Blog

### Como funciona a publicação

Cada artigo é um arquivo `.md` em `content/blog/`. O campo `rascunho` decide onde ele aparece:

| | `rascunho: true` | `rascunho: false` |
|---|---|---|
| Site oficial (produção) | não aparece | aparece no blog, no menu e no sitemap |
| Versões de revisão da Vercel (preview) | aparece com a faixa "Rascunho" | aparece |

As versões de revisão sempre têm `noindex`, então os buscadores não as indexam.

O link "Blog" no menu da página inicial só aparece quando existe pelo menos um artigo publicado. Antes disso, a página `/blog` existe com um aviso de "em preparação", mas fica fora do sitemap e com `noindex`.

### Campos de um artigo

```md
---
titulo: Título que aparece na página (H1)
slug: endereco-do-artigo            # vira /blog/endereco-do-artigo (minúsculas, números e hífens)
resumo: Uma ou duas frases, mostradas na listagem e abaixo do título.
categoria: Cortadores               # Cortadores, Como funciona, Ideias, Sob medida ou uma nova
capa: /assets/blog/endereco-do-artigo.webp
capa_og: /assets/blog/endereco-do-artigo.jpg   # opcional; imagem para redes sociais
capa_alt: Descrição da imagem de capa para quem não pode vê-la.
publicado: 2026-10-29               # AAAA-MM-DD
atualizado: 2026-10-29              # mude quando revisar o conteúdo
autor: Equipe Zetta
seo_titulo: Título para o Google (até ~60 caracteres)
seo_descricao: Descrição para o Google (até ~160 caracteres).
mensagem_whatsapp: cortador         # opcional; uma das chaves de js/config.js
rascunho: true
---

Texto do artigo em Markdown...
```

Recursos do texto: `## Título`, `### Subtítulo`, parágrafos, listas com `-` ou `1.`, `**negrito**`, `*itálico*` e links `[texto](/blog/outro-artigo)` ou `[texto](/#produtos)`.

Uma citação que começa com `> [CONFIRMAR]` vira um aviso amarelo de revisão. **O build se recusa a publicar** um artigo que ainda tenha `[CONFIRMAR]`, para que nada vá ao ar sem revisão.

### Para escrever, revisar e publicar

1. Crie o arquivo em `content/blog/` com `rascunho: true` e a capa em `assets/blog/` (1200 × 630 px, WebP; opcionalmente uma cópia JPG para redes sociais).
2. Envie para uma branch de revisão no GitHub (por exemplo `revisao-blog`). A Vercel cria uma versão de revisão com os rascunhos visíveis; o link aparece no painel do projeto, em **Deployments**.
3. Revise o texto e resolva cada trecho `[CONFIRMAR]`: troque pela informação correta ou apague o trecho.
4. Mude para `rascunho: false`, ajuste `publicado` e `atualizado` para a data de publicação e envie para a branch `main`. O artigo entra no ar, no blog, no menu e no sitemap.

Para revisar no computador: `node scripts/build.mjs --rascunhos` e abra `dist/` com um servidor local (por exemplo a extensão Live Server do VS Code).

### O que o build verifica

- Campos obrigatórios, formato do slug e das datas, slugs repetidos e capa existente.
- Trechos `[CONFIRMAR]` em artigos publicados (o build para).
- Avisos quando o título ou a descrição para o Google ficam longos demais.

## SEO

- Cada página tem título, descrição, URL canônica, Open Graph e cartão do Twitter próprios.
- Página inicial: dados estruturados `Organization` e `WebSite`.
- Blog: `Blog` e `BreadcrumbList`. Artigos: `BlogPosting` e `BreadcrumbList`, com breadcrumbs visíveis.
- `sitemap.xml` e `robots.txt` são gerados a cada build com o endereço de `site.config.json`. O sitemap só lista páginas públicas e artigos publicados.
- Feed RSS em `/blog/feed.xml`.

### Google Search Console (passos manuais)

O site não é indexado automaticamente por estar no ar. Para pedir a indexação:

1. Entre em https://search.google.com/search-console e adicione uma propriedade do tipo **Prefixo do URL** com o endereço do site (hoje `https://zetta3d.vercel.app`).
2. Verifique a propriedade pelo método **Tag HTML**: copie a meta tag que o Google mostrar e cole no `<head>` de `index.html`, logo abaixo do `<title>`. Envie para o GitHub, espere o deploy e clique em **Verificar**. (Com domínio próprio, prefira a propriedade de **Domínio**, verificada por um registro DNS.)
3. Em **Sitemaps**, envie `sitemap.xml`.
4. Em **Inspeção de URL**, teste a página inicial e peça a indexação. Repita para cada artigo novo, se quiser acelerar.
5. Acompanhe em **Páginas** quais URLs foram indexadas e por quê outras ficaram de fora.

Para conferir os dados estruturados: https://search.google.com/test/rich-results com a URL de um artigo publicado.

## Trocar ilustrações por fotos reais

Em `index.html`, cada produto tem um `<figure class="product-media">`. Substitua o `<svg>…</svg>` por

```html
<img src="assets/sua-foto.webp" alt="descrição da peça" loading="lazy" width="800" height="600">
```

e apague a linha `<figcaption>Ilustração</figcaption>`.

## Acessibilidade e movimento

Com "reduzir movimento" ativado no sistema, o site mantém as aparições suaves e a impressão em camadas, mas corta inclinações, balanços e deslocamentos.
