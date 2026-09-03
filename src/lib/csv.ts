import { createHash } from "crypto";
import { parseCentavos } from "./money";
import { dataUTC } from "./datas";

/**
 * CSV sem dependência externa.
 *
 * Duas dores específicas do Brasil que justificam não usar um parser genérico:
 *  - Excel pt-BR salva com ";" e não com ",";
 *  - o mesmo arquivo traz "1.234,56", e um parser en-US lê isso como 1.234.
 * Por isso detectamos o delimitador e delegamos o valor ao parseCentavos.
 */

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function detectarDelimitador(texto: string): string {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? "";
  const candidatos = [";", ",", "\t", "|"];
  let melhor = ",";
  let max = -1;
  for (const d of candidatos) {
    const n = primeiraLinha.split(d).length - 1;
    if (n > max) {
      max = n;
      melhor = d;
    }
  }
  return melhor;
}

/** Parser RFC4180: aspas duplas, "" como escape, quebra de linha dentro de campo. */
export function parseCSV(texto: string, delimitador?: string): string[][] {
  const t = texto.replace(/^﻿/, ""); // BOM do Excel
  const d = delimitador ?? detectarDelimitador(t);

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"';
          i++;
        } else dentroDeAspas = false;
      } else campo += c;
      continue;
    }

    if (c === '"') dentroDeAspas = true;
    else if (c === d) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c !== "\r") campo += c;
  }

  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((v) => v.trim() !== ""));
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd e dd/mm/aa. */
export function parseDataBR(valor: string): Date | null {
  const s = valor.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return dataUTC(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let ano = +m[3];
    if (ano < 100) ano += ano < 70 ? 2000 : 1900;
    return dataUTC(ano, +m[2], +m[1]);
  }

  return null;
}

/**
 * Hash de deduplicação.
 *
 * Só entram campos que identificam o fato econômico: data, valor e descrição
 * normalizada. Categoria e cliente ficam de fora de propósito — se você
 * reclassificar um lançamento e reimportar o extrato, não queremos que ele
 * volte como se fosse novo.
 *
 * Limitação conhecida: duas cobranças idênticas no mesmo dia e mesmo valor
 * (ex.: duas assinaturas iguais) colidem, e a segunda é ignorada. O sufixo
 * `ocorrencia` existe para isso — o importador incrementa em caso de repetição
 * dentro do mesmo arquivo.
 */
