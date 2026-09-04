"use client";

import { useState, useRef } from "react";
import { Plus, ArrowDownToLine, ArrowUpFromLine, Pencil, Archive, Trash2, X } from "lucide-react";
import { PageTitle, Kpi, Vazio, Dinheiro } from "@/components/ui";
import {
  EsqueletoCaixinhas,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useDados } from "@/hooks/useDados";
import { useAcao, Avisos } from "@/hooks/useAcao";
import {
  criarCaixinha,
  atualizarCaixinha,
  arquivarCaixinha,
  excluirCaixinha,
  movimentarCaixinha,
  excluirMovimento,
} from "@/actions/caixinhas";
import { ICONES, CHAVES_ICONE, CORES, iconeDe, rotuloIcone } from "@/lib/caixinha-icones";
import { formatarBRL, formatarBps } from "@/lib/money";
import { formatarData } from "@/lib/datas";
import { t } from "@/lib/i18n";

type Caixinha = {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  ativa: boolean;
  observacoes: string | null;
  metaCentavos: number | null;
  metaData: string | null;
  saldoCentavos: number;
  qtdMovimentos: number;
  progresso: { percentualBps: number; faltaCentavos: number; atingida: boolean } | null;
};

type Dados = {
  caixinhas: Caixinha[];
  totais: {
    guardadoCentavos: number;
    saldoContaCentavos: number;
    patrimonioCentavos: number;
    caixaLivreCentavos: number;
  };
  detalhe: {
    caixinhaId: string;
    movimentos: {
      id: string;
      tipo: string;
      valorCentavos: number;
      data: string;
      descricao: string | null;
    }[];
  } | null;
};

const hoje = () => new Date().toISOString().slice(0, 10);

