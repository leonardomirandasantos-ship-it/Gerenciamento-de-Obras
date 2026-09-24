"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarChecklistDeLista } from "@/lib/aplicarSugestao";
import { itensParaChecklist, progressoChecklist } from "@/lib/checklist";
import { formatarData } from "@/lib/datas";
import { prazoDaLista, situacaoDoPrazo, tituloDaLista } from "@/lib/pendencias";
import { createClient } from "@/lib/supabase/client";
import { SwipeParaExcluir } from "./SwipeParaExcluir";
import { VerNoChat } from "./VerNoChat";
import { EditarLista } from "./EditarLista";
import type { ChecklistItem, ChecklistPayload, Evento, ListaPayload } from "@/lib/types";

/** Chip de data do item e da lista, com o mesmo vocabulário do card da obra. */
function ChipDePrazo({ data }: { data: string }) {
  const situacao = situacaoDoPrazo(data);
  const cobrando = situacao !== "futuro";

  return (
    <span
      className="chip mt-1"
      style={{ "--chip": cobrando ? "var(--alert)" : "var(--info)" } as React.CSSProperties}
    >
      📅 {situacao === "atrasado" ? "atrasado · " : situacao === "hoje" ? "hoje · " : ""}
      {formatarData(data)}
    </span>
  );
}

/**
 * Card único de lista/checklist. Para quem usa, é a mesma coisa: uma lista de
 * itens para ir marcando. A conversão para checklist acontece por baixo, no
 * primeiro toque — antes o card "sumia" de uma seção e reaparecia em outra no
 * fim da página, e parecia que não tinha criado nada.
 *
 * O check é otimista (D152): marca na hora e grava por baixo. Antes o item
 * ficava desabilitado esperando o banco E o `router.refresh()` — dois
 * segundos por item numa lista de dez era o que fazia a tela parecer travada.
 */
