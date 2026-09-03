import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE, lerSessao } from "@/lib/sessao-cookie";
import { ROTAS_PUBLICAS, PREFIXOS_LIVRES } from "@/lib/rotas";
import { urlPublica } from "@/lib/url-publica";
import { demoLigado } from "@/lib/modo-demo";

/**
 * Redireciona quem não tem cookie de sessão válido para /login.
 *
 * Roda no Edge, então não consulta o banco: a checagem aqui é só a assinatura
 * do cookie. Isso basta para a navegação, e é barato.
 *
 * **Não é a fronteira de segurança.** A pergunta que vale — o sócio ainda está
 * ativo? — é refeita no servidor em `sessaoAtual()`, a cada chamada de dado.
 * Como a validação de assinatura usa Web Crypto, o mesmo código serve aos dois
 * lugares e não existe configuração duplicada.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PREFIXOS_LIVRES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Modo demo: nada é protegido. Vem antes de qualquer leitura de cookie porque
  // não existe cookie para ler — ninguém entrou. Ver src/lib/modo-demo.ts.
  //
  // A tela de login também some: ela pediria um link de acesso que não é
  // necessário e que, sem SMTP configurado num ambiente de demonstração, nunca
  // chegaria. Quem cair lá vai direto para o painel.
  if (demoLigado(process.env.MODO_DEMO)) {
    if (ROTAS_PUBLICAS.includes(pathname)) {
      return NextResponse.redirect(new URL("/", urlPublica(req.headers)));
    }
    return NextResponse.next();
  }

  const sessao = await lerSessao(req.cookies.get(NOME_COOKIE)?.value);
  const publica = ROTAS_PUBLICAS.includes(pathname);

  // Mesma armadilha de `/entrar`: `req.url` atrás do proxy pode ser o socket
  // interno. Redirecionar por ele joga o navegador em `0.0.0.0:3000`.
  const base = urlPublica(req.headers);

  // Quem já entrou não precisa ver a tela de login de novo.
  if (publica) {
    return sessao
      ? NextResponse.redirect(new URL("/", base))
      : NextResponse.next();
  }

  if (sessao) return NextResponse.next();

  // Guarda para onde a pessoa queria ir, para voltar lá depois de entrar.
  const login = new URL("/login", base);
  const destino = pathname + search;
  if (destino !== "/") login.searchParams.set("destino", destino);
  return NextResponse.redirect(login);
}

export const config = {
  /**
   * Ignora arquivos estáticos e imagens. `_next/static` e `_next/image` são
   * servidos milhares de vezes; passar cada um pelo middleware só gasta CPU.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.png$).*)"],
};
