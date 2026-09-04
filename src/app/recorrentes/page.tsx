"use client";

import { useRef } from "react";
import { RefreshCw } from "lucide-react";
import { PageTitle, Dinheiro, Secao, Vazio, Tag } from "@/components/ui";
import {
  EsqueletoRecorrentes,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useDados } from "@/hooks/useDados";
import { useAcao, Avisos } from "@/hooks/useAcao";
import {
  criarRecorrente,
  excluirRecorrente,
  alternarRecorrente,
  gerarRecorrentesAgora,
} from "@/actions/cadastros";
import { formatarData } from "@/lib/datas";
import { t } from "@/lib/i18n";

type Dados = {
  totais: { entradaCentavos: number; saidaCentavos: number };
  recorrentes: {
    id: string;
    descricao: string;
    tipo: string;
    valorCentavos: number;
    categoria: string | null;
    diaVencimento: number;
    inicio: string;
    fim: string | null;
    ativo: boolean;
    gerados: number;
  }[];
  categorias: { id: string; nome: string }[];
};

export default function RecorrentesPage() {
  const { dados, erro, carregando, atualizando, recarregar, tentarNovamente } =
    useDados<Dados>("/api/ui/recorrentes");
  const acao = useAcao(recarregar);
  const form = useRef<HTMLFormElement>(null);

  const cabecalho = (
    <PageTitle
      titulo={t.recurring.title}
      descricao={t.recurring.subtitle}
      acao={
        <button
          disabled={acao.pendente || carregando}
          onClick={() =>
            acao.executar(async () => {
              const r = await gerarRecorrentesAgora();
              return r.criados === 0
                ? t.recurring.nadaPendente
                : t.recurring.gerados(r.criados);
            })
          }
          className="btn-ghost"
        >
          <RefreshCw size={15} /> {t.recurring.gerarAgora}
        </button>
      }
    />
  );

  if (erro) {
    return (
      <>
        {cabecalho}
        <ErroCarregamento mensagem={erro} onTentarNovamente={tentarNovamente} />
      </>
    );
  }

  if (carregando || !dados) {
    return (
      <>
        {cabecalho}
        <EsqueletoRecorrentes />
      </>
    );
  }

  const { totais } = dados;

  return (
    <>
      <BarraAtualizando ativo={atualizando || acao.pendente} />
      {cabecalho}
      <Avisos erro={acao.erro} mensagem={acao.mensagem} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {t.recurring.kpiSaidas}
          </div>
          <div className="num mt-1 text-2xl font-semibold text-red-600">
            <Dinheiro centavos={totais.saidaCentavos} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {t.recurring.kpiEntradas}
          </div>
          <div className="num mt-1 text-2xl font-semibold text-emerald-600">
            <Dinheiro centavos={totais.entradaCentavos} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {t.recurring.kpiResultado}
          </div>
          <div className="num mt-1 text-2xl font-semibold text-navy-900">
            <Dinheiro centavos={totais.entradaCentavos - totais.saidaCentavos} sinal />
          </div>
        </div>
      </div>

      <Secao titulo={t.recurring.novo}>
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            acao.executar(async () => {
              await criarRecorrente(fd);
              form.current?.reset();
              return t.recurring.criado;
            });
          }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-2">
            <label className="label">{t.recurring.fDescricao}</label>
            <input
              name="descricao"
              required
              className="input"
              placeholder={t.recurring.phDescricao}
            />
          </div>
          <div>
            <label className="label">{t.recurring.fTipo}</label>
            <select name="tipo" className="input">
              <option value="SAIDA">{t.recurring.optSaida}</option>
              <option value="ENTRADA">{t.recurring.optEntrada}</option>
            </select>
          </div>
          <div>
            <label className="label">{t.recurring.fValor}</label>
            <input name="valor" required className="input" placeholder={t.recurring.phValor} />
          </div>
          <div>
            <label className="label">{t.recurring.fCategoria}</label>
            <select name="categoriaId" className="input">
              <option value="">—</option>
              {dados.categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t.recurring.fDiaVencimento}</label>
            <input
              name="diaVencimento"
              type="number"
              min={1}
              max={31}
              defaultValue={5}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t.recurring.fInicio}</label>
            <input
              type="date"
              name="inicio"
              required
              className="input"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="label">{t.recurring.fFim}</label>
            <input type="date" name="fim" className="input" />
          </div>
          <div className="lg:col-span-4">
            <button disabled={acao.pendente} className="btn-teal">
              {acao.pendente ? t.common.saving : t.recurring.criarRecorrente}
            </button>
            <p className="mt-2 text-xs text-slate-500">{t.recurring.novoNota}</p>
          </div>
        </form>
      </Secao>

      <div className="mt-6">
        {dados.recorrentes.length === 0 ? (
          <Vazio>{t.recurring.vazio}</Vazio>
        ) : (
          <div className="card overflow-x-auto">
            <table className="hidden w-full md:table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">{t.recurring.thDescricao}</th>
                  <th className="th">{t.recurring.thCategoria}</th>
                  <th className="th">{t.recurring.thVencimento}</th>
                  <th className="th">{t.recurring.thPeriodo}</th>
                  <th className="th text-right">{t.recurring.thValor}</th>
                  <th className="th text-right">{t.recurring.thGerados}</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {dados.recorrentes.map((r) => (
                  <tr key={r.id} className={r.ativo ? "" : "opacity-50"}>
                    <td className="td">
                      <div className="font-medium text-navy-900">{r.descricao}</div>
                      <Tag cor={r.tipo === "ENTRADA" ? "#16a34a" : "#ef4444"}>
                        {r.tipo === "ENTRADA" ? t.recurring.tagEntrada : t.recurring.tagSaida}
                      </Tag>
                    </td>
                    <td className="td text-slate-600">{r.categoria ?? "—"}</td>
                    <td className="td text-slate-600">{t.recurring.dia(r.diaVencimento)}</td>
                    <td className="td text-xs text-slate-500">
                      {formatarData(new Date(r.inicio))} →{" "}
                      {r.fim ? formatarData(new Date(r.fim)) : t.recurring.semFim}
                    </td>
                    <td className="td text-right font-medium">
                      <Dinheiro centavos={r.valorCentavos} />
                    </td>
                    <td className="td text-right text-slate-500">{r.gerados}</td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button
                          disabled={acao.pendente}
                          onClick={() =>
                            acao.executar(() => alternarRecorrente(r.id, !r.ativo))
                          }
                          className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          {r.ativo ? t.recurring.pausar : t.recurring.reativar}
                        </button>
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => excluirRecorrente(r.id))}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          {t.common.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-slate-100 md:hidden">
              {dados.recorrentes.map((r) => (
                <li key={r.id} className={`p-3 ${r.ativo ? "" : "opacity-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-navy-900">
                        {r.descricao}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <Tag cor={r.tipo === "ENTRADA" ? "#16a34a" : "#ef4444"}>
                          {r.tipo === "ENTRADA" ? t.recurring.tagEntrada : t.recurring.tagSaida}
                        </Tag>
                        <span>{t.recurring.dia(r.diaVencimento)}</span>
                        {r.categoria && <span>· {r.categoria}</span>}
                        <span>· {t.recurring.geradosLabel(r.gerados)}</span>
                      </div>
                    </div>
                    <Dinheiro centavos={r.valorCentavos} className="shrink-0 font-medium" />
                  </div>

                  <div className="mt-2 flex justify-end gap-1">
                    <button
                      disabled={acao.pendente}
                      onClick={() => acao.executar(() => alternarRecorrente(r.id, !r.ativo))}
                      className="rounded px-3 py-1.5 text-xs text-slate-600 active:bg-slate-100"
                    >
                      {r.ativo ? t.recurring.pausar : t.recurring.reativar}
                    </button>
                    <button
                      disabled={acao.pendente}
                      onClick={() => acao.executar(() => excluirRecorrente(r.id))}
                      className="rounded px-3 py-1.5 text-xs text-red-600 active:bg-red-50"
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">{t.recurring.notaRodape}</p>
    </>
  );
}
