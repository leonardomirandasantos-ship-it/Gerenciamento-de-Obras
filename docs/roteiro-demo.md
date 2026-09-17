# Roteiro de demonstração — Zap da Obra

Conta já populada com material real de obra. A sequência abaixo passa por
todas as funcionalidades sem precisar digitar nada; onde há **[faça]**, é uma
ação ao vivo que vale mostrar funcionando.

Para repopular do zero (apaga tudo antes):

```
PASTA_ANEXOS=/caminho/do/export npx tsx scripts/semear-demo.ts <email> <senha>
```

---

## 1. Minhas obras

- **Casa Ecologie**, com foto, cliente e cidade — e o chip da fase atual.
- **[faça]** abra a seção **Arquivadas** → Reforma Jardins, com "Reabrir" no
  próprio cartão. Fecha a objeção "e quando a obra termina?".
- A engrenagem leva aos dados da obra.

## 2. Conversa — a ideia central

> "Ela não preenche formulário. Ela manda no grupo como já manda hoje."

- Role a conversa: são **3 meses de obra**, do baldrame ao contrapiso.
- Mostre os chips: **pendência**, **gasto**, **decisão**, **foto**, **orçamento**,
  **comunicação**. Nada foi categorizado à mão.
- **[faça]** mande `paguei 480 pro Valdir` → aparece na hora como **gasto**, com
  valor e favorecido extraídos, e já ligado ao Valdir que existe.
- **[faça]** mande `comprar rejunte e argamassa até sexta` → vira **pendência**
  com o prazo já marcado, sem perguntar nada.
- **[faça]** toque no 📎, escolha uma foto, escreva `comprovante do Nilson 350`
  e mande → entra como **gasto**, não como foto de obra.

## 3. Pendências

- A barra do topo: **15 listas · 45 em aberto** e **Pra organizar · 8**.
- Primeira lista com prazo **vencido** (chip vermelho), segunda **no prazo**
  (azul). A ordenação é por urgência.
- **[faça]** marque itens do checklist "Serviços do subsolo" (3/6) — a barra de
  progresso anda, o card fica no lugar.
- **[faça]** toque em **editar** numa lista: renomear item, `+ item`, prazo.
- **[faça]** arraste um card para o lado → duas etapas antes de tirar da lista.
- **[faça]** toque em **Pra organizar** na barra → vai direto para as sugestões.

## 4. Pra organizar — a inteligência, em 1 toque

Tem um caso de cada, e todos citam a mensagem de origem:

| Sugestão | O que demonstra |
|---|---|
| Atualizar status de "Serviços do subsolo" | reconheceu lista reenviada |
| Marcar 28/09 como prazo disso? | data citada sem intenção |
| Quanto foi e pra quem? | gasto sem valor (o vergalhão) |
| Cadastrar Serralheiro Nilson como…? | favorecido sem tipo |
| Fixar "Bancada da cozinha"…? | decisão ainda não fixada |
| O que é esse registro? | não classificado ("Portas Pormax") |

**[faça]** aceite uma e mostre "agora não" em outra — ela sai e não volta.

## 5. Resumo

- **R$ 8.240** com a rosca por fase (Estrutura, Hidráulica, Elétrica).
- **Gasto por prestador/fornecedor**: 6 pessoas. **[faça]** use o filtro
  **Prestadores / Fornecedores** — dois estão sem tipo de propósito.
- **[faça]** toque no **Valdir** → histórico com o comprovante em miniatura.
  Ali: **editar** a pessoa (nome e tipo valem para todo o histórico) e
  **editar** um pagamento.
- Cartões de **A comprar** e **Orçamentos**, fotos recentes e últimos registros.

## 6. Documentação

- 8 fotos, filtro por fase: Fundação (2), Estrutura (3), Hidráulica (2),
  Acabamento (1).
- **Ponto importante:** o comprovante do Valdir **não está aqui**. Documentação
  é o álbum da obra; comprovante é financeiro e vive no histórico da pessoa.
- **[faça]** abra uma foto → legenda e troca de fase em um toque.

## 7. Decisões

- 6 decisões com filtro por ambiente. **[faça]** filtre por **Banheiros** →
  aparece a das bancadas, **com a miniatura do desenho**.
- **Canil** no fim da barra de filtro: ambiente que não existia e foi criado
  pelo uso.
- **[faça]** no "+", crie uma decisão e use **+ outro** para inventar um
  ambiente novo (ex.: Adega) — ele passa a valer como filtro.

---

## Se perguntarem

- **"Precisa cadastrar fornecedor?"** Não. O nome vem do texto e o resumo
  agrupa sozinho; categorizar é opcional e só enriquece.
- **"E se ele classificar errado?"** Todo registro é editável — texto, tipo,
  fase, valor, favorecido — do mesmo bottom sheet, de qualquer tela.
- **"Onde fica o histórico?"** Na conversa, sempre. Nenhuma tela cria registro
  próprio: até o "+" das abas escreve na conversa.
- **"Funciona no celular?"** Foi feito para celular; navegador é o bônus.
  Instalável na tela inicial.

## Ainda não existe

Áudio (o botão avisa que está em construção) e leitura automática de
comprovante por imagem.
