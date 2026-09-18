"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { excluirFase, renomearFase } from "@/lib/fases";
import { BottomSheet } from "./BottomSheet";
import type { Fase } from "@/lib/types";

/**
 * Renomear ou excluir uma fase a partir da Documentação (D147). Excluir já
 * existia nas Configurações, mas ninguém procura lá quando está olhando as
 * fotos — o problema era achar o recurso, não a falta dele.
 */
export function EditarFase({
  fase,
  fotosNaFase,
  onFechar,
  onExcluida,
}: {
  fase: Fase;
  fotosNaFase: number;
  onFechar: () => void;
  onExcluida: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(fase.name);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim() || nome.trim() === fase.name) {
      onFechar();
      return;
    }
    setSalvando(true);
    await renomearFase(fase.id, nome);
    setSalvando(false);
    onFechar();
    router.refresh();
  }

  async function excluir() {
    setSalvando(true);
    await excluirFase(fase.id);
    setSalvando(false);
    onExcluida();
    router.refresh();
  }

  return (
    <BottomSheet titulo="Editar fase" onFechar={onFechar}>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-caption font-semibold text-ink">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando || !nome.trim()}
          className="w-full rounded-card bg-primary py-3 font-display text-body font-semibold text-white disabled:opacity-40"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>

        <div className="border-t border-line pt-4">
          {confirmando ? (
            <div className="space-y-3">
              {/* Dizer o que acontece com as fotos é o que torna a exclusão
                  segura de fazer: nada some, só perde a etiqueta. */}
              <p className="text-caption text-ink">
                Excluir <strong>{fase.name}</strong>?{" "}
                {fotosNaFase > 0
                  ? `As ${fotosNaFase} ${fotosNaFase === 1 ? "foto" : "fotos"} e os outros registros dessa fase ficam sem fase e continuam em "Todas".`
                  : `Os registros que estiverem nela ficam sem fase.`}{" "}
                Nada é apagado.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="flex-1 rounded-card border border-line py-3 font-display text-caption font-semibold text-ink-soft"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={excluir}
                  disabled={salvando}
                  className="flex-1 rounded-card bg-alert py-3 font-display text-caption font-semibold text-white disabled:opacity-50"
                >
                  Excluir fase
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="w-full rounded-card border border-line py-3 font-display text-caption font-semibold text-alert"
            >
              🗑 Excluir fase
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
