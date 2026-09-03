"use client";

import { useState, useTransition } from "react";
import { irParaLogin, MSG_SESSAO_EXPIRADA } from "@/lib/rotas";

/**
 * Executa uma server action e recarrega os dados da tela.
 *
 * A escrita continua em server action de propósito: ela já valida, já roda em
 * transação e já conhece as regras. Transformar tudo em POST só para "ser SPA"
 * duplicaria essa lógica no cliente — e é lá que a validação some.
 *
 * O que mudou foi só a leitura, que agora vem por fetch.
 */
export function useAcao(recarregar: () => void) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function executar(fn: () => Promise<string | void>) {
    iniciar(async () => {
      setErro(null);
      setMensagem(null);
      try {
        const msg = await fn();
        if (typeof msg === "string") setMensagem(msg);
        recarregar();
      } catch (e) {
        const msg = (e as Error).message;
        // A action recusou por falta de sessão: leva ao login em vez de exibir
        // um erro que a pessoa não tem como resolver na tela em que está.
        if (msg === MSG_SESSAO_EXPIRADA) {
          irParaLogin("expirou");
          return;
        }
        setErro(msg);
      }
    });
  }

  return { pendente, erro, mensagem, setErro, setMensagem, executar };
}

export function Avisos({
  erro,
  mensagem,
}: {
  erro: string | null;
  mensagem: string | null;
}) {
  if (!erro && !mensagem) return null;
  return (
    <div className="mb-4">
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}
      {mensagem && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {mensagem}
        </div>
      )}
    </div>
  );
}
