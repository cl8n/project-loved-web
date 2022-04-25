import { FormattedMessage } from 'react-intl';
import { getCurrentNewsPost, useApi } from './api';

export default function CurrentNewsPostNotice() {
  const [newsPost] = useApi(getCurrentNewsPost);

  if (newsPost == null) {
    return null;
  }

  return (
    <div className='news-post-notice'>
      <a href={newsPost.url}>
        <FormattedMessage
          defaultMessage='Click here to vote in the round of {roundName}!'
          description='[Submissions] Banner linked to news post of ongoing voting'
          values={{ roundName: newsPost.roundName }}
        />
      </a>
    </div>
  );
}
