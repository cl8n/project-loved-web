import type { PropsWithChildren, ReactNode } from 'react';
import { createRef, useLayoutEffect, useState } from 'react';

const halfEmInPx = 7;

interface TooltipProps {
  content: ReactNode;
}

export default function Tooltip({ children, content }: PropsWithChildren<TooltipProps>) {
  const [position, setPosition] = useState('above');
  const [visible, setVisible] = useState(false);
  const tooltipRef = createRef<HTMLDivElement>();
  const tooltipTriangleRef = createRef<HTMLDivElement>();

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const tooltipTriangle = tooltipTriangleRef.current;

    if (tooltip != null && tooltipTriangle != null) {
      let margin: number | undefined;
      const tooltipClientRect = tooltip.getBoundingClientRect();
      const leftAdjust = halfEmInPx - tooltipClientRect.left;
      const rightAdjust =
        tooltipClientRect.right - (document.documentElement.clientWidth - halfEmInPx);

      if (leftAdjust > 0) {
        margin = leftAdjust;
      } else if (rightAdjust > 0) {
        margin = -rightAdjust;
      }

      if (margin != null) {
        tooltip.style.marginLeft = `${margin}px`;
        tooltipTriangle.style.marginLeft = `${-margin}px`;
      }

      if (tooltipClientRect.top < halfEmInPx) {
        setPosition('below');
      }
    }
  }, [tooltipRef, tooltipTriangleRef, visible]);

  return (
    <div
      className='has-tooltip'
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchEnd={() => setVisible((prev) => !prev)}
    >
      {children}
      {visible && (
        <div className={`tooltip tooltip--${position ?? 'above'}`} ref={tooltipRef}>
          {content}
          <div className='tooltip__hover-area' />
          <div className='tooltip__triangle' ref={tooltipTriangleRef} />
        </div>
      )}
    </div>
  );
}
