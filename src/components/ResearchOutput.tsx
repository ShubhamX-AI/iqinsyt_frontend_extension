import SectionBlock from './SectionBlock.tsx'
import type { InsightResponse, InsightSections } from '../api/types.ts'

interface Props {
  response: InsightResponse;
  onRerun: () => void;
}

// Display labels in the order architecture.md specifies
const SECTIONS: { key: keyof InsightSections; label: string }[] = [
  { key: 'eventSummary',      label: 'Event Summary' },
  { key: 'keyVariables',      label: 'Key Variables' },
  { key: 'historicalContext', label: 'Historical Context' },
  { key: 'currentDrivers',    label: 'Current Drivers' },
  { key: 'riskFactors',       label: 'Risk Factors' },
  { key: 'dataConfidence',    label: 'Data Confidence' },
  { key: 'dataGaps',          label: 'Data Gaps' },
];

export default function ResearchOutput({ response, onRerun }: Props) {
  const { sections, cached, cachedAt, dataRetrievalAvailable, generatedAt, requestId } = response;

  return (
    <div>
      <div className="iq-research__meta">
        {cached && (
          <span className="iq-badge iq-badge--accent">
            Cached{cachedAt ? ` · ${new Date(cachedAt).toLocaleDateString()}` : ''}
          </span>
        )}
        {!dataRetrievalAvailable && (
          <span className="iq-badge">Data retrieval unavailable</span>
        )}
        <span className="iq-badge">
          Generated {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="iq-badge">Req {requestId.slice(0, 8)}</span>
      </div>

      <div className="iq-card">
        {SECTIONS.map(({ key, label }, i) => (
          <SectionBlock
            key={key}
            index={i}
            title={label}
            body={sections[key]}
          />
        ))}
      </div>

      <button className="iq-btn iq-btn--ghost" style={{ marginTop: 10 }} onClick={onRerun}>
        Re-run analysis
      </button>
    </div>
  );
}
