import type { ModelVariable, VariableAnalysis, VariableDependency } from "./types";

function sameVariant(a: ModelVariable, b: ModelVariable) {
  return (
    a.name === b.name &&
    a.ambit === b.ambit &&
    a.account === b.account &&
    a.line === b.line &&
    a.family === b.family
  );
}

function extractDependenciesFromFormula(
  formula: string,
  currentVariable: ModelVariable | null,
  allVariables: ModelVariable[],
): VariableDependency[] {
  const deps: VariableDependency[] = [];
  if (!formula) return deps;

  if (currentVariable) {
    const excelRow = currentVariable.excelRow;
    const sameRow = new RegExp(`\\$[A-Z]+${excelRow}\\b`);
    const hasSameRowDim = sameRow.test(formula);
    const hasMgInput = /MGDato\s*=\s*"Input"/i.test(formula);
    const hasDrOutput = /DRDato\s*=\s*"Output"/i.test(formula);

    if (hasSameRowDim && hasMgInput) {
      deps.push({
        type: "self_input_reference",
        name: currentVariable.name,
        description: "Misma variable, versión INPUT",
      });
    }

    if (hasSameRowDim && hasDrOutput) {
      deps.push({
        type: "dr_reference",
        name: currentVariable.name,
        description: "Arrastre desde Datos Reales",
      });
    }
  }

  const seen = new Set(deps.map((dep) => dep.name));
  const addDep = (type: VariableDependency["type"], name: string, description?: string) => {
    if (!name || seen.has(name)) return;
    if (currentVariable && name === currentVariable.name && type === "precedent_variable") return;
    seen.add(name);
    deps.push({ type, name, description });
  };

  const quotedRefs = formula.matchAll(/(MGVariable|DRVariable)\s*(?:=|,)\s*"([^"]+)"/gi);
  for (const match of quotedRefs) {
    const source = match[1].toUpperCase();
    const name = match[2];
    if (source === "DRVARIABLE") {
      addDep("dr_reference", name, `Datos históricos: ${name}`);
    } else {
      addDep("precedent_variable", name);
    }
  }

  void allVariables;
  return deps;
}

function classifyVariable(
  variable: ModelVariable,
  allVariables: ModelVariable[],
): VariableAnalysis["classification"] {
  if (variable.dataType === "Input") return "INPUT";

  if (variable.formula) {
    const precedents = extractDependenciesFromFormula(variable.formula, variable, allVariables);
    const allPrecedentsAreInputOrDR = precedents.every((dep) => {
      if (dep.type === "self_input_reference" || dep.type === "dr_reference") return true;
      return allVariables.some((item) => item.name === dep.name && item.dataType === "Input");
    });
    return allPrecedentsAreInputOrDR ? "PRIMARIA" : "DERIVADA";
  }

  return "CÁLCULO";
}

function detectDimensions(formula: string, variable: ModelVariable) {
  if (!formula) {
    return {
      cuenta: !!variable.account,
      linea: !!variable.line,
      familia: !!variable.family,
    };
  }

  return {
    cuenta: /MGCuenta|DRCuenta/i.test(formula) || !!variable.account,
    linea: /MGLinea|DRLinea/i.test(formula) || !!variable.line,
    familia: /MGFamilia|DRFamilia/i.test(formula) || !!variable.family,
  };
}

function generateExplanation(
  variable: ModelVariable,
  classification: VariableAnalysis["classification"],
  formula: string,
) {
  if (classification === "INPUT") {
    return variable.logica
      ? `Variable de entrada. ${variable.logica}`
      : "Variable de entrada que debe ser proporcionada por el usuario.";
  }
  if (classification === "PRIMARIA") return "Cálculo primario que combina datos de entrada.";
  if (classification === "DERIVADA") return "Cálculo derivado que combina otras variables del modelo.";
  return formula ? "Cálculo del modelo." : "Sin fórmula disponible en el snapshot.";
}

export function analyzeVariable(variable: ModelVariable, allVariables: ModelVariable[]): VariableAnalysis {
  const formula = variable.formula || "";
  const classification = classifyVariable(variable, allVariables);
  const precedents = extractDependenciesFromFormula(formula, variable, allVariables);

  return {
    variable,
    classification,
    formula,
    precedents,
    explanation: generateExplanation(variable, classification, formula),
    dimensions: detectDimensions(formula, variable),
  };
}

export function findInputVersion(variable: ModelVariable, allVariables: ModelVariable[]) {
  return allVariables.find((item) => sameVariant(item, variable) && item.dataType === "Input") ?? null;
}

export function labelVariant(variable: ModelVariable) {
  return [variable.account || "Sin cuenta", variable.line || "Sin línea", variable.family || "Sin familia"].join(
    " · ",
  );
}
