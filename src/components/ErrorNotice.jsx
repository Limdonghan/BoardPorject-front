import "./ErrorNotice.css";

export default function ErrorNotice({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="error-notice" role="alert" aria-live="polite">
      <div className="error-notice__message">{message}</div>
      {onClose ? (
        <button className="error-notice__close" onClick={onClose} type="button">
          닫기
        </button>
      ) : null}
    </div>
  );
}
