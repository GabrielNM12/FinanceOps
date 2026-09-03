/**
 * Modo demonstração: o FinanceOps sem login.
 *
 * PARA QUE SERVE:
 * mostrar a ferramenta com dados fictícios, sem obrigar quem está olhando a
 * pedir um link de acesso. É um modo de vitrine.
 *
 * O QUE ELE REALMENTE FAZ:
 * desliga a **única** barreira entre a internet e os dados. Com ele ligado,
 * qualquer pessoa que souber a URL entra, lê tudo, lança, edita e apaga. Não é
 * "login mais fraco" — é login nenhum.
 *
 * POR ISSO, TRÊS DECISÕES DE PROJETO:
 *
 * 1. **Desligado por padrão.** A ausência da variável é o estado seguro. Nada
 *    de `MODO_DEMO=false` que alguém escreve errado e acha que desligou.
 * 2. **Só valores explícitos ligam.** "1", "true" ou "sim". Qualquer outra
 *    coisa — inclusive "MODO_DEMO=" vazio — mantém o login exigido.
 * 3. **Impossível de esquecer ligado.** A interface mostra uma tarja fixa em
 *    todas as telas. Um modo perigoso que não aparece é um modo que fica ligado
 *    para sempre, e alguém restaura os dados reais por cima sem perceber.
 *
 * NUNCA ligue isto com dados reais dentro.
 */

const LIGADOS = new Set(["1", "true", "sim", "yes", "on"]);

export function demoLigado(valor: string | undefined | null): boolean {
  if (!valor) return false;
  return LIGADOS.has(valor.trim().toLowerCase());
}

/**
 * Identidade usada quando não há login.
 *
 * Não é um sócio: é um rótulo. A sessão demo assume o primeiro sócio ativo para
 * que a autoria dos lançamentos e a trilha de auditoria continuem preenchidas e
 * as telas fiquem realistas — mas o e-mail abaixo deixa registrado, em cada
 * evento, que aquilo não foi uma pessoa autenticada.
 *
 * O domínio `.invalid` é reservado pela RFC 2606: não existe e nunca vai
 * existir, então este endereço jamais colide com o e-mail real de um sócio.
 */
export const EMAIL_DEMO = "demo@financeops.invalid";

export const AVISO_DEMO =
  "MODO DEMO — sem autenticação. Dados fictícios, qualquer pessoa com a URL tem acesso total.";
