import { ConsentValue, Role } from 'loved-bridge/tables';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { IntlShape } from 'react-intl';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { addOrUpdateMapperConsent, alertApiErrorMessage } from '../api';
import { autoHeightRef } from '../auto-height';
import { BoolView } from '../BoolView';
import type { FormSubmitHandler } from '../dom-helpers';
import { valueCasts } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { IMapperBeatmapsetConsent, IMapperConsent } from '../interfaces';
import ListInputCustom from '../ListInputCustom';
import { Modal } from '../Modal';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import { UserInline } from '../UserInline';
import { consentMap } from './MapperConsents';

const messages = defineMessages({
  selectConsent: {
    defaultMessage: 'Select a consent option',
    description: 'Mapper consent editor option',
  },
  submit: {
    defaultMessage: 'Submit',
    description: 'Submit button',
  },
  submitting: {
    defaultMessage: 'Submitting...',
    description: 'Submit button when in progress',
  },
});

function renderMapperConsentBeatmapsetInput(intl: IntlShape) {
  return (
    consentBeatmapset: IMapperBeatmapsetConsent | null,
    renderRemoveButton: () => ReactNode,
  ) => (
    <div className='box'>
      <table>
        <tbody>
          <tr>
            <td>
              <label htmlFor='beatmapset_id'>
                <FormattedMessage
                  defaultMessage='Beatmapset ID'
                  description='Mapper consent editor option'
                />
              </label>
            </td>
            <td>
              <input
                name='beatmapset_id'
                required
                type='number'
                defaultValue={consentBeatmapset?.beatmapset_id}
              />
            </td>
          </tr>
          <tr>
            <td>
              <label htmlFor='consent'>
                <FormattedMessage
                  defaultMessage='Consent'
                  description='Mapper consent editor option'
                />
              </label>
            </td>
            <td>
              <select
                name='consent'
                required
                defaultValue={consentBeatmapset == null ? undefined : +consentBeatmapset.consent}
                key={
                  consentBeatmapset == null
                    ? undefined
                    : +consentBeatmapset.consent /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
                }
              >
                <option hidden value=''>
                  {intl.formatMessage(messages.selectConsent)}
                </option>
                {[true, false].map((consentValue) => (
                  <BoolView key={+consentValue} option value={consentValue} />
                ))}
              </select>
            </td>
          </tr>
          <tr>
            <td>
              <label htmlFor='consent_reason'>
                <FormattedMessage
                  defaultMessage='Reason'
                  description='Mapper consent editor option'
                />
              </label>
            </td>
            <td>
              <textarea
                name='consent_reason'
                defaultValue={consentBeatmapset?.consent_reason ?? undefined}
                ref={autoHeightRef}
              />
            </td>
          </tr>
          <tr>
            <td>{renderRemoveButton()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

type MapperConsentEditorProps =
  | {
      consent: IMapperConsent | undefined;
      editSelf: true;
      onConsentUpdate: (consent: IMapperConsent) => void;
    }
  | {
      consent: IMapperConsent;
      editSelf?: false;
      onConsentUpdate: (consent: IMapperConsent) => void;
    };

export default function MapperConsentEditor({
  consent,
  editSelf,
  onConsentUpdate,
}: MapperConsentEditorProps) {
  const authUser = useOsuAuth().user!;
  const intl = useIntl();
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (_, then, controls) => {
    let consentValue: ConsentValue | null = null;
    let consentReason: string | null = null;
    const consentBeatmapsets: Partial<IMapperBeatmapsetConsent>[] = [];

    const controlsCount = controls.length;
    const controlCasts = {
      beatmapset_id: valueCasts.int,
      consent: valueCasts.bool,
      consent_reason: valueCasts.string,
    } as any; // TODO: typing
    let currentBeatmapset = -1;
    let i = 0;

    for (; i < controlsCount && (controls[i] as any).name !== 'beatmapset_id'; i++) {
      const control = controls[i] as any; // TODO: typing

      if (control.name === 'consent') {
        consentValue = valueCasts.int(control.value);
      } else if (control.name === 'consent_reason') {
        consentReason = valueCasts.string(control.value);
      }
    }

    for (; i < controlsCount; i++) {
      const control = controls[i] as any; // TODO: typing

      if (!['beatmapset_id', 'consent', 'consent_reason'].includes(control.name)) {
        continue;
      }

      // Assume the controls are in correct order
      if (control.name === 'beatmapset_id') {
        currentBeatmapset++;
        consentBeatmapsets.push({});
      }

      consentBeatmapsets[currentBeatmapset][control.name as keyof IMapperBeatmapsetConsent] =
        controlCasts[control.name](control.value);
    }

    return addOrUpdateMapperConsent(
      {
        consent: consentValue,
        consent_reason: consentReason,
        user_id: editSelf ? authUser.id : consent!.user_id,
      },
      consentBeatmapsets as Pick<
        IMapperBeatmapsetConsent,
        'beatmapset_id' | 'consent' | 'consent_reason'
      >[],
    )
      .then((response) => onConsentUpdate(response.body))
      .then(then)
      .catch(alertApiErrorMessage)
      .finally(() => setModalOpen(false));
  };

  return (
    <>
      {editSelf ? (
        <button type='button' onClick={() => setModalOpen(true)}>
          <FormattedMessage
            defaultMessage='Edit my consent'
            description='Button to edit the mapper consent status of the current user'
          />
        </button>
      ) : (
        <td>
          <button type='button' onClick={() => setModalOpen(true)} className='fake-a'>
            Edit
          </button>
        </td>
      )}
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
        <FormattedMessage
          defaultMessage='Editing {user}'
          description='Title of mapper consent editor modal'
          tagName='h2'
          values={{ user: <UserInline user={editSelf ? authUser : consent!.mapper} /> }}
        />
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table>
            <tbody>
              <tr>
                <td>
                  <label htmlFor='consent'>
                    <FormattedMessage
                      defaultMessage='Consent'
                      description='Mapper consent editor option'
                    />
                  </label>
                </td>
                <td>
                  <select
                    name='consent'
                    required
                    // eslint-disable-next-line eqeqeq
                    defaultValue={consent?.consent === null ? 'null' : consent?.consent}
                    key={
                      consent?.consent /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
                    }
                  >
                    <option hidden value=''>
                      {intl.formatMessage(messages.selectConsent)}
                    </option>
                    {[ConsentValue.yes, ConsentValue.no].map((consentValue) => (
                      <option
                        key={consentValue}
                        className={consentMap[consentValue][1]}
                        value={consentValue}
                      >
                        {intl.formatMessage(consentMap[consentValue][0])}
                      </option>
                    ))}
                    {hasRole(authUser, Role.captain) &&
                      ['null' as const, ConsentValue.unreachable].map((consentValue) => (
                        <option
                          key={consentValue}
                          className={consentMap[consentValue][1]}
                          value={consentValue}
                        >
                          {intl.formatMessage(consentMap[consentValue][0])}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td>
                  <label htmlFor='consent_reason'>
                    <FormattedMessage
                      defaultMessage='Reason'
                      description='Mapper consent editor option'
                    />
                  </label>
                </td>
                <td>
                  <textarea
                    name='consent_reason'
                    defaultValue={consent?.consent_reason ?? undefined}
                    ref={autoHeightRef}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <FormattedMessage
            defaultMessage='Beatmapsets'
            description='Sub-header for mapper consent editor'
            tagName='h3'
          />
          <ListInputCustom
            items={consent?.beatmapset_consents ?? []}
            renderItemInput={renderMapperConsentBeatmapsetInput(intl)}
          />
          <button type='submit' className='modal-submit-button'>
            {intl.formatMessage(busy ? messages.submitting : messages.submit)}
          </button>
        </Form>
      </Modal>
    </>
  );
}
