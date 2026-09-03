"use client";

import dynamic from "next/dynamic";
import { Bloco } from "@/components/Esqueleto";

/**
 * Gráficos carregados sob demanda.
 *
 * O recharts sozinho respondia por 117 kB dos 217 kB do dashboard — mais de dez
 * vezes o peso de qualquer outra tela. Enquanto ele estava no chunk principal da
 * rota, clicar em "Dashboard" significava esperar a biblioteca inteira baixar
 * antes de ver qualquer coisa.
 *
 * Com `next/dynamic`, a casca da tela (KPIs, Fator R, tabelas) aparece assim que
 * o chunk leve chega, e cada gráfico entra no lugar quando a biblioteca termina
 * de carregar — com um bloco de esqueleto do tamanho certo, para o layout não
 * saltar.
 *
 * `ssr: false` porque recharts mede o container para desenhar: renderizar no
 * servidor produziria um SVG de dimensão zero que seria descartado no cliente.
 */

const placeholder = (altura: string) =>
  function Placeholder() {
    return <Bloco h={altura} />;
  };

export const GraficoFluxoMensal = dynamic(
  () => import("./graficos").then((m) => m.GraficoFluxoMensal),
  { ssr: false, loading: placeholder("h-[300px]") }
);

export const GraficoPizzaCategorias = dynamic(
  () => import("./graficos").then((m) => m.GraficoPizzaCategorias),
  { ssr: false, loading: placeholder("h-[300px]") }
);

export const GraficoReceitaPorCliente = dynamic(
  () => import("./graficos").then((m) => m.GraficoReceitaPorCliente),
  { ssr: false, loading: placeholder("h-[260px]") }
);

export const GraficoDistribuicaoSocios = dynamic(
  () => import("./graficos").then((m) => m.GraficoDistribuicaoSocios),
  { ssr: false, loading: placeholder("h-[260px]") }
);

export const GraficoProjecaoCaixa = dynamic(
  () => import("./graficos").then((m) => m.GraficoProjecaoCaixa),
  { ssr: false, loading: placeholder("h-[220px]") }
);
