import { Link } from 'react-router-dom';

import Icon from '../../components/common/Icon/Icon.jsx';

export default function AdminNotFound() {
  return (
    <div className="admin-empty">
      <Icon name="close" size={30} />
      <h3>No such page</h3>
      <p>That admin route does not exist. It may have been renamed.</p>
      <Link to="/admin/dashboard" className="admin-btn admin-btn--primary">
        Back to the dashboard
      </Link>
    </div>
  );
}
