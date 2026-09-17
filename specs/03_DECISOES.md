# 03 — Decisões (Decision Log D1–D93) + Escopo V1/V2

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
| D6 | Chat é a única superfície de captura; dashboards só leem. O atalho "+" da lente não abre exceção: ele escreve na conversa (ver D79) | ✅ |
| D7 | Não congelar fluxos/design antes da análise do export (feito depois) | ✅ |
| D8 | 4º tipo (atualização/documentação) capturado na V1 | ✅ |

### Inteligência (Fluxo 2)
| # | Decisão | Status |
|---|---------|--------|
| D9 | Inteligência = sugestão de 1 toque, opcional, no momento certo (5 leis) | ✅ |
| D10 | Reembolso tem 2 tempos (marcar + baixa) — **movido para V2** (ver D41) | ↪️ V2 |
| D11 | Pendências com prazo formam calendário emergente | ✅ |
| D12 | "Fechar o dia" entra na V1 como lente leve | 🟡 |
| D13 | Toda lente só LÊ eventos — nenhuma lente cria registro próprio. O atalho de captura da lente grava na conversa e a lente lê de lá (ver D79) | ✅ |

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
2. Confirmar libs de IA no build (regras → WebLLM → API). → ver D55.
3. ~~Limiar de similaridade do "checklist vivo"~~ → resolvido em D51.
4. Definir gatilhos de "fase" que disparam notificação.

---

## 5. Decision Log — decisões tomadas durante o build da V1 (D48–D57)

