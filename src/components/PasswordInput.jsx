import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Password field with a show/hide button inside it. Paste is never blocked, so password managers
// and pasted passwords keep working (WCAG 2.2 accessible authentication).
function PasswordInput({ id, className = 'form-input', ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input id={id} type={visible ? 'text' : 'password'} className={className} {...inputProps} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-controls={id}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}

export default PasswordInput;
