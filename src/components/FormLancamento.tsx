"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { formatarBRL, formatarBps } from "@/lib/money";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Landmark,
  Plus,
  Minus,
} from "lucide-react";
import {
  registrarReceita,
  registrarDespesa,
  registrarDistribuicao,
  registrarAporte,
  previewImposto,
} from "@/actions/transacoes";

type Opcao = { id: string; nome: string };

type Props = {
  clientes: Opcao[];
  categoriasEntrada: Opcao[];
  categoriasSaida: Opcao[];
  socios: Opcao[];
  /** Chamado após gravar, para a tela refazer o fetch dos dados. */
  aoSalvar?: () => void;
};

const ABAS = [
  { id: "receita", label: "Receita", Icone: TrendingUp },
  { id: "despesa", label: "Despesa", Icone: TrendingDown },
  { id: "distribuicao", label: "Distribuição / Pró-labore", Icone: Users },
  { id: "aporte", label: "Aporte", Icone: Landmark },
] as const;

type Aba = (typeof ABAS)[number]["id"];

const hoje = () => new Date().toISOString().slice(0, 10);

export default function FormLancamento(props: Props) {
  const [aba, setAba] = useState<Aba>("receita");
  const [aberto, setAberto] = useState(false);

  const concluir = () => {
    setAberto(false);
    props.aoSalvar?.();
  };

  return (
    <div className="card mb-6 overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-semibold text-navy-900">
          {aberto ? "Fechar formulário" : "Novo lançamento"}
        </span>
        <span className="text-slate-400">
          {aberto ? <Minus size={16} /> : <Plus size={16} />}
        </span>
      </button>

      {aberto && (
        <>
          <div className="flex flex-wrap gap-1 border-t border-slate-100 bg-slate-50 px-3 py-2">
            {ABAS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  aba === a.id
                    ? "bg-navy-800 text-white"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <a.Icone size={15} />
                {a.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {aba === "receita" && <FormReceita {...props} onOk={concluir} />}
            {aba === "despesa" && <FormDespesa {...props} onOk={concluir} />}
            {aba === "distribuicao" && (
              <FormDistribuicao {...props} onOk={concluir} />
            )}
            {aba === "aporte" && <FormAporte {...props} onOk={concluir} />}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Erro({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {msg}
    </div>
  );
}

function Acoes({ pendente, label }: { pendente: boolean; label: string }) {
  return (
    <div className="mt-5 flex justify-end">
      <button type="submit" disabled={pendente} className="btn-teal">
        {pendente ? "Salvando..." : label}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECEITA — com prévia de imposto ao vivo
// ---------------------------------------------------------------------------

function FormReceita({
  clientes,
  categoriasEntrada,
  onOk,
}: Props & { onOk: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [semImposto, setSemImposto] = useState(false);
  const [editarImposto, setEditarImposto] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewImposto>> | null>(
    null
  );
  const form = useRef<HTMLFormElement>(null);

  // Recalcula a prévia enquanto digita, com debounce curto.
  useEffect(() => {
    if (!valor || semImposto) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      previewImposto(valor, data).then(setPreview);
    }, 350);
    return () => clearTimeout(t);
  }, [valor, data, semImposto]);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          try {
            setErro(null);
            await registrarReceita(fd);
            form.current?.reset();
            setValor("");
            setPreview(null);
            onOk();
          } catch (e) {
            setErro((e as Error).message);
          }
        });
      }}
    >
      <Erro msg={erro} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="label">Descrição</label>
          <input name="descricao" required className="input" placeholder="NF 042 — Sprint de agosto" />
        </div>

        <div>
          <label className="label">Valor bruto</label>
          <input
            name="valor"
            required
            className="input"
            placeholder="15.000,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Cliente</label>
          <select name="clienteId" className="input">
            <option value="">— sem cliente —</option>
            {clientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Categoria</label>
          <select name="categoriaId" className="input">
            <option value="">—</option>
            {categoriasEntrada.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Data de faturamento</label>
          <input
            type="date"
            name="dataCompetencia"
            required
            className="input"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Data de recebimento</label>
          <input type="date" name="dataCaixa" className="input" />
          <p className="mt-1 text-xs text-slate-400">
            Deixe vazio se ainda não recebeu — entra como &quot;a receber&quot;.
          </p>
        </div>

        <div className="lg:col-span-2">
          <label className="label">Observações</label>
          <input name="observacoes" className="input" />
        </div>
      </div>

      {/* ---- Bloco de imposto ---- */}
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-navy-900">
            Imposto (Simples Nacional)
          </span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="semImposto"
              checked={semImposto}
              onChange={(e) => setSemImposto(e.target.checked)}
            />
            Receita sem incidência
          </label>
        </div>

        {!semImposto && (
          <>
            {preview?.ok ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Numero titulo="Bruto" valor={formatarBRL(preview.impostoCentavos + preview.liquidoCentavos)} />
                  <Numero
                    titulo={`Alíquota (Anexo ${preview.anexo}, faixa ${preview.faixa})`}
                    valor={formatarBps(preview.aliquotaBps)}
                  />
                  <Numero
                    titulo="Imposto"
                    valor={formatarBRL(preview.impostoCentavos)}
                    tom="negativo"
                  />
                  <Numero
                    titulo="Líquido"
                    valor={formatarBRL(preview.liquidoCentavos)}
                    tom="positivo"
                  />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Calculado sobre um RBT12 de {formatarBRL(preview.rbt12Centavos)}. A
                  guia vence no dia 20 do mês seguinte e fica provisionada até você
                  registrar o pagamento.
                </p>

                {preview.aviso && (
                  <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {preview.aviso}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setEditarImposto((v) => !v)}
                  className="mt-3 text-xs text-teal-700 underline"
                >
                  {editarImposto ? "Usar o cálculo automático" : "Ajustar manualmente"}
                </button>

                {editarImposto && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Alíquota (%)</label>
                      <input
                        name="impostoAliquota"
                        className="input"
                        placeholder={(preview.aliquotaBps / 100).toFixed(2)}
                      />
                    </div>
                    <div>
                      <label className="label">Ou valor do imposto</label>
                      <input name="impostoValor" className="input" placeholder="0,00" />
                    </div>
                    <p className="text-xs text-slate-500 sm:col-span-2">
                      Se preencher o valor, ele prevalece sobre a alíquota.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {preview && !preview.ok
                  ? preview.erro
                  : "Informe o valor para ver a alíquota e o líquido."}
              </p>
            )}
          </>
        )}
      </div>

      <Acoes pendente={pendente} label="Registrar receita" />
    </form>
  );
}

function Numero({
  titulo,
  valor,
  tom = "neutro",
}: {
  titulo: string;
  valor: string;
  tom?: "neutro" | "positivo" | "negativo";
}) {
  const cor = {
    neutro: "text-navy-900",
    positivo: "text-emerald-600",
    negativo: "text-red-600",
  }[tom];
  return (
    <div>
      <div className="text-xs text-slate-500">{titulo}</div>
      <div className={`num text-lg font-semibold ${cor}`}>{valor}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function FormDespesa({
  categoriasSaida,
  clientes,
  socios,
  onOk,
}: Props & { onOk: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          try {
            setErro(null);
            await registrarDespesa(fd);
            form.current?.reset();
            onOk();
          } catch (e) {
            setErro((e as Error).message);
          }
        });
      }}
    >
      <Erro msg={erro} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="label">Descrição</label>
          <input name="descricao" required className="input" placeholder="AWS — agosto" />
        </div>

        <div>
          <label className="label">Valor</label>
          <input name="valor" required className="input" placeholder="1.240,90" />
        </div>

        <div>
          <label className="label">Categoria</label>
          <select name="categoriaId" className="input">
            <option value="">—</option>
            {categoriasSaida.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Cliente (opcional)</label>
          <select name="clienteId" className="input">
            <option value="">— despesa geral —</option>
            {clientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Vincular a um cliente habilita o cálculo de margem.
          </p>
        </div>

        <div>
          <label className="label">Pago por</label>
          <select name="socioId" className="input">
            <option value="">Empresa</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} (do próprio bolso)
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Marque o sócio quando ele adiantou do próprio bolso.
          </p>
        </div>

        <div>
          <label className="label">Data da despesa</label>
          <input
            type="date"
            name="dataCompetencia"
            required
            className="input"
            defaultValue={hoje()}
          />
        </div>

        <div>
          <label className="label">Data do pagamento</label>
          <input type="date" name="dataCaixa" className="input" defaultValue={hoje()} />
          <p className="mt-1 text-xs text-slate-400">Vazio = ainda não pago.</p>
        </div>

        <div className="lg:col-span-3">
          <label className="label">Observações</label>
          <input name="observacoes" className="input" />
        </div>
      </div>

      <Acoes pendente={pendente} label="Registrar despesa" />
    </form>
  );
}

// ---------------------------------------------------------------------------

function FormDistribuicao({ socios, onOk }: Props & { onOk: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [natureza, setNatureza] = useState("LUCRO");
  const form = useRef<HTMLFormElement>(null);

  const explicacao: Record<string, string> = {
    LUCRO:
      "Não é despesa da empresa e não conta no Fator R. É a destinação do lucro já apurado.",
    PRO_LABORE:
      "É despesa da empresa e CONTA no Fator R — é o que pode levar vocês ao Anexo III. Tem encargos próprios (INSS/IRRF) que não são calculados aqui.",
    REEMBOLSO:
      "Devolução de dinheiro que o sócio adiantou. Não é despesa nova — a despesa original já foi lançada quando ele pagou.",
  };

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          try {
            setErro(null);
            await registrarDistribuicao(fd);
            form.current?.reset();
            onOk();
          } catch (e) {
            setErro((e as Error).message);
          }
        });
      }}
    >
      <Erro msg={erro} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Sócio</label>
          <select name="socioId" required className="input">
            <option value="">Selecione...</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Natureza</label>
          <select
            name="natureza"
            className="input"
            value={natureza}
            onChange={(e) => setNatureza(e.target.value)}
          >
            <option value="LUCRO">Distribuição de lucros</option>
            <option value="PRO_LABORE">Pró-labore</option>
            <option value="REEMBOLSO">Reembolso</option>
          </select>
        </div>

        <div>
          <label className="label">Valor</label>
          <input name="valor" required className="input" placeholder="5.000,00" />
        </div>

        <div>
          <label className="label">Competência</label>
          <input
            type="date"
            name="dataCompetencia"
            required
            className="input"
            defaultValue={hoje()}
          />
        </div>

        <div>
          <label className="label">Data do pagamento</label>
          <input type="date" name="dataCaixa" className="input" defaultValue={hoje()} />
        </div>

        <div>
          <label className="label">Descrição (opcional)</label>
          <input name="descricao" className="input" />
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {explicacao[natureza]}
      </p>

      <Acoes pendente={pendente} label="Registrar" />
    </form>
  );
}

// ---------------------------------------------------------------------------

function FormAporte({ socios, onOk }: Props & { onOk: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          try {
            setErro(null);
            await registrarAporte(fd);
            form.current?.reset();
            onOk();
          } catch (e) {
            setErro((e as Error).message);
          }
        });
      }}
    >
      <Erro msg={erro} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="label">Descrição</label>
          <input name="descricao" className="input" placeholder="Aporte de capital" />
        </div>
        <div>
          <label className="label">Sócio</label>
          <select name="socioId" className="input">
            <option value="">—</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Valor</label>
          <input name="valor" required className="input" />
        </div>
        <div>
          <label className="label">Data</label>
          <input
            type="date"
            name="dataCompetencia"
            required
            className="input"
            defaultValue={hoje()}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Aporte entra no caixa mas não é receita — não gera imposto e não aparece
        como faturamento.
      </p>

      <Acoes pendente={pendente} label="Registrar aporte" />
    </form>
  );
}
