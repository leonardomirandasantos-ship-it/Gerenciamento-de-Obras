import { formatarReais } from "@/lib/pagamento";

export type FatiaFase = { nome: string; cor: string; valor: number };

export function RoscaPorFase({ fatias }: { fatias: FatiaFase[] }) {
  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0);
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;

  let acumulado = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={raio} fill="none" stroke="var(--color-surface-alt)" strokeWidth="12" />
        {total > 0 &&
          fatias
            .filter((fatia) => fatia.valor > 0)
            .map((fatia) => {
              const proporcao = fatia.valor / total;
              const comprimento = proporcao * circunferencia;
              const offset = -acumulado * circunferencia;
              acumulado += proporcao;

              return (
                <circle
                  key={fatia.nome}
                  cx="50"
                  cy="50"
                  r={raio}
                  fill="none"
                  stroke={fatia.cor}
                  strokeWidth="12"
                  strokeDasharray={`${comprimento} ${circunferencia}`}
                  strokeDashoffset={offset}
                />
              );
            })}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1">
        {fatias.filter((fatia) => fatia.valor > 0).length === 0 ? (
          <li className="text-xs text-ink-soft">Nenhum gasto atribuído a fase ainda.</li>
        ) : (
          fatias
            .filter((fatia) => fatia.valor > 0)
            .map((fatia) => (
              <li key={fatia.nome} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: fatia.cor }}
                />
                <span className="min-w-0 flex-1 truncate text-ink-soft">{fatia.nome}</span>
                <span className="shrink-0 font-medium text-ink">{formatarReais(fatia.valor)}</span>
              </li>
            ))
        )}
      </ul>
    </div>
  );
}
