"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { caminhoDaCapa } from "@/lib/fotoObra";
import { prepararImagem } from "@/lib/imagem";

/** Espelho dos nomes criados pelo trigger `criar_fases_padrao` no banco. */
const FASES_PADRAO = ["Fundação", "Estrutura", "Hidráulica", "Elétrica", "Acabamento"];

export default function NovaObraPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [details, setDetails] = useState("");
  // Fase em que a obra está HOJE (D171). É opcional, mas é a pergunta que
  // paga mais caro se ficar sem resposta: sem fase atual, tudo o que ela
  // captura nasce órfão e some da rosca do resumo e do filtro da documentação.
  const [fase, setFase] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // A capa é escolhida aqui, mas só sobe DEPOIS de criar a obra: o caminho no
  // Storage inclui o id dela, que ainda não existe (D140). Até lá o arquivo
  // fica em memória e a prévia é um object URL.
  const [capa, setCapa] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const capaInputRef = useRef<HTMLInputElement>(null);

  function escolherCapa(file: File | null) {
    if (previa) URL.revokeObjectURL(previa);
    setCapa(file);
    setPrevia(file ? URL.createObjectURL(file) : null);
  }

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

    if (error || !data) {
      setCarregando(false);
      setErro(error?.message ?? "Não deu pra criar a obra.");
      return;
    }

    // A foto não bloqueia a criação: se o upload falhar, a obra já existe e a
    // capa pode ser posta depois nas configurações. Perder a obra por causa
    // da foto seria trocar o essencial pelo acessório.
    if (capa) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { cheia, miniatura } = await prepararImagem(capa);
        const imagem = miniatura ?? cheia;
        const caminho = caminhoDaCapa(user.id, data.id, imagem.name);
        const { error: erroUpload } = await supabase.storage
          .from("anexos")
          .upload(caminho, imagem);

        if (!erroUpload) {
          await supabase.from("obras").update({ photo_url: caminho }).eq("id", data.id);
        }
      }
    }

    // As fases padrão nascem por trigger no banco, então o id só existe
    // depois da obra criada — por isso a escolha é por NOME aqui.
    if (fase) {
      const { data: criada } = await supabase
        .from("fases")
        .select("id")
        .eq("obra_id", data.id)
        .eq("name", fase)
        .maybeSingle();

      if (criada) {
        await supabase.from("obras").update({ current_phase_id: criada.id }).eq("id", data.id);
      }
    }

    setCarregando(false);
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
        <div className="flex flex-col items-center gap-2">
          <input
            ref={capaInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              escolherCapa(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => capaInputRef.current?.click()}
            className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-line bg-surface-alt active:opacity-80"
            aria-label={capa ? "Trocar a foto da obra" : "Escolher a foto da obra"}
          >
            {previa ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previa} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image
                src="/assets/logo/mascote-192.png"
                alt=""
                width={192}
                height={192}
                className="h-12 w-12"
              />
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => capaInputRef.current?.click()}
              className="font-display text-caption font-semibold text-primary"
            >
              {capa ? "Trocar foto" : "Escolher foto"}
            </button>
            {capa && (
              <button
                type="button"
                onClick={() => escolherCapa(null)}
                className="text-caption text-ink-soft"
              >
                remover
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Nome da obra</label>
          <input
            required
            placeholder="Ex.: Casa Ecologie"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Cliente (opcional)</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Localização / cidade (opcional)</label>
          <input
            placeholder="Ex.: São Paulo, SP"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <label className="text-sm font-medium text-ink">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <label className="text-sm font-medium text-ink">Previsão de término</label>
            <input
              type="date"
              value={expectedEndDate}
              onChange={(e) => setExpectedEndDate(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Em que fase ela está hoje?</label>
          <p className="text-micro text-ink-soft">
            Tudo que você mandar entra nessa fase. Dá para trocar a qualquer momento na conversa.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {FASES_PADRAO.map((nome) => (
              <button
                key={nome}
                type="button"
                // Tocar na que já está marcada desmarca — mesmo gesto do
                // seletor da galeria (D142).
                onClick={() => setFase(fase === nome ? "" : nome)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  fase === nome ? "border-primary bg-primary text-white" : "border-line text-ink-soft"
                }`}
              >
                {nome}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-ink">Detalhes (opcional)</label>
          <textarea
            rows={3}
            placeholder="Endereço, observações..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
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
