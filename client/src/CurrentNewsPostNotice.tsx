import { getCurrentNewsPost, useApi } from './api';

export default function CurrentNewsPostNotice() {
  const [newsPost] = useApi(getCurrentNewsPost);

  if (newsPost == null) {
    return null;
  }

  return (
    <a className='news-post-notice' href={newsPost.url}>
      <span>
        <b>Click here</b> to vote in the round of
      </span>
      <span>{newsPost.roundName}</span>
    </a>
  );
}
