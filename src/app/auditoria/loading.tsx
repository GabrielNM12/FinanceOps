import CarregandoTela from "@/components/CarregandoTela";
import { EsqueletoAuditoria } from "@/components/Esqueleto";

export default function Carregando() {
  return (
    <CarregandoTela
      titulo="Auditoria"
      descricao="Quem fez o quê, e quando. Registro só de leitura."
    >
      <EsqueletoAuditoria />
    </CarregandoTela>
  );
}
