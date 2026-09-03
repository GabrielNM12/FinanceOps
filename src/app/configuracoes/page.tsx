"use client";

import { useRef, useState } from "react";
import { Users, Building2, Tags, Percent, Database, Pencil, Check, X, Mail } from "lucide-react";
import { PageTitle, Secao, Aviso, Tag, Dinheiro } from "@/components/ui";
import {
  EsqueletoConfiguracoes,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useDados } from "@/hooks/useDados";
import { useAcao, Avisos } from "@/hooks/useAcao";
import { atualizarFaixa, definirConfig } from "@/actions/impostos";
import {
  criarCategoria,
  excluirCategoria,
  criarSocio,
  excluirSocio,
  criarCliente,
  excluirCliente,
  alternarCliente,
  alterarEmailSocio,
} from "@/actions/cadastros";
import { formatarBRL, formatarBps, parseBps, parseCentavos } from "@/lib/money";

type Dados = {
  config: Record<string, string>;
  socios: {
    id: string;
    nome: string;
    email: string | null;
    participacaoBps: number;
    ativo: boolean;
    recebidoCentavos: number;
  }[];
  somaParticipacaoBps: number;
  clientes: {
    id: string;
    nome: string;
    ativo: boolean;
    receitaCentavos: number;
    impostoCentavos: number;
    despesaCentavos: number;
    margemCentavos: number;
    margemBps: number;
  }[];
  categorias: {
    id: string;
    nome: string;
    natureza: string;
    ehImposto: boolean;
    cor: string;
  }[];
  faixas: {
    id: string;
    anexo: string;
    faixa: number;
    limiteInferiorCentavos: number;
    limiteSuperiorCentavos: number;
    aliquotaNominalBps: number;
    deducaoCentavos: number;
  }[];
};

