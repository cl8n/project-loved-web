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
      tooltip.style.transform = `translateX(-${tooltipContainer.offsetWidth / 2}px)`;
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
      <div className='tooltip' ref={tooltipRef}>
        {visible && (
          <div className='tooltip-content'>
            {content}
            <div className='tooltip-hover-area' />
            <div className='tooltip-triangle' />
          </div>
        )}
      </div>
    </div>
  );
}
