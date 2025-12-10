import "./Input.css";

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  required = false,
  ...props
}) => {
  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        type={type}
        className={`input ${error ? "input-error" : ""}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;
