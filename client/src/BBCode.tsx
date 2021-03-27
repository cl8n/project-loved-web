import escapeHtml from 'escape-html';
import { DetailedHTMLProps, HTMLAttributes } from 'react';

interface BBCodeProps extends DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> {
  text: string;
}

// TODO: super naive approach and nested tags of same type do not work
export function BBCode(props: BBCodeProps) {
  const html = escapeHtml(props.text)
    .replace(/\[b\]((?:[^[]|(?!\[\/b\])\[)*)\[\/b\]/g, '<b>$1</b>')
    .replace(/\[i\]((?:[^[]|(?!\[\/i\])\[)*)\[\/i\]/g, '<i>$1</i>')
    .replace(/\[s\]((?:[^[]|(?!\[\/s\])\[)*)\[\/s\]/g, '<s>$1</s>')
    .replace(/\[u\]((?:[^[]|(?!\[\/u\])\[)*)\[\/u\]/g, '<span style="text-decoration: underline">$1</span>')
    .replace(/\[url=([^\]]+)\]((?:[^[]|(?!\[\/url\])\[)*)\[\/url\]/g, '<a href="$1">$2</a>')
    .replace(/\[quote(?:=&quot;.+?&quot;)?\]((?:[^[]|(?!\[\/quote\])\[)*)\[\/quote\]/g, '<blockquote>$1</blockquote>');

  return <span {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}
