"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { formatarBRL, formatarBps } from "@/lib/money";
import { t } from "@/lib/i18n";
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
  { id: "receita", label: t.forms.abaReceita, Icone: TrendingUp },
  { id: "despesa", label: t.forms.abaDespesa, Icone: TrendingDown },
  { id: "distribuicao", label: t.forms.abaDistribuicao, Icone: Users },
  { id: "aporte", label: t.forms.abaAporte, Icone: Landmark },
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
          {aberto ? t.forms.fecharFormulario : t.forms.novoLancamento}
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
        {pendente ? t.forms.salvando : label}
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
          <label className="label">{t.forms.descricao}</label>
          <input name="descricao" required className="input" placeholder={t.forms.phReceita} />
        </div>

        <div>
          <label className="label">{t.forms.valorBruto}</label>
          <input
            name="valor"
            required
            className="input"
            placeholder={t.forms.phValorReceita}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

        <div>
          <label className="label">{t.forms.cliente}</label>
          <select name="clienteId" className="input">
            <option value="">{t.forms.semCliente}</option>
            {clientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{t.forms.categoria}</label>
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
          <label className="label">{t.forms.dataFaturamento}</label>
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
          <label className="label">{t.forms.dataRecebimento}</label>
          <input type="date" name="dataCaixa" className="input" />
          <p className="mt-1 text-xs text-slate-400">{t.forms.aReceberHint}</p>
        </div>

        <div className="lg:col-span-2">
          <label className="label">{t.forms.observacoes}</label>
          <input name="observacoes" className="input" />
        </div>
      </div>

      {/* ---- Bloco de imposto ---- */}
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-navy-900">
            {t.forms.impostoBloco}
          </span>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="semImposto"
              checked={semImposto}
              onChange={(e) => setSemImposto(e.target.checked)}
            />
            {t.forms.semIncidencia}
          </label>
        </div>

        {!semImposto && (
          <>
            {preview?.ok ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Numero titulo={t.forms.numBruto} valor={formatarBRL(preview.impostoCentavos + preview.liquidoCentavos)} />
                  <Numero
                    titulo={t.forms.numAliquota(preview.anexo, preview.faixa)}
                    valor={formatarBps(preview.aliquotaBps)}
                  />
                  <Numero
                    titulo={t.forms.numImposto}
                    valor={formatarBRL(preview.impostoCentavos)}
                    tom="negativo"
                  />
                  <Numero
                    titulo={t.forms.numLiquido}
                    valor={formatarBRL(preview.liquidoCentavos)}
                    tom="positivo"
                  />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {t.forms.impostoNota(formatarBRL(preview.rbt12Centavos))}
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
                  {editarImposto ? t.forms.usarAutomatico : t.forms.ajustarManual}
                </button>

                {editarImposto && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">{t.forms.aliquotaPct}</label>
                      <input
                        name="impostoAliquota"
                        className="input"
                        placeholder={(preview.aliquotaBps / 100).toFixed(2)}
                      />
                    </div>
                    <div>
                      <label className="label">{t.forms.ouValorImposto}</label>
                      <input name="impostoValor" className="input" placeholder={t.forms.phImpostoValor} />
                    </div>
                    <p className="text-xs text-slate-500 sm:col-span-2">
                      {t.forms.valorPrevalece}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {preview && !preview.ok ? preview.erro : t.forms.informeValor}
              </p>
            )}
          </>
        )}
      </div>

      <Acoes pendente={pendente} label={t.forms.registrarReceita} />
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
          <label className="label">{t.forms.descricao}</label>
          <input name="descricao" required className="input" placeholder={t.forms.phDespesa} />
        </div>

        <div>
          <label className="label">{t.forms.valor}</label>
          <input name="valor" required className="input" placeholder={t.forms.phValorDespesa} />
        </div>

        <div>
          <label className="label">{t.forms.categoria}</label>
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
          <label className="label">{t.forms.clienteOpcional}</label>
          <select name="clienteId" className="input">
            <option value="">{t.forms.despesaGeral}</option>
            {clientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">{t.forms.margemHint}</p>
        </div>

        <div>
          <label className="label">{t.forms.pagoPor}</label>
          <select name="socioId" className="input">
            <option value="">{t.forms.empresa}</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {t.forms.doProprioBolso(s.nome)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">{t.forms.bolsoHint}</p>
        </div>

        <div>
          <label className="label">{t.forms.dataDespesa}</label>
          <input
            type="date"
            name="dataCompetencia"
            required
            className="input"
            defaultValue={hoje()}
          />
        </div>

        <div>
          <label className="label">{t.forms.dataPagamento}</label>
          <input type="date" name="dataCaixa" className="input" defaultValue={hoje()} />
          <p className="mt-1 text-xs text-slate-400">{t.forms.naoPagoHint}</p>
        </div>

        <div className="lg:col-span-3">
          <label className="label">{t.forms.observacoes}</label>
          <input name="observacoes" className="input" />
        </div>
      </div>

      <Acoes pendente={pendente} label={t.forms.registrarDespesa} />
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
    LUCRO: t.forms.natExplicaLucro,
    PRO_LABORE: t.forms.natExplicaProLabore,
    REEMBOLSO: t.forms.natExplicaReembolso,
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
          <label className="label">{t.forms.socio}</label>
          <select name="socioId" required className="input">
            <option value="">{t.forms.selecione}</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{t.forms.natureza}</label>
          <select
            name="natureza"
            className="input"
            value={natureza}
            onChange={(e) => setNatureza(e.target.value)}
          >
            <option value="LUCRO">{t.forms.natLucro}</option>
            <option value="PRO_LABORE">{t.forms.natProLabore}</option>
            <option value="REEMBOLSO">{t.forms.natReembolso}</option>
          </select>
        </div>

        <div>
          <label className="label">{t.forms.valor}</label>
          <input name="valor" required className="input" placeholder={t.forms.phValorDistribuicao} />
        </div>

        <div>
          <label className="label">{t.forms.competencia}</label>
          <input
            type="date"
            name="dataCompetencia"
            required
            className="input"
            defaultValue={hoje()}
          />
        </div>

        <div>
          <label className="label">{t.forms.dataPagamento}</label>
          <input type="date" name="dataCaixa" className="input" defaultValue={hoje()} />
        </div>

        <div>
          <label className="label">{t.forms.descricaoOpcional}</label>
          <input name="descricao" className="input" />
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {explicacao[natureza]}
      </p>

      <Acoes pendente={pendente} label={t.forms.registrar} />
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
          <label className="label">{t.forms.descricao}</label>
          <input name="descricao" className="input" placeholder={t.forms.phAporte} />
        </div>
        <div>
          <label className="label">{t.forms.socio}</label>
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
          <label className="label">{t.forms.valor}</label>
          <input name="valor" required className="input" />
        </div>
        <div>
          <label className="label">{t.forms.data}</label>
          <input
            type="date"
            name="dataCompetencia"
            required
            className="input"
            defaultValue={hoje()}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">{t.forms.aporteHint}</p>

      <Acoes pendente={pendente} label={t.forms.registrarAporte} />
    </form>
  );
}
