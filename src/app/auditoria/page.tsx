"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { PageTitle, Tag, Vazio, Dinheiro } from "@/components/ui";
import {
  EsqueletoAuditoria,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useDados } from "@/hooks/useDados";
import { verboDe, rotuloEntidade, corDaAcao, ACOES, ENTIDADES } from "@/lib/auditoria-formato";
import { intlLocale, t } from "@/lib/i18n";

type Registro = {
  id: string;
  quando: string;
  autor: string;
  email: string;
  socioId: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  resumo: string;
  valorCentavos: number | null;
};

type Dados = {
  total: number;
  truncado: boolean;
  limite: number;
  registros: Registro[];
  socios: { id: string; nome: string }[];
  porPessoa: { nome: string; quantidade: number }[];
};

const AGORA = new Intl.DateTimeFormat(intlLocale, {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function AuditoriaPage() {
  const [socio, setSocio] = useState("");
  const [entidade, setEntidade] = useState("");
  const [acao, setAcao] = useState("");

  const qs = new URLSearchParams(
    Object.entries({ socio, entidade, acao }).filter(([, v]) => v !== "")
  ).toString();

  const { dados, erro, carregando, atualizando, tentarNovamente } = useDados<Dados>(
    `/api/ui/auditoria${qs ? `?${qs}` : ""}`
  );

  const cabecalho = (
    <PageTitle titulo={t.audit.title} descricao={t.audit.subtitle} />
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
        <EsqueletoAuditoria />
      </>
    );
  }

  const temFiltro = socio !== "" || entidade !== "" || acao !== "";

  return (
    <>
      <BarraAtualizando ativo={atualizando} />
      {cabecalho}

      {dados.porPessoa.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {dados.porPessoa.map((p) => (
            <span
              key={p.nome}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs"
            >
              <span className="font-medium text-navy-900">{p.nome}</span>
              <span className="num text-slate-500">{p.quantidade}</span>
            </span>
          ))}
        </div>
      )}

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[160px] flex-1">
          <label className="label">{t.audit.filtroPessoa}</label>
          <select
            value={socio}
            onChange={(e) => setSocio(e.target.value)}
            className="input"
          >
            <option value="">{t.common.all_f}</option>
            {dados.socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px] flex-1">
          <label className="label">{t.audit.filtroOnde}</label>
          <select
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
            className="input"
          >
            <option value="">{t.common.everything}</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>
                {rotuloEntidade(e)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px] flex-1">
          <label className="label">{t.audit.filtroAcao}</label>
          <select value={acao} onChange={(e) => setAcao(e.target.value)} className="input">
            <option value="">{t.common.all_f}</option>
            {ACOES.map((a) => (
              <option key={a} value={a}>
                {verboDe(a)}
              </option>
            ))}
          </select>
        </div>
        {temFiltro && (
          <button
            onClick={() => {
              setSocio("");
              setEntidade("");
              setAcao("");
            }}
            className="flex items-center gap-1 py-2 text-sm text-slate-500 underline"
          >
            <X size={13} /> {t.common.clear}
          </button>
        )}
      </div>

      {dados.registros.length === 0 ? (
        <Vazio>{temFiltro ? t.audit.vazioComFiltro : t.audit.vazio}</Vazio>
      ) : (
        <ol className="card divide-y divide-slate-100">
          {dados.registros.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 p-3 sm:p-4">
              <Tag cor={corDaAcao(r.acao)}>{verboDe(r.acao)}</Tag>

              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                <div className="text-sm text-navy-900">{r.resumo}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  <span className="font-medium">{r.autor}</span>
                  {" · "}
                  {rotuloEntidade(r.entidade)}
                  {" · "}
                  <time dateTime={r.quando}>{AGORA.format(new Date(r.quando))}</time>
                </div>
              </div>

              {r.valorCentavos != null && (
                <Dinheiro
                  centavos={r.valorCentavos}
                  className="ml-auto shrink-0 text-sm font-medium"
                />
              )}
            </li>
          ))}
        </ol>
      )}

      {dados.truncado && (
        <p className="mt-3 text-xs text-slate-500">
          {t.audit.truncado(dados.limite, dados.total)}
        </p>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          {t.audit.appendOnlyPre} <strong>{t.audit.appendOnlyBold}</strong>
          {t.audit.appendOnly}
        </span>
      </p>
    </>
  );
}
