import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Checkbox from '@jetbrains/ring-ui-built/components/checkbox/checkbox';
import Loader from '@jetbrains/ring-ui-built/components/loader/loader';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import {createApi} from '@/api';
import {defaultSettings} from '@/backend/shared/ticket-lock-settings';
import type {TicketLockSettings, UnlockRestriction} from '@/backend/shared/ticket-lock-settings';

const host = await YTApp.register();
const api = createApi(host);

/** One option of the list that tells who can reopen a locked ticket. */
type RestrictionItem = {
  key: UnlockRestriction;
  label: string;
  description: string;
};

/** One checkbox that tells which change stays permitted on a locked ticket. */
type ToggleItem = {
  key: keyof TicketLockSettings;
  label: string;
};

const RESTRICTION_ITEMS: RestrictionItem[] = [
  {
    key: 'anyone',
    label: 'Anyone with update access',
    description: 'Each user that can update the ticket can also reopen it.'
  },
  {
    key: 'reporter',
    label: 'The reporter (and project admins)',
    description: 'The user that created the ticket can reopen it. A project admin can always reopen it.'
  },
  {
    key: 'projectAdmins',
    label: 'Project admins only',
    description: 'Only a project admin can reopen the ticket.'
  }
];

const TOGGLE_ITEMS: ToggleItem[] = [
  {key: 'allowComments', label: 'Comments'},
  {key: 'allowLinks', label: 'Links'},
  {key: 'allowWorkItems', label: 'Work items (logged time)'},
  {key: 'allowAttachments', label: 'Attachments'},
  {key: 'allowTags', label: 'Tags'}
];

/**
 * Finds the project that shows the widget.
 *
 * @returns The ID of the project, or null if there is no project.
 */
function projectId(): string | null {
  const entity = YTApp.entity;
  if (!entity || entity.type !== 'project') {
    return null;
  }
  return entity.id;
}

const AppComponent: React.FunctionComponent = () => {
  const [settings, setSettings] = useState<TicketLockSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = projectId();
    if (id === null) {
      setError('This widget needs a project. Open it from the settings of a project.');
      setLoading(false);
      return;
    }
    api.project.settings.GET({projectId: id})
      .then(result => { setSettings(result as TicketLockSettings); })
      .catch((cause: unknown) => {
        setError('The app cannot read the settings: ' + String(cause));
      })
      .finally(() => { setLoading(false); });
  }, []);

  const change = useCallback((key: keyof TicketLockSettings, value: boolean) => {
    setSaved(false);
    setSettings(previous => ({...previous, [key]: value}));
  }, []);

  const changeRestriction = useCallback((item: RestrictionItem | null) => {
    if (!item) {
      return;
    }
    setSaved(false);
    setSettings(previous => ({...previous, unlockRestriction: item.key}));
  }, []);

  const save = useCallback(async () => {
    const id = projectId();
    if (id === null) {
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await api.project.settings.POST({
        projectId: id,
        enabled: settings.enabled,
        unlockRestriction: settings.unlockRestriction,
        allowComments: settings.allowComments,
        allowLinks: settings.allowLinks,
        allowWorkItems: settings.allowWorkItems,
        allowAttachments: settings.allowAttachments,
        allowTags: settings.allowTags
      });
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.errors.join(' '));
      }
    } catch (cause: unknown) {
      setError('The app cannot save the settings: ' + String(cause));
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading) {
    return <div className="widget"><Loader message="The app reads the settings."/></div>;
  }

  const selected = RESTRICTION_ITEMS.find(item => item.key === settings.unlockRestriction) ?? null;

  return (
    <div className="widget">
      <Text info>
        {'The app locks a ticket when the ticket becomes resolved. A locked ticket is read-only. ' +
         'To edit a locked ticket, reopen it first.'}
      </Text>

      <Checkbox
        label="Lock a resolved ticket"
        checked={settings.enabled}
        onChange={event => change('enabled', event.target.checked)}
      />

      <fieldset className="group" disabled={!settings.enabled}>
        <legend className="legend">{'Who can reopen a locked ticket'}</legend>
        <Select
          data={RESTRICTION_ITEMS}
          selected={selected}
          onSelect={changeRestriction}
          type={Select.Type.BUTTON}
          disabled={!settings.enabled}
          label="Select who can reopen a locked ticket"
        />
        {selected && <Text info>{selected.description}</Text>}
        <Text info>{'A project admin can always reopen a locked ticket.'}</Text>
      </fieldset>

      <fieldset className="group" disabled={!settings.enabled}>
        <legend className="legend">{'What stays permitted on a locked ticket'}</legend>
        {TOGGLE_ITEMS.map(item => (
          <Checkbox
            key={item.key}
            label={item.label}
            checked={settings[item.key] as boolean}
            disabled={!settings.enabled}
            onChange={event => change(item.key, event.target.checked)}
          />
        ))}
        <Text info>{'The app rejects each change that is not in this list.'}</Text>
      </fieldset>

      <div className="actions">
        <Button primary loader={saving} disabled={saving} onClick={save}>{'Save'}</Button>
        {saved && <Text info>{'The app saved the settings.'}</Text>}
      </div>

      {error && <Text>{error}</Text>}
    </div>
  );
};

export const App = memo(AppComponent);
