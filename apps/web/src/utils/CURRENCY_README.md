# Dynamic Currency System

This system allows you to easily change the currency symbol and formatting across the entire application with just one configuration change.

## Quick Start

### To Change Currency

1. **Open** `apps/web/src/config/currency.ts`
2. **Change** the `APP_CURRENCY` value:
   ```typescript
   export const APP_CURRENCY = 'INR'; // Change this line
   ```
3. **Available currencies**: `'USD'`, `'INR'`, `'EUR'`, `'GBP'`, `'JPY'`

### Examples

```typescript
// For Indian Rupees
export const APP_CURRENCY = 'INR'; // Shows: ₹1,234.00

// For US Dollars  
export const APP_CURRENCY = 'USD'; // Shows: $1,234.00

// For Euros
export const APP_CURRENCY = 'EUR'; // Shows: 1.234,00 €

// For British Pounds
export const APP_CURRENCY = 'GBP'; // Shows: £1,234.00

// For Japanese Yen
export const APP_CURRENCY = 'JPY'; // Shows: ¥1,234 (no decimals)
```

## Configuration Options

### Currency Settings (`apps/web/src/config/currency.ts`)

```typescript
export const CURRENCY_SETTINGS = {
  // Show currency code alongside symbol (e.g., "₹ (INR)")
  showCurrencyCode: false,
  
  // Show currency name in tooltips
  showCurrencyName: false,
  
  // Custom formatting for different contexts
  contexts: {
    // Summary cards (e.g., "₹1,234" vs "₹1,234.00")
    summaryCards: {
      decimalPlaces: 0, // Hide decimals in summary cards
    },
    
    // Detailed amounts (item prices, totals)
    detailedAmounts: {
      decimalPlaces: 2, // Always show 2 decimal places
    },
  },
};
```

## Usage in Components

### Basic Usage
```typescript
import { formatCurrency } from '../utils/currency';

// Format any amount
const price = formatCurrency(1234.56); // ₹1,234.56
```

### Context-Specific Formatting
```typescript
import { formatCurrencySummary, formatCurrencyDetailed } from '../utils/currency';

// For summary cards (no decimals)
const totalRevenue = formatCurrencySummary(1234.56); // ₹1,235

// For detailed amounts (with decimals)
const itemPrice = formatCurrencyDetailed(1234.56); // ₹1,234.56
```

### Get Currency Info
```typescript
import { getCurrencySymbol, getCurrencyCode, getCurrencyName } from '../utils/currency';

const symbol = getCurrencySymbol(); // ₹
const code = getCurrencyCode();     // INR
const name = getCurrencyName();    // Indian Rupee
```

## Adding New Currencies

To add a new currency, edit `apps/web/src/utils/currency.ts`:

```typescript
export const CURRENCIES: Record<string, CurrencyConfig> = {
  // ... existing currencies
  
  // Add your new currency
  CAD: {
    symbol: 'C$',
    code: 'CAD',
    name: 'Canadian Dollar',
    position: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
};
```

Then use it in your config:
```typescript
export const APP_CURRENCY = 'CAD';
```

## Features

- ✅ **One-line currency change** - Change `APP_CURRENCY` in config
- ✅ **Automatic formatting** - Handles thousands separators, decimal places
- ✅ **Context-aware** - Different formatting for summaries vs details
- ✅ **Symbol positioning** - Supports before/after symbol placement
- ✅ **Multiple currencies** - Pre-configured for major currencies
- ✅ **Extensible** - Easy to add new currencies
- ✅ **Type-safe** - Full TypeScript support

## Files Modified

- `apps/web/src/utils/currency.ts` - Core currency utilities
- `apps/web/src/config/currency.ts` - Currency configuration
- `apps/web/src/pages/OrderListPage.tsx` - Updated to use dynamic currency

## Migration

All hardcoded `$` symbols have been replaced with `formatCurrency()` calls. The system is backward compatible and will work with existing data.
