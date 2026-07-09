export interface PaymentPlanOptions {
  basePrice: number;
  durationMonths: number;
  cycle: 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
}

export interface PaymentPlanResult {
  basePrice: number;
  totalContractValue: number;
  downPayment: number;
  remainingBalance: number;
  paymentCycleAmount: number;
  totalDays: number;
}

/**
 * Calculates the payment plan details based on base price, duration, and cycle.
 */
export function calculatePaymentPlan({
  basePrice,
  durationMonths,
  cycle
}: PaymentPlanOptions): PaymentPlanResult {
  // 1. Total Contract Value = Base Price + 30% Installation/Interest Fee
  const totalContractValue = basePrice * 1.30;
  
  // 2. Down Payment = 40% of Total Contract Value
  const downPayment = totalContractValue * 0.40;
  
  // 3. Remaining Balance
  const remainingBalance = totalContractValue - downPayment;
  
  // 4. Time Calculation
  const totalDays = durationMonths * 30; // Standardized 30-day months
  
  // 5. Payment Cycle Amount
  let paymentCycleAmount = 0;
  
  switch (cycle) {
    case 'daily':
      paymentCycleAmount = remainingBalance / totalDays;
      break;
    case 'weekly':
      paymentCycleAmount = remainingBalance / (totalDays / 7);
      break;
    case 'bi_weekly':
      paymentCycleAmount = remainingBalance / (totalDays / 14);
      break;
    case 'monthly':
      paymentCycleAmount = remainingBalance / durationMonths;
      break;
  }
  
  // Round all money values to 2 decimal places to avoid floating point issues
  return {
    basePrice: Number(basePrice.toFixed(2)),
    totalContractValue: Number(totalContractValue.toFixed(2)),
    downPayment: Number(downPayment.toFixed(2)),
    remainingBalance: Number(remainingBalance.toFixed(2)),
    paymentCycleAmount: Number(paymentCycleAmount.toFixed(2)),
    totalDays
  };
}

/**
 * Determines the next payment due date based on the current date and payment cycle.
 */
export function calculateNextPaymentDate(currentDate: Date, cycle: 'daily' | 'weekly' | 'bi_weekly' | 'monthly'): Date {
  const nextDate = new Date(currentDate);
  
  switch (cycle) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi_weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  
  return nextDate;
}
