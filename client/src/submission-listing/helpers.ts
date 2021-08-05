export function displayRange(values: number[], displayFn?: (value: number) => string) {
  const max = Math.max(...values);
  const min = Math.min(...values);

  if (displayFn == null)
    displayFn = (value) => value.toString(10);

  return max === min
    ? displayFn(max)
    : `${displayFn(min)} - ${displayFn(max)}`;
}

export const reviewScoreTexts = [
  'strong rejection',
  'rejection',
  'light rejection',
  'no preference',
  'light support',
  'support',
  'strong support',
] as const;
export const reviewScoreClasses = reviewScoreTexts.map((score) => score.replace(' ', '-'));
export const selectableReviewScores = [3, 2, 1, -1, -2, -3];
