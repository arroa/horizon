export type StageNarrative = {
  id: string;
  eyebrow: string;
  question: string;
  logic: string;
  formula?: string;
  example: string;
  note?: string;
};

export const stageNarratives: StageNarrative[] = [
  {
    id: "ventas",
    eyebrow: "Actividad comercial",
    question: "¿Cuánto venderá cada línea y con qué margen?",
    logic:
      "Los dos inputs de devolución son correctores. El porcentaje permite mover el comportamiento histórico al alza o a la baja; el juicio experto permite reemplazar el resultado cuando el algoritmo no representa una situación conocida.",
    formula: "Ventas netas = Ingresos del mes − Acuerdos y bonificaciones − Devoluciones",
    example:
      "Una venta de $100 no equivale a $100 de caja. Primero se descuentan acuerdos y devoluciones; luego se agrega IVA para determinar lo que queda por cobrar.",
  },
  {
    id: "compras",
    eyebrow: "Reposición y abastecimiento",
    question: "¿Qué se compra y cómo se financia?",
    logic:
      "La porción importada financiada con carta pasa al bloque 04. El resto de las importaciones y las compras locales permanecen como financiamiento de proveedor según sus respectivos plazos.",
    formula: "Importaciones financiadas = Importaciones × % con carta de crédito",
    example:
      "Si se importan $100 y el 60% se financia con carta, $60 consume líneas bancarias. Los $40 restantes siguen el plazo del proveedor.",
    note: "Por historia, algunas fórmulas están abiertas por familia, aunque económicamente la lectura relevante es por línea.",
  },
  {
    id: "variables",
    eyebrow: "Condiciones comerciales",
    question: "¿Cómo absorbe cada línea las consecuencias de vender?",
    logic:
      "Si el corrector de acuerdos está vacío, se conserva el comportamiento histórico. Si se informa, modifica ese porcentaje en puntos básicos.",
    formula: "CxC futura = ventas con IVA que continúan pendientes según los días de venta",
    example:
      "Con 60 días de venta, una venta de julio permanece como cuenta por cobrar durante los meses siguientes hasta completar su plazo.",
  },
  {
    id: "cartas",
    eyebrow: "Financiamiento de importaciones",
    question: "¿Qué línea bancaria se usa, por cuánto tiempo y a qué costo?",
    logic:
      "El bloque recibe únicamente las importaciones financiadas con carta. El consumo permanece durante la vida de cada tramo y el interés se devenga según la tasa aplicable.",
    formula: "Interés mensual = saldo financiado × tasa anual ÷ 12",
    example: "Una carta puede reservar línea hoy, pasar por el tramo subvencionado y luego por tasa normal.",
  },
  {
    id: "gav",
    eyebrow: "Estructura operacional",
    question: "¿Cuánto cuesta sostener la operación y dónde se asigna?",
    logic: "El input conserva lo presupuestado; el output es la interfaz estable que usa el modelo.",
    formula: "Output consumido = presupuesto base ± regla de distribución o excepción",
    example:
      "Hoy una partida puede salir igual al presupuesto. Mañana puede estacionalizarse sin romper las fórmulas posteriores.",
  },
  {
    id: "otros",
    eyebrow: "Complemento de resultados",
    question: "¿Qué partidas faltan para completar el estado de resultados?",
    logic:
      "La pareja input/output permite cambiar después la forma de cálculo sin modificar el resto del modelo.",
    example: "Una partida puede ser hoy un valor digitado. Si después se calcula por contrato, sólo cambia su output.",
  },
  {
    id: "balance",
    eyebrow: "Posición financiera",
    question: "¿Dónde terminan los efectos acumulados de cada decisión?",
    logic:
      "Deudores comerciales y cuentas por pagar se abren por línea. La deuda estructurada sigue su calendario contractual.",
    formula: "Saldo final = saldo inicial + movimientos del período",
    example: "Más ventas pueden elevar la utilidad y, al mismo tiempo, aumentar las cuentas por cobrar.",
  },
  {
    id: "caja",
    eyebrow: "Caja resultante",
    question: "Después de financiar la operación, ¿cuánta caja queda?",
    logic:
      "Aumentar activos consume caja; aumentar pasivos aporta financiamiento. Primero se obtiene la precaja y sólo si queda bajo el mínimo se activa la línea de crédito.",
    formula: "Precaja = caja anterior + utilidad − Δ activos sin caja + Δ pasivos sin LC",
    example: "Si la precaja es $180 y el mínimo requerido es $250, la línea de crédito aporta $70.",
  },
];

export function slugifyDomain(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function findNarrative(domainTitle: string, domainId: string) {
  const normalizedTitle = domainTitle
    .trim()
    .toLowerCase()
    .replace(/^\d{1,2}\s+/, "");
  const aliasByTitle: Record<string, string> = {
    "uso neto de recursos": "caja",
    "variables por línea": "variables",
    "variables por linea": "variables",
    "gav y remuneraciones": "gav",
    "cartas de crédito": "cartas",
    "cartas de credito": "cartas",
    "otros ingresos y gastos": "otros",
    "balance general": "balance",
  };
  const aliasId = aliasByTitle[normalizedTitle];
  return (
    stageNarratives.find((item) => item.id === domainId) ??
    stageNarratives.find((item) => item.id === aliasId) ??
    stageNarratives.find((item) => slugifyDomain(item.id) === domainId) ??
    null
  );
}
