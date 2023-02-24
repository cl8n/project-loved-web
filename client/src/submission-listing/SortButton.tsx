interface SortButtonProps {
  ascending: boolean;
  hidden: boolean;
  toggle: () => void;
}

export default function SortButton({ ascending, hidden, toggle }: SortButtonProps) {
  return (
    <button
      type='button'
      className='fake-a no-decoration'
      onClick={toggle}
      style={hidden ? { visibility: 'hidden' } : undefined}
    >
      {ascending ? '▲' : '▼'}
    </button>
  );
}
