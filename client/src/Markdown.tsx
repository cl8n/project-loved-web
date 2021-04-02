import escapeHtml from 'escape-html';

interface MarkdownProps {
  text: string;
}

// TODO
export default function Markdown({ text }: MarkdownProps) {
  return <span style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: escapeHtml(text) }} />;
}
