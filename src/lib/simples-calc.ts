/**
 * Núcleo puro do cálculo do Simples Nacional.
 *
 * Não importa Prisma nem nada de I/O de propósito: é este arquivo que os testes
 * exercitam, e a aritmética precisa ser verificável sem subir banco. O
 * `simples.ts` é a casca que busca os dados e chama estas funções.
 *
 * >>> As faixas NÃO ficam aqui. <<< Elas vivem na tabela fin_faixa_simples
 * porque legislação muda, e recompilar o app por causa disso seria um erro.
 */

export type Anexo = "III" | "V";

/** Fator R mínimo para se enquadrar no Anexo III: 28,00%. */
export const LIMITE_FATOR_R_BPS = 2800;

/**
 * Alíquota efetiva, em basis points.
 *
 *     efetiva = (RBT12 × nominal − dedução) / RBT12
 *
 * Sem RBT12 (empresa no primeiro faturamento) não há base para a fórmula, então
 * aplica-se a nominal da primeira faixa.
 */
export function aliquotaEfetivaPura(
  rbt12Centavos: number,
  aliquotaNominalBps: number,
  deducaoCentavos: number
): number {
  if (rbt12Centavos <= 0) return aliquotaNominalBps;
  const bruto = (rbt12Centavos * aliquotaNominalBps) / 10_000;
  return Math.max(0, Math.round(((bruto - deducaoCentavos) / rbt12Centavos) * 10_000));
}

/** folha ÷ receita, em bps. null quando não há receita para dividir. */
export function fatorRBps(folha12Centavos: number, rbt12Centavos: number): number | null {
  if (rbt12Centavos <= 0) return null;
  return Math.round((folha12Centavos / rbt12Centavos) * 10_000);
}

export function anexoPorFatorR(fatorBps: number | null): Anexo {
  if (fatorBps === null) return "III";
  return fatorBps >= LIMITE_FATOR_R_BPS ? "III" : "V";
}

/** Quanto ainda falta de folha, nos 12 meses, para alcançar os 28%. */
export function faltaParaAnexoIII(folha12Centavos: number, rbt12Centavos: number): number {
  const alvo = Math.ceil((rbt12Centavos * LIMITE_FATOR_R_BPS) / 10_000);
  return Math.max(0, alvo - folha12Centavos);
}

/**
 * RBT12 proporcionalizado para empresa com menos de 12 meses de atividade.
 * Sem isso, uma empresa nova fica artificialmente na 1ª faixa por um ano e a
 * alíquota dá um salto no 13º mês.
 */
export function rbt12Proporcional(totalCentavos: number, mesesAtivos: number): number {
  if (mesesAtivos <= 0) return 0;
  if (mesesAtivos >= 12) return totalCentavos;
  return Math.round((totalCentavos / mesesAtivos) * 12);
}
