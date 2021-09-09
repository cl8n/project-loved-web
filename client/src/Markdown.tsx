import remarkHtml from 'remark-html';
import remarkParse from 'remark-parse';
import unified from 'unified';
import visit from 'unist-util-visit';

const processor = unified().use(remarkParse).use(osuWikiLinks).use(remarkHtml).freeze();

function osuWikiLinks(): unified.Transformer {
  return (tree) => {
    visit(tree, ['image', 'link'], (node: any) => {
      if (node.url.startsWith('/wiki/')) {
        node.url = 'https://osu.ppy.sh' + node.url;
      }
    });
  };
}

interface MarkdownProps {
  text: string;
}

export default function Markdown({ text }: MarkdownProps) {
  return <span dangerouslySetInnerHTML={{ __html: processor.processSync(text).toString() }} />;
}
