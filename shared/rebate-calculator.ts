// Comprehensive rebate calculation utility for referral provider commissions
// This ensures consistent rebate calculations across the entire system

export interface ServiceRebateData {
  testId: number;
  price: number;
  maxRebateAmount: number;
}

export interface ReferralProviderData {
  id: number;
  name: string;
  commissionRate: number;
}

export interface RebateCalculationResult {
  serviceId: number;
  serviceName?: string;
  servicePrice: number;
  commissionRate: number;
  percentageRebate: number;
  maxRebateAmount: number;
  appliedRebate: number;
  rebateType: 'PERCENTAGE' | 'CAPPED';
}

export interface InvoiceRebateResult {
  referralProvider: string;
  totalRebate: number;
  serviceBreakdown: RebateCalculationResult[];
  summary: {
    totalServices: number;
    cappedServices: number;
    percentageServices: number;
    totalInvoiceAmount: number;
    effectiveCommissionRate: number;
  };
}

/**
 * Calculate rebate for a single service
 */
export function calculateServiceRebate(
  serviceData: ServiceRebateData,
  commissionRate: number,
  serviceName?: string
): RebateCalculationResult {
  const { testId, price, maxRebateAmount } = serviceData;
  
  // Calculate percentage-based rebate
  const percentageRebate = (price * commissionRate) / 100;
  
  // Apply the lower of percentage rebate or service maximum
  const appliedRebate = Math.min(percentageRebate, maxRebateAmount);
  
  return {
    serviceId: testId,
    serviceName,
    servicePrice: price,
    commissionRate,
    percentageRebate: Math.round(percentageRebate * 100) / 100,
    maxRebateAmount,
    appliedRebate: Math.round(appliedRebate * 100) / 100,
    rebateType: percentageRebate > maxRebateAmount ? 'CAPPED' : 'PERCENTAGE'
  };
}

/**
 * Calculate total rebate for an invoice with multiple services
 */
export function calculateInvoiceRebate(
  services: ServiceRebateData[],
  referralProvider: ReferralProviderData,
  serviceNames?: { [key: number]: string }
): InvoiceRebateResult {
  const serviceBreakdown: RebateCalculationResult[] = [];
  let totalRebate = 0;
  let cappedServices = 0;
  let percentageServices = 0;
  
  services.forEach(service => {
    const serviceName = serviceNames?.[service.testId];
    const result = calculateServiceRebate(service, referralProvider.commissionRate, serviceName);
    
    serviceBreakdown.push(result);
    totalRebate += result.appliedRebate;
    
    if (result.rebateType === 'CAPPED') {
      cappedServices++;
    } else {
      percentageServices++;
    }
  });
  
  const totalInvoiceAmount = services.reduce((sum, service) => sum + service.price, 0);
  const effectiveCommissionRate = totalInvoiceAmount > 0 ? (totalRebate / totalInvoiceAmount) * 100 : 0;
  
  return {
    referralProvider: referralProvider.name,
    totalRebate: Math.round(totalRebate * 100) / 100,
    serviceBreakdown,
    summary: {
      totalServices: services.length,
      cappedServices,
      percentageServices,
      totalInvoiceAmount,
      effectiveCommissionRate: Math.round(effectiveCommissionRate * 100) / 100
    }
  };
}

/**
 * Generate rebate report for commission tracking
 */
export function generateRebateReport(invoiceResult: InvoiceRebateResult): string {
  const { referralProvider, totalRebate, serviceBreakdown, summary } = invoiceResult;
  
  let report = `REBATE CALCULATION REPORT\n`;
  report += `Referral Provider: ${referralProvider}\n`;
  report += `Total Invoice Amount: ₦${summary.totalInvoiceAmount.toLocaleString()}\n`;
  report += `Total Rebate Due: ₦${totalRebate.toLocaleString()}\n`;
  report += `Effective Commission Rate: ${summary.effectiveCommissionRate}%\n\n`;
  
  report += `SERVICE BREAKDOWN:\n`;
  serviceBreakdown.forEach((service, index) => {
    report += `${index + 1}. ${service.serviceName || `Service ${service.serviceId}`}\n`;
    report += `   Price: ₦${service.servicePrice.toLocaleString()}\n`;
    report += `   Commission Rate: ${service.commissionRate}%\n`;
    report += `   Calculated Rebate: ₦${service.percentageRebate.toLocaleString()}\n`;
    report += `   Max Rebate Limit: ₦${service.maxRebateAmount.toLocaleString()}\n`;
    report += `   Applied Rebate: ₦${service.appliedRebate.toLocaleString()} (${service.rebateType})\n\n`;
  });
  
  report += `SUMMARY:\n`;
  report += `Total Services: ${summary.totalServices}\n`;
  report += `Services at Percentage Rate: ${summary.percentageServices}\n`;
  report += `Services Capped at Maximum: ${summary.cappedServices}\n`;
  
  return report;
}

/**
 * Validate rebate calculation inputs
 */
export function validateRebateInputs(
  services: ServiceRebateData[],
  referralProvider: ReferralProviderData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!services || services.length === 0) {
    errors.push('No services provided for rebate calculation');
  }
  
  if (!referralProvider) {
    errors.push('Referral provider data is required');
  }
  
  if (referralProvider && (referralProvider.commissionRate < 0 || referralProvider.commissionRate > 100)) {
    errors.push('Commission rate must be between 0 and 100');
  }
  
  services.forEach((service, index) => {
    if (service.price < 0) {
      errors.push(`Service ${index + 1}: Price cannot be negative`);
    }
    if (service.maxRebateAmount < 0) {
      errors.push(`Service ${index + 1}: Maximum rebate amount cannot be negative`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}