import Icon from '../../components/common/Icon/Icon.jsx';

/**
 * 403 for a signed-in account without ROLE_ADMIN.
 *
 * Says only that access was refused — never what lives behind it, and never
 * whether the account, the role or the session was the problem.
 */
export default function AdminForbidden() {
  return (
    <div className="admin-login">
      <div className="admin-login__card admin-login__card--deny">
        <span className="admin-login__mark is-bad">
          <Icon name="close" size={26} />
        </span>
        <h1>403 — access denied</h1>
        <p className="admin-login__lede">
          This account does not have permission to view this area. If you believe that is a
          mistake, contact whoever administers the store.
        </p>
        <a href="/" className="admin-btn admin-btn--ghost">Return to the website</a>
      </div>
    </div>
  );
}
