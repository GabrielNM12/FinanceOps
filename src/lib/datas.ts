/**
 * Utilidades de data.
 *
 * Tudo é ancorado em UTC meia-noite. Se você usar o construtor local do JS,
 * um lançamento do dia 01 salvo em UTC-3 vira dia 30 do mês anterior quando lido
 * de volta — e o fechamento mensal passa a mentir uma vez por mês.
 */
import { intlLocale, t } from "@/lib/i18n";

export type Competencia = string; // "YYYY-MM"

export function dataUTC(ano: number, mes1a12: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes1a12 - 1, dia, 0, 0, 0, 0));
}

/** Normaliza qualquer Date para meia-noite UTC do mesmo dia civil. */
export function normalizar(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** "2026-08-10" (input type=date) -> Date UTC. Evita o parse local do JS. */
export function deInputDate(valor: string): Date {
  const [a, m, d] = valor.split("-").map(Number);
  return dataUTC(a, m, d);
}

/** Date -> "2026-08-10" para preencher input type=date. */
export function paraInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function competenciaDe(d: Date): Competencia {
  return d.toISOString().slice(0, 7);
}

export function inicioDaCompetencia(c: Competencia): Date {
  const [a, m] = c.split("-").map(Number);
  return dataUTC(a, m, 1);
}

/** Último instante do mês — use com `lte`. */
export function fimDaCompetencia(c: Competencia): Date {
  const [a, m] = c.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0, 23, 59, 59, 999));
}

export function somarMeses(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
}

export function competenciaSomar(c: Competencia, n: number): Competencia {
  const [a, m] = c.split("-").map(Number);
  return competenciaDe(dataUTC(a, m + n, 1));
}

/** Lista de competências de `de` até `ate`, inclusive. */
export function rangeCompetencias(de: Competencia, ate: Competencia): Competencia[] {
  const saida: Competencia[] = [];
  let atual = de;
  // Guard de 600 meses evita loop infinito se os argumentos vierem trocados.
  for (let i = 0; atual <= ate && i < 600; i++) {
    saida.push(atual);
    atual = competenciaSomar(atual, 1);
  }
  return saida;
}

/**
 * Janela do RBT12: os 12 meses ANTERIORES ao mês de referência.
 * O mês corrente não entra — é assim que a Receita calcula.
 */
export function janelaRBT12(referencia: Date): { de: Date; ate: Date } {
  const inicioMesRef = dataUTC(referencia.getUTCFullYear(), referencia.getUTCMonth() + 1, 1);
  const de = somarMeses(inicioMesRef, -12);
  const ate = new Date(inicioMesRef.getTime() - 1);
  return { de, ate };
}

/**
 * Vencimento do DAS: dia 20 do mês seguinte à competência.
 * Não ajusta para dia útil — isso varia e não vale a complexidade aqui.
 */
export function vencimentoDAS(competencia: Date, dia = 20): Date {
  return dataUTC(competencia.getUTCFullYear(), competencia.getUTCMonth() + 2, dia);
}

/** Resolve dia 31 em meses curtos usando o último dia disponível. */
export function diaDoMesSeguro(ano: number, mes1a12: number, dia: number): Date {
  const ultimo = new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate();
  return dataUTC(ano, mes1a12, Math.min(dia, ultimo));
}

export function formatarData(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString(intlLocale, { timeZone: "UTC" });
}

export function formatarCompetencia(c: Competencia): string {
  const [a, m] = c.split("-");
  return `${t.dates.monthsShort[Number(m) - 1]}/${a.slice(2)}`;
}
