import SectionBlock from './SectionBlock.tsx'
import type { InsightResponse, InsightSections } from '../api/types.ts'

interface Props {
  response?: InsightResponse;
  sections?: InsightSections;
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

export default function ResearchOutput({ response, sections: streamedSections }: Props) {
  const sections = response?.sections ?? streamedSections;

  if (!sections) return null;

  return (
    <div className="iq-result">
      <div className="iq-card iq-result__sections">
        {/* <div className="iq-research__meta">
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
        </div> */}

        {SECTIONS.map(({ key, label }, i) => (
          <SectionBlock
            key={key}
            index={i}
            title={label}
            body={sections[key]}
          />
        ))}
      </div>
    </div>
  );
}
