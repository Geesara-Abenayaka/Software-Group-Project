import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/SettingsPage.css';
import API_BASE_URL from '../utils/apiConfig';
import AdminLayout from '../components/AdminLayout';
import useConfirm from '../utils/useConfirm';

const FEEDBACK_FILTERS = [
  { value: '', label: 'All' },
  { value: 'not-helpful', label: 'Not helpful' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'helpful', label: 'Helpful' }
];

const getFeedbackLabel = (item) => {
  if (item.unanswered) return 'Unanswered';
  return item.helpful ? 'Helpful' : 'Not helpful';
};

// First day of the month `offset` months after the given date.
const monthStart = (date, offset = 0) => new Date(date.getFullYear(), date.getMonth() + offset, 1);

function SettingsPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  // null means not set: no date range keeps applications open all year.
  const [currentDateRange, setCurrentDateRange] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [dateRangeFeedback, setDateRangeFeedback] = useState({ type: '', message: '' });
  const [currentDeadline, setCurrentDeadline] = useState(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [deadlineFeedback, setDeadlineFeedback] = useState({ type: '', message: '' });
  const [currentMonth1, setCurrentMonth1] = useState(() => monthStart(new Date()));
  const [currentMonth2, setCurrentMonth2] = useState(() => monthStart(new Date(), 1));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [assistantFacts, setAssistantFacts] = useState('');
  const [factsStatus, setFactsStatus] = useState({ isDefault: true, updatedAt: null });
  const [factsFeedback, setFactsFeedback] = useState({ type: '', message: '' });
  const [isSavingFacts, setIsSavingFacts] = useState(false);
  const [assistantFeedback, setAssistantFeedback] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  const applyFacts = (data) => {
    setAssistantFacts(data.value || '');
    setFactsStatus({ isDefault: data.isDefault, updatedAt: data.updatedAt });
  };

  useEffect(() => {
    axios.get(`${API_BASE_URL}/settings/assistant-facts`)
      .then(({ data }) => applyFacts(data))
      .catch(() => setFactsFeedback({ type: 'error', message: 'Could not load the Course Advisor facts.' }));
  }, []);

  const applyDateRange = (value) => {
    setCurrentDateRange(value);
    setSelectedDates(value ? [value.start, value.end] : []);
  };

  const applyDeadline = (value) => {
    setCurrentDeadline(value);
    setNewDeadline(value || '');
  };

  useEffect(() => {
    axios.get(`${API_BASE_URL}/settings/application-period`)
      .then(({ data }) => {
        applyDateRange(data.value);
        // Open the calendars on the saved range.
        if (data.value) {
          const start = new Date(`${data.value.start}T00:00:00`);
          setCurrentMonth1(monthStart(start));
          setCurrentMonth2(monthStart(start, 1));
        }
      })
      .catch(() => setDateRangeFeedback({ type: 'error', message: 'Could not load the date range.' }));

    axios.get(`${API_BASE_URL}/settings/application-deadline`)
      .then(({ data }) => applyDeadline(data.value))
      .catch(() => setDeadlineFeedback({ type: 'error', message: 'Could not load the application deadline.' }));
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/assistant/feedback`, { params: feedbackFilter ? { type: feedbackFilter } : {} })
      .then(({ data }) => {
        setAssistantFeedback(data.data || []);
        setFeedbackError('');
      })
      .catch(() => setFeedbackError('Could not load Course Advisor feedback.'));
  }, [feedbackFilter]);

  const handleSaveFacts = async (e) => {
    e.preventDefault();

    if (!assistantFacts.trim()) {
      setFactsFeedback({ type: 'error', message: 'The facts cannot be empty.' });
      return;
    }

    setIsSavingFacts(true);
    setFactsFeedback({ type: '', message: '' });

    try {
      const { data } = await axios.put(`${API_BASE_URL}/settings/assistant-facts`, { value: assistantFacts });
      applyFacts(data);
      setFactsFeedback({ type: 'success', message: 'Saved. The Course Advisor now answers with these facts.' });
    } catch (error) {
      setFactsFeedback({ type: 'error', message: error.response?.data?.message || 'Could not save the facts.' });
    } finally {
      setIsSavingFacts(false);
    }
  };

  const handleResetFacts = async () => {
    const confirmed = await confirm({
      title: 'Replace the facts with the default text?',
      message: 'The Course Advisor facts edited here are replaced by the default text.',
      confirmLabel: 'Replace with default'
    });
    if (!confirmed) {
      return;
    }

    setIsSavingFacts(true);
    setFactsFeedback({ type: '', message: '' });

    try {
      const { data } = await axios.delete(`${API_BASE_URL}/settings/assistant-facts`);
      applyFacts(data);
      setFactsFeedback({ type: 'success', message: 'The default facts are back.' });
    } catch (error) {
      setFactsFeedback({ type: 'error', message: error.response?.data?.message || 'Could not reset the facts.' });
    } finally {
      setIsSavingFacts(false);
    }
  };

  const handleDateClick = (date) => {
    if (selectedDates.length === 0) {
      setSelectedDates([date]);
    } else if (selectedDates.length === 1) {
      const sortedDates = [selectedDates[0], date].sort();
      setSelectedDates(sortedDates);
    } else {
      setSelectedDates([date]);
    }
  };

  const handleSetDateRange = async () => {
    if (selectedDates.length !== 2) {
      setDateRangeFeedback({ type: 'error', message: 'Please select start and end dates.' });
      return;
    }

    try {
      const { data } = await axios.put(`${API_BASE_URL}/settings/application-period`, {
        value: { start: selectedDates[0], end: selectedDates[1] }
      });
      applyDateRange(data.value);
      setDateRangeFeedback({ type: 'success', message: 'Saved. Applications are accepted only within this range.' });
    } catch (error) {
      setDateRangeFeedback({ type: 'error', message: error.response?.data?.message || 'Could not save the date range.' });
    }
  };

  const handleClearDateRange = async () => {
    try {
      const { data } = await axios.delete(`${API_BASE_URL}/settings/application-period`);
      applyDateRange(data.value);
      setDateRangeFeedback({ type: 'success', message: 'Cleared. Applications are open all year.' });
    } catch (error) {
      setDateRangeFeedback({ type: 'error', message: error.response?.data?.message || 'Could not clear the date range.' });
    }
  };

  const handleSetDeadline = async () => {
    if (!newDeadline) {
      setDeadlineFeedback({ type: 'error', message: 'Please choose a deadline date.' });
      return;
    }

    try {
      const { data } = await axios.put(`${API_BASE_URL}/settings/application-deadline`, { value: newDeadline });
      applyDeadline(data.value);
      setDeadlineFeedback({ type: 'success', message: 'Saved. Programs without their own deadline close after this date.' });
    } catch (error) {
      setDeadlineFeedback({ type: 'error', message: error.response?.data?.message || 'Could not save the deadline.' });
    }
  };

  const handleClearDeadline = async () => {
    try {
      const { data } = await axios.delete(`${API_BASE_URL}/settings/application-deadline`);
      applyDeadline(data.value);
      setDeadlineFeedback({ type: 'success', message: 'Cleared. Only programs with their own deadline close.' });
    } catch (error) {
      setDeadlineFeedback({ type: 'error', message: error.response?.data?.message || 'Could not clear the deadline.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      setPasswordFeedback({ type: 'error', message: 'User session missing. Please login again.' });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please fill all password fields.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordFeedback({ type: 'error', message: 'Use at least one uppercase letter, one lowercase letter and one number.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordFeedback({ type: '', message: '' });

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/change-password`, {
        userId: user.id,
        currentPassword,
        newPassword
      });

      setPasswordFeedback({ type: 'success', message: response.data?.message || 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Unable to change password. Please try again.'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderCalendar = (date, monthIndex) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                       'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDates.includes(dateStr);
      const isInRange = selectedDates.length === 2 && dateStr >= selectedDates[0] && dateStr <= selectedDates[1];
      
      days.push(
        <button
          type="button"
          key={day}
          className={`calendar-day btn-reset ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
          onClick={() => handleDateClick(dateStr)}
          aria-pressed={isSelected}
          aria-label={new Date(year, month, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="nav-arrow-cal" onClick={() => {
            const newDate = new Date(date);
            newDate.setMonth(newDate.getMonth() - 1);
            if (monthIndex === 0) setCurrentMonth1(newDate);
            else setCurrentMonth2(newDate);
          }}>‹</button>
          <span className="month-year">{monthNames[month]} {year}</span>
          <button className="nav-arrow-cal" onClick={() => {
            const newDate = new Date(date);
            newDate.setMonth(newDate.getMonth() + 1);
            if (monthIndex === 0) setCurrentMonth1(newDate);
            else setCurrentMonth2(newDate);
          }}>›</button>
        </div>
        <div className="calendar-days-header">
          {dayNames.map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {days}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="admin-content-full">
        <main id="main" tabIndex={-1} className="admin-main-full settings-main">
          <h1 className="sr-only">Settings</h1>
          <div className="settings-section">
            <h2 className="settings-title">Set Date Range</h2>
            <p className="current-range">
              Applications are accepted only between these dates, for every program.{' '}
              {currentDateRange
                ? <>Current Range: <strong>{currentDateRange.start}</strong> to <strong>{currentDateRange.end}</strong></>
                : <>Current Range: <strong>Not set</strong> (open all year)</>}
            </p>

            <div className="calendars-wrapper">
              {renderCalendar(currentMonth1, 0)}
              {renderCalendar(currentMonth2, 1)}
            </div>

            {dateRangeFeedback.message && (
              <p className={`password-feedback ${dateRangeFeedback.type}`}>
                {dateRangeFeedback.message}
              </p>
            )}

            <div className="settings-actions">
              <button className="set-range-btn" onClick={handleSetDateRange}>
                Set Date Range
              </button>
              {currentDateRange && (
                <button type="button" className="clear-setting-btn" onClick={handleClearDateRange}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-title">Application Deadline</h2>
            <p className="current-deadline">
              Used for programs that don&apos;t have their own deadline.{' '}
              Current Deadline: <strong>{currentDeadline || 'Not set'}</strong>
            </p>

            <input
              type="date"
              className="deadline-input"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />

            {deadlineFeedback.message && (
              <p className={`password-feedback ${deadlineFeedback.type}`}>
                {deadlineFeedback.message}
              </p>
            )}

            <div className="settings-actions">
              <button className="set-deadline-btn" onClick={handleSetDeadline}>
                Set Application Deadline
              </button>
              {currentDeadline && (
                <button type="button" className="clear-setting-btn" onClick={handleClearDeadline}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-title">Change Admin Password</h2>
            <p className="current-deadline">
              Update your admin password securely.
            </p>

            <form className="password-form" onSubmit={handleChangePassword}>
              <div className="password-grid">
                <div className="password-field-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="deadline-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>

                <div className="password-field-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="deadline-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 chars, upper/lower/number"
                    autoComplete="new-password"
                  />
                </div>

                <div className="password-field-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="deadline-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {passwordFeedback.message && (
                <p className={`password-feedback ${passwordFeedback.type}`}>
                  {passwordFeedback.message}
                </p>
              )}

              <button
                type="submit"
                className="set-deadline-btn"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>
          </div>

          <div className="settings-section">
            <h2 className="settings-title">Course Advisor Facts</h2>
            <p className="current-deadline">
              The chatbot answers from the programme data and these facts (contact, application fee, documents, how to apply).{' '}
              {factsStatus.isDefault
                ? 'This is the default text.'
                : <>Last saved: <strong>{new Date(factsStatus.updatedAt).toLocaleString()}</strong></>}
            </p>

            <form onSubmit={handleSaveFacts}>
              <textarea
                className="deadline-input assistant-facts-input"
                rows={10}
                maxLength={5000}
                value={assistantFacts}
                onChange={(e) => setAssistantFacts(e.target.value)}
                aria-label="Course Advisor facts"
              />

              {factsFeedback.message && (
                <p className={`password-feedback ${factsFeedback.type}`}>
                  {factsFeedback.message}
                </p>
              )}

              <div className="assistant-facts-actions">
                <button type="submit" className="set-deadline-btn" disabled={isSavingFacts}>
                  {isSavingFacts ? 'Saving...' : 'Save Facts'}
                </button>
                {!factsStatus.isDefault && (
                  <button type="button" className="reset-facts-btn" onClick={handleResetFacts} disabled={isSavingFacts}>
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="settings-section">
            <h2 className="settings-title">Course Advisor Feedback</h2>
            <p className="current-deadline">
              The latest 100 chatbot replies people rated, and questions it could not answer from the data.
            </p>

            <select
              className="deadline-input assistant-feedback-filter"
              value={feedbackFilter}
              onChange={(e) => setFeedbackFilter(e.target.value)}
              aria-label="Show feedback"
            >
              {FEEDBACK_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>

            {feedbackError && <p className="password-feedback error">{feedbackError}</p>}

            {!feedbackError && assistantFeedback.length === 0 && (
              <p className="current-deadline">Nothing here yet.</p>
            )}

            {assistantFeedback.length > 0 && (
              <div className="assistant-feedback-table-wrap">
                <table className="assistant-feedback-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Question</th>
                      <th>Reply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assistantFeedback.map((item) => (
                      <tr key={item._id}>
                        <td>{new Date(item.updatedAt).toLocaleString()}</td>
                        <td>
                          {getFeedbackLabel(item)}
                          {item.source === 'fallback' && <span className="feedback-source"> (offline)</span>}
                        </td>
                        <td>{item.question || '-'}</td>
                        <td>{item.reply.length > 200 ? `${item.reply.slice(0, 200)}…` : item.reply}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
      {confirmDialog}
    </AdminLayout>
  );
}

export default SettingsPage;
