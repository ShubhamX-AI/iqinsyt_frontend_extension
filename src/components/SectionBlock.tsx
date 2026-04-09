import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { deepDown } from '../api/client.ts'

interface Props {
  index: number;
  title: string;
  body: string;
}

function ChevronIcon() {
  return (
    <svg className="iq-section__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DrillIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 5.5v4M5.5 7.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type View = 'main' | 'deepdown';

export default function SectionBlock({ index, title, body }: Props) {
  const [view, setView] = useState<View>('main');
  const [deepDownResult, setDeepDownResult] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  function resetDeepDownState() {
    setView('main');
    setDeepDownResult(null);
    setStreamedText('');
    setLoading(false);
    setError(null);
  }

  function abortActiveRequest() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      abortActiveRequest();
    };
  }, []);

  useEffect(() => {
    abortActiveRequest();
    resetDeepDownState();
  }, [title, body]);

  async function handleDeepDownClick(e: React.MouseEvent) {
    // Prevent the click from toggling the <details> open/closed
    e.stopPropagation();
    e.preventDefault();

    if (view === 'deepdown') {
      abortActiveRequest();
      setStreamedText('');
      setLoading(false);
      setView('main');
      return;
    }

    // Already have a result — just flip to deepdown view
    if (deepDownResult) {
      setView('deepdown');
      return;
    }

    setView('deepdown');
    setStreamedText('');
    setError(null);
    setLoading(true);

    abortActiveRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await deepDown(title, body, {
        signal: controller.signal,
        onDelta: (delta) => {
          if (!isMountedRef.current || abortControllerRef.current !== controller) return;
          setStreamedText((prev) => prev + delta);
        },
      });

      if (!isMountedRef.current || abortControllerRef.current !== controller) return;

      abortControllerRef.current = null;
      setDeepDownResult(result);
      setStreamedText('');
    } catch (err) {
      if (!isMountedRef.current) return;

      if (err instanceof DOMException && err.name === 'AbortError') {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setStreamedText('');
        setLoading(false);
        setView('main');
        return;
      }

      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setError('Deep analysis failed. Try again.');
      setView('main');
    } finally {
      if (isMountedRef.current) {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setLoading(false);
      }
    }
  }

  const isDeepDown = view === 'deepdown';
  const displayedDeepText = deepDownResult ?? streamedText;

  return (
    <details className="iq-section" open={index === 0}>
      <summary className="iq-section__header">
        <span className="iq-section__num">{index + 1}</span>
        <span className="iq-section__title">{title}</span>

        {body && (
          <button
            className={`iq-section__dd-btn${isDeepDown ? ' iq-section__dd-btn--active' : ''}`}
            onClick={handleDeepDownClick}
            title={isDeepDown ? 'Back to summary' : 'Deep Down — analyse this section further'}
            aria-label={isDeepDown ? `Close Deep Down for ${title}` : `Deep Down into ${title}`}
          >
            {loading ? (
              <span className="iq-section__dd-spinner" aria-hidden="true" />
            ) : isDeepDown ? (
              <CloseIcon />
            ) : (
              <DrillIcon />
            )}
          </button>
        )}

        <ChevronIcon />
      </summary>

      {/* ── Main view ── */}
      {!isDeepDown && (
        body ? (
          <div className="iq-section__body iq-markdown">
            {error && <p className="iq-section__dd-error">{error}</p>}
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        ) : (
          <p className="iq-section__unavailable">[Data unavailable for this section]</p>
        )
      )}

      {/* ── Deep Down view ── */}
      {isDeepDown && (
        <div className="iq-section__body iq-section__dd-result iq-markdown">
          {displayedDeepText ? (
            <>
              <ReactMarkdown>{displayedDeepText}</ReactMarkdown>
              {loading && <span className="iq-section__dd-cursor" aria-hidden="true" />}
            </>
          ) : loading ? (
            <p className="iq-section__dd-loading">Analysing…</p>
          ) : null}
        </div>
      )}
    </details>
  );
}
