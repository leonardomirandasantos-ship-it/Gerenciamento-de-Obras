# 📖 README — Zap da Obra (como ler esta documentação)

> **Você é uma IA de código prestes a construir o app "Zap da Obra".**
> Este pacote contém toda a especificação de produto, design e técnica.
> **Leia os arquivos na ordem abaixo, do começo ao fim, antes de escrever código.**
> A ordem foi pensada para você absorver primeiro o *porquê*, depois o *o quê*,
> e por fim o *como* — sem ambiguidade e sem perder nenhuma decisão.

---

## ⚠️ Regras de interpretação (leia antes de tudo)

1. **`03_DECISOES.md` é NORMATIVO.** Em qualquer conflito ou dúvida de
   implementação, o Decision Log (D1–D47) tem prioridade sobre qualquer
   inferência sua.
2. **Não reintroduza o que está fora de escopo.** O que foi marcado como V2 (ex.:
   reembolso, papéis/permissões, Dash geral, offline-first) **não deve ser
   construído na V1**, mesmo que pareça natural.
3. **Os princípios invioláveis do `00_INDEX.md` valem para toda decisão de UI/UX**
   (captura = 0 fricção; inteligência = sugestão de 1 toque; cada obra é um
   "grupo" com abas no topo; nada é descartado).
4. **Consistência visual é obrigatória:** use sempre os tokens do
   `05_DESIGN_SYSTEM.md` (nunca cor hex solta), o bottom sheet único para editar
   (D46) e as abas no topo em todas as telas de obra (D45).
5. **Segurança:** o repositório é público → nunca versione segredos/chaves
   (ver `07_ARQUITETURA_TECNICA.md`).

---

## 🧭 Ordem de leitura recomendada

### 1º — `00_INDEX.md`  *(contexto geral)*
Comece aqui. Resumo executivo, o que é o produto, os princípios invioláveis e o
glossário. Te dá o mapa mental de tudo. **Não pule.**

### 2º — `01_PRODUTO_visao_jtbd.md`  *(o "porquê")*
Entenda o usuário, a dor, a **regra de ouro** ("loops que a vida real deixa em
aberto"), os JTBDs e as jornadas críticas. Aqui você aprende *por que* cada
funcionalidade existe — essencial para tomar boas microdecisões depois.

### 3º — `02_FLUXOS.md`  *(a mecânica central)*
Os dois fluxos que governam o app: captura + classificação (Fluxo 1) e a engine
de sugestão de 1 toque (Fluxo 2). É o coração comportamental do produto. Leia
antes das telas, porque as telas materializam estes fluxos.

### 4º — `03_DECISOES.md`  *(as regras — NORMATIVO)*
O Decision Log completo (D1–D47) e o escopo V1 vs V2. **Este é o arquivo mais
importante para não errar.** Volte a ele sempre que tiver dúvida.

### 5º — `04_TELAS.md`  *(o "o quê" — as 15 telas)*
Especificação de cada tela: estrutura, estados, interações, anti-goals. Já
referencia decisões e tokens. Leia com o `03` e o `05` à mão.

### 6º — `05_DESIGN_SYSTEM.md`  *(a aparência)*
Tokens de cor, tipografia, componentes, espaçamento, cores de fase. **Implemente
como tema/variáveis antes de construir telas.**

### 7º — `06_BRANDING.md`  *(a marca)*
Logo, mascote, versões, tom de voz e regras de uso. Necessário para login, splash,
empty states e ícone do app.

### 8º — `07_ARQUITETURA_TECNICA.md`  *(o "como")*
Modelo de dados, estratégia de classificação em camadas (regras → LLM no
navegador → API via proxy), stack sugerida e segurança. Sua planta de engenharia.

### 9º — `08_BUILD_CHECKLIST.md`  *(a ordem de execução)*
A sequência de desenvolvimento em blocos (0 a 10) com critérios de aceite. **Siga
esta ordem para construir** — o miolo (captura + classificação) antes das lentes.

---

## 🗂️ Resumo de dependências entre arquivos

```
00_INDEX  ──▶  01_PRODUTO  ──▶  02_FLUXOS  ──▶  03_DECISOES (normativo)
                                                      │
                        ┌─────────────────────────────┤
                        ▼                             ▼
                   04_TELAS  ◀── referencia ──  05_DESIGN_SYSTEM
                        │                             ▲
                        ▼                             │
                   06_BRANDING                   07_ARQUITETURA
                        └──────────────┬──────────────┘
                                       ▼
                              08_BUILD_CHECKLIST (execução)
```

---

## ✅ Antes de começar a codar, confirme que você entendeu:

- [ ] A **captura é sempre 0 fricção** — "recebido" na hora, sem gate.
- [ ] A **inteligência nunca atrapalha a captura**; ela sugere depois, em 1 toque.
- [ ] **Cada obra é um "grupo"** com navegação por **abas no topo** (sem navbar global).
- [ ] **Editar qualquer evento** abre o **mesmo bottom sheet** (componente único).
- [ ] O **financeiro funciona sozinho** (agrupa por favorecido do PIX) — cadastro é opcional.
- [ ] **Nada fora do escopo V1** (reembolso, papéis, Dash geral, offline → V2).
- [ ] **Sem segredos no git público.**

Quando todos os itens acima fizerem sentido, siga o `08_BUILD_CHECKLIST.md` e comece pelo **Bloco 0**.

---

*Boa construção. O objetivo da V1 é provar o conceito: um "grupo de WhatsApp" que
vira, sozinho, o arquivo master da obra.* 🏗️
