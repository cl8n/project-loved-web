import { ConsentValue, Role } from 'loved-bridge/tables';
import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import PageSelector from 'src/submission-listing/PageSelector';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
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
  }
});
interface MapperConsentsProps {
  page: number
}

const pageSize = 50;

const allConsentValues = ["any", "no", "yes", "unreachable", "no reply"];
type CompleteConsentValue = typeof allConsentValues[number];

function getNewMapperConsentsPath(
  page: number
) {
  let path = "/mappers";

  if (page > 1)
    path += `/${page}`;

  return path;
}

export default function MapperConsents({
  page,
}: MapperConsentsProps) {
  const authUser = useOsuAuth().user;
  const [consents, consentError, setConsents] = useApi(getMapperConsents);
  const [currentConsentValue, setConsentValue] = useState<CompleteConsentValue>('any');
  const history = useHistory();
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

  const pageCount = Math.ceil(consents.length / pageSize);
  const collator = new Intl.Collator("en-US");

  const setPage = (newPage: number, replace?: boolean) => {
    if (newPage !== page) {
      if (replace) {
        history.replace(
          getNewMapperConsentsPath(newPage),
          history.location.state,
        );
      } else {
        history.push(getNewMapperConsentsPath(newPage));
      }
    }
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
  };

  const onConsentUpdate = (consent: IMapperConsent) => {
    setConsents((prev) => {
      const consents = [...prev!];
      const existingConsent = consents.find((existing) => existing.user_id === consent.user_id);

      if (existingConsent != null) {
        Object.assign(existingConsent, consent);
      } else {
        consents.unshift(consent);
      }

      return consents;
    });
  };

  const checkConsentValue = (consent: IMapperConsent) => {
    if (currentConsentValue == "any") {
      return true;
    }

    if (currentConsentValue == "no reply" && consent.consent == null) {
      return true;
    }

    if (currentConsentValue == "no" && consent.consent == ConsentValue.no
      || currentConsentValue == "yes" && consent.consent == ConsentValue.yes
      || currentConsentValue == "unreachable" && consent.consent == ConsentValue.unreachable) {
      return true;
    }

    return false;
  }


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
            name="consentValue"
            value={currentConsentValue}
            onChange={(event) => {
              setConsentValue(event.target.value);
              setPage(1, true);
            }}
          >
            {allConsentValues.map((status) => (
              <option key={status} value={status}>
                {status}
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
              setPage(1, true);
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
          {consents
            .sort((a, b) => collator.compare(a.mapper.name, b.mapper.name))
            .filter((consent) =>
              consent.mapper.name.toLowerCase().includes(search.toLowerCase())
              && checkConsentValue(consent))
            .slice((page - 1) * pageSize, page * pageSize)
            .map((consent) => {
              return <MapperConsent
                consent={consent}
                onConsentUpdate={onConsentUpdate}
              />
            })}
        </tbody>
      </table>
    </>
  );
}
