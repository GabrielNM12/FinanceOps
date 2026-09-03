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
      titulo="Recorrentes"
      descricao="Regras que geram lançamentos automaticamente todo mês."
      acao={
        <button
          disabled={acao.pendente || carregando}
          onClick={() =>
            acao.executar(async () => {
              const r = await gerarRecorrentesAgora();
              return r.criados === 0
                ? "Nada pendente — todos os meses vencidos já foram gerados."
                : `${r.criados} lançamento(s) gerado(s).`;
            })
          }
          className="btn-ghost"
        >
          <RefreshCw size={15} /> Gerar pendentes agora
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
            Saídas fixas / mês
          </div>
          <div className="num mt-1 text-2xl font-semibold text-red-600">
            <Dinheiro centavos={totais.saidaCentavos} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Entradas fixas / mês
          </div>
          <div className="num mt-1 text-2xl font-semibold text-emerald-600">
            <Dinheiro centavos={totais.entradaCentavos} />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Resultado fixo / mês
          </div>
          <div className="num mt-1 text-2xl font-semibold text-navy-900">
            <Dinheiro centavos={totais.entradaCentavos - totais.saidaCentavos} sinal />
          </div>
        </div>
      </div>

      <Secao titulo="Novo recorrente">
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            acao.executar(async () => {
              await criarRecorrente(fd);
              form.current?.reset();
              return "Recorrente criado. Os meses já vencidos foram gerados.";
            });
          }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="lg:col-span-2">
            <label className="label">Descrição</label>
            <input
              name="descricao"
              required
              className="input"
              placeholder="Google Workspace"
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select name="tipo" className="input">
              <option value="SAIDA">Saída</option>
              <option value="ENTRADA">Entrada</option>
            </select>
          </div>
          <div>
            <label className="label">Valor</label>
            <input name="valor" required className="input" placeholder="245,00" />
          </div>
          <div>
            <label className="label">Categoria</label>
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
            <label className="label">Dia do vencimento</label>
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
            <label className="label">Início</label>
            <input
              type="date"
              name="inicio"
              required
              className="input"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="label">Fim (opcional)</label>
            <input type="date" name="fim" className="input" />
          </div>
          <div className="lg:col-span-4">
            <button disabled={acao.pendente} className="btn-teal">
              {acao.pendente ? "Salvando..." : "Criar recorrente"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Ao salvar, os meses já vencidos desde a data de início são gerados na
              hora, como lançamentos pendentes de pagamento.
            </p>
          </div>
        </form>
      </Secao>

      <div className="mt-6">
        {dados.recorrentes.length === 0 ? (
          <Vazio>Nenhum recorrente cadastrado.</Vazio>
        ) : (
          <div className="card overflow-x-auto">
            <table className="hidden w-full md:table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Descrição</th>
                  <th className="th">Categoria</th>
                  <th className="th">Vencimento</th>
                  <th className="th">Período</th>
                  <th className="th text-right">Valor</th>
                  <th className="th text-right">Gerados</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {dados.recorrentes.map((r) => (
                  <tr key={r.id} className={r.ativo ? "" : "opacity-50"}>
                    <td className="td">
                      <div className="font-medium text-navy-900">{r.descricao}</div>
                      <Tag cor={r.tipo === "ENTRADA" ? "#16a34a" : "#ef4444"}>
                        {r.tipo === "ENTRADA" ? "entrada" : "saída"}
                      </Tag>
                    </td>
                    <td className="td text-slate-600">{r.categoria ?? "—"}</td>
                    <td className="td text-slate-600">dia {r.diaVencimento}</td>
                    <td className="td text-xs text-slate-500">
                      {formatarData(new Date(r.inicio))} →{" "}
                      {r.fim ? formatarData(new Date(r.fim)) : "sem fim"}
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
                          {r.ativo ? "pausar" : "reativar"}
                        </button>
                        <button
                          disabled={acao.pendente}
                          onClick={() => acao.executar(() => excluirRecorrente(r.id))}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          excluir
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
                          {r.tipo === "ENTRADA" ? "entrada" : "saída"}
                        </Tag>
                        <span>dia {r.diaVencimento}</span>
                        {r.categoria && <span>· {r.categoria}</span>}
                        <span>· {r.gerados} gerados</span>
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
                      {r.ativo ? "pausar" : "reativar"}
                    </button>
                    <button
                      disabled={acao.pendente}
                      onClick={() => acao.executar(() => excluirRecorrente(r.id))}
                      className="rounded px-3 py-1.5 text-xs text-red-600 active:bg-red-50"
                    >
                      excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Os lançamentos são materializados como registros reais, não calculados na
        hora. Isso permite editar o valor do mês (a conta de luz nunca vem igual) e
        faz o histórico bater com o extrato bancário. Excluir a regra não apaga os
        lançamentos já gerados.
      </p>
    </>
  );
}
