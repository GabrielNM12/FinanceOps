"use client";

import { useState, useTransition } from "react";
import { formatarBRL } from "@/lib/money";
import { formatarData } from "@/lib/datas";
import { t } from "@/lib/i18n";
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
          {t.importer.passo1}
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
            <label className="label">{t.importer.arquivoCsv}</label>
            <input
              type="file"
              name="arquivo"
              accept=".csv,text/csv"
              required
              className="input file:mr-3 file:rounded file:border-0 file:bg-navy-800 file:px-3 file:py-1 file:text-white"
            />
          </div>
          <button disabled={pendente} className="btn-ghost">
            {pendente ? t.importer.analisando : t.importer.analisar}
          </button>
        </form>

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          <p className="mb-2 font-medium">{t.importer.formatoTitulo}</p>
          <p>
            {t.importer.formatoP1Pre}
            <code>data</code>, <code>descricao</code>, <code>valor</code>,{" "}
            <code>tipo</code>, <code>categoria</code>, <code>cliente</code>,{" "}
            <code>socio</code>, <code>natureza</code>, <code>data_caixa</code>,{" "}
            <code>observacoes</code>
            {t.importer.formatoP1Pos}
            <code>data</code> / <code>valor</code>
            {t.importer.formatoP1Fim}
          </p>
          <p className="mt-2">
            <code>tipo</code>
            {t.importer.formatoP2Pre}
            <code>ENTRADA</code>, <code>SAIDA</code>, <code>DISTRIBUICAO</code>,{" "}
            <code>APORTE</code>
            {t.importer.formatoP2Meio}
            <code>natureza</code>
            {t.importer.formatoP2MeioB}
            <code>LUCRO</code>, <code>PRO_LABORE</code>, <code>REEMBOLSO</code>
            {t.importer.formatoP2Fim}
          </p>
          <p className="mt-2">
            {t.importer.formatoP3}
            <a href="/api/export/modelo" className="underline">
              {t.importer.baixarModelo}
            </a>
          </p>
        </div>
      </section>

      {preview && (
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
            {t.importer.passo2(preview.arquivo)}
          </h2>

          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Contador titulo={t.importer.contLinhas} valor={preview.resumo.total} />
            <Contador titulo={t.importer.contValidas} valor={preview.resumo.validas} tom="ok" />
            <Contador
              titulo={t.importer.contJaImportadas}
              valor={preview.resumo.duplicadas}
              tom="aviso"
            />
            <Contador titulo={t.importer.contComErro} valor={preview.resumo.comErro} tom="erro" />
          </div>

          {preview.resumo.duplicadas > 0 && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t.importer.duplicadasAviso(preview.resumo.duplicadas)}
            </p>
          )}

          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="th">{t.importer.thHash}</th>
                  <th className="th">{t.importer.thData}</th>
                  <th className="th">{t.importer.thDescricao}</th>
                  <th className="th">{t.importer.thTipo}</th>
                  <th className="th">{t.importer.thCategoria}</th>
                  <th className="th">{t.importer.thClienteSocio}</th>
                  <th className="th text-right">{t.importer.thValor}</th>
                  <th className="th">{t.importer.thSituacao}</th>
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
                      {l.data ? formatarData(new Date(l.data)) : "—"}
                    </td>
                    <td className="td">{l.descricao}</td>
                    <td className="td text-xs">
                      {
                        {
                          ENTRADA: t.importer.tipoReceita,
                          SAIDA: t.importer.tipoDespesa,
                          APORTE: t.importer.tipoAporte,
                          DISTRIBUICAO:
                            l.natureza === "PRO_LABORE"
                              ? t.importer.tipoProLabore
                              : l.natureza === "REEMBOLSO"
                                ? t.importer.tipoReembolso
                                : t.importer.tipoLucro,
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
                        <span className="text-amber-600">{t.importer.jaImportada}</span>
                      ) : (
                        <span className="text-emerald-600">{t.importer.ok}</span>
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
                {t.importer.provisionarLabel}
                <span className="block text-xs text-slate-500">
                  {t.importer.provisionarSub}
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
                    setResultado(t.importer.resultado(r.importadas, r.ignoradas));
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
                ? t.importer.importando
                : t.importer.importarN(preview.resumo.validas)}
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
