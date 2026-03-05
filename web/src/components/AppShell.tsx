import { ReactNode, useEffect, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChartOutlined,
  BellOutlined,
  DollarOutlined,
  DownOutlined,
  FundProjectionScreenOutlined,
  HomeOutlined,
  LogoutOutlined,
  MessageOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Dropdown, type MenuProps } from "antd";
import { PERMISSIONS } from "../constants/permissions";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loadTopbarCompanies } from "../store/slices/authSlice";
import { AppInput, TopbarCompanySelect } from "../ui/components";
import { resolveAssetUrl } from "../utils/asset-url";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, hasPermission, logout, selectedCompanyId, setCompanySelection } = useAuth();
  const companies = useAppSelector((state) => state.auth.topbarCompanies);

  const menu = useMemo(
    () => [
      {
        section: "CRM",
        items: [
          {
            to: "/",
            label: "Dashboard",
            permission: PERMISSIONS.DASHBOARD_READ,
            icon: <HomeOutlined />
          },
          {
            to: "/empresas",
            label: "Empresas",
            permission: PERMISSIONS.COMPANIES_READ,
            icon: <TeamOutlined />
          },
          {
            to: "/relatorios",
            label: "Relatorios",
            permission: PERMISSIONS.REPORTS_READ,
            icon: <BarChartOutlined />
          },
          {
            to: "/usuarios",
            label: "Usuarios",
            permission: PERMISSIONS.USERS_READ,
            icon: <TeamOutlined />
          },
          {
            to: "/perfis",
            label: "Perfis",
            permission: PERMISSIONS.PERMISSIONS_MANAGE,
            icon: <SettingOutlined />
          }
        ]
      },
      {
        section: "Financeiro",
        items: [
          {
            to: "/financeiro/lancamentos",
            label: "Lancamentos",
            permission: PERMISSIONS.FINANCE_READ,
            icon: <DollarOutlined />
          },
          {
            to: "/financeiro/relatorios",
            label: "Relatorios",
            permission: PERMISSIONS.FINANCE_REPORTS,
            icon: <FundProjectionScreenOutlined />
          },
          {
            to: "/financeiro/configuracoes",
            label: "Configuracoes",
            permission: PERMISSIONS.FINANCE_SETTINGS,
            icon: <SettingOutlined />
          }
        ]
      }
    ],
    []
  );

  useEffect(() => {
    if (companies.length === 0 && hasPermission(PERMISSIONS.COMPANIES_READ)) {
      void dispatch(loadTopbarCompanies());
    }
  }, [companies.length, dispatch, hasPermission]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const avatarUrl = resolveAssetUrl(user?.avatarPath);

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Meu perfil"
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sair"
    }
  ];

  return (
    <div className="app-shell-frame">
      <div className="app-layout">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">A</span>
            <span className="brand-text">Asstramed</span>
          </div>
          {menu.map((menuSection) => {
            const visibleItems = menuSection.items.filter((item) => hasPermission(item.permission));

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div className="sidebar-menu-section" key={menuSection.section}>
                <div className="sidebar-section-title">{menuSection.section}</div>
                <nav className="menu">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => (isActive ? "menu-item active" : "menu-item")}
                      end={item.to === "/"}
                    >
                      <span className="menu-item-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </aside>

        <main className="main">
          <header className="topbar">
            <AppInput className="search" placeholder="Buscar..." prefix={<SearchOutlined />} />
            <TopbarCompanySelect
              className="company-select"
              value={selectedCompanyId ?? undefined}
              placeholder="Empresa: Selecionar"
              options={companies.map((company) => ({ value: company.id, label: company.name }))}
              onChange={(value) => setCompanySelection((value as string) || null)}
              allowClear
            />
            <div className="topbar-right">
              <button type="button" className="topbar-icon-btn" aria-label="Mensagens">
                <MessageOutlined />
              </button>
              <button type="button" className="topbar-icon-btn" aria-label="Notificacoes">
                <BellOutlined />
              </button>
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: userMenuItems,
                  onClick: ({ key }) => {
                    if (key === "profile") {
                      navigate("/meu-perfil");
                      return;
                    }

                    void handleLogout();
                  }
                }}
              >
                <button type="button" className="user-dropdown-trigger" aria-label="Menu do usuario">
                  <div className="user-badge">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user?.name ?? "Usuario"} className="user-avatar user-avatar-image" />
                    ) : (
                      <span className="user-avatar">{(user?.name ?? "U").slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="user-meta">
                      <span className="user-name">{user?.name ?? "Usuario"}</span>
                      <small className="user-role">{user?.profileName ?? "Perfil"}</small>
                    </span>
                  </div>
                  <DownOutlined className="user-dropdown-chevron" />
                </button>
              </Dropdown>
            </div>
          </header>

          <section className="content">{children}</section>
        </main>
      </div>
    </div>
  );
}
