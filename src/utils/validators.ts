export const validateRoomId = (value: string): boolean => /^[a-z0-9-]{3,50}$/.test(value);
export const validateCharacterId = (value: string): boolean => /^\d{1,20}$/.test(value);
export const validateUsername = (value: string): boolean => /^[a-z0-9_-]{3,32}$/.test(value);
export const validateDiceFormula = (value: string): boolean => /^(\d{0,3})d(\d{1,4})([+-]\d{1,4})?$/.test(value.toLowerCase().replace(/\s/g, ''));

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}
