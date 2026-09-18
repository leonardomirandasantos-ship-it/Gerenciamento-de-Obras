# 04 — Telas da V1 (specs para implementação)

> 15 telas desenhadas. Cada uma: objetivo, JTBD/fluxo, estrutura, estados,
> interações, anti-goals. Cores/tipos referenciam `05_DESIGN_SYSTEM.md`.
>
> **Padrão de navegação (D45):** dentro de uma obra, as lentes são **abas no
> topo**: `Resumo · Conversa · Pendências · Documentação · Decisões`.
>
> **Atualização (D94):** Resumo e Dash foram fundidos. A "Tela 12 — Dash da obra"
> descrita abaixo é hoje a aba **Resumo**; não existe mais tela de resumo separada.
> **NÃO existe navbar inferior global.** Na Conversa, a barra inferior é o
> **input do chat** (texto + anexar + voz + enviar).
>
> **Editar qualquer evento (D46):** abre o **bottom sheet "Editar registro"**
> (componente único), nunca uma tela cheia.

---

## Índice de telas
1. Login
2. Home (lista de obras)
3. Nova obra
4. Conversa da obra ⭐
5. Empty state / primeiro uso
6. Checklists & pendências
7. Documentação (diário) — galeria
8. Foto em tela cheia
9. Comprovante PIX (estado na conversa)
10. Editar registro (bottom sheet)
11. Decisões da obra
12. Resumo da obra (visão geral; era "Dash")
13. Prestador (deep-dive financeiro)
14. Orçamentos
15. Configurações da obra + Fases

---

## Tela 1 — Login
**Objetivo:** entrar no app. Público; cadastro efetivo só via link enviado por fora.
**Estrutura:** logo (mascote + wordmark) centralizado; tagline "O jeito mais
simples de organizar sua obra"; campo E-mail; campo Senha (com olho); link
"Esqueci minha senha"; botão primário **Entrar** (`--primary`); divisor "ou";
botão outline **Entrar com Google** (com ícone G); rodapé "Recebeu um convite?
Entrar com link".
**Estados:** erro de credencial (mensagem inline); loading no botão.
**Anti-goals:** cadastro longo; verificação por telefone/SMS (fora da V1).

---

