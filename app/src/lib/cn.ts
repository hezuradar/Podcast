import { clsx, type ClassValue } from "clsx";

/** Joins conditional class names. Tokens only: never pass raw hex or pixel values. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
