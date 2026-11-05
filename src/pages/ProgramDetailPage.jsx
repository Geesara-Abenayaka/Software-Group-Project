import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  FileText,
  Link as LinkIcon,
  Lock
} from 'lucide-react';
import '../styles/ProgramDetailPage.css';
import { generateCourseDetailsPDF, generateCallForApplicationPDF } from '../utils/pdfGenerator';
import API_BASE_URL from '../utils/apiConfig';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { Skeleton } from '../components/Loaders';
import useDelayedFlag from '../utils/useDelayedFlag';
import { getDaysLeft, getToday } from '../utils/deadline';
import usePageTitle from '../utils/usePageTitle';

const CONTACT_EMAIL = 'adeeshaw@cse.mrt.ac.lk';

const RESOURCE_ICONS = { pdf: FileText, form: ClipboardList, link: LinkIcon };

// What a resource card does, or null when nothing is wired up for it yet.
const getResourceAction = (resource) => {
  if (resource.name === 'Online Application' || resource.type === 'form') return 'apply';
  if (resource.type === 'pdf' && resource.name.includes('Course Details')) return 'course-details';
  if (resource.type === 'pdf' && resource.name.includes('Call for Application')) return 'call-for-application';
  return null;
};

// 2026-11-05 → 5 November 2026
const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

