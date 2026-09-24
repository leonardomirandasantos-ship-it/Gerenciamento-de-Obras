-- Miniatura e URL assinada guardada (D168).
--
-- Egress: 45 MB guardados geraram 7,4 GB de saída porque cada render assinava
-- o arquivo de novo — URL diferente é arquivo novo para o navegador, então
-- toda troca de aba rebaixava as fotos da obra. Guardar a assinatura faz o
-- cache do navegador valer.
--
-- Miniatura: a grade de 3 colunas e as bolhas da conversa puxavam o arquivo
-- inteiro para exibir em 100px.
alter table anexos add column if not exists thumb_url text;
alter table anexos add column if not exists signed_url text;
alter table anexos add column if not exists thumb_signed_url text;
alter table anexos add column if not exists signed_until timestamptz;

-- A capa da obra tem o mesmo problema: a tela inicial reassinava a capa de
-- cada obra a cada visita, então o navegador rebaixava todas.
alter table obras add column if not exists photo_signed_url text;
alter table obras add column if not exists photo_signed_until timestamptz;
