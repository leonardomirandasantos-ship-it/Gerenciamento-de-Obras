# 03 — Decisões (Decision Log D1–D47) + Escopo V1/V2

> **Este arquivo é normativo.** Em caso de ambiguidade na implementação, estas
> decisões têm prioridade. Cada decisão nasceu do refinamento de produto e/ou da
> análise de dado real (export de conversa de WhatsApp) e das telas geradas.

---

## 1. Decision Log completo

### Fundamentos e captura
| # | Decisão | Status |
|---|---------|--------|
| D1 | Sem gate de confirmação na captura | ✅ |
| D2 | Classificação em 2º plano; correção como mecanismo principal | ✅ |
| D3 | Nada é descartado (inclui "não classificado") | ✅ |
| D4 | Comprovante: junto OU anexado depois | ✅ |
| D5 | Comprovante/NF também no gasto (evidência) | ✅ |
| D6 | Chat é a única superfície de captura; dashboards só leem | ✅ |
| D7 | Não congelar fluxos/design antes da análise do export (feito depois) | ✅ |
| D8 | 4º tipo (atualização/documentação) capturado na V1 | ✅ |

### Inteligência (Fluxo 2)
| # | Decisão | Status |
|---|---------|--------|
| D9 | Inteligência = sugestão de 1 toque, opcional, no momento certo (5 leis) | ✅ |
| D10 | Reembolso tem 2 tempos (marcar + baixa) — **movido para V2** (ver D41) | ↪️ V2 |
| D11 | Pendências com prazo formam calendário emergente | ✅ |
| D12 | "Fechar o dia" entra na V1 como lente leve | 🟡 |
| D13 | Toda lente só LÊ eventos; captura exclusiva do chat | ✅ |

### Pós-análise do export real (pivô logística-first)
| # | Decisão | Status |
|---|---------|--------|
| D14 | Herói da V1 = logística (lista + checklist + documentação) | ✅ |
| D15 | Captura agnóstica ao tipo; diferenciação só no 2º plano | ✅ |
| D16 | Checklist vivo é tipo próprio (E2), com fusão de re-envios | ✅ |
| D17 | Excluir = trivial, inclusive em lote | ✅ |
| D18 | Sugestão de data é oportunista (só quando cita data), não central | ✅ |
| D19 | Voz: transcrição sob demanda na V1 | 🟡 |
| D20 | Foto nunca exige legenda; busca por data/fase | ✅ (ver D31) |

### Engine de sugestão
| # | Decisão | Status |
|---|---------|--------|
| D21 | Toda inteligência = 1 engine de sugestão reutilizável | ✅ |
| D22 | Componente único "cartão de sugestão" para todos os casos | ✅ |
| D23 | Casos V1: A (checklist), B (status), C (data leve), D (decisão), E (PIX) | ✅ |
| D24 | Casos de reembolso → V2 | ↪️ V2 |
| D25 | Anti-irritação: silenciar após ignorar 2×; nunca rotina diária | ✅ |

### Financeiro validado (rodada 2 de insights do usuário)
| # | Decisão | Status |
|---|---------|--------|
| D26 | Financeiro (E7) validado como dor real; entra no roadmap V1 | ✅ |
| D27 | "Host de pagamentos": app é destino do encaminhamento de comprovante | ✅ |
| D28 | Sumário financeiro por fase e por prestador/fornecedor | ✅ |
| D29 | Orçamento é evento próprio (E8), buscável por fornecedor/produto | ✅ |
| D30 | Materiais consultáveis por categoria | ✅ |
| D31 | Foto: legenda opcional (na hora ou depois), nunca obrigatória (reconcilia D20) | ✅ |
| D32 | Tag de fase é global/transversal, aplicável na hora ou depois em 1 toque | ✅ |
| D33 | Documentação = diário de obra pesquisável (foto+legenda+fase+orçamento) | ✅ |

