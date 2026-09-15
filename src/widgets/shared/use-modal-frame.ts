import {useEffect} from 'react';
import type {HostAPI} from '../../../@types/globals';

/** The height of a status line, in pixels. */
export const LINE_HEIGHT = 24;
/** The height that hides a widget. */
export const HIDDEN_HEIGHT = 1;
/** The width that a widget reports when it cannot measure itself. */
const FALLBACK_WIDTH = 600;
/** The time the widget waits for the dialog to render before it measures, in milliseconds. */
const MEASURE_DELAY_MS = 50;
/** A second measure, after the dialog has its final size. */
const SECOND_MEASURE_DELAY_MS = 300;
/** Space below the dialog so that its shadow is not cut, in pixels. */
const DIALOG_MARGIN = 16;
/** A frame lower than this is the plain status line, not the modal frame. */
const SMALL_FRAME_HEIGHT = LINE_HEIGHT * 2;

/**
 * Tells the host the height that the widget needs.
 *
 * @param host The host API of the widget.
 * @param height The height in pixels.
 */
export function reportHeight(host: HostAPI, height: number): void {
  try {
    host.reportWidgetSize({width: document.body.clientWidth || FALLBACK_WIDTH, height});
  } catch (error) {
    console.warn('[lock] reportWidgetSize failed: ' + String(error));
  }
}

/**
 * Lets the widget draw outside its own frame, or ends that mode.
 *
 * @param host The host API of the widget.
 * @param on True to enter the modal mode, false to leave it.
 */
function setModalMode(host: HostAPI, on: boolean): void {
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

/**
 * Keeps the frame of the widget in step with its content.
 *
 * The status line is one line high. A dialog is larger, so the widget enters
 * the modal mode of the host while the dialog is open, and reports the height
 * it needs. A click outside the dialog makes the host leave the modal mode on
 * its own; the frame then shrinks, and the hook calls `onHostClosed`.
 *
 * @param host The host API of the widget.
 * @param dialogOpen True while the dialog is open.
 * @param hidden True when the widget must take no space.
 * @param onHostClosed Called when the host leaves the modal mode on its own.
 */
export function useModalFrame(
  host: HostAPI,
  dialogOpen: boolean,
  hidden: boolean,
  onHostClosed: () => void
): void {
  useEffect(() => {
    if (hidden) {
      reportHeight(host, HIDDEN_HEIGHT);
      return undefined;
    }
    if (!dialogOpen) {
      reportHeight(host, LINE_HEIGHT);
      return undefined;
    }
    setModalMode(host, true);
    const measure = () => {
      const needed = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      reportHeight(host, needed + DIALOG_MARGIN);
    };
    const first = window.setTimeout(measure, MEASURE_DELAY_MS);
    const second = window.setTimeout(measure, SECOND_MEASURE_DELAY_MS);

    let frameGrew = false;
    const onResize = () => {
      if (window.innerHeight > SMALL_FRAME_HEIGHT) {
        frameGrew = true;
      } else if (frameGrew) {
        onHostClosed();
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.removeEventListener('resize', onResize);
      setModalMode(host, false);
    };
  }, [host, dialogOpen, hidden, onHostClosed]);
}
