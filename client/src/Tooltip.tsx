import type { PropsWithChildren, ReactNode} from 'react';
import { useState } from 'react';

interface TooltipProps {
  content: ReactNode;
}

export default function Tooltip({ children, content }: PropsWithChildren<TooltipProps>) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className='tooltip'
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchEnd={() => setVisible((prev) => !prev)}
    >
      {children}
      {visible && (
        <div className='tooltip-content'>
          {content}
          <div className='tooltip-triangle' />
        </div>
      )}
    </div>
  );
}
