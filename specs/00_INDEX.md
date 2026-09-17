# Zap da Obra — Documentação de Produto (pacote para IA de código)

> **O que é este pacote:** a especificação completa do produto **Zap da Obra**,
> um app que recebe conteúdo com a naturalidade de um grupo de WhatsApp (texto,
> foto, voz — zero fricção) e por trás organiza tudo em gestão financeira e
> documentação de obra ("o arquivo master da obra").
>
> **Para quem lê (você, IA de código):** leia os arquivos na ordem abaixo. As
> **decisões são normativas** — quando houver dúvida de implementação, o
> `03_DECISOES.md` (Decision Log D1–D47) tem prioridade sobre qualquer inferência.

---

## Como ler este pacote (ordem recomendada)

| # | Arquivo | O que contém |
|---|---------|--------------|
| 00 | `00_INDEX.md` | Este índice + resumo executivo + glossário |
| 01 | `01_PRODUTO_visao_jtbd.md` | Visão, usuário, JTBDs, 5 jornadas críticas, a "regra de ouro" |
| 02 | `02_FLUXOS.md` | Fluxo 1 (captura+classificação) e Fluxo 2 (sugestão de 1 toque) |
| 03 | `03_DECISOES.md` | **Decision Log D1–D47** + decisões de negócio + escopo V1/V2 |
| 04 | `04_TELAS.md` | As 15 telas da V1 com specs completas de UI/estados/interações |
| 05 | `05_DESIGN_SYSTEM.md` | Tokens de cor, tipografia, componentes, espaçamento |
| 06 | `06_BRANDING.md` | Logo, app icon, mascote, usos e regras de marca |
| 07 | `07_ARQUITETURA_TECNICA.md` | Modelo de dados, classificação (LLM sem backend), segurança, stack sugerida |
| 08 | `08_BUILD_CHECKLIST.md` | Ordem de desenvolvimento sugerida + critérios de aceite |

---

## Resumo executivo (leia primeiro)

**Produto:** Zap da Obra. Um "grupo de WhatsApp" por obra, onde o usuário joga
tudo sem fricção, e o app **classifica em segundo plano** e organiza em lentes
(checklists, documentação/diário, decisões, financeiro, dashboard).

**Usuário V1:** uma engenheira/arquiteta que administra obras para clientes.
Hoje usa grupos de WhatsApp bagunçados e conversas 1:1 para pagar prestadores.
**Um único usuário master na V1** (sem papéis/permissões).

**A tese (validada com export real de conversa):**
- A dor diária é **logística** (listas de material, checklist vivo, documentação
  fotográfica) → **herói da V1**.
- O **financeiro** (pagar prestadores/fornecedores, saber quanto gastou por fase
  e por pessoa) é **dor real confirmada** → entra na V1 via "Host de pagamentos".
- **Reembolso/cobrança** → fica para a **V2**.

**A regra de ouro (norteia tudo):** *"Loops que a vida real deixa em aberto."*
A captura é zero-fricção; a inteligência **nunca** atrapalha a captura — ela age
depois, propondo **ações de 1 toque**, sempre opcionais, no momento certo.

**Diferencial inegociável:** nada entre a intenção e o "recebido". Se um fluxo
exige preencher campos/caixinhas, está errado ("teste da planilha": *se ela
tivesse que preencher tudo certinho, usaria uma planilha*).

---

## Princípios de produto (invioláveis)

1. **Captura = 0 fricção.** O "recebido" aparece na hora, como no WhatsApp.
2. **Classificação em 2º plano**, com nível de confiança.
3. **Nada é descartado** — o que não classifica vira "não classificado" (visível).
4. **Correção é o mecanismo, não a exceção** — editar/reclassificar é trivial.
5. **Foto e voz são cidadãos de primeira classe.**
6. **Toda inteligência = 1 engine de sugestão reutilizável** (cartão de sugestão).
7. **Cada obra é um "grupo"** — navegação por **abas no topo** da obra, nunca
   navbar global inferior.

---

## Glossário

- **Obra:** o "grupo". Contêiner de tudo (conversa + lentes). Escopo de todo dado.
- **Evento:** qualquer coisa capturada na conversa (texto, foto, voz, lista, PDF,
  comprovante). Recebe um **tipo** (E1–E8) na classificação.
- **Lente:** visão que **apenas lê** os eventos (Checklists, Documentação,
  Decisões, Dash, etc.). Lentes **nunca** capturam.
- **Cartão de sugestão:** componente único da engine de inteligência (Fluxo 2).
- **Fase:** etapa da obra (ex.: Fundação → Estrutura → Hidráulica → Elétrica →
  Acabamento). Tag **global/transversal** para filtros. 5 fixas + editáveis.
- **Host de pagamentos:** o app como destino do encaminhamento de comprovantes
  PIX, catalogando por prestador/fornecedor + valor + fase.
- **Não classificado:** estado legítimo e visível de um evento sem tipo definido.

---

## Estado do projeto

- **Fase atual:** V1 em implementação. Blocos 0–8 do `08_BUILD_CHECKLIST.md`
  essencialmente feitos (ver a tabela de status lá); falta polimento, voz,
  OCR de comprovante, exclusão em lote e os assets de marca.
- **Telas:** 15 desenhadas (ver `04_TELAS.md`).
- **Marca:** definida em texto (ver `06_BRANDING.md`), mas **os arquivos de
  logo/mascote ainda não estão no repositório** — o app usa placeholders até
  chegarem em `public/brand/`.
- **Decisões:** D1–D47 (produto) + D48–D57 (tomadas no build) em `03_DECISOES.md`.
- **Stack real:** Next.js + Supabase (Postgres/Auth/Storage), deploy na Vercel.
