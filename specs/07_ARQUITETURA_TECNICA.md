# 07 — Arquitetura Técnica (para a IA de código)

> Guia técnico do MVP. Contexto: **sem backend estruturado no início**, projeto
> em **git público**, objetivo de **testar o conceito**. Escolhas priorizam
> simplicidade e segurança (não expor segredos).

---

## 1. Restrições e princípios técnicos
- **Git público:** NUNCA versionar chaves/segredos. Sem chave de API no front.
- **Sem backend obrigatório na V1:** preferir soluções client-side ou serverless
  grátis quando precisar esconder segredo.
- **Offline-first NÃO é requisito** (D42): pode assumir internet ao abrir.
- **1 usuário master** (D40): sem multiusuário/permissões.
- **Mobile-first**, layout de app (as telas são portrait).

---

## 2. Stack sugerida (flexível — a IA de código pode adaptar)
- **Front:** app web mobile-first (React/Next, Vue, ou similar) ou React
  Native/Expo se quiser app nativo. Como é "abrir no navegador para testar",
  um **PWA** cai bem.
- **Estado/persistência V1:** começar com **armazenamento local** (IndexedDB via
  Dexie, ou localStorage para protótipo). Evoluir para backend/DB quando validar.
- **Deploy:** GitHub Pages / Vercel / Netlify (tiers grátis).
- **Se precisar de segredo (API de IA):** função serverless (Vercel/Netlify) como
  **mini-proxy** que guarda a chave em variável de ambiente.

---

## 3. Classificação de eventos (D43/D44) — estratégia em camadas
Implementar de forma **plugável** (interface `Classifier`), começando simples:

1. **RegrasClassifier (começar aqui):** heurísticas locais, custo zero:
   - tem imagem/vídeo → `E4 Documentação` (fase = fase atual, legenda = texto junto se houver);
   - PDF → `E5 Documento` (se contém "orçamento" → `E8 Orçamento`);
   - texto com múltiplas linhas/itens → `E1 Lista de material`;
   - contém "R$", "pix", "comprovante", "pago" ou é print de comprovante → `E7 Pagamento`;
   - contém data/"comprar"/"até" → marca lembrete/data (Fluxo 2 caso C);
   - decisão (cor/medida/modelo, marcas) → `E3 Decisão`;
   - nada casou → **não classificado**.
2. **LLMNavegadorClassifier:** Transformers.js/WebLLM rodando no browser (sem
   chave, sem backend) para classificar texto com mais nuance.
3. **LLMApiClassifier:** Gemini/Groq/OpenRouter via **mini-proxy serverless**
   (nunca chave no front). Melhor qualidade; usar quando houver proxy.

**Reconhecimento do comprovante PIX (E7):**
- V1 simples: extrair via regras/OCR leve (Tesseract.js no browser) o favorecido/
  valor/data; **pedir 1 toque de confirmação** ao usuário (Fluxo 2 caso E).
- Evolução: modelo multimodal (visão) via proxy.

**Plano B (D44):** falha na classificação → "não classificado", sem nada forçado;
classificação errada → usuário corrige no **bottom sheet Editar** (Tela 10).

---

## 4. Modelo de dados (entidades)

### Worksite (Obra)
```
id, name, clientName?, location?, photoUrl?,
startDate?, expectedEndDate?, details?,
phases: Phase[],            // 5 default + custom, ordenáveis
currentPhaseId?, status: active|archived,
createdAt, updatedAt
```

### Phase (Fase)
```
id, worksiteId, name, color, order   // default: Fundação, Estrutura,
                                      // Hidráulica, Elétrica, Acabamento
```

### Event (Evento) — tudo que entra na conversa
```
id, worksiteId,
kind: E1_lista | E2_checklist | E3_decisao | E4_documentacao |
      E5_documento | E6_comunicacao | E7_pagamento | E8_orcamento | unclassified,
confidence: 0..1,
phaseId?,                      // tag de fase (global), aplicável na hora ou depois
createdAt, receivedAt,         // receivedAt = imediato ("recebido")
authorId,                      // V1: sempre o usuário master
payload: { ... },              // varia por kind (ver abaixo)
attachments: Attachment[],     // fotos, pdf, comprovante, áudio
caption?,                      // legenda opcional (foto)
edited: bool, deleted: bool
```

### Payloads por kind (resumo)
- **E1_lista:** `rawText`, `items?: string[]`, `linkedChecklistId?`
- **E2_checklist:** `title`, `sourceListDate`, `items: {text, status: falta|ok, note?, date?}[]`, `statusHistory[]`
- **E3_decisao:** `title`, `value`, `environment?` (Sala/Banheiro/…), `chatRef`
- **E4_documentacao:** (foto/vídeo em attachments), `caption?`, `phaseId`
- **E5_documento / E8_orcamento:** `fileRef`, `supplier?`, `product?`, `amount?`, `category?`
- **E7_pagamento:** `amount`, `payeeName`, `payeeKeyMasked?`, `date`, `receiptRef`, `payeeType?: prestador|fornecedor`, `phaseId?`

### Payee (Prestador/Fornecedor) — derivado, agrupado por favorecido
```
id, worksiteId, name, type?: prestador|fornecedor,
totalPaid (computed), paymentsCount (computed), firstPaymentDate (computed)
```
> Payee **emerge automaticamente** do agrupamento por nome/chave do favorecido do
> PIX (Fluxo 2 caso E). Categorização (prestador/fornecedor) e fase são
> enriquecimentos opcionais.

### Suggestion (Cartão de sugestão — Fluxo 2)
```
id, worksiteId, targetEventId?,
case: A_checklist | B_status | C_data | D_decisao | E_prestador | G_fechar_dia,
state: detected | offered | accepted | ignored | silenced,
trigger, proposalText, createdAt
```
> Regra anti-irritação: ignorou 2× um `case` → `silenced` por um período.

---

## 5. Lentes (views) — só leitura
Checklists, Documentação (diário), Decisões, Dash da obra, Prestador, Orçamentos
**computam** a partir de `Event[]`. **Nunca** criam evento. Toda captura vem da
Conversa (D6/D13).

---

## 6. Navegação (D45)
- App → **Home** (lista de obras) → **Obra** (contêiner).
- Dentro da obra: **abas no topo** (Resumo · Conversa · Pendências · Documentação
  · Decisões · Dash). Sem navbar inferior global.
- Conversa: input do chat fixo embaixo.
- **Editar** em qualquer lugar → **bottom sheet global** (Tela 10 / D46).

---

## 7. Segurança (git público) — checklist
- [ ] Sem chaves/segredos no repositório (usar `.env` fora do versionamento).
- [ ] Se usar API de IA, colocar chave só em **serverless env var** (proxy).
- [ ] Se houver "entrar por link/convite" no futuro: validar token **no
      back-end**, com expiração e uso único (não confiar em checagem só no front,
      pois o código é público).
- [ ] Dados sensíveis (financeiro, fotos de imóveis): tratar com cuidado; planejar
      LGPD (consentimento/retenção) quando sair do protótipo.

---

## 8. Instrumentação (métricas do MVP)
Registrar eventos de produto para as métricas do `01_PRODUTO`: time-to-capture,
taxa de captura, % auto-classificado correto, % "não classificado" resolvido,
sucesso/tempo de recuperação de evidência, cobertura financeira, retenção.
