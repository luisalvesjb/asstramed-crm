import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { Company } from "../types/api";
import { AppButton, AppCheckbox, DashboardFilterSelect, InlineDateNavigator, KpiStatCard } from "../ui/components";
import { formatCurrency, formatDate } from "../utils/format";

interface ActivityReportItem {
  id: string;
  company: { name: string };
  assignedTo: { name: string };
  status: string;
  title: string;
  createdAt: string;
}

interface ProductivityItem {
  userId: string;
  userName: string;
  totalActivities: number;
  resolvedActivities: number;
  unresolvedActivities: number;
}

interface PendingByCompanyItem {
  companyId: string;
  companyName: string;
  pendingCount: number;
}

interface ContractsByDueItem {
  contractId: string;
  companyName: string;
  dueDay: number | null;
  billingCycle: string | null;
  value: string | null;
  documentCount: number;
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [startDate, setStartDate] = useState(dateDaysAgo(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [openOnly, setOpenOnly] = useState(false);

  const [activities, setActivities] = useState<ActivityReportItem[]>([]);
  const [productivity, setProductivity] = useState<ProductivityItem[]>([]);
  const [pendingByCompany, setPendingByCompany] = useState<PendingByCompanyItem[]>([]);
  const [contractsByDue, setContractsByDue] = useState<ContractsByDueItem[]>([]);

  const totalResolved = useMemo(
    () => activities.filter((item) => item.status === "CONCLUIDA").length,
    [activities]
  );

  async function loadCompanies() {
    try {
      const response = await api.get<Company[]>("/companies");
      setCompanies(response.data);
    } catch {
      setCompanies([]);
    }
  }

  async function loadReports() {
    setLoading(true);
    setError(null);

    try {
      const params = {
        startDate,
        endDate,
        companyId: companyId || undefined,
        openOnly: openOnly || undefined
      };

      const [activitiesResponse, productivityResponse, pendingResponse, contractsResponse] = await Promise.all([
        api.get<ActivityReportItem[]>("/reports/activities", { params }),
        api.get<ProductivityItem[]>("/reports/productivity", { params }),
        api.get<PendingByCompanyItem[]>("/reports/pending-by-company", { params }),
        api.get<ContractsByDueItem[]>("/reports/contracts-by-due")
      ]);

      setActivities(activitiesResponse.data);
      setProductivity(productivityResponse.data);
      setPendingByCompany(pendingResponse.data);
      setContractsByDue(contractsResponse.data);
    } catch {
      setError("Nao foi possivel carregar relatorios.");
      setActivities([]);
      setProductivity([]);
      setPendingByCompany([]);
      setContractsByDue([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
    void loadReports();
  }, []);

  async function downloadActivitiesCsv() {
    try {
      const response = await api.get("/reports/activities/csv", {
        params: {
          startDate,
          endDate,
          companyId: companyId || undefined,
          openOnly: openOnly || undefined
        },
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "relatorio-atividades.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Nao foi possivel exportar CSV.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Relatorios</h1>
        <AppButton type="primary" onClick={() => void downloadActivitiesCsv()}>
          Exportar CSV
        </AppButton>
      </div>

      {error && <div className="card error-box">{error}</div>}

      <div className="asstramed-dashboard-filters">
        <InlineDateNavigator label="Data inicial" value={startDate} onChange={setStartDate} />
        <InlineDateNavigator label="Data final" value={endDate} onChange={setEndDate} />
        <DashboardFilterSelect
          value={companyId || undefined}
          placeholder="Empresa: Todas"
          allowClear
          options={companies.map((company) => ({ value: company.id, label: company.name }))}
          onChange={(value) => setCompanyId((value as string) || "")}
        />
        <label className="permission-item">
          <AppCheckbox checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} />
          <span>Em aberto</span>
        </label>
        <AppButton type="primary" onClick={() => void loadReports()}>
          Aplicar filtros
        </AppButton>
      </div>

      <div className="asstramed-kpi-grid">
        <KpiStatCard
          title="Atividades Resolvidas"
          value={String(totalResolved)}
          tone="positive"
          icon="check"
        />
        <KpiStatCard
          title="Atividades no Periodo"
          value={String(activities.length)}
          tone="neutral"
          icon="activity"
        />
        <KpiStatCard
          title="Pendencias por Empresa"
          value={String(pendingByCompany.length)}
          tone="negative"
          icon="warning"
        />
      </div>

      <div className="card card-stack">
        <h3>Atividades por periodo</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Atividade</th>
              <th>Status</th>
              <th>Responsavel</th>
              <th>Criada em</th>
            </tr>
          </thead>
          <tbody>
            {!loading && activities.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum registro no periodo.</td>
              </tr>
            )}
            {activities.slice(0, 15).map((item) => (
              <tr key={item.id}>
                <td>{item.company.name}</td>
                <td>{item.title}</td>
                <td>{item.status}</td>
                <td>{item.assignedTo.name}</td>
                <td>{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card-stack">
        <h3>Produtividade por tecnico</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Total</th>
              <th>Resolvidas</th>
              <th>Nao resolvidas</th>
            </tr>
          </thead>
          <tbody>
            {!loading && productivity.length === 0 && (
              <tr>
                <td colSpan={4}>Sem dados de produtividade.</td>
              </tr>
            )}
            {productivity.map((item) => (
              <tr key={item.userId}>
                <td>{item.userName}</td>
                <td>{item.totalActivities}</td>
                <td>{item.resolvedActivities}</td>
                <td>{item.unresolvedActivities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card-stack">
        <h3>Pendencias por empresa</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Quantidade pendente</th>
            </tr>
          </thead>
          <tbody>
            {!loading && pendingByCompany.length === 0 && (
              <tr>
                <td colSpan={2}>Sem pendencias no periodo.</td>
              </tr>
            )}
            {pendingByCompany.map((item) => (
              <tr key={item.companyId}>
                <td>{item.companyName}</td>
                <td>{item.pendingCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card-stack">
        <h3>Contratos por vencimento</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Dia de vencimento</th>
              <th>Ciclo</th>
              <th>Valor</th>
              <th>Documentos</th>
            </tr>
          </thead>
          <tbody>
            {!loading && contractsByDue.length === 0 && (
              <tr>
                <td colSpan={5}>Sem contratos com vencimento definido.</td>
              </tr>
            )}
            {contractsByDue.map((item) => (
              <tr key={item.contractId}>
                <td>{item.companyName}</td>
                <td>{item.dueDay ?? "-"}</td>
                <td>{item.billingCycle ?? "-"}</td>
                <td>{formatCurrency(item.value)}</td>
                <td>{item.documentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
