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
import { rota } from "@/lib/rotas";
import { t } from "@/lib/i18n";
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
      titulo={t.dashboard.title}
      descricao={
        dados
          ? t.dashboard.subtitle(formatarCompetencia(dados.mesAtual))
          : t.dashboard.subtitleLoading
      }
      acao={
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{t.dashboard.regimeLabel}</span>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            {(
              [
                ["COMPETENCIA", t.dashboard.regimeCompetencia, t.dashboard.regimeCompetenciaHint],
                ["CAIXA", t.dashboard.regimeCaixa, t.dashboard.regimeCaixaHint],
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
            <strong>{t.dashboard.caixaLivreNegTitle}</strong>{" "}
            {t.dashboard.caixaLivreNeg(
              formatarBRL(caixa.saldoContaCentavos),
              formatarBRL(caixa.impostoSobreRecebidoCentavos)
            )}
          </Aviso>
        </div>
      )}

      {caixa.impostoSobreAReceberCentavos > 0 && (
        <div className="mb-4">
          <Aviso tom="alerta">
            <strong>
              {t.dashboard.impostoAReceberStrong(
                formatarBRL(caixa.impostoSobreAReceberCentavos)
              )}
            </strong>{" "}
            {t.dashboard.impostoAReceber(formatarBRL(caixa.aReceberCentavos))}
            <strong>{t.dashboard.impostoAReceberNao}</strong>{" "}
            {t.dashboard.impostoAReceberFim}
          </Aviso>
        </div>
      )}

      {dados.alertaGuias.quantidade > 0 && (
        <div className="mb-4">
          <Aviso tom="alerta">
            <strong>{t.dashboard.guiasVencendoStrong(dados.alertaGuias.quantidade)}</strong>{" "}
            {t.dashboard.guiasVencendo(formatarBRL(dados.alertaGuias.totalCentavos))}
            <Link href={rota("impostos")} className="underline">
              {t.dashboard.verImpostos}
            </Link>
          </Aviso>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi
          titulo={t.dashboard.kpiEmConta}
          valorCentavos={caixa.saldoContaCentavos}
          detalhe={t.dashboard.kpiEmContaDetalhe(formatarBRL(caixa.patrimonioCentavos))}
        />
        <Kpi
          titulo={t.dashboard.kpiCaixaLivre}
          valorCentavos={caixa.caixaLivreCentavos}
          detalhe={t.dashboard.kpiCaixaLivreDetalhe(
            formatarBRL(caixa.impostoSobreRecebidoCentavos)
          )}
          tom={caixa.caixaLivreCentavos >= 0 ? "positivo" : "negativo"}
          destaque
        />
        <Kpi
          titulo={t.dashboard.kpiGuardado}
          valorCentavos={caixa.guardadoCentavos}
          detalhe={t.dashboard.kpiGuardadoDetalhe(caixinhas.length)}
        />
        <Kpi
          titulo={t.dashboard.kpiAReceber}
          valorCentavos={caixa.aReceberCentavos}
          detalhe={
            caixa.impostoSobreAReceberCentavos > 0
              ? t.dashboard.kpiAReceberComImposto(
                  formatarBRL(caixa.impostoSobreAReceberCentavos)
                )
              : t.dashboard.kpiAReceberSemImposto
          }
        />
        <Kpi
          titulo={t.dashboard.kpiAPagar}
          valorCentavos={caixa.aPagarCentavos + caixa.impostoProvisionadoCentavos}
          detalhe={t.dashboard.kpiAPagarDetalhe(
            formatarBRL(caixa.impostoProvisionadoCentavos)
          )}
          tom="alerta"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi titulo={t.dashboard.kpiFaturadoMes} valorCentavos={mes.faturadoCentavos} />
        <Kpi titulo={t.dashboard.kpiImpostos} valorCentavos={mes.impostoCentavos} tom="negativo" />
        <Kpi titulo={t.dashboard.kpiDespesas} valorCentavos={mes.despesaCentavos} tom="negativo" />
        <Kpi
          titulo={t.dashboard.kpiLucro}
          valorCentavos={mes.lucroCentavos}
          tom={mes.lucroCentavos >= 0 ? "positivo" : "negativo"}
        />
        <Kpi
          titulo={t.dashboard.kpiDistribuido}
          valorCentavos={mes.distribuidoCentavos}
          detalhe={t.dashboard.kpiDistribuidoDetalhe(formatarBRL(mes.retidoCentavos))}
        />
      </div>

      <div className="mb-6">
        <CardFatorR fatorR={fatorR} />
      </div>

      <div className="grid gap-6">
        <Secao
          titulo={t.dashboard.fluxoTitulo(
            dados.meses,
            regime === "CAIXA" ? t.dashboard.fluxoRegimeCaixa : t.dashboard.fluxoRegimeCompetencia
          )}
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
                  {t.dashboard.mesesSufixo(n)}
                </button>
              ))}
            </div>
          }
        >
          <GraficoFluxoMensal dados={dados.serie} />
        </Secao>

        <div className="grid gap-6 lg:grid-cols-2">
          <Secao titulo={t.dashboard.despesasPorCategoria}>
            <GraficoPizzaCategorias dados={dados.categorias} />
          </Secao>
          <Secao titulo={t.dashboard.receitaPorCliente}>
            <GraficoReceitaPorCliente dados={dados.clientes} />
          </Secao>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Secao titulo={t.dashboard.distribuidoPorSocio}>
            <GraficoDistribuicaoSocios dados={dados.socios} />
            {dados.socios.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">{t.dashboard.thSocio}</th>
                      <th className="th text-right">{t.dashboard.thLucros}</th>
                      <th className="th text-right">{t.dashboard.thProLabore}</th>
                      <th className="th text-right">{t.dashboard.thTotal}</th>
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
            <Secao titulo={t.dashboard.projecaoTitulo}>
              <GraficoProjecaoCaixa dados={dados.projecao} />
              <p className="mt-3 text-xs text-slate-500">{t.dashboard.projecaoNota}</p>
            </Secao>

            <Secao
              titulo={t.dashboard.caixinhasTitulo}
              acao={
                <Link
                  href={rota("caixinhas")}
                  className="text-xs text-teal-700 underline"
                >
                  {t.common.manage}
                </Link>
              }
            >
              {caixinhas.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  {t.dashboard.caixinhasVaziasPre}{" "}
                  <Link href={rota("caixinhas")} className="underline">
                    {t.dashboard.caixinhasVaziasLink}
                  </Link>{" "}
                  {t.dashboard.caixinhasVaziasPos}
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
              <p className="mt-4 text-xs text-slate-500">{t.dashboard.caixinhasNota}</p>
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
            {t.dashboard.fatorRTitulo}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            {t.dashboard.fatorRExplica}
          </p>
        </div>
        <div className="text-right">
          <div className="num text-3xl font-semibold text-navy-900">
            {fatorR.fatorBps === null ? "—" : formatarBps(fatorR.fatorBps)}
          </div>
          <div className="text-xs text-slate-500">{t.dashboard.fatorRAnexo(fatorR.anexo)}</div>
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
          title={t.dashboard.fatorRLimite28}
        />
      </div>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-slate-500">{t.dashboard.fatorRRbt12}</div>
          <div className="num font-medium">{formatarBRL(fatorR.rbt12Centavos)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t.dashboard.fatorRFolha}</div>
          <div className="num font-medium">{formatarBRL(fatorR.folha12Centavos)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">
            {fatorR.anexo === "III" ? t.dashboard.fatorRMargem : t.dashboard.fatorRFalta}
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
          <Aviso tom="alerta">{t.dashboard.fatorRZona}</Aviso>
        </div>
      )}
    </div>
  );
}
