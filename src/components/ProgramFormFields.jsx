import { AlertCircle, Plus, Trash2 } from 'lucide-react';

const LEVELS = ['MSc', 'MBA', 'Master', 'PG Diploma', 'Research'];

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="program-field-error">
      <AlertCircle size={14} aria-hidden="true" />
      {message}
    </p>
  );
}

/**
 * The fields of the Add and Edit programme modals, in groups: Basics, Details, Dates, Specializations, Other.
 * `program` is the form state (see toProgramForm in AdminDashboard), `errors` maps a field name to a message.
 */
function ProgramFormFields({
  idPrefix,
  program,
  errors = {},
  onChange,
  onSpecializationChange,
  onAddSpecialization,
  onRemoveSpecialization
}) {
  const id = (name) => `${idPrefix}-${name}`;
  const errorProps = (name) => (errors[name]
    ? { 'aria-invalid': true, 'aria-describedby': `${id(name)}-error`, className: 'has-error' }
    : {});

  return (
    <>
      <fieldset className="program-form-group">
        <legend>Basics</legend>
        <div className="form-group-modal">
          <label htmlFor={id('title')}>Program title *</label>
          <input id={id('title')} type="text" name="title" value={program.title} onChange={onChange} required {...errorProps('title')} />
          <FieldError id={`${id('title')}-error`} message={errors.title} />
        </div>
        <div className="program-form-row">
          <div className="form-group-modal">
            <label htmlFor={id('shortCode')}>Short code *</label>
            <input id={id('shortCode')} type="text" name="shortCode" value={program.shortCode} onChange={onChange} placeholder="e.g. msc-cs" required {...errorProps('shortCode')} />
            <FieldError id={`${id('shortCode')}-error`} message={errors.shortCode} />
          </div>
          <div className="form-group-modal">
            <label htmlFor={id('level')}>Level</label>
            <select id={id('level')} name="level" value={program.level || 'MSc'} onChange={onChange}>
              {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group-modal">
          <label htmlFor={id('description')}>Description *</label>
          <textarea id={id('description')} name="description" value={program.description} onChange={onChange} rows="3" required />
        </div>
        <div className="form-group-modal">
          <label htmlFor={id('detailedDescription')}>Detailed description</label>
          <textarea id={id('detailedDescription')} name="detailedDescription" value={program.detailedDescription || ''} onChange={onChange} rows="5" />
        </div>
      </fieldset>

      <fieldset className="program-form-group">
        <legend>Details</legend>
        <div className="program-form-row">
          <div className="form-group-modal">
            <label htmlFor={id('duration')}>Duration</label>
            <input id={id('duration')} type="text" name="duration" value={program.duration || ''} onChange={onChange} placeholder="e.g. 2 years" />
          </div>
          <div className="form-group-modal">
            <label htmlFor={id('mode')}>Mode</label>
            <input id={id('mode')} type="text" name="mode" value={program.mode || ''} onChange={onChange} placeholder="e.g. Part-time — Saturdays and weekday evenings" />
          </div>
        </div>
        <div className="program-form-row">
          <div className="form-group-modal">
            <label htmlFor={id('slqfLevel')}>SLQF level</label>
            <input id={id('slqfLevel')} type="number" name="slqfLevel" min="7" max="12" value={program.slqfLevel ?? ''} onChange={onChange} />
          </div>
          <div className="form-group-modal">
            <label htmlFor={id('fee')}>Fee</label>
            <input id={id('fee')} type="text" name="fee" value={program.fee || ''} onChange={onChange} placeholder="e.g. Rs. 450,000 (in 4 instalments)" />
          </div>
        </div>
        <div className="form-group-modal">
          <label htmlFor={id('eligibilityText')}>Eligibility</label>
          <textarea
            id={id('eligibilityText')}
            name="eligibilityText"
            value={program.eligibilityText || ''}
            onChange={onChange}
            rows="4"
            aria-describedby={`${id('eligibilityText')}-hint`}
          />
          <p id={`${id('eligibilityText')}-hint`} className="program-field-hint">One requirement per line</p>
        </div>
      </fieldset>

      <fieldset className="program-form-group">
        <legend>Dates</legend>
        <div className="program-form-row">
          <div className="form-group-modal">
            <label htmlFor={id('deadline')}>Deadline (as shown) *</label>
            <input id={id('deadline')} type="text" name="deadline" value={program.deadline} onChange={onChange} placeholder="e.g. 31 March 2027" required />
          </div>
          <div className="form-group-modal">
            <label htmlFor={id('applicationDeadline')}>Application deadline date</label>
            <input
              id={id('applicationDeadline')}
              type="date"
              name="applicationDeadline"
              value={program.applicationDeadline || ''}
              onChange={onChange}
              aria-describedby={`${id('applicationDeadline')}-hint`}
            />
            <p id={`${id('applicationDeadline')}-hint`} className="program-field-hint">Used for the &quot;Closing soon&quot; badge and closing applications</p>
          </div>
        </div>
        <div className="form-group-modal">
          <label htmlFor={id('selectionExams')}>Selection exams / interviews</label>
          <input id={id('selectionExams')} type="text" name="selectionExams" value={program.selectionExams || ''} onChange={onChange} placeholder="e.g. 08th and 09th November 2026" />
        </div>
      </fieldset>

      <fieldset className="program-form-group">
        <legend>Specializations</legend>
        {(program.specializations || []).map((spec, index) => (
          <div key={index} className="specialization-input-group">
            <input
              type="text"
              value={spec.name}
              onChange={(e) => onSpecializationChange(index, 'name', e.target.value)}
              placeholder="Specialization name"
              aria-label={`Specialization ${index + 1}`}
            />
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => onRemoveSpecialization(index)} aria-label={`Remove specialization ${index + 1}`}>
              <Trash2 size={15} aria-hidden="true" />
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn--secondary btn--sm" onClick={onAddSpecialization}>
          <Plus size={16} aria-hidden="true" />
          Add specialization
        </button>
      </fieldset>

      <fieldset className="program-form-group">
        <legend>Other</legend>
        <div className="program-form-row">
          <div className="form-group-modal">
            <label htmlFor={id('resourcesCount')}>Resources count</label>
            <input id={id('resourcesCount')} type="number" name="resourcesCount" min="0" value={program.resourcesCount} onChange={onChange} />
          </div>
        </div>
        <label className="program-checkbox" htmlFor={id('isProposed')}>
          <input id={id('isProposed')} type="checkbox" name="isProposed" checked={Boolean(program.isProposed)} onChange={onChange} />
          Proposed / demo program (not currently offered)
        </label>
      </fieldset>
    </>
  );
}

export default ProgramFormFields;
