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

const TIPOS: Record<string, { label: string; cor: string }> = {
  ENTRADA: { label: "Receita", cor: "#16a34a" },
  SAIDA: { label: "Despesa", cor: "#ef4444" },
  DISTRIBUICAO: { label: "Distribuição", cor: "#f59e0b" },
  APORTE: { label: "Aporte", cor: "#8b5cf6" },
  TRANSFERENCIA: { label: "Transferência", cor: "#64748b" },
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
      titulo="Lançamentos"
      descricao="Todo o movimento de caixa da empresa, em ordem de competência."
      acao={
        <Link href="/api/export/transacoes" className="btn-ghost">
          <Download size={15} /> Exportar CSV
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
          <label className="label">Buscar</label>
          <input
            value={filtros.q}
            onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
            className="input"
            placeholder="descrição..."
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className="input"
          >
            <option value="">Todos</option>
            <option value="ENTRADA">Receitas</option>
            <option value="SAIDA">Despesas</option>
            <option value="DISTRIBUICAO">Distribuições</option>
            <option value="APORTE">Aportes</option>
            <option value="TRANSFERENCIA">Transferências</option>
          </select>
        </div>
        <div>
          <label className="label">Cliente</label>
          <select
            value={filtros.cliente}
            onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
            className="input"
          >
            <option value="">Todos</option>
            {dados.opcoes.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Situação</label>
          <select
            value={filtros.status}
            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
            className="input"
          >
            <option value="">Todas</option>
            <option value="pendente">Pendentes</option>
            <option value="liquidado">Liquidadas</option>
          </select>
        </div>
        <button className="btn-ghost">
          <Search size={15} /> Filtrar
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
            <X size={13} /> limpar
          </button>
        )}
      </form>

      {dados.transacoes.length === 0 ? (
        <Vazio>
          {temFiltro ? (
            "Nenhum lançamento com esses filtros."
          ) : (
            <>
              Nenhum lançamento ainda. Use <strong>Novo lançamento</strong> acima ou
              importe um extrato em{" "}
              <Link href="/importar" className="underline">
                Importar
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
                <th className="th">Competência</th>
                <th className="th">Descrição</th>
                <th className="th">Tipo</th>
                <th className="th">Cliente / Categoria</th>
                <th className="th text-right">Valor</th>
                <th className="th text-right">Imposto</th>
                <th className="th">Caixa</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {dados.transacoes.map((t) => {
                const meta = TIPOS[t.tipo] ?? { label: t.tipo, cor: "#64748b" };
                // Numa transferência, o sinal depende da direção: guardar sai da
                // conta, resgatar volta para ela.
                const entrada =
                  t.tipo === "ENTRADA" ||
                  t.tipo === "APORTE" ||
                  (t.tipo === "TRANSFERENCIA" && t.caixinha?.tipo === "RESGATE");

                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="td whitespace-nowrap text-slate-500">
                      {formatarData(new Date(t.dataCompetencia))}
                    </td>
                    <td className="td">
                      <div className="font-medium text-navy-900">{t.descricao}</div>
                      {t.socio && (
                        <div className="text-xs text-slate-500">
                          {t.tipo === "SAIDA" ? "pago por " : ""}
                          {t.socio}
                        </div>
                      )}
                      {t.recorrente && (
                        <div className="text-xs text-slate-400">recorrente</div>
                      )}
                      {t.criadoPor && (
                        <div className="text-xs text-slate-400">
                          lançado por {t.criadoPor}
                        </div>
                      )}
                      {t.caixinha && (
                        <div className="text-xs text-slate-400">
                          {t.caixinha.tipo === "DEPOSITO" ? "→ " : "← "}
                          {t.caixinha.nome}
                        </div>
                      )}
                    </td>
                    <td className="td">
                      <Tag cor={meta.cor}>{meta.label}</Tag>
                    </td>
                    <td className="td text-slate-600">
                      {t.cliente ?? "—"}
                      {t.categoria && (
                        <div className="text-xs text-slate-400">{t.categoria}</div>
                      )}
                    </td>
                    <td className="td text-right font-medium">
                      <Dinheiro
                        centavos={entrada ? t.valorCentavos : -t.valorCentavos}
                        sinal
                      />
                    </td>
                    <td className="td text-right text-slate-500">
                      {t.impostoCentavos > 0 ? (
                        <Dinheiro centavos={t.impostoCentavos} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td whitespace-nowrap">
                      {t.dataCaixa ? (
                        <span className="text-xs text-emerald-700">
                          {formatarData(new Date(t.dataCaixa))}
                        </span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800">
                          pendente
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        {t.dataCaixa ? (
                          <button
                            disabled={acao.pendente}
                            onClick={() => acao.executar(() => desfazerCaixa(t.id))}
                            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                            title="Marcar como pendente"
                          >
                            desfazer
                          </button>
                        ) : (
                          <button
                            disabled={acao.pendente}
                            onClick={() => acao.executar(() => confirmarCaixa(t.id))}
                            className="rounded px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                          >
                            confirmar
                          </button>
                        )}
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => excluirTransacao(t.id))}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="divide-y divide-slate-100 md:hidden">
            {dados.transacoes.map((t) => {
              const meta = TIPOS[t.tipo] ?? { label: t.tipo, cor: "#64748b" };
              const entrada =
                t.tipo === "ENTRADA" ||
                t.tipo === "APORTE" ||
                (t.tipo === "TRANSFERENCIA" && t.caixinha?.tipo === "RESGATE");

              return (
                <li key={t.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-navy-900">
                        {t.descricao}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <Tag cor={meta.cor}>{meta.label}</Tag>
                        <span>{formatarData(new Date(t.dataCompetencia))}</span>
                        {t.cliente && <span>· {t.cliente}</span>}
                        {t.categoria && <span>· {t.categoria}</span>}
                      </div>
                      {(t.socio || t.caixinha || t.criadoPor) && (
                        <div className="mt-1 text-xs text-slate-400">
                          {t.socio && `${t.tipo === "SAIDA" ? "pago por " : ""}${t.socio}`}
                          {t.caixinha &&
                            `${t.caixinha.tipo === "DEPOSITO" ? "→ " : "← "}${t.caixinha.nome}`}
                          {t.criadoPor && (
                            <span className="block">lançado por {t.criadoPor}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <Dinheiro
                        centavos={entrada ? t.valorCentavos : -t.valorCentavos}
                        sinal
                        className="font-medium"
                      />
                      {t.impostoCentavos > 0 && (
                        <div className="text-xs text-slate-400">
                          imposto <Dinheiro centavos={t.impostoCentavos} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {t.dataCaixa ? (
                      <span className="text-xs text-emerald-700">
                        liquidado {formatarData(new Date(t.dataCaixa))}
                      </span>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-800">pendente</span>
                    )}

                    <div className="ml-auto flex gap-1">
                      {t.dataCaixa ? (
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => desfazerCaixa(t.id))}
                          className="rounded px-3 py-1.5 text-xs text-slate-500 active:bg-slate-100"
                        >
                          desfazer
                        </button>
                      ) : (
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => confirmarCaixa(t.id))}
                          className="rounded px-3 py-1.5 text-xs font-medium text-teal-700 active:bg-teal-50"
                        >
                          confirmar
                        </button>
                      )}
                      <button
                        disabled={acao.pendente}
                        onClick={() => acao.executar(() => excluirTransacao(t.id))}
                        className="rounded px-3 py-1.5 text-xs text-red-600 active:bg-red-50"
                      >
                        excluir
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
          Mostrando {dados.limite} de {dados.total} lançamentos. Use os filtros para
          refinar.
        </p>
      )}
    </>
  );
}
