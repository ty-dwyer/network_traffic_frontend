import { Outlet, Link } from 'react-router-dom';
import AlertBell from './components/AlertBell';

function Layout({ alerts, onLogout }) {
  return (
    <div>
      <nav className="navbar">
        <Link to="/" className="nav-title">Network Dashboard</Link>
        <div className="nav-right">
          <AlertBell alerts={alerts} />
          <button onClick={onLogout} className="logout-button">Log Out</button>
        </div>
      </nav>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;