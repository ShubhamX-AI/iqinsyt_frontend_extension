interface Props {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export default function ErrorState({ message, onDismiss, onRetry }: Props) {
  return (
    <div className="iq-error">
      <div className="iq-error__icon" aria-hidden="true">⚠</div>
      <p className="iq-error__message">{message}</p>
      <div className="iq-error__actions">
        {onRetry && (
          <button className="iq-btn iq-btn--primary" onClick={onRetry}>
            Retry analysis
          </button>
        )}
        <button className="iq-btn iq-btn--ghost" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
