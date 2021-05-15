import remarkHtml from 'remark-html';
import remarkParse from 'remark-parse';
import unified from 'unified';

const processor = unified()
  .use(remarkParse)
  .use(remarkHtml)
  .freeze();

interface MarkdownProps {
  text: string;
}

export default function Markdown({ text }: MarkdownProps) {
  return <span dangerouslySetInnerHTML={{ __html: processor.processSync(text).toString() }} />;
}
