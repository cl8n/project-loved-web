import type { PropsWithChildren } from 'react';
import Tooltip from './Tooltip';

type Props = PropsWithChildren<{
  warning?: boolean;
}>;

export default function Help({ children, warning }: Props) {
  return (
    <Tooltip content={children}>
      <span className={`fake-a help${warning ? ' help--warning' : ''}`}>
        {warning ? '[!]' : '[?]'}
      </span>
    </Tooltip>
  );
}
