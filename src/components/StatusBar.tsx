import { useAppContext } from '../sidepanel/context.tsx'

const STATE_LABELS: Record<string, string> = {
  idle:     'Ready',
  picking:  'Waiting for selection',
  detected: 'Event selected',
  manual:   'Enter manually',
  loading:  'Analysing...',
  result:   'Done',
  error:    'Error',
};

interface StatusBarProps {
  onClose: () => void;
}

export default function StatusBar({ onClose }: StatusBarProps) {
  const { state } = useAppContext();
  const { phase } = state;

  return (
    <header className="iq-status-bar">
      <button className="iq-status-bar__close" onClick={onClose} aria-label="Close panel">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <span className="iq-status-bar__brand">IQinsyt</span>
      <div className="iq-status-bar__state">
        {phase === 'loading' ? (
          <span className="iq-spinner" aria-hidden="true" />
        ) : (
          <span className={`iq-dot ${phase === 'detected' || phase === 'result' ? 'iq-dot--active' : ''}`} />
        )}
        <span>{STATE_LABELS[phase]}</span>
      </div>
    </header>
  );
}
