import { PageTitle } from "@/components/ui";

/**
 * Casca de carregamento de uma rota inteira.
 *
 * É o que os `loading.tsx` renderizam. Existe para o cabeçalho ficar idêntico
 * ao da tela pronta: se o título aparecer em posição diferente, a página salta
 * quando os dados chegam, e o salto incomoda mais do que a espera.
 *
 * Não usa hook nenhum de propósito — assim o Next consegue pré-renderizar isto
 * como HTML estático e mostrar na hora, antes mesmo de o JavaScript da rota
 * terminar de baixar.
 */
export default function CarregandoTela({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTitle titulo={titulo} descricao={descricao} />
      {children}
    </>
  );
}
