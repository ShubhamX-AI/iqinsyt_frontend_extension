import type { AppPhase } from '../shared/types.ts'
import type { ResearchProgressEvent } from '../api/types.ts'

interface Props {
  phase: AppPhase;
  stage: string | null;
  message: string | null;
  progress: ResearchProgressEvent[];
  onCancel: () => void;
}

function formatStage(stage: string): string {
  return stage
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

export default function StreamingStatus({ phase, stage, message, progress, onCancel }: Props) {
  const title = phase === 'connecting' ? 'Opening research stream...' : 'Research in progress';
  const detail = message ?? (phase === 'connecting'
    ? 'Waiting for backend confirmation.'
    : 'Running analysis pipeline.');
  const recentProgress = progress.slice(-6).reverse();

  return (
    <div className="iq-stream">
      <div className="iq-stream__hero">
        <div className="iq-loading__spinner iq-stream__spinner" />
        <p className="iq-stream__title">{title}</p>
        <p className="iq-stream__detail">{detail}</p>
        {stage && (
          <span className="iq-badge iq-badge--accent iq-stream__stage">{formatStage(stage)}</span>
        )}
      </div>

      {recentProgress.length > 0 && (
        <div className="iq-card iq-stream__timeline">
          {recentProgress.map((item, index) => (
            <div className="iq-stream__step" key={`${item.stage}-${item.request_id}-${index}`}>
              <span className="iq-stream__step-dot" aria-hidden="true" />
              <div>
                <p className="iq-stream__step-stage">{formatStage(item.stage)}</p>
                <p className="iq-stream__step-message">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="iq-btn iq-btn--ghost" onClick={onCancel}>
        Cancel analysis
      </button>
    </div>
  );
}
