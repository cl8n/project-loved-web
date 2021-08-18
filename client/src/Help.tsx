import Tooltip from './Tooltip';

interface HelpProps {
  text: string;
}

export default function Help({ text }: HelpProps) {
  return (
    <Tooltip content={text}>
      <span className='fake-a help'>[?]</span>
    </Tooltip>
  );
}
