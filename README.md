# Zap da Obra

Um app que recebe conteúdo com a naturalidade de um grupo de WhatsApp (texto,
foto, voz — zero fricção) e por trás organiza tudo em gestão financeira e
documentação de obra: "o arquivo master da obra".

A especificação completa do produto (visão, JTBDs, fluxos, decisões
normativas, telas, design system, marca, arquitetura técnica e checklist de
build) está em [`specs/`](./specs/00_INDEX.md) — comece pelo `00_INDEX.md`.
Esses arquivos são a fonte da verdade do produto: toda nova decisão que
tomarmos deve ser refletida neles, não só no código, para que o projeto
continue portátil entre ferramentas/IAs.

Status: specs V1 fechadas, começando a implementação (ver
`specs/08_BUILD_CHECKLIST.md`).

## Rodando localmente

_(em atualização conforme a stack da V1 é implementada — ver commits mais
recentes ou perguntar no chat)_

## Deploy

Pensado pra rodar direto do GitHub: conectar este repositório na
[Vercel](https://vercel.com) e cada push na `main` gera uma nova versão.