export default function CaixinhasPage() {
  const [aberta, setAberta] = useState<string | null>(null);
  const [editando, setEditando] = useState<Caixinha | null>(null);
  const [criando, setCriando] = useState(false);

  const { dados, erro, carregando, atualizando, recarregar, tentarNovamente } =
    useDados<Dados>(`/api/ui/caixinhas${aberta ? `?detalhe=${aberta}` : ""}`);

  const acao = useAcao(recarregar);

  const cabecalho = (
    <PageTitle
      titulo={t.reserves.title}
      descricao={t.reserves.subtitle}
      acao={
        <button
          onClick={() => {
            setCriando(true);
            setEditando(null);
          }}
          className="btn-teal"
          disabled={carregando}
        >
          <Plus size={15} /> {t.reserves.nova}
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
        <EsqueletoCaixinhas />
      </>
    );
  }

  const ativas = dados.caixinhas.filter((c) => c.ativa);
  const arquivadas = dados.caixinhas.filter((c) => !c.ativa);

  return (
    <>
      <BarraAtualizando ativo={atualizando || acao.pendente} />
      {cabecalho}
      <Avisos erro={acao.erro} mensagem={acao.mensagem} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi
          titulo={t.reserves.kpiEmConta}
          valorCentavos={dados.totais.saldoContaCentavos}
          detalhe={t.reserves.kpiEmContaDetalhe}
        />
        <Kpi
          titulo={t.reserves.kpiGuardado}
          valorCentavos={dados.totais.guardadoCentavos}
          detalhe={t.reserves.kpiGuardadoDetalhe(ativas.length)}
          destaque
        />
        <Kpi
          titulo={t.reserves.kpiPatrimonio}
          valorCentavos={dados.totais.patrimonioCentavos}
          detalhe={t.reserves.kpiPatrimonioDetalhe}
        />
        <Kpi
          titulo={t.reserves.kpiCaixaLivre}
          valorCentavos={dados.totais.caixaLivreCentavos}
          detalhe={t.reserves.kpiCaixaLivreDetalhe}
          tom={dados.totais.caixaLivreCentavos >= 0 ? "positivo" : "negativo"}
        />
      </div>

      {(criando || editando) && (
        <FormCaixinha
          caixinha={editando}
          pendente={acao.pendente}
          onFechar={() => {
            setCriando(false);
            setEditando(null);
          }}
          onSalvar={(fd) =>
            acao.executar(async () => {
              if (editando) {
                await atualizarCaixinha(editando.id, fd);
              } else {
                await criarCaixinha(fd);
              }
              setCriando(false);
              setEditando(null);
              return editando ? t.reserves.atualizada : t.reserves.criada;
            })
          }
        />
      )}

      {ativas.length === 0 && !criando ? (
        <Vazio>{t.reserves.vazio}</Vazio>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ativas.map((c) => (
            <CardCaixinha
              key={c.id}
              caixinha={c}
              aberta={aberta === c.id}
              detalhe={dados.detalhe?.caixinhaId === c.id ? dados.detalhe : null}
              saldoContaCentavos={dados.totais.saldoContaCentavos}
              pendente={acao.pendente}
              onAbrir={() => setAberta(aberta === c.id ? null : c.id)}
              onEditar={() => {
                setEditando(c);
                setCriando(false);
              }}
              acao={acao}
            />
          ))}
        </div>
      )}

      {arquivadas.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t.reserves.arquivadas}
          </h2>
          <div className="card divide-y divide-slate-100">
            {arquivadas.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-600">{c.nome}</span>
                <div className="flex gap-1">
                  <button
                    disabled={acao.pendente}
                    onClick={() => acao.executar(() => arquivarCaixinha(c.id, true))}
                    className="rounded px-2 py-1 text-xs text-teal-700 hover:bg-teal-50"
                  >
                    {t.reserves.reativar}
                  </button>
                  <button
                    disabled={acao.pendente}
                    onClick={() => acao.executar(() => excluirCaixinha(c.id))}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    {t.common.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">{t.reserves.notaRodape}</p>
    </>
  );
}

// ---------------------------------------------------------------------------

function CardCaixinha({
  caixinha: c,
  aberta,
  detalhe,
  saldoContaCentavos,
  pendente,
  onAbrir,
  onEditar,
  acao,
}: {
  caixinha: Caixinha;
  aberta: boolean;
  detalhe: Dados["detalhe"];
  saldoContaCentavos: number;
  pendente: boolean;
  onAbrir: () => void;
  onEditar: () => void;
  acao: ReturnType<typeof useAcao>;
}) {
  const [movimento, setMovimento] = useState<"DEPOSITO" | "RESGATE" | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const Icone = iconeDe(c.icone);

  return (
    <div className="card overflow-hidden">
      <div className="p-4" style={{ borderTop: `3px solid ${c.cor}` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${c.cor}1a`, color: c.cor }}
            >
              <Icone size={20} />
            </span>
            <div>
              <div className="font-medium text-navy-900">{c.nome}</div>
              <div className="num text-xl font-semibold text-navy-900">
                {formatarBRL(c.saldoCentavos)}
              </div>
            </div>
          </div>
          <button
            onClick={onEditar}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title={t.common.edit}
          >
            <Pencil size={14} />
          </button>
        </div>

        {c.progresso && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {t.reserves.metaLabel(formatarBRL(c.metaCentavos!))}
                {c.metaData && t.reserves.metaAte(formatarData(new Date(c.metaData)))}
              </span>
              <span
                className={
                  c.progresso.atingida
                    ? "font-medium text-emerald-600"
                    : "text-slate-500"
                }
              >
                {formatarBps(c.progresso.percentualBps)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${c.progresso.percentualBps / 100}%`,
                  backgroundColor: c.progresso.atingida ? "#16a34a" : c.cor,
                }}
              />
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {c.progresso.atingida
                ? t.reserves.metaAtingida
                : t.reserves.metaFaltam(formatarBRL(c.progresso.faltaCentavos))}
            </div>
          </div>
        )}

        {c.observacoes && (
          <p className="mt-3 text-xs text-slate-500">{c.observacoes}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setMovimento(movimento === "DEPOSITO" ? null : "DEPOSITO")}
            className="btn-teal px-3 py-1.5 text-xs"
          >
            <ArrowDownToLine size={13} /> {t.reserves.guardar}
          </button>
          <button
            onClick={() => setMovimento(movimento === "RESGATE" ? null : "RESGATE")}
            disabled={c.saldoCentavos === 0}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            <ArrowUpFromLine size={13} /> {t.reserves.resgatar}
          </button>
          <button
            onClick={onAbrir}
            className="ml-auto rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            {aberta ? t.common.close : t.reserves.historico(c.qtdMovimentos)}
          </button>
        </div>

        {movimento && (
          <form
            ref={form}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              acao.executar(async () => {
                const r = await movimentarCaixinha(fd);
                form.current?.reset();
                setMovimento(null);
                return t.reserves.novoSaldo(c.nome, formatarBRL(r.saldoCentavos));
              });
            }}
            className="mt-4 rounded-lg bg-slate-50 p-3"
          >
            <input type="hidden" name="caixinhaId" value={c.id} />
            <input type="hidden" name="tipo" value={movimento} />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="label">
                  {movimento === "DEPOSITO" ? t.reserves.guardar : t.reserves.resgatar}
                </label>
                <input
                  name="valor"
                  required
                  autoFocus
                  className="input"
                  placeholder={t.reserves.phValorMov}
                />
              </div>
              <div>
                <label className="label">{t.common.date}</label>
                <input
                  type="date"
                  name="data"
                  defaultValue={hoje()}
                  className="input w-40"
                />
              </div>
            </div>
            <input
              name="descricao"
              className="input mt-2"
              placeholder={t.reserves.phDescMov}
            />

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {movimento === "DEPOSITO"
                  ? t.reserves.dispEmConta(formatarBRL(saldoContaCentavos))
                  : t.reserves.nestaCaixinha(formatarBRL(c.saldoCentavos))}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMovimento(null)}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
                >
                  {t.common.cancelLower}
                </button>
                <button disabled={pendente} className="btn-teal px-3 py-1.5 text-xs">
                  {pendente ? t.reserves.confirmarCurto : t.common.confirm}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {aberta && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {!detalhe || detalhe.movimentos.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">
              {t.reserves.nenhumMovimento}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {detalhe.movimentos.map((m) => (
                <li key={m.id} className="flex items-center gap-2 py-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      m.tipo === "DEPOSITO"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {m.tipo === "DEPOSITO" ? (
                      <ArrowDownToLine size={12} />
                    ) : (
                      <ArrowUpFromLine size={12} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-slate-700">
                      {m.descricao ??
                        (m.tipo === "DEPOSITO" ? t.reserves.movDeposito : t.reserves.movResgate)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatarData(new Date(m.data))}
                    </div>
                  </div>
                  <Dinheiro
                    centavos={
                      m.tipo === "DEPOSITO" ? m.valorCentavos : -m.valorCentavos
                    }
                    sinal
                    className="text-xs"
                  />
                  <button
                    disabled={pendente}
                    onClick={() => acao.executar(() => excluirMovimento(m.id))}
                    className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                    title={t.reserves.excluirMovTitle}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {c.saldoCentavos === 0 && (
            <button
              disabled={pendente}
              onClick={() => acao.executar(() => arquivarCaixinha(c.id, false))}
              className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <Archive size={12} /> {t.reserves.arquivarCaixinha}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FormCaixinha({
  caixinha,
  pendente,
  onFechar,
  onSalvar,
}: {
  caixinha: Caixinha | null;
  pendente: boolean;
  onFechar: () => void;
  onSalvar: (fd: FormData) => void;
}) {
  const [cor, setCor] = useState(caixinha?.cor ?? CORES[0]);
  const [icone, setIcone] = useState(caixinha?.icone ?? "piggy-bank");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalvar(new FormData(e.currentTarget));
      }}
      className="card mb-6 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {caixinha ? t.reserves.formEditar(caixinha.nome) : t.reserves.formNova}
        </h2>
        <button
          type="button"
          onClick={onFechar}
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
        >
          <X size={16} />
        </button>
      </div>

      <input type="hidden" name="cor" value={cor} />
      <input type="hidden" name="icone" value={icone} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="label">{t.reserves.fNome}</label>
          <input
            name="nome"
            required
            defaultValue={caixinha?.nome}
            className="input"
            placeholder={t.reserves.phNome}
          />
        </div>
        <div>
          <label className="label">{t.reserves.fMeta}</label>
          <input
            name="meta"
            defaultValue={
              caixinha?.metaCentavos
                ? (caixinha.metaCentavos / 100).toFixed(2).replace(".", ",")
                : ""
            }
            className="input"
            placeholder={t.reserves.phMeta}
          />
        </div>
        <div>
          <label className="label">{t.reserves.fMetaData}</label>
          <input
            type="date"
            name="metaData"
            defaultValue={caixinha?.metaData?.slice(0, 10) ?? ""}
            className="input"
          />
        </div>
        <div className="lg:col-span-4">
          <label className="label">{t.reserves.fObservacoes}</label>
          <input
            name="observacoes"
            defaultValue={caixinha?.observacoes ?? ""}
            className="input"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">{t.reserves.fCor}</label>
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                style={{ backgroundColor: c }}
                className={`h-7 w-7 rounded-full transition-transform ${
                  cor === c ? "scale-110 ring-2 ring-navy-900 ring-offset-2" : ""
                }`}
                aria-label={t.reserves.corAria(c)}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">{t.reserves.fIcone}</label>
          <div className="flex flex-wrap gap-2">
            {CHAVES_ICONE.map((k) => {
              const { Icone } = ICONES[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIcone(k)}
                  title={rotuloIcone(k)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                    icone === k
                      ? "border-navy-900 bg-navy-900 text-white"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icone size={15} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onFechar} className="btn-ghost">
          {t.common.cancel}
        </button>
        <button disabled={pendente} className="btn-teal">
          {pendente ? t.common.saving : caixinha ? t.common.save : t.reserves.criarCaixinha}
        </button>
      </div>
    </form>
  );
}
