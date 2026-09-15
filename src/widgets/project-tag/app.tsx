import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Checkbox from '@jetbrains/ring-ui-built/components/checkbox/checkbox';
import Loader from '@jetbrains/ring-ui-built/components/loader/loader';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import {createApi} from '@/api';
import {defaultArticleSettings, defaultTicketSettings} from '@/backend/shared/lock-settings';
import type {ArticleLockSettings, TicketLockSettings} from '@/backend/shared/lock-settings';

const host = await YTApp.register();
const api = createApi(host);

/** The smallest width of the list that opens under a drop-down, in pixels. */
const POPUP_MIN_WIDTH = 320;

/** One option of a list that tells who can unlock. */
type RestrictionItem<R extends string> = {
  key: R;
  label: string;
  description: string;
};

/** One checkbox that tells which change stays permitted. */
type ToggleItem<T> = {
  key: keyof T;
  label: string;
};

/** The result that a save gives back. */
type SaveResult = {
  ok: boolean;
  errors: string[];
};

/** The smallest shape of a settings section. */
type SectionValue<R extends string> = {
  enabled: boolean;
  unlockRestriction: R;
};

const TICKET_RESTRICTIONS: RestrictionItem<TicketLockSettings['unlockRestriction']>[] = [
  {
    key: 'anyone',
    label: 'Anyone with update access',
    description: 'Each user who can update the ticket can also reopen it.'
  },
  {
    key: 'reporter',
    label: 'The reporter',
    description: 'Only the reporter or a project admin can reopen the ticket.'
  },
  {
    key: 'projectAdmins',
    label: 'Project admins only',
    description: 'Only a project admin can reopen the ticket.'
  }
];

const TICKET_TOGGLES: ToggleItem<TicketLockSettings>[] = [
  {key: 'allowComments', label: 'Comments'},
  {key: 'allowLinks', label: 'Links'},
  {key: 'allowWorkItems', label: 'Work items (logged time)'},
  {key: 'allowAttachments', label: 'Attachments'},
  {key: 'allowTags', label: 'Tags'}
];

const ARTICLE_RESTRICTIONS: RestrictionItem<ArticleLockSettings['unlockRestriction']>[] = [
  {
    key: 'anyone',
    label: 'Anyone with edit access',
    description: 'Each user who can edit the article can freeze and unfreeze it.'
  },
  {
    key: 'author',
    label: 'The author',
    description: 'Only the author or a project admin can freeze and unfreeze the article.'
  },
  {
    key: 'lockedBy',
    label: 'The user who froze the article',
    description: 'Each editor can freeze. Only the user who froze the article or a project admin can unfreeze it.'
  },
  {
    key: 'authorOrLockedBy',
    label: 'The author or the user who froze the article',
    description: 'Each editor can freeze. The author, the user who froze the article or a project admin can unfreeze it.'
  },
  {
    key: 'projectAdmins',
    label: 'Project admins only',
    description: 'Only a project admin can freeze and unfreeze the article.'
  }
];

