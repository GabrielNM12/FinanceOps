"use client";

import { PageTitle, Kpi, Aviso } from "@/components/ui";
import PainelImpostos, { GuiaView, PagamentoView } from "@/components/PainelImpostos";
import {
  EsqueletoImpostos,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useDados } from "@/hooks/useDados";
import { formatarCompetencia } from "@/lib/datas";
import { formatarBRL, formatarBps } from "@/lib/money";
import { t } from "@/lib/i18n";

type Dados = {
  mesAtual: string;
  calc: {
    aliquotaBps: number;
    anexo: string;
    faixa: number;
    aliquotaNominalBps: number;
    deducaoCentavos: number;
    rbt12Centavos: number;
    aviso?: string;
  };
  fatorRBps: number | null;
  projecao: { receitaCentavos: number; dasCentavos: number };
  totais: {
    abertoCentavos: number;
    vencidoCentavos: number;
    sobreRecebidoCentavos: number;
    sobreAReceberCentavos: number;
    qtdAberto: number;
    qtdVencido: number;
    qtdSobreAReceber: number;
  };
  risco: { quantidade: number; totalCentavos: number };
  abertas: GuiaView[];
  pagamentos: PagamentoView[];
};

export default function ImpostosPage() {
  const { dados, erro, carregando, atualizando, recarregar, tentarNovamente } =
    useDados<Dados>("/api/ui/impostos");

  const cabecalho = (
    <PageTitle titulo={t.taxes.title} descricao={t.taxes.subtitle} />
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
        <EsqueletoImpostos />
      </>
    );
  }

  const { calc, totais } = dados;

  return (
    <>
      <BarraAtualizando ativo={atualizando} />
      {cabecalho}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Kpi
          titulo={t.taxes.kpiSobreRecebida}
          valorCentavos={totais.sobreRecebidoCentavos}
          detalhe={t.taxes.kpiSobreRecebidaDetalhe}
          tom="alerta"
          destaque
        />
        <Kpi
          titulo={t.taxes.kpiSobreAReceber}
          valorCentavos={totais.sobreAReceberCentavos}
          detalhe={t.taxes.kpiSobreAReceberDetalhe(totais.qtdSobreAReceber)}
        />
        <Kpi
          titulo={t.taxes.kpiVencido}
          valorCentavos={totais.vencidoCentavos}
          detalhe={t.taxes.kpiVencidoDetalhe(totais.qtdVencido)}
          tom={totais.vencidoCentavos > 0 ? "negativo" : "neutro"}
        />
        <Kpi
          titulo={t.taxes.kpiDasEstimado(formatarCompetencia(dados.mesAtual))}
          valorCentavos={dados.projecao.dasCentavos}
          detalhe={t.taxes.kpiDasEstimadoDetalhe(formatarBRL(dados.projecao.receitaCentavos))}
        />
        <div className="card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t.taxes.aliquotaVigente}
          </div>
          <div className="num mt-1 text-2xl font-semibold text-navy-900">
            {formatarBps(calc.aliquotaBps)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t.taxes.aliquotaVigenteDetalhe(
              calc.anexo,
              calc.faixa,
              formatarBps(calc.aliquotaNominalBps)
            )}
          </div>
        </div>
      </div>

      {calc.aviso && (
        <div className="mb-6">
          <Aviso tom="erro">{calc.aviso}</Aviso>
        </div>
      )}

      {dados.risco.quantidade > 0 && (
        <div className="mb-6">
          <Aviso tom="erro">
            <strong>
              {t.taxes.riscoStrong(
                dados.risco.quantidade,
                formatarBRL(dados.risco.totalCentavos)
              )}
            </strong>{" "}
            {t.taxes.risco}
          </Aviso>
        </div>
      )}

      <div className="mb-6">
        <Aviso tom="info">
          {t.taxes.formulaPre}{" "}
          <span className="num">
            {t.taxes.formula(
              formatarBps(calc.aliquotaNominalBps),
              formatarBRL(calc.deducaoCentavos)
            )}
          </span>
          {t.taxes.formulaPos(
            formatarBRL(calc.rbt12Centavos),
            dados.fatorRBps === null ? "—" : formatarBps(dados.fatorRBps)
          )}
        </Aviso>
      </div>

      <PainelImpostos
        abertas={dados.abertas}
        pagamentos={dados.pagamentos}
        aoMudar={recarregar}
      />
    </>
  );
}
