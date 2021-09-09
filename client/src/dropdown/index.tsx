import type { HTMLAttributes, PropsWithChildren} from 'react';
import { useState } from 'react';

interface DropdownProps {
  align: 'left' | 'right';
}

export default function Dropdown({ align, children, ...props }: PropsWithChildren<DropdownProps> & HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = useState(false);

  return (
    <div
      {...props}
      className='dropdown-container'
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {open ? '▲' : '▼'}
      <div className={`dropdown ${align} ${open ? 'open' : ''}`}>
        {children}
      </div>
    </div>
  );
}
