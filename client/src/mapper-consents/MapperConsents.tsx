import { ConsentValue, Role } from 'loved-bridge/tables';
import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import PageSelector from '../components/PageSelector';
import type { IMapperConsent, IUser } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import MapperConsent from './MapperConsent';
import MapperConsentAdder from './MapperConsentAdder';
import MapperConsentEditor from './MapperConsentEditor';

const messages = defineMessages({
  consent: {
    defaultMessage: 'Mapper consent:',
    description: '[Mapper consents] Selector to change mapper consent',
  },

  no: {
    defaultMessage: 'No',
    description: '[General] Boolean',
  },
  yes: {
    defaultMessage: 'Yes',
    description: '[General] Boolean',
  },
  any: {
    defaultMessage: 'Any',
    description: '[General] Selector option indicating that any of the choices are valid',
  },
  noReply: {
    defaultMessage: 'No reply',
    description: '[Mapper consents] Mapper consent shown in mapper consents table',
  },
  unreachable: {
    defaultMessage: 'Unreachable',
    description: '[Mapper consents] Mapper consent shown in mapper consents table',
  },
});

const consentValueMessageMap = {
  yes: messages.yes,
  no: messages.no,
  unreachable: messages.unreachable,
  'no reply': messages.noReply,
  any: messages.any,
} as const;

const pageSize = 50;

const allConsentValues = ['any', 'no', 'yes', 'unreachable', 'no reply'];
const consentValueMap = {
  yes: ConsentValue.yes,
  no: ConsentValue.no,
  unreachable: ConsentValue.unreachable,
  'no reply': null,
  any: 'any',
} as const;

export default function MapperConsents() {
  const authUser = useOsuAuth().user;
  const [consents, consentError, setConsents] = useApi(getMapperConsents);
  const [currentConsentValue, setCurrentConsentValue] = useState('any');
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

  const resetValues = () => {
    setCurrentConsentValue('any');
    setSearch('');
    setPage(1);
  };

  const onConsentAdd = (user: IUser) => {
    setConsents((prev) => {
      const consents = [...prev!];
      const existingConsent = consents.find((existing) => existing.user_id === user.id);

      resetValues();

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
  };

  const onConsentUpdate = (consent: IMapperConsent) => {
    setConsents((prev) => {
      const consents = [...prev!];
      const existingConsent = consents.find((existing) => existing.user_id === consent.user_id);

      resetValues();

      if (existingConsent != null) {
        Object.assign(existingConsent, consent);
      } else {
        consents.unshift(consent);
      }

      return consents;
    });
  };

  const checkConsentValue = (consent: IMapperConsent) => {
    if (currentConsentValue === 'any') {
      return true;
    }

    if (currentConsentValue === 'null' && consent.consent == null) {
      return true;
    }

    if (consentValueMap[currentConsentValue as keyof typeof consentValueMap] === consent.consent) {
      return true;
    }

    return false;
  };

  const filteredConsents = consents.filter(
    (consent) =>
      consent.mapper.name.toLowerCase().includes(search.toLowerCase()) &&
      checkConsentValue(consent),
  );

  if (filteredConsents.length === 0 && page === 1) {
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
              value={currentConsentValue}
              onChange={(event) => {
                setCurrentConsentValue(event.target.value);
                setPage(1);
              }}
            >
              {allConsentValues.map((status) => (
                <option key={status} value={status}>
                  {intl.formatMessage(
                    consentValueMessageMap[status as keyof typeof consentValueMap],
                  )}
                </option>
              ))}
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
        <span>
          <b>No mapper consents to show!</b>
        </span>
      </>
    );
  }

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
            value={currentConsentValue}
            onChange={(event) => {
              setCurrentConsentValue(event.target.value);
              setPage(1);
            }}
          >
            {allConsentValues.map((status) => (
              <option key={status} value={status}>
                {intl.formatMessage(consentValueMessageMap[status as keyof typeof consentValueMap])}
              </option>
            ))}
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
      <PageSelector page={page} pageCount={pageCount} setPage={setPage} />
      <table className='main-table'>
        <thead>
          <tr className='sticky'>
            {authUser != null && hasRole(authUser, Role.captain) && <th />}
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
          {filteredConsents.slice((page - 1) * pageSize, page * pageSize).map((consent) => {
            return (
              <MapperConsent
                key={consent.user_id}
                consent={consent}
                onConsentUpdate={onConsentUpdate}
              />
            );
          })}
        </tbody>
      </table>
      <PageSelector page={page} pageCount={pageCount} setPage={setPage} />
    </>
  );
}
