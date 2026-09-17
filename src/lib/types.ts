export type EventoKind =
  | "E1_lista"
  | "E2_checklist"
  | "E3_decisao"
  | "E4_documentacao"
  | "E5_documento"
  | "E6_comunicacao"
  | "E7_pagamento"
  | "E8_orcamento"
  | "unclassified";

export type AnexoTipo = "foto" | "video" | "pdf" | "audio";

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

export const RÓTULO_TIPO: Record<EventoKind, string> = {
  E1_lista: "material",
  E2_checklist: "checklist",
  E3_decisao: "decisão",
  E4_documentacao: "foto",
  E5_documento: "documento",
  E6_comunicacao: "comunicação",
  E7_pagamento: "pagamento",
  E8_orcamento: "orçamento",
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
  unclassified: "var(--color-unclassified)",
};
