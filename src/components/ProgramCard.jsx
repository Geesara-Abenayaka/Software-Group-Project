import PropTypes from 'prop-types';

function ProgramCard({ program, onViewApplications }) {
  // Count pending applications (placeholder - will need backend support)
  const pendingCount = Math.floor(Math.random() * 5); // Replace with actual data from backend
  
  return (
    <div className="program-card-admin">
      <div className="card-header-admin">
        <div className="user-icon">
          <span>👤</span>
        </div>
        <div className="pending-badge">
          <span className={pendingCount > 0 ? "pending-count-red" : "pending-count-zero"}>
            {pendingCount} Pending
          </span>
        </div>
      </div>
      
      <h3 className="program-title-admin">{program.title}</h3>
      
      <p className="program-description-admin">{program.description}</p>
      
      <button 
        className="view-applications-btn"
        onClick={() => onViewApplications(program.shortCode)}
      >
        View Applications
        <span className="arrow-right">→</span>
      </button>
    </div>
  );
}

ProgramCard.propTypes = {
  program: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    shortCode: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  onViewApplications: PropTypes.func.isRequired,
};

export default ProgramCard;
