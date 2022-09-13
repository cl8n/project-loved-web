import { ConsentValue, Role } from 'loved-bridge/tables';
import { Fragment } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { BeatmapInline } from 'src/BeatmapInline';
import { useOsuAuth } from 'src/osuAuth';
import type { IMapperConsent } from '../interfaces';
import { hasRole } from '../permissions';
import { UserInline } from '../UserInline';
import MapperConsentEditor from './MapperConsentEditor';

const messages = defineMessages({
  noReply: {
    defaultMessage: 'No reply',
    description: '[Mapper consents] Mapper consent shown in mapper consents table',
  },
  unreachable: {
    defaultMessage: 'Unreachable',
    description: '[Mapper consents] Mapper consent shown in mapper consents table',
  },
  beatmapset: {
    defaultMessage: 'Beatmapset',
    description: '[Mapper consents] Mapper beatmapset consents table header',
  },
  consent: {
    defaultMessage: 'Consent',
    description: '[Mapper consents] Mapper beatmapset consents table header',
  },
  notes: {
    defaultMessage: 'Notes',
    description: '[Mapper consents] Mapper beatmapset consents table header',
  },

  no: {
    defaultMessage: 'No',
    description: '[General] Boolean',
  },
  yes: {
    defaultMessage: 'Yes',
    description: '[General] Boolean',
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

interface MapperConsentProps {
  consent: IMapperConsent;
  onConsentUpdate: (consent: IMapperConsent) => void;
}

export default function MapperConsent({ consent, onConsentUpdate }: MapperConsentProps) {
  const authUser = useOsuAuth().user;

  return (
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
  );
}
