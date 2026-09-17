# 01 — Visão de Produto, JTBDs e Jornadas Críticas

> Leia após o `00_INDEX.md`. Este arquivo dá o "porquê" de cada tela e fluxo.

---

## 1. Visão em uma frase

Um app que **recebe do jeito que um grupo de WhatsApp recebe** — texto solto,
foto, voz, zero fricção — mas que por trás **organiza tudo em gestão financeira e
documentação de obra**, para engenheiros/arquitetos que hoje já fazem esse
controle em grupos de WhatsApp, só que sem nenhuma estrutura.

**Diferencial inegociável:** a captura não tem fricção. Nada entre a intenção e
o "foi recebido".

---

## 2. Usuário e contexto (V1 = 1 pessoa real, usuário master único)

- Engenheira/arquiteta que administra 1+ obras para clientes (donos da obra).
- Paga fornecedores (material) e prestadores (mão de obra), tipicamente via PIX.
- Usa **dois celulares** (um só para pagamentos, por segurança) e já tem o hábito
  de **pagar, mandar o comprovante numa conversa e depois encaminhar**.
- Precisa saber **quanto gastou por fase e por pessoa**.
- Documenta a obra por fotos e precisa achar isso depois (diário de obra).
- Hoje faz tudo em grupos de WhatsApp (logística) + conversas 1:1 (pagamentos),
  tudo misturado e não consultável.

**Dor central:** nada é consultável depois. Sem visão de gasto, sem histórico
organizado, e quando um pagamento é contestado, caça o comprovante no banco.

---

## 3. A regra de ouro — "Loops que a vida real deixa em aberto"

Na vida real a pessoa captura e segue em frente. Ela nunca volta para:
- dar baixa num reembolso que já recebeu (→ V2);
- colocar prazo numa pendência que mencionou;
- confirmar que um pagamento foi feito;
- categorizar/organizar o que jogou no grupo.

Logo, o trabalho da inteligência **não é melhorar a captura** (o chat já resolve
com zero fricção). É **reconhecer o loop aberto e oferecer o fechamento em 1
toque, no momento certo, sempre opcional.**

### As 5 leis da camada de inteligência
1. **Captura = 0 fricção, sempre.** A inteligência nunca entra no caminho da captura.
2. **Inteligência = sugestão de 1 toque, sempre opcional e descartável.**
3. **No momento certo, não no da captura** (numa aba, resumo, notificação por fase).
4. **Zero preenchimento estruturado.** No máx. 1 toque + 1 escolha simples.
5. **Teste da planilha.** Se precisa preencher tudo certinho, ela usaria uma planilha.

---

## 4. Jobs to be Done

### JTBD-1 — Capturar no meio da obra ✅ (base de tudo)
*Quando* estou na obra, com pouco tempo, e algo acontece (paguei o pedreiro,
preciso comprar cimento, vi um problema), *eu quero* jogar isso num toque —
texto, foto ou voz — *para* não parar o trabalho e confiar que não se perde.
- Definição de pronto: apareceu **"recebido"** na hora. Classificação vem depois.

### JTBD-2 — Não perder prazos/pendências (calendário emergente) 🟡
*Quando* menciono algo com prazo, *eu quero* ser lembrada na hora certa *sem*
cadastrar tarefa. Prazos são raros no uso real → sugestão de data é **oportunista**
(só quando ela mesma cita uma data). Eventos com data formam um calendário da obra.

### JTBD-3 — Reembolso 🔴 → **V2**
Marcar gasto do próprio bolso e dar baixa ao receber. **Fora da V1** (decisão D41).
Foco da V1 é pagar prestador + saber quanto gastou, não cobrar reembolso.

### JTBD-4 — Puxar evidência quando contestam ✅
*Quando* alguém questiona um pagamento, *eu quero* achar o comprovante da
pessoa/data em segundos, *para* resolver sem caçar no extrato. Histórico por
pessoa e por data; busca devolve evento + comprovante.

### JTBD-5 — Saber quanto gastei (financeiro/host de pagamentos) ✅ 🆕
*Quando* pago prestadores/fornecedores, *eu quero* que o app catalogue sozinho
(por pessoa, fase, valor) ao encaminhar o comprovante, *para* saber quanto gastei
por fase e por pessoa sem montar planilha.

### JTBD-6 — Documentar e achar depois (diário de obra) ✅ 🆕
*Quando* fotografo o andamento, *eu quero* que fique organizado por fase e
buscável (com legenda opcional), *para* achar "como estava antes de fechar a
parede" e prestar contas visualmente.

### JTBD-7 — Lembrar decisões de especificação ✅
*Quando* decido um acabamento (cor, medida, modelo), *eu quero* fixar isso como
memória pesquisável, *para* não ter retrabalho por esquecimento.

---

## 5. Jornadas críticas (mapa)

| # | Jornada | Natureza | V1? | Tela/lente principal |
|---|---------|----------|-----|----------------------|
| JC-1 | Capturar no meio da obra | base (0 fricção) | ✅ | Conversa |
| JC-2 | Não perder prazos (calendário emergente) | loop → data | 🟡 leve | Pendências/Dash |
| JC-3 | Reembolso (marcar + baixa) | loop → baixa | ❌ V2 | — |
| JC-4 | Puxar evidência (contestação) | consulta/prova | ✅ | Prestador/Busca |
| JC-5 | Fechar o dia (pagamentos em lote) | ritual | 🟡 lente leve | Dash/host |
| JC-6 | Documentar diário de obra | doc/histórico | ✅ | Documentação |
| JC-7 | Memória de decisões | anti-retrabalho | ✅ | Decisões |

---

## 6. Tipos de evento (taxonomia — usados na classificação)

| Cód | Tipo | Sinal típico | Comportamento |
|-----|------|--------------|---------------|
| E1 | **Lista de material** | texto multi-item | oferece virar checklist (Fluxo 2 caso A) |
| E2 | **Checklist de pendências (vivo)** | re-envio da mesma lista com status | funde status (caso B) — **achado central** |
| E3 | **Decisão de especificação** | cor/medida/modelo | fixa em "Decisões da obra" (caso D) |
| E4 | **Documentação (foto/vídeo)** | mídia, ~58% do conteúdo, s/ legenda | diário buscável por fase/data |
| E5 | **Documento da obra (PDF)** | planta/orçamento em PDF | anexo indexado |
| E6 | **Comunicação/reclamação formal** | raro, alto risco | destaca e preserva |
| E7 | **Pagamento (financeiro)** | comprovante PIX encaminhado | host: prestador/fornecedor + valor + fase |
| E8 | **Orçamento (quote)** | orçamento por produto/fornecedor | arquivo buscável |

> Nota sobre foto/legenda: legenda é **opcional, nunca obrigatória**. Capturar
> quando vier junto; oferecer adicionar depois em 1 toque (D31).

---

## 7. Métricas do MVP (para instrumentar)

- **Time-to-capture:** intenção → "recebido" (quanto menor, melhor).
- **Taxa de captura:** eventos/dia de obra ativa.
- **% auto-classificado corretamente** (sem edição posterior).
- **% "não classificado"** que a pessoa resolve depois.
- **Sucesso/tempo de recuperação de evidência** (JC-4).
- **Financeiro:** cobertura de pagamentos com favorecido/fase reconhecidos.
- **Retenção:** substitui/reduz o uso do grupo de WhatsApp?
