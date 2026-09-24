# 05 — Design System (tokens para implementação)

> Direção: **familiaridade de chat + confiança financeira + toque "caderno de
> obra"**. Consumido como tokens pelo código. **Fonte da verdade da cor = estes
> tokens**; nunca hex solto no código (mudar aqui reflete no app todo).

---

## 1. Cores (tokens) — use como variáveis CSS/theme

### Base / neutros
| Token | Hex | Uso |
|---|---|---|
| `--bg-paper` | `#F4F1EA` | Fundo geral (off-white papel) |
| `--surface` | `#FFFFFF` | Cartões, balões, superfícies elevadas |
| `--surface-alt` | `#EDE8DD` | Fundo de seção / balão recebido |
| `--ink` | `#2A2A28` | Texto principal (grafite) |
| `--ink-soft` | `#6B675E` | Texto secundário / legendas |
| `--line` | `#DED8CC` | Divisórias, bordas |

### Primário (confiança)
| Token | Hex | Uso |
|---|---|---|
| `--primary` | `#1F5C57` | Verde-petróleo — header, ações, FAB, marca |
| `--primary-dark` | `#153F3B` | Estados pressionados |
| `--primary-soft` | `#DCE9E7` | Fundos de destaque, chips selecionados, cartão de sugestão |

> Decisão: manter proximidade proposital com o verde de apps de chat
> (familiaridade). A tipografia foge do WhatsApp para diferenciar a marca.

### Semânticas de status (financeiro/loops) — consistentes em todo o app
| Token | Hex | Significado | Aplicação |
|---|---|---|---|
| `--pending` | `#E0913A` | Pendente / a comprar / pagamento | chip "material", "pagamento", "a comprar" |
| `--pending-ink` | `#8A5512` | O mesmo âmbar, legível como texto | segunda linha do card de obra, texto sobre branco |
| `--done` | `#3E8E5A` | Pago / quitado / concluído | itens ok no checklist |
| `--info` | `#3A6EA5` | Lembrete / data | chip "lembrete", tags de data |
| `--unclassified` | `#9B968C` | Não classificado (visível, neutro) | selo de evento sem tipo |
| `--alert` | `#C0553B` | Reclamação formal / excluir | link "Excluir registro", atenção |

### Mapa chip de tipo → cor
| Tipo (E) | Chip | Cor |
|---|---|---|
| E1 Lista de material / a comprar | "material" | `--pending` |
| E2 Checklist (item ok) | — | `--done` |
| E3 Decisão | "decisão" | `--primary` |
| E4 Foto/Documentação | "foto" | `--unclassified` (neutro) |
| E7 Pagamento | "pagamento" | `--pending` |
| Lembrete/data | "lembrete" | `--info` |
| Sem tipo | "não classificado" | `--unclassified` |

---

## 2. Tipografia
- **Família principal:** sans humanista arredondada — **Nunito** (títulos e
  destaques). Fallback: SF Pro / system.
- **Família secundária:** **Inter** (textos de apoio/densos). Fallback: system.
- Escala:
  - Título de tela: 20/28 **semibold**
  - Seção: 16/24 semibold
  - Corpo: 15/22 regular
  - Legenda: 13/18
  - Micro (chips, timestamps): 11/16

---

## 3. Forma & espaçamento
- **Raios:** cartão 16px · balão 18px · sheet (topo) 20px · chip 999px (pílula) ·
  FAB 28px.
- **Grid base:** 4px. Padding de tela: 16px. Gap entre cartões: 12px.
- **Sombra:** suave e baixa (elevação discreta, "cara de papel", não material pesado).

---

## 4. Componentes-chave (biblioteca)
- **Balão de evento:** `--surface`; chip de tipo; selo "não classificado" quando
  aplicável; mídia embutida; timestamp; ao segurar → bottom sheet Editar.
- **Cartão de sugestão (Fluxo 2):** faixa `--primary-soft`; texto da proposta;
  botão primário (1 toque) + "agora não"; micro-"por quê".
- **Chip de tipo:** pílula; cor conforme mapa acima.
- **FAB de captura/criação:** `--primary`.
- **Checklist item:** caixa (falta=`--pending` outline / ok=`--done` check);
  texto; nota opcional.
- **Tabs superiores (navegação da obra):** underline `--primary` no ativo;
  scroll horizontal; itens Resumo · Conversa · Pendências · Documentação ·
  Decisões · Dash.
- **Bottom sheet "Editar registro":** componente global reutilizável (ver Tela 10).
- **Input do chat:** campo texto + anexar + microfone (voz) + enviar (`--primary`).
- **Filtro por fase (pills):** "Todas" + fases; ativo em `--primary`.

---

## 5. Ícones & tom visual
- Traço fino, cantos suaves. Nada corporativo-frio.
- Empty states ilustrados com o mascote (tom acolhedor: "comece jogando aqui").

---

## 6. Cores das fases (sugestão para a rosca do Dash e dots de fase)
| Fase | Cor sugerida |
|---|---|
| Fundação | marrom terroso `#9B6A43` |
| Estrutura | `--primary` `#1F5C57` |
| Hidráulica | `--info` `#3A6EA5` |
| Elétrica | âmbar `#E0913A` |
| Acabamento | `--done` `#3E8E5A` |
> Fases custom: atribuir cor da paleta automaticamente ou deixar o usuário escolher.
