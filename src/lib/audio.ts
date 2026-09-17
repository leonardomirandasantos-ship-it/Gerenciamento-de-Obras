/**
 * Formato de gravação suportado pelo navegador.
 *
 * O Safari do iPhone não grava `webm` — ele grava `mp4/aac`. Chrome e Firefox
 * fazem o contrário. Então o formato é negociado em tempo de execução, e não
 * fixado no código: fixar `webm` deixaria o recurso morto no iPhone, que é
 * justamente o aparelho do canteiro.
 */
const CANDIDATOS = [
  { mimeType: "audio/webm;codecs=opus", extensao: "webm" },
  { mimeType: "audio/webm", extensao: "webm" },
  { mimeType: "audio/mp4", extensao: "m4a" },
  { mimeType: "audio/mpeg", extensao: "mp3" },
  { mimeType: "audio/ogg;codecs=opus", extensao: "ogg" },
];

export type FormatoDeAudio = { mimeType: string; extensao: string };

export function formatoSuportado(): FormatoDeAudio | null {
  if (typeof MediaRecorder === "undefined") return null;

  for (const candidato of CANDIDATOS) {
    if (MediaRecorder.isTypeSupported(candidato.mimeType)) return candidato;
  }

  // Alguns navegadores aceitam gravar sem mimeType explícito; aí o tipo real
  // vem no blob e a extensão sai dele.
  return { mimeType: "", extensao: "webm" };
}

/** O Gemini precisa de um mime limpo, sem os parâmetros de codec. */
export function mimeLimpo(mimeType: string): string {
  return mimeType.split(";")[0] || "audio/webm";
}

export function formatarDuracao(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = Math.floor(segundos % 60);
  return `${minutos}:${String(resto).padStart(2, "0")}`;
}
