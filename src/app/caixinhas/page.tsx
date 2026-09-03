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
import { ICONES, CHAVES_ICONE, CORES, iconeDe } from "@/lib/caixinha-icones";
import { formatarBRL, formatarBps } from "@/lib/money";
import { formatarData } from "@/lib/datas";

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
      titulo="Caixinhas"
      descricao="Separe dinheiro por objetivo. Guardar tira da conta e põe na caixinha."
      acao={
        <button
          onClick={() => {
            setCriando(true);
            setEditando(null);
          }}
          className="btn-teal"
          disabled={carregando}
        >
          <Plus size={15} /> Nova caixinha
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
          titulo="Em conta"
          valorCentavos={dados.totais.saldoContaCentavos}
          detalhe="Disponível para movimentar"
        />
        <Kpi
          titulo="Guardado"
          valorCentavos={dados.totais.guardadoCentavos}
          detalhe={`${ativas.length} caixinha(s) ativa(s)`}
          destaque
        />
        <Kpi
          titulo="Patrimônio"
          valorCentavos={dados.totais.patrimonioCentavos}
          detalhe="Conta + caixinhas"
        />
        <Kpi
          titulo="Caixa livre"
          valorCentavos={dados.totais.caixaLivreCentavos}
          detalhe="Conta menos imposto sobre recebido"
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
              return editando ? "Caixinha atualizada." : "Caixinha criada.";
            })
          }
        />
      )}

      {ativas.length === 0 && !criando ? (
        <Vazio>
          Nenhuma caixinha ainda. Crie uma para separar dinheiro por objetivo —
          reserva de emergência, 13º, equipamento, provisão de imposto.
        </Vazio>
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
            Arquivadas
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
                    reativar
                  </button>
                  <button
                    disabled={acao.pendente}
                    onClick={() => acao.executar(() => excluirCaixinha(c.id))}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Guardar é uma transferência entre bolsos seus: o dinheiro sai da conta e
        entra na caixinha, e cada movimento aparece no extrato como{" "}
        <strong>Transferência</strong>. Não é receita nem despesa — o lucro do mês
        não muda quando você guarda. O que muda é o caixa livre, porque o dinheiro
        deixou de estar disponível.
      </p>
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
            title="Editar"
          >
            <Pencil size={14} />
          </button>
        </div>

        {c.progresso && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Meta {formatarBRL(c.metaCentavos!)}
                {c.metaData && ` até ${formatarData(new Date(c.metaData))}`}
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
                ? "Meta atingida"
                : `Faltam ${formatarBRL(c.progresso.faltaCentavos)}`}
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
            <ArrowDownToLine size={13} /> Guardar
          </button>
          <button
            onClick={() => setMovimento(movimento === "RESGATE" ? null : "RESGATE")}
            disabled={c.saldoCentavos === 0}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            <ArrowUpFromLine size={13} /> Resgatar
          </button>
          <button
            onClick={onAbrir}
            className="ml-auto rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            {aberta ? "fechar" : `histórico (${c.qtdMovimentos})`}
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
                return `${c.nome} agora tem ${formatarBRL(r.saldoCentavos)}.`;
              });
            }}
            className="mt-4 rounded-lg bg-slate-50 p-3"
          >
            <input type="hidden" name="caixinhaId" value={c.id} />
            <input type="hidden" name="tipo" value={movimento} />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="label">
                  {movimento === "DEPOSITO" ? "Guardar" : "Resgatar"}
                </label>
                <input
                  name="valor"
                  required
                  autoFocus
                  className="input"
                  placeholder="1.000,00"
                />
              </div>
              <div>
                <label className="label">Data</label>
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
              placeholder="Descrição (opcional)"
            />

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {movimento === "DEPOSITO"
                  ? `Disponível em conta: ${formatarBRL(saldoContaCentavos)}`
                  : `Nesta caixinha: ${formatarBRL(c.saldoCentavos)}`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMovimento(null)}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-200"
                >
                  cancelar
                </button>
                <button disabled={pendente} className="btn-teal px-3 py-1.5 text-xs">
                  {pendente ? "..." : "Confirmar"}
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
              Nenhum movimento ainda.
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
                        (m.tipo === "DEPOSITO" ? "Depósito" : "Resgate")}
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
                    title="Excluir movimento e a transferência do extrato"
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
              <Archive size={12} /> arquivar caixinha
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
          {caixinha ? `Editar ${caixinha.nome}` : "Nova caixinha"}
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
          <label className="label">Nome</label>
          <input
            name="nome"
            required
            defaultValue={caixinha?.nome}
            className="input"
            placeholder="Reserva de emergência"
          />
        </div>
        <div>
          <label className="label">Meta (opcional)</label>
          <input
            name="meta"
            defaultValue={
              caixinha?.metaCentavos
                ? (caixinha.metaCentavos / 100).toFixed(2).replace(".", ",")
                : ""
            }
            className="input"
            placeholder="30.000,00"
          />
        </div>
        <div>
          <label className="label">Até quando (opcional)</label>
          <input
            type="date"
            name="metaData"
            defaultValue={caixinha?.metaData?.slice(0, 10) ?? ""}
            className="input"
          />
        </div>
        <div className="lg:col-span-4">
          <label className="label">Observações</label>
          <input
            name="observacoes"
            defaultValue={caixinha?.observacoes ?? ""}
            className="input"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Cor</label>
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
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {CHAVES_ICONE.map((k) => {
              const { Icone, rotulo } = ICONES[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIcone(k)}
                  title={rotulo}
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
          Cancelar
        </button>
        <button disabled={pendente} className="btn-teal">
          {pendente ? "Salvando..." : caixinha ? "Salvar" : "Criar caixinha"}
        </button>
      </div>
    </form>
  );
}
