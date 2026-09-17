"use client";

import { useState } from "react";
import type { Anexo } from "@/lib/types";

/**
 * Encaminhar o anexo para fora do app (D137).
 *
 * Nasceu de uma observação do cliente na demo: o comprovante sai do banco e ele
 * manda para o pedreiro **e** para o app — trabalho duplicado. Aqui ele abre a
 * folha nativa de compartilhamento, escolhe o WhatsApp e escolhe o contato, com
 * a imagem que já está guardada.
 *
 * Sem checagem de suporte na renderização (`navigator.canShare`) de propósito:
 * isso dependeria de estado montado no cliente e causaria descasamento de
 * hidratação. O botão sempre aparece e decide no toque — compartilha se der,
 * baixa se não der. Baixar é o caminho no desktop, onde o Web Share com
 * arquivo quase não existe.
 */
export function BotaoEncaminhar({
  anexos,
  descricao,
  rotulo = "encaminhar",
}: {
  anexos: Anexo[];
  /** Vai como legenda no compartilhamento, quando o destino aceitar texto. */
  descricao?: string;
  rotulo?: string;
}) {
  const [estado, setEstado] = useState<"parado" | "preparando" | "erro">("parado");

  const anexo = anexos.find((a) => a.tipo === "foto" || a.tipo === "pdf") ?? anexos[0];
  if (!anexo) return null;

  async function encaminhar() {
    setEstado("preparando");

    try {
      // A URL é assinada e temporária; o arquivo é baixado para virar File,
      // porque compartilhar link exigiria que o destinatário tivesse acesso.
      const resposta = await fetch(anexo.url);
      if (!resposta.ok) throw new Error(`storage respondeu ${resposta.status}`);

      const blob = await resposta.blob();
      const extensao = blob.type.split("/")[1]?.split("+")[0] ?? "jpg";
      const arquivo = new File([blob], `comprovante.${extensao}`, {
        type: blob.type || "application/octet-stream",
      });

      const podeCompartilhar =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [arquivo] });

      if (podeCompartilhar) {
        await navigator.share({
          files: [arquivo],
          ...(descricao ? { text: descricao } : {}),
        });
        setEstado("parado");
        return;
      }

      // Sem Web Share: baixa o arquivo para ela anexar onde quiser.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = arquivo.name;
      link.click();
      URL.revokeObjectURL(url);
      setEstado("parado");
    } catch (erro) {
      // Cancelar a folha de compartilhamento chega como AbortError: não é erro.
      if ((erro as Error).name === "AbortError") {
        setEstado("parado");
        return;
      }
      console.error("[encaminhar]", erro);
      setEstado("erro");
      setTimeout(() => setEstado("parado"), 4000);
    }
  }

  return (
    <button
      type="button"
      onClick={encaminhar}
      disabled={estado === "preparando"}
      className="shrink-0 text-micro text-primary underline disabled:opacity-50"
    >
      {estado === "preparando" ? "abrindo…" : estado === "erro" ? "não deu" : `↗ ${rotulo}`}
    </button>
  );
}
