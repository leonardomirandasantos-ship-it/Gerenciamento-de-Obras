"use client";

/**
 * Barra de atalho no topo da aba de pendências (D123).
 *
 * Com 14 listas, a seção "Pra organizar" ficava abaixo de uns 3 mil pixels de
 * scroll — quem só dá check em lista nunca descobria que ela existe. Em vez de
 * encolher as listas (que são o trabalho de verdade), a barra mostra as duas
 * contas em uma linha e leva até a seção.
 *
 * Fica FORA da área que rola, não com `sticky`: sticky junto de margem
 * negativa cobria o cabeçalho "Listas" quando o scroll estava no topo.
 */
export function ResumoDasPendencias({
  listas,
  itensEmAberto,
  organizar,
}: {
  listas: number;
  itensEmAberto: number;
  organizar: number;
}) {
  function irPara(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex shrink-0 gap-2 border-b border-line bg-bg-paper px-4 py-3">
      <button
        type="button"
        onClick={() => irPara("secao-listas")}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-card bg-surface px-3 py-2.5 text-left shadow-card active:bg-surface-alt"
      >
        <span className="min-w-0">
          <span className="block text-micro text-ink-soft">
            {listas} {listas === 1 ? "lista" : "listas"}
          </span>
          <span className="block font-display text-body font-bold text-pending">
            {itensEmAberto} em aberto
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-ink-soft">
          ↓
        </span>
      </button>

      <button
        type="button"
        onClick={() => irPara("secao-organizar")}
        disabled={organizar === 0}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-card bg-surface px-3 py-2.5 text-left shadow-card active:bg-surface-alt disabled:opacity-50"
      >
        <span className="min-w-0">
          <span className="block text-micro text-ink-soft">Pra organizar</span>
          <span className="block font-display text-body font-bold text-primary">
            {organizar} {organizar === 1 ? "item" : "itens"}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-ink-soft">
          ↓
        </span>
      </button>
    </div>
  );
}
