import { APP_CURRENCY, CURRENCY_SETTINGS } from '../config/currency';

// Currency configuration
export interface CurrencyConfig {
  symbol: string;
  code: string;
  name: string;
  position: 'before' | 'after'; // Whether symbol comes before or after the amount
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

// Predefined currency configurations
export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    symbol: '$',
    code: 'USD',
    name: 'US Dollar',
    position: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  INR: {
    symbol: '₹',
    code: 'INR',
    name: 'Indian Rupee',
    position: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  EUR: {
    symbol: '€',
    code: 'EUR',
    name: 'Euro',
    position: 'after',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
  GBP: {
    symbol: '£',
    code: 'GBP',
    name: 'British Pound',
    position: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  JPY: {
    symbol: '¥',
    code: 'JPY',
    name: 'Japanese Yen',
    position: 'before',
    decimalPlaces: 0, // Yen typically doesn't use decimal places
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
};

// Default currency - Imported from config
export const DEFAULT_CURRENCY = APP_CURRENCY;

// Get current currency configuration
export const getCurrentCurrency = (): CurrencyConfig => {
  return CURRENCIES[DEFAULT_CURRENCY];
};

// Format amount with current currency
export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const currency = currencyCode ? CURRENCIES[currencyCode] : getCurrentCurrency();
  
  if (!currency) {
    console.warn(`Currency ${currencyCode || DEFAULT_CURRENCY} not found`);
    return `${amount.toFixed(2)}`;
  }

  // Format the number
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  });

  // Add currency symbol based on position
  if (currency.position === 'before') {
    return `${currency.symbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${currency.symbol}`;
  }
};

// Format amount with custom currency symbol (for backward compatibility)
export const formatAmount = (amount: number, symbol?: string): string => {
  const currency = getCurrentCurrency();
  const symbolToUse = symbol || currency.symbol;
  
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  });

  if (currency.position === 'before') {
    return `${symbolToUse}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${symbolToUse}`;
  }
};

// Get currency symbol
export const getCurrencySymbol = (): string => {
  return getCurrentCurrency().symbol;
};

// Get currency code
export const getCurrencyCode = (): string => {
  return getCurrentCurrency().code;
};

// Get currency name
export const getCurrencyName = (): string => {
  return getCurrentCurrency().name;
};

// Format currency for summary cards (with custom decimal places)
export const formatCurrencySummary = (amount: number): string => {
  const currency = getCurrentCurrency();
  const decimalPlaces = CURRENCY_SETTINGS.contexts.summaryCards.decimalPlaces;
  
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${currency.symbol}`;
  }
};

// Format currency for detailed amounts (with custom decimal places)
export const formatCurrencyDetailed = (amount: number): string => {
  const currency = getCurrentCurrency();
  const decimalPlaces = CURRENCY_SETTINGS.contexts.detailedAmounts.decimalPlaces;
  
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  if (currency.position === 'before') {
    return `${currency.symbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${currency.symbol}`;
  }
};

// Format currency with code (e.g., "₹ (INR)")
export const formatCurrencyWithCode = (amount: number): string => {
  const formatted = formatCurrency(amount);
  const currency = getCurrentCurrency();
  
  if (CURRENCY_SETTINGS.showCurrencyCode) {
    return `${formatted} (${currency.code})`;
  }
  
  return formatted;
};
