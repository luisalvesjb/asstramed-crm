import { ThemeConfig } from "antd";

export const asstramedAntTheme: ThemeConfig = {
  token: {
    colorPrimary: "var(--theme-primary)",
    colorBgContainer: "#ffffff",
    colorBgLayout: "transparent",
    colorText: "#1f2a42",
    colorTextSecondary: "#7e89a3",
    colorBorder: "#e4e8f1",
    colorSuccess: "var(--success)",
    colorError: "var(--danger)",
    colorWarning: "var(--warning)",
    borderRadius: 10,
    fontFamily: "Montserrat, sans-serif",
    fontSize: 12.5,
    fontSizeHeading1: 26,
    fontSizeHeading2: 22,
    fontSizeHeading3: 17
  },
  components: {
    Button: {
      borderRadius: 10,
      controlHeight: 36,
      fontWeight: 600
    },
    Input: {
      controlHeight: 38,
      borderRadius: 10
    },
    Select: {
      controlHeight: 38,
      borderRadius: 10
    },
    DatePicker: {
      borderRadius: 10,
      controlHeight: 38
    },
    Modal: {
      borderRadiusLG: 16
    },
    Table: {
      headerBg: "#f7f9ff",
      headerColor: "#53617a",
      rowHoverBg: "#f9fbff"
    },
    Tabs: {
      itemColor: "#62708b",
      itemSelectedColor: "#2e3d61",
      inkBarColor: "var(--theme-primary)"
    },
    Card: {
      borderRadiusLG: 16
    },
    Pagination: {
      borderRadius: 9
    }
  }
};
