// Test the corrected rebate calculation system with real data
import { 
  calculateInvoiceRebate, 
  generateRebateReport,
  ServiceRebateData,
  ReferralProviderData 
} from './shared/rebate-calculator';

// Test data matching our database records
const testServices: ServiceRebateData[] = [
  { testId: 20, price: 95000, maxRebateAmount: 3000 }, // CT Angiography (Brain)
  { testId: 16, price: 75000, maxRebateAmount: 2500 }, // CT Brain (Contrast)  
  { testId: 24, price: 45000, maxRebateAmount: 1500 }, // 2D Echocardiogram
  { testId: 3, price: 12000, maxRebateAmount: 400 },   // Chest X-Ray
  { testId: 1, price: 8500, maxRebateAmount: 400 }     // Full Blood Count
];

const serviceNames = {
  20: "CT Angiography (Brain)",
  16: "CT Brain (Contrast)",
  24: "2D Echocardiogram", 
  3: "Chest X-Ray",
  1: "Full Blood Count"
};

// Test all referral providers
const referralProviders: ReferralProviderData[] = [
  { id: 2, name: "Dr. Emeka Okafor Clinic", commissionRate: 7.5 },
  { id: 3, name: "Sunrise Medical Center", commissionRate: 6.0 },
  { id: 1, name: "Lagos General Hospital", commissionRate: 5.0 },
  { id: 4, name: "Federal Medical Centre", commissionRate: 4.5 }
];

console.log("=== REBATE CALCULATION SYSTEM TEST ===\n");

referralProviders.forEach(provider => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TESTING: ${provider.name.toUpperCase()}`);
  console.log(`Commission Rate: ${provider.commissionRate}%`);
  console.log(`${"=".repeat(60)}`);
  
  const result = calculateInvoiceRebate(testServices, provider, serviceNames);
  console.log(generateRebateReport(result));
  
  console.log("VERIFICATION:");
  console.log(`- Services capped at maximum: ${result.summary.cappedServices}/${result.summary.totalServices}`);
  console.log(`- Services at percentage rate: ${result.summary.percentageServices}/${result.summary.totalServices}`);
  console.log(`- Effective commission rate: ${result.summary.effectiveCommissionRate}% (vs ${provider.commissionRate}% base rate)`);
});

console.log("\n" + "=".repeat(80));
console.log("SUMMARY: Per-service maximum rebate amounts ensure accurate commission");
console.log("calculations regardless of referral provider commission rates.");
console.log("=".repeat(80));