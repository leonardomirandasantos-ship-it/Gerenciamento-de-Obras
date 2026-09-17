/**
 * Espelho dos tokens para os três lugares onde CSS não chega:
 * o manifest do PWA (JSON), a <meta name="theme-color"> (lida pelo sistema
 * antes de existir CSS) e as cores de fase, que são gravadas no banco.
 *
 * A fonte da verdade continua sendo public/assets/tokens/tokens.css
 * (09_ASSETS_E_DESIGN_HANDOFF). Mudou lá, muda aqui — e em nenhum outro lugar.
 */
export const TOKENS = {
  bgPaper: "#F4F1EA",
  primary: "#1F5C57",
  alert: "#C0553B",
  inkSoft: "#6B675E",
} as const;

/** --phase-* do tokens.css, na ordem das fases padrão. */
export const CORES_DE_FASE = {
  fundacao: "#9B6A43",
  estrutura: "#1F5C57",
  hidraulica: "#3A6EA5",
  eletrica: "#E0913A",
  acabamento: "#3E8E5A",
} as const;

/** Paleta oferecida ao usuário ao criar/editar uma fase. */
export const PALETA_DE_FASES: string[] = [
  ...Object.values(CORES_DE_FASE),
  TOKENS.alert,
  TOKENS.inkSoft,
];
