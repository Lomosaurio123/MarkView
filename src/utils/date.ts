import { format, parseISO, isValid, differenceInDays, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date | string, pattern = "PPP", locale = "en"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Invalid date";
  return format(d, pattern, { locale: locale === "es" ? es : undefined });
}

export function formatDateTime(date: Date | string, locale = "en"): string {
  return formatDate(date, "PPP p", locale);
}

export function formatRelativeTime(date: Date | string, locale = "en"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Invalid date";
  
  const now = new Date();
  const diffDays = differenceInDays(now, d);
  const diffHours = differenceInHours(now, d);
  
  if (diffDays === 0) {
    if (diffHours === 0) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  }
  
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getISODate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getISODateTime(): string {
  return new Date().toISOString();
}

export function parseDateSafe(date: string): Date | null {
  const d = parseISO(date);
  return isValid(d) ? d : null;
}

export function isOverdue(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isValid(d) && d < new Date();
}