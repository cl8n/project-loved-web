import type { TYPE } from '@formatjs/icu-messageformat-parser';
import type { BaseEditor, BaseText } from 'slate';
import type { ReactEditor } from 'slate-react';

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Text: BaseText & { type: TYPE };
  }
}
