"use client";

import Link from "next/link";
import { PageTitle, Kpi, Secao, Aviso, Dinheiro } from "@/components/ui";
import {
  GraficoFluxoMensal,
  GraficoPizzaCategorias,
  GraficoReceitaPorCliente,
  GraficoDistribuicaoSocios,
  GraficoProjecaoCaixa,
} from "@/components/graficos-lazy";
import {
  EsqueletoDashboard,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useDados } from "@/hooks/useDados";
import { useAcao, Avisos } from "@/hooks/useAcao";
import { formatarCompetencia } from "@/lib/datas";
import { iconeDe } from "@/lib/caixinha-icones";
import { formatarBRL, formatarBps } from "@/lib/money";
import { useState } from "react";

const LIMITE_FATOR_R_BPS = 2800;

type Dados = {
  regime: "CAIXA" | "COMPETENCIA";
  meses: number;
  mesAtual: string;
  caixa: {
    saldoContaCentavos: number;
    impostoSobreRecebidoCentavos: number;
    impostoSobreAReceberCentavos: number;
    impostoProvisionadoCentavos: number;
    guardadoCentavos: number;
    patrimonioCentavos: number;
    caixaLivreCentavos: number;
    caixaLivreProjetadoCentavos: number;
    aReceberCentavos: number;
    aPagarCentavos: number;
  };
  mes: {
    faturadoCentavos: number;
    impostoCentavos: number;
    despesaCentavos: number;
    lucroCentavos: number;
    distribuidoCentavos: number;
    retidoCentavos: number;
  };
  serie: {
    competencia: string;
    faturadoCentavos: number;
    despesaCentavos: number;
    impostoCentavos: number;
    lucroCentavos: number;
  }[];
  categorias: { nome: string; valorCentavos: number; cor: string }[];
  clientes: { nome: string; valorCentavos: number }[];
  socios: {
    id: string;
    nome: string;
    lucroCentavos: number;
    proLaboreCentavos: number;
    totalRemuneracaoCentavos: number;
  }[];
  fatorR: {
    rbt12Centavos: number;
    folha12Centavos: number;
    fatorBps: number | null;
    anexo: string;
    faltaParaAnexoIIICentavos: number;
    zonaDeAtencao: boolean;
  };
  projecao: { competencia: string; saldoProjetadoCentavos: number }[];
  caixinhas: {
    id: string;
    nome: string;
    cor: string;
    icone: string;
    saldoCentavos: number;
    metaCentavos: number | null;
    progresso: { percentualBps: number; atingida: boolean } | null;
  }[];
  alertaGuias: { quantidade: number; totalCentavos: number };
};

