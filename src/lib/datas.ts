const REGEX_DATA = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const REGEX_PALAVRA_DATA =
  /\bat[ée](?![a-zà-ÿ])|\bdia\b|\bprevis[ãa]o\b|\bprazo\b|\bamanh[ãa](?![a-zà-ÿ])|\bhoje\b|\bpara\b|\bpra\b/i;

const DIAS_DA_SEMANA: { regex: RegExp; dia: number }[] = [
  { regex: /\bdomingo\b/i, dia: 0 },
  { regex: /\bsegunda(?:-feira)?\b/i, dia: 1 },
  { regex: /\bter[çc]a(?:-feira)?\b/i, dia: 2 },
  { regex: /\bquarta(?:-feira)?\b/i, dia: 3 },
  { regex: /\bquinta(?:-feira)?\b/i, dia: 4 },
  { regex: /\bsexta(?:-feira)?\b/i, dia: 5 },
  { regex: /\bs[áa]bado\b/i, dia: 6 },
];

function paraIso(data: Date): string {
  // Local, não UTC: perto da meia-noite o UTC já joga para o dia seguinte.
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function somarDias(base: Date, dias: number): Date {
  const data = new Date(base);
  data.setDate(data.getDate() + dias);
  return data;
}

/**
 * Data relativa em palavras — "para amanhã", "até segunda", "semana que vem".
 * No canteiro é assim que se fala; exigir "20/09" era exigir que ela traduzisse
 * o próprio jeito de escrever (D109).
 */
export function extrairDataRelativa(texto: string, hoje = new Date()): string | null {
  if (/\bdepois de amanh[ãa](?![a-zà-ÿ])/i.test(texto)) return paraIso(somarDias(hoje, 2));
  if (/\bamanh[ãa](?![a-zà-ÿ])/i.test(texto)) return paraIso(somarDias(hoje, 1));
  if (/\bhoje\b/i.test(texto)) return paraIso(hoje);

  const emDias = texto.match(/\bem\s+(\d{1,2})\s+dias?\b/i);
  if (emDias) return paraIso(somarDias(hoje, Number(emDias[1])));

  if (/\bsemana que vem\b|\bpr[óo]xima semana\b/i.test(texto)) {
    return paraIso(somarDias(hoje, 7));
  }

  for (const { regex, dia } of DIAS_DA_SEMANA) {
    if (!regex.test(texto)) continue;
    // Sempre o próximo: "até sexta" na sexta significa a sexta que vem.
    const diferenca = (dia - hoje.getDay() + 7) % 7 || 7;
    return paraIso(somarDias(hoje, diferenca));
  }

  return null;
}

/**
 * Data explícita mencionada no texto, em ISO (yyyy-mm-dd).
 *
 * Cuidado deliberado: medidas como "cotovelo 3/4" e "cano 1 1/4" aparecem
 * muito no uso real e casariam com o padrão de data, então só aceito quando o
 * dia tem 2 dígitos, há ano explícito, ou existe palavra de tempo por perto.
 */
export function extrairDataMencionada(texto: string, hoje = new Date()): string | null {
  const achou = texto.match(REGEX_DATA);

  if (achou) {
    const [, diaBruto, mesBruto, anoBruto] = achou;
    const dia = Number(diaBruto);
    const mes = Number(mesBruto);

    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      const pareceData =
        diaBruto.length === 2 || Boolean(anoBruto) || REGEX_PALAVRA_DATA.test(texto);

      if (pareceData) {
        const ano = anoBruto
          ? anoBruto.length === 2
            ? `20${anoBruto}`
            : anoBruto
          : `${hoje.getFullYear()}`;
        return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      }
    }
  }

  return extrairDataRelativa(texto, hoje);
}

/**
 * Data que ela DECLAROU como prazo, não só citou. Exige palavra de intenção
 * ("até", "para", "prazo", "previsão") ou expressão relativa — é o que
 * autoriza marcar o prazo sozinho, sem perguntar (D110). Um "11/04" solto
 * continua virando sugestão, porque pode ser só uma referência.
 */
export function extrairPrazoDeclarado(texto: string, hoje = new Date()): string | null {
  const relativa = extrairDataRelativa(texto, hoje);
  if (relativa) return relativa;

  if (!/\bat[ée](?![a-zà-ÿ])|\bpara o dia\b|\bpra o dia\b|\bprazo\b|\bprevis[ãa]o\b/i.test(texto)) {
    return null;
  }
  return extrairDataMencionada(texto, hoje);
}

/**
 * Tira do texto o trecho que virou data. "comprar para hoje cal" vira
 * "comprar cal" (D153): se o prazo já está guardado no campo de data e
 * aparece como chip no card, repetir "para hoje" dentro do item é ruído.
 *
 * Só roda quando uma data foi mesmo encontrada, então "para o contrapiso" e
 * "cotovelo 3/4" passam intactos.
 */
const TRECHOS_DE_DATA: RegExp[] = [
  /\b(?:at[ée]|pra|para|em|no)?\s*\b(?:o\s+)?dia\s+\d{1,2}(?:\/\d{1,2}(?:\/\d{2,4})?)?/gi,
  /\b(?:at[ée]|pra|para|em|no)?\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi,
  /\b(?:at[ée]|pra|para)?\s*depois de amanh[ãa](?![a-zà-ÿ])/gi,
  /\b(?:at[ée]|pra|para)?\s*amanh[ãa](?![a-zà-ÿ])/gi,
  /\b(?:at[ée]|pra|para)?\s*hoje\b/gi,
  /\bem\s+\d{1,2}\s+dias?\b/gi,
  /\b(?:at[ée]|pra|para|na)?\s*(?:semana que vem|pr[óo]xima semana)\b/gi,
  /\b(?:at[ée]|pra|para|na)?\s*(?:domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)(?:-feira)?\b/gi,
];

export function removerMencaoDeData(texto: string, hoje = new Date()): string {
  if (!extrairDataMencionada(texto, hoje)) return texto;

  let limpo = texto;
  for (const regex of TRECHOS_DE_DATA) limpo = limpo.replace(regex, " ");

  limpo = limpo
    .replace(/\s+/g, " ")
    // Sobra de preposição solta no fim: "comprar cimento para" → "comprar cimento".
    .replace(/\s+(?:at[ée]|pra|para|em|no|na|de|do|da)\s*$/i, "")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
    .trim();

  // Se sobrou só a data, o texto original diz mais do que nada.
  return limpo.length > 0 ? limpo : texto;
}

export function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}
