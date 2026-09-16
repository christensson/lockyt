import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import infoIcon from '@jetbrains/icons/info';
import lockIcon from '@jetbrains/icons/lock';
import {createApi} from '@/api';
import type {ArticleLockRes} from '@/backend/router/article/lock/GET';
import {LockDialog} from '../shared/lock-dialog';
import {useModalFrame} from '../shared/use-modal-frame';
import {blockedSentences, permittedSentences, whoCanFreeze, whoCanUnfreeze} from './describe';
import {isoTime, relativeTime} from '../shared/relative-time';

// The host can ask the widget to reload. The component sets this function.
let reload: () => void = () => {};

const host = await YTApp.register({onRefresh: () => reload()});
const api = createApi(host);

type Mode = 'view' | 'confirm' | 'info' | 'message';

type IconProps = {
  state: ArticleLockRes;
  onClick: () => void;
};

/**
 * The lock icon of a frozen article. It is a button when the user can
 * unfreeze the article.
 */
function LockIcon({state, onClick}: IconProps): React.ReactElement {
  if (!state.canUnlock) {
    return <span className="icon lockIcon"><Icon glyph={lockIcon}/></span>;
  }
  return (
    <Button
      inline
      icon={lockIcon}
      iconClassName="lockIcon"
      title="Unfreeze the article"
      aria-label="Unfreeze the article"
      onClick={onClick}
    />
  );
}

type StatusProps = {
  state: ArticleLockRes;
  onToggle: () => void;
};

/**
 * The status text. An editable article gets an inline button to freeze it,
 * and a frozen one an inline button to unfreeze it, when the user may.
 */
function StatusLine({state, onToggle}: StatusProps): React.ReactElement {
  if (state.isLocked) {
    const who = state.lockedByName || 'an unknown user';
    // The tooltip is the native one of the browser. A Ring UI tooltip is a
    // popup inside the frame, and the frame is one line high.
    return (
      <span>
        {'Frozen by ' + who + ' '}
        <span title={isoTime(state.lockedAt)}>
          {relativeTime(state.lockedAt, YTApp.locale)}
        </span>
        {'. '}
        {state.canUnlock ? <Button inline onClick={onToggle}>{'Unfreeze'}</Button> : 'Unfreeze'}
        {' to update.'}
        {state.enabled ? '' : ' The lock for articles is off in this project.'}
      </span>
    );
  }
  if (!state.canLock) {
    return <span>{'Editable.'}</span>;
  }
  return (
    <span>
      {'Editable. '}
      <Button inline onClick={onToggle}>{'Freeze article'}</Button>
      {'.'}
    </span>
  );
}

/**
 * The dialog that tells what the lock permits on this article.
 */
function InfoDialog({state, onClose}: {state: ArticleLockRes; onClose: () => void}): React.ReactElement {
  const who: string[] = [];
  if (!state.isLocked) {
    who.push(whoCanFreeze(state));
  }
  who.push(whoCanUnfreeze(state));
  const footnote = state.isLocked && state.lockedAt > 0
    ? 'Frozen by ' + (state.lockedByName || 'an unknown user') + ' on ' + isoTime(state.lockedAt) + '.'
    : undefined;
  return (
    <LockDialog
      title={state.isLocked ? 'This article is frozen' : 'This article is editable'}
      intro={state.isLocked ? 'A frozen article is read-only.' : 'When you freeze the article, it becomes read-only.'}
      blockedTitle={state.isLocked ? 'Not permitted' : 'Not permitted when frozen'}
      blocked={blockedSentences(state)}
      permittedTitle={state.isLocked ? 'Permitted' : 'Permitted when frozen'}
      permitted={permittedSentences(state)}
      whoTitle="Who can freeze and unfreeze"
      who={who}
      footnote={footnote}
      onClose={onClose}
    />
  );
}

const AppComponent: React.FunctionComponent = () => {
  const [state, setState] = useState<ArticleLockRes | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.article.lock.GET({})
      .then(result => { setState(result as ArticleLockRes); })
      .catch((cause: unknown) => {
        setMessage('The app cannot read the freeze state: ' + String(cause));
        setMode('message');
      });
  }, []);

  useEffect(() => {
    reload = load;
    load();
  }, [load]);

  const closeDialog = useCallback(() => setMode('view'), []);
  const hidden = !!state && !state.enabled && !state.isLocked;
  useModalFrame(host, mode === 'info', hidden, closeDialog);

  const act = useCallback(async () => {
    if (!state) {
      return;
    }
    setBusy(true);
    try {
      const result = await api.article.lock.POST({locked: !state.isLocked});
      setState(result as ArticleLockRes);
      if (result.ok) {
        setMode('view');
      } else {
        setMessage(result.message);
        setMode('message');
      }
    } catch (cause: unknown) {
      setMessage('The app cannot change the freeze state: ' + String(cause));
      setMode('message');
    } finally {
      setBusy(false);
    }
  }, [state]);

  if (!state) {
    return <div className="line">{mode === 'message' ? message : ''}</div>;
  }
  if (hidden) {
    return null;
  }

  // In the modal mode the host makes the frame large. Show only the dialog
  // then, so that the status line does not appear at the top of the page.
  if (mode === 'info') {
    return <InfoDialog state={state} onClose={closeDialog}/>;
  }

  const verb = state.isLocked ? 'Unfreeze' : 'Freeze';

  return (
    <div className="line">
      {state.isLocked && (
        <LockIcon state={state} onClick={() => setMode(mode === 'confirm' ? 'view' : 'confirm')}/>
      )}

      {mode === 'confirm' && (
        <>
          <span>{verb + ' this article?'}</span>
          <Button primary loader={busy} disabled={busy} onClick={act}>{verb}</Button>
          <Button disabled={busy} onClick={() => setMode('view')}>{'Cancel'}</Button>
        </>
      )}

      {mode === 'message' && (
        <>
          <span>{message}</span>
          <Button inline onClick={() => setMode('view')}>{'Close'}</Button>
        </>
      )}

      {mode === 'view' && <StatusLine state={state} onToggle={() => setMode('confirm')}/>}

      <Button
        inline
        icon={infoIcon}
        title="Show what is permitted on this article"
        aria-label="Show what is permitted on this article"
        onClick={() => setMode('info')}
      />
    </div>
  );
};

export const App = memo(AppComponent);
