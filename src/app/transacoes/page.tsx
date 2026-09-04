"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Search, X } from "lucide-react";
import { PageTitle, Dinheiro, Tag, Vazio } from "@/components/ui";
import FormLancamento from "@/components/FormLancamento";
import {
  EsqueletoLancamentos,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useDados } from "@/hooks/useDados";
import { useAcao, Avisos } from "@/hooks/useAcao";
import { confirmarCaixa, desfazerCaixa, excluirTransacao } from "@/actions/transacoes";
import { formatarData } from "@/lib/datas";
import { rota } from "@/lib/rotas";
import { t } from "@/lib/i18n";

const TIPOS: Record<string, { label: string; cor: string }> = {
  ENTRADA: { label: t.transactions.tipoReceita, cor: "#16a34a" },
  SAIDA: { label: t.transactions.tipoDespesa, cor: "#ef4444" },
  DISTRIBUICAO: { label: t.transactions.tipoDistribuicao, cor: "#f59e0b" },
  APORTE: { label: t.transactions.tipoAporte, cor: "#8b5cf6" },
  TRANSFERENCIA: { label: t.transactions.tipoTransferencia, cor: "#64748b" },
};

type Opcao = { id: string; nome: string };

type Dados = {
  total: number;
  truncado: boolean;
  limite: number;
  transacoes: {
    id: string;
    tipo: string;
    descricao: string;
    valorCentavos: number;
    dataCompetencia: string;
    dataCaixa: string | null;
    cliente: string | null;
    categoria: string | null;
    socio: string | null;
    recorrente: boolean;
    impostoCentavos: number;
    caixinha: { nome: string; tipo: string } | null;
    criadoPor: string | null;
  }[];
  opcoes: {
    clientes: Opcao[];
    categoriasEntrada: Opcao[];
    categoriasSaida: Opcao[];
    socios: Opcao[];
  };
};

type Filtros = { q: string; tipo: string; cliente: string; status: string };
const VAZIO: Filtros = { q: "", tipo: "", cliente: "", status: "" };

