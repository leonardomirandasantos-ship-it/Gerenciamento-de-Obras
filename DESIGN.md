# Gerenciamento de Obras — Design Doc

> Documento vivo. Vamos evoluindo isso juntos conforme o produto avança.

## 1. Visão do produto

Um app para engenheiros e arquitetos que gerenciam obras registrarem o dia a dia
**tão fácil quanto mandar mensagem no WhatsApp**, mas que por trás organiza tudo
isso em gestão financeira estruturada: quem pagou o quê, quem precisa reembolsar
quem, o que já foi pago e o que ainda está pendente.

A dor de origem: a persona entrevistada já faz isso hoje, só que num grupo de
WhatsApp por obra — funciona como registro, mas não vira gestão. Ninguém
consolida, ninguém sabe rápido "quanto eu já gastei nessa obra" ou "quem eu
ainda preciso pagar".

## 2. Persona principal

**Engenheiro(a) civil responsável por uma ou mais obras**, contratado(a) por um
cliente (dono da obra) para tocar a construção. No dia a dia:
- Compra material e paga com o próprio dinheiro → precisa ser reembolsado pelo
  dono da obra/cliente.
- Paga diretamente um funcionário/pedreiro do próprio time → é uma saída de
  caixa, não gera reembolso, mas precisa ficar registrada.
- Quer só "jogar" essas informações no app enquanto está no canteiro, sem
  fricção, e ver depois tudo organizado.

No MVP, **quem usa o app ativamente é sempre o engenheiro**. Funcionários,
donos de obra e outros papéis são visualizadores/aprovadores futuros, não
autores de lançamento.

## 3. Conceitos-chave

| Conceito | Definição |
|---|---|
| **Empresa** | Conta "guarda-chuva". No MVP existe só uma. No futuro, um usuário pode pertencer a várias empresas. |
| **Obra** | Um projeto/canteiro. Cada obra tem sua própria "conversa" (feed), igual um grupo de WhatsApp dedicado. |
| **Usuário** | Pessoa com login. Pertence a uma empresa, participa de uma ou mais obras. |
| **Papel (role)** | `master` (cria obras, convida usuários, vê tudo) e `membro` (participa das obras em que foi incluído e lança registros, mas não cria obra nova). Papéis mais granulares (cliente/dono da obra só visualizando) ficam para depois. |
| **Lançamento** | Cada mensagem/registro solto na conversa da obra: um gasto, um pagamento feito, ou só uma atualização de andamento. |
| **Pendência** | Lançamento do tipo "gasto a reembolsar" que ainda não foi quitado. |
| **Comprovante** | Anexo opcional (foto de nota, print de PIX) ligado a um lançamento — nunca obrigatório. |

## 4. Como funciona (conceito central)

- **Cada obra é uma conversa própria** (como um grupo de WhatsApp). Isso já
  resolve "de qual obra é esse gasto" sem precisar perguntar — o contexto é a
  própria conversa em que a pessoa está.
- Dentro da conversa da obra, o engenheiro escreve **livre**, do jeito que já
  escreveria no WhatsApp. Ex: *"gastei 350 no cimento, preciso do reembolso"*
  ou *"paguei 200 pro Zé hoje"*.
- O sistema tenta entender sozinho: valor, tipo de lançamento e pessoa
  envolvida. Quando consegue, confirma de forma leve (ex: um card resumindo
  "Gasto de R$350 — cimento — aguardando reembolso do cliente. Confirma?").
- **Quando não consegue entender**, faz perguntas objetivas com opções prontas
  (botões), nunca formulário longo. Ex: "Esse valor é um gasto seu que precisa
  de reembolso, ou um pagamento que você fez pra alguém?"
- Na aba de gestão, tudo isso aparece consolidado — por obra, ou (no futuro)
  todas as obras juntas.
- Marcar um lançamento como "reembolsado" ou "pago" é sempre **autodeclarado**
  pela própria pessoa, sem aprovação de terceiros. Isso não trava o registro:
  a pessoa anota o gasto livremente e, quando quiser, vai até a lista de
  pendências e marca como resolvido — igual quem risca um item numa lista.

### Cenários de lançamento cobertos no MVP

1. **Reembolso a receber** — engenheiro paga algo do próprio bolso para a obra
   do cliente (material, serviço) → fica pendente até o dono da obra
   reembolsar.
