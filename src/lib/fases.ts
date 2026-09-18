import { createClient } from "./supabase/client";
import { PALETA_DE_FASES } from "./tokens";

/**
 * Cria uma fase na obra. Um lugar só para isso: as Configurações, a barra de
 * filtro da Documentação e o visor de foto criam fase (D143), e a cor e a
 * ordem têm que sair igual nos três.
 */
export async function criarFase(
  obraId: string,
  nome: string,
  quantasJaExistem: number,
): Promise<{ id: string } | null> {
  const limpo = nome.trim();
  if (!limpo) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("fases")
    .insert({
      obra_id: obraId,
      name: limpo,
      color: PALETA_DE_FASES[quantasJaExistem % PALETA_DE_FASES.length],
      order: quantasJaExistem,
    })
    .select("id")
    .single();

  return data;
}

export async function renomearFase(faseId: string, nome: string): Promise<boolean> {
  const limpo = nome.trim();
  if (!limpo) return false;
  const supabase = createClient();
  const { error } = await supabase.from("fases").update({ name: limpo }).eq("id", faseId);
  return !error;
}

/**
 * Exclui a fase. Nunca apaga registro: `eventos.phase_id` e
 * `obras.current_phase_id` são `on delete set null` no schema, então o que
 * estava nela só fica sem fase e continua em "Todas" (D147).
 */
export async function excluirFase(faseId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("fases").delete().eq("id", faseId);
  return !error;
}
