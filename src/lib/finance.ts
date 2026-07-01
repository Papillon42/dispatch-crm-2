// Finance Engine — all calculations happen here, never on the frontend

export interface LoadFinancials {
  rate: number;
  loadedMiles: number;
  emptyMiles: number;
  totalMiles: number;
  lumper: number;
  detention: number;
  layover: number;
  tonu: number;
}

export interface CompanySettings {
  companyPercentage: number;  // e.g. 10.0
  seniorCommissionRate: number; // e.g. 1.5
  fixedExpenses: number;
}

// RPM = Gross Revenue / Total Miles
export function calcRpm(rate: number, totalMiles: number): number | null {
  if (!totalMiles || totalMiles === 0) return null;
  return parseFloat((rate / totalMiles).toFixed(4));
}

// Total gross including accessories
export function calcTotalGross(f: LoadFinancials): number {
  return f.rate + f.lumper + f.detention + f.layover + f.tonu;
}

// Dispatch fee per client
export function calcDispatchFee(gross: number, dispatchFeePercent: number): number {
  return parseFloat((gross * (dispatchFeePercent / 100)).toFixed(2));
}

// Company revenue from gross
export function calcCompanyRevenue(gross: number, companyPercentage: number): number {
  return parseFloat((gross * (companyPercentage / 100)).toFixed(2));
}

// Senior dispatcher commission
export function calcSeniorCommission(gross: number, seniorCommissionRate: number): number {
  return parseFloat((gross * (seniorCommissionRate / 100)).toFixed(2));
}

// Net company income
export function calcNetIncome(
  companyRevenue: number,
  seniorCommission: number,
  fixedExpenses: number,
): number {
  return parseFloat((companyRevenue - seniorCommission - fixedExpenses).toFixed(2));
}

// Aging bucket
export function calcAgingBucket(issuedAt: Date, dueAt: Date | null): '0-30' | '31-60' | '61-90' | '90+' {
  const now = new Date();
  const reference = dueAt || issuedAt;
  const days = Math.floor((now.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}

// Formula snapshot — saved with every commission calculation for immutable audit trail
export function buildFormulaSnapshot(settings: CompanySettings, gross: number) {
  return {
    gross,
    companyPercentage: settings.companyPercentage,
    seniorCommissionRate: settings.seniorCommissionRate,
    fixedExpenses: settings.fixedExpenses,
    calculatedAt: new Date().toISOString(),
  };
}

// Cashflow forecast — expected receipts from unpaid invoices
export interface InvoiceForForecast {
  amount: number;
  paidAmount: number;
  dueAt: Date | null;
  status: string;
}

export function calcCashflowForecast(
  invoices: InvoiceForForecast[],
  days: 7 | 14 | 30,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  return invoices
    .filter((inv) => {
      if (inv.status === 'PAID') return false;
      if (!inv.dueAt) return true; // no due date — assume within window
      return new Date(inv.dueAt) <= cutoff;
    })
    .reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);
}
