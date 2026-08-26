import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const PROTOCOL_COLORS = {
  TCP: '#3b82f6',
  UDP: '#10b981',
  ICMP: '#f59e0b',
  UNKNOWN: '#9ca3af',
};

function Dashboard({ packets }) {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');

    fetch('http://localhost:8080/ingest/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then((response) => response.text())
      .then((message) => {
        setUploadMessage(message);
        setUploading(false);
      })
      .catch(() => {
        setUploadMessage('Upload failed');
        setUploading(false);
      });
  };

  const protocolCounts = packets.reduce((acc, packet) => {
    acc[packet.protocol] = (acc[packet.protocol] || 0) + 1;
    return acc;
  }, {});

  const protocolData = Object.entries(protocolCounts).map(([protocol, count]) => ({
    name: protocol,
    value: count,
  }));

  const deviceCounts = packets.reduce((acc, packet) => {
    const ip = packet.sourceIp;
    acc[ip] = (acc[ip] || 0) + 1;
    return acc;
  }, {});

  const deviceData = Object.entries(deviceCounts).map(([ip, count]) => ({
    ip,
    packets: count,
  }));

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="upload-box">
        <label htmlFor="pcap-upload" className="upload-label">
          {uploading ? 'Uploading...' : 'Upload a .pcap file to analyze'}
        </label>
        <input
          id="pcap-upload"
          type="file"
          accept=".pcap"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{packets.length}</span>
          <span className="stat-label">Total Packets</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{Object.keys(deviceCounts).length}</span>
          <span className="stat-label">Unique Source Devices</span>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-box">
          <h2>Traffic by Protocol</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={protocolData} dataKey="value" nameKey="name" outerRadius={100} label>
                {protocolData.map((entry) => (
                  <Cell key={entry.name} fill={PROTOCOL_COLORS[entry.name] || '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h2>Packets per Device</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ip" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="packets" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;