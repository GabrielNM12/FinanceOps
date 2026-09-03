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

export const ICONES: Record<string, { Icone: LucideIcon; rotulo: string }> = {
  "piggy-bank": { Icone: PiggyBank, rotulo: "Cofre" },
  "shield-check": { Icone: ShieldCheck, rotulo: "Emergência" },
  landmark: { Icone: Landmark, rotulo: "Impostos" },
  laptop: { Icone: Laptop, rotulo: "Equipamento" },
  plane: { Icone: Plane, rotulo: "Viagem" },
  wrench: { Icone: Wrench, rotulo: "Manutenção" },
  "graduation-cap": { Icone: GraduationCap, rotulo: "Capacitação" },
  gift: { Icone: Gift, rotulo: "13º / bônus" },
  "trending-up": { Icone: TrendingUp, rotulo: "Investimento" },
  building: { Icone: Building, rotulo: "Escritório" },
};

export const CHAVES_ICONE = Object.keys(ICONES);

export function iconeDe(chave: string): LucideIcon {
  return ICONES[chave]?.Icone ?? PiggyBank;
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
