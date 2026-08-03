function Alerts({ alerts }) {
    return (
      <div>
        <h1>All Alerts</h1>
  
        {alerts.length === 0 ? (
          <p>No alerts yet.</p>
        ) : (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Message</th>
                <th>Device IP</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <span className={`alert-type-badge alert-${alert.type.toLowerCase()}`}>
                      {alert.type}
                    </span>
                  </td>
                  <td>{alert.message}</td>
                  <td>{alert.device ? alert.device.ipAddress : '—'}</td>
                  <td>{new Date(alert.timeStamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
  
  export default Alerts;