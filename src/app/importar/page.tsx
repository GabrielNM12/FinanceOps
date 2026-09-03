"use client";

import Link from "next/link";
import { Download, FileSpreadsheet, DatabaseBackup } from "lucide-react";
import { PageTitle, Secao } from "@/components/ui";
import Importador from "@/components/Importador";
import {
  EsqueletoImportar,
  ErroCarregamento,
  BarraAtualizando,
} from "@/components/Esqueleto";
import { useState } from "react";
import RestaurarBackup from "@/components/RestaurarBackup";
import { useDados } from "@/hooks/useDados";
import { formatarData } from "@/lib/datas";

type Dados = {
  historico: {
    id: string;
    arquivo: string;
    criadoEm: string;
    linhasTotal: number;
    linhasImportadas: number;
    linhasIgnoradas: number;
  }[];
};

export default function ImportarPage() {
  const [aba, setAba] = useState<"csv" | "backup">("csv");
  const { dados, erro, carregando, atualizando, recarregar, tentarNovamente } =
    useDados<Dados>("/api/ui/importar");

  const cabecalho = (
    <PageTitle
      titulo="Importar e exportar"
      descricao="Extrato do banco em CSV, ou backup completo para restaurar o sistema inteiro."
      acao={
        <div className="flex flex-wrap gap-2">
          <Link href="/api/export/backup" className="btn-teal">
            <Download size={15} /> Backup completo
          </Link>
          <Link href="/api/export/transacoes" className="btn-ghost">
            <Download size={15} /> Lançamentos
          </Link>
          <Link href="/api/export/impostos" className="btn-ghost">
            <Download size={15} /> Impostos
          </Link>
        </div>
      }
    />
  );

  if (erro) {
    return (
      <>
        {cabecalho}
        <ErroCarregamento mensagem={erro} onTentarNovamente={tentarNovamente} />
      </>
    );
  }

  if (carregando || !dados) {
    return (
      <>
        {cabecalho}
        <EsqueletoImportar />
      </>
    );
  }

  return (
    <>
      <BarraAtualizando ativo={atualizando} />
      {cabecalho}

      <div className="mb-6 inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
        {(
          [
            ["csv", "Extrato CSV", FileSpreadsheet],
            ["backup", "Backup completo", DatabaseBackup],
          ] as const
        ).map(([id, label, Icone]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors ${
              aba === id ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icone size={15} />
            {label}
          </button>
        ))}
      </div>

      {aba === "csv" ? (
        <Importador aoImportar={recarregar} />
      ) : (
        <RestaurarBackup aoRestaurar={recarregar} />
      )}

      {dados.historico.length > 0 && (
        <div className="mt-6">
          <Secao titulo="Importações anteriores">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Arquivo</th>
                    <th className="th">Data</th>
                    <th className="th text-right">Linhas</th>
                    <th className="th text-right">Importadas</th>
                    <th className="th text-right">Ignoradas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.historico.map((h) => (
                    <tr key={h.id}>
                      <td className="td font-medium text-navy-900">{h.arquivo}</td>
                      <td className="td text-slate-500">
                        {formatarData(new Date(h.criadoEm))}
                      </td>
                      <td className="td text-right">{h.linhasTotal}</td>
                      <td className="td text-right text-emerald-600">
                        {h.linhasImportadas}
                      </td>
                      <td className="td text-right text-slate-500">
                        {h.linhasIgnoradas}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        </div>
      )}
    </>
  );
}
