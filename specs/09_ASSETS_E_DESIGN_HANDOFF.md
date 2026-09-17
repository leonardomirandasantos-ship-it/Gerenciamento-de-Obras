# 09 — Assets & Design Handoff (LEIA ANTES DE IMPLEMENTAR QUALQUER UI)

> Existe porque, num handoff anterior, a IA de código **tentou recriar o logo e
> improvisou o design**. Aqui estão as regras para isso não se repetir.

---

## 🚫 As 4 regras inegociáveis

### 1. NÃO recrie o logo. Use os arquivos.
O logo **já existe** em `assets/logo/`. Nunca desenhe, gere ou aproxime o logo
com CSS, emoji, ícone de biblioteca ou SVG próprio.

```html
<img src="/assets/logo/logo-horizontal.png" alt="Zap da Obra">   <!-- login, header -->
<img src="/assets/logo/mascote-512.png" alt="">                  <!-- empty state -->
```

### 2. NÃO invente cores, espaçamentos ou tipografia.
Importe `assets/tokens/tokens.css` e use **somente** variáveis
(`var(--primary)`, `var(--pending)`…). **Hex solto no código é erro.**

### 3. Os PNGs das telas são REFERÊNCIA DE INTENÇÃO, não especificação.
A especificação está em `04_TELAS.md` (estrutura) e `02_FLUXOS.md`
(comportamento). **Em divergência, o texto e o `03_DECISOES.md` vencem** (ver §4).

### 4. `index.html` é a implementação de referência dos componentes.
Ele renderiza cada componente com **CSS real**. Copie esse CSS em vez de
escrever do zero. Abra no navegador para ver tudo montado.

---

## 📁 Estrutura de assets (tudo já incluso no pacote)

```
index.html                              ← galeria das 15 telas + marca + styleguide
assets/
├─ logo/
│  ├─ logo-horizontal.png               ← LOGO PRINCIPAL (mascote + wordmark)
│  ├─ mascote-1024.png                  ← mascote isolado, FUNDO TRANSPARENTE
│  ├─ mascote-512.png                   ← idem (uso geral / empty state)
│  ├─ mascote-192.png                   ← idem (favicon / avatar)
│  ├─ app-icon-1024.png                 ← ícone do app (mascote sobre --primary)
│  ├─ app-icon-512.png                  ← PWA manifest / home screen
│  ├─ app-icon-192.png                  ← ícone pequeno
│  └─ mascote-conceito-original.png     ← referência do conceito aprovado
├─ brand/
│  ├─ brand-board.png                   ← board de identidade (versões, paleta, tipografia)
│  └─ kit-brindes.png                   ← aplicações: caneca, ecobag, capacete, trena…
└─ tokens/
   ├─ tokens.css                        ← FONTE DA VERDADE (importar no app)
   └─ tokens.json                       ← Tailwind / Style Dictionary
design/
├─ screens/                             ← os 15 mockups (01-login … 15-config-fases)
└─ _obsoleto/                           ← versão descartada (não usar)
```

---

## 🎨 Aplicação da marca

| Onde | Arquivo |
|---|---|
| Login / splash | `logo-horizontal.png` |
| App icon (PWA) | `app-icon-512.png` |
| Favicon | `mascote-192.png` |
| Empty states / loader | `mascote-512.png` (fundo transparente) |
| Avatar / marca d'água | `mascote-192.png` |

---

## ⚠️ §4 — Divergências conhecidas entre PNGs e a especificação

Ao implementar, **siga a especificação, não o pixel**:

| # | No mockup | O correto |
|---|-----------|-----------|
| D45 | Versão antiga de "Decisões" tinha **navbar inferior** (em `design/_obsoleto/`) | **Descartada.** Abas no topo — usar `11-decisoes.png` |
| D45 | Checklists, Documentação, Dash e Prestador com header simples | Devem ter as **abas no topo** |
| D47 | Nem todo mockup mostra a localização | Header da obra sempre com **nome + localização** |
| — | Cores aproximadas (imagens geradas por IA) | Cor real: `--primary #1F5C57` dos tokens |
| — | Fontes aproximadas | **Nunito** (display) + **Inter** (corpo) |

---

## ✅ Checklist de aceite visual

- [ ] Nenhum hex escrito direto no código (tudo via `var(--token)`).
- [ ] Logo carregado dos arquivos PNG — **não recriado**.
- [ ] Nunito + Inter carregadas, seguindo a escala tipográfica.
- [ ] Chips de tipo com as cores do mapa (`tokens.css`).
- [ ] Abas no topo em todas as telas de obra; **nenhuma navbar inferior**.
- [ ] Um **único** bottom sheet de edição, reutilizado em todos os pontos.
- [ ] Header da obra com nome + localização.
- [ ] Fundo `--bg-paper`, cartões `--surface`, sombra `--shadow-card`.
- [ ] Raios: cartão 16 · balão 18 · sheet 20 · chip pill.
- [ ] `manifest.json` do PWA apontando para `app-icon-512.png`.
