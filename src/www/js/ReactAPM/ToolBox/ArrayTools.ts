

export function moveElement<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const shallowCopy = [...array];
  if (fromIndex === toIndex) {
    return shallowCopy;
  }
  shallowCopy.splice(fromIndex,1);
  toIndex = toIndex < fromIndex ? toIndex : toIndex - 1;
  shallowCopy.splice(toIndex,0,array[fromIndex]);
  return shallowCopy;
}