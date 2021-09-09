interface SortButtonProps {
  ascending: boolean;
  toggle: () => void;
}

export default function SortButton({ ascending, toggle }: SortButtonProps) {
  return (
    <button type='button' className='fake-a no-decoration' onClick={toggle}>
      {ascending ? '▲' : '▼'}
    </button>
  );
}
