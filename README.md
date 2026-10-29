# Zetta — site institucional

Landing page da **Zetta**, impressão 3D e peças personalizadas. *Ideias que ganham forma.*

Site estático (HTML, CSS e JavaScript puros). Não precisa de build, Node ou instalação.

## Estrutura

```
index.html        página
css/style.css     estilos, cores e animações
js/config.js      ← número do WhatsApp e mensagens (edite aqui)
js/main.js        menu, animações e interações
assets/           logo, favicon e imagem de compartilhamento
assets/mavi/      ilustrações da Mavi (hero, sob medida, processo e acenando)
vercel.json       configuração da Vercel (cache e cabeçalhos)
```

## Antes de publicar

1. Abra `js/config.js` e preencha o número do WhatsApp:
   ```js
   whatsapp: "55DDDNUMERO",   // só dígitos, ex.: 5511912345678
   ```
2. O site está publicado em https://zetta-woad.vercel.app. Se trocar o endereço (domínio próprio), atualize a linha
   `og:image` em `index.html` com o novo endereço.

## Ver no computador

Dê dois cliques em `index.html`. Para testar exatamente como na internet, abra a pasta
no VS Code e use a extensão **Live Server**.

## Publicar

### 1. GitHub
- Entre em https://github.com/new, crie o repositório `zetta-site` (pode ser público ou privado) e **não** marque nenhuma opção de README.
- Na página do repositório vazio, clique em **uploading an existing file**.
- Arraste **o conteúdo** desta pasta (os arquivos e as pastas `assets`, `css`, `js`) e clique em **Commit changes**.

### 2. Vercel
- Entre em https://vercel.com/new com a sua conta do GitHub.
- Em **Import Git Repository**, escolha `zetta-site` e clique em **Import**.
- Framework Preset: **Other**. Não mude Build Command nem Output Directory.
- Clique em **Deploy**. Em menos de um minuto o site estará no ar.

A partir daí, toda alteração enviada ao GitHub é publicada automaticamente pela Vercel.

## Trocar ilustrações por fotos reais

Em `index.html`, cada produto tem um `<figure class="product-media">`. Substitua o `<svg>…</svg>` por

```html
<img src="assets/sua-foto.webp" alt="descrição da peça" loading="lazy" width="800" height="600">
```

e apague a linha `<figcaption>Ilustração</figcaption>`.

## Acessibilidade e movimento

Se o sistema estiver com "reduzir movimento" ativado (no Windows: Configurações → Acessibilidade →
Efeitos visuais → Efeitos de animação desligado), o site mantém as aparições suaves e a impressão em
camadas, mas corta inclinações, balanços e deslocamentos.
