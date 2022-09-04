import type { PropsWithChildren } from 'react';
import Tooltip from './Tooltip';

export default function Help({ children }: PropsWithChildren<unknown>) {
  return (
    <Tooltip content={children}>
      <span className='fake-a help'>[?]</span>
    </Tooltip>
  );
}
