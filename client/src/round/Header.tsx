import { gameModeLongName } from 'loved-bridge/beatmaps/gameMode';
import { Role } from 'loved-bridge/tables';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import type { INominationWithPoll, IRound, IUser, PartialWithId } from '../interfaces';
import Markdown from '../Markdown';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import { UserInline } from '../UserInline';
import PackStatus from './PackStatus';
import PostDate from './PostDate';
import RoundEditor from './RoundEditor';

function getVideoUrl(videoIdOrUrl: string | null): string | null {
  if (videoIdOrUrl == null) {
    return null;
  }

  // MP4 video link
  if (videoIdOrUrl.startsWith('http')) {
    return videoIdOrUrl;
  }

  // YouTube video ID
  return `https://www.youtube.com/watch?v=${videoIdOrUrl}`;
}

interface HeaderProps {
  canEdit: boolean;
  nominations: INominationWithPoll[];
  nominationsWithWarnings: number;
  onRoundUpdate: (round: PartialWithId<IRound & { news_author: IUser }>) => void;
  round: IRound & { news_author: IUser };
  showTodo: boolean;
  setShowTodo: Dispatch<SetStateAction<boolean>>;
}

export default function Header({
  canEdit,
  nominations,
  nominationsWithWarnings,
  onRoundUpdate,
  round,
  showTodo,
  setShowTodo,
}: HeaderProps) {
  const authUser = useOsuAuth().user;
  const [editing, setEditing] = useState(false);

  const introVideoUrl = getVideoUrl(round.video);

  return (
    <div className='content-block'>
      <h1>
        {round.name} [#{round.id}]
        {canEdit && !editing && (
          <>
            {' — '}
            <button type='button' className='fake-a button--edit' onClick={() => setEditing(true)}>
              Edit
            </button>
          </>
        )}
        {!round.done && hasRole(authUser, 'any') && (
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
        (!showTodo || hasRole(authUser, [Role.newsAuthor, Role.packUploader], undefined, true)) && (
          <>
            <span>
              News post by <UserInline user={round.news_author} />
            </span>
            <br />
            <PostDate round={round} />
            <br />
            <PackStatus nominations={nominations} onRoundUpdate={onRoundUpdate} round={round} />
            <h3>Videos</h3>
            <ul>
              <li>
                Intro:{' '}
                {introVideoUrl == null ? <i>None</i> : <a href={introVideoUrl}>{introVideoUrl}</a>}
              </li>
              {Object.values(round.game_modes).map((roundGameMode) => {
                const videoUrl = getVideoUrl(roundGameMode.video);

                return (
                  <li key={roundGameMode.game_mode}>
                    {gameModeLongName(roundGameMode.game_mode)}:{' '}
                    {videoUrl == null ? <i>None</i> : <a href={videoUrl}>{videoUrl}</a>}
                  </li>
                );
              })}
              {!round.done && hasRole(authUser, Role.video) && (
                <a className='video-assets-link' href={`/api/video-assets?roundId=${round.id}`}>
                  Download video assets
                </a>
              )}
            </ul>
            <h3>News intro preview</h3>
            <Markdown text={round.news_intro_preview ?? 'No news intro preview'} />
            <h3>News intro</h3>
            <Markdown text={round.news_intro ?? 'No news intro'} />
            <h3>News outro</h3>
            <Markdown text={round.news_outro ?? 'No news outro'} />
          </>
        )
      )}
    </div>
  );
}
