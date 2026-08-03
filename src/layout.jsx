import { Outlet, Link } from 'react-router-dom';
import AlertBell from './components/AlertBell';

function Layout({ alerts }) {
  return (
    <div>
      <nav className="navbar">
        <Link to="/" className="nav-title">Network Dashboard</Link>
        <AlertBell alerts={alerts} />
      </nav>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;