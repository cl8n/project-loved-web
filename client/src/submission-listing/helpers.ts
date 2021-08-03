export function displayRange(values: number[], displayFn?: (value: number) => string) {
  const max = Math.max(...values);
  const min = Math.min(...values);

  if (displayFn == null)
    displayFn = (value) => value.toString(10);

  return max === min
    ? displayFn(max)
    : `${displayFn(min)} - ${displayFn(max)}`;
}