2. **Pagamento feito a alguém do time** — engenheiro paga diretamente um
   funcionário/pedreiro → registrado como saída, sem pendência de reembolso,
   mas entra no histórico "quanto já paguei pra cada pessoa".

(Fluxo em que o próprio funcionário registra um gasto e pede reembolso ao
engenheiro fica para uma fase futura, quando outros papéis passarem a lançar
diretamente.)

## 5. Escopo do MVP

**Dentro do MVP:**
- Login real (Supabase Auth), mas **acesso só por convite direto do master** —
  sem tela pública de cadastro nem fluxo de aprovação dentro do app. O master
  adiciona as 1–2 contas de teste diretamente (ex: convite por e-mail via
  Supabase), todas na mesma empresa.
- Só o `master` cria obras; membros participam e lançam nas obras em que
  foram incluídos.
- Lançar mensagens livres na conversa da obra (texto).
- Interpretação assistida (parsing simples + perguntas de fallback com opções).
- Anexo de comprovante opcional (imagem), sem obrigatoriedade nenhuma.
- Marcar pendência como resolvida é autodeclarado, feito quando a pessoa
  quiser, sem travar o uso do dia a dia.
- Aba de gestão por obra com:
  - Lista de pendências (gastos aguardando reembolso).
  - Histórico de pagamentos feitos, por pessoa.
  - Resumo financeiro simples (total gasto / total pendente / total pago).
- Deploy simples direto do GitHub (repo pode ficar público até refinarmos),
  pra testar o modelo com pouco atrito.

**Fora do MVP (fica no roadmap):**
- Múltiplas empresas por usuário.
- Papel "cliente/dono da obra" com acesso de visualização.
- Funcionário lançando diretamente (hoje só o engenheiro lança).
- Fotos de andamento de obra (só comprovante financeiro entra agora).
- Consolidação entre várias obras na mesma tela.
- Parsing por IA mais robusto / voz.
- Notificações push.
- Orçado x Realizado (comparar orçamento planejado vs. gasto real).

## 6. Modelo de dados (rascunho)

```
empresas
  id, nome, criado_em

usuarios
  id, empresa_id, auth_id (Supabase Auth), nome, email, papel (master|membro)

obras
  id, empresa_id, nome, criado_por, criado_em, status (ativa|encerrada)

obra_membros
  obra_id, usuario_id

lancamentos
  id, obra_id, autor_id, tipo (gasto_reembolsar|pagamento_feito|atualizacao)
  valor, descricao, pessoa_relacionada (texto livre, ex: "Zé pedreiro")
  status (pendente|reembolsado|pago), criado_em

anexos
  id, lancamento_id, url_arquivo, tipo (comprovante|foto), criado_em
```

## 7. Stack técnica proposta

Pensando em "rodar 100% a partir do Git" com deploy simples e barato pra
validar o modelo:

- **Next.js + TypeScript** — front-end e API no mesmo projeto, fácil de
  hospedar e evoluir para responsivo/PWA depois.
- **Supabase** (Postgres gerenciado + Auth + Storage) — resolve login,
  banco relacional e upload de comprovantes sem precisar montar infra própria.
- **Deploy via Vercel conectado ao repositório GitHub** — todo push na `main`
  já gera uma versão nova pra testar. Sem servidor pra gerenciar.
- Parsing de texto livre no MVP: heurística simples (palavras-chave + regex
  para valores) com fallback de perguntas guiadas; evoluir para um modelo de
  linguagem (ex: API da Anthropic) numa fase 2, quando o volume de casos
  exigir mais robustez.

## 8. Decisões já fechadas (rodada 2)

- Só o `master` cria obras/conversas; a experiência deve ser tão intuitiva e
  simples quanto um WhatsApp "melhorado".
- Todo status (reembolsado/pago) é autodeclarado — sem aprovação de terceiro.
- Nada de comprovante obrigatório no MVP: é pra ficar livre, quase uma
  anotação organizada, não um formulário.
- Sem cadastro público: acesso por convite manual do master via Supabase,
  testando com 1–2 usuários na mesma empresa antes de abrir mais.

## 9. Perguntas em aberto

- Quando validarmos com mais gente, o cadastro continua manual (convite) ou
  vale a pena abrir um fluxo de solicitação + aprovação dentro do app?
- Faz sentido notificar (e-mail/push) quando alguém marca algo como pago, ou
  fica só visível na lista quando a pessoa entrar?
