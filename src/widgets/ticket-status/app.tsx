import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import infoIcon from '@jetbrains/icons/info';
import lockIcon from '@jetbrains/icons/lock';
import {createApi} from '@/api';
import type {TicketLockRes} from '@/backend/router/issue/lock/GET';
import {LockDialog} from '../shared/lock-dialog';
import {useModalFrame} from '../shared/use-modal-frame';
import {blockedSentences, permittedSentences, whoCanReopen} from './describe';

// The host can ask the widget to reload. The component sets this function.
let reload: () => void = () => {};

const host = await YTApp.register({onRefresh: () => reload()});
const api = createApi(host);

type Mode = 'view' | 'info' | 'message';

/**
 * The dialog that tells what the lock permits on this ticket.
 */
function InfoDialog({state, onClose}: {state: TicketLockRes; onClose: () => void}): React.ReactElement {
  if (!state.enabled) {
    return (
      <LockDialog
        title="The lock for tickets is off"
        intro="The lock for tickets is off in this project. A resolved ticket stays editable."
        blockedTitle="Not permitted when the lock is on"
        blocked={blockedSentences(state)}
        permittedTitle="Permitted when the lock is on"
        permitted={permittedSentences(state)}
        whoTitle="Who can reopen a locked ticket"
        who={[whoCanReopen(state)]}
        onClose={onClose}
      />
    );
  }
  return (
    <LockDialog
      title="This ticket is locked"
      intro="The ticket is resolved. A resolved ticket is read-only."
      blockedTitle="Not permitted"
      blocked={blockedSentences(state)}
      permittedTitle="Permitted"
      permitted={permittedSentences(state)}
      whoTitle="Who can reopen"
      who={[whoCanReopen(state)]}
      onClose={onClose}
    />
  );
}

const AppComponent: React.FunctionComponent = () => {
  const [state, setState] = useState<TicketLockRes | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    api.issue.lock.GET({})
      .then(result => { setState(result as TicketLockRes); })
      .catch((cause: unknown) => {
        setMessage('The app cannot read the lock state: ' + String(cause));
        setMode('message');
      });
  }, []);

  useEffect(() => {
    reload = load;
    load();
  }, [load]);

  const closeDialog = useCallback(() => setMode('view'), []);
  useModalFrame(host, mode === 'info', state === null && mode !== 'message', closeDialog);

  if (!state) {
    return <div className="line">{mode === 'message' ? message : ''}</div>;
  }

  // In the modal mode the host makes the frame large. Show only the dialog
  // then, so that the status line does not appear at the top of the page.
  if (mode === 'info') {
    return <InfoDialog state={state} onClose={closeDialog}/>;
  }

  return (
    <div className="line">
      {mode === 'message' && (
        <>
          <span>{message}</span>
          <Button inline onClick={() => setMode('view')}>{'Close'}</Button>
        </>
      )}

      {mode === 'view' && state.enabled && (
        <>
          <span className="icon lockIcon"><Icon glyph={lockIcon}/></span>
          <span>{'Ticket resolved and locked.'}</span>
        </>
      )}

      {mode === 'view' && !state.enabled && <span>{'Ticket locks are disabled in this project.'}</span>}

      <Button
        inline
        icon={infoIcon}
        title="Show what is permitted on this ticket"
        aria-label="Show what is permitted on this ticket"
        onClick={() => setMode('info')}
      />
    </div>
  );
};

export const App = memo(AppComponent);
