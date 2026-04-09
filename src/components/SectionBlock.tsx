import ReactMarkdown from 'react-markdown'

interface Props {
  index: number;
  title: string;
  body: string;
}

// Chevron icon — neutral, no directional implication for outcomes
function Chevron() {
  return (
    <svg className="iq-section__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SectionBlock({ index, title, body }: Props) {
  return (
    <details className="iq-section" open={index === 0}>
      <summary className="iq-section__header">
        <span className="iq-section__num">{index + 1}</span>
        <span className="iq-section__title">{title}</span>
        <Chevron />
      </summary>
      {body ? (
        <div className="iq-section__body iq-markdown">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      ) : (
        <p className="iq-section__unavailable">[Data unavailable for this section]</p>
      )}
    </details>
  );
}
