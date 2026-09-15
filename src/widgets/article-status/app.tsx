import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import Content from '@jetbrains/ring-ui-built/components/island/content';
import Header from '@jetbrains/ring-ui-built/components/island/header';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
import infoIcon from '@jetbrains/icons/info';
import lockIcon from '@jetbrains/icons/lock';
import {createApi} from '@/api';
import type {ArticleLockRes} from '@/backend/router/article/lock/GET';
import {blockedSentences, permittedSentences, whoCanFreeze, whoCanUnfreeze} from './describe';
import {relativeTime} from './relative-time';

/** The height of the status line, in pixels. */
const LINE_HEIGHT = 24;
/** The height that hides the widget when the lock for articles is off. */
const HIDDEN_HEIGHT = 1;
/** The width that the widget reports when it cannot measure itself. */
const FALLBACK_WIDTH = 600;
/** The time the widget waits for the message to render before it measures, in milliseconds. */
const MEASURE_DELAY_MS = 50;
/** A second measure, after the message has its final size. */
const SECOND_MEASURE_DELAY_MS = 300;
/** Space below the dialog so that its shadow is not cut, in pixels. */
const MESSAGE_MARGIN = 16;
/** A frame lower than this is the plain status line, not the modal frame. */
const SMALL_FRAME_HEIGHT = LINE_HEIGHT * 2;

// The host can ask the widget to reload. The component sets this function.
let reload: () => void = () => {};

const host = await YTApp.register({onRefresh: () => reload()});
const api = createApi(host);

type Mode = 'view' | 'confirm' | 'info' | 'message';

/**
 * Tells the host the height that the widget needs.
 *
 * @param height The height in pixels.
 */
function reportHeight(height: number): void {
  try {
    host.reportWidgetSize({width: document.body.clientWidth || FALLBACK_WIDTH, height});
  } catch (error) {
    console.warn('[lock] reportWidgetSize failed: ' + String(error));
  }
}

/**
 * Lets the widget draw outside its own frame, or ends that mode.
 *
 * The dialog is larger than the status line. The frame of the widget is one
 * line high, so the host must let the dialog go outside it.
 *
 * @param on True to enter the modal mode, false to leave it.
 */
function setModalMode(on: boolean): void {
  try {
    if (on) {
      host.enterModalMode();
    } else {
      host.exitModalMode();
    }
  } catch (error) {
    console.warn('[lock] modal mode failed: ' + String(error));
  }
}

/** The number of digits of a zero-padded date or time part. */
const TWO_DIGITS = 2;

function pad(value: number): string {
  return String(value).padStart(TWO_DIGITS, '0');
}

/**
 * Makes the ISO 8601 text of a moment, in the local time zone of the user.
 *
 * The text has no time zone and a space in place of the "T".
 *
 * @param timestamp The moment, as milliseconds since 1970-01-01T00:00Z.
 * @returns For example "2026-09-15 10:05:38".
 */
function isoTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

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
    return <span className="icon frozen"><Icon glyph={lockIcon}/></span>;
  }
  return (
    <Button
      inline
      icon={lockIcon}
      iconClassName="frozen"
      title="Unfreeze the article"
      aria-label="Unfreeze the article"
      onClick={onClick}
    />
  );
}

type StatusProps = {
  state: ArticleLockRes;
  onFreeze: () => void;
};

/**
 * The status text. An editable article gets an inline button to freeze it.
 */
function StatusLine({state, onFreeze}: StatusProps): React.ReactElement {
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
        {state.enabled ? '' : '. The lock for articles is off in this project.'}
      </span>
    );
  }
  if (!state.canLock) {
    return <span>{'Editable.'}</span>;
  }
  return (
    <span>
      {'Editable. '}
      <Button inline onClick={onFreeze}>{'Freeze article'}</Button>
      {'.'}
    </span>
  );
}

type DialogProps = {
  state: ArticleLockRes;
  onClose: () => void;
};

/**
 * The dialog that tells what the lock permits on this article.
 *
 * The dialog has a title and a Close button.
 */
function InfoDialog({state, onClose}: DialogProps): React.ReactElement {
  const title = state.isLocked ? 'This article is frozen' : 'This article is editable';
  const intro = state.isLocked
    ? 'A frozen article is read-only.'
    : 'When you freeze the article, it becomes read-only.';
  return (
    <Dialog show label={title} onCloseAttempt={onClose} showCloseButton>
      <Header>{title}</Header>
      <Content>
        <div className="messageBody">
          <p>{intro}</p>
          <p className="heading">{state.isLocked ? 'Not permitted' : 'Not permitted when frozen'}</p>
          <ul>{blockedSentences(state).map(line => <li key={line}>{line}</li>)}</ul>
          <p className="heading">{state.isLocked ? 'Permitted' : 'Permitted when frozen'}</p>
          <ul>{permittedSentences(state).map(line => <li key={line}>{line}</li>)}</ul>
          <p className="heading">{'Who can freeze and unfreeze'}</p>
          {!state.isLocked && <p>{whoCanFreeze(state)}</p>}
          <p>{whoCanUnfreeze(state)}</p>
          {state.isLocked && state.lockedAt > 0 && (
            <p>{'Frozen by ' + (state.lockedByName || 'an unknown user') + ' on ' +
              new Date(state.lockedAt).toLocaleString(YTApp.locale) + '.'}</p>
          )}
        </div>
      </Content>
      <Panel>
        <Button primary onClick={onClose}>{'Close'}</Button>
      </Panel>
    </Dialog>
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

  // The dialog is larger than the status line. The frame of the widget is
  // one line high, so the widget enters the modal mode of the host while the
  // dialog is open, and also reports the height it needs.
  useEffect(() => {
    if (state && !state.enabled && !state.isLocked) {
      reportHeight(HIDDEN_HEIGHT);
      return undefined;
    }
    if (mode !== 'info') {
      reportHeight(LINE_HEIGHT);
      return undefined;
    }
    setModalMode(true);
    const measure = () => {
      const needed = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      reportHeight(needed + MESSAGE_MARGIN);
    };
    const first = window.setTimeout(measure, MEASURE_DELAY_MS);
    const second = window.setTimeout(measure, SECOND_MEASURE_DELAY_MS);

    // A click outside the dialog makes the host leave the modal mode on its
    // own. The frame then shrinks to one line. Close the dialog when that
    // happens, or it would stay open inside the small frame.
    let frameGrew = false;
    const onResize = () => {
      if (window.innerHeight > SMALL_FRAME_HEIGHT) {
        frameGrew = true;
      } else if (frameGrew) {
        setMode('view');
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.removeEventListener('resize', onResize);
      setModalMode(false);
    };
  }, [mode, state]);

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
  if (!state.enabled && !state.isLocked) {
    return null;
  }

  const verb = state.isLocked ? 'Unfreeze' : 'Freeze';

  // In the modal mode the host makes the frame large. Show only the dialog
  // then, so that the status line does not appear at the top of the page.
  if (mode === 'info') {
    return <InfoDialog state={state} onClose={() => setMode('view')}/>;
  }

  return (
    <div>
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

        {mode === 'view' && <StatusLine state={state} onFreeze={() => setMode('confirm')}/>}

        <Button
          inline
          icon={infoIcon}
          title="Show what is permitted on this article"
          aria-label="Show what is permitted on this article"
          onClick={() => setMode('info')}
        />
      </div>
    </div>
  );
};

export const App = memo(AppComponent);
