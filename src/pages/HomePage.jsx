import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarDays, Check, GraduationCap, Search } from 'lucide-react';
import API_BASE_URL from '../utils/apiConfig';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import DeadlineBadge from '../components/DeadlineBadge';
import { ProgramCardSkeleton, TopProgressBar } from '../components/Loaders';
import useDelayedFlag from '../utils/useDelayedFlag';
import { getDaysLeft, getToday } from '../utils/deadline';

const VISIBLE_SPECIALIZATIONS = 3;

// "Closing soonest" order: open programs by days left, then those without a date, then closed ones.
const getDeadlineRank = (program, today) => {
  const daysLeft = getDaysLeft(program.applicationDeadline, today);
  if (daysLeft === null) return 100000;
  return daysLeft < 0 ? 200000 : daysLeft;
};

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to get cached programs from sessionStorage
  const getCachedPrograms = () => {
    try {
      const cached = sessionStorage.getItem('programs');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const cachedPrograms = getCachedPrograms();
  const [programs, setPrograms] = useState(cachedPrograms || []);
  const [loading, setLoading] = useState(!cachedPrograms);
  const [error, setError] = useState(null);
  const [openingProgram, setOpeningProgram] = useState(null);
  const showSkeletons = useDelayedFlag(loading);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All');
  const [sortBy, setSortBy] = useState('deadline');
  const [expandedProgram, setExpandedProgram] = useState(null); // _id of the card showing all specializations
  const [today] = useState(getToday);

  // Only levels that have a program get a chip
  const levels = ['All', ...new Set(programs.map((program) => program.level).filter(Boolean))];

  const visiblePrograms = useMemo(() => {
    const text = query.trim().toLowerCase();

    return programs
      .filter((program) => level === 'All' || program.level === level)
      .filter((program) => {
        if (!text) return true;
        const haystack = [
          program.title,
          program.description,
          ...(program.specializations || []).map((spec) => spec.name)
        ].join(' ').toLowerCase();
        return haystack.includes(text);
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return getDeadlineRank(a, today) - getDeadlineRank(b, today);
      });
  }, [programs, query, level, sortBy, today]);

  const clearFilters = () => {
    setQuery('');
    setLevel('All');
  };

  useEffect(() => {
    // Show cached programs straight away, but always refresh them so programs
    // added or changed in the admin panel appear without opening a new tab.
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setError(null);
      // Only show the placeholders when there is nothing cached to show yet
      if (!cachedPrograms) {
        setLoading(true);
      }
      const response = await fetch(`${API_BASE_URL}/programs`);
      const data = await response.json();

      if (data.success) {
        setPrograms(data.data);
        // Cache programs in sessionStorage
        sessionStorage.setItem('programs', JSON.stringify(data.data));
      } else if (!cachedPrograms) {
        setError('Failed to load programs');
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
      if (!cachedPrograms) {
        setError('Failed to connect to server');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (program) => {
    try {
      setOpeningProgram(program.shortCode);

      const response = await fetch(`${API_BASE_URL}/programs/${program.shortCode}`);
      const data = await response.json();

      navigate(`/programs/${program.shortCode}`, {
        state: { program: data.success ? data.data : program },
      });
    } catch (err) {
      console.error('Error loading program details before navigation:', err);
      navigate(`/programs/${program.shortCode}`, {
        state: { program },
      });
    } finally {
      setOpeningProgram(null);
    }
  };

  return (
    <div className="app">
      <TopProgressBar active={Boolean(openingProgram)} />
      <SiteHeader showAdminLogin />

      <main className="home-main" id="main" tabIndex={-1}>
        <section className="home-hero">
          <div className="home-hero__inner">
            <p className="home-hero__eyebrow">Department of Computer Science &amp; Engineering</p>
            <h1 className="home-hero__title">Postgraduate Programs</h1>
            <p className="home-hero__text">Advance your career with an MSc, MBA or professional master’s.</p>
            <div className="home-hero__row">
              <label className="home-search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search programs or specializations"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search programs"
                />
              </label>
              {/* Announced to screen readers, so a search result is heard without moving focus */}
              <p className="home-hero__meta" aria-live="polite">
                {!loading && !error && (visiblePrograms.length === programs.length
                  ? `${programs.length} programs · Apply online`
                  : `${visiblePrograms.length} of ${programs.length} programs`)}
              </p>
            </div>
          </div>
        </section>

        <div className="content-area home-content">
          {!loading && !error && programs.length > 0 && (
            <div className="home-toolbar">
              <div className="level-chips" role="group" aria-label="Filter by degree">
                {levels.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="level-chip"
                    aria-pressed={level === item}
                    onClick={() => setLevel(item)}
                  >
                    {level === item && <Check size={14} aria-hidden="true" />}
                    {item}
                  </button>
                ))}
              </div>
              <label className="home-sort">
                Sort:
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="deadline">Closing soonest</option>
                  <option value="title">A–Z</option>
                </select>
              </label>
            </div>
          )}

          {error ? (
            <div className="home-message">
              <AlertTriangle size={32} className="home-message__icon" aria-hidden="true" />
              <h2>We couldn’t load the programs</h2>
              <p>Check your connection and try again.</p>
              <button type="button" onClick={fetchPrograms} className="home-btn home-btn--primary">
                Try again
              </button>
            </div>
          ) : !loading && visiblePrograms.length === 0 ? (
            <div className="home-message">
              <h2>{query.trim() ? `No programs match “${query.trim()}”.` : 'No programs match these filters.'}</h2>
              <p>Try a broader word such as <em>data</em>, <em>security</em> or <em>MBA</em>.</p>
              <button type="button" onClick={clearFilters} className="home-btn home-btn--secondary">
                Clear filters
              </button>
            </div>
          ) : (
          <div className={`programs-grid${loading && !showSkeletons ? ' skeleton-wait' : ''}`} aria-busy={loading}>
            {loading ? (
              Array.from({ length: 6 }, (_, index) => <ProgramCardSkeleton key={index} />)
            ) : visiblePrograms.map((program, index) => {
              const specializations = program.specializations || [];
              const isExpanded = expandedProgram === program._id;
              const isOpening = openingProgram === program.shortCode;

              return (
                <article
                  key={program._id}
                  className="program-card stagger-in"
                  // 40 ms steps, capped so a long list doesn't keep the last cards waiting
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <div className="program-card__top">
                    <span className="program-card__icon"><GraduationCap size={22} aria-hidden="true" /></span>
                    <div>
                      <h2 className="program-card__title">{program.title}</h2>
                      <p className="program-card__meta">
                        {[program.level, program.duration].filter(Boolean).join(' · ')}
                        {program.isProposed && <span className="badge badge--proposed">Proposed</span>}
                      </p>
                    </div>
                  </div>

                  <p className="program-card__description">{program.description}</p>

                  {specializations.length > 0 && (
                    <ul className="chip-list" aria-label="Specializations">
                      {specializations.slice(0, isExpanded ? undefined : VISIBLE_SPECIALIZATIONS).map((spec) => (
                        <li key={spec.name} className="chip">{spec.name}</li>
                      ))}
                      {specializations.length > VISIBLE_SPECIALIZATIONS && (
                        <li>
                          <button
                            type="button"
                            className="chip chip--more"
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedProgram(isExpanded ? null : program._id)}
                          >
                            {isExpanded ? 'Show less' : `+${specializations.length - VISIBLE_SPECIALIZATIONS} more`}
                          </button>
                        </li>
                      )}
                    </ul>
                  )}

                  <div className="program-card__footer">
                    <p className="program-card__deadline">
                      <CalendarDays size={14} aria-hidden="true" />
                      <span>
                        Deadline: {program.deadline}
                        <DeadlineBadge date={program.applicationDeadline} today={today} />
                      </span>
                    </p>
                    <button
                      type="button"
                      className="program-card__cta"
                      disabled={isOpening}
                      onClick={() => handleViewDetails(program)}
                    >
                      {isOpening ? 'Opening…' : <>View Details <ArrowRight size={16} aria-hidden="true" /></>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default HomePage;