### Fechamento de escopo (validação de completude)
| # | Decisão | Status |
|---|---------|--------|
| D34 | Criar obra estilo "grupo WhatsApp": foto + nome + opcionais | ✅ |
| D35 | Cadastro/aceitar convite: NÃO na V1 (login simples; link por fora) | ✅ |
| D36 | Convidar pessoas: manual/externo, sem tela no app na V1 | ✅ |
| D37 | Menu "3 pontos": adiado, sem detalhar agora | 🟡 |
| D38 | Editar/reclassificar/excluir evento entra na V1 (via bottom sheet) | ✅ |
| D39 | "Decisões da obra" entra na V1 | ✅ |
| D40 | Papéis/permissões: 1 usuário master; sem segregação na V1 | ✅ |
| D41 | Reembolso (JC-3): **NÃO na V1 → V2**. Foco: pagar prestador + saber gasto | ✅ |
| D42 | Offline-first: não é requisito da V1 (assume internet ao abrir) | ✅ |
| D43 | Motor de classificação: LLM via API desde a V1 (texto); PIX visão + confirmação | ✅ |
| D44 | Plano B da IA: não classificou → nada; classificou errado → usuário edita | ✅ |

### Navegação e consistência visual (decisões tomadas vendo as telas)
| # | Decisão | Status |
|---|---------|--------|
| D45 | **Sem navbar inferior global.** Cada obra é um "grupo"; lentes acessadas por **abas no topo** (Resumo · Conversa · Pendências · Documentação · Decisões · Dash). Preserva contexto por obra e o input do chat embaixo | ✅ |
| D46 | **Bottom sheet reutilizável**: "Editar registro" é componente global; qualquer "editar" abre o mesmo sheet | ✅ |
| D47 | Campo de **localização/cidade** na criação da obra (opcional) → alimenta o subtítulo do header ("Obra Ecologie · São Paulo, SP") | ✅ |

---

## 2. Decisões técnicas de classificação (detalhe de D43/D44)

Contexto do build inicial: **sem backend estruturado**, projeto em **git público**,
objetivo de **testar o conceito**. Caminhos (do mais simples ao mais rico):

1. **Regras/palavras-chave (recomendado começar aqui):** tem imagem → foto; várias
   linhas → lista; contém "R$"/"pix"/"comprovante" → pagamento; contém data/
   "comprar" → lembrete. **Zero custo, zero chave, funciona offline.**
2. **LLM no navegador** (Transformers.js / WebLLM): classifica texto localmente,
   **sem chave e sem backend** — ideal para git público. Modelo baixa no 1º uso.
3. **API de LLM com tier gratuito** (Gemini / Groq / OpenRouter): mais inteligente,
   **mas exige chave** → só com um mini-proxy serverless (Vercel/Netlify) para não
   expor a chave no front público.

> **Regra de segurança:** NUNCA colocar chave de API no front público. Ver
> `07_ARQUITETURA_TECNICA.md`. O plano B (D44) garante que erros de classificação
> tenham custo baixo, então começar por regras é seguro.

---

## 3. Escopo — V1 vs V2

### ✅ Dentro da V1
- Múltiplas obras (usuário master único).
- Conversa de captura (texto, foto, voz, PDF) sem gate.
- Classificação em 2º plano + "não classificado" + edição (bottom sheet).
- Eventos E1–E8; logística como herói.
- **Financeiro via Host de pagamentos**: reconhecer favorecido, agrupar por
  pessoa, sumário por fase e por prestador/fornecedor.
- Lentes: Checklists, Documentação (diário, foto+legenda opcional+fase),
  Decisões, Dash da obra, Prestador (deep-dive), Orçamentos.
- Fases: 5 fixas (Fundação · Estrutura · Hidráulica · Elétrica · Acabamento) +
  editáveis/reordenáveis.
- Navegação por abas no topo da obra (sem navbar global).
- Login simples (e-mail/senha + Google); acesso por link enviado por fora.

### ❌ Fora da V1 (→ V2 ou depois)
- **Reembolso / "a receber" / cobrança do dono** (D41).
- **Papéis e permissões** / segregação de acesso (D40).
- **Dash geral** (portfólio de todas as obras).
- **Comparação de orçamentos** (não validado como dor).
- **Cadastro/aceitar convite** dentro do app e **convidar pelo app** (D35/D36).
- **Notificações ricas**; começar simples ou depois.
- **Offline-first** (D42).
- **Prestação de contas formal ao dono** (relatório por fase).
- Menu "3 pontos" detalhado (D37).

---

## 4. Pendências conscientes (não bloqueiam a V1)

1. Validar com **export de 1 conversa 1:1 de pagamento** (refina E7/Caso E).
2. Confirmar libs de IA no build (regras → WebLLM → API).
3. Limiar de similaridade do "checklist vivo" (Caso B) para não sugerir errado.
4. Definir gatilhos de "fase" que disparam notificação.