export default function ConfiguracoesPage() {
  const { dados, erro, carregando, atualizando, recarregar, tentarNovamente } =
    useDados<Dados>("/api/ui/configuracoes");
  const acao = useAcao(recarregar);

  const formSocio = useRef<HTMLFormElement>(null);
  const formCliente = useRef<HTMLFormElement>(null);
  const formCategoria = useRef<HTMLFormElement>(null);

  const cabecalho = (
    <PageTitle
      titulo="Configurações"
      descricao="Sócios, clientes, categorias e parâmetros fiscais."
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
        <EsqueletoConfiguracoes />
      </>
    );
  }

  return (
    <>
      <BarraAtualizando ativo={atualizando || acao.pendente} />
      {cabecalho}
      <Avisos erro={acao.erro} mensagem={acao.mensagem} />

      <div className="grid gap-6">
        {/* ---- Sócios ---- */}
        <Secao titulo="Sócios">
          {dados.socios.length > 0 && dados.somaParticipacaoBps !== 10000 && (
            <div className="mb-4">
              <Aviso tom="alerta">
                As participações somam {formatarBps(dados.somaParticipacaoBps)} em vez
                de 100%. Com 6 sócios em partes iguais o certo é 16,67% para quatro
                deles e 16,66% para dois — 16,67% em todos daria 100,02%.
              </Aviso>
            </div>
          )}

          <form
            ref={formSocio}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              acao.executar(async () => {
                await criarSocio(fd);
                formSocio.current?.reset();
              });
            }}
            className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4"
          >
            <div className="min-w-[200px] flex-1">
              <label className="label">Nome</label>
              <input name="nome" required className="input" />
            </div>
            <div className="min-w-[180px]">
              <label className="label">E-mail</label>
              <input name="email" type="email" className="input" />
            </div>
            <div>
              <label className="label">Participação (%)</label>
              <input name="participacao" className="input w-32" placeholder="16,67" />
            </div>
            <button disabled={acao.pendente} className="btn-teal">
              <Users size={15} /> Adicionar
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Sócio</th>
                  <th className="th">E-mail</th>
                  <th className="th text-right">Participação</th>
                  <th className="th text-right">Já recebeu</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {dados.socios.map((s) => (
                  <tr key={s.id} className={s.ativo ? "" : "opacity-50"}>
                    <td className="td font-medium text-navy-900">{s.nome}</td>
                    <td className="td">
                      <CelulaEmail
                        socio={s}
                        pendente={acao.pendente}
                        onSalvar={(email) =>
                          acao.executar(async () => {
                            await alterarEmailSocio(s.id, email);
                            return email
                              ? `Acesso de ${s.nome} agora é ${email}. O endereço anterior perdeu o acesso na hora.`
                              : `${s.nome} ficou sem e-mail e não consegue mais entrar.`;
                          })
                        }
                      />
                    </td>
                    <td className="td num text-right">
                      {formatarBps(s.participacaoBps)}
                    </td>
                    <td className="td text-right">
                      <Dinheiro centavos={s.recebidoCentavos} />
                    </td>
                    <td className="td text-right">
                      <button
                        disabled={acao.pendente}
                        onClick={() => acao.executar(() => excluirSocio(s.id))}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="td font-semibold" colSpan={2}>
                    Total
                  </td>
                  <td
                    className={`td num text-right font-semibold ${
                      dados.somaParticipacaoBps === 10000
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {formatarBps(dados.somaParticipacaoBps)}
                  </td>
                  <td className="td" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Sócio com distribuição registrada não é excluído, só inativado — apagar
            levaria embora o histórico de quem recebeu o quê.
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
            <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              O e-mail é a identidade de login: só endereços listados aqui, em
              sócios ativos, recebem link de acesso. Ao trocar um endereço, o
              anterior perde o acesso imediatamente — sessões abertas caem e links
              já enviados param de valer.
            </span>
          </p>
        </Secao>

        {/* ---- Clientes ---- */}
        <Secao titulo="Clientes">
          <form
            ref={formCliente}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              acao.executar(async () => {
                await criarCliente(fd);
                formCliente.current?.reset();
              });
            }}
            className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4"
          >
            <div className="min-w-[240px] flex-1">
              <label className="label">Nome do cliente</label>
              <input name="nome" required className="input" placeholder="ACME Ltda" />
            </div>
            <button disabled={acao.pendente} className="btn-teal">
              <Building2 size={15} /> Adicionar
            </button>
          </form>

          {dados.clientes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nenhum cliente cadastrado. Eles aparecem no seletor ao lançar uma
              receita, e também são criados automaticamente ao importar um CSV com a
              coluna <code>cliente</code>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Cliente</th>
                    <th className="th text-right">Receita</th>
                    <th className="th text-right">Impostos</th>
                    <th className="th text-right">Despesas</th>
                    <th className="th text-right">Margem</th>
                    <th className="th text-right">%</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {dados.clientes.map((c) => (
                    <tr key={c.id} className={c.ativo ? "" : "opacity-50"}>
                      <td className="td font-medium text-navy-900">
                        {c.nome}
                        {!c.ativo && (
                          <span className="badge ml-2 bg-slate-100 text-slate-500">
                            inativo
                          </span>
                        )}
                      </td>
                      <td className="td text-right">
                        <Dinheiro centavos={c.receitaCentavos} />
                      </td>
                      <td className="td text-right text-slate-500">
                        <Dinheiro centavos={c.impostoCentavos} />
                      </td>
                      <td className="td text-right text-slate-500">
                        <Dinheiro centavos={c.despesaCentavos} />
                      </td>
                      <td className="td text-right font-medium">
                        <Dinheiro centavos={c.margemCentavos} sinal />
                      </td>
                      <td
                        className={`td num text-right ${
                          c.margemBps < 0
                            ? "text-red-600"
                            : c.margemBps < 2000
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }`}
                      >
                        {c.receitaCentavos > 0 ? formatarBps(c.margemBps) : "—"}
                      </td>
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          <button
                            disabled={acao.pendente}
                            onClick={() =>
                              acao.executar(() => alternarCliente(c.id, !c.ativo))
                            }
                            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                          >
                            {c.ativo ? "inativar" : "reativar"}
                          </button>
                          <button
                            disabled={acao.pendente}
                            onClick={() => acao.executar(() => excluirCliente(c.id))}
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
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Margem = receita − impostos provisionados sobre ela − despesas vinculadas
            ao cliente. Despesas gerais (contabilidade, escritório) não entram: não
            pertencem a um cliente específico e ratear distorceria a comparação.
            Cliente com lançamento é inativado em vez de excluído.
          </p>
        </Secao>

        {/* ---- Categorias ---- */}
        <Secao titulo="Categorias">
          <form
            ref={formCategoria}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              acao.executar(async () => {
                await criarCategoria(fd);
                formCategoria.current?.reset();
              });
            }}
            className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4"
          >
            <div className="min-w-[200px] flex-1">
              <label className="label">Nome</label>
              <input name="nome" required className="input" />
            </div>
            <div>
              <label className="label">Natureza</label>
              <select name="natureza" className="input">
                <option value="SAIDA">Despesa</option>
                <option value="ENTRADA">Receita</option>
              </select>
            </div>
            <div>
              <label className="label">Cor</label>
              <input
                type="color"
                name="cor"
                defaultValue="#2eb3c7"
                className="input h-10 w-20 p-1"
              />
            </div>
            <button disabled={acao.pendente} className="btn-teal">
              <Tags size={15} /> Adicionar
            </button>
          </form>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dados.categorias.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: c.cor }}
                  />
                  <span className="text-sm">{c.nome}</span>
                  <Tag cor={c.natureza === "ENTRADA" ? "#16a34a" : "#64748b"}>
                    {c.natureza === "ENTRADA" ? "receita" : "despesa"}
                  </Tag>
                  {c.ehImposto && (
                    <span className="badge bg-red-100 text-red-700">imposto</span>
                  )}
                </div>
                {!c.ehImposto && (
                  <button
                    disabled={acao.pendente}
                    onClick={() => acao.executar(() => excluirCategoria(c.id))}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            A natureza decide em qual formulário a categoria aparece. A categoria
            marcada como <strong>imposto</strong> é onde as guias de DAS são lançadas
            — ela não pode ser excluída, e só pode existir uma.
          </p>
        </Secao>

        {/* ---- Regime ---- */}
        <Secao titulo="Regime tributário">
          <div className="grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                acao.executar(async () => {
                  await definirConfig("anexo_simples", String(fd.get("valor")));
                  return "Anexo atualizado.";
                });
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-[200px] flex-1">
                <label className="label">Anexo do Simples</label>
                <select
                  name="valor"
                  defaultValue={dados.config.anexo_simples ?? "AUTO"}
                  className="input"
                >
                  <option value="AUTO">Automático (pelo Fator R)</option>
                  <option value="III">Forçar Anexo III</option>
                  <option value="V">Forçar Anexo V</option>
                </select>
              </div>
              <button disabled={acao.pendente} className="btn-ghost">
                Salvar
              </button>
              <p className="w-full text-xs text-slate-500">
                Deixe automático a menos que seu contador determine o contrário. No
                automático, o anexo é recalculado a cada lançamento a partir da
                relação pró-labore ÷ receita dos últimos 12 meses.
              </p>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                acao.executar(async () => {
                  await definirConfig("dia_vencimento_das", String(fd.get("valor")));
                  return "Dia de vencimento atualizado.";
                });
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-[160px] flex-1">
                <label className="label">Dia de vencimento do DAS</label>
                <input
                  name="valor"
                  type="number"
                  min={1}
                  max={28}
                  defaultValue={dados.config.dia_vencimento_das ?? "20"}
                  className="input"
                />
              </div>
              <button disabled={acao.pendente} className="btn-ghost">
                Salvar
              </button>
              <p className="w-full text-xs text-slate-500">
                Usado para calcular o vencimento das provisões. Não ajusta para dia
                útil.
              </p>
            </form>
          </div>
        </Secao>

        {/* ---- Faixas ---- */}
        <Secao titulo="Faixas do Simples Nacional">
          <div className="mb-4">
            <Aviso tom="alerta">
              Estes valores vieram de um seed e{" "}
              <strong>devem ser conferidos com seu contador</strong>. Alterar uma
              faixa muda apenas os cálculos futuros e as provisões em aberto que você
              recalcular — guias já pagas nunca são reescritas.
            </Aviso>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Anexo</th>
                  <th className="th">Faixa</th>
                  <th className="th">RBT12</th>
                  <th className="th">
                    <Percent size={12} className="mr-1 inline" />
                    Alíquota nominal e dedução
                  </th>
                </tr>
              </thead>
              <tbody>
                {dados.faixas.map((f) => (
                  <tr key={f.id}>
                    <td className="td">
                      <Tag cor={f.anexo === "III" ? "#16a34a" : "#f59e0b"}>
                        {f.anexo}
                      </Tag>
                    </td>
                    <td className="td text-slate-600">{f.faixa}ª</td>
                    <td className="td num text-xs text-slate-500">
                      {formatarBRL(f.limiteInferiorCentavos)} até{" "}
                      {formatarBRL(f.limiteSuperiorCentavos)}
                    </td>
                    <td className="td">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          acao.executar(async () => {
                            await atualizarFaixa(
                              f.id,
                              parseBps(String(fd.get("aliquota"))),
                              parseCentavos(String(fd.get("deducao")))
                            );
                            return `Faixa ${f.faixa} do Anexo ${f.anexo} atualizada.`;
                          });
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          name="aliquota"
                          defaultValue={(f.aliquotaNominalBps / 100).toFixed(2)}
                          className="input w-24"
                        />
                        <span className="text-xs text-slate-400">%</span>
                        <input
                          name="deducao"
                          defaultValue={(f.deducaoCentavos / 100).toFixed(2)}
                          className="input w-36"
                        />
                        <button
                          disabled={acao.pendente}
                          className="btn-ghost px-3 py-1 text-xs"
                        >
                          salvar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>

        {/* ---- Backup ---- */}
        <Secao titulo="Backup">
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <Database size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              O banco inteiro é um arquivo só:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                prisma/dev.db
              </code>
              . Backup é copiar esse arquivo com o app parado. Para backup semanal
              com o app no ar, use{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                npm run db:backup
              </code>
              , que usa o comando seguro do SQLite.
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ele está no <code>.gitignore</code> de propósito — contém dados
            financeiros reais e não deve ir para nenhum repositório.
          </p>
        </Secao>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

/**
 * Edição do e-mail direto na linha do sócio.
 *
 * Fica atrás de um clique de propósito: este campo é a credencial de acesso da
 * pessoa, e um input sempre aberto convida a alteração acidental.
 */
function CelulaEmail({
  socio,
  pendente,
  onSalvar,
}: {
  socio: { id: string; nome: string; email: string | null };
  pendente: boolean;
  onSalvar: (email: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(socio.email ?? "");

  if (!editando) {
    return (
      <div className="group flex items-center gap-2">
        <span className={socio.email ? "text-slate-600" : "text-amber-600"}>
          {socio.email ?? "sem e-mail — não consegue entrar"}
        </span>
        <button
          onClick={() => {
            setValor(socio.email ?? "");
            setEditando(true);
          }}
          className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
          title="Alterar e-mail de acesso"
        >
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        setEditando(false);
        onSalvar(valor.trim());
      }}
    >
      <input
        type="email"
        value={valor}
        autoFocus
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
        className="input py-1 text-sm"
        placeholder="voce@korvantis.com"
      />
      <button
        disabled={pendente}
        className="rounded p-1.5 text-teal-700 hover:bg-teal-50"
        title="Salvar"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
        title="Cancelar"
      >
        <X size={14} />
      </button>
    </form>
  );
}
