import CarregandoTela from "@/components/CarregandoTela";
import { EsqueletoAuditoria } from "@/components/Esqueleto";
import { t } from "@/lib/i18n";

export default function Carregando() {
  return (
    <CarregandoTela titulo={t.audit.title} descricao={t.audit.subtitle}>
      <EsqueletoAuditoria />
    </CarregandoTela>
  );
}
