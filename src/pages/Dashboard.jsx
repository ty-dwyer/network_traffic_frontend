import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const PROTOCOL_COLORS = { TCP: '#3b82f6', UDP: '#10b981', ICMP: '#f59e0b', UNKNOWN: '#9ca3af' };
const PAGE_SIZE = 10;

function packetDate(packet) {
  const value = packet.timestamp ?? packet.time ?? packet.createdAt ?? packet.captureTime;
  if (value == null) return null;
  const date = typeof value === 'number' ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function Dashboard({ packets = [], onPacketsRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState(false);
  const [query, setQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [sort, setSort] = useState({ key: 'timestamp', direction: 'desc' });
  const [page, setPage] = useState(1);

  const protocolCounts = useMemo(() => packets.reduce((acc, packet) => {
    const protocol = packet.protocol || 'UNKNOWN';
    acc[protocol] = (acc[protocol] || 0) + 1;
    return acc;
  }, {}), [packets]);
  const deviceCounts = useMemo(() => packets.reduce((acc, packet) => {
    const ip = packet.sourceIp || 'Unknown';
    acc[ip] = (acc[ip] || 0) + 1;
    return acc;
  }, {}), [packets]);
  const destinationCounts = useMemo(() => packets.reduce((acc, packet) => {
    const ip = packet.destinationIp || packet.destIp || packet.destination || 'Unknown';
    if (ip !== 'Unknown') acc[ip] = (acc[ip] || 0) + 1;
    return acc;
  }, {}), [packets]);

  const protocolData = Object.entries(protocolCounts).map(([name, value]) => ({ name, value }));
  const deviceData = Object.entries(deviceCounts).map(([ip, count]) => ({ ip, packets: count }))
    .sort((a, b) => b.packets - a.packets).slice(0, 10);
  const timelineData = useMemo(() => {
    const buckets = new Map();
    packets.forEach((packet) => {
      const date = packetDate(packet);
      if (!date) return;
      date.setSeconds(0, 0);
      const key = date.toISOString();
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    return [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([time, count]) => ({
      time,
      label: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      packets: count,
    }));
  }, [packets]);
  const captureDates = packets.map(packetDate).filter(Boolean).sort((a, b) => a - b);
  const rangeLabel = captureDates.length
    ? `${captureDates[0].toLocaleString()} – ${captureDates[captureDates.length - 1].toLocaleString()}`
    : 'Not available';
  const busiestDevice = deviceData[0];

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.pcap(?:ng)?$/i.test(file.name)) {
      setUploadError(true);
      setUploadMessage('Choose a .pcap or .pcapng capture file.');
      return;
    }

    setUploading(true);
    setUploadMessage('');
    setUploadError(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/ingest/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const message = await response.text();
      if (!response.ok) throw new Error(message || `Upload failed (${response.status})`);
      setUploadMessage(message || `${file.name} uploaded successfully. Refreshing packet data…`);
      await onPacketsRefresh?.();
    } catch (error) {
      setUploadError(true);
      setUploadMessage(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const protocols = [...new Set(packets.map((packet) => packet.protocol || 'UNKNOWN'))].sort();
  const filteredPackets = packets.filter((packet) => {
    const source = packet.sourceIp || '';
    const destination = packet.destinationIp || packet.destIp || packet.destination || '';
    const matchesText = `${source} ${destination} ${packet.protocol || ''} ${packet.port || ''} ${packet.destinationPort || ''}`
      .toLowerCase().includes(query.toLowerCase());
    return matchesText && (protocolFilter === 'ALL' || (packet.protocol || 'UNKNOWN') === protocolFilter);
  }).sort((a, b) => {
    const left = sort.key === 'timestamp' ? packetDate(a)?.getTime() || 0 : String(a[sort.key] ?? '').toLowerCase();
    const right = sort.key === 'timestamp' ? packetDate(b)?.getTime() || 0 : String(b[sort.key] ?? '').toLowerCase();
    return (left < right ? -1 : left > right ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1);
  });
  const pageCount = Math.max(1, Math.ceil(filteredPackets.length / PAGE_SIZE));
  const visiblePackets = filteredPackets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const changeSort = (key) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };
  const updateQuery = (value) => { setQuery(value); setPage(1); };
  const updateProtocol = (value) => { setProtocolFilter(value); setPage(1); };

  return (
    <main className="dashboard">
      <div className="dashboard-heading">
        <div><p className="eyebrow">NETWORK MONITOR</p><h1>Dashboard</h1><p className="capture-range">Capture range: {rangeLabel}</p></div>
      </div>

      <section className="upload-box" aria-label="Upload packet capture">
        <div><strong>Analyze a packet capture</strong><p>Upload a .pcap or .pcapng file to add its traffic to the dashboard.</p></div>
        <label htmlFor="pcap-upload" className={`upload-button ${uploading ? 'is-disabled' : ''}`}>
          {uploading ? 'Uploading…' : 'Choose capture'}
          <input id="pcap-upload" type="file" accept=".pcap,.pcapng,application/vnd.tcpdump.pcap" onChange={handleFileUpload} disabled={uploading} />
        </label>
        {uploadMessage && <p className={`upload-message ${uploadError ? 'is-error' : ''}`} role="status">{uploadMessage}</p>}
      </section>

      <section className="stat-cards" aria-label="Capture summary">
        <div className="stat-card"><span className="stat-value">{packets.length.toLocaleString()}</span><span className="stat-label">Total packets</span></div>
        <div className="stat-card"><span className="stat-value">{Object.keys(deviceCounts).filter((ip) => ip !== 'Unknown').length}</span><span className="stat-label">Unique sources</span></div>
        <div className="stat-card"><span className="stat-value">{Object.keys(destinationCounts).length}</span><span className="stat-label">Unique destinations</span></div>
        <div className="stat-card"><span className="stat-value stat-value-small">{busiestDevice?.ip || '—'}</span><span className="stat-label">Top source{busiestDevice ? ` · ${busiestDevice.packets} packets` : ''}</span></div>
      </section>

      <section className="chart-box timeline-box">
        <div className="section-heading"><div><h2>Traffic over time</h2><p>Packets per minute</p></div></div>
        {timelineData.length ? <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={timelineData} margin={{ top: 10, right: 12, left: -16, bottom: 4 }}>
            <defs><linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.time ? new Date(payload[0].payload.time).toLocaleString() : ''} />
            <Area type="monotone" dataKey="packets" stroke="#3b82f6" strokeWidth={2} fill="url(#trafficFill)" />
          </AreaChart>
        </ResponsiveContainer> : <div className="chart-empty">Packet timestamps will appear here when available.</div>}
      </section>

      <div className="charts-row">
        <section className="chart-box"><h2>Traffic by protocol</h2>
          {protocolData.length ? <ResponsiveContainer width="100%" height={280}><PieChart>
            <Pie data={protocolData} dataKey="value" nameKey="name" outerRadius="68%" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {protocolData.map((entry) => <Cell key={entry.name} fill={PROTOCOL_COLORS[entry.name] || '#9ca3af'} />)}
            </Pie><Tooltip /><Legend verticalAlign="bottom" height={30} />
          </PieChart></ResponsiveContainer> : <div className="chart-empty">No packet data yet.</div>}
        </section>
        <section className="chart-box"><h2>Top source devices</h2>
          {deviceData.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={deviceData} margin={{ left: -16, right: 8, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="ip" interval={0} angle={-30} textAnchor="end" height={55} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="packets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer> : <div className="chart-empty">No packet data yet.</div>}
        </section>
      </div>

      <section className="packet-section">
        <div className="section-heading packet-heading"><div><h2>Packet details</h2><p>{filteredPackets.length.toLocaleString()} packets match your filters</p></div>
          <div className="packet-filters"><label className="visually-hidden" htmlFor="packet-search">Search packets</label><input id="packet-search" type="search" placeholder="Search IP or port" value={query} onChange={(event) => updateQuery(event.target.value)} />
            <label className="visually-hidden" htmlFor="protocol-filter">Filter by protocol</label><select id="protocol-filter" value={protocolFilter} onChange={(event) => updateProtocol(event.target.value)}><option value="ALL">All protocols</option>{protocols.map((protocol) => <option key={protocol}>{protocol}</option>)}</select></div>
        </div>
        <div className="table-scroll"><table className="packet-table"><thead><tr>
          {[['timestamp', 'Timestamp'], ['sourceIp', 'Source'], ['destinationIp', 'Destination'], ['protocol', 'Protocol']].map(([key, label]) => <th key={key}><button type="button" onClick={() => changeSort(key)}>{label}{sort.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>)}
          <th>Length</th>
        </tr></thead><tbody>
          {visiblePackets.map((packet, index) => {
            const date = packetDate(packet);
            return <tr key={packet.id ?? `${packet.sourceIp}-${date?.getTime() ?? index}-${index}`}>
              <td>{date ? date.toLocaleString() : '—'}</td><td>{packet.sourceIp || '—'}</td><td>{packet.destinationIp || packet.destIp || packet.destination || '—'}</td>
              <td><span className="protocol-pill" style={{ '--protocol-color': PROTOCOL_COLORS[packet.protocol] || '#9ca3af' }}>{packet.protocol || 'UNKNOWN'}</span></td>
              <td>{packet.length ?? packet.packetLength ?? packet.size ?? '—'}</td>
            </tr>;
          })}
          {!visiblePackets.length && <tr><td colSpan="5" className="table-empty">{packets.length ? 'No packets match your search.' : 'No packets to display yet.'}</td></tr>}
        </tbody></table></div>
        <div className="pagination"><span>Page {page} of {pageCount}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</button><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>Next</button></div></div>
      </section>
    </main>
  );
}

export default Dashboard;
