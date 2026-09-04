/**
 * Corpo do e-mail com o link de acesso.
 *
 * HTML de e-mail é hostil: sem flexbox confiável, sem CSS externo, sem
 * `<style>` em boa parte dos clientes. Por isso tudo aqui é tabela e estilo
 * inline — feio de ler, mas é o que renderiza igual no Gmail, Outlook e celular.
 */
import { t } from "@/lib/i18n";

const NAVY = "#14293f";
const TEAL = "#2eb3c7";

export function assuntoAcesso() {
  return t.email.assunto;
}

export function htmlAcesso({
  url,
  host,
  minutos,
}: {
  url: string;
  host: string;
  minutos: number;
}) {
  return `<!DOCTYPE html>
<html lang="${t.email.lang}">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

        <tr><td style="background:${NAVY};padding:20px 28px;">
          <div style="color:#ffffff;font-size:15px;font-weight:600;letter-spacing:.5px;">FinanceOps</div>
          <div style="color:${TEAL};font-size:11px;margin-top:2px;">Korvantis</div>
        </td></tr>

        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 12px;font-size:19px;color:${NAVY};font-weight:600;">${t.email.titulo}</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
            ${t.email.corpo(minutos)}
          </p>
        </td></tr>

        <tr><td align="center" style="padding:24px 28px;">
          <a href="${url}"
             style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;
                    padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;">
            ${t.email.botao}
          </a>
        </td></tr>

        <tr><td style="padding:0 28px 24px;">
          <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
            ${t.email.seNaoFuncionar}
          </p>
          <p style="margin:0;font-size:12px;color:#64748b;word-break:break-all;">${url}</p>
        </td></tr>

        <tr><td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
            ${t.email.rodape(host)}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Versão texto puro. Alguns clientes só mostram esta, e filtros de spam gostam. */
export function textoAcesso({ url, minutos }: { url: string; minutos: number }) {
  return [
    t.email.titulo,
    "",
    t.email.textoLink(minutos),
    url,
    "",
    t.email.textoRodape,
  ].join("\n");
}
