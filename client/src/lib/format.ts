/**
 * Shared formatting utilities for the CHI-Platform.
 * Single source of truth — replaces all local formatCurrency/formatNumber implementations.
 */

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "SAR",
): string {
  if (amount === null || amount === undefined) return `${currency} 0`;
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${currency} 0`;
  return `${currency} ${numAmount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return n.toLocaleString();
}

export function formatPercentage(
  n: number | null | undefined,
  decimals = 1,
): string {
  if (n === null || n === undefined) return "0%";
  return `${n.toFixed(decimals)}%`;
}
