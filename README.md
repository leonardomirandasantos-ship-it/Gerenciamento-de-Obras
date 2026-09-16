# Gerenciamento de Obras

App para engenheiros e arquitetos registrarem o dia a dia de suas obras (gastos,
pagamentos, reembolsos) de forma tão simples quanto uma conversa no WhatsApp,
com uma gestão financeira organizada por trás.

Veja a visão completa do produto, personas, escopo do MVP e stack proposta em
[DESIGN.md](./DESIGN.md).

Status: primeiro esqueleto do MVP (auth + convite) rodando; falta o feed de
lançamentos por obra.

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e preencha com a URL e a chave
   pública (`anon`/`publishable`) do seu projeto Supabase (Project Settings >
   API no painel do Supabase).

3. No **SQL Editor** do seu projeto Supabase, rode o conteúdo de
   [`supabase/schema.sql`](./supabase/schema.sql) uma vez — ele cria as
   tabelas, as políticas de RLS e as funções de onboarding/convite.

4. (Recomendado) Em Authentication > Sign In / Providers > Email, desative
   "Confirm email". Como o acesso já é controlado pelo nosso próprio sistema
   de convite, exigir confirmação por e-mail é uma fricção a mais sem
   necessidade.

5. Rode o servidor:

   ```bash
   npm run dev
   ```

6. Acesse `http://localhost:3000/onboarding` para criar a primeira empresa
   (você vira `master`). Dali em diante, novos acessos são só por convite,
   gerado dentro do app.

## Deploy

Pensado pra rodar direto do GitHub: conecte este repositório na
[Vercel](https://vercel.com), configure as mesmas variáveis de ambiente do
`.env.local` no painel do projeto, e cada push na `main` já gera uma nova
versão publicada.
