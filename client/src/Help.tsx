import { PropsWithChildren } from 'react';
import Tooltip from './Tooltip';

export default function Help({ children }: PropsWithChildren<{}>) {
  return (
    <Tooltip content={children}>
      <span className='fake-a help'>[?]</span>
    </Tooltip>
  );
}
