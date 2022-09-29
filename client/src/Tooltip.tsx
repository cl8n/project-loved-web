import type { PropsWithChildren, ReactNode } from 'react';
import { createRef, useLayoutEffect, useState } from 'react';

interface TooltipProps {
  content: ReactNode;
}

export default function Tooltip({ children, content }: PropsWithChildren<TooltipProps>) {
  const [visible, setVisible] = useState(false);
  const tooltipOuterRef = createRef<HTMLDivElement>();
  const tooltipRef = createRef<HTMLDivElement>();

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const tooltipOuter = tooltipOuterRef.current;

    if (tooltip && tooltipOuter) {
      const rect = tooltipOuter.getBoundingClientRect();

      tooltip.style.bottom = `${rect.height}px`;
      tooltip.style.left = `${rect.width / 2}px`;
    }
  }, [tooltipOuterRef, tooltipRef, visible]);

  return (
    <div
      className='has-tooltip'
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchEnd={() => setVisible((prev) => !prev)}
      ref={tooltipOuterRef}
    >
      {children}
      {visible && (
        <div className='tooltip-container'>
          <div className='tooltip' ref={tooltipRef}>
            {content}
            <div className='tooltip__hover-area' />
            <div className='tooltip__triangle' />
          </div>
        </div>
      )}
    </div>
  );
}
