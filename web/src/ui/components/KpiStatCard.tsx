import {
  CheckCircleFilled,
  ClockCircleOutlined,
  DollarCircleOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
  WarningFilled
} from "@ant-design/icons";
import { ReactNode } from "react";

type KpiTone = "positive" | "negative" | "neutral";
type KpiDeltaTone = "positive" | "negative" | "neutral";
type KpiIcon = "money" | "orders" | "activity" | "cart" | "check" | "warning" | "list" | "clock";

interface KpiStatCardProps {
  title: string;
  value: string;
  deltaText?: string;
  deltaValue?: string;
  tone?: KpiTone;
  deltaTone?: KpiDeltaTone;
  icon?: KpiIcon;
}

function iconNode(icon: KpiIcon): ReactNode {
  switch (icon) {
    case "money":
      return <DollarCircleOutlined />;
    case "orders":
      return <ShoppingCartOutlined />;
    case "activity":
      return <LineChartOutlined />;
    case "cart":
      return <ShoppingCartOutlined />;
    case "check":
      return <CheckCircleFilled />;
    case "warning":
      return <WarningFilled />;
    case "list":
      return <UnorderedListOutlined />;
    case "clock":
      return <ClockCircleOutlined />;
    default:
      return <UnorderedListOutlined />;
  }
}

export function KpiStatCard({
  title,
  value,
  deltaText,
  deltaValue,
  tone = "neutral",
  deltaTone = "neutral",
  icon = "activity"
}: KpiStatCardProps) {
  return (
    <article className={`kpi-stat-card kpi-tone-${tone}`}>
      <div className="kpi-stat-header">
        <span className="kpi-stat-title">{title}</span>
        <span className="kpi-stat-icon" aria-hidden="true">
          {iconNode(icon)}
        </span>
      </div>

      <strong className="kpi-stat-value">{value}</strong>

      {(deltaValue || deltaText) && (
        <div className="kpi-stat-footer">
          {deltaValue && <span className={`kpi-stat-delta kpi-delta-${deltaTone}`}>{deltaValue}</span>}
          {deltaText && <span className="kpi-stat-delta-text">{deltaText}</span>}
        </div>
      )}
    </article>
  );
}
