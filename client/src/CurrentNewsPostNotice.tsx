import type { ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { getCurrentNewsPost, useApi } from './api';

export default function CurrentNewsPostNotice() {
  const [newsPost] = useApi(getCurrentNewsPost);

  if (newsPost == null) {
    return null;
  }

  return (
    <a className='news-post-notice' href={newsPost.url}>
      <FormattedMessage
        defaultMessage='<b>Click here</b> to vote in the round of'
        description='[Submissions] Banner introducing the news post of ongoing voting'
        tagName='span'
        values={{ b: (c: ReactNode) => <b>{c}</b> }}
      />
      <span>{newsPost.roundName}</span>
    </a>
  );
}
