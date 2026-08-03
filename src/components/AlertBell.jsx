import { Link } from 'react-router-dom';

function AlertBell({ alerts }) {
  const counts = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {});

  const totalCount = alerts.length;

  return (
    <Link to="/alerts" className="alert-bell">
      <span className="bell-icon">🔔</span>
      {totalCount > 0 && (
        <div className="alert-bell-dropdown">
          {Object.entries(counts).map(([type, count]) => (
            <div key={type} className="alert-bell-row">
              <span>{type}</span>
              <span className="alert-count-badge">{count}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

export default AlertBell;