import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Login from './pages/Login';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!token) return;

    fetch('http://localhost:8080/packets', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => setPackets(data))
      .catch((error) => console.error('Failed to fetch packets:', error));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        client.subscribe('/topic/alerts', (message) => {
          const alert = JSON.parse(message.body);
          setAlerts((prevAlerts) => [alert, ...prevAlerts]);
        });

        client.subscribe('/topic/packets', (message) => {
          const packet = JSON.parse(message.body);
          setPackets((prevPackets) => [...prevPackets, packet]);
        });
      },
    });
    client.activate();

    return () => client.deactivate();
  }, [token]);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setPackets([]);
    setAlerts([]);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout alerts={alerts} onLogout={handleLogout} />}>
          <Route index element={<Dashboard packets={packets} />} />
          <Route path="alerts" element={<Alerts alerts={alerts} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;