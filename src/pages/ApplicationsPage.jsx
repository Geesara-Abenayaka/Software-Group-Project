import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import '../styles/ApplicationsPage.css';
import API_BASE_URL from '../utils/apiConfig';
import AdminLayout from '../components/AdminLayout';
import { AdminProgramCardSkeleton } from '../components/Loaders';
import useDelayedFlag from '../utils/useDelayedFlag';

const fetchWithTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

function ApplicationsPage() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const showSkeletons = useDelayedFlag(loading);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetchWithTimeout(`${API_BASE_URL}/programs`, 8000);
      const data = await response.json();
      
      if (data.success) {
        const basePrograms = data.data.map((program) => ({
          ...program,
          pendingCount: 0
        }));
        setPrograms(basePrograms);

        // Fetch pending counts in background so a slow endpoint doesn't block the page render.
        fetchWithTimeout(`${API_BASE_URL}/applications/summary`, 6000)
          .then((appsResponse) => appsResponse.json())
          .then((appsData) => {
            if (!appsData?.success || !Array.isArray(appsData.data)) {
              return;
            }

            setPrograms((currentPrograms) => {
              return currentPrograms.map((program) => {
                const pendingCount = appsData.data.filter((app) => (
                  app.program === program.shortCode && app.status === 'pending'
                )).length;

                return {
                  ...program,
                  pendingCount
                };
              });
            });
          })
          .catch((countError) => {
            if (countError?.name !== 'AbortError') {
              console.warn('Failed to fetch pending counts:', countError);
            }
          });
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplications = (programShortCode) => {
    // Navigate to view applications for this program
    navigate(`/admin/applications/${programShortCode}`);
  };

  return (
    <AdminLayout>

      <div className="admin-content-full">
        <main id="main" tabIndex={-1} className="admin-main-full applications-main">
          <div className="page-title-row">
            <h2 className="page-heading">Applications</h2>
          </div>
          <div className={`programs-grid-admin${loading && !showSkeletons ? ' skeleton-wait' : ''}`} aria-busy={loading}>
            {loading ? (
              Array.from({ length: 6 }, (_, index) => <AdminProgramCardSkeleton key={index} />)
            ) : (
            programs.map((program) => (
              <div key={program._id} className="program-card-admin">
                <div className="card-top-row">
                  <div className="card-avatar-icon">
                    <User size={22} color="#9ca3af" />
                  </div>
                  <span className={`pending-badge-pill ${program.pendingCount > 0 ? 'pending-red' : 'pending-gray'}`}>
                    {program.pendingCount} Pending
                  </span>
                </div>

                <h3 className="card-title-admin">{program.title}</h3>
                <p className="card-description-admin">{program.description}</p>

                <div className="card-bottom-row">
                  <button
                    className="view-applications-link"
                    onClick={() => handleViewApplications(program.shortCode)}
                  >
                    View Applications <span className="link-chevron">›</span>
                  </button>
                </div>
              </div>
            ))
            )}
          </div>
        </main>
      </div>
    </AdminLayout>
  );
}

export default ApplicationsPage;
