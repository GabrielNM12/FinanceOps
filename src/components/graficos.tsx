"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatarBRL, formatarBRLCompacto } from "@/lib/money";
import { formatarCompetencia } from "@/lib/datas";

/**
 * Todos os gráficos recebem CENTAVOS e formatam na borda.
 * Nenhum componente aqui faz conta — só desenha o que a camada de queries
 * já calculou. Assim não existe risco de a tela e o relatório divergirem.
 */

const CORES = ["#2eb3c7", "#1c2b3d", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444", "#0ea5e9", "#ec4899", "#64748b", "#14b8a6"];

const tooltipProps = {
  formatter: (v: number | string) => formatarBRL(Number(v)),
  contentStyle: {
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,.06)",
  },
} as const;

const eixoY = {
  tickFormatter: (v: number) => formatarBRLCompacto(v),
  tick: { fontSize: 11, fill: "#64748b" },
  axisLine: false,
  tickLine: false,
  width: 70,
} as const;

const eixoX = {
  tick: { fontSize: 11, fill: "#64748b" },
  axisLine: false,
  tickLine: false,
} as const;

// ---------------------------------------------------------------------------

export type PontoMensal = {
  competencia: string;
  faturadoCentavos: number;
  despesaCentavos: number;
  impostoCentavos: number;
  lucroCentavos: number;
};

/** Barras de faturado/despesa/imposto + linha de lucro. */
export function GraficoFluxoMensal({ dados }: { dados: PontoMensal[] }) {
  const d = dados.map((p) => ({ ...p, mes: formatarCompetencia(p.competencia) }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={d} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="mes" {...eixoX} />
        <YAxis {...eixoY} />
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="faturadoCentavos" name="Faturado" fill="#2eb3c7" radius={[4, 4, 0, 0]} />
        <Bar dataKey="despesaCentavos" name="Despesas" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="impostoCentavos" name="Impostos" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="lucroCentavos"
          name="Lucro"
          stroke="#1c2b3d"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------

export function GraficoPizzaCategorias({
  dados,
}: {
  dados: { nome: string; valorCentavos: number; cor: string }[];
}) {
  if (dados.length === 0) return <SemDados />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={dados}
          dataKey="valorCentavos"
          nameKey="nome"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={105}
          paddingAngle={2}
        >
          {dados.map((d, i) => (
            <Cell key={i} fill={d.cor || CORES[i % CORES.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------

export function GraficoReceitaPorCliente({
  dados,
}: {
  dados: { nome: string; valorCentavos: number }[];
}) {
  if (dados.length === 0) return <SemDados />;
  const d = dados.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, d.length * 38)}>
      <BarChart data={d} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" {...eixoY} width={undefined} />
        <YAxis
          type="category"
          dataKey="nome"
          width={140}
          tick={{ fontSize: 11, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="valorCentavos" name="Receita" fill="#2eb3c7" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------

/** Empilha lucro e pró-labore — as duas formas de remunerar sócio. */
export function GraficoDistribuicaoSocios({
  dados,
}: {
  dados: { nome: string; lucroCentavos: number; proLaboreCentavos: number }[];
}) {
  if (dados.length === 0) return <SemDados />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, dados.length * 52)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" {...eixoY} width={undefined} />
        <YAxis
          type="category"
          dataKey="nome"
          width={120}
          tick={{ fontSize: 12, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="lucroCentavos" name="Lucros" stackId="a" fill="#2eb3c7" radius={[0, 0, 0, 0]} />
        <Bar dataKey="proLaboreCentavos" name="Pró-labore" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------

export function GraficoProjecaoCaixa({
  dados,
}: {
  dados: { competencia: string; saldoProjetadoCentavos: number }[];
}) {
  if (dados.length === 0) return <SemDados />;
  const d = dados.map((p) => ({ ...p, mes: formatarCompetencia(p.competencia) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={d} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-caixa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2eb3c7" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2eb3c7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="mes" {...eixoX} />
        <YAxis {...eixoY} />
        <Tooltip {...tooltipProps} />
        <Area
          type="monotone"
          dataKey="saldoProjetadoCentavos"
          name="Saldo projetado"
          stroke="#2eb3c7"
          strokeWidth={2.5}
          fill="url(#grad-caixa)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SemDados() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
  );
}
