import CarregandoTela from "@/components/CarregandoTela";
import { EsqueletoLancamentos } from "@/components/Esqueleto";
import { t } from "@/lib/i18n";

/**
 * Mostrado enquanto o JavaScript desta rota carrega.
 *
 * A existência deste arquivo é o que faz a URL trocar NA HORA: ele cria uma
 * fronteira de Suspense no segmento, então o Next confirma a navegação
 * imediatamente e desenha isto, em vez de segurar a rota antiga até o chunk da
 * página chegar.
 *
 * Depois que o componente monta, ele mostra o mesmo esqueleto enquanto busca o
 * JSON — a transição entre os dois é invisível, de propósito.
 */
export default function Carregando() {
  return (
    <CarregandoTela titulo={t.transactions.title} descricao={t.transactions.subtitle}>
      <EsqueletoLancamentos />
    </CarregandoTela>
  );
}
