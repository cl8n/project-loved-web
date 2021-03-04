import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getNominations } from './api';
import { DescriptionState, GameMode, INomination, IRound, MetadataState, ModeratorState } from './interfaces';
import { Never } from './Never';
import { gameModeShortName } from './osu-helpers';
import { useOsuAuth } from './osuAuth';
import { canWriteAs, isCaptainForMode } from './permissions';
import { UserInline } from './UserInline';

export function Picks() {
  const params = useParams() as { round: string; };
  const roundId = parseInt(params.round);
  const [round, setRound] = useState<IRound>();
  const [nominations, setNominations] = useState<INomination[]>();

  useEffect(() => {
    getNominations(roundId)
      .then((response) => {
        setRound(response.body.round);
        setNominations(response.body.nominations);
      });
  }, [roundId]);

  if (round == null || nominations == null)
    return <span>Loading round and nominations...</span>;

  //TODO
  const notDone = true;
  const percent = 60;
  const posted = false;

  return (
    <div className='box'>
      <h2>{round.name} [#{round.id}]</h2>
      <div className='flex-bar'>
        <span>{posted ? 'Posted' : 'Posting'} at {round.news_posted_at}</span>
        {notDone &&
          <span className='progress'>
            TODO 6 / 10 ({percent}%)
          </span>
        }
      </div>
    </div>
  );
}

type NominationProps = {
  nomination: INomination;
  parent_mode?: GameMode;
};

function Nomination(props: NominationProps) {
  const authUser = useOsuAuth().user;

  if (authUser == null)
    return <Never />;

  const descriptionDone = props.nomination.description_state === DescriptionState.reviewed;
  const metadataDone = props.nomination.metadata_state === MetadataState.good;
  const moderationDone = props.nomination.moderator_state === ModeratorState.good;
  const allDone = descriptionDone && metadataDone && moderationDone;

  const canEditDescription = !descriptionDone && isCaptainForMode(authUser, props.nomination.game_mode);
  const canEditMetadata = !metadataDone && canWriteAs(authUser, 'metadata');
  const canEditModeration = !moderationDone && canWriteAs(authUser, 'moderator');

  const displayArtist = props.nomination.overwrite_artist ?? props.nomination.beatmapset.artist;
  const displayTitle = props.nomination.overwrite_title ?? props.nomination.beatmapset.title;

  return (
    <div className='box'>
      <div className='flex-bar'>
        <a href={`https://osu.ppy.sh/beatmapsets/${props.nomination.beatmapset.id}#${gameModeShortName(props.nomination.game_mode)}`}>
          {displayArtist} - {displayTitle}
        </a>
        [#{props.nomination.id}]
        <span>nominated by <UserInline user={props.nomination.nominator} /></span>
      </div>
      <div className='flex-bar'>

      </div>
      {props.parent_mode != null &&
        <div style={{ fontStyle: 'italic' }}>
          Parent nomination in {props.parent_mode}
        </div>
      }
    </div>
  );
}
