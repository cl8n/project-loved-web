import { Fragment } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import type { IMapperConsent } from '../interfaces';
import { UserInline } from '../UserInline';

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
const consentMap = {
  null: [messages.noReply, 'pending'],
  0: [messages.no, 'error'],
  1: [messages.yes, 'success'],
  2: [messages.unreachable, 'pending'],
} as const;

function ConsentCell({ consent }: { consent: 0 | 1 | 2 | boolean | undefined }) {
  const intl = useIntl();

  if (consent === true) {
    consent = 1;
  } else if (consent === false) {
    consent = 0;
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
  const [consents, consentError] = useApi(getMapperConsents);

  if (consentError != null) {
    return (
      <span className='panic'>Failed to load mapper consents: {apiErrorMessage(consentError)}</span>
    );
  }

  if (consents == null) {
    return <span>Loading mapper consents...</span>;
  }

  return (
    <div className='content-block'>
      <FormattedMessage
        defaultMessage='Mapper consents'
        description='Mapper consents page title'
        tagName='h1'
      />
      <table>
        <thead>
          <tr className='sticky'>
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
            <Fragment key={consent.id}>
              <tr>
                <td>
                  <UserInline user={consent.mapper} />
                </td>
                <ConsentCell consent={consent.consent} />
                <td>{consent.consent_reason}</td>
              </tr>
              {consent.beatmapset_consents.length > 0 && (
                <tr>
                  <td colSpan={3}>
                    <MapperBeatmapsetConsents consent={consent} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
