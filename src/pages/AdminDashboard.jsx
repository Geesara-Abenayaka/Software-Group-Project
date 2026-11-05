import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  PlusCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import '../styles/AdminDashboard.css';
import API_BASE_URL from '../utils/apiConfig';
import AdminLayout from '../components/AdminLayout';
import AdminSummary from '../components/AdminSummary';
import ProgramFormFields from '../components/ProgramFormFields';
import useConfirm from '../utils/useConfirm';
import { toast } from '../utils/toast';
import { PageLoader } from '../components/Loaders';

const createEmptyProgram = () => ({
  title: '',
  shortCode: '',
  description: '',
  detailedDescription: '',
  deadline: '',
  selectionExams: '',
  specializations: [],
  resourcesCount: 0,
  resources: [
    { name: 'Online Application', type: 'form' }
  ],
  deadlines: {
    application: '',
    selectionExams: ''
  },
  level: 'MSc',
  duration: '',
  mode: '',
  slqfLevel: '',
  fee: '',
  eligibilityText: '',
  applicationDeadline: '',
  isProposed: false
});

// The form keeps eligibility as one requirement per line and the deadline as yyyy-mm-dd.
const toProgramForm = (program) => ({
  ...program,
  slqfLevel: program.slqfLevel ?? '',
  eligibilityText: (program.eligibility || []).join('\n'),
  applicationDeadline: program.applicationDeadline ? program.applicationDeadline.slice(0, 10) : ''
});

// Converts the form values back to what the API stores.
const fromProgramForm = ({ eligibilityText, ...program }) => ({
  ...program,
  slqfLevel: program.slqfLevel === '' ? null : Number(program.slqfLevel),
  eligibility: (eligibilityText || '').split('\n').map((line) => line.trim()).filter(Boolean),
  applicationDeadline: program.applicationDeadline || null
});

// The server answers a duplicate title or code with MongoDB's E11000 text in `error`;
// show it under the field instead of a toast.
const getDuplicateError = (data) => {
  const text = String(data?.error || data?.message || '');
  if (!/E11000|duplicate key/i.test(text)) return null;
  return /title/i.test(text)
    ? { title: 'Another program already has this title' }
    : { shortCode: 'Another program already uses this code' };
};

