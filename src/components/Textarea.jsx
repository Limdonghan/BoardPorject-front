import "./Textarea.css";

const Textarea = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  rows = 5,
  ...props
}) => {
  return (
    <div className="textarea-wrapper">
      {label && (
        <label className="textarea-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        className={`textarea ${error ? "textarea-error" : ""}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        {...props}
      />
      {error && <span className="textarea-error-message">{error}</span>}
    </div>
  );
};

export default Textarea;