export default function TransacoesPage() {
  const [filtros, setFiltros] = useState<Filtros>(VAZIO);
  // `aplicados` só muda quando o usuário confirma a busca — assim cada tecla
  // digitada não dispara um fetch.
  const [aplicados, setAplicados] = useState<Filtros>(VAZIO);

  const qs = new URLSearchParams(
    Object.entries(aplicados).filter(([, v]) => v !== "")
  ).toString();

  const { dados, erro, carregando, atualizando, recarregar, tentarNovamente } =
    useDados<Dados>(`/api/ui/transacoes${qs ? `?${qs}` : ""}`);

  const acao = useAcao(recarregar);

  const cabecalho = (
    <PageTitle
      titulo={t.transactions.title}
      descricao={t.transactions.subtitle}
      acao={
        <Link href="/api/export/transacoes" className="btn-ghost">
          <Download size={15} /> {t.transactions.exportCsv}
        </Link>
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
        <EsqueletoLancamentos />
      </>
    );
  }

  const temFiltro = Object.values(aplicados).some((v) => v !== "");

  return (
    <>
      <BarraAtualizando ativo={atualizando || acao.pendente} />
      {cabecalho}
      <Avisos erro={acao.erro} mensagem={acao.mensagem} />

      <FormLancamento {...dados.opcoes} aoSalvar={recarregar} />

      <form
        className="card mb-4 flex flex-wrap items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setAplicados(filtros);
        }}
      >
        <div className="min-w-[180px] flex-1">
          <label className="label">{t.transactions.filtroBuscar}</label>
          <input
            value={filtros.q}
            onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
            className="input"
            placeholder={t.transactions.filtroBuscarPlaceholder}
          />
        </div>
        <div>
          <label className="label">{t.transactions.filtroTipo}</label>
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className="input"
          >
            <option value="">{t.transactions.optTodos}</option>
            <option value="ENTRADA">{t.transactions.optReceitas}</option>
            <option value="SAIDA">{t.transactions.optDespesas}</option>
            <option value="DISTRIBUICAO">{t.transactions.optDistribuicoes}</option>
            <option value="APORTE">{t.transactions.optAportes}</option>
            <option value="TRANSFERENCIA">{t.transactions.optTransferencias}</option>
          </select>
        </div>
        <div>
          <label className="label">{t.transactions.filtroCliente}</label>
          <select
            value={filtros.cliente}
            onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
            className="input"
          >
            <option value="">{t.transactions.optTodos}</option>
            {dados.opcoes.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t.transactions.filtroSituacao}</label>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="input"
          >
            <option value="">{t.transactions.optTodasSituacoes}</option>
            <option value="pendente">{t.transactions.optPendentes}</option>
            <option value="liquidado">{t.transactions.optLiquidadas}</option>
          </select>
        </div>
        <button className="btn-ghost">
          <Search size={15} /> {t.transactions.filtrar}
        </button>
        {temFiltro && (
          <button
            type="button"
            onClick={() => {
              setFiltros(VAZIO);
              setAplicados(VAZIO);
            }}
            className="flex items-center gap-1 text-sm text-slate-500 underline"
          >
            <X size={13} /> {t.common.clear}
          </button>
        )}
      </form>

      {dados.transacoes.length === 0 ? (
        <Vazio>
          {temFiltro ? (
            t.transactions.vazioComFiltro
          ) : (
            <>
              {t.transactions.vazioPre} <strong>{t.transactions.vazioNovo}</strong>{" "}
              {t.transactions.vazioMeio}{" "}
              <Link href={rota("importar")} className="underline">
                {t.transactions.vazioLink}
              </Link>
              .
            </>
          )}
        </Vazio>
      ) : (
        <div className="card overflow-x-auto">
          {/* Oito colunas não cabem num celular. Abaixo de md a mesma informação
              vira cartão, com o valor em destaque e as ações no rodapé. */}
          <table className="hidden w-full md:table">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">{t.transactions.thCompetencia}</th>
                <th className="th">{t.transactions.thDescricao}</th>
                <th className="th">{t.transactions.thTipo}</th>
                <th className="th">{t.transactions.thClienteCategoria}</th>
                <th className="th text-right">{t.transactions.thValor}</th>
                <th className="th text-right">{t.transactions.thImposto}</th>
                <th className="th">{t.transactions.thCaixa}</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {dados.transacoes.map((tx) => {
                const meta = TIPOS[tx.tipo] ?? { label: tx.tipo, cor: "#64748b" };
                // Numa transferência, o sinal depende da direção: guardar sai da
                // conta, resgatar volta para ela.
                const entrada =
                  tx.tipo === "ENTRADA" ||
                  tx.tipo === "APORTE" ||
                  (tx.tipo === "TRANSFERENCIA" && tx.caixinha?.tipo === "RESGATE");

                return (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="td whitespace-nowrap text-slate-500">
                      {formatarData(new Date(tx.dataCompetencia))}
                    </td>
                    <td className="td">
                      <div className="font-medium text-navy-900">{tx.descricao}</div>
                      {tx.socio && (
                        <div className="text-xs text-slate-500">
                          {tx.tipo === "SAIDA" ? t.transactions.pagoPor : ""}
                          {tx.socio}
                        </div>
                      )}
                      {tx.recorrente && (
                        <div className="text-xs text-slate-400">{t.transactions.recorrente}</div>
                      )}
                      {tx.criadoPor && (
                        <div className="text-xs text-slate-400">
                          {t.transactions.lancadoPor(tx.criadoPor)}
                        </div>
                      )}
                      {tx.caixinha && (
                        <div className="text-xs text-slate-400">
                          {tx.caixinha.tipo === "DEPOSITO" ? "→ " : "← "}
                          {tx.caixinha.nome}
                        </div>
                      )}
                    </td>
                    <td className="td">
                      <Tag cor={meta.cor}>{meta.label}</Tag>
                    </td>
                    <td className="td text-slate-600">
                      {tx.cliente ?? "—"}
                      {tx.categoria && (
                        <div className="text-xs text-slate-400">{tx.categoria}</div>
                      )}
                    </td>
                    <td className="td text-right font-medium">
                      <Dinheiro
                        centavos={entrada ? tx.valorCentavos : -tx.valorCentavos}
                        sinal
                      />
                    </td>
                    <td className="td text-right text-slate-500">
                      {tx.impostoCentavos > 0 ? (
                        <Dinheiro centavos={tx.impostoCentavos} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td whitespace-nowrap">
                      {tx.dataCaixa ? (
                        <span className="text-xs text-emerald-700">
                          {formatarData(new Date(tx.dataCaixa))}
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800">
                          {t.transactions.pendente}
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        {tx.dataCaixa ? (
                          <button
                            disabled={acao.pendente}
                            onClick={() => acao.executar(() => desfazerCaixa(tx.id))}
                            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                            title={t.transactions.marcarPendente}
                          >
                            {t.transactions.desfazer}
                          </button>
                        ) : (
                          <button
                            disabled={acao.pendente}
                            onClick={() => acao.executar(() => confirmarCaixa(tx.id))}
                            className="rounded px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                          >
                            {t.transactions.confirmar}
                          </button>
                        )}
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => excluirTransacao(tx.id))}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          {t.common.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="divide-y divide-slate-100 md:hidden">
            {dados.transacoes.map((tx) => {
              const meta = TIPOS[tx.tipo] ?? { label: tx.tipo, cor: "#64748b" };
              const entrada =
                tx.tipo === "ENTRADA" ||
                tx.tipo === "APORTE" ||
                (tx.tipo === "TRANSFERENCIA" && tx.caixinha?.tipo === "RESGATE");

              return (
                <li key={tx.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-navy-900">
                        {tx.descricao}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <Tag cor={meta.cor}>{meta.label}</Tag>
                        <span>{formatarData(new Date(tx.dataCompetencia))}</span>
                        {tx.cliente && <span>· {tx.cliente}</span>}
                        {tx.categoria && <span>· {tx.categoria}</span>}
                      </div>
                      {(tx.socio || tx.caixinha || tx.criadoPor) && (
                        <div className="mt-1 text-xs text-slate-400">
                          {tx.socio && `${tx.tipo === "SAIDA" ? t.transactions.pagoPor : ""}${tx.socio}`}
                          {tx.caixinha &&
                            `${tx.caixinha.tipo === "DEPOSITO" ? "→ " : "← "}${tx.caixinha.nome}`}
                          {tx.criadoPor && (
                            <span className="block">{t.transactions.lancadoPor(tx.criadoPor)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <Dinheiro
                        centavos={entrada ? tx.valorCentavos : -tx.valorCentavos}
                        sinal
                        className="font-medium"
                      />
                      {tx.impostoCentavos > 0 && (
                        <div className="text-xs text-slate-400">
                          {t.transactions.impostoLabel} <Dinheiro centavos={tx.impostoCentavos} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {tx.dataCaixa ? (
                      <span className="text-xs text-emerald-700">
                        {t.transactions.liquidado(formatarData(new Date(tx.dataCaixa)))}
                      </span>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-800">{t.transactions.pendente}</span>
                    )}

                    <div className="ml-auto flex gap-1">
                      {tx.dataCaixa ? (
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => desfazerCaixa(tx.id))}
                          className="rounded px-3 py-1.5 text-xs text-slate-500 active:bg-slate-100"
                        >
                          {t.transactions.desfazer}
                        </button>
                      ) : (
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => confirmarCaixa(tx.id))}
                          className="rounded px-3 py-1.5 text-xs font-medium text-teal-700 active:bg-teal-50"
                        >
                          {t.transactions.confirmar}
                        </button>
                      )}
                      <button
                        disabled={acao.pendente}
                        onClick={() => acao.executar(() => excluirTransacao(tx.id))}
                        className="rounded px-3 py-1.5 text-xs text-red-600 active:bg-red-50"
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {dados.truncado && (
        <p className="mt-3 text-xs text-slate-500">
          {t.transactions.truncado(dados.limite, dados.total)}
        </p>
      )}
    </>
  );
}
