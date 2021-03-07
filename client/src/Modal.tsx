import { KeyboardEvent, MouseEvent, PropsWithChildren, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = PropsWithChildren<{
  close: () => void;
  open: boolean;
}>;

export function Modal(props: ModalProps) {
  const modalContainerRef = useRef<HTMLDivElement>();

  useEffect(() => {
    const container =
      modalContainerRef.current =
      document.createElement('div');
    document.body.appendChild(container);

    return () => {
      container.remove();
    };
  }, []);

  const handleEsc = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape')
      return;

    event.preventDefault();
    props.close();
  };

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    props.close();
  };

  if (modalContainerRef.current == null)
    return null;

  return createPortal(
    <div
      className={'modal-overlay' + (props.open ? ' modal-open' : '')}
      onClick={handleOverlayClick}
    >
      <div
        className='modal'
        onKeyDown={handleEsc}
      >
        {props.children}
      </div>
    </div>,
    modalContainerRef.current
  );
}
