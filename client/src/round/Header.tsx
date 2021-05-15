import { useState } from 'react';
import { IRound, PartialWithId } from '../interfaces';
import Markdown from '../Markdown';
import PostDate from './PostDate';
import RoundEditor from './RoundEditor';

type HeaderProps = {
  canEdit: boolean;
  onRoundUpdate: (round: PartialWithId<IRound>) => void;
  round: IRound;
};

export default function Header({ canEdit, onRoundUpdate, round }: HeaderProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className='content-block'>
      <h1>
        {round.name} [#{round.id}]
        {canEdit && !editing &&
          <>
            {' — '}
            <button
              type='button'
              className='fake-a'
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          </>
        }
      </h1>
      {editing
        ? (
          <RoundEditor
            close={() => setEditing(false)}
            onRoundUpdate={onRoundUpdate}
            round={round}
          />
        ) : (
          <>
            <PostDate round={round} />
            <h3>News intro preview</h3>
            <p><Markdown text={round.news_intro_preview ?? 'No news intro preview'} /></p>
            <h3>News intro</h3>
            <p><Markdown text={round.news_intro ?? 'No news intro'} /></p>
            <h3>News outro</h3>
            <p><Markdown text={round.news_outro ?? 'No news outro'} /></p>
          </>
        )
      }
    </div>
  );
}
