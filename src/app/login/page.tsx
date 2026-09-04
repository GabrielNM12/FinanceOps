"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Mail, AlertTriangle } from "lucide-react";
import { pedirAcesso } from "@/actions/acesso";
import { t } from "@/lib/i18n";

/**
 * Tela de entrada.
 *
 * A resposta é sempre a mesma, tenha o e-mail acesso ou não. Dizer "este e-mail
 * não está cadastrado" transformaria esta tela num verificador de quem trabalha
 * na Korvantis, disponível para qualquer pessoa na internet.
 */
export default function LoginPage() {
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const params = useSearchParams();

  const erroDeUrl = params.get("erro");
  const destino = params.get("destino") ?? undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Korvantis" width={52} height={52} className="rounded-lg" />
          <div className="text-center">
            <div className="text-lg font-semibold text-navy-900">FinanceOps</div>
            <div className="text-xs text-slate-500">Korvantis</div>
          </div>
        </div>

        <div className="card p-6">
          {enviado ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <Mail size={22} />
              </div>
              <h1 className="text-base font-semibold text-navy-900">{t.login.confiraEmail}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t.login.enviadoPara(enviado)}
              </p>
              <button
                onClick={() => setEnviado(null)}
                className="mt-5 text-xs text-teal-700 underline"
              >
                {t.login.usarOutro}
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-base font-semibold text-navy-900">{t.login.entrar}</h1>
              <p className="mt-1 text-sm text-slate-500">{t.login.semSenha}</p>

              {(erro || erroDeUrl) && (
                <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    {erro ??
                      (erroDeUrl === "sessao_expirada"
                        ? t.login.erroSessao
                        : erroDeUrl === "link_expirado"
                        ? t.login.erroLink
                        : erroDeUrl === "sem_acesso"
                          ? t.login.erroSemAcesso
                          : t.login.erroGenerico)}
                  </span>
                </div>
              )}

              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const email = String(fd.get("email") ?? "").trim();
                  iniciar(async () => {
                    setErro(null);
                    try {
                      const r = await pedirAcesso(email, destino);
                      if (r.ok) setEnviado(email);
                      else setErro(r.erro);
                    } catch {
                      setErro(t.login.falhaEnviar);
                    }
                  });
                }}
              >
                <label className="label">{t.login.email}</label>
                <input
                  name="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  className="input"
                  placeholder={t.login.phEmail}
                />
                <button disabled={pendente} className="btn-teal mt-4 w-full justify-center">
                  {pendente ? t.login.enviando : t.login.enviarLink}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          {t.login.rodape}
        </p>
      </div>
    </div>
  );
}
