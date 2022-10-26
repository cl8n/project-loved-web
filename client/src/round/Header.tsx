import { Role } from 'loved-bridge/tables';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import type { IRound, IUser } from '../interfaces';
import Markdown from '../Markdown';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import { UserInline } from '../UserInline';
import PostDate from './PostDate';
import RoundEditor from './RoundEditor';

interface HeaderProps {
  canEdit: boolean;
  nominationsWithWarnings: number;
  onRoundUpdate: (round: Omit<IRound, 'game_modes'> & { news_author: IUser }) => void;
  round: IRound & { news_author: IUser };
  showTodo: boolean;
  setShowTodo: Dispatch<SetStateAction<boolean>>;
}

export default function Header({
  canEdit,
  nominationsWithWarnings,
  onRoundUpdate,
  round,
  showTodo,
  setShowTodo,
}: HeaderProps) {
  const authUser = useOsuAuth().user;
  const [editing, setEditing] = useState(false);

  return (
    <div className='content-block'>
      <h1>
        {round.name} [#{round.id}]
        {canEdit && !editing && (
          <>
            {' — '}
            <button type='button' className='fake-a' onClick={() => setEditing(true)}>
              Edit
            </button>
          </>
        )}
        {!round.done && (
          <span className='round-show-todo-menu'>
            <label htmlFor='showTodo'>
              Show only what needs my attention ({nominationsWithWarnings})
            </label>
            <input
              name='showTodo'
              type='checkbox'
              checked={showTodo}
              onChange={() => setShowTodo((prev) => !prev)}
            />
          </span>
        )}
      </h1>
      {editing ? (
        <RoundEditor close={() => setEditing(false)} onRoundUpdate={onRoundUpdate} round={round} />
      ) : (
        (!showTodo || hasRole(authUser, Role.newsAuthor, undefined, true)) && (
          <>
            <span>
              News post by <UserInline user={round.news_author} />
            </span>
            <br />
            <PostDate round={round} />
            <h3>News intro preview</h3>
            <p>
              <Markdown text={round.news_intro_preview ?? 'No news intro preview'} />
            </p>
            <h3>News intro</h3>
            <p>
              <Markdown text={round.news_intro ?? 'No news intro'} />
            </p>
            <h3>News outro</h3>
            <p>
              <Markdown text={round.news_outro ?? 'No news outro'} />
            </p>
          </>
        )
      )}
    </div>
  );
}
