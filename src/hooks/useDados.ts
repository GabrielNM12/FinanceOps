"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { irParaLogin } from "@/lib/rotas";
import { t } from "@/lib/i18n";

/**
 * Busca o JSON de uma tela.
 *
 * A navegação é instantânea: a rota troca na hora, o componente monta com
 * `carregando = true` e desenha o esqueleto enquanto este hook busca os dados.
 *
 * Duas decisões que valem o comentário:
 *
 * 1. **Refetch silencioso.** Depois de uma ação (lançar, excluir, quitar), a
 *    tela recarrega sem voltar ao esqueleto. Piscar de volta para o placeholder
 *    a cada clique é pior que esperar meio segundo com o dado velho na tela.
 *
 * 2. **Guarda de ordem.** Se o usuário troca de filtro rápido, a resposta antiga
 *    pode chegar depois da nova. O contador descarta respostas obsoletas — sem
 *    isso a tela mostra o resultado do filtro anterior e ninguém entende por quê.
 */
export function useDados<T>(url: string) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const seq = useRef(0);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const buscar = useCallback(
    async (silencioso: boolean) => {
      const meu = ++seq.current;
      if (silencioso) setAtualizando(true);
      else setCarregando(true);

      try {
        const r = await fetch(url, { cache: "no-store" });

        // Sessão caiu enquanto a tela estava aberta. Mostrar "erro ao carregar"
        // aqui seria enganoso: não há nada errado com os dados, a pessoa é que
        // precisa entrar de novo.
        if (r.status === 401) {
          irParaLogin("expirou");
          return;
        }

        const corpo = await r.json().catch(() => null);

        if (!r.ok) {
          throw new Error(corpo?.erro ?? t.common.httpFail(r.status));
        }
        if (meu !== seq.current || !vivo.current) return; // resposta obsoleta

        setDados(corpo as T);
        setErro(null);
      } catch (e) {
        if (meu !== seq.current || !vivo.current) return;
        setErro(
          e instanceof TypeError ? t.common.noResponse : (e as Error).message
        );
      } finally {
        if (meu === seq.current && vivo.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [url]
  );

  useEffect(() => {
    buscar(false);
  }, [buscar]);

  return {
    dados,
    erro,
    carregando,
    /** true durante um refetch com dado antigo ainda na tela */
    atualizando,
    recarregar: useCallback(() => buscar(true), [buscar]),
    tentarNovamente: useCallback(() => buscar(false), [buscar]),
  };
}