export default function Dashboard() {
  // Filtros vivem no estado do cliente, não na URL: mudar de regime não deve
  // empilhar entradas no histórico do navegador nem recarregar a rota.
  const [regime, setRegime] = useState<"CAIXA" | "COMPETENCIA">("COMPETENCIA");
  const [meses, setMeses] = useState(12);

  const { dados, erro, carregando, atualizando, recarregar, tentarNovamente } =
    useDados<Dados>(`/api/ui/dashboard?regime=${regime}&meses=${meses}`);

  const acao = useAcao(recarregar);

  const cabecalho = (
    <PageTitle
      titulo="Dashboard"
      descricao={
        dados
          ? `Posição consolidada — ${formatarCompetencia(dados.mesAtual)}`
          : "Carregando posição consolidada…"
      }
      acao={
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Regime:</span>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            {(
              [
                ["COMPETENCIA", "Competência", "Considera o mês em que o serviço foi faturado"],
                ["CAIXA", "Caixa", "Considera o mês em que o dinheiro entrou ou saiu"],
              ] as const
            ).map(([valor, label, dica]) => (
              <button
                key={valor}
                onClick={() => setRegime(valor)}
                title={dica}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  regime === valor
                    ? "bg-navy-800 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
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
        <EsqueletoDashboard />
      </>
    );
  }

  const { caixa, mes, fatorR, caixinhas } = dados;

  return (
    <>
      <BarraAtualizando ativo={atualizando || acao.pendente} />
      {cabecalho}
      <Avisos erro={acao.erro} mensagem={acao.mensagem} />

      {caixa.caixaLivreCentavos < 0 && (
        <div className="mb-4">
          <Aviso tom="erro">
            <strong>Caixa livre negativo.</strong> O saldo em conta (
            {formatarBRL(caixa.saldoContaCentavos)}) não cobre{" "}
            {formatarBRL(caixa.impostoSobreRecebidoCentavos)} de imposto sobre
            receita já recebida. Não distribua lucro até resolver isso — se
            precisar, resgate de uma caixinha.
          </Aviso>
        </div>
      )}

      {caixa.impostoSobreAReceberCentavos > 0 && (
        <div className="mb-4">
          <Aviso tom="alerta">
            <strong>
              {formatarBRL(caixa.impostoSobreAReceberCentavos)} de imposto
            </strong>{" "}
            está provisionado sobre receita que ainda não entrou (
            {formatarBRL(caixa.aReceberCentavos)} a receber). Esse valor{" "}
            <strong>não</strong> reduz o caixa livre acima — mas o DAS vence pelo
            faturamento, não pelo recebimento. Se o cliente atrasar, a guia vence do
            mesmo jeito.
          </Aviso>
        </div>
      )}

      {dados.alertaGuias.quantidade > 0 && (
        <div className="mb-4">
          <Aviso tom="alerta">
            <strong>{dados.alertaGuias.quantidade} guia(s)</strong> de imposto
            vencendo nos próximos 15 dias, somando{" "}
            {formatarBRL(dados.alertaGuias.totalCentavos)}.{" "}
            <Link href="/impostos" className="underline">
              Ver impostos
            </Link>
          </Aviso>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi
          titulo="Em conta"
          valorCentavos={caixa.saldoContaCentavos}
          detalhe={`Patrimônio total ${formatarBRL(caixa.patrimonioCentavos)}`}
        />
        <Kpi
          titulo="Caixa livre"
          valorCentavos={caixa.caixaLivreCentavos}
          detalhe={`Conta − ${formatarBRL(
            caixa.impostoSobreRecebidoCentavos
          )} de imposto sobre recebido`}
          tom={caixa.caixaLivreCentavos >= 0 ? "positivo" : "negativo"}
          destaque
        />
        <Kpi
          titulo="Guardado"
          valorCentavos={caixa.guardadoCentavos}
          detalhe={`${caixinhas.length} caixinha(s)`}
        />
        <Kpi
          titulo="A receber"
          valorCentavos={caixa.aReceberCentavos}
          detalhe={
            caixa.impostoSobreAReceberCentavos > 0
              ? `Carrega ${formatarBRL(
                  caixa.impostoSobreAReceberCentavos
                )} de imposto`
              : "Faturado e ainda não recebido"
          }
        />
        <Kpi
          titulo="A pagar"
          valorCentavos={caixa.aPagarCentavos + caixa.impostoProvisionadoCentavos}
          detalhe={`Inclui ${formatarBRL(
            caixa.impostoProvisionadoCentavos
          )} de imposto em aberto`}
          tom="alerta"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi titulo="Faturado no mês" valorCentavos={mes.faturadoCentavos} />
        <Kpi titulo="Impostos" valorCentavos={mes.impostoCentavos} tom="negativo" />
        <Kpi titulo="Despesas" valorCentavos={mes.despesaCentavos} tom="negativo" />
        <Kpi
          titulo="Lucro"
          valorCentavos={mes.lucroCentavos}
          tom={mes.lucroCentavos >= 0 ? "positivo" : "negativo"}
        />
        <Kpi
          titulo="Distribuído"
          valorCentavos={mes.distribuidoCentavos}
          detalhe={`Retido: ${formatarBRL(mes.retidoCentavos)}`}
        />
      </div>

      <div className="mb-6">
        <CardFatorR fatorR={fatorR} />
      </div>

      <div className="grid gap-6">
        <Secao
          titulo={`Fluxo de caixa — últimos ${dados.meses} meses (${
            regime === "CAIXA" ? "regime de caixa" : "competência"
          })`}
          acao={
            <div className="flex gap-1">
              {[6, 12, 24].map((n) => (
                <button
                  key={n}
                  onClick={() => setMeses(n)}
                  className={`rounded-md px-2.5 py-1 text-xs ${
                    meses === n
                      ? "bg-navy-800 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {n}m
                </button>
              ))}
            </div>
          }
        >
          <GraficoFluxoMensal dados={dados.serie} />
        </Secao>

        <div className="grid gap-6 lg:grid-cols-2">
          <Secao titulo="Despesas por categoria">
            <GraficoPizzaCategorias dados={dados.categorias} />
          </Secao>
          <Secao titulo="Receita por cliente">
            <GraficoReceitaPorCliente dados={dados.clientes} />
          </Secao>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Secao titulo="Distribuído por sócio (acumulado)">
            <GraficoDistribuicaoSocios dados={dados.socios} />
            {dados.socios.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Sócio</th>
                      <th className="th text-right">Lucros</th>
                      <th className="th text-right">Pró-labore</th>
                      <th className="th text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.socios.map((s) => (
                      <tr key={s.id}>
                        <td className="td">{s.nome}</td>
                        <td className="td text-right">
                          <Dinheiro centavos={s.lucroCentavos} />
                        </td>
                        <td className="td text-right">
                          <Dinheiro centavos={s.proLaboreCentavos} />
                        </td>
                        <td className="td text-right font-medium">
                          <Dinheiro centavos={s.totalRemuneracaoCentavos} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>

          <div className="grid gap-6">
            <Secao titulo="Projeção de caixa — 6 meses">
              <GraficoProjecaoCaixa dados={dados.projecao} />
              <p className="mt-3 text-xs text-slate-500">
                Considera recorrentes ativos, compromissos já lançados e guias de
                imposto com vencimento no período. Não grava nada no banco.
              </p>
            </Secao>

            <Secao
              titulo="Caixinhas"
              acao={
                <Link
                  href="/caixinhas"
                  className="text-xs text-teal-700 underline"
                >
                  gerenciar
                </Link>
              }
            >
              {caixinhas.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  Nenhuma caixinha ainda.{" "}
                  <Link href="/caixinhas" className="underline">
                    Crie uma
                  </Link>{" "}
                  para separar dinheiro por objetivo.
                </p>
              ) : (
                <ul className="space-y-3">
                  {caixinhas.map((c) => {
                    const Icone = iconeDe(c.icone);
                    return (
                      <li key={c.id} className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${c.cor}1a`, color: c.cor }}
                        >
                          <Icone size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm text-slate-700">
                              {c.nome}
                            </span>
                            <Dinheiro
                              centavos={c.saldoCentavos}
                              className="text-sm font-medium"
                            />
                          </div>
                          {c.progresso && (
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${c.progresso.percentualBps / 100}%`,
                                  backgroundColor: c.progresso.atingida
                                    ? "#16a34a"
                                    : c.cor,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-4 text-xs text-slate-500">
                Guardar tira da conta e põe na caixinha — o patrimônio total não
                muda, mas o caixa livre sim. Cada movimento aparece no extrato como
                transferência.
              </p>
            </Secao>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function CardFatorR({ fatorR }: { fatorR: Dados["fatorR"] }) {
  const pct = fatorR.fatorBps ?? 0;
  const largura = Math.min(100, (pct / 4000) * 100); // escala até 40%
  const marcador = (LIMITE_FATOR_R_BPS / 4000) * 100;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Fator R
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Folha (pró-labore) dividida pela receita dos últimos 12 meses. Em 28% ou
            mais, a empresa se enquadra no Anexo III, que começa em 6,00% — abaixo
            disso, Anexo V, que começa em 15,50%.
          </p>
        </div>
        <div className="text-right">
          <div className="num text-3xl font-semibold text-navy-900">
            {fatorR.fatorBps === null ? "—" : formatarBps(fatorR.fatorBps)}
          </div>
          <div className="text-xs text-slate-500">Anexo {fatorR.anexo}</div>
        </div>
      </div>

      <div className="relative mt-5 h-2.5 rounded-full bg-slate-100">
        <div
          className={`h-2.5 rounded-full ${
            fatorR.anexo === "III" ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${largura}%` }}
        />
        <div
          className="absolute -top-1 w-0.5 bg-navy-900"
          style={{ left: `${marcador}%`, height: "1.1rem" }}
          title="Limite de 28%"
        />
      </div>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-slate-500">RBT12</div>
          <div className="num font-medium">{formatarBRL(fatorR.rbt12Centavos)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Folha 12 meses</div>
          <div className="num font-medium">{formatarBRL(fatorR.folha12Centavos)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">
            {fatorR.anexo === "III" ? "Margem sobre o limite" : "Falta para o Anexo III"}
          </div>
          <div className="num font-medium">
            {fatorR.anexo === "III"
              ? "—"
              : formatarBRL(fatorR.faltaParaAnexoIIICentavos)}
          </div>
        </div>
      </div>

      {fatorR.zonaDeAtencao && (
        <div className="mt-4">
          <Aviso tom="alerta">
            Vocês estão na zona de atenção (entre 26% e 30%). Uma variação pequena de
            faturamento ou de pró-labore muda o anexo e a alíquota. Vale conversar com
            o contador antes de fechar a próxima distribuição.
          </Aviso>
        </div>
      )}
    </div>
  );
}