const ARTICLE_TOGGLES: ToggleItem<ArticleLockSettings>[] = [
  {key: 'allowComments', label: 'Comments'},
  {key: 'allowChildArticles', label: 'Child articles (add or remove)'},
  {key: 'allowTags', label: 'Tags'},
  {key: 'allowAttachments', label: 'Attachments'}
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

type SectionProps<T extends SectionValue<R>, R extends string> = {
  title: string;
  intro: string;
  enableLabel: string;
  restrictionTitle: string;
  restrictionNote: string;
  restrictions: RestrictionItem<R>[];
  toggleTitle: string;
  toggles: ToggleItem<T>[];
  value: T;
  onChange: (key: keyof T, next: unknown) => void;
};

/**
 * One section of the settings: the lock for tickets, or the lock for articles.
 *
 * The section only shows and changes the value. The parent component reads
 * and keeps the settings of both sections.
 */
function LockSection<T extends SectionValue<R>, R extends string>(props: SectionProps<T, R>): React.ReactElement {
  const {value, onChange} = props;
  const selected = props.restrictions.find(item => item.key === value.unlockRestriction) ?? null;

  return (
    <section className="section">
      <h2 className="title">{props.title}</h2>
      <Text info>{props.intro}</Text>

      <Checkbox
        label={props.enableLabel}
        checked={value.enabled}
        onChange={event => onChange('enabled', event.target.checked)}
      />

      <fieldset className="group" disabled={!value.enabled}>
        <legend className="legend">{props.restrictionTitle}</legend>
        <Select
          data={props.restrictions}
          selected={selected}
          onSelect={item => { if (item) { onChange('unlockRestriction', item.key); } }}
          type={Select.Type.BUTTON}
          size={Select.Size.L}
          minWidth={POPUP_MIN_WIDTH}
          disabled={!value.enabled}
          label={props.restrictionTitle}
        />
        {selected && <Text info>{selected.description}</Text>}
        <Text info>{props.restrictionNote}</Text>
      </fieldset>

      <fieldset className="group" disabled={!value.enabled}>
        <legend className="legend">{props.toggleTitle}</legend>
        {props.toggles.map(item => (
          <Checkbox
            key={String(item.key)}
            label={item.label}
            checked={value[item.key] as unknown as boolean}
            disabled={!value.enabled}
            onChange={event => onChange(item.key, event.target.checked)}
          />
        ))}
        <Text info>{'The app rejects each change that is not in this list.'}</Text>
      </fieldset>
    </section>
  );
}

const loadTicket = (id: string): Promise<TicketLockSettings> =>
  api.project.ticketSettings.GET({projectId: id}) as Promise<TicketLockSettings>;

const saveTicket = (id: string, value: TicketLockSettings): Promise<SaveResult> =>
  api.project.ticketSettings.POST({projectId: id, ...value});

const loadArticle = (id: string): Promise<ArticleLockSettings> =>
  api.project.articleSettings.GET({projectId: id}) as Promise<ArticleLockSettings>;

const saveArticle = (id: string, value: ArticleLockSettings): Promise<SaveResult> =>
  api.project.articleSettings.POST({projectId: id, ...value});

/**
 * Joins the errors of the two saves, with the name of the section in front.
 */
function joinErrors(ticket: SaveResult, article: SaveResult): string {
  const parts: string[] = [];
  if (!ticket.ok) {
    parts.push('Tickets: ' + ticket.errors.join(' '));
  }
  if (!article.ok) {
    parts.push('Articles: ' + article.errors.join(' '));
  }
  return parts.join(' ');
}

const AppComponent: React.FunctionComponent = () => {
  const [ticket, setTicket] = useState<TicketLockSettings>(defaultTicketSettings);
  const [article, setArticle] = useState<ArticleLockSettings>(defaultArticleSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const id = projectId();
    if (id === null) {
      setError('This widget needs a project. Open it from the settings of a project.');
      setLoading(false);
      return;
    }
    Promise.all([loadTicket(id), loadArticle(id)])
      .then(([ticketValue, articleValue]) => {
        setTicket(ticketValue);
        setArticle(articleValue);
      })
      .catch((cause: unknown) => { setError('The app cannot read the settings: ' + String(cause)); })
      .finally(() => { setLoading(false); });
  }, []);

  const changeTicket = useCallback((key: keyof TicketLockSettings, next: unknown) => {
    setSaved(false);
    setTicket(previous => ({...previous, [key]: next}));
  }, []);

  const changeArticle = useCallback((key: keyof ArticleLockSettings, next: unknown) => {
    setSaved(false);
    setArticle(previous => ({...previous, [key]: next}));
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
      const [ticketResult, articleResult] = await Promise.all([saveTicket(id, ticket), saveArticle(id, article)]);
      if (ticketResult.ok && articleResult.ok) {
        setSaved(true);
      } else {
        setError(joinErrors(ticketResult, articleResult));
      }
    } catch (cause: unknown) {
      setError('The app cannot save the settings: ' + String(cause));
    } finally {
      setSaving(false);
    }
  }, [ticket, article]);

  if (loading) {
    return <div className="widget"><Loader message="The app reads the settings."/></div>;
  }

  return (
    <div className="widget">
      <LockSection
        title="Tickets"
        intro={'The app locks a ticket when the ticket becomes resolved. A locked ticket is read-only. ' +
          'To edit a locked ticket, reopen it first.'}
        enableLabel="Lock a resolved ticket"
        restrictionTitle="Who can reopen a locked ticket"
        restrictionNote="A project admin can always reopen a locked ticket."
        restrictions={TICKET_RESTRICTIONS}
        toggleTitle="What stays permitted on a locked ticket"
        toggles={TICKET_TOGGLES}
        value={ticket}
        onChange={changeTicket}
      />
      <LockSection
        title="Articles"
        intro={'A user freezes an article to lock it. A frozen article is read-only. ' +
          'To edit a frozen article, unfreeze it first. ' +
          'A user can freeze an article only if the same user can also unfreeze it.'}
        enableLabel="Make a frozen article read-only"
        restrictionTitle="Who can unfreeze a frozen article"
        restrictionNote="A project admin can always freeze and unfreeze an article."
        restrictions={ARTICLE_RESTRICTIONS}
        toggleTitle="What stays permitted on a frozen article"
        toggles={ARTICLE_TOGGLES}
        value={article}
        onChange={changeArticle}
      />

      <div className="actions">
        <Button primary loader={saving} disabled={saving} onClick={save}>{'Save'}</Button>
        {saved && <Text info>{'The app saved the settings.'}</Text>}
      </div>

      {error && <Text>{error}</Text>}
    </div>
  );
};

export const App = memo(AppComponent);
