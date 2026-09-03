/**
 * Regra de quem pode entrar — pura, testável, sem banco.
 *
 * Fica separada da configuração do Auth.js de propósito: é a única decisão de
 * segurança do sistema que precisa ser lida e conferida por uma pessoa, e não
 * deve estar enterrada num callback.
 */

export type SocioAutorizado = {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;
};

/**
 * Normaliza e-mail para comparação: minúsculas e sem espaços nas pontas.
 *
 * Não faz nada além disso. Truques como remover pontos do Gmail fariam
 * `a.b@gmail.com` e `ab@gmail.com` virarem a mesma pessoa — conveniente até o
 * dia em que dois sócios têm endereços parecidos e um enxerga os dados do outro.
 */
export function normalizarEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export type Decisao =
  | { permitido: true; socio: SocioAutorizado | null; motivo: "SOCIO" | "BOOTSTRAP" }
  | { permitido: false; motivo: "SEM_EMAIL" | "NAO_CADASTRADO" | "INATIVO" };

/**
 * Decide se um e-mail pode receber o link de acesso.
 *
 * Só entra quem está cadastrado como sócio **ativo**. Não existe auto-cadastro:
 * quem manda um e-mail qualquer na tela de login não vira usuário.
 *
 * `bootstrap` resolve o ovo-e-galinha da primeira instalação — sem nenhum sócio
 * com e-mail, ninguém entraria para cadastrar os e-mails. Ele é lido de
 * AUTH_BOOTSTRAP_EMAIL e deve sair do .env assim que o primeiro sócio estiver
 * configurado.
 */
export function podeEntrar(
  emailInformado: string,
  socios: SocioAutorizado[],
  bootstrap?: string | null
): Decisao {
  const email = normalizarEmail(emailInformado);
  if (!email || !email.includes("@")) return { permitido: false, motivo: "SEM_EMAIL" };

  const socio = socios.find((s) => normalizarEmail(s.email) === email);

  if (socio) {
    // Sócio inativo é checado antes do bootstrap: quem foi desligado não volta
    // por causa de uma variável de ambiente esquecida no .env.
    if (!socio.ativo) return { permitido: false, motivo: "INATIVO" };
    return { permitido: true, socio, motivo: "SOCIO" };
  }

  if (bootstrap && normalizarEmail(bootstrap) === email) {
    return { permitido: true, socio: null, motivo: "BOOTSTRAP" };
  }

  return { permitido: false, motivo: "NAO_CADASTRADO" };
}

/**
 * Mensagem mostrada na tela de login.
 *
 * `NAO_CADASTRADO` e `INATIVO` devolvem o MESMO texto de propósito: responder
 * "esse e-mail não está cadastrado" transforma a tela de login num verificador
 * de quem trabalha aqui, para qualquer pessoa na internet.
 */
export function mensagemDeRecusa(motivo: Decisao["motivo"]): string {
  if (motivo === "SEM_EMAIL") return "Informe um e-mail válido.";
  return "Se este e-mail estiver cadastrado, o link de acesso chegará em instantes.";
}
