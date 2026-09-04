/**
 * i18n do FinanceOps — uma língua por deploy.
 *
 * O idioma é definido no build por NEXT_PUBLIC_APP_LOCALE. Ausente, vazio ou
 * qualquer valor diferente de "en" mantém o português (pt-BR), que é o
 * comportamento histórico. Só "en" liga o inglês.
 *
 * Como é constante durante toda a vida do processo (e do bundle do cliente, já
 * que a variável tem prefixo NEXT_PUBLIC_ e é injetada no build), não há
 * contexto React nem hook: `import { t } from "@/lib/i18n"` e pronto.
 *
 * `en` é tipado como `typeof pt`: qualquer chave que falte, sobre ou mude de
 * assinatura vira erro de compilação. É a garantia de que nada fica sem tradução.
 */
import { pt } from "./pt";
import { en } from "./en";

export type Locale = "pt" | "en";

export const locale: Locale =
  process.env.NEXT_PUBLIC_APP_LOCALE === "en" ? "en" : "pt";

/** Locale para `Intl` / `toLocale*`. Moeda continua BRL nos dois. */
export const intlLocale = locale === "en" ? "en-US" : "pt-BR";

export const t = locale === "en" ? en : pt;

export type Dict = typeof pt;
