"use client";

import { useState, useTransition } from "react";
import { formatarBRL } from "@/lib/money";
import { analisarCSV, confirmarImportacao, PreviewImportacao } from "@/actions/importacao";

/**
 * Importação em dois passos, sempre.
 *
 * Um CSV errado polui meses de histórico e não existe "desfazer" barato.
 * O preview mostra exatamente o que vai entrar, o que está duplicado e o que
 * tem erro — e só então grava.
 */
export default function Importador({ aoImportar }: { aoImportar?: () => void }) {
  const [preview, setPreview] = useState<PreviewImportacao | null>(null);
  const [provisionar, setProvisionar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="grid gap-6">
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}
      {resultado && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {resultado}
        </div>
      )}

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
          1. Selecione o arquivo
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            iniciar(async () => {
              setErro(null);
              setResultado(null);
              setPreview(null);
              try {
                setPreview(await analisarCSV(fd));
              } catch (e) {
                setErro((e as Error).message);
              }
            });
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <div className="min-w-[280px] flex-1">
            <label className="label">Arquivo CSV</label>
            <input
              type="file"
              name="arquivo"
              accept=".csv,text/csv"
              required
              className="input file:mr-3 file:rounded file:border-0 file:bg-navy-800 file:px-3 file:py-1 file:text-white"
            />
          </div>
          <button disabled={pendente} className="btn-ghost">
            {pendente ? "Analisando..." : "Analisar"}
          </button>
        </form>

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          <p className="mb-2 font-medium">Formato esperado</p>
          <p>
            Colunas reconhecidas (em qualquer ordem, nomes flexíveis):{" "}
            <code>data</code>, <code>descricao</code>, <code>valor</code>,{" "}
            <code>tipo</code>, <code>categoria</code>, <code>cliente</code>,{" "}
            <code>socio</code>, <code>natureza</code>, <code>data_caixa</code>,{" "}
            <code>observacoes</code>. Só <code>data</code> e <code>valor</code>{" "}
            são obrigatórias.
          </p>
          <p className="mt-2">
            <code>tipo</code> aceita <code>ENTRADA</code>, <code>SAIDA</code>,{" "}
            <code>DISTRIBUICAO</code> e <code>APORTE</code>. Em distribuição,{" "}
            <code>natureza</code> escolhe entre <code>LUCRO</code>,{" "}
            <code>PRO_LABORE</code> e <code>REEMBOLSO</code> — e a coluna{" "}
            <code>socio</code> passa a ser obrigatória, com o nome exatamente
            como está cadastrado.
          </p>
          <p className="mt-2">
            Aceita separador <code>;</code> ou <code>,</code>, valores como{" "}
            <code>1.234,56</code> e datas <code>dd/mm/aaaa</code>. Sem coluna{" "}
            <code>tipo</code>, valor negativo vira despesa. Deixe{" "}
            <code>data_caixa</code> vazio para o lançamento entrar como pendente.{" "}
            <a href="/api/export/modelo" className="underline">
              Baixar modelo
            </a>
          </p>
        </div>
      </section>

      {preview && (
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
            2. Confira antes de gravar — {preview.arquivo}
          </h2>

          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Contador titulo="Linhas" valor={preview.resumo.total} />
            <Contador titulo="Válidas" valor={preview.resumo.validas} tom="ok" />
            <Contador
              titulo="Já importadas"
              valor={preview.resumo.duplicadas}
              tom="aviso"
            />
            <Contador titulo="Com erro" valor={preview.resumo.comErro} tom="erro" />
          </div>

          {preview.resumo.duplicadas > 0 && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {preview.resumo.duplicadas} linha(s) já existem no banco (mesma data,
              valor e descrição) e serão puladas. É o que permite reimportar o extrato
              do mês inteiro sem duplicar nada.
            </p>
          )}

          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="th">#</th>
                  <th className="th">Data</th>
                  <th className="th">Descrição</th>
                  <th className="th">Tipo</th>
                  <th className="th">Categoria</th>
                  <th className="th">Cliente / Sócio</th>
                  <th className="th text-right">Valor</th>
                  <th className="th">Situação</th>
                </tr>
              </thead>
              <tbody>
                {preview.linhas.map((l) => (
                  <tr
                    key={l.linha}
                    className={
                      l.erro ? "bg-red-50" : l.duplicada ? "bg-slate-50 opacity-60" : ""
                    }
                  >
                    <td className="td text-xs text-slate-400">{l.linha}</td>
                    <td className="td whitespace-nowrap text-slate-600">
                      {l.data ? new Date(l.data).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
                    </td>
                    <td className="td">{l.descricao}</td>
                    <td className="td text-xs">
                      {
                        {
                          ENTRADA: "receita",
                          SAIDA: "despesa",
                          APORTE: "aporte",
                          DISTRIBUICAO:
                            l.natureza === "PRO_LABORE"
                              ? "pró-labore"
                              : l.natureza === "REEMBOLSO"
                                ? "reembolso"
                                : "lucro",
                        }[l.tipo]
                      }
                    </td>
                    <td className="td text-xs text-slate-500">{l.categoria ?? "—"}</td>
                    <td className="td text-xs text-slate-500">
                      {l.cliente ?? l.socio ?? "—"}
                    </td>
                    <td className="td num text-right">{formatarBRL(l.valorCentavos)}</td>
                    <td className="td text-xs">
                      {l.erro ? (
                        <span className="text-red-600">{l.erro}</span>
                      ) : l.duplicada ? (
                        <span className="text-amber-600">já importada</span>
                      ) : (
                        <span className="text-emerald-600">ok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={provisionar}
                onChange={(e) => setProvisionar(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Provisionar DAS sobre as receitas importadas
                <span className="block text-xs text-slate-500">
                  Desmarque só se o imposto dessas receitas já estiver lançado — senão
                  o mês entra sem imposto e o lucro fica inflado.
                </span>
              </span>
            </label>

            <button
              disabled={pendente || preview.resumo.validas === 0}
              onClick={() =>
                iniciar(async () => {
                  setErro(null);
                  try {
                    const r = await confirmarImportacao(preview.arquivo, preview.linhas, {
                      provisionarImposto: provisionar,
                    });
                    setResultado(
                      `${r.importadas} lançamento(s) importado(s), ${r.ignoradas} ignorado(s).`
                    );
                    setPreview(null);
                    aoImportar?.();
                  } catch (e) {
                    setErro((e as Error).message);
                  }
                })
              }
              className="btn-teal"
            >
              {pendente
                ? "Importando..."
                : `Importar ${preview.resumo.validas} lançamento(s)`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Contador({
  titulo,
  valor,
  tom = "neutro",
}: {
  titulo: string;
  valor: number;
  tom?: "neutro" | "ok" | "aviso" | "erro";
}) {
  const cor = {
    neutro: "text-navy-900",
    ok: "text-emerald-600",
    aviso: "text-amber-600",
    erro: "text-red-600",
  }[tom];
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{titulo}</div>
      <div className={`num text-xl font-semibold ${cor}`}>{valor}</div>
    </div>
  );
}
