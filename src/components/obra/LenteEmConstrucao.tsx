export function LenteEmConstrucao({ nome }: { nome: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <p className="text-sm text-ink-soft">
        {nome} ainda está em construção — chega numa próxima etapa da V1.
      </p>
    </div>
  );
}
