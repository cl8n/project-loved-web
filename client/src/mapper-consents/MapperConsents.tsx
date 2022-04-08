import { ConsentValue, Role } from 'loved-bridge/tables';
import { Fragment } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import type { IMapperConsent, IUser } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import { UserInline } from '../UserInline';
import MapperConsentAdder from './MapperConsentAdder';
import MapperConsentEditor from './MapperConsentEditor';

const messages = defineMessages({
  noReply: {
    defaultMessage: 'No reply',
    description: 'Mapper consent shown in mapper consents table',
  },
  unreachable: {
    defaultMessage: 'Unreachable',
    description: 'Mapper consent shown in mapper consents table',
  },
  beatmapset: {
    defaultMessage: 'Beatmapset',
    description: 'Mapper beatmapset consents table header',
  },
  consent: {
    defaultMessage: 'Consent',
    description: 'Mapper beatmapset consents table header',
  },
  notes: {
    defaultMessage: 'Notes',
    description: 'Mapper beatmapset consents table header',
  },

  no: {
    defaultMessage: 'No',
    description: 'Boolean',
  },
  yes: {
    defaultMessage: 'Yes',
    description: 'Boolean',
  },
});
export const consentMap = {
  null: [messages.noReply, 'pending'],
  [ConsentValue.no]: [messages.no, 'error'],
  [ConsentValue.yes]: [messages.yes, 'success'],
  [ConsentValue.unreachable]: [messages.unreachable, 'pending'],
} as const;

function ConsentCell({ consent }: { consent: ConsentValue | boolean | null }) {
  const intl = useIntl();

  if (consent === true) {
    consent = ConsentValue.yes;
  } else if (consent === false) {
    consent = ConsentValue.no;
  }

  const [consentMessage, className] = consentMap[consent ?? 'null'];

  return <td className={className}>{intl.formatMessage(consentMessage)}</td>;
}

function MapperBeatmapsetConsents({ consent }: { consent: IMapperConsent }) {
  const intl = useIntl();

  return (
    <table className='beatmapset-consents'>
      <thead>
        <tr>
          <th>{intl.formatMessage(messages.beatmapset)}</th>
          <th>{intl.formatMessage(messages.consent)}</th>
          <th>{intl.formatMessage(messages.notes)}</th>
        </tr>
      </thead>
      <tbody>
        {consent.beatmapset_consents.map((beatmapsetConsent) => (
          <tr key={beatmapsetConsent.beatmapset.id}>
            <td>
              <BeatmapInline beatmapset={beatmapsetConsent.beatmapset} />
            </td>
            <ConsentCell consent={beatmapsetConsent.consent} />
            <td>{beatmapsetConsent.consent_reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MapperConsents() {
  const authUser = useOsuAuth().user;
  const [consents, consentError, setConsents] = useApi(getMapperConsents);

  if (consentError != null) {
    return (
      <span className='panic'>Failed to load mapper consents: {apiErrorMessage(consentError)}</span>
    );
  }

  if (consents == null) {
    return <span>Loading mapper consents...</span>;
  }

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
      <table className='main-table'>
        <thead>
          <tr className='sticky'>
            {authUser != null && hasRole(authUser, Role.captain) && <th />}
            <FormattedMessage
              defaultMessage='Mapper'
              description='Mapper consents table header'
              tagName='th'
            />
            <FormattedMessage
              defaultMessage='Consent'
              description='Mapper consents table header'
              tagName='th'
            />
            <FormattedMessage
              defaultMessage='Notes'
              description='Mapper consents table header'
              tagName='th'
            />
          </tr>
        </thead>
        <tbody>
          {consents.map((consent) => (
            <Fragment key={consent.user_id}>
              <tr>
                {authUser != null && hasRole(authUser, Role.captain) && (
                  <MapperConsentEditor consent={consent} onConsentUpdate={onConsentUpdate} />
                )}
                <td>
                  <UserInline user={consent.mapper} />
                </td>
                <ConsentCell consent={consent.consent} />
                <td className='normal-wrap fix-column-layout'>{consent.consent_reason}</td>
              </tr>
              {consent.beatmapset_consents.length > 0 && (
                <tr>
                  <td colSpan={4}>
                    <MapperBeatmapsetConsents consent={consent} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}
