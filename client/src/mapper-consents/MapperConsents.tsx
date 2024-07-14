import { ConsentValue, Role } from 'loved-bridge/tables';
import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import type { IMapperConsent, IUser } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import PageSelector from '../PageSelector';
import { hasRole } from '../permissions';
import MapperConsent, { consentMap } from './MapperConsent';
import MapperConsentAdder from './MapperConsentAdder';
import MapperConsentEditor from './MapperConsentEditor';

const messages = defineMessages({
  consent: {
    defaultMessage: 'Consent:',
    description: '[Mapper consents] Selector to change mapper consent',
  },
  any: {
    defaultMessage: 'Any',
    description: '[General] Selector option indicating that any of the choices are valid',
  },
});

const pageSize = 50;

export default function MapperConsents() {
  const authUser = useOsuAuth().user;
  const [consents, consentError, setConsents] = useApi(getMapperConsents);
  const [consentValue, setConsentValue] = useState<ConsentValue | null | 'any'>('any');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const intl = useIntl();

  if (consentError != null) {
    return (
      <span className='panic'>Failed to load mapper consents: {apiErrorMessage(consentError)}</span>
    );
  }

  if (consents == null) {
    return <span>Loading mapper consents...</span>;
  }

  const resetFilters = () => {
    setConsentValue('any');
    setSearch('');
    setPage(1);
  };
  const onConsentAdd = (user: IUser) => {
    setConsents((prev) => {
      const consents = [...prev!];
      const existingConsent = consents.find((existing) => existing.user_id === user.id);

      return [
        existingConsent == null
          ? {
              user_id: user.id,
              beatmapset_consents: [],
              consent: null,
              consent_reason: null,
              mapper: user,
            }
          : { ...existingConsent, mapper: user },
        ...consents.filter((consent) => consent.user_id !== user.id),
      ];
    });
    resetFilters();
  };
  const onConsentUpdate = (consent: IMapperConsent) => {
    setConsents((prev) => {
      const consents = [...prev!];
      const existingConsent = consents.find((existing) => existing.user_id === consent.user_id);

      if (existingConsent != null) {
        Object.assign(existingConsent, consent);
      } else {
        consents.unshift(consent);
        resetFilters();
      }

      return consents;
    });
  };

  const filteredConsents = consents.filter(
    (consent) =>
      consent.mapper.name.toLowerCase().includes(search.toLowerCase()) &&
      (consentValue === 'any' || consent.consent === consentValue),
  );
  const pageCount = Math.ceil(filteredConsents.length / pageSize);

  return (
    <>
      {authUser != null && (
        <div className='flex-bar'>
          <MapperConsentEditor
            consent={consents.find((consent) => consent.user_id === authUser.id)}
            editSelf={true}
            onConsentUpdate={onConsentUpdate}
          />
          {hasRole(authUser, Role.captain) && <MapperConsentAdder onConsentAdd={onConsentAdd} />}
        </div>
      )}
      <div className='block-margin'>
        <div className='flex-left'>
          <label htmlFor='consentValue'>{intl.formatMessage(messages.consent)}</label>
          <select
            name='consentValue'
            value={consentValue ?? 'null'}
            onChange={(event) => {
              setConsentValue(
                event.currentTarget.value === 'any'
                  ? 'any'
                  : event.currentTarget.value === 'null'
                    ? null
                    : parseInt(event.currentTarget.value, 10),
              );
              setPage(1);
            }}
          >
            <option value='any'>{intl.formatMessage(messages.any)}</option>
            {[ConsentValue.yes, ConsentValue.no, ConsentValue.unreachable, 'null' as const].map(
              (consentValue) => (
                <option
                  key={consentValue}
                  className={consentMap[consentValue][1]}
                  value={consentValue}
                >
                  {intl.formatMessage(consentMap[consentValue][0])}
                </option>
              ),
            )}
          </select>
          <FormattedMessage
            defaultMessage='Search:'
            description='[Submissions] Title for submissions search input'
            tagName='span'
          />
          <input
            type='search'
            className='flex-grow'
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      {filteredConsents.length > 0 ? (
        <>
          <PageSelector page={page} pageCount={pageCount} setPage={setPage} />
          <table className='main-table'>
            <thead>
              <tr className='sticky'>
                {hasRole(authUser, Role.captain) && <th />}
                <FormattedMessage
                  defaultMessage='Mapper'
                  description='[Mapper consents] Mapper consents table header'
                  tagName='th'
                />
                <FormattedMessage
                  defaultMessage='Consent'
                  description='[Mapper consents] Mapper consents table header'
                  tagName='th'
                />
                <FormattedMessage
                  defaultMessage='Notes'
                  description='[Mapper consents] Mapper consents table header'
                  tagName='th'
                />
              </tr>
            </thead>
            <tbody>
              {filteredConsents.slice((page - 1) * pageSize, page * pageSize).map((consent) => (
                <MapperConsent
                  key={consent.user_id}
                  consent={consent}
                  onConsentUpdate={onConsentUpdate}
                />
              ))}
            </tbody>
          </table>
          <PageSelector page={page} pageCount={pageCount} setPage={setPage} />
        </>
      ) : (
        <b>No mapper consents to show!</b>
      )}
    </>
  );
}