| # | Decisão | Status |
|---|---------|--------|
| D48 | **Persistência = Supabase** (Postgres + Auth + Storage), não IndexedDB local como sugeria o `07`. Motivo: ela usa **dois celulares**, e o dado precisa existir nos dois; o Storage também resolve foto/comprovante. O `07` já previa adaptação pela IA de código | ✅ |
| D49 | Schema **single-user** de verdade: sem empresa/convite/papéis. Todo dado pertence ao `owner_id = auth.uid()`, com RLS por dono da obra. Conta criada no painel do Supabase (coerente com D35/D36) | ✅ |
| D50 | Reordenar fases por **setas ▲▼**, não drag-and-drop. Motivo: drag em web mobile exige lib e quebra fácil no toque; a função é a mesma | ✅ |
| D51 | **Limiar do checklist vivo (Caso B):** sugere fusão quando **2+ itens casam E ≥50% de sobreposição** (após normalizar acento, status e número). Conservador de propósito: erra pra menos, não pra mais | ✅ |
| D52 | **Ordem de classificação:** texto com 3+ linhas é lista (sinal mais forte do uso real, ~40% do texto) e ganha de "decisão". O **nome do arquivo** entra na classificação (ex.: "Orçamento 335396.pdf" → E8) | ✅ |
| D53 | **Excluir = soft delete** (`deleted = true`), nunca apaga fisicamente — mantém "toda ação é reversível". Exclusão **em lote** (D17) ainda não implementada | 🟡 |
| D54 | **Orçamentos não tem aba própria** (as abas são as 6 do D45): é acessada pelo card no Dash | ✅ |
| D55 | **OCR de comprovante ainda não implementado.** Enquanto isso, o caminho é manual: editar o registro e informar valor + favorecido no bottom sheet. Pagamento por **texto** ("pix de R$ 1.250 pro José Costa") já é extraído automaticamente. Decisão pendente com o dono: adotar Tesseract.js (custo: ~10MB baixados no 1º uso, roda no celular) ou esperar | 🟡 |
| D56 | **Captura de voz ainda não implementada** (D19 já era 🟡): o input aceita texto e anexos (foto/vídeo/PDF) | 🟡 |
| D57 | **Tema único, sem dark mode.** O template inicial invertia as cores pelo `prefers-color-scheme` e quebrava o contraste dos botões; agora a paleta do `05` vale sempre | ✅ |
| D76 | **Lista e checklist são o MESMO card, numa seção só.** Separar em "Listas recebidas" e "Checklists" fazia o card sumir do lugar ao ser convertido e reaparecer no fim da página — com várias listas, parecia que "criou a primeira e parou de criar" (os checklists estavam sendo criados, só fora da tela). Agora o card converte no lugar, mantendo posição e ordenação pela data da lista de origem | ✅ |
| D77 | **Card tem ação de conjunto além do item:** "✓ Concluir tudo" e "🗑 Tirar da lista", sem tirar o checkbox por item | ✅ |
| D78 | **"Tirar da lista" remove das pendências, não apaga a mensagem** (marca `dismissed`): a conversa continua sendo o registro, e nada que ela mandou se perde (D3) | ✅ |
| D86 | **Tempo do verbo separa pagamento de lista.** "comprei/compramos/gastei/quitei/acertei" é dinheiro que já saiu (E7); "comprar" no infinitivo continua sendo item de lista (E1). Sem isso, "comprei 200 de tijolo na construção Bom Lar" virava material e nunca chegava no dash. Trava junto: número seguido de unidade é **quantidade, não valor** ("comprei 3 sacos de cimento" não são R$ 3) | ✅ |
| D87 | **Favorecido também sai do lugar da compra.** Além de "para/pro/pra <nome>", lê "na/no/em <estabelecimento>" — mas só quando a preposição forte não achou nada, e com stoplist de lugar/tempo ("na obra", "na sexta"). Fornecedor de balcão é tão favorecido quanto prestador | ✅ |
| D88 | **Acabou a sugestão "transformar essa lista em checklist".** Desde o D74/D76 a lista já é marcável item a item e converte no primeiro toque — perguntar de novo era o app pedindo permissão para algo que já estava feito. A fusão de status (B_status) fica, porque essa sim é uma decisão real | ✅ |
| D89 | **"A comprar" conta lista crua também.** Só contava item de checklist, então uma lista recém-chegada aparecia na aba de pendências com o contador do dash dizendo zero. A regra de "lista aberta" virou módulo único (`lib/pendencias.ts`) usado por pendências, dash e resumo | ✅ |
| D90 | **O gate de autenticação valida o JWT localmente (`getClaims`), não pergunta ao servidor de Auth (`getUser`).** Medido: `getUser` custava **145–420ms em toda navegação** e era a maior fatia da lentidão ao trocar de aba; `getClaims` responde em 1–6ms verificando a assinatura contra o JWKS em cache. Sessão expirada continua sendo renovada (o `getClaims` passa pelo `getSession`), e se o projeto usasse chave simétrica ele cairia sozinho de volta no `getUser` | ✅ |
| D91 | **Lente que não mostra imagem não assina URL de anexo.** Pendências e Resumo pagavam uma ida ao Storage por troca de aba sem exibir uma foto sequer (`carregarEventosComAnexos(..., { assinar: false })`) | ✅ |
| D92 | **Linha de prestador no dash é linha clicável, não gráfico.** Com inicial, contagem de pagamentos, chevron e a dica "toque no nome para ver o histórico" — antes parecia só uma barra e ninguém descobria que abria o extrato da pessoa | ✅ |
| D93 | **Texto sobre o header verde usa cor clara.** O "Sair" estava em `--ink-soft`, que foi pensado para fundo claro, e sumia contra o `--primary` | ✅ |
| D79 | **Atalho de captura nas lentes ("+"), nunca um caminho paralelo.** O FAB da lente NÃO grava um registro próprio: abre o bottom sheet e escreve **uma mensagem na conversa**, já com o tipo declarado (`edited: true`, para não reabrir a sugestão de classificação). A lente continua só lendo (D13) e a conversa continua sendo o arquivo master (D6). Tipo por aba: Pendências→E1, Dash e Prestador→E7 (com valor/favorecido), Decisões→E3, Documentação→E4, Orçamentos→E8. Não aparece na Conversa (o composer já está ali) nem nas Configurações | ✅ |
| D80 | **Tokens do `tokens.css` são a fonte única de cor/raio/sombra/tipografia.** O `globals.css` importa o arquivo e o `@theme` do Tailwind só faz a ponte (`--color-primary: var(--primary)`). Onde CSS não chega — manifest do PWA (JSON), `theme-color` (lida antes do CSS) e cores de fase gravadas no banco — existe **um** espelho declarado, `src/lib/tokens.ts`, e nenhum outro hex no código | ✅ |
| D81 | **Logo nunca é recriado.** Vem sempre dos PNGs de `public/assets/logo/`: horizontal no login, mascote nos empty states e como avatar de obra sem foto, app-icon no manifest e como ícone do app. A rota que desenhava um "Z" em `ImageResponse` foi removida. Pendência de asset: o `logo-horizontal.png` tem fundo opaco (~#F9F7F3), diferente do `--bg-paper`, então vai como placa arredondada — uma versão com fundo transparente resolveria | ✅ |
| D82 | **Microfone existe como desenho antes de funcionar.** O botão fica no composer e, ao ser tocado, avisa que áudio está em construção (D56 ainda aberto). Melhor mostrar o caminho e assumir que falta do que esconder a intenção do produto | ✅ |
| D83 | **Toda lente tem "ver no chat"** levando à mensagem que originou o registro (`#evento-<id>`). Sem isso a lente é beco sem saída: você vê o dado e não acha onde ele nasceu | ✅ |
| D84 | **Manifest, ícones e assets de marca ficam fora do gate de autenticação.** O sistema operacional busca o manifest antes de existir sessão; com ele atrás do login, "adicionar à tela de início" não pegava o ícone | ✅ |
| D85 | **Divergências de mockup resolvidas a favor do texto** (regra do `09_ASSETS §3`): o Dash mantém as abas do D45 em vez da pílula "Resumo" do mockup; decisão só mostra miniatura quando veio com foto (a maioria é texto puro, e um quadrado cinza fixo é pior); prestador/fornecedor usa inicial, porque não existe campo de foto no modelo | ✅ |
| D71 | **Bottom sheet fecha arrastando para baixo** pela alça, além do toque fora e do ✕. O arraste fica restrito à alça/título para não brigar com o scroll do conteúdo | ✅ |
| D72 | **Excluir por arrasto tem duas etapas:** arrastar pouco trava o card aberto com o botão "Excluir" (precisa confirmar); arrastar até o fim joga fora direto. Um gesto só apagava registro sem querer, que é o erro mais caro aqui. O ponteiro só é capturado depois que o gesto vira arrasto horizontal — capturar no toque impedia clicar nos itens dentro do card | ✅ |
| D73 | **Excluir checklist religa a lista de origem.** O checklist guarda `sourceEventId`; ao excluir, o vínculo da lista é limpo. Sem isso a lista sumia das duas seções (apontava para um checklist inexistente) e não dava mais para recriar — bug encontrado em teste de uso | ✅ |
| D74 | **Item de lista é marcável direto**, sem precisar "virar checklist" antes: o primeiro toque num item cria o checklist já com aquele item feito. Marcar item a item era o comportamento esperado; um único botão para o card todo não servia | ✅ |
| D75 | **Fase da foto vira chips salvos no toque**, acima da legenda. Era um `<select>` embaixo do campo de legenda e o usuário acabou escrevendo "Fundação" na legenda, achando que tinha classificado a foto — a foto então não aparecia no filtro da fase | ✅ |
| D65 | **Percepção de velocidade é requisito, não polimento.** Com ~27 registros a troca de aba levava ~1s e parecia travada (o usuário clicou várias vezes achando que não respondeu). Medidas: `loading.tsx` com skeleton por aba, bolinha de pendente na aba clicada (`useLinkStatus`), URLs assinadas dos anexos em **uma** chamada em lote (era uma por anexo), corte de um `getUser()` redundante por navegação (o proxy já barra e a RLS já limita) e **"recebido" otimista** na conversa — a mensagem aparece no feed antes do banco confirmar, como manda o D1 | ✅ |
| D66 | **Excluir arrastando para o lado** (como conversa de WhatsApp) em listas e checklists, com limiar de 96px e fundo vermelho progressivo. Implementado com Pointer Events para atender toque e mouse no mesmo código | ✅ |
| D67 | **Prazo tem saída:** cada item com prazo tem "✓ feito" e "✕ tirar o prazo" — antes entrava na lista e não saía mais | ✅ |
| D68 | **Ambiente é detectado do texto dela**, não de taxonomia: "suíte/master/closet" → Quartos, "lavabo/box" → Banheiros, "gourmet/churrasqueira" → Cozinha etc. Um evento pode ter vários ambientes (a mensagem de rejuntes cita 5). Funciona sem precisar "fixar" a decisão — fixar só persiste/enriquece | ✅ |
| D69 | **Faixa "fase atual" na conversa**: o que for capturado dali pra frente herda a fase, sem ela taguear nada (fecha o que o `07 §3` pedia e faz a lente de documentação valer a pena) | ✅ |
| D70 | **Chip de tipo é componente único** (`ChipTipo`) usado na conversa, resumo e lentes — no resumo o tipo aparecia como texto solto, sem parecer tag. E registros do resumo/dash abrem o bottom sheet de edição | ✅ |
| D59 | **Enter = nova linha, não enviar.** Ela escreve listas de várias linhas o tempo todo; enviar é só pelo botão (ou Cmd/Ctrl+Enter em teclado físico) | ✅ |
| D60 | **Sugestões são priorizadas e limitadas.** Ordem: fusão de status → prazo → pagamento incompleto → prestador → decisão → classificar → checklist. Máximo de 3 por superfície: com dados reais a engine detecta 10+ e virava ruído | ✅ |
| D61 | **Nada some por não aceitar sugestão:** a aba de pendências mostra as listas recebidas mesmo antes de virarem checklist (com botão "virar checklist" no próprio card), além de uma seção "com prazo" com eventos e itens datados | ✅ |
| D62 | **Registros são editáveis de qualquer lente**, não só da conversa — o dash abre o mesmo bottom sheet ao tocar num pagamento (reforça D46) | ✅ |
| D63 | **Classificador reescrito a partir do dado real** (ver D64): decisão se declara na primeira linha ("REJUNTES"), dinheiro sem verbo de pagamento é orçamento/cotação (e "$" sem "R" conta, é como ela escreve), linha que começa com quantidade é material, tarefa curta ("Requadros portas") entra como pendência, e texto longo corrido é comunicação — este último precisa ser testado antes das heurísticas de material, senão um "80 cm" no meio do parágrafo transforma reclamação em lista | ✅ |
| D64 | **`scripts/simular-uso.ts`**: simulação com amostra real do export de WhatsApp, usando a mesma lógica do app. Serve como checagem de regressão do classificador — foi ela que revelou os erros corrigidos em D63 | ✅ |
| D58 | **Mobile-first é premissa e critério de validação, não uma característica.** O app é pensado e construído como app de celular; rodar no navegador desktop é bônus. Toda tela precisa ser **validada em viewport de celular** antes de ser considerada pronta, nunca só em desktop. Regras derivadas: nenhuma ação pode depender de `hover` para aparecer (quebra no toque — já causou o bug do "editar" invisível), alvos de toque generosos, e instalável na tela inicial (PWA) para abrir sem cara de navegador | ✅ |
