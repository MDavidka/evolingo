import type { HTMLAttributes, ReactNode } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function PageContainer({ className = "", ...props }: DivProps) {
  return <div className={`evo-page-container ${className}`.trim()} {...props} />;
}

export function Card({ children, className = "", ...props }: DivProps & { variant?: "outlined" | "filled" | "elevated" }) {
  const { variant = "outlined", ...rest } = props;
  return <section className={`evo-card ${className}`.trim()} data-variant={variant} {...rest}>{children}</section>;
}

export function ListRow({ children, className = "", ...props }: DivProps) {
  return <div className={`evo-list-row ${className}`.trim()} {...props}>{children}</div>;
}

export function SectionLabel({ children, className = "", ...props }: DivProps & { children: ReactNode }) {
  return <h2 className={`evo-section-label ${className}`.trim()} {...props}>{children}</h2>;
}
