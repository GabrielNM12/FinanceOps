"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TarjaDemo from "@/components/TarjaDemo";
import { ROTAS_PUBLICAS } from "@/lib/rotas";

/**
 * Decide entre a moldura do app e a tela nua.
 *
 * Login e verificação não têm sidebar: mostrar navegação para quem não pode
 * navegar é ruído, e ainda revelaria a estrutura do sistema antes de a pessoa
 * ter acesso.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (ROTAS_PUBLICAS.includes(pathname)) return <>{children}</>;

  return (
    <>
      {/* Fora do <main> e antes da sidebar: a tarja precisa atravessar a
          largura inteira, inclusive por cima da navegação. */}
      <TarjaDemo />
      <Sidebar />
      {/* lg:pl-60 abre espaço para a sidebar fixa; no mobile ela vira drawer. */}
      <main className="min-h-screen lg:pl-60">
        {/* Respiro menor no celular: 24px de cada lado numa tela de 360px
            comem 13% da largura útil. */}
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">{children}</div>
      </main>
    </>
  );
}
