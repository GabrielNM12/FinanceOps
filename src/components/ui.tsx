import { formatarBRL, formatarBps } from "@/lib/money";

export function PageTitle({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div>
        <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Kpi({
  titulo,
  valorCentavos,
  detalhe,
  tom = "neutro",
  destaque = false,
}: {
  titulo: string;
  valorCentavos: number;
  detalhe?: string;
  tom?: "neutro" | "positivo" | "negativo" | "alerta";
  destaque?: boolean;
}) {
  const cor = {
    neutro: "text-navy-900",
    positivo: "text-emerald-600",
    negativo: "text-red-600",
    alerta: "text-amber-600",
  }[tom];

  return (
    <div className={`card p-3 sm:p-4 ${destaque ? "ring-2 ring-teal-400" : ""}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
        {titulo}
      </div>
      {/* O valor encolhe no celular para caber em duas colunas sem quebrar. */}
      <div className={`num mt-1 text-lg font-semibold sm:text-2xl ${cor}`}>
        {formatarBRL(valorCentavos)}
      </div>
      {detalhe && (
        <div className="mt-1 text-[11px] leading-snug text-slate-500 sm:text-xs">
          {detalhe}
        </div>
      )}
    </div>
  );
}

export function Dinheiro({
  centavos,
  sinal = false,
  className = "",
}: {
  centavos: number;
  sinal?: boolean;
  className?: string;
}) {
  const cor = !sinal
    ? ""
    : centavos > 0
      ? "text-emerald-600"
      : centavos < 0
        ? "text-red-600"
        : "text-slate-500";
  return (
    <span className={`num ${cor} ${className}`}>
      {sinal && centavos > 0 ? "+" : ""}
      {formatarBRL(centavos)}
    </span>
  );
}

export function Percentual({ bps }: { bps: number | null }) {
  if (bps === null) return <span className="text-slate-400">—</span>;
  return <span className="num">{formatarBps(bps)}</span>;
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="text-sm text-slate-500">{children}</div>
    </div>
  );
}

export function Aviso({
  tom = "info",
  children,
}: {
  tom?: "info" | "alerta" | "erro";
  children: React.ReactNode;
}) {
  const estilo = {
    info: "border-teal-200 bg-teal-50 text-teal-900",
    alerta: "border-amber-200 bg-amber-50 text-amber-900",
    erro: "border-red-200 bg-red-50 text-red-900",
  }[tom];
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${estilo}`}>{children}</div>
  );
}

export function Tag({ children, cor }: { children: React.ReactNode; cor?: string }) {
  if (cor) {
    return (
      <span
        className="badge"
        style={{ backgroundColor: `${cor}20`, color: cor }}
      >
        {children}
      </span>
    );
  }
  return <span className="badge bg-slate-100 text-slate-600">{children}</span>;
}

export function Secao({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
