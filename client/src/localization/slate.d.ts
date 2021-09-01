import { TYPE } from '@formatjs/icu-messageformat-parser';
import { BaseEditor, BaseText } from 'slate';
import { ReactEditor } from 'slate-react';

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Text: BaseText & { type: TYPE };
  }
}
