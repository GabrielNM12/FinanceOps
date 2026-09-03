/**
 * Regras de caixa — puras, sem banco, para poderem ser testadas e para existir
 * um único lugar onde cada definição mora.
 */

// ---------------------------------------------------------------------------
// CAIXA LIVRE
// ---------------------------------------------------------------------------

/**
 * CAIXA LIVRE = saldo em CONTA − imposto provisionado sobre receita JÁ RECEBIDA
 *
 * O que NÃO entra:
 *
 * - **Imposto sobre receita a receber.** Uma nota faturada e não paga não
 *   colocou dinheiro na conta, então o imposto dela não pode tirar. Quando o
 *   cliente pagar, os dois entram juntos.
 *
 * - **Dinheiro nas caixinhas.** Não precisa ser descontado aqui porque já saiu
 *   da conta: guardar é uma transferência de bolso, e `saldoContaCentavos` já
 *   vem líquido do que está guardado. Descontar de novo contaria duas vezes.
 *
 * ⚠ O PREÇO DA PRIMEIRA REGRA: o DAS vence pelo faturamento, não pelo
 * recebimento. Se o cliente atrasar, a guia vence do mesmo jeito. Por isso
 * `impostoSobreAReceberCentavos` continua exposto na tela — a obrigação não
 * some, ela só deixa de reduzir o que é distribuível hoje.
 */
export type ComposicaoCaixa = {
  /** Dinheiro na conta corrente, já líquido do que está nas caixinhas. */
  saldoContaCentavos: number;
  /** Provisões em aberto cuja receita já entrou. Reduz o caixa livre. */
  impostoSobreRecebidoCentavos: number;
  /** Provisões em aberto sobre receita ainda não recebida. NÃO reduz. */
  impostoSobreAReceberCentavos: number;
  /** Total nas caixinhas. Informativo — não entra no caixa livre. */
  guardadoCentavos: number;
};

export function caixaLivre(c: ComposicaoCaixa): number {
  return c.saldoContaCentavos - c.impostoSobreRecebidoCentavos;
}

/** Conta + caixinhas. É o dinheiro total da empresa. */
export function patrimonio(c: ComposicaoCaixa): number {
  return c.saldoContaCentavos + c.guardadoCentavos;
}

/** Total de imposto em aberto, para exibição. Nunca use isto no caixa livre. */
export function impostoEmAberto(c: ComposicaoCaixa): number {
  return c.impostoSobreRecebidoCentavos + c.impostoSobreAReceberCentavos;
}

/**
 * O caixa livre que existiria se todas as receitas em aberto fossem recebidas
 * e os impostos correspondentes provisionados. Mostra se a folga de hoje
 * sobrevive quando o dinheiro — e a conta do governo — chegar.
 */
export function caixaLivreProjetado(
  c: ComposicaoCaixa,
  aReceberCentavos: number
): number {
  return caixaLivre(c) + aReceberCentavos - c.impostoSobreAReceberCentavos;
}

// ---------------------------------------------------------------------------
// CAIXINHAS
// ---------------------------------------------------------------------------

export type MovimentoSimples = { tipo: string; valorCentavos: number };

/**
 * Saldo de uma caixinha = depósitos − resgates.
 *
 * O saldo nunca é armazenado. Ver o comentário no schema: um total gravado
 * dessincronizado mente para sempre e ninguém percebe.
 */
export function saldoCaixinha(movimentos: MovimentoSimples[]): number {
  return movimentos.reduce(
    (s, m) => s + (m.tipo === "DEPOSITO" ? m.valorCentavos : -m.valorCentavos),
    0
  );
}

export type ProgressoMeta = {
  /** 0 a 10000 (bps). Limitado a 100% para a barra não estourar. */
  percentualBps: number;
  faltaCentavos: number;
  atingida: boolean;
};

export function progressoMeta(
  saldoCentavos: number,
  metaCentavos: number | null
): ProgressoMeta | null {
  if (!metaCentavos || metaCentavos <= 0) return null;
  const bruto = Math.round((saldoCentavos / metaCentavos) * 10_000);
  return {
    percentualBps: Math.max(0, Math.min(10_000, bruto)),
    faltaCentavos: Math.max(0, metaCentavos - saldoCentavos),
    atingida: saldoCentavos >= metaCentavos,
  };
}

/**
 * Valida um movimento antes de gravar. Devolve a mensagem de erro ou null.
 *
 * Depósito acima do saldo em conta é quase sempre erro de digitação, e deixar
 * passar cria um saldo em conta negativo que não existe no banco. Resgate acima
 * do saldo da caixinha é sempre erro — não dá para tirar o que não está lá.
 */
export function validarMovimento(
  tipo: "DEPOSITO" | "RESGATE",
  valorCentavos: number,
  saldoContaCentavos: number,
  saldoCaixinhaCentavos: number
): string | null {
  if (valorCentavos <= 0) return "Informe um valor maior que zero.";

  if (tipo === "DEPOSITO" && valorCentavos > saldoContaCentavos) {
    return `Saldo em conta insuficiente: há ${brl(
      saldoContaCentavos
    )} disponível e você tentou guardar ${brl(valorCentavos)}.`;
  }
  if (tipo === "RESGATE" && valorCentavos > saldoCaixinhaCentavos) {
    return `A caixinha tem ${brl(saldoCaixinhaCentavos)}; não é possível resgatar ${brl(
      valorCentavos
    )}.`;
  }
  return null;
}

function brl(centavos: number) {
  return `R$ ${(centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
