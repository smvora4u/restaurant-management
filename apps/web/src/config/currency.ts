// Currency Configuration
// Change this file to switch currencies globally across the application

// Available currencies: 'USD', 'INR', 'EUR', 'GBP', 'JPY'
export const APP_CURRENCY = 'INR'; // Change this to your desired currency

// Currency display settings
export const CURRENCY_SETTINGS = {
  // Whether to show currency code alongside symbol (e.g., "₹ (INR)")
  showCurrencyCode: false,
  
  // Whether to show currency name in tooltips or labels
  showCurrencyName: false,
  
  // Custom formatting for specific contexts
  contexts: {
    // Format for summary cards (e.g., "₹1,234" vs "₹1,234.00")
    summaryCards: {
      decimalPlaces: 0, // Set to 0 to hide decimals in summary cards
    },
    
    // Format for detailed amounts (e.g., item prices, totals)
    detailedAmounts: {
      decimalPlaces: 2, // Always show 2 decimal places for detailed amounts
    },
  },
};
