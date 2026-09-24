/**
 * Encolher a foto no celular, antes de subir (D168).
 *
 * A foto do iPhone chega com 3–5 MB. Isso pesava em três lugares ao mesmo
 * tempo: o envio (a queixa dela — "depois que tira a foto demora"), o storage
 * e o egress, porque a mesma foto gigante era usada para preencher um quadrado
 * de 100px na grade.
 *
 * Saem duas versões, as duas leves — como o WhatsApp faz, que também não
 * guarda a original:
 * - `cheia` (1600px): é o que abre no visor, baixa e encaminha.
 * - `miniatura` (600px): é o que aparece em toda lista e grade.
 */
const LADO_CHEIA = 1600;
const LADO_MINIATURA = 600;
const QUALIDADE_CHEIA = 0.82;
const QUALIDADE_MINIATURA = 0.7;

/** Abaixo disso não vale reprocessar: já está do tamanho de uma miniatura. */
const PEQUENA_DEMAIS = 120 * 1024;

export type ImagemPreparada = { cheia: File; miniatura: File | null };

function nomeCom(sufixo: string, nome: string): string {
  const semExtensao = nome.replace(/\.[^.]+$/, "");
  return `${semExtensao}${sufixo}.jpg`;
}

async function desenhar(bitmap: ImageBitmap, lado: number, qualidade: number): Promise<Blob | null> {
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");
  if (!contexto) return null;
  contexto.drawImage(bitmap, 0, 0, largura, altura);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
}

/**
 * Nunca falha o envio por causa da compressão: se o navegador não souber
 * decodificar (HEIC exótico, arquivo corrompido), sobe o arquivo como veio.
 * Foto guardada grande é melhor do que foto não guardada.
 */
export async function prepararImagem(file: File): Promise<ImagemPreparada> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return { cheia: file, miniatura: null };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { cheia: file, miniatura: null };
  }

  try {
    const jaPequena = file.size <= PEQUENA_DEMAIS && Math.max(bitmap.width, bitmap.height) <= LADO_CHEIA;

    const [cheia, miniatura] = await Promise.all([
      jaPequena ? null : desenhar(bitmap, LADO_CHEIA, QUALIDADE_CHEIA),
      desenhar(bitmap, LADO_MINIATURA, QUALIDADE_MINIATURA),
    ]);

    return {
      // Se a compressão ficou MAIOR que o original (acontece com print de
      // tela em PNG pequeno), vale o original.
      cheia:
        cheia && cheia.size < file.size
          ? new File([cheia], nomeCom("", file.name), { type: "image/jpeg" })
          : file,
      miniatura: miniatura
        ? new File([miniatura], nomeCom("-mini", file.name), { type: "image/jpeg" })
        : null,
    };
  } finally {
    bitmap.close();
  }
}
