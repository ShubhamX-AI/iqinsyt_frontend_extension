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

  // Calculate progress percentage (simple: count of steps up to a max)
  const progressPercent = Math.min((progress.length / 12) * 100, 100);

  return (
    <div className="iq-stream">
      <div className="iq-card iq-card--hero iq-stream__hero">
        <p className="iq-stream__title">{title}</p>
        <p className="iq-stream__detail">{detail}</p>
        {stage && (
          <span className="iq-badge iq-badge--accent iq-stream__stage">{formatStage(stage)}</span>
        )}
      </div>

      <div className="iq-card iq-stream__progress-container">
        <div className="iq-stream__progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>

      <button className="iq-btn iq-btn--ghost" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
