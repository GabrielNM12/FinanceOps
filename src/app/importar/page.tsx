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
import { t } from "@/lib/i18n";

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
      titulo={t.importPage.title}
      descricao={t.importPage.subtitle}
      acao={
        <div className="flex flex-wrap gap-2">
          <Link href="/api/export/backup" className="btn-teal">
            <Download size={15} /> {t.importPage.backupCompleto}
          </Link>
          <Link href="/api/export/transacoes" className="btn-ghost">
            <Download size={15} /> {t.importPage.lancamentos}
          </Link>
          <Link href="/api/export/impostos" className="btn-ghost">
            <Download size={15} /> {t.importPage.impostos}
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
            ["csv", t.importPage.tabCsv, FileSpreadsheet],
            ["backup", t.importPage.tabBackup, DatabaseBackup],
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
          <Secao titulo={t.importPage.importacoesAnteriores}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">{t.importPage.thArquivo}</th>
                    <th className="th">{t.importPage.thData}</th>
                    <th className="th text-right">{t.importPage.thLinhas}</th>
                    <th className="th text-right">{t.importPage.thImportadas}</th>
                    <th className="th text-right">{t.importPage.thIgnoradas}</th>
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
