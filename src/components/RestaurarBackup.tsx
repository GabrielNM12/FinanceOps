"use client";

import { useState, useTransition } from "react";
import { Download, AlertTriangle, Check } from "lucide-react";
import { analisarBackup, restaurarBackup, PreviewBackup } from "@/actions/backup";
import { ROTULOS, ORDEM_INSERCAO, type DadosBackup } from "@/lib/backup";
import { formatarData } from "@/lib/datas";
import { t } from "@/lib/i18n";

/**
 * Restauração em dois passos, como a importação de CSV — mas com o aviso mais
 * forte, porque "substituir" apaga tudo que existe hoje.
 */
export default function RestaurarBackup({ aoRestaurar }: { aoRestaurar?: () => void }) {
  const [preview, setPreview] = useState<PreviewBackup | null>(null);
  const [modo, setModo] = useState<"SUBSTITUIR" | "MESCLAR">("SUBSTITUIR");
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const bancoVazio =
    preview && Object.values(preview.atual).every((n) => n === 0);

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            {t.restore.passo1}
          </h2>
          <a href="/api/export/backup" className="btn-ghost text-xs">
            <Download size={14} /> {t.restore.baixarAgora}
          </a>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            iniciar(async () => {
              setErro(null);
              setResultado(null);
              setPreview(null);
              setConfirmado(false);
              try {
                setPreview(await analisarBackup(fd));
              } catch (err) {
                setErro((err as Error).message);
              }
            });
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <div className="min-w-[280px] flex-1">
            <label className="label">{t.restore.arquivoJson}</label>
            <input
              type="file"
              name="arquivo"
              accept=".json,application/json"
              required
              className="input file:mr-3 file:rounded file:border-0 file:bg-navy-800 file:px-3 file:py-1 file:text-white"
            />
          </div>
          <button disabled={pendente} className="btn-ghost">
            {pendente ? t.restore.lendo : t.restore.analisar}
          </button>
        </form>

        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          {t.restore.explica}
        </p>
      </section>

      {preview && (
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-600">
            {t.restore.passo2}
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            {t.restore.meta(
              preview.arquivo,
              formatarData(new Date(preview.geradoEm)),
              preview.versao
            )}
          </p>

          {preview.problemas.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <strong>{t.restore.inconsistente}</strong>
              <ul className="mt-1 list-disc pl-4">
                {preview.problemas.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.avisos.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {preview.avisos.map((a, i) => (
                <div key={i}>{a}</div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">{t.restore.thTabela}</th>
                  <th className="th text-right">{t.restore.thNoBanco}</th>
                  <th className="th text-right">{t.restore.thNoBackup}</th>
                </tr>
              </thead>
              <tbody>
                {ORDEM_INSERCAO.map((k) => {
                  const atual = preview.atual[k] ?? 0;
                  const entrando = preview.entrando[k] ?? 0;
                  if (atual === 0 && entrando === 0) return null;
                  return (
                    <tr key={k}>
                      <td className="td">{ROTULOS[k as keyof DadosBackup]}</td>
                      <td className="td num text-right text-slate-500">{atual}</td>
                      <td className="td num text-right font-medium">{entrando}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3">
            <label
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                modo === "SUBSTITUIR"
                  ? "border-navy-800 bg-navy-50/40"
                  : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                checked={modo === "SUBSTITUIR"}
                onChange={() => {
                  setModo("SUBSTITUIR");
                  setConfirmado(false);
                }}
                className="mt-0.5"
              />
              <span className="text-sm">
                <strong>{t.restore.modoSubstituirTitulo}</strong>{" "}
                {t.restore.modoSubstituirDesc}
              </span>
            </label>

            <label
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                modo === "MESCLAR" ? "border-navy-800 bg-navy-50/40" : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                checked={modo === "MESCLAR"}
                onChange={() => {
                  setModo("MESCLAR");
                  setConfirmado(false);
                }}
                className="mt-0.5"
              />
              <span className="text-sm">
                <strong>{t.restore.modoMesclarTitulo}</strong>{" "}
                {t.restore.modoMesclarDesc}
              </span>
            </label>
          </div>

          {modo === "SUBSTITUIR" && !bancoVazio && (
            <label className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <AlertTriangle size={13} className="mr-1 inline" />
                {t.restore.confirmacao(
                  Object.values(preview.atual).reduce((s, n) => s + n, 0)
                )}
              </span>
            </label>
          )}

          <div className="mt-5 flex justify-end">
            <button
              disabled={
                pendente ||
                preview.problemas.length > 0 ||
                (modo === "SUBSTITUIR" && !bancoVazio && !confirmado)
              }
              onClick={() =>
                iniciar(async () => {
                  setErro(null);
                  try {
                    const r = await restaurarBackup(preview.conteudo, modo);
                    setResultado(
                      r.modo === "SUBSTITUIR"
                        ? t.restore.resultadoSubstituir(r.total)
                        : t.restore.resultadoMesclar(r.total, r.totalPulado)
                    );
                    setPreview(null);
                    setConfirmado(false);
                    aoRestaurar?.();
                  } catch (err) {
                    setErro((err as Error).message);
                  }
                })
              }
              className="btn-teal"
            >
              {pendente ? (
                t.restore.restaurando
              ) : (
                <>
                  <Check size={15} />{" "}
                  {modo === "SUBSTITUIR" ? t.restore.substituirTudo : t.restore.mesclar}
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
