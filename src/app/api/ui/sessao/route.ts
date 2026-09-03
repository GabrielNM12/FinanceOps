import { sessaoAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * Quem está logado, para a sidebar exibir.
 *
 * Existe como endpoint em vez de leitura no layout por um motivo de
 * performance: `auth()` lê cookie, e cookie torna a rota dinâmica. Se o layout
 * raiz fizesse essa leitura, TODAS as telas virariam server-rendered a cada
 * requisição — e o trabalho de deixar a navegação instantânea (rotas estáticas +
 * loading.tsx) iria por água abaixo.
 *
 * Buscando por fetch, o layout continua estático e o bloco do usuário aparece
 * junto com o resto dos dados.
 */
export async function GET() {
  const sessao = await sessaoAtual();

  if (!sessao) {
    return Response.json({ autenticado: false }, { status: 401 });
  }

  return Response.json({
    autenticado: true,
    email: sessao.email,
    nome: sessao.socio?.nome ?? null,
    socioId: sessao.socio?.id ?? null,
    bootstrap: sessao.bootstrap,
    // A sidebar usa isto para mostrar a tarja de modo demo e esconder o "Sair"
    // (não há sessão para encerrar).
    demo: sessao.demo === true,
  });
}
