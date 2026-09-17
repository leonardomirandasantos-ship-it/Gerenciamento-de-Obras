# 08 — Build Checklist (ordem sugerida de desenvolvimento)

> Sequência recomendada para construir a V1 sem retrabalho. Cada bloco tem
> critérios de aceite. Priorize o miolo (captura + classificação) antes das lentes.

## Status do build (atualizado conforme avançamos)

| Bloco | Situação |
|---|---|
| 0 — Fundação | ✅ feito (tokens, tipografia, Supabase no lugar do IndexedDB — ver D48) |
| 1 — Navegação | ✅ feito (Home, Nova obra, abas no topo, localização no header) |
| 2 — Conversa + captura | 🟡 feito para texto/foto/vídeo/PDF; **voz pendente** (D56) |
| 3 — Classificação | ✅ RegrasClassifier + chip + "não classificado" (WebLLM/API não usados ainda) |
| 4 — Editar registro | 🟡 bottom sheet completo (tipo, fase, valor/favorecido, excluir); **excluir em lote pendente** (D53) |
| 5 — Engine de sugestão | ✅ casos A, B, C, D, E + anti-irritação |
| 6 — Lentes de logística | ✅ Pendências, Documentação, visor de foto, Decisões, Resumo |
| 7 — Financeiro | 🟡 dash, prestador, orçamentos e agrupamento por favorecido funcionando; **OCR do comprovante pendente** (D55) |
| 8 — Configurações e fases | ✅ feito (reordenar por setas — D50) |
| 9 — Login e acesso | 🟡 e-mail/senha funcionando; **Google exige configurar o provider no Supabase** |
| 10 — Polimento | ⬜ pendente (inclui trocar os placeholders de logo pelos assets de marca) |

---

## Bloco 0 — Fundação
- [ ] Setup do projeto (mobile-first / PWA), deploy grátis (Pages/Vercel/Netlify).
- [ ] Implementar **tokens do design system** (05) como tema/variáveis.
- [ ] Tipografia (Nunito + Inter).
- [ ] Persistência local (IndexedDB/Dexie) com o **modelo de dados** (07).
- [ ] Componentes base: chip de tipo, cartão, FAB, tabs superiores, bottom sheet,
      input de chat.
**Aceite:** tema aplicado; navegação Home↔Obra↔abas funcionando com dados mock.

## Bloco 1 — Estrutura de navegação (D45)
- [ ] **Home** (lista de obras, FAB "+", empty state).
- [ ] **Nova obra** (nome + opcionais incl. **localização** D47).
- [ ] Contêiner de **Obra** com **abas no topo** (Resumo/Conversa/Pendências/
      Documentação/Decisões/Dash) + header com nome + localização.
**Aceite:** criar obra e navegar pelas abas; localização aparece no header.

## Bloco 2 — Conversa + Captura (JC-1, Fluxo 1) — o coração
- [ ] **Conversa** com feed de eventos + **input** (texto, anexar, voz, enviar).
- [ ] "**Recebido**" imediato (nunca espera classificação).
- [ ] **Empty state** (Tela 5).
- [ ] Suporte a foto (lote), texto, PDF, voz (mídia).
**Aceite:** enviar qualquer conteúdo aparece na hora; sem gate; sem navbar sob input.

## Bloco 3 — Classificação em 2º plano (D43/D44)
- [ ] Interface `Classifier` plugável; implementar **RegrasClassifier** primeiro.
- [ ] Atribuir **tipo (E1–E8) + confiança**; estado **"não classificado"**.
- [ ] **Chip de tipo** no evento.
- [ ] (opcional) WebLLM/Transformers.js para texto; deixar API atrás de proxy.
**Aceite:** eventos ganham chip; baixa confiança → "não classificado" visível.

## Bloco 4 — Editar registro (bottom sheet global, D46)
- [ ] **Bottom sheet "Editar registro"** (Tela 10): reclassificar tipo, fase,
      data; **excluir**; seleção múltipla para **excluir em lote** (D17).
- [ ] Acionável por segurar balão (conversa) e por "Editar" em qualquer lente.
**Aceite:** corrigir classificação errada em ≤2 toques; excluir em lote funciona.

