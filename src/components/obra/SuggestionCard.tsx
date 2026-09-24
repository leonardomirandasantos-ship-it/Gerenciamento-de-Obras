"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aplicarSugestao, ignorarSugestao } from "@/lib/aplicarSugestao";
import { descricaoDoEvento } from "@/lib/descricao";
import { MiniaturaDoEvento } from "./MiniaturaDoEvento";
import { CampoFavorecido } from "./CampoFavorecido";
import { VerNoChat } from "./VerNoChat";
import type { Sugestao } from "@/lib/suggestions";
import type { Evento } from "@/lib/types";

export function SuggestionCard({
  sugestao,
  evento,
  obraId,
  /** Na conversa a mensagem está logo acima; na lente, não — aí precisa citar. */
  citarMensagem = false,
}: {
  sugestao: Sugestao;
  evento: Evento;
  obraId: string;
  citarMensagem?: boolean;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [mostrarPorque, setMostrarPorque] = useState(false);
  const [valor, setValor] = useState(
    sugestao.dados.amount !== undefined ? String(sugestao.dados.amount) : "",
  );
  const [favorecido, setFavorecido] = useState(String(sugestao.dados.payeeName ?? ""));
  const [erro, setErro] = useState<string | null>(null);

  async function aceitar(opcao?: string) {
    setCarregando(true);
    setErro(null);
    const { erro: falha } = await aplicarSugestao(sugestao, evento, obraId, opcao, {
      amount: valor ? parseFloat(valor.replace(",", ".")) : undefined,
      payeeName: favorecido || undefined,
    });
    setCarregando(false);

    // A ação em si foi aplicada; só o registro do "já resolvi" falhou — então
    // a sugestão voltaria. Melhor avisar do que ela achar que não funcionou.
    if (falha) {
      console.error("[sugestao] não gravou o 'accepted':", falha);
      setErro("Apliquei, mas não consegui marcar como resolvida.");
    }
    router.refresh();
  }

  async function ignorar() {
    setCarregando(true);
    setErro(null);
    const { erro: falha } = await ignorarSugestao(sugestao, obraId);
    setCarregando(false);

    // Sem isso a sugestão voltava calada e ela clicava em "agora não" de novo,
    // sem entender por que não obedecia.
    if (falha) {
      // O motivo real no console: o erro visível é para ela, este é para
      // quem for investigar (foi um check constraint velho no banco).
      console.error("[sugestao] não gravou o 'ignored':", falha);
      setErro("Não consegui guardar isso — a sugestão vai voltar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-card bg-primary-soft p-4">
      <p className="text-micro text-ink-soft">{sugestao.gatilho}</p>

      {/* "Marcar 11/04 como prazo disso?" — disso o quê? Fora da conversa a
          sugestão perdia o referente (D120). Aqui ela cita a mensagem. */}
      {citarMensagem && (
        <div className="flex items-start gap-2 border-l-2 border-primary/40 pl-2">
          <MiniaturaDoEvento evento={evento} tamanho="h-9 w-9" />
          <p className="min-w-0 flex-1 line-clamp-3 whitespace-pre-wrap text-caption text-ink">
            {descricaoDoEvento(evento)}
          </p>
          <VerNoChat obraId={obraId} eventoId={evento.id} />
        </div>
      )}

      <p className="font-display text-body font-semibold text-ink">{sugestao.proposta}</p>

      {sugestao.entradaPagamento && (
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="R$"
            className="w-24 rounded-card border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-primary"
          />
          <div className="min-w-0 flex-1">
            <CampoFavorecido obraId={obraId} valor={favorecido} onChange={setFavorecido} />
          </div>
        </div>
      )}

      {sugestao.opcoes && (
        <div className="flex flex-wrap gap-2">
          {sugestao.opcoes.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => aceitar(opcao.valor)}
              disabled={carregando}
              className="rounded-full border border-primary bg-surface px-3 py-2 font-display text-caption font-semibold text-primary disabled:opacity-50"
            >
              {opcao.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {!sugestao.opcoes && (
          <button
            type="button"
            onClick={() => aceitar(sugestao.acaoAlternativaLabel ? "prestador" : undefined)}
            disabled={carregando}
            className="rounded-full bg-primary px-4 py-2 font-display text-caption font-semibold text-white disabled:opacity-50"
          >
            {carregando ? "..." : sugestao.acaoLabel}
          </button>
        )}

        {sugestao.acaoAlternativaLabel && (
          <button
            type="button"
            onClick={() => aceitar("fornecedor")}
            disabled={carregando}
            className="rounded-full border border-primary px-4 py-2 font-display text-caption font-semibold text-primary disabled:opacity-50"
          >
            {sugestao.acaoAlternativaLabel}
          </button>
        )}

        <button
          type="button"
          onClick={ignorar}
          disabled={carregando}
          className="px-2 py-2 text-caption text-ink-soft"
        >
          agora não
        </button>

        <button
          type="button"
          onClick={() => setMostrarPorque((v) => !v)}
          className="ml-auto text-micro text-ink-soft underline"
        >
          por quê?
        </button>
      </div>

      {mostrarPorque && <p className="text-micro text-ink-soft">{sugestao.porque}</p>}

      {erro && <p className="text-micro text-alert">{erro}</p>}
    </div>
  );
}
