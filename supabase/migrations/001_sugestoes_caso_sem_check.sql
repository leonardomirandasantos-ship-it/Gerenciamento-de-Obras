-- =========================================================
-- 001 — remove o check constraint antigo de sugestoes.caso
-- =========================================================
-- O banco em produção ainda carrega `sugestoes_caso_check` de uma versão
-- anterior, que só conhecia os casos A–G. Como H_pagamento_incompleto nasceu
-- depois, todo INSERT desse caso era REJEITADO — e, como o código ignorava o
-- erro, "agora não" não guardava nada e a sugestão voltava para sempre.
--
-- O schema.sql já declara a coluna sem check de propósito: a engine ganha
-- casos novos com frequência e o valor é validado em src/lib/suggestions.ts.
--
-- Rodar no Supabase: SQL Editor > New query > colar > Run.

alter table sugestoes drop constraint if exists sugestoes_caso_check;

-- Confere que sobrou só o check de `estado`:
--   select conname from pg_constraint where conrelid = 'sugestoes'::regclass;
