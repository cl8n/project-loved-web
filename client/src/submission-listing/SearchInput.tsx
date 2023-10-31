import type { Dispatch, KeyboardEvent, TextareaHTMLAttributes } from 'react';
import type { BaseRange, Element, NodeEntry } from 'slate';
import { Text } from 'slate';
import type { RenderLeafProps } from 'slate-react';
import ControlledSlate from '../localization/ControlledSlate';

interface NumberComparison {
  lhs:
    | 'beatmap_count'
    | 'bpm'
    | 'favorites'
    | 'length'
    | 'plays'
    | 'priority'
    | 'rating'
    | 'score'
    | 'submitted_at'
    | 'updated_at';
  operator: '=' | '!=' | '<' | '<=' | '>' | '>=';
  rhs: number;
}

interface StringComparison {
  lhs: 'artist' | 'creator_name' | 'title';
  operator: '=' | '!=';
  rhs: string;
}

export type Comparison = NumberComparison | StringComparison;

export interface Search {
  comparisons: Comparison[];
  rawSearch: string;
  textSearch?: string;
}

interface SearchNode {
  length: number;
  start: number;
  type: 'operand-1' | 'operand-2' | 'operator' | 'quote';
}

function parseSearch(rawSearch: string): [Search, SearchNode[]] {
  const search: Search = { comparisons: [], rawSearch };
  const searchNodes: SearchNode[] = [];
  let textSearch = '';
  let textSearchLastMatchEnd = 0;

  const comparisonSchema: Record<string, [Comparison['lhs'], 'number' | 'string']> = {
    artist: ['artist', 'string'],
    bpm: ['bpm', 'number'],
    creator: ['creator_name', 'string'],
    difficulties: ['beatmap_count', 'number'],
    diffs: ['beatmap_count', 'number'],
    favorites: ['favorites', 'number'],
    favs: ['favorites', 'number'],
    length: ['length', 'number'],
    mapper: ['creator_name', 'string'],
    playcount: ['plays', 'number'],
    plays: ['plays', 'number'],
    priority: ['priority', 'number'],
    rating: ['rating', 'number'],
    score: ['score', 'number'],
    submitted: ['submitted_at', 'number'],
    title: ['title', 'string'],
    updated: ['updated_at', 'number'],
    year: ['submitted_at', 'number'],
  };
  const operatorAliases: Record<string, string> = {
    '==': '=',
    ':': '=',
    '!:': '!=',
    '<>': '!=',
  };

  for (const match of rawSearch.matchAll(
    /(^|\s)([a-z]+)(==?|:|!=|!:|<>|<=?|>=?)(?:"([^"]+)"|'([^']+)'|(\S+))/gi,
  )) {
    match[2] = match[2].toLowerCase();

    if (!(match[2] in comparisonSchema)) {
      continue;
    }

    const [searchKey, searchType] = comparisonSchema[match[2]];
    const operator = operatorAliases[match[3]] ?? match[3];
    let rhs: string | number = (match[6] ?? match[5] ?? match[4]).toLowerCase();

    if (searchType === 'string') {
      if (!['=', '!='].includes(operator)) {
        continue;
      }
    }

    if (searchType === 'number') {
      if (!/^\d+\.?\d*$/.test(rhs)) {
        continue;
      }

      rhs = parseFloat(rhs);
    }

    // All relevant type checking is done above
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    search.comparisons.push({ lhs: searchKey, operator, rhs } as any);

    const startIndex = match.index ?? 0;
    const operand1Node: SearchNode = {
      length: match[2].length,
      start: startIndex + match[1].length,
      type: 'operand-1',
    };
    const operatorNode: SearchNode = {
      length: match[3].length,
      start: operand1Node.start + operand1Node.length,
      type: 'operator',
    };
    const operand2Node: SearchNode = {
      length: (match[6] ?? match[5] ?? match[4]).length,
      start: operatorNode.start + operatorNode.length + (match[6] == null ? 1 : 0),
      type: 'operand-2',
    };
    searchNodes.push(operand1Node, operatorNode, operand2Node);

    if (match[6] == null) {
      searchNodes.push(
        {
          length: 1,
          start: operand2Node.start - 1,
          type: 'quote',
        },
        {
          length: 1,
          start: operand2Node.start + operand2Node.length,
          type: 'quote',
        },
      );
    }

    textSearch += rawSearch.slice(textSearchLastMatchEnd, startIndex);
    textSearchLastMatchEnd = startIndex + match[0].length;
  }

  textSearch = (textSearch + rawSearch.slice(textSearchLastMatchEnd)).trim();

  if (textSearch.length > 0) {
    search.textSearch = textSearch.toLowerCase();
  }

  return [search, searchNodes];
}

// TODO return type is kind of dumb because Range would be affected by slate.d.ts
function decorate([node, path]: NodeEntry): (BaseRange & Pick<SearchNode, 'type'>)[] {
  if (!Text.isText(node)) {
    return [];
  }

  return parseSearch(node.text)[1].map((searchNode) => ({
    anchor: { path, offset: searchNode.start },
    focus: { path, offset: searchNode.start + searchNode.length },
    type: searchNode.type,
  }));
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
}

function renderLeaf({ attributes, children, leaf }: RenderLeafProps): JSX.Element {
  let className: string | undefined;

  // TODO type is kind of dumb because Text would be affected by slate.d.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (['operand-1', 'operand-2', 'operator', 'quote'].includes(leaf.type as any)) {
    className = `search-input search-input--${leaf.type}`;
  }

  return (
    <span {...attributes} className={className}>
      {children}
    </span>
  );
}

interface SearchInputProps {
  search: Search;
  setSearch: Dispatch<Search>;
}

export default function SearchInput({
  search,
  setSearch,
  ...props
}: SearchInputProps & TextareaHTMLAttributes<HTMLDivElement>) {
  return (
    <ControlledSlate
      {...props}
      className='slate-editor editable flex-grow'
      // TODO type is kind of dumb because Range would be affected by slate.d.ts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decorate={decorate as any}
      descendants={[{ children: [{ text: search.rawSearch, type: 0 }] }]}
      onKeyDown={onKeyDown}
      renderLeaf={renderLeaf}
      setDescendants={(value) => {
        const rawSearch = ((value[0] as Element).children[0] as Text).text;

        if (rawSearch.trim() !== search.rawSearch.trim()) {
          setSearch(parseSearch(rawSearch)[0]);
        }
      }}
    />
  );
}
