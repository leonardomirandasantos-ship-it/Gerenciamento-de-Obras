-- =========================================================
-- 002 — tipo de evento E9_audio
-- =========================================================
-- O áudio ganha tipo próprio em vez de virar "não classificado" ou "foto":
--   * "não classificado" faria o app pedir para classificar um áudio que ele
--     JÁ entendeu — os registros derivados são a classificação;
--   * "foto" (E4) o mandaria para a lente de Documentação, onde não é.
--
-- O áudio é o registro original (D3) e os eventos que saíram dele apontam de
-- volta por `payload.sourceAudioEventId`.
--
-- Rodar no Supabase: SQL Editor > New query > colar > Run.

alter table eventos drop constraint if exists eventos_kind_check;

alter table eventos add constraint eventos_kind_check check (kind in (
  'E1_lista', 'E2_checklist', 'E3_decisao', 'E4_documentacao',
  'E5_documento', 'E6_comunicacao', 'E7_pagamento', 'E8_orcamento',
  'E9_audio',
  'unclassified'
));

-- Confere:
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'eventos_kind_check';
