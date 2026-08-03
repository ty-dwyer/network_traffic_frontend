import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';

function App() {
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8080/packets')
      .then((response) => response.json())
      .then((data) => setPackets(data))
      .catch((error) => console.error('Failed to fetch packets:', error));
  }, []);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe('/topic/alerts', (message) => {
          const alert = JSON.parse(message.body);
          setAlerts((prevAlerts) => [alert, ...prevAlerts]);
        });
      },
    });
    client.activate();

    return () => client.deactivate();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout alerts={alerts} />}>
          <Route index element={<Dashboard packets={packets} />} />
          <Route path="alerts" element={<Alerts alerts={alerts} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;