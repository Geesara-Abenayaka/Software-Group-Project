import { Link } from 'react-router-dom';

// Footer shared by the public pages.
function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <div>
          <h2 className="site-footer__heading">Department</h2>
          <p>Department of Computer Science &amp; Engineering, University of Moratuwa</p>
        </div>
        <div>
          <h2 className="site-footer__heading">Contact</h2>
          <a href="mailto:postgrad@cse.mrt.ac.lk">postgrad@cse.mrt.ac.lk</a>
        </div>
        <nav aria-label="Footer">
          <h2 className="site-footer__heading">Links</h2>
          <ul className="site-footer__links">
            <li><Link to="/">Programs</Link></li>
            <li><Link to="/login">Admin Login</Link></li>
          </ul>
        </nav>
      </div>
      <p className="site-footer__copy">
        © {new Date().getFullYear()} University of Moratuwa. All rights reserved.
      </p>
    </footer>
  );
}

export default SiteFooter;
