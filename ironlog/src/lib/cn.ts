import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** clsx + tailwind-merge, so a caller's classes override a component's defaults. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
