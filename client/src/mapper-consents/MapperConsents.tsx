import { ConsentValue, Role } from 'loved-bridge/tables';
import { apiErrorMessage, getMapperConsents, useApi } from '../api';
import type { IMapperConsent, IUser } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import MapperConsent from './MapperConsent';
import MapperConsentAdder from './MapperConsentAdder';
import MapperConsentEditor from './MapperConsentEditor';

interface MapperConsentsProps {
  consentValue?: ConsentValue | null
}

export default function MapperConsents({ consentValue = ConsentValue.yes }: MapperConsentsProps) {
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
          {consents.map((consent) => {
            if (consent && consent.consent === consentValue) {
              return <MapperConsent
                consent={consent}
                onConsentUpdate={onConsentUpdate}
              />
            } else if (!consent) {
              return <MapperConsent
                consent={consent}
                onConsentUpdate={onConsentUpdate}
              />
            }
          })}
        </tbody>
      </table>
    </>
  );
}
