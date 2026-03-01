export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number; // 2 for most, 0 for JPY/KRW
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
];

export const DEFAULT_CURRENCY = 'USD';

export function getCurrency(code: string): CurrencyConfig {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];
}

/**
 * Format a price in smallest units (cents) to a display string
 * @param amount - Price in smallest currency unit (e.g., cents for USD)
 * @param currencyCode - ISO 4217 currency code
 * @param options - Formatting options
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  options: {
    showFree?: boolean; // Show "Free" instead of $0.00
    compact?: boolean;  // Use compact notation for large numbers
  } = {}
): string {
  const { showFree = true, compact = false } = options;

  if (showFree && amount === 0) {
    return 'Free';
  }

  const currency = getCurrency(currencyCode);
  const value = amount / Math.pow(10, currency.decimals);

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    // Fallback for unsupported currencies
    return `${currency.symbol}${value.toFixed(currency.decimals)}`;
  }
}

/**
 * Format a price range
 */
export function formatCurrencyRange(
  min: number,
  max: number,
  currencyCode: string = DEFAULT_CURRENCY
): string {
  if (min === max) {
    return formatCurrency(min, currencyCode);
  }

  const minStr = formatCurrency(min, currencyCode, { showFree: true });
  const maxStr = formatCurrency(max, currencyCode, { showFree: false });

  return `${minStr} - ${maxStr}`;
}

/**
 * Convert a display value (e.g., "25.99") to smallest unit (cents)
 */
export function toSmallestUnit(displayValue: number, currencyCode: string = DEFAULT_CURRENCY): number {
  const currency = getCurrency(currencyCode);
  return Math.round(displayValue * Math.pow(10, currency.decimals));
}

/**
 * Convert smallest unit (cents) to display value (e.g., 2599 -> 25.99)
 */
export function fromSmallestUnit(amount: number, currencyCode: string = DEFAULT_CURRENCY): number {
  const currency = getCurrency(currencyCode);
  return amount / Math.pow(10, currency.decimals);
}

/**
 * Get the currency symbol for display in input fields
 */
export function getCurrencySymbol(currencyCode: string = DEFAULT_CURRENCY): string {
  return getCurrency(currencyCode).symbol;
}

/**
 * Get placeholder text for price input based on currency decimals
 */
export function getPricePlaceholder(currencyCode: string = DEFAULT_CURRENCY): string {
  const currency = getCurrency(currencyCode);
  if (currency.decimals === 0) {
    return '0';
  }
  return `0.${'0'.repeat(currency.decimals)}`;
}
