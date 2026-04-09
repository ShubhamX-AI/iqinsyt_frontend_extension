import type { DetectedEvent } from '../shared/types.ts'

interface Props {
  event: DetectedEvent;
  onAnalyse: () => void;
  onPickAnotherEvent: () => void;
  canPickAnotherEvent: boolean;
  loading?: boolean;
  showRerun?: boolean;
  onRerun?: () => void;
}

export default function EventCard({
  event,
  onAnalyse,
  onPickAnotherEvent,
  canPickAnotherEvent,
  loading = false,
  showRerun = false,
  onRerun,
}: Props) {
  const hasOutcomes = Boolean(event.outcomes?.length);

  return (
    <div className="iq-card iq-card--feature">
      <div className="iq-event-card__header">
        <p className="iq-event-card__label">Selected event</p>
        <div className="iq-event-card__meta">
          <span className="iq-badge iq-badge--accent">{event.source}</span>
          {event.volume ? (
            <span className="iq-badge">Vol {event.volume}</span>
          ) : null}
          {hasOutcomes ? (
            <span className="iq-badge">{event.outcomes!.length} outcomes</span>
          ) : null}
        </div>
      </div>
      <h2 className="iq-event-card__title">{event.title}</h2>
      <div className="iq-event-card__actions">
        <button className="iq-btn iq-btn--primary" onClick={showRerun ? onRerun : onAnalyse} disabled={loading}>
          {loading ? 'Analysing...' : showRerun ? 'Redo' : 'Analyse'}
        </button>
        {canPickAnotherEvent ? (
          <button className="iq-btn iq-btn--ghost" onClick={onPickAnotherEvent} disabled={loading}>
            Pick another event
          </button>
        ) : (
          <p className="iq-site-auth__notice">You are not authorized on this website.</p>
        )}
      </div>
    </div>
  );
}
