"use client";

import { useState, useTransition } from "react";
import { formatarBRL, formatarBps } from "@/lib/money";
import { formatarData } from "@/lib/datas";
import { t } from "@/lib/i18n";
import { pagarImpostos, estornarPagamento, recalcularProvisoes } from "@/actions/impostos";

export type GuiaView = {
  id: string;
  descricaoReceita: string;
  cliente: string | null;
  competencia: string;
  vencimento: string | null;
  valorCentavos: number;
  aliquotaBps: number | null;
  anexo: string | null;
  vencida: boolean;
  /** A receita que gerou esta provisão já entrou na conta? */
  receitaRecebida: boolean;
};

export type PagamentoView = {
  id: string;
  descricao: string;
  data: string;
  valorCentavos: number;
  quantidade: number;
};

const hoje = () => new Date().toISOString().slice(0, 10);

export default function PainelImpostos({
  abertas,
  pagamentos,
  aoMudar,
}: {
  abertas: GuiaView[];
  pagamentos: PagamentoView[];
  /** Avisa a tela para refazer o fetch depois de pagar, estornar ou recalcular. */
  aoMudar: () => void;
}) {
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [data, setData] = useState(hoje());
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const total = abertas
    .filter((g) => selecao.has(g.id))
    .reduce((s, g) => s + g.valorCentavos, 0);

  const alternar = (id: string) =>
    setSelecao((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const todas = () =>
    setSelecao((s) =>
      s.size === abertas.length ? new Set() : new Set(abertas.map((g) => g.id))
    );

  // Atalho comum: quitar tudo que vence no mês corrente de uma vez.
  const selecionarVencidas = () =>
    setSelecao(new Set(abertas.filter((g) => g.vencida).map((g) => g.id)));

  const selecionarComLastro = () =>
    setSelecao(new Set(abertas.filter((g) => g.receitaRecebida).map((g) => g.id)));

  const semLastroSelecionadas = abertas.filter(
    (g) => selecao.has(g.id) && !g.receitaRecebida
  );

  function executar(fn: () => Promise<void>) {
    iniciar(async () => {
      setErro(null);
      setMsg(null);
      try {
        await fn();
        aoMudar();
      } catch (e) {
        setErro((e as Error).message);
      }
    });
  }

  return (
    <div className="grid gap-6">
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}
      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {msg}
        </div>
      )}

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            {t.taxPanel.provisoesAbertas(abertas.length)}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={selecionarVencidas} className="btn-ghost text-xs">
              {t.taxPanel.selecionarVencidas}
            </button>
            <button onClick={selecionarComLastro} className="btn-ghost text-xs">
              {t.taxPanel.selecionarComLastro}
            </button>
            <button
              onClick={() =>
                executar(async () => {
                  const r = await recalcularProvisoes();
                  setMsg(t.taxPanel.recalcularResultado(r.alterados, r.total));
                })
              }
              disabled={pendente}
              className="btn-ghost text-xs"
            >
              {t.taxPanel.recalcular}
            </button>
          </div>
        </div>

        {abertas.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t.taxPanel.vazioAbertas}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* Seis colunas com seleção não cabem no celular; abaixo de md a
                  linha vira cartão com a caixa de seleção maior. */}
              <table className="hidden w-full md:table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th w-8">
                      <input
                        type="checkbox"
                        checked={selecao.size === abertas.length && abertas.length > 0}
                        onChange={todas}
                      />
                    </th>
                    <th className="th">{t.taxPanel.thReceita}</th>
                    <th className="th">{t.taxPanel.thLastro}</th>
                    <th className="th">{t.taxPanel.thCompetencia}</th>
                    <th className="th">{t.taxPanel.thVencimento}</th>
                    <th className="th text-right">{t.taxPanel.thAliquota}</th>
                    <th className="th text-right">{t.taxPanel.thValor}</th>
                  </tr>
                </thead>
                <tbody>
                  {abertas.map((g) => (
                    <tr
                      key={g.id}
                      className={`cursor-pointer hover:bg-slate-50 ${
                        selecao.has(g.id) ? "bg-teal-50" : ""
                      }`}
                      onClick={() => alternar(g.id)}
                    >
                      <td className="td">
                        <input
                          type="checkbox"
                          checked={selecao.has(g.id)}
                          onChange={() => alternar(g.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="td">
                        <div className="font-medium text-navy-900">
                          {g.descricaoReceita}
                        </div>
                        {g.cliente && (
                          <div className="text-xs text-slate-500">{g.cliente}</div>
                        )}
                      </td>
                      <td className="td">
                        {g.receitaRecebida ? (
                          <span className="badge bg-emerald-100 text-emerald-700">
                            {t.taxPanel.badgeRecebida}
                          </span>
                        ) : (
                          <span
                            className="badge bg-amber-100 text-amber-800"
                            title={t.taxPanel.badgeAReceberTitle}
                          >
                            {t.taxPanel.badgeAReceber}
                          </span>
                        )}
                      </td>
                      <td className="td text-slate-600">{g.competencia}</td>
                      <td className="td">
                        <span
                          className={
                            g.vencida ? "font-medium text-red-600" : "text-slate-600"
                          }
                        >
                          {g.vencimento ?? "—"}
                        </span>
                      </td>
                      <td className="td num text-right text-slate-600">
                        {g.aliquotaBps !== null ? formatarBps(g.aliquotaBps) : t.taxPanel.manual}
                        {g.anexo && (
                          <span className="ml-1 text-xs text-slate-400">
                            {t.taxPanel.anexoAbrev(g.anexo)}
                          </span>
                        )}
                      </td>
                      <td className="td num text-right font-medium">
                        {formatarBRL(g.valorCentavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-slate-100 md:hidden">
                {abertas.map((g) => (
                  <li
                    key={g.id}
                    onClick={() => alternar(g.id)}
                    className={`flex cursor-pointer gap-3 p-3 ${
                      selecao.has(g.id) ? "bg-teal-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selecao.has(g.id)}
                      onChange={() => alternar(g.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-navy-900">
                        {g.descricaoReceita}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {g.receitaRecebida ? (
                          <span className="badge bg-emerald-100 text-emerald-700">
                            {t.taxPanel.badgeRecebida}
                          </span>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-800">
                            {t.taxPanel.badgeAReceber}
                          </span>
                        )}
                        <span>{g.competencia}</span>
                        <span className={g.vencida ? "font-medium text-red-600" : ""}>
                          {t.taxPanel.venceMobile(g.vencimento ?? "—")}
                        </span>
                      </div>
                      {g.cliente && (
                        <div className="mt-0.5 text-xs text-slate-400">{g.cliente}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="num text-sm font-medium">
                        {formatarBRL(g.valorCentavos)}
                      </div>
                      <div className="num text-xs text-slate-400">
                        {g.aliquotaBps !== null ? formatarBps(g.aliquotaBps) : t.taxPanel.manual}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {semLastroSelecionadas.length > 0 && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t.taxPanel.semLastroAviso(semLastroSelecionadas.length)}
                <strong>{t.taxPanel.semLastroAvisoBold}</strong>
                {t.taxPanel.semLastroAvisoFim}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-lg bg-slate-50 p-4">
              <div>
                <div className="text-xs text-slate-500">
                  {t.taxPanel.selecionadas(selecao.size)}
                </div>
                <div className="num text-2xl font-semibold text-navy-900">
                  {formatarBRL(total)}
                </div>
              </div>

              <div className="flex items-end gap-3">
                <div>
                  <label className="label">{t.taxPanel.dataPagamento}</label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="input"
                  />
                </div>
                <button
                  disabled={selecao.size === 0 || pendente}
                  onClick={() =>
                    executar(async () => {
                      await pagarImpostos([...selecao], data);
                      setMsg(
                        t.taxPanel.pagamentoRegistrado(
                          formatarBRL(total),
                          formatarData(new Date(`${data}T00:00:00Z`))
                        )
                      );
                      setSelecao(new Set());
                    })
                  }
                  className="btn-teal"
                >
                  {pendente ? t.taxPanel.registrando : t.taxPanel.registrarPagamento}
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">{t.taxPanel.pagamentoNota}</p>
          </>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
          {t.taxPanel.guiasPagas}
        </h2>

        {pagamentos.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t.taxPanel.vazioPagas}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">{t.taxPanel.thPagamento}</th>
                  <th className="th">{t.taxPanel.thData}</th>
                  <th className="th text-right">{t.taxPanel.thReceitas}</th>
                  <th className="th text-right">{t.taxPanel.thValor}</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td">{p.descricao}</td>
                    <td className="td text-slate-600">{p.data}</td>
                    <td className="td text-right text-slate-600">{p.quantidade}</td>
                    <td className="td num text-right font-medium">
                      {formatarBRL(p.valorCentavos)}
                    </td>
                    <td className="td text-right">
                      <button
                        onClick={() =>
                          executar(async () => {
                            await estornarPagamento(p.id);
                            setMsg(t.taxPanel.estornado);
                          })
                        }
                        disabled={pendente}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        {t.taxPanel.estornar}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
