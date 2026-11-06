import { useState } from 'react';
import { AlertCircle, Check, FileText, Loader2, UploadCloud, X } from 'lucide-react';

const formatFileSize = (bytes) => (
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
);

// The document check's state as a pill: a word and an icon, never colour alone.
const PILLS = {
  idle: { className: 'upload-pill--idle', label: 'Not checked yet', Icon: null },
  loading: { className: 'upload-pill--checking', label: 'Checking…', Icon: Loader2 },
  verified: { className: 'upload-pill--verified', label: 'Verified', Icon: Check },
  failed: { className: 'upload-pill--failed', label: 'Couldn’t verify — check the file', Icon: AlertCircle }
};

/**
 * A document field on the application form: a dashed drop zone with a real Browse button,
 * then one row per chosen file and the result of the automatic check.
 * Dragging a file onto the zone is only a shortcut; Browse (keyboard and touch) is the main way in.
 *
 * `verification` is `{ status: 'idle' | 'loading' | 'verified' | 'failed', message }`, or undefined
 * for documents that aren't checked.
 */
function UploadZone({
  id,
  label,
  hint,
  accept,
  multiple = false,
  files,
  inputRef,
  onFiles,
  onRemove,
  error,
  verification
}) {
  const [isDragging, setIsDragging] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const browseText = multiple ? 'Browse files' : 'Browse';
  const pill = verification && files.length > 0 ? PILLS[verification.status] || PILLS.idle : null;

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(event.dataTransfer.files || []);
    if (dropped.length > 0) {
      onFiles(dropped);
    }
  };

  return (
    <div className="upload-field">
      <p className="upload-field__label">
        {label}
        <span className="required-mark" aria-hidden="true">*</span>
      </p>

      <div
        className={`upload-zone${isDragging ? ' is-dragging' : ''}${error ? ' has-error' : ''}`}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud size={28} className="upload-zone__icon" aria-hidden="true" />
        <p className="upload-zone__text">Drag {multiple ? 'files' : 'a file'} here or</p>
        <button
          type="button"
          id={id}
          className="btn btn--secondary btn--sm"
          onClick={() => inputRef.current?.click()}
          aria-label={`${browseText} for ${label} (required)`}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        >
          {browseText}
        </button>
        <p className="upload-zone__hint" id={hintId}>{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            onFiles(Array.from(event.target.files || []));
            // Cleared so the same file can be chosen again after removing it.
            event.target.value = '';
          }}
          hidden
        />
      </div>

      {files.length > 0 && (
        <ul className="upload-files" aria-label={`Chosen files for ${label}`}>
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`} className="upload-file">
              <FileText size={18} className="upload-file__icon" aria-hidden="true" />
              <span className="upload-file__name" title={file.name}>{file.name}</span>
              <span className="upload-file__size">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="upload-file__remove"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Announced when the automatic check finishes */}
      <div className="upload-status" aria-live="polite">
        {pill && (
          <>
            <span className={`upload-pill ${pill.className}`}>
              {pill.Icon && (
                <pill.Icon size={14} className={verification.status === 'loading' ? 'upload-pill__spin' : undefined} aria-hidden="true" />
              )}
              {pill.label}
            </span>
            {verification.status === 'failed' && verification.message && (
              <span className="upload-status__message">{verification.message}</span>
            )}
          </>
        )}
      </div>

      {error && (
        <p id={errorId} className="field-error">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export default UploadZone;
