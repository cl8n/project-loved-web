type BoolViewProps = {
  noColor?: boolean;
  value: boolean;
};

export function BoolView({ noColor, value }: BoolViewProps) {
  let className: string | undefined;

  if (!noColor)
    className = value ? 'success' : 'error';

  return (
    <span className={className}>
      {value ? 'Yes' : 'No'}
    </span>
  );
}
