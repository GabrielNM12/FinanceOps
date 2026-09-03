/**
 * Dinheiro em centavos (Int) e percentual em basis points (Int).
 *
 * Regra: nenhum valor monetário existe como Float em lugar nenhum do sistema,
 * exceto no instante da formatação para tela. Float acumula erro e em relatório
 * financeiro isso vira divergência de centavos que ninguém consegue explicar.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_COMPACTO = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 123456 -> "R$ 1.234,56" */
export function formatarBRL(centavos: number): string {
  return BRL.format(centavos / 100);
}

/** 123456789 -> "R$ 1,2 mi" — para rótulos de gráfico. */
export function formatarBRLCompacto(centavos: number): string {
  return BRL_COMPACTO.format(centavos / 100);
}

/** 600 -> "6,00%" */
export function formatarBps(bps: number): string {
  return `${(bps / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Converte o que o usuário digitou em centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56", "1234".
 *
 * A ambiguidade real é "1.234": ponto como milhar (pt-BR) ou decimal (en-US)?
 * Resolvemos pela posição: ponto/vírgula seguido de exatamente 2 dígitos no fim
 * é decimal; caso contrário é separador de milhar.
 */
export function parseCentavos(entrada: string | number): number {
  if (typeof entrada === "number") {
    if (!Number.isFinite(entrada)) throw new Error("Valor inválido");
    return Math.round(entrada * 100);
  }

  let s = entrada.trim().replace(/R\$\s*/gi, "").replace(/\s/g, "");
  if (!s) return 0;

  const negativo = s.startsWith("-") || /^\(.*\)$/.test(s);
  s = s.replace(/[-()]/g, "");

  const temVirgula = s.includes(",");
  const temPonto = s.includes(".");

  if (temVirgula && temPonto) {
    // O último separador que aparece é o decimal.
    s = s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else if (temVirgula) {
    s = s.replace(",", ".");
  } else if (temPonto) {
    // "1.234" = milhar; "1.23" = decimal.
    const casas = s.length - s.lastIndexOf(".") - 1;
    if (casas === 3) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Valor monetário inválido: "${entrada}"`);

  const centavos = Math.round(n * 100);
  return negativo ? -centavos : centavos;
}

/** "6,00" | "6" | "6%" -> 600 bps */
export function parseBps(entrada: string | number): number {
  if (typeof entrada === "number") return Math.round(entrada * 100);
  const s = entrada.trim().replace("%", "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Percentual inválido: "${entrada}"`);
  return Math.round(n * 100);
}

/** Aplica uma alíquota em bps sobre um valor em centavos. Arredonda uma vez só. */
export function aplicarBps(centavos: number, bps: number): number {
  return Math.round((centavos * bps) / 10_000);
}

/**
 * Divide `centavos` em `partes` sem perder nem criar centavo.
 * O resto é distribuído 1 centavo por vez, do primeiro ao último.
 * rateioIgual(100, 3) -> [34, 33, 33]
 */
export function rateioIgual(centavos: number, partes: number): number[] {
  if (partes <= 0) return [];
  const base = Math.trunc(centavos / partes);
  const resto = centavos - base * partes;
  return Array.from({ length: partes }, (_, i) => base + (i < Math.abs(resto) ? Math.sign(resto) : 0));
}

/**
 * Divide `centavos` proporcionalmente a `pesos`, preservando o total exato.
 * Usa maiores restos (Hare/Niemeyer) — o método menos injusto para rateio.
 */
export function rateioProporcional(centavos: number, pesos: number[]): number[] {
  const total = pesos.reduce((s, p) => s + p, 0);
  if (total <= 0) return rateioIgual(centavos, pesos.length);

  const exatos = pesos.map((p) => (centavos * p) / total);
  const pisos = exatos.map(Math.floor);
  let sobra = centavos - pisos.reduce((s, v) => s + v, 0);

  const ordem = exatos
    .map((v, i) => ({ i, resto: v - Math.floor(v) }))
    .sort((a, b) => b.resto - a.resto);

  const saida = [...pisos];
  for (let k = 0; sobra > 0 && k < ordem.length; k++, sobra--) saida[ordem[k].i] += 1;
  return saida;
}
