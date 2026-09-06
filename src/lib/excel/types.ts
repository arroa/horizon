export type DataType = "Input" | "Output";

export type MonthValue = {
  label: string;
  value: string;
  isFormula: boolean;
};

export type ModelVariable = {
  id: string;
  name: string;
  ambit: string;
  account: string;
  line: string;
  family: string;
  dataType: DataType;
  logica: string;
  formula: string;
  months: MonthValue[];
  excelRow: number;
  sheet: string;
};

export type VariableGroup = {
  name: string;
  kind: "input" | "output";
  variantCount: number;
  variants: ModelVariable[];
};

export type ModelDomain = {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  longDesc: string;
  eyebrow: string;
  question: string;
  logic: string;
  formula?: string;
  example: string;
  note?: string;
  inputs: VariableGroup[];
  outputs: VariableGroup[];
};

export type DomainGlossary = {
  dominio: string;
  shortDesc: string;
  longDesc: string;
};

export type ModelSnapshot = {
  fileName: string;
  ingestedAt: string;
  domains: ModelDomain[];
  variables: ModelVariable[];
  glossary: DomainGlossary[];
  monthLabels: string[];
  balance?: FinancialStatement;
  eerr?: FinancialStatement;
};

export type StatementRowKind = "account" | "group" | "total" | "spacer";

export type StatementMonthNature = "real" | "proy" | "grupo" | "unknown";

export type StatementColumnKind = "month" | "quarter" | "year" | "other";

export type StatementColumn = {
  index: number;
  label: string;
  nature: StatementMonthNature;
  kind: StatementColumnKind;
  outlineLevel: number;
  excelHidden?: boolean;
  /** Columnas detalle ocultas al colapsar este grupo (trimestre/año). */
  childIndexes?: number[];
  excelCollapsed?: boolean;
};

export type StatementRow = {
  label: string;
  kind: StatementRowKind;
  values: string[];
  excelRow: number;
  /** outlineLevel de Excel (0 = raíz, 1..2 = anidados). */
  outlineLevel?: number;
  /** Fila oculta en el Excel al momento del ingest. */
  excelHidden?: boolean;
  /** El grupo partía colapsado en Excel (todos los hijos hidden). */
  excelCollapsed?: boolean;
  /** 1 o 2 según profundidad del grupo Excel. */
  collapseLevel?: 1 | 2;
  /** Descendientes ocultos al colapsar este nodo (abre hacia abajo). */
  childExcelRows?: number[];
  /** Sangría visual tras reordenar totales de sección hacia abajo. */
  displayDepth?: number;
};

export type FinancialStatement = {
  sheet: string;
  months: string[];
  /** Real / Proy / Grupo por columna. */
  monthNatures: StatementMonthNature[];
  columns: StatementColumn[];
  rows: StatementRow[];
  /** Cómo reconstruir grupos de fila en el cliente. */
  rowCollapse?: {
    outlineChildren: "after" | "before";
    sectionTotals?: boolean;
    defaultCollapsed?: boolean;
  };
};

export type VariableDependency = {
  type: "precedent_variable" | "self_input_reference" | "dr_reference";
  name: string;
  description?: string;
};

export type VariableAnalysis = {
  variable: ModelVariable;
  classification: "INPUT" | "PRIMARIA" | "DERIVADA" | "CÁLCULO";
  formula: string;
  precedents: VariableDependency[];
  explanation: string;
  dimensions: { cuenta: boolean; linea: boolean; familia: boolean };
};
