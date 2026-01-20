function HomePage({ programs }) {
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="graduation-cap-icon">🎓</div>
          <div className="header-text">
            <h1 className="university-name">University of Moratuwa</h1>
            <p className="portal-subtitle">Postgraduate Management Information System</p>
          </div>
          <button className="admin-login-btn">
            <span className="login-icon">👤</span>
            Admin Login
          </button>
        </div>
      </header>

      <div className="content-area">
        <div className="programs-header">
          <h2 className="programs-title">Postgraduate Programs</h2>
          <p className="programs-subtitle">Explore our range of postgraduate programs and apply today</p>
        </div>

        <div className="programs-grid">
          {programs.map((program) => (
            <div key={program.id} className="program-card">
              <div className="card-header">
                <div className="card-icon">🎓</div>
                <h3 className="card-title">{program.title}</h3>
              </div>
              
              <p className="card-description">{program.description}</p>
              
              {program.specializations && (
                <div className="specializations">
                  <p className="specializations-label">Specializations:</p>
                  {program.specializations.map((spec, index) => (
                    <span key={index} className="specialization-tag">{spec}</span>
                  ))}
                </div>
              )}
              
              <div className="card-info">
                <div className="info-item">
                  <span className="info-icon">📅</span>
                  <span className="info-text">Deadline: {program.deadline}</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">📚</span>
                  <span className="info-text">{program.resources} Resources Available</span>
                </div>
              </div>
              
              <button className="view-details-btn">View Details</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
