# 02 — Fluxos

> Dois fluxos governam o app inteiro. Toda tela deriva deles.
> Regra soberana: **captura = 0 fricção**; a inteligência age em 2º plano e
> propõe em 1 toque.

---

## FLUXO 1 — Captura + Classificação em 2º plano

### Modelo mental
```
   ELA MANDA ALGO          →   APARECE "RECEBIDO"   →   (2º plano) CLASSIFICA
   texto / foto / voz           na hora, sempre           com nível de confiança
   vídeo / pdf / lista                                          │
   (single ou em lote)                                          ▼
                                                    vira EVENTO tipado (E1–E8)
                                                    (ou "não classificado")
                                                          │
                                                          ▼
                                            (depois, no momento certo)
                                            SUGESTÃO de 1 toque, opcional (Fluxo 2)
```

### Passo a passo (happy path)
1. Usuário abre a obra e joga conteúdo (1 item ou rajada).
2. **"Recebido" imediato**, na ordem enviada, igual chat. Fim da obrigação dela.
3. Em 2º plano, o classificador atribui **tipo (E1–E8) + nível de confiança**.
   - Confiança baixa → **"não classificado"** (visível, nunca descartado).
4. Um **chip discreto** de tipo aparece no evento (não é modal, não pede ação).
5. Depois, no momento certo, a engine oferece **sugestão de 1 toque** (Fluxo 2).

### Tratamento por tipo de entrada
| Entrada | Frequência real | Tratamento |
|---|---|---|
| Lista multi-item | altíssima (~40% do texto) | 1 evento *Lista*; não força estrutura; oferece checklist |
| Foto(s) em lote, sem legenda | ~58% do total | aceita em silêncio; *Documentação*; nunca pede legenda |
| Texto curto | média | classifica por conteúdo |
| Vídeo/PDF | ~15% | anexo; PDF pode virar *Documento* |
| Voz | rara | mídia; **transcrição sob demanda** na V1 (D19) |
| Comprovante PIX | (canal de pagamento) | *Pagamento*; dispara reconhecimento de favorecido |

### Os 4 comportamentos obrigatórios (achados do export real)
1. **Lista multi-item sem estrutura:** entra como 1 evento, texto cru preservado;
   opcional virar checklist; nunca parseia à força em campos.
2. **Checklist vivo (achado central):** ao detectar re-envio da mesma lista com
   status, reconhece e oferece **atualizar status** (funde no checklist, guarda
   histórico). Ver Fluxo 2 caso B.
3. **Foto sem legenda em lote:** aceita todas; classifica *Documentação*; busca
   por **data e fase** (não por tag manual). Legenda é opcional.
4. **Excluir tão fácil quanto editar:** excluir 1 item = 1 toque; **excluir em
   lote** (seleção múltipla), pois o dado mostra exclusões em rajada.

### Estados de um evento
```
  RECEBIDO ──▶ CLASSIFICANDO ──▶ CLASSIFICADO (tipo + confiança)
                     │                   │
                     ▼                   ├─▶ com sugestão de 1 toque (loop aberto)
              NÃO CLASSIFICADO           └─▶ sem sugestão (só registrado)
              (visível, editável)
                     │
                     ▼
              EDITADO / EXCLUÍDO (a qualquer momento — abre BOTTOM SHEET)
```
Invariantes: "recebido" nunca espera classificação; "não classificado" é estado
legítimo; toda ação é reversível.

### Plano B da classificação (D44)
- **Não classificou** → fica sem tipo, sem nada forçado. Visível como "não
  classificado".
- **Classificou errado** → usuário vê e **edita** (bottom sheet). Custo do erro
  é baixo por design → a IA não precisa ser perfeita na V1.

### Anti-goals do Fluxo 1
Pop-up de categoria na captura ❌ · campo/legenda obrigatória ❌ · confirmação
antes do "recebido" ❌ · parsear lista em colunas ❌ (mas enumeração numa linha vira itens — D156) · notificação de rotina
diária ❌.

