/**
 * Conversão para WAV mono 16 kHz, no navegador (D128).
 *
 * Por que existe: o Gemini aceita só `audio/wav`, `mp3`, `aiff`, `aac`, `ogg`
 * e `flac` — e `audio/webm`, que é o que o Chrome grava, NÃO está na lista.
 * O áudio subia e era guardado, mas o entendimento voltava com erro.
 *
 * A gravação original continua sendo guardada como veio (webm no Chrome, mp4
 * no Safari): é pequena e toca nativamente no player da conversa. O WAV é
 * descartável — existe só para a chamada da IA.
 *
 * 16 kHz mono é o formato que modelo de fala quer, e de quebra deixa o arquivo
 * menor do que um WAV ingênuo a 48 kHz estéreo (5,7 MB contra 34 MB em 3 min).
 */
const TAXA_ALVO = 16000;

export async function paraWavMono16k(blob: Blob): Promise<Blob> {
  const AudioCtx: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  const contexto = new AudioCtx();
  try {
    const decodificado = await contexto.decodeAudioData(await blob.arrayBuffer());
    const mono = paraMono(decodificado);
    const reamostrado = reamostrar(mono, decodificado.sampleRate, TAXA_ALVO);
    return montarWav(reamostrado, TAXA_ALVO);
  } finally {
    // Liberar o contexto: no iPhone o número de contextos de áudio é limitado.
    void contexto.close();
  }
}

function paraMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);

  const canais = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  const mono = new Float32Array(buffer.length);

  for (let i = 0; i < buffer.length; i += 1) {
    let soma = 0;
    for (const canal of canais) soma += canal[i];
    mono[i] = soma / canais.length;
  }

  return mono;
}

/**
 * Reamostragem linear feita à mão em vez de `OfflineAudioContext`: o Safari
 * historicamente recusa taxa de amostragem arbitrária no OfflineAudioContext,
 * e o iPhone é justamente o aparelho que precisa funcionar.
 */
function reamostrar(amostras: Float32Array, de: number, para: number): Float32Array {
  if (de === para) return amostras;

  const proporcao = de / para;
  const tamanho = Math.floor(amostras.length / proporcao);
  const saida = new Float32Array(tamanho);

  for (let i = 0; i < tamanho; i += 1) {
    const posicao = i * proporcao;
    const anterior = Math.floor(posicao);
    const proximo = Math.min(anterior + 1, amostras.length - 1);
    const peso = posicao - anterior;
    saida[i] = amostras[anterior] * (1 - peso) + amostras[proximo] * peso;
  }

  return saida;
}

function montarWav(amostras: Float32Array, taxa: number): Blob {
  const bytesDeDados = amostras.length * 2;
  const buffer = new ArrayBuffer(44 + bytesDeDados);
  const visao = new DataView(buffer);

  const texto = (posicao: number, valor: string) => {
    for (let i = 0; i < valor.length; i += 1) visao.setUint8(posicao + i, valor.charCodeAt(i));
  };

  texto(0, "RIFF");
  visao.setUint32(4, 36 + bytesDeDados, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  visao.setUint32(16, 16, true); // tamanho do bloco fmt
  visao.setUint16(20, 1, true); // PCM
  visao.setUint16(22, 1, true); // mono
  visao.setUint32(24, taxa, true);
  visao.setUint32(28, taxa * 2, true); // bytes por segundo
  visao.setUint16(32, 2, true); // bytes por amostra
  visao.setUint16(34, 16, true); // bits por amostra
  texto(36, "data");
  visao.setUint32(40, bytesDeDados, true);

  let posicao = 44;
  for (const amostra of amostras) {
    const limitada = Math.max(-1, Math.min(1, amostra));
    visao.setInt16(posicao, limitada < 0 ? limitada * 0x8000 : limitada * 0x7fff, true);
    posicao += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
