import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import type { KeyboardEvent, TextareaHTMLAttributes} from 'react';
import { useMemo } from 'react';
import type { MessageFormatElement } from 'react-intl';
import type { Element, NodeEntry, Path, Range} from 'slate';
import { createEditor, Text } from 'slate';
import type { RenderLeafProps} from 'slate-react';
import { Editable, Slate, withReact } from 'slate-react';

function addRanges(ranges: Range[], path: Path, elements: MessageFormatElement[]): void {
  for (const element of elements) {
    ranges.push({
      anchor: { path, offset: element.location!.start.offset },
      focus: { path, offset: element.location!.end.offset },
      type: element.type,
    } as Range);

    if (element.type === TYPE.select || element.type === TYPE.plural) {
      for (const option of Object.values(element.options)) {
        addRanges(ranges, path, option.value);
      }
    }

    if (element.type === TYPE.tag) {
      addRanges(ranges, path, element.children);
    }
  }
}

function decorate([node, path]: NodeEntry): Range[] {
  if (!Text.isText(node)) {
    return [];
  }

  const ranges: Range[] = [];

  try {
    addRanges(ranges, path, parse(node.text, { captureLocation: true }));
  } catch {}

  return ranges;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
}

function renderLeaf({ attributes, children, leaf }: RenderLeafProps): JSX.Element {
  let className: string | undefined;

  switch (leaf.type) {
    case TYPE.argument:
      className = 'variable';
      break;
    case TYPE.number:
    case TYPE.date:
    case TYPE.time:
    case TYPE.select:
    case TYPE.plural:
      className = 'variable-format';
      break;
    case TYPE.pound:
      className = 'pound';
      break;
    case TYPE.tag:
      className = 'tag';
      break;
  }

  return (
    <span
      {...attributes}
      className={`messageformat${className == null ? '' : ` messageformat-${className}`}`}
    >
      {children}
    </span>
  );
}

type MessageFormatEditorProps = {
  readOnly?: false;
  setValue: (value: string) => void;
  value: string;
} | {
  readOnly: true;
  setValue?: undefined;
  value: string;
};

export default function MessageFormatEditor({ className, readOnly, setValue, value, ...props }: MessageFormatEditorProps & TextareaHTMLAttributes<HTMLDivElement>) {
  const editor = useMemo(() => withReact(createEditor()), []);

  return (
    <Slate
      editor={editor}
      onChange={(value) => {
        if (!readOnly)
          setValue!(((value[0] as Element).children[0] as Text).text);
      }}
      value={[{ children: [{ text: value, type: 0 }] }]}
    >
      <Editable
        {...props}
        className={`slate-editor${readOnly ? '' : ' editable'} ${className ?? ''}`}
        decorate={decorate}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        renderLeaf={renderLeaf}
      />
    </Slate>
  );
}