export function CardDeLista({ evento, obraId }: { evento: Evento; obraId: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [saiu, setSaiu] = useState(false);

  const ehChecklist = evento.kind === "E2_checklist";
  const payload = evento.payload as ChecklistPayload;

  // A lista crua usa o mesmo parser que vai gerar o checklist: o que ela vê
  // aqui é exatamente o que vai ficar salvo quando tocar no primeiro item.
  const itensDoServidor: ChecklistItem[] = ehChecklist
    ? (payload.items ?? [])
    : itensParaChecklist(evento.raw_text ?? "");

  const [itens, setItens] = useState(itensDoServidor);
  const [versao, setVersao] = useState(evento.updated_at);
  const [gravando, setGravando] = useState(0);
  const refreshAgendado = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversaoAgendada = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jaConverteu = useRef(false);

  useEffect(() => () => {
    if (refreshAgendado.current) clearTimeout(refreshAgendado.current);
    if (conversaoAgendada.current) clearTimeout(conversaoAgendada.current);
  }, []);

  /**
   * Lista crua vira checklist UMA vez só, com o que ela marcou até parar de
   * tocar (D160). Converter a cada toque criava um checklist por item — três
   * toques rápidos deixavam três checklists iguais no banco, e a aba de
   * pendências mostrava o mesmo card três vezes.
   */
  function agendarConversao(finais: ChecklistItem[]) {
    if (jaConverteu.current) return;
    if (conversaoAgendada.current) clearTimeout(conversaoAgendada.current);

    conversaoAgendada.current = setTimeout(async () => {
      if (jaConverteu.current) return;
      jaConverteu.current = true;
      await criarChecklistDeLista(evento, obraId, finais);
      router.refresh();
    }, 500);
  }

  // Quando o servidor manda uma versão nova (edição pela folha, fusão de
  // status) o card acompanha — mas nunca no meio de uma gravação, senão a
  // resposta antiga volta por cima do que ela acabou de marcar.
  if (evento.updated_at !== versao && gravando === 0) {
    setVersao(evento.updated_at);
    setItens(itensDoServidor);
  }

  const { feitos, total } = progressoChecklist(itens);
  const tudoFeito = total > 0 && feitos === total;
  const prazo = prazoDaLista(evento);

  async function gravar(novos: ChecklistItem[]) {
    const anteriores = itens;
    setItens(novos);
    setGravando((quantas) => quantas + 1);

    const supabase = createClient();
    const { error } = await supabase
      .from("eventos")
      .update({ payload: { ...payload, items: novos } })
      .eq("id", evento.id);

    setGravando((quantas) => quantas - 1);

    if (error) {
      setItens(anteriores);
      return;
    }

    // Um refresh só, depois que a mão parou: recarregar a aba a cada item
    // marcado era o que fazia a lista de dez itens parecer travada.
    if (refreshAgendado.current) clearTimeout(refreshAgendado.current);
    refreshAgendado.current = setTimeout(() => router.refresh(), 700);
  }

  async function alternarItem(indice: number) {
    const novos = itens.map((item, i) =>
      i === indice
        ? { ...item, status: item.status === "ok" ? ("falta" as const) : ("ok" as const) }
        : item,
    );

    if (!ehChecklist) {
      // Lista crua: marca na hora e a conversão sai depois que a mão parar.
      setItens(novos);
      agendarConversao(novos);
      return;
    }

    await gravar(novos);
  }

  async function concluirTudo() {
    const todos = itens.map((item) => ({ ...item, status: "ok" as const }));

    if (!ehChecklist) {
      setItens(todos);
      agendarConversao(todos);
      return;
    }

    await gravar(todos);
  }

  /** Sai das pendências; a mensagem original continua na conversa (D3). */
  async function tirarDaLista() {
    setSaiu(true);
    // Se a conversão estava na fila, ela não acontece mais.
    if (conversaoAgendada.current) clearTimeout(conversaoAgendada.current);
    jaConverteu.current = true;
    const supabase = createClient();

    if (ehChecklist) {
      await supabase.from("eventos").update({ deleted: true }).eq("id", evento.id);

      if (payload.sourceEventId) {
        const { data: origem } = await supabase
          .from("eventos")
          .select("payload")
          .eq("id", payload.sourceEventId)
          .single();

        if (origem) {
          const payloadOrigem = { ...((origem.payload ?? {}) as ListaPayload) };
          delete payloadOrigem.linkedChecklistId;
          payloadOrigem.dismissed = true;
          await supabase
            .from("eventos")
            .update({ payload: payloadOrigem })
            .eq("id", payload.sourceEventId);
        }
      }
    } else {
      await supabase
        .from("eventos")
        .update({ payload: { ...(evento.payload as ListaPayload), dismissed: true } })
        .eq("id", evento.id);
    }

    router.refresh();
  }

  if (saiu) return null;

  return (
    <SwipeParaExcluir onExcluir={tirarDaLista} rotulo="Tirar">
      <div className="space-y-3 rounded-card bg-surface shadow-card p-4">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate font-display text-body font-bold text-ink">
              {tituloDaLista(evento)}
            </p>
            <span className="shrink-0 font-display text-caption font-bold text-done">
              {feitos}/{total}
            </span>
          </div>

          {/* Prazo no topo, junto do título: é o que faz o card ser
              priorizado na fila (D117). */}
          {prazo && <ChipDePrazo data={prazo} />}
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-done transition-all"
              style={{ width: total > 0 ? `${(feitos / total) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <ul className="space-y-2">
          {itens.map((item, indice) => (
            <li key={`${item.text}-${indice}`}>
              <button
                type="button"
                onClick={() => alternarItem(indice)}
                className="flex w-full items-start gap-2 py-1 text-left"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] transition-colors ${
                    item.status === "ok"
                      ? "border-done bg-done text-white"
                      : "border-pending text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-body ${
                      item.status === "ok" ? "text-ink-soft line-through" : "text-ink"
                    }`}
                  >
                    {item.text}
                  </span>
                  {item.note && <span className="block text-micro text-ink-soft">{item.note}</span>}
                  {/* Data igual à da lista já está no chip do topo: repetir em
                    cada item só enche a tela. */}
                  {item.date && item.date !== prazo && item.status !== "ok" && (
                    <ChipDePrazo data={item.date} />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-micro text-primary underline"
          >
            editar
          </button>
          <VerNoChat
            obraId={obraId}
            eventoId={ehChecklist ? (payload.sourceEventId ?? evento.id) : evento.id}
          />
        </div>

        <div className="flex gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={concluirTudo}
            disabled={tudoFeito}
            className="flex-1 rounded-card border border-done px-3 py-2.5 font-display text-caption font-semibold text-done disabled:opacity-40"
          >
            {tudoFeito ? "Tudo feito" : "✓ Concluir tudo"}
          </button>
          <button
            type="button"
            onClick={tirarDaLista}
            className="flex-1 rounded-card border border-line px-3 py-2.5 font-display text-caption font-semibold text-alert"
          >
            🗑 Tirar da lista
          </button>
        </div>
      </div>

      {editando && (
        <EditarLista
          evento={evento}
          obraId={obraId}
          itens={itens}
          onFechar={() => setEditando(false)}
        />
      )}
    </SwipeParaExcluir>
  );
}
