export type EventoKind =
  | "E1_lista"
  | "E2_checklist"
  | "E3_decisao"
  | "E4_documentacao"
  | "E5_documento"
  | "E6_comunicacao"
  | "E7_pagamento"
  | "E8_orcamento"
  | "E9_audio"
  | "unclassified";

export type AnexoTipo = "foto" | "video" | "pdf" | "audio";

export type ChecklistItem = {
  text: string;
  status: "falta" | "ok";
  note?: string;
  date?: string;
};

export type ChecklistPayload = {
  title?: string;
  /** Prazo herdado da lista de origem — some sem isso ao virar checklist. */
  date?: string;
  sourceListDate?: string;
  sourceEventId?: string;
  items: ChecklistItem[];
  statusHistory?: { at: string; fromEventId?: string; changed: number }[];
};

export type ListaPayload = {
  items?: string[];
  linkedChecklistId?: string;
  /** Tirada das pendências; a mensagem continua na conversa. */
  dismissed?: boolean;
};

/** O que o áudio virou: transcrição guardada e quantos registros saíram dele. */
export type AudioPayload = {
  fileName?: string;
  transcript?: string;
  durationSeconds?: number;
  /** Ids dos eventos derivados, para o card do áudio saber o que gerou. */
  derivedEventIds?: string[];
};

export type DecisaoPayload = {
  title?: string;
  value?: string;
  environment?: string;
  environments?: string[];
};

export type CasoSugestao =
  | "A_checklist"
  | "B_status"
  | "C_data"
  | "D_decisao"
  | "E_prestador"
  | "F_classificar"
  | "G_fechar_dia"
  | "H_pagamento_incompleto";

export type EstadoSugestao = "detected" | "offered" | "accepted" | "ignored" | "silenced";

export type SugestaoRegistro = {
  id: string;
  obra_id: string;
  evento_id: string | null;
  caso: CasoSugestao;
  estado: EstadoSugestao;
  trigger_desc: string | null;
  proposta: string | null;
};

export type Anexo = {
  id: string;
  evento_id: string;
  url: string;
  tipo: AnexoTipo;
  created_at: string;
};

export type Evento = {
  id: string;
  obra_id: string;
  kind: EventoKind;
  confidence: number;
  phase_id: string | null;
  favorecido_id: string | null;
  raw_text: string | null;
  payload: Record<string, unknown>;
  caption: string | null;
  edited: boolean;
  deleted: boolean;
  author_id: string;
  received_at: string;
  created_at: string;
  updated_at: string;
  anexos?: Anexo[];
};

export type Fase = {
  id: string;
  obra_id: string;
  name: string;
  color: string;
  order: number;
  is_default: boolean;
};

export type Obra = {
  id: string;
  owner_id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  photo_url: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  details: string | null;
  current_phase_id: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

/**
 * Cada rótulo é o nome da LENTE que o registro alimenta (D108). "material" vs
 * "pagamento" confundia com razão — tijolo comprado é material e é pagamento.
 * O eixo real não é o assunto, é o tempo: o que ainda vou fazer é pendência,
 * o que já saiu do bolso é gasto.
 */
export const RÓTULO_TIPO: Record<EventoKind, string> = {
  E1_lista: "pendência",
  E2_checklist: "checklist",
  E3_decisao: "decisão",
  E4_documentacao: "foto",
  E5_documento: "documento",
  E6_comunicacao: "comunicação",
  E7_pagamento: "gasto",
  E8_orcamento: "orçamento",
  E9_audio: "áudio",
  unclassified: "não classificado",
};

export const COR_TIPO: Record<EventoKind, string> = {
  E1_lista: "var(--color-pending)",
  E2_checklist: "var(--color-done)",
  E3_decisao: "var(--color-primary)",
  E4_documentacao: "var(--color-unclassified)",
  E5_documento: "var(--color-unclassified)",
  E6_comunicacao: "var(--color-alert)",
  E7_pagamento: "var(--color-pending)",
  E8_orcamento: "var(--color-info)",
  E9_audio: "var(--color-primary)",
  unclassified: "var(--color-unclassified)",
};
