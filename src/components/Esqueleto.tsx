"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Esqueletos de carregamento.
 *
 * Regra: o esqueleto tem que ter as MESMAS dimensões do conteúdo real. Um
 * placeholder menor faz a página saltar quando os dados chegam, e o salto
 * incomoda mais do que a espera. Por isso cada tela tem o seu, em vez de um
 * spinner genérico.
 */

export function Bloco({
  w = "w-full",
  h = "h-4",
  className = "",
}: {
  w?: string;
  h?: string;
  className?: string;
}) {
  return <div className={`esq ${w} ${h} ${className}`} aria-hidden />;
}

/** Envelope acessível: leitor de tela anuncia "carregando" uma vez só. */
export function Carregando({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando dados…</span>
      {children}
    </div>
  );
}

/** Faixa fina no topo durante refetch, com os dados antigos ainda visíveis. */
export function BarraAtualizando({ ativo }: { ativo: boolean }) {
  if (!ativo) return null;
  return <div className="esq-barra" aria-hidden />;
}

export function ErroCarregamento({
  mensagem,
  onTentarNovamente,
}: {
  mensagem: string;
  onTentarNovamente: () => void;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <AlertTriangle className="text-amber-500" size={28} />
      <div>
        <p className="font-medium text-navy-900">Não consegui carregar esta tela</p>
        <p className="mt-1 text-sm text-slate-500">{mensagem}</p>
      </div>
      <button onClick={onTentarNovamente} className="btn-ghost">
        <RefreshCw size={15} /> Tentar novamente
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EsqKpi({ destaque = false }: { destaque?: boolean }) {
  return (
    <div className={`esq-card ${destaque ? "ring-2 ring-teal-200" : ""}`}>
      <Bloco w="w-24" h="h-3" />
      <Bloco w="w-32" h="h-7" className="mt-2" />
      <Bloco w="w-28" h="h-2.5" className="mt-2" />
    </div>
  );
}

function EsqSecao({ altura = "h-[300px]" }: { altura?: string }) {
  return (
    <div className="card p-5">
      <Bloco w="w-48" h="h-3.5" className="mb-4" />
      <Bloco w="w-full" h={altura} />
    </div>
  );
}

export function EsqueletoTabela({ linhas = 8, colunas = 6 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-4 bg-slate-50 px-3 py-3">
        {Array.from({ length: colunas }).map((_, i) => (
          <Bloco key={i} w="flex-1" h="h-3" />
        ))}
      </div>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex gap-4 border-t border-slate-100 px-3 py-3">
          {Array.from({ length: colunas }).map((_, j) => (
            <Bloco key={j} w="flex-1" h="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EsqueletoDashboard() {
  return (
    <Carregando>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <EsqKpi key={i} destaque={i === 1} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <EsqKpi key={i} />
        ))}
      </div>

      <div className="card mb-6 p-5">
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <Bloco w="w-24" h="h-3.5" />
            <Bloco w="w-full max-w-xl" h="h-3" className="mt-2" />
            <Bloco w="w-2/3 max-w-md" h="h-3" className="mt-1.5" />
          </div>
          <div className="text-right">
            <Bloco w="w-24" h="h-8" />
            <Bloco w="w-16" h="h-2.5" className="ml-auto mt-2" />
          </div>
        </div>
        <Bloco w="w-full" h="h-2.5" className="mt-5 rounded-full" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Bloco w="w-20" h="h-2.5" />
              <Bloco w="w-28" h="h-4" className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        <EsqSecao />
        <div className="grid gap-6 lg:grid-cols-2">
          <EsqSecao />
          <EsqSecao />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <EsqSecao altura="h-[260px]" />
          <div className="grid gap-6">
            <EsqSecao altura="h-[220px]" />
            <EsqSecao altura="h-[120px]" />
          </div>
        </div>
      </div>
    </Carregando>
  );
}

export function EsqueletoLancamentos() {
  return (
    <Carregando>
      <div className="card mb-6 flex items-center justify-between px-5 py-3">
        <Bloco w="w-40" h="h-4" />
        <Bloco w="w-4" h="h-4" />
      </div>
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        {[40, 28, 28, 28].map((w, i) => (
          <div key={i} style={{ width: `${w * 4}px` }}>
            <Bloco w="w-16" h="h-2.5" />
            <Bloco w="w-full" h="h-9" className="mt-1.5" />
          </div>
        ))}
      </div>
      <EsqueletoTabela linhas={10} colunas={7} />
    </Carregando>
  );
}

export function EsqueletoImpostos() {
  return (
    <Carregando>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <EsqKpi key={i} destaque={i === 0} />
        ))}
      </div>
      <Bloco w="w-full" h="h-16" className="mb-6" />
      <EsqueletoTabela linhas={5} colunas={6} />
      <div className="mt-6">
        <EsqueletoTabela linhas={3} colunas={5} />
      </div>
    </Carregando>
  );
}

