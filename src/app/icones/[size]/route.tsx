import { ImageResponse } from "next/og";

/**
 * Ícone do app gerado em tempo de execução. É PLACEHOLDER: quando os arquivos
 * de marca (mascote) chegarem em public/brand/, troque por eles (06_BRANDING).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const lado = size === "512" ? 512 : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1F5C57",
          color: "#F4F1EA",
          fontSize: lado * 0.55,
          fontWeight: 800,
        }}
      >
        Z
      </div>
    ),
    { width: lado, height: lado },
  );
}