## Tela 2 — Home (lista de obras)
**Objetivo:** índice de obras; escolher ou criar. NÃO captura nada.
**Estrutura:** header "Minhas obras" + busca; lista de **cartões de obra** (foto,
nome, chip de fase atual, última atividade, contadores discretos ex.: "3
pendências", "5 a comprar"); **FAB "+"** (`--primary`) para criar obra.
**Estados:** vazio (ilustração + "Crie sua primeira obra e comece a jogar tudo
aqui"); loading (skeleton); busca sem resultado.
**Interações:** tocar cartão → Conversa da obra; segurar → arquivar/renomear.
**Anti-goals:** cadastro complexo; navbar inferior.

---

## Tela 3 — Nova obra
**Objetivo:** criar obra no espírito "criar grupo de WhatsApp". (D34, D47)
**Estrutura:** header "Nova obra" com X (fechar); **foto da obra** (círculo com
câmera, "Adicionar foto da obra"); campo **Nome da obra** (ex.: "Casa Ecologie");
campo **Cliente (opcional)**; campo **Localização/cidade (opcional)** → alimenta
o subtítulo do header da obra; dois campos de data lado a lado **Início** e
**Previsão de término** (opcionais); **Detalhes (opcional)** (textarea: endereço,
observações); botão primário **Criar obra**.
**Estados:** validação só do nome (mínimo). Demais opcionais.
**Anti-goals:** formulário longo; campos obrigatórios além do nome.

---

## Tela 4 — Conversa da obra ⭐ (superfície principal)
**Objetivo:** capturar com 0 fricção e ver eventos organizados. (JC-1, Fluxo 1/2)
**Estrutura:**
- Header: foto + nome da obra + **localização** (subtítulo); ícones busca, dash
  (atalho), menu "3 pontos".
- **Abas no topo** (D45): Resumo · Conversa (ativa) · Pendências · Documentação ·
  Decisões.
- (Opcional) faixa fixada "Fase atual: Estrutura" com seta para trocar.
- **Feed cronológico** de balões de evento (ordem enviada), cada um com **chip de
  tipo** (material/foto/lembrete/decisão/pagamento) e selo "não classificado"
  quando aplicável; fotos em lote agrupadas; data/hora.
- **Cartão de sugestão** inline (Fluxo 2), discreto, quando há loop aberto.
- **Input inferior**: campo texto + anexar + **voz** + enviar. Sempre acessível.
**Estados:** vazio (ver Tela 5); enviando ("recebido" imediato + "classificando…"
some sozinho); não classificado (selo cinza editável); sugestão (cartão
`--primary-soft`).
**Interações:** enviar = aparece na hora; tocar chip de tipo → reclassificar;
segurar balão → **bottom sheet Editar** (editar/reclassificar/excluir; seleção
múltipla p/ excluir em lote); tocar cartão de sugestão (1 toque) → aplica.
**Anti-goals:** pop-up de categoria; legenda obrigatória; gate antes do
"recebido"; empilhar sugestões; navbar inferior sob o input.

---

## Tela 5 — Empty state / primeiro uso
**Objetivo:** primeira impressão acolhedora na conversa vazia.
**Estrutura:** mascote acenando (ilustração); headline "Comece jogando tudo
aqui"; subtítulo "Mande uma foto, uma lista de material ou um recado. A gente
organiza pra você."; chips de dica (📷 Foto · 📝 Lista · 🎙️ Áudio); seta
apontando para o input do chat (presente embaixo).
**Anti-goals:** tutorial longo; múltiplos passos de onboarding.

---

## Tela 6 — Checklists & pendências
**Objetivo:** ver/atualizar listas de material e pendências (checklist vivo).
**JTBD/fluxo:** JC-2 (parte lista) + Fluxo 2 casos A e B.
**Estrutura:** abas superiores (na aba "Pendências"); lista de **checklists**
(cada um nasceu de uma lista no chat), com cabeçalho "da conversa de [data]" +
progresso (ex.: 4/7) + barra; itens com caixa (**falta/ok**), texto, nota
opcional, chip de data quando houver; botão "atualizar status" (quando detecta
re-envio).
**Estados:** vazio ("Suas listas viram checklists aqui."); concluído (recolhe/
arquiva).
**Interações:** tocar item → alterna falta/ok; adicionar nota (1 toque); fundir
com re-envio (via sugestão) preservando histórico.
**Anti-goals:** campos obrigatórios por item; forçar data.

---

## Tela 7 — Documentação (diário) — galeria
**Objetivo:** achar registro visual por **fase e data**; diário de obra. (JC-6)
**Duas metades (D148):** toggle **Fotos · Arquivos** no topo, com contagem.
"Fotos" é a galeria descrita abaixo. "Arquivos" é a antiga Tela 14: orçamentos,
contratos, projetos, notas (tudo o que não é pagamento). Endereço
`?ver=arquivos&filtro=orcamentos|outros`.
**Estrutura:** header + busca; **filtros por fase** (pills: Todas · Estrutura ·
Hidráulica · Elétrica · Acabamento + fases custom); fotos **agrupadas por fase**
(e/ou data) com contador; cada foto pode exibir **legenda** (opcional) e chip de
fase.
**Estados:** vazio ("As fotos que você mandar aparecem organizadas aqui.").
**Interações:** tocar foto → Tela 8 (tela cheia); selecionar várias → exportar/
compartilhar.
**Anti-goals:** exigir tag/álbum manual; pedir legenda.

---

## Tela 8 — Foto em tela cheia
**Objetivo:** ver a foto e sua evidência; editar legenda/fase. (JC-4, D31/D32)
**Estrutura:** foto em fundo escuro ocupando a tela; barra superior (voltar/X,
data/hora, menu); painel inferior com **legenda editável** (com lápis), **chip de
fase** (com "editar fase"), link "ver no chat"; **tira de miniaturas** das fotos
da fase (+N); ações **Compartilhar · Baixar · Editar** (Editar abre bottom sheet).
**Interações:** swipe entre fotos; editar legenda inline; editar fase (dropdown/
bottom sheet).
**Anti-goals:** obrigar legenda.

---

## Tela 9 — Comprovante PIX (estado na conversa)
**Objetivo:** mostrar o "Host de pagamentos" em ação. (JTBD-5, Fluxo 2 caso E)
**Estrutura:** na Conversa, um balão de **comprovante encaminhado** (selo
"Encaminhada") mostrando valor, favorecido, chave (mascarada), data + chip
**pagamento**; logo abaixo, **cartão de sugestão**: "Reconheci um pagamento para
[Nome]. Cadastrar como prestador ou fornecedor?" com botões **Prestador** /
**Fornecedor** + "agora não" + "por quê?".
**Regra:** mesmo em "agora não", o pagamento fica registrado e **agrupado pelo
favorecido** (o sumário funciona sozinho).
**Anti-goals:** bloquear até categorizar; obrigar cadastro do prestador.

---

## Tela 10 — Editar registro (BOTTOM SHEET — componente reutilizável) (D46)
**Objetivo:** editar/reclassificar/excluir qualquer evento, de qualquer lugar.
**Estrutura:** sheet com topo arredondado + handle; título "Editar registro";
preview do evento (texto/mídia + data/hora); linha **Tipo** (chips selecionáveis:
Material · Lembrete · Decisão · Foto · Pagamento — com o atual destacado); **Fase**
(dropdown, "etapa da obra"); **Data** (opcional); botão primário **Salvar**; link
vermelho **Excluir registro** (com lixeira).
**Comportamento:** aparece sobre a tela atual (conversa/lente esmaecida). Toda
edição é reversível.
**Reuso:** acionado por "segurar balão" na conversa, botão "Editar" na foto,
ação de editar em qualquer lente.

---

## Tela 11 — Decisões da obra
**Objetivo:** memória pesquisável de especificações (cor, medida, modelo). (JC-7)
**Estrutura:** header da obra (nome + localização) + **abas no topo** (Decisões
ativa); busca "Buscar por ambiente ou item"; **filtros por ambiente** (Todas ·
Sala · Banheiro · Quartos · Cozinha); lista de **cards de decisão** com thumbnail,
chip "decisão", título (ex.: "Piso social"), valor (ex.: "Porcelanato bege
90x90"), chip de ambiente, data, link "ver no chat".
**Estados:** vazio ("Decisões de acabamento fixadas aqui viram consulta rápida.").
**Interações:** fixar decisão (via sugestão) → entra aqui; tocar → detalhe/origem.
**Anti-goals:** formulário de decisão; taxonomia rígida; navbar inferior.

---

## Tela 12 — Resumo da obra (era "Dash" — D94)
**Objetivo:** lente que só LÊ os eventos; financeiro protagonista + logística. (D6, D13)
**Estrutura (cards, scroll vertical):**
- **Gasto total da obra** (valor grande) + **rosca por fase** com legenda e valores.
- **Gasto por prestador/fornecedor** (linhas com avatar, barra, valor).
- **A comprar** (contagem, `--pending`).
- **Fotos recentes** (miniaturas → Documentação).
- (opcional) **Atividade recente** (ex.: "Pagamento para José Costa · R$ 1.250 via Pix").
- (opcional) **Calendário da obra** (dias com evento datado).
**Interações:** tocar bloco → lente completa; tocar prestador → Tela 13.
**Anti-goals:** pedir cadastro; virar planilha; captura.

---

## Tela 13 — Prestador (deep-dive financeiro)
**Objetivo:** histórico e total por pessoa; evidência sob contestação. (JC-4)
**Estrutura:** header "[Nome] · Prestador/Fornecedor"; card de topo (avatar,
total pago, nº de pagamentos, "desde [data]"); **filtro por fase**; **Histórico de
pagamentos** (cards com miniatura do comprovante, valor, descrição, chip de fase,
data, link "comprovante"); rodapé explicativo "Pagamentos agrupados pelo nome do
favorecido. Edite ou organize quando quiser."
**Interações:** tocar comprovante → visualizar; editar (bottom sheet).
**Anti-goals:** exigir categorização para funcionar.

---

## Tela 14 — Orçamentos → metade "Arquivos" da Documentação (D148)
*Não é mais tela própria: `/orcamentos` redireciona para a Documentação. Filtros
Todos · Orçamentos · Outros; cada orçamento mostra fornecedor, total, itens e o
estado "fechado" ("fechei com esse", que não cria gasto).*
**Objetivo:** arquivar e buscar orçamentos por fornecedor ou produto. (E8, D29)
**Estrutura:** header + busca "Buscar por fornecedor ou produto"; toggle **Por
produto / Por fornecedor**; cards de orçamento (ícone PDF, "Produto — Fornecedor",
valor, chip de categoria, data, anexo). *(Comparação de orçamentos = V2.)*
**Estados:** vazio ("Mande orçamentos aqui para arquivar e achar depois.").
**Anti-goals:** comparação/tabela na V1; formulário de cadastro de orçamento.

---

## Tela 15 — Configurações da obra + Fases
**Objetivo:** editar dados da obra e **gerenciar fases**. (D32, D47)
**Estrutura:** header "Configurações da obra"; bloco topo (foto, nome editável,
**localização** editável); card **Período** (Início / Previsão); seção **Fases da
obra** ("Arraste para reordenar") — lista das 5 fixas (Fundação · Estrutura ·
Hidráulica · Elétrica · Acabamento) com handle de arrastar, cor, editar/remover;
botão tracejado **+ Adicionar fase**; rodapé link vermelho **Arquivar obra**.
**Interações:** reordenar (drag), renomear fase, adicionar/remover fase, editar
cor.
**Anti-goals:** apagar dados sem confirmação; fases obrigatórias fixas (devem ser
editáveis).

---

## Consistência a garantir no build (importante)
- **Todas as telas dentro de uma obra** exibem as **abas no topo** (D45). As
  telas 6, 7, 12, 13 foram prototipadas com header simples, mas **no código devem
  ter as abas no topo** para consistência.
- **Header da obra** sempre com nome + **localização** (subtítulo) quando existir (D47).
- **Editar** em qualquer lugar → **mesmo bottom sheet** (Tela 10 / D46).
- **Chips de tipo** seguem cores semânticas do design system (05).
- **FAB "+"** e ações primárias sempre em `--primary`.