## Bloco 5 — Engine de sugestão (Fluxo 2)
- [ ] **Cartão de sugestão** (componente único) + estados (detected→offered→
      accepted/ignored/silenced).
- [ ] Caso **A** (lista→checklist) e **B** (checklist vivo / atualizar status).
- [ ] Caso **D** (salvar decisão), caso **C** (sugerir data — oportunista).
- [ ] **Anti-irritação** (silencia após ignorar 2×; nunca rotina diária).
**Aceite:** mandar lista → sugestão de checklist; re-enviar lista → sugestão de
atualizar status; ignorar não repete de forma chata.

## Bloco 6 — Lentes de logística (só leitura)
- [ ] **Checklists & pendências** (Tela 6): itens falta/ok, nota, progresso.
- [ ] **Documentação/diário** (Tela 7): galeria por **fase**; legenda opcional.
- [ ] **Foto em tela cheia** (Tela 8): legenda/fase editáveis; tira de miniaturas.
- [ ] **Decisões da obra** (Tela 11): busca + filtro por ambiente.
**Aceite:** tudo computado a partir dos eventos; nenhuma lente captura.

## Bloco 7 — Financeiro / Host de pagamentos (JTBD-5, Caso E)
- [ ] Reconhecer **comprovante PIX** (regras/OCR) → evento **E7 Pagamento**.
- [ ] **Cartão de sugestão** "cadastrar prestador/fornecedor" (1 toque) + fallback
      "agora não" (agrupa por favorecido mesmo assim).
- [ ] **Payee** derivado (agrupa por favorecido; total, contagem).
- [ ] **Dash da obra** (Tela 12): gasto total, rosca por fase, gasto por pessoa,
      a comprar, fotos recentes.
- [ ] **Prestador deep-dive** (Tela 13): histórico + comprovantes (JC-4).
- [ ] **Orçamentos** (Tela 14): arquivar/buscar por produto/fornecedor (E8).
**Aceite:** encaminhar comprovante → aparece no Dash e no Prestador **sem** o
usuário cadastrar nada; sumário por fase e por pessoa corretos.

## Bloco 8 — Configurações e Fases (D32/D47)
- [ ] **Configurações da obra** (Tela 15): editar nome/local/foto/período.
- [ ] **Fases**: 5 fixas + adicionar/renomear/remover/**reordenar** (drag).
- [ ] Cores de fase (05 §6) refletem na rosca e nos chips.
**Aceite:** criar fase custom e ver refletir nos filtros/dash.

## Bloco 9 — Login e acesso
- [ ] **Login** (Tela 1): e-mail/senha + **Entrar com Google** + "Entrar com link".
- [ ] Cadastro/aceitar convite: **fora da V1** (link enviado por fora, D35/D36).
**Aceite:** login simples funcionando; sem fluxo de convite no app.

## Bloco 10 — Polimento
- [ ] Empty states de todas as lentes.
- [ ] Consistência: **abas no topo** em TODAS as telas de obra; **mesmo bottom
      sheet** para editar; header sempre com localização quando existir.
- [ ] Instrumentação de métricas (07 §8).
- [ ] Revisão de segurança do git (07 §7).

---

## Critérios de aceite globais da V1 (definition of done)
1. **Zero fricção:** qualquer captura vira "recebido" na hora, sem gate.
2. **Correção trivial:** classificação errada corrigível em ≤2 toques (bottom sheet).
3. **Financeiro automático:** encaminhar comprovante alimenta Dash/Prestador sem
   cadastro manual.
4. **Consistência visual:** tokens do design system, abas no topo, bottom sheet
   único, header com localização.
5. **Nada descartado:** "não classificado" sempre visível e editável.
6. **Sem segredos no repositório público.**

---

## Fora da V1 (não construir agora — ver 03_DECISOES §3)
Reembolso/cobrança · papéis/permissões · Dash geral · comparação de orçamentos ·
cadastro/convite no app · notificações ricas · offline-first · prestação de contas
formal · menu "3 pontos" detalhado.
