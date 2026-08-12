import Icon from '../../components/common/Icon/Icon.jsx';

export default function AdminState({ query, children, skeleton = 'rows' }) {
  const { data, loading, error, reload } = query;

  if (loading && data === null) {
    return skeleton === 'cards' ? (
      <div className="admin-cards" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="admin-card admin-card--loading">
            <span className="skeleton" style={{ width: '40%', height: 26 }} />
            <span className="skeleton" style={{ width: '65%', height: 12 }} />
          </div>
        ))}
      </div>
    ) : (
      <div className="admin-panel" aria-hidden="true">
        {Array.from({ length: skeleton === 'chart' ? 3 : 6 }, (_, i) => (
          <span
            key={i}
            className="skeleton"
            style={{ display: 'block', height: 18, marginBottom: 12, width: `${95 - i * 7}%` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-empty is-bad" role="alert">
        <Icon name="close" size={28} />
        <h3>That did not load</h3>
        <p>{error}</p>
        <button type="button" className="admin-btn admin-btn--primary" onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  if (data === null) return null;
  return children(data);
}
