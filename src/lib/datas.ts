const REGEX_DATA = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const REGEX_PALAVRA_DATA = /\bat[ée]\b|\bdia\b|\bprevis[ãa]o\b|\bprazo\b|\bamanh[ãa]\b/i;

/**
 * Data explícita mencionada no texto, em ISO (yyyy-mm-dd).
 *
 * Cuidado deliberado: medidas como "cotovelo 3/4" e "cano 1 1/4" aparecem
 * muito no uso real e casariam com o padrão de data, então só aceito quando o
 * dia tem 2 dígitos, há ano explícito, ou existe palavra de tempo por perto.
 */
export function extrairDataMencionada(texto: string): string | null {
  const achou = texto.match(REGEX_DATA);
  if (!achou) return null;

  const [, diaBruto, mesBruto, anoBruto] = achou;
  const dia = Number(diaBruto);
  const mes = Number(mesBruto);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  const pareceData = diaBruto.length === 2 || Boolean(anoBruto) || REGEX_PALAVRA_DATA.test(texto);
  if (!pareceData) return null;

  const ano = anoBruto
    ? anoBruto.length === 2
      ? `20${anoBruto}`
      : anoBruto
    : `${new Date().getFullYear()}`;

  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function formatarData(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}
