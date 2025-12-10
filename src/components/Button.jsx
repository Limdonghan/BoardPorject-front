import "./Button.css";

const Button = ({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${
        fullWidth ? "btn-full-width" : ""
      }`}
      disabled={disabled}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
