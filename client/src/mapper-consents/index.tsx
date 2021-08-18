import { Fragment } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import { IMapperConsent } from '../interfaces';
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

function ConsentCell(consent?: 0 | 1 | 2 | boolean) {
  const intl = useIntl();

  if (consent === true) {
    consent = 1;
  } else if (consent === false) {
    consent = 0;
  }

  const [consentMessage, className] = consentMap[consent ?? 'null'];

  return (
    <td className={className}>
      {intl.formatMessage(consentMessage)}
    </td>
  );
}

function MapperBeatmapsetConsents(mapperConsent: IMapperConsent) {
  const intl = useIntl();

  return (
    <table style={{ 'width': '80%', 'marginLeft': '3em', 'marginRight': '3em', 'tableLayout': 'fixed' }}>
      <tr>
        <th style={{'width': '30%'}}>{intl.formatMessage(messages.beatmapset)}</th>
        <th style={{'width': '10%'}}>{intl.formatMessage(messages.consent)}</th>
        <th style={{'width': '60%'}}>{intl.formatMessage(messages.notes)}</th>
      </tr>
      {mapperConsent.beatmapset_consents.map((consent) => (
        <tr key={consent.beatmapset.id}>
          <td><BeatmapInline beatmapset={consent.beatmapset} /></td>
          {ConsentCell(consent.consent)}
          <td>{consent.consent_reason}</td>
        </tr>
      ))}
    </table>
  );
}

export default function MapperConsents() {
  const [consents, consentError] = useApi(getMapperConsents);

  if (consentError != null)
    return <span className='panic'>Failed to load mapper consents: {apiErrorMessage(consentError)}</span>;

  if (consents == null)
    return <span>Loading mapper consents...</span>;

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
                <td><UserInline user={consent.mapper} /></td>
                {ConsentCell(consent.consent)}
                <td>{consent.consent_reason}</td>
              </tr>
              {consent.beatmapset_consents.length > 0 && (
                <tr>
                  <td colSpan={3}>{MapperBeatmapsetConsents(consent)}</td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
