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
import { t } from "@/lib/i18n";

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
    <PageTitle titulo={t.settings.title} descricao={t.settings.subtitle} />
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
        <Secao titulo={t.settings.secSocios}>
          {dados.socios.length > 0 && dados.somaParticipacaoBps !== 10000 && (
            <div className="mb-4">
              <Aviso tom="alerta">
                {t.settings.participacaoAviso(formatarBps(dados.somaParticipacaoBps))}
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
              <label className="label">{t.settings.fNome}</label>
              <input name="nome" required className="input" />
            </div>
            <div className="min-w-[180px]">
              <label className="label">{t.settings.fEmail}</label>
              <input name="email" type="email" className="input" />
            </div>
            <div>
              <label className="label">{t.settings.fParticipacao}</label>
              <input name="participacao" className="input w-32" placeholder={t.settings.phParticipacao} />
            </div>
            <button disabled={acao.pendente} className="btn-teal">
              <Users size={15} /> {t.common.add}
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">{t.settings.thSocio}</th>
                  <th className="th">{t.settings.thEmail}</th>
                  <th className="th text-right">{t.settings.thParticipacao}</th>
                  <th className="th text-right">{t.settings.thJaRecebeu}</th>
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
                              ? t.settings.emailAlterado(s.nome, email)
                              : t.settings.emailRemovido(s.nome);
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
                        {t.common.remove}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="td font-semibold" colSpan={2}>
                    {t.settings.thTotal}
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

          <p className="mt-3 text-xs text-slate-500">{t.settings.sociosNota1}</p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
            <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" />
            <span>{t.settings.sociosNota2}</span>
          </p>
        </Secao>

        {/* ---- Clientes ---- */}
        <Secao titulo={t.settings.secClientes}>
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
              <label className="label">{t.settings.fNomeCliente}</label>
              <input name="nome" required className="input" placeholder={t.settings.phCliente} />
            </div>
            <button disabled={acao.pendente} className="btn-teal">
              <Building2 size={15} /> {t.common.add}
            </button>
          </form>

          {dados.clientes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {t.settings.clientesVazio}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">{t.settings.thCliente}</th>
                    <th className="th text-right">{t.settings.thReceita}</th>
                    <th className="th text-right">{t.settings.thImpostos}</th>
                    <th className="th text-right">{t.settings.thDespesas}</th>
                    <th className="th text-right">{t.settings.thMargem}</th>
                    <th className="th text-right">{t.settings.thPct}</th>
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
                            {t.settings.inativo}
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
                            {c.ativo ? t.settings.inativar : t.settings.reativar}
                          </button>
                          <button
                            disabled={acao.pendente}
                            onClick={() => acao.executar(() => excluirCliente(c.id))}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            {t.common.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">{t.settings.clientesNota}</p>
        </Secao>

        {/* ---- Categorias ---- */}
        <Secao titulo={t.settings.secCategorias}>
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
              <label className="label">{t.settings.fNome}</label>
              <input name="nome" required className="input" />
            </div>
            <div>
              <label className="label">{t.settings.fNatureza}</label>
              <select name="natureza" className="input">
                <option value="SAIDA">{t.settings.optDespesa}</option>
                <option value="ENTRADA">{t.settings.optReceita}</option>
              </select>
            </div>
            <div>
              <label className="label">{t.settings.fCor}</label>
              <input
                type="color"
                name="cor"
                defaultValue="#2eb3c7"
                className="input h-10 w-20 p-1"
              />
            </div>
            <button disabled={acao.pendente} className="btn-teal">
              <Tags size={15} /> {t.common.add}
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
                    {c.natureza === "ENTRADA" ? t.settings.tagReceita : t.settings.tagDespesa}
                  </Tag>
                  {c.ehImposto && (
                    <span className="badge bg-red-100 text-red-700">{t.settings.tagImposto}</span>
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

          <p className="mt-3 text-xs text-slate-500">{t.settings.categoriasNota}</p>
        </Secao>

        {/* ---- Regime ---- */}
        <Secao titulo={t.settings.secRegime}>
          <div className="grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                acao.executar(async () => {
                  await definirConfig("anexo_simples", String(fd.get("valor")));
                  return t.settings.anexoAtualizado;
                });
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-[200px] flex-1">
                <label className="label">{t.settings.anexoDoSimples}</label>
                <select
                  name="valor"
                  defaultValue={dados.config.anexo_simples ?? "AUTO"}
                  className="input"
                >
                  <option value="AUTO">{t.settings.optAuto}</option>
                  <option value="III">{t.settings.optForcarIII}</option>
                  <option value="V">{t.settings.optForcarV}</option>
                </select>
              </div>
              <button disabled={acao.pendente} className="btn-ghost">
                {t.common.save}
              </button>
              <p className="w-full text-xs text-slate-500">{t.settings.anexoNota}</p>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                acao.executar(async () => {
                  await definirConfig("dia_vencimento_das", String(fd.get("valor")));
                  return t.settings.diaAtualizado;
                });
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-[160px] flex-1">
                <label className="label">{t.settings.diaVencimentoDas}</label>
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
                {t.common.save}
              </button>
              <p className="w-full text-xs text-slate-500">{t.settings.diaNota}</p>
            </form>
          </div>
        </Secao>

        {/* ---- Faixas ---- */}
        <Secao titulo={t.settings.secFaixas}>
          <div className="mb-4">
            <Aviso tom="alerta">{t.settings.faixasAviso}</Aviso>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">{t.settings.thAnexo}</th>
                  <th className="th">{t.settings.thFaixa}</th>
                  <th className="th">{t.settings.thRbt12}</th>
                  <th className="th">
                    <Percent size={12} className="mr-1 inline" />
                    {t.settings.thAliquotaDeducao}
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
                    <td className="td text-slate-600">{t.settings.faixaOrdinal(f.faixa)}</td>
                    <td className="td num text-xs text-slate-500">
                      {formatarBRL(f.limiteInferiorCentavos)} {t.settings.faixaAte}{" "}
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
                            return t.settings.faixaAtualizada(f.faixa, f.anexo);
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
                          {t.common.saveShort}
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
        <Secao titulo={t.settings.secBackup}>
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <Database size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              {t.settings.backupTextoPre}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                prisma/dev.db
              </code>
              {t.settings.backupTextoMeio}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                npm run db:backup
              </code>
              {t.settings.backupTextoFim}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            <code>.gitignore</code> {t.settings.backupGitignore}
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
          {socio.email ?? t.settings.semEmail}
        </span>
        <button
          onClick={() => {
            setValor(socio.email ?? "");
            setEditando(true);
          }}
          className="rounded p-1 text-slate-300 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
          title={t.settings.alterarEmail}
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
        placeholder={t.settings.phEmail}
      />
      <button
        disabled={pendente}
        className="rounded p-1.5 text-teal-700 hover:bg-teal-50"
        title={t.common.save}
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
        title={t.common.cancel}
      >
        <X size={14} />
      </button>
    </form>
  );
}
