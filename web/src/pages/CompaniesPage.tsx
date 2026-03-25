import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TableProps } from "antd";
import { PERMISSIONS } from "../constants/permissions";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearCompaniesError,
  closeCompaniesModal,
  fetchCompanies,
  openCompaniesModal,
  resetCompaniesFilters,
  setCompaniesFilters,
  setCompaniesPage,
  setCompaniesPageSize
} from "../store/slices/companiesSlice";
import { Company } from "../types/api";
import { AppButton, AppInput, AppPagination, AppTable, DashboardFilterSelect } from "../ui/components";
import { notifyError, notifySuccess } from "../ui/feedback/notifications";
import { formatDate } from "../utils/format";
import { resolveCompanyLogoUrl } from "../store/slices/companyDetailsSlice";
import { CompanyUpsertModal } from "../features/company/components/CompanyUpsertModal";

export function CompaniesPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { hasPermission } = useAuth();
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  const { items, loading, error, modalOpen, filters, page, pageSize } = useAppSelector(
    (state) => state.companies
  );

  const canReadDocuments = hasPermission(PERMISSIONS.DOCUMENTS_READ);
  const canWriteDocuments = hasPermission(PERMISSIONS.DOCUMENTS_WRITE);

  useEffect(() => {
    void dispatch(fetchCompanies());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      notifyError("Empresas", error);
      dispatch(clearCompaniesError());
    }
  }, [dispatch, error]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const columns: TableProps<Company>["columns"] = [
    {
      title: "Empresa",
      key: "name",
      render: (_, record) => {
        const companyLogoUrl = resolveCompanyLogoUrl(record.logoPath);

        return (
          <div className="company-name-cell">
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt={record.name} className="company-logo-avatar" />
            ) : (
              <div className="company-logo-placeholder">{record.name.slice(0, 2).toUpperCase()}</div>
            )}
            <div>
              <strong>
                #{String(record.code ?? 0).padStart(4, "0")} - {record.name}
              </strong>
              <small>{record.personalResponsible || "Sem responsavel"}</small>
            </div>
          </div>
        );
      }
    },
    {
      title: "Cidade/UF",
      key: "cityState",
      render: (_, record) => `${record.city ?? "-"}/${record.state ?? "-"}`
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => record.status
    },
    {
      title: "Proximo Ciclo",
      key: "nextCycleDate",
      render: (_, record) => formatDate(record.nextCycleDate)
    },
    {
      title: "Acoes",
      key: "actions",
      render: (_, record) => (
        <div className="filters-actions">
          {hasPermission(PERMISSIONS.COMPANIES_WRITE) && (
            <AppButton
              onClick={() => {
                setEditingCompanyId(record.id);
                dispatch(openCompaniesModal());
              }}
            >
              Editar
            </AppButton>
          )}
          <AppButton onClick={() => navigate(`/empresas/${record.id}`)}>Ver detalhes</AppButton>
        </div>
      )
    }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Empresas</h1>
        {hasPermission(PERMISSIONS.COMPANIES_WRITE) && (
          <AppButton
            type="primary"
            onClick={() => {
              setEditingCompanyId(null);
              dispatch(openCompaniesModal());
            }}
          >
            Nova Empresa
          </AppButton>
        )}
      </div>

      <div className="asstramed-dashboard-filters">
        <AppInput
          placeholder="Buscar empresa..."
          value={filters.search}
          onChange={(event) => dispatch(setCompaniesFilters({ search: event.target.value }))}
        />

        <DashboardFilterSelect
          value={filters.status || undefined}
          placeholder="Status: Todos"
          allowClear
          options={[
            { label: "Ativa", value: "ATIVA" },
            { label: "Inativa", value: "INATIVA" }
          ]}
          onChange={(value) => dispatch(setCompaniesFilters({ status: (value as string) || "" }))}
        />

        <div className="filters-actions">
          <AppButton type="primary" loading={loading} onClick={() => void dispatch(fetchCompanies())}>
            Filtrar
          </AppButton>
          <AppButton
            onClick={() => {
              dispatch(resetCompaniesFilters());
              void dispatch(fetchCompanies());
            }}
          >
            Limpar
          </AppButton>
        </div>
      </div>

      <AppTable<Company>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={paginatedRows}
        pagination={false}
      />

      <div className="filters-actions" style={{ justifyContent: "flex-end" }}>
        <AppPagination
          current={page}
          pageSize={pageSize}
          total={items.length}
          showSizeChanger
          onChange={(nextPage, nextSize) => {
            dispatch(setCompaniesPage(nextPage));
            if (nextSize !== pageSize) {
              dispatch(setCompaniesPageSize(nextSize));
            }
          }}
        />
      </div>

      <CompanyUpsertModal
        open={modalOpen}
        mode={editingCompanyId ? "edit" : "create"}
        companyId={editingCompanyId}
        canReadDocuments={canReadDocuments}
        canWriteDocuments={canWriteDocuments}
        onCancel={() => {
          setEditingCompanyId(null);
          dispatch(closeCompaniesModal());
        }}
        onSaved={async () => {
          setEditingCompanyId(null);
          dispatch(closeCompaniesModal());
          await dispatch(fetchCompanies()).unwrap();
          notifySuccess(
            editingCompanyId ? "Empresa atualizada" : "Empresa criada",
            editingCompanyId ? "Cadastro unificado atualizado com sucesso." : "Empresa cadastrada com sucesso."
          );
        }}
      />
    </div>
  );
}
