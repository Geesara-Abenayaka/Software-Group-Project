import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ClipboardList,
  Search,
  Download,
  BarChart2,
  Settings,
  LogOut,
  User,
  PlusCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProgram, setNewProgram] = useState({
    title: '',
    shortCode: '',
    description: '',
    detailedDescription: '',
    deadline: '',
    specializations: [],
    resourcesCount: 0,
    resources: [
      { name: 'Online Application', type: 'form' }
    ],
    deadlines: {
      application: '',
      selectionExams: ''
    }
  });

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchPrograms();
  }, [navigate]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const [progResponse, summaryResponse] = await Promise.all([
        fetch('http://localhost:5000/api/programs'),
        fetch('http://localhost:5000/api/applications/summary/by-program')
      ]);
      const progData = await progResponse.json();
      const summaryData = await summaryResponse.json();

      if (progData.success) {
        const summaryMap = new Map(
          (summaryData.success ? summaryData.data : []).map((item) => [item.program, item])
        );

        const programsWithCounts = progData.data.map(program => {
          const pendingCount = summaryMap.get(program.shortCode)?.pending || 0;
          return { ...program, pendingCount };
        });
        setPrograms(programsWithCounts);
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleEditProgram = (program) => {
    setEditingProgram({...program});
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingProgram(null);
  };

  const handleOpenAddModal = () => {
    setNewProgram({
      title: '',
      shortCode: '',
      description: '',
      detailedDescription: '',
      deadline: '',
      specializations: [],
      resourcesCount: 0,
      resources: [
        { name: 'Online Application', type: 'form' }
      ],
      deadlines: {
        application: '',
        selectionExams: ''
      }
    });
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewProgram({
      title: '',
      shortCode: '',
      description: '',
      detailedDescription: '',
      deadline: '',
      specializations: [],
      resourcesCount: 0,
      resources: [
        { name: 'Online Application', type: 'form' }
      ],
      deadlines: {
        application: '',
        selectionExams: ''
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingProgram(prev => ({
      ...prev,
      [name]: value
    }));
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
      const programToSave = {
        ...editingProgram,
        specializations: editingProgram.specializations?.filter(spec => spec.name.trim() !== '') || [],
        // Ensure deadlines object is properly formatted
        deadlines: {
          application: editingProgram.deadline,
          selectionExams: editingProgram.deadlines?.selectionExams || '08th and 09th November 2025'
        },
        // Ensure resources exist
        resources: editingProgram.resources || [
          { name: `${editingProgram.title} - Course Details`, type: 'pdf', fileSize: '5.8 KB' },
          { name: 'Call for Application', type: 'pdf', fileSize: '720 KB' },
          { name: 'Online Application', type: 'form' }
        ],
        resourcesCount: editingProgram.resources?.length || 3
      };

      const response = await fetch(`http://localhost:5000/api/programs/${editingProgram._id}`, {
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
          p._id === editingProgram._id ? data.data : p
        ));
        handleCloseModal();
        alert('Program updated successfully!');
      } else {
        alert('Failed to update program: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating program:', err);
      alert('Failed to update program: ' + err.message);
    }
  };

  const handleAddProgram = async () => {
    try {
      // Filter out empty specializations before saving
      const programToSave = {
        ...newProgram,
        specializations: newProgram.specializations?.filter(spec => spec.name.trim() !== '') || [],
        deadlines: {
          application: newProgram.deadline,
          selectionExams: '08th and 09th November 2025'
        },
        resources: [
          { name: `${newProgram.title} - Course Details`, type: 'pdf', fileSize: '5.8 KB' },
          { name: 'Call for Application', type: 'pdf', fileSize: '720 KB' },
          { name: 'Online Application', type: 'form' }
        ],
        resourcesCount: 3
      };

      const response = await fetch('http://localhost:5000/api/programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(programToSave)
      });

      const data = await response.json();

      if (data.success) {
        // Add the new program to the local programs list
        setPrograms([...programs, data.data]);
        handleCloseAddModal();
        alert('Program added successfully!');
      } else {
        alert('Failed to add program: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding program:', err);
      alert('Failed to add program: ' + err.message);
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/programs/${programId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Remove the program from the local programs list
        setPrograms(programs.filter(p => p._id !== programId));
        alert('Program deleted successfully!');
      } else {
        alert('Failed to delete program: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting program:', err);
      alert('Failed to delete program: ' + err.message);
    }
  };

  const handleNewProgramInputChange = (e) => {
    const { name, value } = e.target;
    setNewProgram(prev => ({
      ...prev,
      [name]: value
    }));
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
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="header-left">
            <div className="header-text">
              <h1 className="university-name">University of Moratuwa</h1>
              <p className="portal-subtitle">Postgraduate Management Information System</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                <User size={20} color="white" />
              </div>
              <div className="user-details">
                <span className="user-role">Admin User</span>
                <span className="user-email">{user?.email || 'admin@admin.lk'}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="admin-navbar">
        <div className="navbar-content">
          <button className="navbar-btn active">
            <GraduationCap size={18} className="nav-icon" />
            Programs
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/applications')}>
            <ClipboardList size={18} className="nav-icon" />
            Applications
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/search')}>
            <Search size={18} className="nav-icon" />
            Search
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/download')}>
            <Download size={18} className="nav-icon" />
            Download
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/marks')}>
            <BarChart2 size={18} className="nav-icon" />
            Marks
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/settings')}>
            <Settings size={18} className="nav-icon" />
            Settings
          </button>
        </div>
      </nav>

      <div className="admin-content-full">
        <main className="admin-main-full programs-management-main">
          <div className="programs-header-admin">
            <div>
              <h2 className="programs-title-admin">Postgraduate Programs</h2>
              <p className="programs-subtitle-admin">Manage course details, deadlines, and available resources.</p>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading programs...</p>
            </div>
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
                      <span className={`pending-badge-pill ${program.pendingCount > 0 ? 'pending-red' : 'pending-gray'}`}>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Program</h2>
              <button className="close-modal-btn" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group-modal">
                <label>Program Title</label>
                <input
                  type="text"
                  name="title"
                  value={editingProgram.title}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group-modal">
                <label>Short Code</label>
                <input
                  type="text"
                  name="shortCode"
                  value={editingProgram.shortCode}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group-modal">
                <label>Description</label>
                <textarea
                  name="description"
                  value={editingProgram.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>

              <div className="form-group-modal">
                <label>Detailed Description</label>
                <textarea
                  name="detailedDescription"
                  value={editingProgram.detailedDescription || ''}
                  onChange={handleInputChange}
                  rows="5"
                />
              </div>

              <div className="form-group-modal">
                <label>Deadline</label>
                <input
                  type="text"
                  name="deadline"
                  value={editingProgram.deadline}
                  onChange={handleInputChange}
                  placeholder="e.g., March 31, 2024"
                />
              </div>

              <div className="form-group-modal">
                <label>Specializations</label>
                {editingProgram.specializations && editingProgram.specializations.map((spec, index) => (
                  <div key={index} className="specialization-input-group">
                    <input
                      type="text"
                      value={spec.name}
                      onChange={(e) => handleSpecializationChange(index, 'name', e.target.value)}
                      placeholder="Specialization name"
                    />
                    <button 
                      type="button"
                      className="remove-spec-btn"
                      onClick={() => removeSpecialization(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button 
                  type="button"
                  className="add-spec-btn"
                  onClick={addSpecialization}
                >
                  + Add Specialization
                </button>
              </div>

              <div className="form-group-modal">
                <label>Resources Count</label>
                <input
                  type="number"
                  name="resourcesCount"
                  value={editingProgram.resourcesCount}
                  onChange={handleInputChange}
                />
              </div>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Program</h2>
              <button className="close-modal-btn" onClick={handleCloseAddModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group-modal">
                <label>Program Title *</label>
                <input
                  type="text"
                  name="title"
                  value={newProgram.title}
                  onChange={handleNewProgramInputChange}
                  required
                />
              </div>

              <div className="form-group-modal">
                <label>Short Code *</label>
                <input
                  type="text"
                  name="shortCode"
                  value={newProgram.shortCode}
                  onChange={handleNewProgramInputChange}
                  placeholder="e.g., MSC-CS"
                  required
                />
              </div>

              <div className="form-group-modal">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={newProgram.description}
                  onChange={handleNewProgramInputChange}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group-modal">
                <label>Detailed Description</label>
                <textarea
                  name="detailedDescription"
                  value={newProgram.detailedDescription}
                  onChange={handleNewProgramInputChange}
                  rows="5"
                />
              </div>

              <div className="form-group-modal">
                <label>Deadline *</label>
                <input
                  type="text"
                  name="deadline"
                  value={newProgram.deadline}
                  onChange={handleNewProgramInputChange}
                  placeholder="e.g., March 31, 2024"
                  required
                />
              </div>

              <div className="form-group-modal">
                <label>Specializations</label>
                {newProgram.specializations && newProgram.specializations.map((spec, index) => (
                  <div key={index} className="specialization-input-group">
                    <input
                      type="text"
                      value={spec.name}
                      onChange={(e) => handleNewProgramSpecializationChange(index, 'name', e.target.value)}
                      placeholder="Specialization name"
                    />
                    <button 
                      type="button"
                      className="remove-spec-btn"
                      onClick={() => removeNewProgramSpecialization(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button 
                  type="button"
                  className="add-spec-btn"
                  onClick={addNewProgramSpecialization}
                >
                  + Add Specialization
                </button>
              </div>

              <div className="form-group-modal">
                <label>Resources Count</label>
                <input
                  type="number"
                  name="resourcesCount"
                  value={newProgram.resourcesCount}
                  onChange={handleNewProgramInputChange}
                  min="0"
                />
              </div>
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
    </div>
  );
}

export default AdminDashboard;
