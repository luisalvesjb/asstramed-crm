import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TableProps } from "antd";
import { PERMISSIONS } from "../constants/permissions";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearCompaniesError,
  closeCompaniesModal,
  createCompany,
  fetchCompanies,
  openCompaniesModal,
  resetCompaniesFilters,
  setCompaniesFilters,
  setCompaniesForm,
  setCompaniesPage,
  setCompaniesPageSize
} from "../store/slices/companiesSlice";
import { Company } from "../types/api";
import {
  AppButton,
  AppInput,
  AppModal,
  AppPagination,
  AppTable,
  DashboardFilterSelect
} from "../ui/components";
import { notifyError, notifySuccess } from "../ui/feedback/notifications";
import { formatDate } from "../utils/format";
import { resolveCompanyLogoUrl } from "../store/slices/companyDetailsSlice";

export function CompaniesPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { hasPermission } = useAuth();

  const { items, loading, saving, error, modalOpen, filters, form, page, pageSize } = useAppSelector(
    (state) => state.companies
  );

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
              <strong>{record.name}</strong>
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
        <AppButton onClick={() => navigate(`/empresas/${record.id}`)}>Ver detalhes</AppButton>
      )
    }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Empresas</h1>
        {hasPermission(PERMISSIONS.COMPANIES_WRITE) && (
          <AppButton type="primary" onClick={() => dispatch(openCompaniesModal())}>
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

      <AppModal
        open={modalOpen}
        title="Nova Empresa"
        onCancel={() => dispatch(closeCompaniesModal())}
        footer={[
          <AppButton key="cancel" onClick={() => dispatch(closeCompaniesModal())}>
            Cancelar
          </AppButton>,
          <AppButton
            key="save"
            type="primary"
            loading={saving}
            onClick={async () => {
              const result = await dispatch(createCompany());
              if (createCompany.fulfilled.match(result)) {
                notifySuccess("Empresa criada", "Empresa cadastrada com sucesso.");
              }
            }}
          >
            Salvar
          </AppButton>
        ]}
      >
        <div className="form-grid">
          <AppInput
            placeholder="Nome"
            value={form.name}
            onChange={(event) => dispatch(setCompaniesForm({ name: event.target.value }))}
          />
          <AppInput
            placeholder="Razao social"
            value={form.legalName}
            onChange={(event) => dispatch(setCompaniesForm({ legalName: event.target.value }))}
          />
          <AppInput
            placeholder="Cidade"
            value={form.city}
            onChange={(event) => dispatch(setCompaniesForm({ city: event.target.value }))}
          />
          <AppInput
            placeholder="UF"
            maxLength={2}
            value={form.state}
            onChange={(event) => dispatch(setCompaniesForm({ state: event.target.value.toUpperCase() }))}
          />
          <DashboardFilterSelect
            value={form.status}
            options={[
              { label: "Ativa", value: "ATIVA" },
              { label: "Inativa", value: "INATIVA" }
            ]}
            onChange={(value) => dispatch(setCompaniesForm({ status: String(value) }))}
          />
          <AppInput
            type="date"
            value={form.nextCycleDate}
            onChange={(event) => dispatch(setCompaniesForm({ nextCycleDate: event.target.value }))}
          />
        </div>
      </AppModal>
    </div>
  );
}
