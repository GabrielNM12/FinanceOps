/**
 * Conjunto fechado de ícones para as caixinhas.
 *
 * Fechado de propósito: o banco guarda só a chave, e um valor livre viraria
 * um import dinâmico do lucide inteiro no bundle do cliente. Se faltar um
 * ícone, adicione aqui.
 */
import {
  PiggyBank,
  ShieldCheck,
  Landmark,
  Laptop,
  Plane,
  Wrench,
  GraduationCap,
  Gift,
  TrendingUp,
  Building,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";

/** A chave é o que fica no banco; o rótulo vem do dicionário (t.icons). */
export const ICONES: Record<string, { Icone: LucideIcon }> = {
  "piggy-bank": { Icone: PiggyBank },
  "shield-check": { Icone: ShieldCheck },
  landmark: { Icone: Landmark },
  laptop: { Icone: Laptop },
  plane: { Icone: Plane },
  wrench: { Icone: Wrench },
  "graduation-cap": { Icone: GraduationCap },
  gift: { Icone: Gift },
  "trending-up": { Icone: TrendingUp },
  building: { Icone: Building },
};

export const CHAVES_ICONE = Object.keys(ICONES);

export function iconeDe(chave: string): LucideIcon {
  return ICONES[chave]?.Icone ?? PiggyBank;
}

export function rotuloIcone(chave: string): string {
  return t.icons[chave as keyof typeof t.icons] ?? chave;
}

/** Paleta sugerida — o input de cor continua livre. */
export const CORES = [
  "#2eb3c7",
  "#1c2b3d",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#ec4899",
];
