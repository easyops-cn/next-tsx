let counter = 0;

export function getUniqueId(prefix: string) {
  return `${prefix}${counter++}`;
}

export function resetUniqueIdCounter() {
  counter = 0;
}
