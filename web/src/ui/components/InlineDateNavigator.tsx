import { useState } from "react";
import dayjs from "dayjs";
import { CalendarOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { AppButton } from "./AppButton";
import { AppDateTimePicker } from "./AppDateTimePicker";
import { formatDate } from "../../utils/format";

interface InlineDateNavigatorProps {
  value: string;
  onChange: (nextValue: string) => void;
  label?: string;
  className?: string;
}

export function InlineDateNavigator({ value, onChange, label, className }: InlineDateNavigatorProps) {
  const [open, setOpen] = useState(false);

  function changeByDays(offsetDays: number) {
    onChange(dayjs(value).add(offsetDays, "day").format("YYYY-MM-DD"));
  }

  return (
    <div className={`inline-date-navigator ${className ?? ""}`.trim()}>
      {label && <label className="field-label inline-date-navigator-label">{label}</label>}

      <div className="inline-date-navigator-row">
        <AppButton aria-label="Dia anterior" onClick={() => changeByDays(-1)}>
          <LeftOutlined />
        </AppButton>

        <div className="inline-date-navigator-center">
          <button
            type="button"
            className="inline-date-trigger"
            onClick={() => setOpen(true)}
            aria-label={label ? `Selecionar ${label.toLowerCase()}` : "Selecionar data"}
          >
            <CalendarOutlined />
            <span>{formatDate(value)}</span>
          </button>

          <div className="inline-date-picker-anchor" aria-hidden="true">
            <AppDateTimePicker
              open={open}
              showTime={false}
              allowClear={false}
              format="DD/MM/YYYY"
              value={dayjs(value)}
              onOpenChange={setOpen}
              onChange={(nextValue) => {
                const parsedValue = Array.isArray(nextValue) ? (nextValue[0] ?? null) : nextValue;

                if (!parsedValue) {
                  return;
                }

                onChange(parsedValue.format("YYYY-MM-DD"));
                setOpen(false);
              }}
            />
          </div>
        </div>

        <AppButton aria-label="Proximo dia" onClick={() => changeByDays(1)}>
          <RightOutlined />
        </AppButton>
      </div>
    </div>
  );
}
