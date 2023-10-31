import type { TYPE } from '@formatjs/icu-messageformat-parser';
import type { BaseEditor, BaseRange, BaseText } from 'slate';
import type { ReactEditor } from 'slate-react';

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Range: BaseRange & { type: TYPE };
    Text: BaseText & { type: TYPE };
  }
}
