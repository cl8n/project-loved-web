import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeShortName } from 'loved-bridge/beatmaps/gameMode';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addNomination, alertApiErrorMessage, searchBeatmapsets } from '../api';
import { beatmapText } from '../BeatmapInline';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import Help from '../Help';
import type { IBeatmapset, INomination } from '../interfaces';
import { useEffectExceptOnMount } from '../react-helpers';

interface AddNominationProps {
  gameMode: GameMode;
  onNominationAdd: (nomination: INomination) => void;
  roundId: number;
}

export default function AddNomination({ gameMode, onNominationAdd, roundId }: AddNominationProps) {
  const [busy, setBusy] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchRequest, setSearchRequest] = useState<ReturnType<typeof searchBeatmapsets>>();
  const [searchResults, setSearchResults] = useState<IBeatmapset[]>();
  const [selectedBeatmapset, setSelectedBeatmapset] = useState<IBeatmapset>();

  useEffectExceptOnMount(() => {
    if (searchInputRef.current != null && selectedBeatmapset == null) {
      searchInputRef.current.focus();
    }
  }, [selectedBeatmapset]);

  const onSearchInput = (event: FormEvent<HTMLInputElement>) => {
    if (searchRequest != null) {
      searchRequest.abort();
    }

    const query = event.currentTarget.value;

    if (query.length === 0) {
      setSearchRequest(undefined);
      setSearchResults(undefined);
      return;
    }

    const request = searchBeatmapsets(query);

    request
      .then((response) => setSearchResults(response.body))
      .catch((error) => error.code !== 'ABORTED' && alertApiErrorMessage(error));

    setSearchRequest(request);
  };
  const onSubmit: FormSubmitHandler = (form, then) => {
    if (selectedBeatmapset == null) {
      window.alert('Select a beatmapset');
      return null;
    }

    return addNomination(selectedBeatmapset.id, gameMode, form.parentId, roundId)
      .then((response) => {
        onNominationAdd(response.body);
        setSearchResults(undefined);
        setSelectedBeatmapset(undefined);
      })
      .then(then)
      .catch(alertApiErrorMessage);
  };

  // TODO class should probably go on the form itself
  // TODO better way to set parent ID lol
  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <p className='flex-left'>
        <span>
          <label htmlFor='beatmapset'>Beatmapset</label>{' '}
          <Help>
            If you can't find the beatmapset here, make sure it's been{' '}
            <Link to={`/submissions/${gameModeShortName(gameMode)}`}>submitted</Link> first!
          </Help>
        </span>
        <div className='beatmapset-search'>
          {selectedBeatmapset == null ? (
            <input
              ref={searchInputRef}
              type='text'
              name='beatmapset'
              onInput={onSearchInput}
              placeholder='Enter a beatmapset ID or search by artist, title, and creator'
            />
          ) : (
            <div
              className='beatmapset-search-selection'
              onClick={() => setSelectedBeatmapset(undefined)}
            >
              {beatmapText(selectedBeatmapset, true)}
            </div>
          )}
          {!!searchResults?.length && (
            <div className='beatmapset-search-results'>
              {searchResults.map((beatmapset) => (
                <button
                  key={beatmapset.id}
                  type='button'
                  onClick={() => {
                    setSearchResults(undefined);
                    setSelectedBeatmapset(beatmapset);
                  }}
                >
                  {beatmapText(beatmapset, true)}
                </button>
              ))}
            </div>
          )}
        </div>
        <span>
          <label htmlFor='parentId'>Parent nomination ID</label>{' '}
          <Help>
            If this map is being nominated because another mode's captains picked it first, set this
            field to the original mode's nomination ID
          </Help>
        </span>
        <input type='number' name='parentId' data-value-type='int' />
        <button type='submit'>{busy ? 'Adding...' : 'Add'}</button>
        <span className='flex-separator' />
        <Link to={`/picks/planner/${gameModeShortName(gameMode)}`}>Nomination planner</Link>
      </p>
    </Form>
  );
}
