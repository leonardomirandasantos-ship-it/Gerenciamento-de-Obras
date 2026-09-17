export default function CarregandoObra() {
  return (
    <div className="flex-1 space-y-3 overflow-hidden p-4" aria-busy="true" aria-label="Carregando">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-card bg-surface"
          style={{ opacity: 1 - i * 0.25 }}
        />
      ))}
    </div>
  );
}
