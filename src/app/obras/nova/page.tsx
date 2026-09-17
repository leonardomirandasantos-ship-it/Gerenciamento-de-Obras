"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NovaObraPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [details, setDetails] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("obras")
      .insert({
        name,
        client_name: clientName || null,
        location: location || null,
        start_date: startDate || null,
        expected_end_date: expectedEndDate || null,
        details: details || null,
      })
      .select("id")
      .single();

    setCarregando(false);

    if (error || !data) {
      setErro(error?.message ?? "Não deu pra criar a obra.");
      return;
    }

    router.push(`/obras/${data.id}/conversa`);
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-ink">Nova obra</h1>
        <Link href="/" className="text-ink-soft" aria-label="Fechar">
          ✕
        </Link>
      </header>

      <form onSubmit={criar} className="space-y-4">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-line bg-surface-alt text-2xl text-ink-soft">
            📷
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Nome da obra</label>
          <input
            required
            placeholder="Ex.: Casa Ecologie"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Cliente (opcional)</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Localização / cidade (opcional)</label>
          <input
            placeholder="Ex.: São Paulo, SP"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-ink">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-ink">Previsão de término</label>
            <input
              type="date"
              value={expectedEndDate}
              onChange={(e) => setExpectedEndDate(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Detalhes (opcional)</label>
          <textarea
            rows={3}
            placeholder="Endereço, observações..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        {erro && <p className="text-sm text-alert">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {carregando ? "Criando..." : "Criar obra"}
        </button>
      </form>
    </main>
  );
}
