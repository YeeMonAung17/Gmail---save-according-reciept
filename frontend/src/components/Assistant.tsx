import { useEffect, useRef, useState } from 'react';
import { request } from '../api/client';
import { Icon } from './Icon';
import mascot from '../../../assets/logo-2-web.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [includeBudget, setIncludeBudget] = useState(false);
  const lock = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !busy) input.current?.focus();
  }, [open, busy]);
  useEffect(() => {
    if (open && log.current)
      log.current.scrollTop =
        messages.length || busy ? log.current.scrollHeight : 0;
  }, [open, messages, busy]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function send() {
    const question = draft.trim();
    if (!question || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const history = messages.slice(-10);
    const conversation: Message[] = [
      ...history.map((message) => ({
        ...message,
        content: message.content.slice(0, 1000),
      })),
      { role: 'user', content: question },
    ];
    try {
      const result = await request<{ reply: string }>('/assistant', 'POST', {
        messages: conversation,
        includeBudget,
      });
      setMessages([
        ...history,
        { role: 'user', content: question },
        { role: 'assistant', content: result.reply },
      ]);
      setDraft('');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The assistant could not reply. Please try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="assistant-widget">
      {open && (
        <section
          className="assistant-panel"
          id="assistant-panel"
          role="dialog"
          aria-labelledby="assistant-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="assistant-header">
            <img src={mascot} alt="" width={48} height={48} />
            <div>
              <h2 id="assistant-title">Your savings guide</h2>
              <p>Ask about RecurrSave</p>
            </div>
            <button
              className="assistant-close"
              type="button"
              aria-label="Close assistant"
              onClick={close}
            >
              ×
            </button>
          </div>
          <p className="assistant-privacy">
            Chat uses OpenRouter. Avoid personal or bank details.
          </p>
          <div className="assistant-sharing">
            <label className="check-label">
              <input
                id="assistant-share-budget"
                type="checkbox"
                checked={includeBudget}
                disabled={busy}
                onChange={(event) => {
                  setIncludeBudget(event.target.checked);
                  setMessages([]);
                  setError('');
                }}
              />
              Share my budget summary
            </label>
            <details>
              <summary>What is shared?</summary>
              <p className="hint">
                Shares budget totals, goal amounts and deadline, rules and
                streak. Receipt emails and transaction descriptions stay
                private.
              </p>
            </details>
          </div>
          <div
            className="assistant-messages"
            ref={log}
            role="log"
            aria-label="Assistant conversation"
            aria-live="polite"
            aria-relevant="additions"
          >
            <p className="assistant-message assistant">
              Gmail and Engine Spaces are simulated in this demo. I can explain
              the idea, help you find affordable savings and suggest rule
              changes. You decide what to change.
            </p>
            {messages.map((message, index) => (
              <p className={`assistant-message ${message.role}`} key={index}>
                <strong>{message.role === 'user' ? 'You' : 'Guide'}</strong>
                {message.content}
              </p>
            ))}
            {busy && (
              <>
                <p className="assistant-message user">
                  <strong>You</strong>
                  {draft}
                </p>
                <p role="status">Thinking…</p>
              </>
            )}
          </div>
          {messages.length === 0 && (
            <div className="assistant-prompts" aria-label="Suggested questions">
              {[
                [
                  'Explain idea',
                  'Explain how Gmail API + Engine Spaces works in this app.',
                ],
                [
                  'Help me save',
                  'Help me find one affordable way to save towards my goal.',
                ],
                [
                  'Suggest changes',
                  'Suggest an affordable savings rule change, explain its impact and how I can review it.',
                ],
              ].map(([label, question]) => (
                <button
                  className="assistant-prompt"
                  type="button"
                  key={label}
                  disabled={busy}
                  onClick={() => {
                    setDraft(question);
                    input.current?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {error && (
            <p className="assistant-error" role="alert">
              {error}
            </p>
          )}
          <form
            className="assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="assistant-question">Your question</label>
            <textarea
              id="assistant-question"
              ref={input}
              value={draft}
              maxLength={1000}
              rows={2}
              disabled={busy}
              required
              onChange={(event) => setDraft(event.target.value)}
              placeholder="How do receipt savings work?"
            />
            <button
              className="button primary"
              type="submit"
              disabled={busy || !draft.trim()}
            >
              {busy ? 'Waiting for reply…' : 'Send question'}
              <Icon name="arrow" size={17} />
            </button>
          </form>
        </section>
      )}
      <button
        ref={trigger}
        className="assistant-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="assistant-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <img src={mascot} alt="" width={48} height={48} />
        <span>{open ? 'Hide assistant' : 'Ask your guide'}</span>
      </button>
    </div>
  );
}