---

## FLUXO 2 — Sugestão de 1 toque (engine única e reutilizável)

### Princípio: uma engine, muitos casos
Não programar cada sugestão separada. Existe **1 engine** que: observa eventos
(nunca a captura) → detecta **loop aberto** → propõe **ação de 1 toque** no
momento certo → aprende com aceitar/ignorar.

```
  EVENTOS  ──▶  DETECTOR DE LOOP  ──▶  CARTÃO DE SUGESTÃO  ──▶  AÇÃO
  (já capturados)   (regras/sinais)     (1 toque, opcional)     aplica e vira evento
                                              │
                                              └── ignorar = fica como está
```

### Anatomia do "cartão de sugestão" (componente único)
| Elemento | Descrição |
|---|---|
| Gatilho | o que foi detectado ("mandou a mesma lista de novo") |
| Proposta | ação em linguagem humana ("Atualizar o status do checklist?") |
| Ação primária | 1 toque = aceitar |
| Ação secundária | "agora não" (ignorar, sem custo) |
| Ajuste opcional | só quando faz sentido (ex.: escolher data) — nunca obrigatório |
| Por quê | micro-explicação do gatilho (transparência) |

> Regra: se aceitar exigir mais que **1 toque + 1 escolha simples**, o caso está
> mal desenhado.

### Onde as sugestões aparecem (nunca na captura)
- **Chip no evento** (logo após classificar).
- **Inline discreto** na conversa (ex.: "Transformar em checklist?").
- **Aba de pendências/loops** (acumulam silenciosamente).
- **Resumo da obra**.
- **Notificação por fase/evento** (nunca rotina diária).

### Catálogo de casos
| Caso | Evento | Status V1 | Gatilho | Ação de 1 toque |
|---|---|---|---|---|
| A — Lista → checklist | E1 | ✅ | lista multi-item | criar checklist |
| B — Atualizar status | E2 | ✅ (herói) | re-envio de lista | fundir + atualizar |
| C — Sugerir data | E1/E2 | 🟡 leve | menção explícita de tempo | criar lembrete/calendário |
| D — Salvar decisão | E3 | ✅ | decisão de spec | fixar em "Decisões" |
| E — Reconhecer prestador/fornecedor (PIX) | E7 | ✅ | comprovante encaminhado | cadastrar/associar favorecido |
| F — Baixa de reembolso | — | ❌ V2 | — | — |
| G — Fechar o dia | E7 | 🟡 lente leve | vários pagamentos/dia | agrupar pagamentos |

### Caso E em detalhe (Host de pagamentos — o mais valioso do financeiro)
Reconhecimento em 3 camadas, todas 0-fricção:
1. **Ideal:** lê o comprovante, extrai o favorecido, sugere *"Cadastrar José
   Costa como prestador ou fornecedor?"* → 1 toque.
2. **Se ignora a tag:** mesmo sem categorizar, **agrupa todos os pagamentos do
   mesmo favorecido** (nome/chave) e já soma → o sumário funciona sozinho.
3. **Enriquecimento depois:** a qualquer momento, 1 toque para marcar
   fornecedor/prestador e a fase.
> O sumário financeiro **nunca depende** de ela fazer algo. Se fizer, fica mais rico.

### Comportamento anti-irritação (crítico — uso é em rajadas por fase)
- No máx. **1 destaque por superfície**; nunca empilhar sugestões.
- **Ignorou 2× o mesmo tipo → silencia** aquele tipo por um tempo.
- Sugestões acumulam numa aba; não viram notificação a cada detecção.
- Notificação só por **gatilho de fase/evento**, jamais rotina diária.

### Estados de uma sugestão
```
   DETECTADA ──▶ OFERECIDA ──▶ ACEITA (aplica, reversível)
                     │
                     ├─▶ IGNORADA (recolhe; dado original intacto)
                     └─▶ SILENCIADA (após ignorar repetido; pausa o tipo)
```
