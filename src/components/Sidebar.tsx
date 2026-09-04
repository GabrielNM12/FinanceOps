"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { sair } from "@/actions/acesso";
import { rota } from "@/lib/rotas";
import { t } from "@/lib/i18n";
import { useDados } from "@/hooks/useDados";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Repeat,
  PiggyBank,
  FileUp,
  ScrollText,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";

/**
 * Navegação lateral.
 *
 * É client component por um motivo só: `usePathname`, para marcar o item ativo.
 * O resto do app segue server-rendered.
 */

const ITENS = [
  { href: rota("home"), label: t.nav.dashboard, Icone: LayoutDashboard, dica: t.nav.dashboardHint },
  { href: rota("transacoes"), label: t.nav.transactions, Icone: ArrowLeftRight, dica: t.nav.transactionsHint },
  { href: rota("impostos"), label: t.nav.taxes, Icone: Receipt, dica: t.nav.taxesHint },
  { href: rota("caixinhas"), label: t.nav.reserves, Icone: PiggyBank, dica: t.nav.reservesHint },
  { href: rota("recorrentes"), label: t.nav.recurring, Icone: Repeat, dica: t.nav.recurringHint },
  { href: rota("importar"), label: t.nav.import, Icone: FileUp, dica: t.nav.importHint },
  { href: rota("auditoria"), label: t.nav.audit, Icone: ScrollText, dica: t.nav.auditHint },
  { href: rota("configuracoes"), label: t.nav.settings, Icone: Settings, dica: t.nav.settingsHint },
];

type Sessao = {
  autenticado: boolean;
  email: string;
  nome: string | null;
  demo?: boolean;
};

export default function Sidebar() {
  const [aberto, setAberto] = useState(false);
  const [saindo, iniciarSaida] = useTransition();
  const pathname = usePathname();
  const { dados: usuario } = useDados<Sessao>("/api/ui/sessao");

  // "/" só fica ativo em match exato, senão ele acende em todas as rotas.
  const ehAtivo = (href: string) =>
    href === rota("home") ? pathname === rota("home") : pathname.startsWith(href);

  return (
    <>
      {/* Barra superior — só no mobile */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-navy-700 bg-navy-900 px-4 py-3 text-white lg:hidden">
        <button
          onClick={() => setAberto(true)}
          className="rounded-lg p-1.5 hover:bg-navy-700"
          aria-label={t.nav.openMenu}
        >
          <Menu size={20} />
        </button>
        <Image src="/logo.png" alt="Korvantis" width={26} height={26} className="rounded" />
        <span className="text-sm font-semibold tracking-wide">FinanceOps</span>
      </div>

      {/* Backdrop do mobile */}
      {aberto && (
        <div
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-40 bg-navy-900/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-navy-900 text-white transition-transform lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <Image
            src="/logo.png"
            alt="Korvantis"
            width={36}
            height={36}
            className="rounded"
            priority
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">FinanceOps</div>
            <div className="text-[11px] text-teal-300">Korvantis</div>
          </div>
          <button
            onClick={() => setAberto(false)}
            className="ml-auto rounded-lg p-1 hover:bg-navy-700 lg:hidden"
            aria-label={t.nav.closeMenu}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {ITENS.map(({ href, label, Icone, dica }) => {
            const ativo = ehAtivo(href);
            return (
              <Link
                key={href}
                href={href}
                title={dica}
                onClick={() => setAberto(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  ativo
                    ? "bg-teal-500 font-medium text-white"
                    : "text-slate-300 hover:bg-navy-700 hover:text-white"
                }`}
              >
                <Icone size={18} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {usuario && (
          <div className="border-t border-navy-700 px-3 py-3">
            <div className="flex items-center gap-2 px-2 py-1">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[11px] font-semibold text-white"
                aria-hidden
              >
                {(usuario.nome ?? usuario.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-medium text-white">
                  {usuario.nome ?? t.nav.account}
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  {usuario.email}
                </div>
              </div>
            </div>
            {usuario.demo ? (
              <div className="mt-1 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
                {t.nav.demoNote}
              </div>
            ) : (
            <button
              onClick={() => iniciarSaida(() => sair())}
              disabled={saindo}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-navy-700 hover:text-white"
            >
              <LogOut size={16} className="shrink-0" />
              {saindo ? t.nav.signingOut : t.nav.signOut}
            </button>
            )}
          </div>
        )}

        <div className="px-5 pb-5 text-[11px] leading-relaxed text-slate-400">
          {t.nav.disclaimer}
        </div>
      </aside>
    </>
  );
}
