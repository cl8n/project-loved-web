import { useEffect, useState } from 'react';

export default function BackToTopButton() {
  const [bodyWidth, setBodyWidth] = useState(0);
  const [documentScroll, setDocumentScroll] = useState(0);

  const updateBodyWidthAndDocumentScroll = () => {
    setBodyWidth(document.body.clientWidth);
    setDocumentScroll(document.documentElement.scrollTop);
  };

  useEffect(() => {
    const listener = (event: Event) => {
      if (event.target instanceof Window) {
        updateBodyWidthAndDocumentScroll();
      }
    };

    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, []);
  useEffect(() => {
    const listener = (event: Event) => {
      if (event.target instanceof Document) {
        updateBodyWidthAndDocumentScroll();
      }
    };

    document.addEventListener('scroll', listener);
    return () => document.removeEventListener('scroll', listener);
  }, []);

  // 1187px is the smallest body width that allows enough room to display the back to top button
  // without overlapping the main content area
  if (bodyWidth < 1187 || documentScroll <= 0) {
    return null;
  }

  return (
    <button type='button' className='back-to-top' onClick={() => window.scrollTo({ top: 0 })}>
      ▲
    </button>
  );
}
