export function kebabCase(str: string): string {
  return str
    .replace(/\W/g, ' ') // Replace non-word characters with space
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Handle camelCase
    .trim()
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .toLowerCase();
}
