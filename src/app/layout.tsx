import type { Metadata, Viewport } from "next";
import Shell from "@/components/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinanceOps — Korvantis",
  description: "Controle de caixa, impostos e distribuição entre sócios",
};

/**
 * Layout deliberadamente sem leitura de sessão.
 *
 * `auth()` lê cookie, e cookie torna a rota dinâmica. Se a sessão fosse
 * resolvida aqui, TODAS as telas virariam server-rendered a cada requisição e o
 * trabalho de navegação instantânea (rotas estáticas + loading.tsx) seria
 * perdido. A sidebar busca o usuário em /api/ui/sessao, como o resto do app.
 */
/**
 * `maximumScale` fica livre de propósito: travar o zoom quebra a leitura de
 * quem precisa ampliar, e a tela já é legível sem isso.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14293f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
