import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Checkbox from '@jetbrains/ring-ui-built/components/checkbox/checkbox';
import Loader from '@jetbrains/ring-ui-built/components/loader/loader';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import {createApi} from '@/api';
import {defaultArticleSettings, defaultIssueSettings} from '@/backend/shared/lock-settings';
import type {ArticleLockSettings, IssueLockSettings} from '@/backend/shared/lock-settings';

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

const ISSUE_RESTRICTIONS: RestrictionItem<IssueLockSettings['unlockRestriction']>[] = [
  {
    key: 'anyone',
    label: 'Anyone with update access',
    description: 'Each user who can update the issue can also reopen it.'
  },
  {
    key: 'reporter',
    label: 'The reporter',
    description: 'Only the reporter or a project admin can reopen the issue.'
  },
  {
    key: 'resolver',
    label: 'The user who resolved the issue',
    description: 'Only the user who resolved the issue or a project admin can reopen it.'
  },
  {
    key: 'reporterOrResolver',
    label: 'The reporter or the user who resolved the issue',
    description: 'The reporter, the user who resolved the issue or a project admin can reopen it.'
  },
  {
    key: 'projectAdmins',
    label: 'Project admins only',
    description: 'Only a project admin can reopen the issue.'
  }
];

const ISSUE_TOGGLES: ToggleItem<IssueLockSettings>[] = [
  {key: 'allowComments', label: 'Comments'},
  {key: 'allowLinks', label: 'Links'},
  {key: 'allowWorkItems', label: 'Work items (logged time)'},
  {key: 'allowAttachments', label: 'Attachments'},
  {key: 'allowTags', label: 'Tags'},
  {key: 'allowDelete', label: 'Deletion'}
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
  {key: 'allowAttachments', label: 'Attachments'},
  {key: 'allowDelete', label: 'Deletion'}
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
 * One section of the settings: the lock for issues, or the lock for articles.
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
        <Text info>{'A change that is not in this list is rejected.'}</Text>
      </fieldset>
    </section>
  );
}

const loadIssue = (id: string): Promise<IssueLockSettings> =>
  api.project.issueSettings.GET({projectId: id}) as Promise<IssueLockSettings>;

const saveIssue = (id: string, value: IssueLockSettings): Promise<SaveResult> =>
  api.project.issueSettings.POST({projectId: id, ...value});

const loadArticle = (id: string): Promise<ArticleLockSettings> =>
  api.project.articleSettings.GET({projectId: id}) as Promise<ArticleLockSettings>;

const saveArticle = (id: string, value: ArticleLockSettings): Promise<SaveResult> =>
  api.project.articleSettings.POST({projectId: id, ...value});

/**
 * Joins the errors of the two saves, with the name of the section in front.
 */
function joinErrors(issue: SaveResult, article: SaveResult): string {
  const parts: string[] = [];
  if (!issue.ok) {
    parts.push('Issues: ' + issue.errors.join(' '));
  }
  if (!article.ok) {
    parts.push('Articles: ' + article.errors.join(' '));
  }
  return parts.join(' ');
}

const AppComponent: React.FunctionComponent = () => {
  const [issue, setIssue] = useState<IssueLockSettings>(defaultIssueSettings);
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
    Promise.all([loadIssue(id), loadArticle(id)])
      .then(([issueValue, articleValue]) => {
        setIssue(issueValue);
        setArticle(articleValue);
      })
      .catch((cause: unknown) => { setError('Cannot read the settings: ' + String(cause)); })
      .finally(() => { setLoading(false); });
  }, []);

  const changeIssue = useCallback((key: keyof IssueLockSettings, next: unknown) => {
    setSaved(false);
    setIssue(previous => ({...previous, [key]: next}));
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
      const [issueResult, articleResult] = await Promise.all([saveIssue(id, issue), saveArticle(id, article)]);
      if (issueResult.ok && articleResult.ok) {
        setSaved(true);
      } else {
        setError(joinErrors(issueResult, articleResult));
      }
    } catch (cause: unknown) {
      setError('Cannot save the settings: ' + String(cause));
    } finally {
      setSaving(false);
    }
  }, [issue, article]);

  if (loading) {
    return <div className="widget"><Loader message="Reading settings..."/></div>;
  }

  return (
    <div className="widget">
      <LockSection
        title="Issues"
        intro={'The app locks an issue when the issue becomes resolved. A locked issue is read-only. ' +
          'To edit a locked issue, reopen it first.'}
        enableLabel="Lock a resolved issue"
        restrictionTitle="Who can reopen a locked issue"
        restrictionNote="A project admin can always reopen a locked issue."
        restrictions={ISSUE_RESTRICTIONS}
        toggleTitle="What stays permitted on a locked issue"
        toggles={ISSUE_TOGGLES}
        value={issue}
        onChange={changeIssue}
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
        {saved && <Text info>{'Settings saved.'}</Text>}
      </div>

      {error && <Text>{error}</Text>}
    </div>
  );
};

export const App = memo(AppComponent);
