export type DomainVariable = {
  slug: string;
  name: string;
  kind: "input" | "output";
  formulaExcel?: string;
  formulaHumana?: string;
  inputs?: string[];
};

export type Domain = {
  id: string;
  number: string;
  title: string;
  eyebrow: string;
  question: string;
  summary: string;
  logic: string;
  formula?: string;
  example: string;
  note?: string;
  impact: string[];
  variables: DomainVariable[];
};

export const domains: Domain[] = [
  {
    id: "ventas",
    number: "01",
    title: "Ventas",
    eyebrow: "Actividad comercial",
    question: "¿Cuánto venderá cada línea y con qué margen?",
    summary:
      "Cada línea de negocio se proyecta como una unidad económica. La familia identifica el producto asociado, pero el modelo privilegia la simpleza de la línea sobre toda la combinatoria línea–familia.",
    logic:
      "Los dos inputs de devolución son correctores. El porcentaje permite mover el comportamiento histórico al alza o a la baja; el juicio experto permite reemplazar el resultado cuando el algoritmo no representa una situación conocida.",
    formula: "Ventas netas = Ingresos del mes − Acuerdos y bonificaciones − Devoluciones",
    example:
      "Una venta de $100 no equivale a $100 de caja. Primero se descuentan acuerdos y devoluciones; luego se agrega IVA para determinar lo que queda por cobrar.",
    impact: ["Estado de resultados", "Cuentas por cobrar", "Inventario y margen"],
    variables: [
      { slug: "ingresos-del-mes", name: "Ingresos del mes", kind: "input" },
      { slug: "costo-de-ventas", name: "Costo de ventas", kind: "input" },
      { slug: "devolucion-corrector", name: "% devolución · corrector", kind: "input" },
      { slug: "devolucion-juicio", name: "Devolución · juicio experto", kind: "input" },
      {
        slug: "ventas-netas",
        name: "Ventas netas",
        kind: "output",
        formulaHumana: "Ingresos del mes menos acuerdos, bonificaciones y devoluciones.",
        formulaExcel: 'INDEX(MGValores, MATCH(1, (MGVariable="Ingresos del Mes")*(MGDato="Input"), 0), …)',
        inputs: ["Ingresos del mes", "Acuerdos y bonificaciones", "% Devolución"],
      },
      { slug: "acuerdos-y-bonificaciones", name: "Acuerdos y bonificaciones", kind: "output", inputs: ["Ingresos del mes", "% Acuerdos y bonificaciones"] },
      { slug: "ventas-consolidadas-iva", name: "Ventas consolidadas + IVA", kind: "output" },
      { slug: "costo-de-ventas-neto", name: "Costo de ventas neto", kind: "output" },
    ],
  },
  {
    id: "compras",
    number: "02",
    title: "Compras",
    eyebrow: "Reposición y abastecimiento",
    question: "¿Qué se compra y cómo se financia?",
    summary:
      "Después de vender, el negocio debe reponer inventario. El modelo separa importaciones de compras locales y distingue qué parte de las importaciones se financia con carta de crédito.",
    logic:
      "La porción importada financiada con carta pasa al bloque 04. El resto de las importaciones y las compras locales permanecen como financiamiento de proveedor según sus respectivos plazos.",
    formula: "Importaciones financiadas = Importaciones × % con carta de crédito",
    example:
      "Si se importan $100 y el 60% se financia con carta, $60 consume líneas bancarias. Los $40 restantes siguen el plazo del proveedor.",
    note: "Por historia, algunas fórmulas están abiertas por familia, aunque económicamente la lectura relevante es por línea.",
    impact: ["Inventario", "Cuentas por pagar", "Deuda financiera", "Gasto financiero"],
    variables: [
      { slug: "importaciones", name: "Importaciones", kind: "input" },
      { slug: "pct-carta", name: "% compra con carta de crédito", kind: "input" },
      { slug: "compras-locales", name: "Compras locales", kind: "input" },
      { slug: "inventario-valorizado", name: "Inventario valorizado", kind: "output" },
      { slug: "deuda-proveedores", name: "Deuda con proveedores", kind: "output" },
    ],
  },
  {
    id: "variables",
    number: "03",
    title: "Variables por línea",
    eyebrow: "Condiciones comerciales",
    question: "¿Cómo absorbe cada línea las consecuencias de vender?",
    summary:
      "Este bloque traduce la actividad comercial de cada línea en condiciones de cobro, acuerdos comerciales y movimientos asociados a Tenacta.",
    logic:
      "Si el corrector de acuerdos está vacío, se conserva el comportamiento histórico. Si se informa, modifica ese porcentaje en puntos básicos.",
    formula: "CxC futura = ventas con IVA que continúan pendientes según los días de venta",
    example: "Con 60 días de venta, una venta de julio permanece como cuenta por cobrar durante los meses siguientes hasta completar su plazo.",
    impact: ["Cuentas por cobrar futuras", "Ventas netas", "Otros ingresos y gastos"],
    variables: [
      { slug: "dias-de-ventas", name: "Días de ventas", kind: "input" },
      { slug: "pct-acuerdos", name: "% acuerdos y bonificaciones", kind: "output" },
      { slug: "bonificacion-tenacta", name: "Bonificación Tenacta", kind: "output" },
    ],
  },
  {
    id: "cartas",
    number: "04",
    title: "Cartas de crédito",
    eyebrow: "Financiamiento de importaciones",
    question: "¿Qué línea bancaria se usa, por cuánto tiempo y a qué costo?",
    summary:
      "La parte financiada de las importaciones se distribuye entre línea reservada, subvencionada y normal. Cada tramo tiene plazo y tasa propios.",
    logic: "El bloque recibe únicamente las importaciones financiadas con carta. El consumo permanece durante la vida de cada tramo y el interés se devenga según la tasa aplicable.",
    formula: "Interés mensual = saldo financiado × tasa anual ÷ 12",
    example: "Una carta puede reservar línea hoy, pasar por el tramo subvencionado y luego por tasa normal.",
    impact: ["Deuda financiera", "Gasto por intereses", "Disponibilidad de líneas"],
    variables: [
      { slug: "tasa-banco", name: "Tasa anual banco", kind: "input" },
      { slug: "consumo-total", name: "Consumo línea total", kind: "output" },
      { slug: "interes-mes", name: "Interés total del mes", kind: "output" },
    ],
  },
  {
    id: "gav",
    number: "05",
    title: "GAV y remuneraciones",
    eyebrow: "Estructura operacional",
    question: "¿Cuánto cuesta sostener la operación y dónde se asigna?",
    summary: "La mayor parte del gasto proviene de la hoja Presupuesto y se distribuye por línea.",
    logic: "El input conserva lo presupuestado; el output es la interfaz estable que usa el modelo.",
    formula: "Output consumido = presupuesto base ± regla de distribución o excepción",
    example: "Hoy una partida puede salir igual al presupuesto. Mañana puede estacionalizarse sin romper las fórmulas posteriores.",
    impact: ["Estado de resultados", "Resultado por línea", "Caja del período"],
    variables: [
      { slug: "gasto-mensual", name: "Gasto mensual", kind: "output" },
      { slug: "remuneraciones", name: "Remuneraciones", kind: "input" },
    ],
  },
  {
    id: "otros",
    number: "06",
    title: "Otros ingresos y gastos",
    eyebrow: "Complemento de resultados",
    question: "¿Qué partidas faltan para completar el estado de resultados?",
    summary: "Recoge partidas que no nacen de ventas, compras o GAV y las entrega al estado de resultados mediante parejas input/output.",
    logic: "La pareja input/output permite cambiar después la forma de cálculo sin modificar el resto del modelo.",
    example: "Una partida puede ser hoy un valor digitado. Si después se calcula por contrato, sólo cambia su output.",
    impact: ["Estado de resultados", "Utilidad neta", "Patrimonio"],
    variables: [
      { slug: "otros-ingresos", name: "Otros ingresos del mes", kind: "output" },
      { slug: "otros-gastos", name: "Otros gastos del mes", kind: "output" },
    ],
  },
  {
    id: "balance",
    number: "07",
    title: "Balance general",
    eyebrow: "Posición financiera",
    question: "¿Dónde terminan los efectos acumulados de cada decisión?",
    summary: "El balance reúne los saldos producidos por los bloques anteriores. Su lectura es cuenta a cuenta.",
    logic: "Deudores comerciales y cuentas por pagar se abren por línea. La deuda estructurada sigue su calendario contractual.",
    formula: "Saldo final = saldo inicial + movimientos del período",
    example: "Más ventas pueden elevar la utilidad y, al mismo tiempo, aumentar las cuentas por cobrar.",
    impact: ["Capital de trabajo", "Endeudamiento", "Uso neto de recursos"],
    variables: [
      { slug: "saldo", name: "Saldo", kind: "output" },
      { slug: "cxc-proyectadas", name: "Cuentas por cobrar proyectadas", kind: "output" },
      { slug: "cxp-proyectadas", name: "Cuentas por pagar proyectadas", kind: "output" },
    ],
  },
  {
    id: "caja",
    number: "10",
    title: "Uso neto de recursos",
    eyebrow: "Caja resultante",
    question: "Después de financiar la operación, ¿cuánta caja queda?",
    summary: "La caja no se digita como un presupuesto independiente: resulta de la utilidad y de los cambios del balance.",
    logic:
      "Aumentar activos consume caja; aumentar pasivos aporta financiamiento. Primero se obtiene la precaja y sólo si queda bajo el mínimo se activa la línea de crédito.",
    formula: "Precaja = caja anterior + utilidad − Δ activos sin caja + Δ pasivos sin LC",
    example: "Si la precaja es $180 y el mínimo requerido es $250, la línea de crédito aporta $70.",
    impact: ["Liquidez", "Necesidad de financiamiento", "Capacidad de cumplir compromisos"],
    variables: [
      { slug: "caja-minima", name: "Caja mínima", kind: "input" },
      { slug: "precaja", name: "Precaja", kind: "output" },
      { slug: "linea-de-credito", name: "Línea de crédito", kind: "output" },
    ],
  },
];

export function getDomain(id: string) {
  return domains.find((domain) => domain.id === id) ?? null;
}

export function getDomainIndex(id: string) {
  return domains.findIndex((domain) => domain.id === id);
}

export function getNeighbors(id: string) {
  const index = getDomainIndex(id);
  return {
    prev: index > 0 ? domains[index - 1] : null,
    next: index >= 0 && index < domains.length - 1 ? domains[index + 1] : null,
    position: index + 1,
    total: domains.length,
  };
}

export function getVariable(domainId: string, slug: string) {
  const domain = getDomain(domainId);
  if (!domain) return null;
  const variable = domain.variables.find((item) => item.slug === slug);
  if (!variable) return null;
  return { domain, variable };
}