function ProgramDetailPage() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hasCompleteProgramData = (programData) => {
    if (!programData) {
      return false;
    }

    return Boolean(
      programData.detailedDescription &&
      Array.isArray(programData.resources) &&
      programData.resources.length > 0 &&
      programData.deadlines &&
      programData.deadlines.application
    );
  };

  const initialProgram = location.state?.program?.shortCode === shortCode
    ? location.state.program
    : null;
  const [program, setProgram] = useState(initialProgram);
  usePageTitle(program?.title);
  const [loading, setLoading] = useState(!initialProgram);
  const [error, setError] = useState(null);
  const showSkeleton = useDelayedFlag(loading);
  const [applicationWindow, setApplicationWindow] = useState(null);
  const [today] = useState(getToday);

  useEffect(() => {
    const nextInitialProgram = location.state?.program?.shortCode === shortCode
      ? location.state.program
      : null;

    setProgram(nextInitialProgram);
    setLoading(!nextInitialProgram);
    setError(null);
    if (!hasCompleteProgramData(nextInitialProgram)) {
      fetchProgramDetails(nextInitialProgram);
    }
  }, [shortCode, location.state]);

  // Whether the program takes applications today (the server's rule: Settings period and deadlines)
  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/programs/${encodeURIComponent(shortCode)}/application-window`)
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result.success) {
          setApplicationWindow({ shortCode, ...result.data });
        }
      })
      .catch(() => {
        // Fall back to the program's own deadline below
      });

    return () => {
      cancelled = true;
    };
  }, [shortCode]);

  const fetchProgramDetails = async (prefetchedProgram = null) => {
    try {
      if (!prefetchedProgram) {
        setLoading(true);
      }

      const response = await fetch(`${API_BASE_URL}/programs/${shortCode}`);
      const data = await response.json();

      if (data.success) {
        setProgram(data.data);
      } else {
        setError('Program not found');
      }
    } catch (err) {
      console.error('Error fetching program details:', err);
      setError('Failed to load program details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    navigate('/apply', { state: { program: program.shortCode, programName: program.title } });
  };

  const handleResourceClick = (resource) => {
    const action = getResourceAction(resource);

    if (action === 'apply') {
      handleApply();
    } else if (action === 'course-details') {
      generateCourseDetailsPDF(program);
    } else if (action === 'call-for-application') {
      generateCallForApplicationPDF(program);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <SiteHeader showAdminLogin />

        <main className="content-area" id="main" tabIndex={-1} aria-busy="true">
          <div className={`program-page skeleton-on-page${showSkeleton ? '' : ' skeleton-wait'}`} aria-hidden="true">
            <Skeleton className="skeleton-text" style={{ width: '110px', margin: '8px 0 32px' }} />
            <div className="program-layout">
              <div className="program-title-block">
                <Skeleton className="skeleton-text" style={{ width: '90px' }} />
                <Skeleton className="skeleton-title" style={{ width: '45%', height: '36px', marginBottom: '6px' }} />
                <div className="detail-title-divider"></div>
              </div>

              <div className="program-main">
                <div className="detail-description">
                  {['96%', '100%', '62%'].map((width) => (
                    <Skeleton key={width} className="skeleton-text" style={{ width, height: '14px' }} />
                  ))}
                </div>
                <Skeleton className="skeleton-title" style={{ width: '160px' }} />
                <div className="specialization-cards">
                  {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} style={{ height: '58px', borderRadius: 'var(--radius)' }} />
                  ))}
                </div>
              </div>

              <div className="program-aside">
                <div className="facts-card">
                  <Skeleton className="skeleton-text" style={{ width: '80px' }} />
                  {['70%', '50%', '90%', '40%'].map((width) => (
                    <Skeleton key={width} className="skeleton-text" style={{ width }} />
                  ))}
                  <Skeleton className="skeleton-button" style={{ marginTop: '8px' }} />
                  <Skeleton className="skeleton-button" style={{ marginTop: 0 }} />
                </div>
              </div>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="app">
        <SiteHeader showAdminLogin />

        <main className="content-area" id="main" tabIndex={-1}>
          <div className="error-container">
            <h2>Error</h2>
            <p>{error || 'Program not found'}</p>
            <Link to="/" className="program-btn program-btn--secondary program-btn--inline">
              Back to all programs
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const windowInfo = applicationWindow?.shortCode === shortCode ? applicationWindow : null;
  const deadlineDate = program.applicationDeadline || windowInfo?.deadline || null;
  const daysLeft = getDaysLeft(deadlineDate, today);
  // Use the server's answer when it arrived; otherwise only the program's own deadline can close it
  const isClosed = windowInfo ? !windowInfo.open : daysLeft !== null && daysLeft < 0;
  const applyBy = program.applicationDeadline
    ? program.deadlines?.application || program.deadline
    : windowInfo?.deadline
      ? formatDate(windowInfo.deadline)
      : program.deadlines?.application || program.deadline;
  const daysLeftText = isClosed || daysLeft === null
    ? ''
    : daysLeft === 0 ? 'Closes today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  const facts = [
    ['Level', program.level],
    ['Duration', program.duration],
    ['Mode', program.mode],
    ['SLQF', program.slqfLevel],
    ['Fee', program.fee]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

  const specializations = program.specializations || [];
  const eligibility = Array.isArray(program.eligibility) ? program.eligibility.filter(Boolean) : [];
  const keyDates = [
    { label: 'Apply by', value: applyBy, isDone: daysLeft !== null && daysLeft < 0 },
    { label: 'Selection test / interview', value: program.deadlines?.selectionExams, isDone: false }
  ].filter((item) => item.value);

  const applyButton = isClosed ? (
    <button type="button" className="program-btn program-btn--primary" disabled>
      <Lock size={16} aria-hidden="true" /> Applications closed
    </button>
  ) : (
    <button type="button" className="program-btn program-btn--primary" onClick={handleApply}>
      Apply Now
    </button>
  );

  return (
    <div className="app">
      <SiteHeader showAdminLogin />

      <main className="content-area" id="main" tabIndex={-1}>
        <div className="program-page">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} aria-hidden="true" /> All programs
          </Link>

          <div className="program-layout">
            <div className="program-title-block">
              {(program.level || program.slqfLevel) && (
                <p className="program-eyebrow">
                  {[program.level, program.slqfLevel && `SLQF ${program.slqfLevel}`].filter(Boolean).join(' · ')}
                </p>
              )}
              <h1 className="detail-title">{program.title}</h1>
              <div className="detail-title-divider"></div>
            </div>

            {/* Before the main column, so Tab reaches Apply Now first; the grid still puts it on the right */}
            <aside className="program-aside" aria-label="Key facts">
              <div className="facts-card">
                {program.isProposed && (
                  <div>
                    <span className="badge badge--proposed facts-card__badge">Proposed</span>
                    <p className="facts-card__note">
                      This program is shown for demonstration and is not currently offered.
                    </p>
                  </div>
                )}

                {facts.length > 0 && (
                  <>
                    <h2 className="facts-card__title">Key facts</h2>
                    <dl className="facts-list">
                      {facts.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}

                <div className="facts-card__deadline">
                  <CalendarDays size={18} aria-hidden="true" />
                  <div>
                    <span className="facts-card__label">Apply by</span>
                    <span className="facts-card__date">{applyBy}</span>
                    {daysLeftText && <span className="facts-card__days">{daysLeftText}</span>}
                  </div>
                </div>

                {applyButton}
                {isClosed && (
                  <p className="facts-card__note">
                    {windowInfo?.message || 'The application deadline has passed.'} Contact{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> for the next intake.
                  </p>
                )}

                <button
                  type="button"
                  className="program-btn program-btn--secondary"
                  onClick={() => generateCourseDetailsPDF(program)}
                >
                  <Download size={16} aria-hidden="true" /> Course details (PDF)
                </button>
              </div>
            </aside>

            <div className="program-main">
              <p className="detail-description">{program.detailedDescription || program.description}</p>

              {specializations.length > 0 && (
                <section className="program-section">
                  <h2 className="program-section__title">Specializations</h2>
                  <ul className="specialization-cards">
                    {specializations.map((spec) => (
                      <li key={spec.name} className="specialization-card">
                        <span className="specialization-card__icon"><BookOpen size={16} aria-hidden="true" /></span>
                        {spec.name}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {eligibility.length > 0 && (
                <section className="program-section">
                  <h2 className="program-section__title">Who can apply</h2>
                  <ul className="eligibility-list">
                    {eligibility.map((item) => (
                      <li key={item}>
                        <Check size={18} aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {keyDates.length > 0 && (
                <section className="program-section">
                  <h2 className="program-section__title">Key dates</h2>
                  <ol className="key-dates">
                    {keyDates.map((item) => (
                      <li key={item.label} className={item.isDone ? 'is-done' : undefined}>
                        <span className="key-dates__label">{item.label}</span>
                        <span className="key-dates__value">{item.value}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {program.resources?.length > 0 && (
                <section className="program-section">
                  <h2 className="program-section__title">Resources</h2>
                  <div className="resources-grid">
                    {program.resources.map((resource) => {
                      const action = getResourceAction(resource);
                      const isDisabled = !action || (action === 'apply' && isClosed);
                      const Icon = RESOURCE_ICONS[resource.type] || FileText;
                      let hint = 'Coming soon';
                      if (action === 'apply') {
                        hint = isClosed ? 'Applications closed' : 'Open form';
                      } else if (action) {
                        hint = resource.fileSize ? `Download PDF · ${resource.fileSize}` : 'Download PDF';
                      }

                      return (
                        <button
                          key={resource._id || resource.name}
                          type="button"
                          className="resource-card"
                          disabled={isDisabled}
                          onClick={() => handleResourceClick(resource)}
                        >
                          <span className="resource-icon"><Icon size={22} aria-hidden="true" /></span>
                          <span className="resource-content">
                            <span className="resource-name">{resource.name}</span>
                            <span className="resource-size">{hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

          </div>
        </div>

        {/* Phones and tablets: the deadline and Apply stay at the bottom of the screen */}
        <div className="apply-bar">
          <div className="apply-bar__deadline">
            <span className="facts-card__label">Apply by</span>
            <span className="apply-bar__date">{applyBy}</span>
          </div>
          {isClosed ? (
            <button type="button" className="program-btn program-btn--primary apply-bar__btn" disabled>
              <Lock size={16} aria-hidden="true" /> Closed
            </button>
          ) : (
            <button type="button" className="program-btn program-btn--primary apply-bar__btn" onClick={handleApply}>
              Apply Now
            </button>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default ProgramDetailPage;
