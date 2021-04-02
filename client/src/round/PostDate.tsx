import { IRound } from '../interfaces';

type PostDateProps = {
  round: IRound;
};

export default function PostDate({ round }: PostDateProps) {
  // TODO: should have real logic
  const posted = round.news_posted_at != null && new Date() >= round.news_posted_at;

  return (
    <span>
      {round.news_posted_at == null
        ? 'No post date set'
        : `${posted ? 'Posted' : 'Posting'} on ${round.news_posted_at/* TODO .toLocaleDateString()*/}`
      }
    </span>
  );
}
