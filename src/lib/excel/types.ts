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
