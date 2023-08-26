import type { Dispatch } from 'react';
import { useMemo } from 'react';
import type { Descendant } from 'slate';
import { createEditor, Node, Path } from 'slate';
import { Editable, Slate, withReact } from 'slate-react';
import { useEffectExceptOnMount } from '../react-helpers';

function* zip<T1, TReturn1, T2, TReturn2>(
  a: Generator<T1, TReturn1>,
  b: Generator<T2, TReturn2>,
): Generator<[T1 | TReturn1, T2 | TReturn2], void, undefined> {
  while (true) {
    const aNext = a.next();
    const bNext = b.next();

    if (aNext.done && bNext.done) {
      return;
    }

    yield [aNext.value, bNext.value];
  }
}

function descendantsAreEqual(a: Node, b: Node): boolean {
  for (const [aDescendant, bDescendant] of zip(Node.descendants(a), Node.descendants(b))) {
    if (
      aDescendant == null ||
      bDescendant == null ||
      !Node.matches(aDescendant[0], bDescendant[0]) ||
      !Node.matches(bDescendant[0], aDescendant[0]) ||
      !Path.equals(aDescendant[1], bDescendant[1])
    ) {
      return false;
    }
  }

  return true;
}

// This type isn't exported from slate-react
type EditableProps = Parameters<typeof Editable>[0];

interface ControlledSlateProps {
  setDescendants?: Dispatch<Descendant[]>;
  descendants: Descendant[];
}

export default function ControlledSlate({
  setDescendants,
  descendants,
  ...props
}: ControlledSlateProps & EditableProps) {
  const editor = useMemo(() => withReact(createEditor()), []);

  // TODO test
  useEffectExceptOnMount(() => {
    if (descendantsAreEqual(editor, { children: descendants })) {
      return;
    }

    editor.removeNodes();
    editor.insertNodes(descendants);
    editor.select(editor.end([]));
  }, [descendants, editor]);

  return (
    <Slate editor={editor} initialValue={descendants} onChange={setDescendants}>
      <Editable {...props} readOnly={props.readOnly || setDescendants == null} />
    </Slate>
  );
}
