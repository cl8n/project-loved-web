type HelpProps = {
  text: string;
};

export default function Help({ text }: HelpProps) {
  return (
    <span
      className='fake-a help'
      title={text}
    >
      [?]
    </span>
  );
}
