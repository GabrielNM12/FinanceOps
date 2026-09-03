"use client";

import { useState, useTransition } from "react";
import { Download, AlertTriangle, Check } from "lucide-react";
import { analisarBackup, restaurarBackup, PreviewBackup } from "@/actions/backup";
import { ROTULOS, ORDEM_INSERCAO, type DadosBackup } from "@/lib/backup";

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
            1. Selecione o backup
          </h2>
          <a href="/api/export/backup" className="btn-ghost text-xs">
            <Download size={14} /> Baixar backup de agora
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
            <label className="label">Arquivo .json</label>
            <input
              type="file"
              name="arquivo"
              accept=".json,application/json"
              required
              className="input file:mr-3 file:rounded file:border-0 file:bg-navy-800 file:px-3 file:py-1 file:text-white"
            />
          </div>
          <button disabled={pendente} className="btn-ghost">
            {pendente ? "Lendo..." : "Analisar"}
          </button>
        </form>

        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          O backup completo carrega <strong>tudo</strong>: sócios, clientes,
          categorias, caixinhas, recorrentes, lançamentos e as provisões de imposto
          com a alíquota que valia na época. O CSV de lançamentos, ao lado, não faz
          isso — ele recalcularia o DAS com as regras de hoje.
        </p>
      </section>

      {preview && (
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-600">
            2. Confira antes de gravar
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            {preview.arquivo} · gerado em{" "}
            {new Date(preview.geradoEm).toLocaleString("pt-BR")} · versão{" "}
            {preview.versao}
          </p>

          {preview.problemas.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <strong>Backup inconsistente.</strong>
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
                  <th className="th">Tabela</th>
                  <th className="th text-right">No banco hoje</th>
                  <th className="th text-right">No backup</th>
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
                <strong>Substituir tudo</strong> — restauração de verdade
                <span className="block text-xs text-slate-500">
                  Apaga o conteúdo atual e recria o banco a partir do arquivo. O
                  resultado fica idêntico ao original, IDs inclusive.
                </span>
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
                <strong>Mesclar</strong> — só o que falta
                <span className="block text-xs text-slate-500">
                  Insere apenas registros que ainda não existem. Nada é
                  sobrescrito: um lançamento editado depois do backup fica como
                  está.
                </span>
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
                Entendo que os{" "}
                <strong>
                  {Object.values(preview.atual).reduce((s, n) => s + n, 0)} registros
                </strong>{" "}
                que estão no banco agora serão apagados e substituídos pelo conteúdo
                deste arquivo. Não há desfazer.
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
                        ? `Banco restaurado: ${r.total} registros gravados.`
                        : `${r.total} registro(s) inserido(s), ${r.totalPulado} já existiam e foram mantidos.`
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
                "Restaurando..."
              ) : (
                <>
                  <Check size={15} />{" "}
                  {modo === "SUBSTITUIR" ? "Substituir tudo" : "Mesclar"}
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
