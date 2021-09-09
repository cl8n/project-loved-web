import type { ReactChild } from 'react';

type ListInlineRenderProps<T> = {
  array: T[];
  render: (item: T) => ReactChild;
} | {
  array: ReactChild[];
};

type ListInlineProps<T> = ListInlineRenderProps<T> & {
  none?: ReactChild;
  onlyCommas?: boolean;
}

export default function ListInline<T>(props: ListInlineProps<T>) {
  const length = props.array.length;

  if (length === 0)
    return <>{props.none ?? 'None'}</>;

  const separator = props.onlyCommas
    ? () => ', '
    : (indexBefore: number) => {
      if (indexBefore === length - 2)
        return length > 2 ? ', and ' : ' and ';

      return ', ';
    };
  const renderedArray = 'render' in props
    ? props.array.map((item, i) => (
      <>
        {props.render(item)}
        {i < length - 1 && separator(i)}
      </>
    ))
    : props.array.map((item, i) => (
      <>
        {item}
        {i < length - 1 && separator(i)}
      </>
    ))

  return <>{renderedArray}</>;
}