function AdminDashboard() {
  const { confirm, confirmDialog } = useConfirm();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  // Rows of /applications/summary/by-program; null while loading, 'error' if it failed
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProgram, setNewProgram] = useState(createEmptyProgram);
  // Field errors in the Add / Edit modal, e.g. { shortCode: 'Another program already uses this code' }
  const [programErrors, setProgramErrors] = useState({});

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const progResponse = await fetch(`${API_BASE_URL}/programs`);
      const progData = await progResponse.json();

      if (progData.success) {
        const basePrograms = progData.data.map((program) => ({ ...program, pendingCount: 0 }));
        setPrograms(basePrograms);

        // Fetch application counts in background so slow endpoint does not block page rendering.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        // Counts per programme (total, pending, approved, rejected) for the summary and the pending pills
        fetch(`${API_BASE_URL}/applications/summary/by-program`, { signal: controller.signal })
          .then((response) => response.json())
          .then((summaryData) => {
            if (!summaryData?.success || !Array.isArray(summaryData.data)) {
              setSummary('error');
              return;
            }

            setSummary(summaryData.data);
            setPrograms((currentPrograms) => currentPrograms.map((program) => ({
              ...program,
              pendingCount: summaryData.data.find((row) => row.program === program.shortCode)?.pending || 0
            })));
          })
          .catch((countError) => {
            setSummary('error');
            if (countError?.name !== 'AbortError') {
              console.warn('Pending count fetch failed:', countError);
            }
          })
          .finally(() => {
            clearTimeout(timeoutId);
          });
      } else {
        setError('Failed to load programs');
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProgram = async (program) => {
    // The programs list leaves out deadlines, resources and the detailed description,
    // so load the full program before editing; saving a partial copy would overwrite them.
    try {
      const response = await fetch(`${API_BASE_URL}/programs/${program._id}`);
      const data = await response.json();

      if (!data.success) {
        toast.error(`Couldn't load the program details: ${data.message || 'unknown error'}`);
        return;
      }

      setEditingProgram({
        ...toProgramForm(data.data),
        selectionExams: data.data.deadlines?.selectionExams || ''
      });
      setShowEditModal(true);
    } catch (err) {
      console.error('Error loading program details:', err);
      toast.error(`Couldn't load the program details: ${err.message}`);
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingProgram(null);
    setProgramErrors({});
  };

  const handleOpenAddModal = () => {
    setNewProgram(createEmptyProgram());
    setProgramErrors({});
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewProgram(createEmptyProgram());
    setProgramErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingProgram(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setProgramErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSpecializationChange = (index, field, value) => {
    const updatedSpecs = [...editingProgram.specializations];
    updatedSpecs[index][field] = value;
    setEditingProgram(prev => ({
      ...prev,
      specializations: updatedSpecs
    }));
  };

  const addSpecialization = () => {
    setEditingProgram(prev => ({
      ...prev,
      specializations: [...(prev.specializations || []), { name: '' }]
    }));
  };

  const removeSpecialization = (index) => {
    setEditingProgram(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProgram = async () => {
    try {
      // Filter out empty specializations before saving
      const { selectionExams, ...programFields } = fromProgramForm(editingProgram);
      const programToSave = {
        ...programFields,
        specializations: editingProgram.specializations?.filter(spec => spec.name.trim() !== '') || [],
        // Ensure deadlines object is properly formatted
        deadlines: {
          application: editingProgram.deadline,
          selectionExams: (selectionExams || '').trim()
        },
        // Ensure resources exist
        resources: editingProgram.resources || [
          { name: `${editingProgram.title} - Course Details`, type: 'pdf', fileSize: '5.8 KB' },
          { name: 'Call for Application', type: 'pdf', fileSize: '720 KB' },
          { name: 'Online Application', type: 'form' }
        ],
        resourcesCount: editingProgram.resources?.length || 3
      };

      const response = await fetch(`${API_BASE_URL}/programs/${editingProgram._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(programToSave)
      });

      const data = await response.json();

      if (data.success) {
        // Update the local programs list
        setPrograms(programs.map(p => 
          // The saved program from the server has no pending count; keep the card's
          p._id === editingProgram._id ? { ...data.data, pendingCount: p.pendingCount } : p
        ));
        handleCloseModal();
        toast.success('Program updated');
      } else {
        const duplicate = getDuplicateError(data);
        if (duplicate) {
          setProgramErrors(duplicate);
        } else {
          toast.error(`Couldn't update the program: ${data.message || 'unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error updating program:', err);
      toast.error(`Couldn't update the program: ${err.message}`);
    }
  };

  const handleAddProgram = async () => {
    try {
      // Filter out empty specializations before saving
      const { selectionExams, ...programFields } = fromProgramForm(newProgram);
      const programToSave = {
        ...programFields,
        specializations: newProgram.specializations?.filter(spec => spec.name.trim() !== '') || [],
        deadlines: {
          application: newProgram.deadline,
          selectionExams: (selectionExams || '').trim()
        },
        resources: [
          { name: `${newProgram.title} - Course Details`, type: 'pdf', fileSize: '5.8 KB' },
          { name: 'Call for Application', type: 'pdf', fileSize: '720 KB' },
          { name: 'Online Application', type: 'form' }
        ],
        resourcesCount: 3
      };

      const response = await fetch(`${API_BASE_URL}/programs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(programToSave)
      });

      const data = await response.json();

      if (data.success) {
        // Add the new program to the local programs list
        setPrograms([...programs, { ...data.data, pendingCount: 0 }]);
        handleCloseAddModal();
        toast.success('Program added');
      } else {
        const duplicate = getDuplicateError(data);
        if (duplicate) {
          setProgramErrors(duplicate);
        } else {
          toast.error(`Couldn't add the program: ${data.message || 'unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error adding program:', err);
      toast.error(`Couldn't add the program: ${err.message}`);
    }
  };

  const handleDeleteProgram = async (programId) => {
    const program = programs.find((item) => item._id === programId);
    const confirmed = await confirm({
      title: `Delete ${program?.title || 'this program'}?`,
      message: "Applications for it will no longer show a program title. This can't be undone.",
      confirmLabel: 'Delete program',
      danger: true
    });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/programs/${programId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Remove the program from the local programs list
        setPrograms(programs.filter(p => p._id !== programId));
        toast.success('Program deleted');
      } else {
        toast.error(`Couldn't delete the program: ${data.message || 'unknown error'}`);
      }
    } catch (err) {
      console.error('Error deleting program:', err);
      toast.error(`Couldn't delete the program: ${err.message}`);
    }
  };

  const handleNewProgramInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewProgram(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setProgramErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleNewProgramSpecializationChange = (index, field, value) => {
    const updatedSpecs = [...newProgram.specializations];
    updatedSpecs[index][field] = value;
    setNewProgram(prev => ({
      ...prev,
      specializations: updatedSpecs
    }));
  };

  const addNewProgramSpecialization = () => {
    setNewProgram(prev => ({
      ...prev,
      specializations: [...(prev.specializations || []), { name: '' }]
    }));
  };

  const removeNewProgramSpecialization = (index) => {
    setNewProgram(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };



  return (
    <AdminLayout>

      <div className="admin-content-full">
        <main id="main" tabIndex={-1} className="admin-main-full programs-management-main">
          <div className="programs-header-admin">
            <div>
              <h2 className="programs-title-admin">Postgraduate Programs</h2>
              <p className="programs-subtitle-admin">Manage course details, deadlines, and available resources.</p>
            </div>
          </div>

          {!loading && !error && (
            <AdminSummary
              programs={programs}
              summary={summary}
              onOpenProgram={(program) => navigate(`/admin/applications/${program.shortCode}`)}
            />
          )}

          {loading ? (
            <PageLoader message="Loading programs…" />
          ) : error ? (
            <div className="error-container">
              <h2>Error</h2>
              <p>{error}</p>
              <button onClick={fetchPrograms} className="retry-btn">Retry</button>
            </div>
          ) : programs.length === 0 ? (
            <div className="no-programs">
              <p>No programs available</p>
            </div>
          ) : (
            <div className="programs-grid-admin">
              {programs.map((program) => {
                const specializationNames = Array.isArray(program.specializations)
                  ? program.specializations
                    .map((spec) => (typeof spec === 'string' ? spec : spec?.name))
                    .filter(Boolean)
                  : [];

                return (
                <div key={program._id} className="program-card-admin program-card-management">
                  <div className="card-top-row">
                    <div className="card-avatar-icon">
                      <User size={22} color="#9ca3af" />
                    </div>
                    <div className="program-status-block">
                      <span className="program-code-badge">{program.shortCode}</span>
                      {program.level && <span className="program-level-badge">{program.level}</span>}
                      {program.isProposed && <span className="badge badge--proposed program-proposed-badge">Proposed</span>}
                      <span className={`pending-badge-pill ${program.pendingCount > 0 ? 'pending-some' : 'pending-none'}`}>
                        {program.pendingCount} Pending
                      </span>
                    </div>
                  </div>

                  <h3 className="card-title-admin">{program.title}</h3>

                  <p className="card-description-admin">{program.description}</p>

                  <div className="program-meta-grid">
                    <div className="program-meta-item">
                      <span className="program-meta-label">Deadline</span>
                      <span className="program-meta-value">{program.deadline || 'Not Set'}</span>
                    </div>
                    <div className="program-meta-item">
                      <span className="program-meta-label">Resources</span>
                      <span className="program-meta-value">{program.resourcesCount ?? 0}</span>
                    </div>
                  </div>

                  <div className="program-specializations">
                    <span className="program-specializations-label">Specializations</span>
                    {specializationNames.length > 0 ? (
                      <div className="program-specializations-list">
                        {specializationNames.slice(0, 3).map((name, index) => (
                          <span key={`${name}-${index}`} className="program-specialization-chip">{name}</span>
                        ))}
                        {specializationNames.length > 3 && (
                          <span className="program-specialization-chip program-specialization-chip-muted">
                            +{specializationNames.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="program-specializations-empty">No specializations listed</p>
                    )}
                  </div>

                  <div className="card-bottom-row program-manage-actions">
                    <button
                      className="program-action-btn program-action-edit"
                      title="Edit program"
                      onClick={() => handleEditProgram(program)}
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                    <button
                      className="program-action-btn program-action-delete"
                      title="Delete program"
                      onClick={() => handleDeleteProgram(program._id)}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              )})}

              {/* Add New Program Tile */}
              <div className="add-program-card" onClick={handleOpenAddModal}>
                <div className="add-program-card-inner">
                  <div className="add-program-icon-circle">
                    <PlusCircle size={48} className="add-program-plus-icon" />
                  </div>
                  <h3 className="add-program-card-title">Add New Program</h3>
                  <p className="add-program-card-subtitle">Click to create a new postgraduate program</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Program Modal */}
      {showEditModal && editingProgram && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content program-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-program-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="edit-program-heading">Edit Program</h2>
              <button className="close-modal-btn" onClick={handleCloseModal} aria-label="Close">×</button>
            </div>

            <div className="modal-body">
              <ProgramFormFields
                idPrefix="edit-program"
                program={editingProgram}
                errors={programErrors}
                onChange={handleInputChange}
                onSpecializationChange={handleSpecializationChange}
                onAddSpecialization={addSpecialization}
                onRemoveSpecialization={removeSpecialization}
              />
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveProgram}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Program Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseAddModal}>
          <div
            className="modal-content program-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-program-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="add-program-heading">Add New Program</h2>
              <button className="close-modal-btn" onClick={handleCloseAddModal} aria-label="Close">×</button>
            </div>

            <div className="modal-body">
              <ProgramFormFields
                idPrefix="add-program"
                program={newProgram}
                errors={programErrors}
                onChange={handleNewProgramInputChange}
                onSpecializationChange={handleNewProgramSpecializationChange}
                onAddSpecialization={addNewProgramSpecialization}
                onRemoveSpecialization={removeNewProgramSpecialization}
              />
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={handleCloseAddModal}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleAddProgram}>
                Add Program
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog}
    </AdminLayout>
  );
}

export default AdminDashboard;
