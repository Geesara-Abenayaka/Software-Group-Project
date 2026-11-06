import { useEffect, useRef } from 'react';
import { Pencil, X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "Check your application": every answer before the real submit. A modal dialog (full screen on phones):
 * focus starts on the title, Tab stays inside, Esc or Back closes it and focus returns to where it was.
 *
 * `sections` is `[{ key, title, groups: [{ heading?, rows: [[label, value], ...] }] }]`.
 */
function ReviewPanel({ subtitle, sections, note, onEdit, onClose, onSubmit }) {
  const panelRef = useRef(null);
  const titleRef = useRef(null);
  // The Esc handler below is set up once, so it reads the latest onClose from a ref.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement;
    titleRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className="review-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="review-panel" role="dialog" aria-modal="true" aria-labelledby="review-title" ref={panelRef}>
        <div className="review-panel__header">
          <div>
            <h2 id="review-title" className="review-panel__title" tabIndex={-1} ref={titleRef}>
              Check your application
            </h2>
            {subtitle && <p className="review-panel__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="review-panel__close" onClick={onClose} aria-label="Close review">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="review-panel__body">
          {sections.map((section) => (
            <section key={section.key} className="review-section" aria-labelledby={`review-${section.key}`}>
              <div className="review-section__header">
                <h3 id={`review-${section.key}`} className="review-section__title">{section.title}</h3>
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => onEdit(section.key)}
                  aria-label={`Edit ${section.title}`}
                >
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </button>
              </div>
              {section.groups.map((group, index) => (
                <div key={group.heading || index} className="review-group">
                  {group.heading && <h4 className="review-group__heading">{group.heading}</h4>}
                  <dl className="review-list">
                    {group.rows.map(([label, value]) => (
                      <div key={label} className="review-list__row">
                        <dt>{label}</dt>
                        <dd>{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="review-panel__footer">
          {note && <p className="review-panel__note">{note}</p>}
          <div className="review-panel__actions">
            <button type="button" className="btn btn--quiet" onClick={onClose}>Back to the form</button>
            <button type="button" className="btn btn--primary" onClick={onSubmit}>Submit application</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewPanel;
