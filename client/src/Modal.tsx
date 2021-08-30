import { KeyboardEvent, MouseEvent, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = PropsWithChildren<{
  close: () => void;
  open: boolean;
}>;

export function Modal(props: ModalProps) {
  const [hasOpened, setHasOpened] = useState(props.open);
  const modalContainerRef = useRef(document.createElement('div'));

  useEffect(() => {
    const container = modalContainerRef.current;
    document.body.appendChild(container);

    return () => {
      container.remove();
    };
  }, []);

  useEffect(() => {
    if (props.open) {
      if (hasOpened) {
        modalContainerRef.current.querySelector<HTMLDivElement>('.modal')!.focus();
      } else {
        setHasOpened(true);
      }
    }
  }, [hasOpened, props.open]);

  const handleEsc = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape')
      return;

    event.preventDefault();
    props.close();
  };

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('.modal') != null)
      return;

    event.preventDefault();
    props.close();
  };

  if (!hasOpened)
    return null;

  return createPortal(
    <div
      className={'modal-overlay' + (props.open ? ' modal-open' : '')}
      onClick={handleOverlayClick}
    >
      <div
        className='modal content-block'
        onKeyDown={handleEsc}
        tabIndex={0}
      >
        {props.children}
      </div>
    </div>,
    modalContainerRef.current
  );
}
