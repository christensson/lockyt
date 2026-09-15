import React from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import Content from '@jetbrains/ring-ui-built/components/island/content';
import Header from '@jetbrains/ring-ui-built/components/island/header';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';

export type LockDialogProps = {
  title: string;
  intro: string;
  blockedTitle: string;
  blocked: string[];
  permittedTitle: string;
  permitted: string[];
  whoTitle: string;
  who: string[];
  footnote?: string;
  onClose: () => void;
};

/**
 * The dialog that tells what a lock permits on a ticket or an article.
 *
 * The dialog has a title, three short lists and a Close button.
 */
export function LockDialog(props: LockDialogProps): React.ReactElement {
  return (
    <Dialog show label={props.title} onCloseAttempt={props.onClose} showCloseButton>
      <Header>{props.title}</Header>
      <Content>
        <div className="messageBody">
          <p>{props.intro}</p>
          <p className="heading">{props.blockedTitle}</p>
          <ul>{props.blocked.map(line => <li key={line}>{line}</li>)}</ul>
          <p className="heading">{props.permittedTitle}</p>
          <ul>{props.permitted.map(line => <li key={line}>{line}</li>)}</ul>
          <p className="heading">{props.whoTitle}</p>
          {props.who.map(line => <p key={line}>{line}</p>)}
          {props.footnote && <p>{props.footnote}</p>}
        </div>
      </Content>
      <Panel>
        <Button primary onClick={props.onClose}>{'Close'}</Button>
      </Panel>
    </Dialog>
  );
}
