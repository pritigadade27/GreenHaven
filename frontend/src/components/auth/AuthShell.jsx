import { Link } from 'react-router-dom';

import bg from '../../assets/images/hero/auth-bg.jpg';
import './AuthShell.css';

/** The frame both Sign In and Sign Up sit in: a centred card floating over a blurred wall of plants, split in half — form on the left, photograph right. */
export default function AuthShell({ active, photo, caption, children }) {
  return (
    <div className="auth" style={{ backgroundImage: `url(${bg})` }}>
      <div className={`auth__card auth__card--${active}`}>
        <div className="auth__pane">
          <nav className="auth__tabs" aria-label="Account">
            <Link to="/login" className={active === 'login' ? 'is-active' : ''}>
              Sign in
            </Link>
            <Link to="/register" className={active === 'register' ? 'is-active' : ''}>
              Sign up
            </Link>
          </nav>

          <div className="auth__body">{children}</div>
        </div>

        <figure className="auth__art">
          <img src={photo} alt="" />
          <figcaption>{caption}</figcaption>
        </figure>
      </div>
    </div>
  );
}