export function EsqueletoRecorrentes() {
  return (
    <Carregando>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <EsqKpi key={i} />
        ))}
      </div>
      <div className="card mb-6 p-5">
        <Bloco w="w-40" h="h-3.5" className="mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i}>
              <Bloco w="w-20" h="h-2.5" />
              <Bloco w="w-full" h="h-9" className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>
      <EsqueletoTabela linhas={6} colunas={7} />
    </Carregando>
  );
}

export function EsqueletoConfiguracoes() {
  return (
    <Carregando>
      <div className="grid gap-6">
        {[
          { titulo: "w-24", linhas: 6, colunas: 5 },
          { titulo: "w-24", linhas: 4, colunas: 7 },
        ].map((s, i) => (
          <div key={i} className="card p-5">
            <Bloco w={s.titulo} h="h-3.5" className="mb-4" />
            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4">
              <div className="min-w-[200px] flex-1">
                <Bloco w="w-16" h="h-2.5" />
                <Bloco w="w-full" h="h-9" className="mt-1.5" />
              </div>
              <Bloco w="w-32" h="h-9" />
            </div>
            <EsqueletoTabela linhas={s.linhas} colunas={s.colunas} />
          </div>
        ))}
        <EsqSecao altura="h-[160px]" />
      </div>
    </Carregando>
  );
}

export function EsqueletoCaixinhas() {
  return (
    <Carregando>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <EsqKpi key={i} destaque={i === 1} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start gap-3">
              <Bloco w="w-10" h="h-10" />
              <div className="flex-1">
                <Bloco w="w-28" h="h-3.5" />
                <Bloco w="w-32" h="h-6" className="mt-1.5" />
              </div>
            </div>
            <Bloco w="w-full" h="h-2" className="mt-5 rounded-full" />
            <div className="mt-4 flex gap-2">
              <Bloco w="w-24" h="h-7" />
              <Bloco w="w-24" h="h-7" />
            </div>
          </div>
        ))}
      </div>
    </Carregando>
  );
}

export function EsqueletoAuditoria() {
  return (
    <Carregando>
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bloco key={i} w="w-32" h="h-7" className="rounded-full" />
        ))}
      </div>
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-w-[150px] flex-1">
            <Bloco w="w-16" h="h-2.5" />
            <Bloco w="w-full" h="h-9" className="mt-1.5" />
          </div>
        ))}
      </div>
      <div className="card divide-y divide-slate-100">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <Bloco w="w-20" h="h-5" className="rounded-full" />
            <div className="flex-1">
              <Bloco w="w-2/3" h="h-4" />
              <Bloco w="w-1/3" h="h-3" className="mt-1.5" />
            </div>
            <Bloco w="w-24" h="h-4" />
          </div>
        ))}
      </div>
    </Carregando>
  );
}

export function EsqueletoImportar() {
  return (
    <Carregando>
      <div className="card mb-6 p-5">
        <Bloco w="w-48" h="h-3.5" className="mb-4" />
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[280px] flex-1">
            <Bloco w="w-24" h="h-2.5" />
            <Bloco w="w-full" h="h-9" className="mt-1.5" />
          </div>
          <Bloco w="w-24" h="h-9" />
        </div>
        <Bloco w="w-full" h="h-24" className="mt-4" />
      </div>
      <EsqueletoTabela linhas={4} colunas={5} />
    </Carregando>
  );
}