export function hashLinha(
  data: string,
  valorCentavos: number,
  descricao: string,
  ocorrencia = 0
): string {
  const normalizada = descricao
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256")
    .update(`${data}|${valorCentavos}|${normalizada}|${ocorrencia}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Mapeamento
// ---------------------------------------------------------------------------

export const COLUNAS_ESPERADAS = [
  "data",
  "descricao",
  "valor",
  "tipo",
  "categoria",
  "cliente",
  "socio",
  "natureza",
  "data_caixa",
  "observacoes",
] as const;

export type ColunaEsperada = (typeof COLUNAS_ESPERADAS)[number];

// `natureza` NÃO é sinônimo de `tipo`: são colunas distintas desde que o
// importador passou a aceitar DISTRIBUICAO. `tipo` diz o que a linha é;
// `natureza` qualifica a distribuição (lucro, pró-labore ou reembolso).
const SINONIMOS: Record<ColunaEsperada, string[]> = {
  data: ["data", "date", "data lancamento", "data competencia", "dt", "data mov"],
  descricao: ["descricao", "historico", "description", "memo", "lancamento", "detalhe"],
  valor: ["valor", "amount", "value", "montante", "vlr", "valor (r$)"],
  tipo: ["tipo", "type", "d/c", "debito/credito"],
  categoria: ["categoria", "category", "classificacao"],
  cliente: ["cliente", "customer", "obra"],
  socio: ["socio", "sócio", "partner", "pago por", "beneficiario"],
  natureza: ["natureza", "nature", "subtipo"],
  data_caixa: ["data caixa", "data pagamento", "data recebimento", "pagamento", "liquidacao"],
  observacoes: ["observacoes", "obs", "notes", "comentario"],
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Adivinha o índice de cada coluna esperada a partir do cabeçalho. */
export function mapearColunas(cabecalho: string[]): Partial<Record<ColunaEsperada, number>> {
  const norm = cabecalho.map(normalizar);
  const mapa: Partial<Record<ColunaEsperada, number>> = {};

  for (const col of COLUNAS_ESPERADAS) {
    const idx = norm.findIndex((h) => SINONIMOS[col].includes(h));
    if (idx >= 0) mapa[col] = idx;
  }
  // Fallback: casa por prefixo quando o nome exato não bate.
  for (const col of COLUNAS_ESPERADAS) {
    if (mapa[col] !== undefined) continue;
    const idx = norm.findIndex((h) => SINONIMOS[col].some((s) => h.startsWith(s)));
    if (idx >= 0) mapa[col] = idx;
  }
  return mapa;
}

export type TipoLinha = "ENTRADA" | "SAIDA" | "DISTRIBUICAO" | "APORTE";
export type NaturezaLinha = "LUCRO" | "PRO_LABORE" | "REEMBOLSO";

export type LinhaPreview = {
  linha: number;
  data: Date | null;
  dataCaixa: Date | null;
  descricao: string;
  valorCentavos: number;
  tipo: TipoLinha;
  categoria: string | null;
  cliente: string | null;
  socio: string | null;
  natureza: NaturezaLinha | null;
  observacoes: string | null;
  hash: string;
  erro: string | null;
};

const TIPOS_ENTRADA = ["entrada", "credito", "crédito", "c", "receita", "recebimento"];
const TIPOS_SAIDA = ["saida", "saída", "debito", "débito", "d", "despesa", "pagamento"];
const TIPOS_DISTRIBUICAO = ["distribuicao", "distribuição", "distribuicao de lucros", "lucro", "pro labore", "pro-labore", "prolabore", "reembolso"];
const TIPOS_APORTE = ["aporte", "aporte de capital", "capital"];
// Transferência não se importa solta: ela precisa estar amarrada a um movimento
// de caixinha, senão vira uma linha órfã que ninguém sabe de onde veio.
const TIPOS_TRANSFERENCIA = ["transferencia", "transferência", "aplicacao", "aplicação", "resgate"];

/** Deduz a natureza a partir do próprio `tipo` quando a coluna não vem. */
function inferirNatureza(tipoRaw: string, naturezaRaw: string): NaturezaLinha {
  const t = naturezaRaw || tipoRaw;
  if (["pro labore", "pro-labore", "prolabore", "pro_labore"].includes(t)) return "PRO_LABORE";
  if (t === "reembolso") return "REEMBOLSO";
  return "LUCRO";
}

/**
 * Converte o CSV em linhas prontas para revisão.
 * Nada é gravado aqui — a tela mostra o preview e só então confirma.
 *
 * Regra de sinal: se houver coluna `tipo`, ela manda. Senão, valor negativo
 * vira SAIDA e positivo vira ENTRADA (convenção da maioria dos extratos).
 *
 * DISTRIBUICAO e APORTE exigem a coluna `socio` preenchida — sem saber quem
 * recebeu, o painel de sócios (o motivo de o sistema existir) fica sem sentido.
 */
export function prepararImportacao(texto: string): {
  cabecalho: string[];
  mapa: Partial<Record<ColunaEsperada, number>>;
  linhas: LinhaPreview[];
} {
  const grade = parseCSV(texto);
  if (grade.length === 0) return { cabecalho: [], mapa: {}, linhas: [] };

  const [cabecalho, ...corpo] = grade;
  const mapa = mapearColunas(cabecalho);
  const vistos = new Map<string, number>();

  // Se o arquivo TEM a coluna data_caixa, célula vazia significa "ainda não
  // liquidado" e o lançamento entra como pendente. Se o arquivo NÃO tem a
  // coluna (extrato bancário cru), tudo que está lá já aconteceu, então a data
  // do lançamento vale como data de caixa.
  const temColunaCaixa = mapa.data_caixa !== undefined;

  const linhas: LinhaPreview[] = corpo.map((cols, i) => {
    const pega = (c: ColunaEsperada) =>
      mapa[c] !== undefined ? (cols[mapa[c]!] ?? "").trim() : "";

    const dataRaw = pega("data");
    const descricao = pega("descricao") || "(sem descrição)";
    const valorRaw = pega("valor");
    const tipoRaw = normalizar(pega("tipo"));

    let erro: string | null = null;
    const data = parseDataBR(dataRaw);
    if (!data) erro = `Data inválida: "${dataRaw}"`;

    let valorCentavos = 0;
    try {
      valorCentavos = parseCentavos(valorRaw);
    } catch {
      erro = erro ?? `Valor inválido: "${valorRaw}"`;
    }

    const naturezaRaw = normalizar(pega("natureza"));
    const socio = pega("socio") || null;

    let tipo: TipoLinha;
    if (tipoRaw) {
      if (TIPOS_ENTRADA.includes(tipoRaw)) tipo = "ENTRADA";
      else if (TIPOS_APORTE.includes(tipoRaw)) tipo = "APORTE";
      else if (TIPOS_DISTRIBUICAO.includes(tipoRaw)) tipo = "DISTRIBUICAO";
      else if (TIPOS_TRANSFERENCIA.includes(tipoRaw)) {
        tipo = "SAIDA";
        erro =
          erro ??
          "Transferência não pode ser importada. Registre pela tela de Caixinhas, que grava o movimento e o extrato juntos.";
      } else if (TIPOS_SAIDA.includes(tipoRaw)) tipo = "SAIDA";
      else {
        tipo = valorCentavos < 0 ? "SAIDA" : "ENTRADA";
        erro = erro ?? `Tipo desconhecido: "${pega("tipo")}"`;
      }
    } else {
      tipo = valorCentavos < 0 ? "SAIDA" : "ENTRADA";
    }
    valorCentavos = Math.abs(valorCentavos);

    const natureza =
      tipo === "DISTRIBUICAO" ? inferirNatureza(tipoRaw, naturezaRaw) : null;

    if (valorCentavos === 0 && !erro) erro = "Valor zerado";

    // Sem sócio, uma distribuição não responde "quem recebeu o quê" — que é o
    // problema que este sistema existe para resolver. Melhor barrar na entrada.
    if ((tipo === "DISTRIBUICAO" || tipo === "APORTE") && !socio && !erro) {
      erro = `${tipo === "APORTE" ? "Aporte" : "Distribuição"} sem a coluna "socio" preenchida`;
    }

    // O sócio entra na chave: quatro distribuições de mesmo valor no mesmo dia
    // são fatos distintos, não repetição.
    const chaveDedupe = socio ? `${descricao} ${socio}` : descricao;
    const chaveBase = `${dataRaw}|${valorCentavos}|${chaveDedupe}`;
    const ocorrencia = vistos.get(chaveBase) ?? 0;
    vistos.set(chaveBase, ocorrencia + 1);

    return {
      linha: i + 2, // +1 do cabeçalho, +1 porque planilha começa em 1
      data,
      dataCaixa: temColunaCaixa ? parseDataBR(pega("data_caixa")) : data,
      descricao,
      valorCentavos,
      tipo,
      categoria: pega("categoria") || null,
      cliente: pega("cliente") || null,
      socio,
      natureza,
      observacoes: pega("observacoes") || null,
      hash: hashLinha(dataRaw, valorCentavos, chaveDedupe, ocorrencia),
      erro,
    };
  });

  return { cabecalho, mapa, linhas };
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

function escapar(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Gera CSV com ";" e BOM UTF-8 — é o que faz o Excel pt-BR abrir o arquivo
 * com acentos corretos e colunas separadas sem passar pelo assistente.
 * Valores saem como "1234,56" (vírgula decimal) para o Excel entender número.
 */
export function gerarCSV(linhas: Record<string, unknown>[], colunas?: string[]): string {
  if (linhas.length === 0) return "﻿";
  const cols = colunas ?? Object.keys(linhas[0]);
  const corpo = linhas.map((l) => cols.map((c) => escapar(l[c])).join(";"));
  return "﻿" + [cols.join(";"), ...corpo].join("\r\n");
}

/** 123456 -> "1234,56" — formato numérico que o Excel pt-BR reconhece. */
export function centavosParaCSV(centavos: number): string {
  const sinal = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  return `${sinal}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
