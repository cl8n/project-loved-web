import type { PropsWithChildren, ReactNode } from 'react';
import { createRef, useLayoutEffect, useState } from 'react';

interface TooltipProps {
  content: ReactNode;
}

export default function Tooltip({ children, content }: PropsWithChildren<TooltipProps>) {
  const [visible, setVisible] = useState(false);
  const tooltipRef = createRef<HTMLDivElement>();
  const tooltipContainerRef = createRef<HTMLDivElement>();

  useLayoutEffect(() => {
    // position the tooltip to the tooltip container
    const tooltip = tooltipRef.current;
    const tooltipContainer = tooltipContainerRef.current;

    if (tooltip && tooltipContainer) {
      const rect = tooltipContainer.getBoundingClientRect();

      tooltip.style.bottom = `${rect.height}px`;
      tooltip.style.left = `${rect.width / 2}px`;
    }
  }, [tooltipContainerRef, tooltipRef, visible]);

  return (
    <div
      className='tooltip-container'
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchEnd={() => setVisible((prev) => !prev)}
      ref={tooltipContainerRef}
    >
      {children}
      <div className='tooltip'>
        {visible && (
          <div className='tooltip-content' ref={tooltipRef}>
            {content}
            <div className='tooltip-hover-area' />
            <div className='tooltip-triangle' />
          </div>
        )}
      </div>
    </div>
  );
}
