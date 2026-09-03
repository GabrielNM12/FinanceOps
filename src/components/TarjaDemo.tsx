"use client";

import { AlertTriangle } from "lucide-react";
import { useDados } from "@/hooks/useDados";
import { AVISO_DEMO } from "@/lib/modo-demo";

type Sessao = { demo?: boolean };

/**
 * Tarja fixa quando o login está desligado.
 *
 * POR QUE ELA É FEIA DE PROPÓSITO:
 * o risco do modo demo não é alguém ligá-lo — é alguém **esquecer** que ligou.
 * Um aviso discreto vira parte da paisagem em dois dias, e o dia em que os
 * dados reais forem restaurados por cima ninguém vai lembrar que a porta está
 * aberta. Âmbar, no topo, em todas as telas, sem botão de fechar.
 *
 * Ela lê o mesmo `/api/ui/sessao` que a sidebar, então não custa requisição
 * nova: a resposta já está em cache do hook.
 */
export default function TarjaDemo() {
  const { dados } = useDados<Sessao>("/api/ui/sessao");
  if (!dados?.demo) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-center text-[11px] font-medium leading-tight text-amber-950 sm:text-xs"
    >
      <AlertTriangle size={13} className="hidden shrink-0 sm:block" />
      <span>{AVISO_DEMO}</span>
    </div>
  );
}
