/**
 * Regressão da quebra de linha em itens (D156/D159). Roda sem banco:
 *
 *   npx tsx scripts/testar-enumeracao.ts
 *
 * A lista "deve ficar inteiro" é a amostra real do export de WhatsApp da obra
 * (a mesma de `simular-uso.ts`). Ela é o freio: qualquer regra nova de quebra
 * precisa passar aqui antes de ir para o app, senão a gente pica o jeito de
 * escrever dela para ganhar um caso bonito.
 */
import { extrairItensDeLista } from "../src/lib/checklist";

const DEVE_QUEBRAR: [string, number][] = [
  ["Comprar areia pedra e brita", 3],
  ["Brita areia e pedra para amanhã", 3],
  ["Comprar areia tijolo e pedra pra hoje", 3],
  ["Comprar cal cimento pincel", 3],
  ["comprar cal, cimento e areia hoje", 3],
  ["comprar 2,5 m de cano, 3 tijolos e 1 cola", 3],
  ["Comprar cimento areia", 2],
  ["Comprar prego martelo e marreta que vem", 3],
  // Vira "cimento" + "areia para o contrapiso": duas compras mesmo, e o
  // rabicho fica no último item em vez de cancelar a quebra (D162).
  ["comprar cimento e areia para o contrapiso", 2],
];

const DEVE_FICAR_INTEIRO: string[] = [
  "Concreto muros e muros",
  "12 m³",
  "110 mm tubo ocre",
  "600 estrutural 19x19x29",
  "1000 estrutural 14x19x29 $2.500,",
  "Consegue fazer $5.200,?",
  "Falar com Daniel sobre drenos",
  "Cotação de concreto previsão 11/04",
  "2 cotovelo 3/4",
  '20 m conduíte 1"',
  "Guarda corpo",
  "Muro lateral",
  "Casa de máquina",
  "Infra ar",
  "Guarda corpo ok",
  "Muro lateral 1,40",
  "Contrapiso - rebocar",
  "Elétrica Adolfo $12.000, sem instalação de luminárias",
  "Suítes 1 e 2",
  "Piso e parede - cinza artico",
  "Mudar Tomada churrasqueira",
  "Requadros portas",
  "paguei 200 para armando pintor",
  "pix de R$ 1.250,00 pro José Costa, mão de obra da semana",
  "comprar 10 sacos de cimento até 20/09",
  "Tomada canto cozinha",
  "Rejunte box master",
  "Caixinha aspirador",
  "Requadrar portas piscina",
  "Aumentar paleta gourmet para 70 cm",
  "Rejunte do banheiro da suíte master: cinza ártico",
  "14 Degraus 26x100",
  "Portas Pormax",
  "Mont blanc",
  "Comprar cimento urgente",
  "levar as amostras de porcelanato pro cliente ver",
];

let falhas = 0;

for (const [texto, esperado] of DEVE_QUEBRAR) {
  const itens = extrairItensDeLista(texto);
  if (itens.length !== esperado) {
    falhas += 1;
    console.error(`✗ esperava ${esperado} itens de ${JSON.stringify(texto)}, veio ${JSON.stringify(itens)}`);
  }
}

for (const texto of DEVE_FICAR_INTEIRO) {
  const itens = extrairItensDeLista(texto);
  if (itens.length !== 1) {
    falhas += 1;
    console.error(`✗ ${JSON.stringify(texto)} devia ficar inteiro, virou ${JSON.stringify(itens)}`);
  }
}

if (falhas > 0) {
  console.error(`\n${falhas} falha(s).`);
  process.exit(1);
}

console.log(`ok — ${DEVE_QUEBRAR.length} quebram, ${DEVE_FICAR_INTEIRO.length} ficam inteiras.`);
