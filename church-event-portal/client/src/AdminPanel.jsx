import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; 
import { ArrowPathIcon, LockClosedIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { DocumentMagnifyingGlassIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';

function AdminPanel() {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false); // Start false to show login first
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const ADMIN_CODE = "admin2025"; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (accessCode === ADMIN_CODE) {
      setIsAuthenticated(true);
      fetchData(); // Fetch immediately after login
    } else {
      alert("Wrong Access Code!");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Make sure this matches your Live Render URL
     const res = await axios.get('https://dominion-backend-1t5m.onrender.com/api/admin/data');
      console.log("Data fetched:", res.data); // Console Log for debugging
      setAttendees(res.data.reverse());
    } catch (error) {
      console.error("Error fetching data", error);
      alert("Could not load data. The server might be waking up. Try 'Refresh' in 30 seconds.");
    }
    setLoading(false);
  };

  const handleApprove = async (rowIndex) => {
    if(!window.confirm("Confirm payment for this person?")) return;
    try {
      await axios.post('https://dominion-backend-1t5m.onrender.com/api/admin/approve', { rowIndex });
      
      // Update UI immediately
      setAttendees(prev => prev.map(person => 
        person.rowIndex === rowIndex ? { ...person, status: 'Confirmed' } : person
      ));
    } catch (error) {
      alert("Failed to update status.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <img src="https://imgur.com/qyUvkiS.png" alt="Logo" className="auth-logo" />
          <h2 style={{margin: '0 0 1.5rem 0', color: '#111827'}}>Admin Portal</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Enter Code" 
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="auth-input"
            />
            <button className="btn-primary full-width">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={fetchData} className="btn-refresh">
            <ArrowPathIcon className="icon-sm"/> Refresh
        </button>
      </div>

      {loading ? (
        <p style={{textAlign:'center', color:'#6B7280', marginTop: '50px'}}>Loading records... (Server might be waking up)</p>
      ) : (
        <div className="data-container">
          {/* DESKTOP HEADER */}
          <div className="desktop-header">
            <div>#</div>
            <div>Name</div>
            <div>Location</div>
            <div>Type</div>
            <div>Phone</div>
            <div>Proof</div>
            <div>Status</div>
            <div style={{textAlign:'right'}}>Action</div>
          </div>

          {attendees.map((person, index) => (
            <div className="data-card" key={person.rowIndex}>
              
              {/* === DESKTOP COLUMNS === */}
              <div className="d-col d-id"><span className="row-index">{index + 1}</span></div>
              <div className="d-col d-name">
                 <div className="user-info"><strong>{person.fullName}</strong></div>
              </div>
              <div className="d-col d-loc">{person.location}</div>
              <div className="d-col d-type"><span className={`badge-pill ${person.ticketType.toLowerCase()}`}>{person.ticketType}</span></div>
              <div className="d-col d-phone">{person.phone}</div>
              <div className="d-col d-proof">
                 {person.paymentScreenshot ? (
                  <a href={person.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="btn-view">
                    <DocumentMagnifyingGlassIcon className="icon-sm"/> View
                  </a>
                ) : <span className="text-gray">-</span>}
              </div>
              <div className="d-col d-status"><span className={`status-tag ${person.status.toLowerCase()}`}>{person.status}</span></div>
              <div className="d-col d-action" style={{textAlign:'right'}}>
                 {person.status === 'Confirmed' ? (
                   <span className="done-mark"><CheckBadgeIcon className="icon-sm"/> Done</span>
                ) : (
                  <button onClick={() => handleApprove(person.rowIndex)} className="btn-approve">Approve</button>
                )}
              </div>

              {/* === MOBILE CARD CONTENT === */}
              <div className="mobile-card-content">
                <div className="m-header">
                  <div className="m-user">
                    <strong>{person.fullName}</strong>
                    <span className="location-text"><MapPinIcon className="icon-xs"/> {person.location}</span>
                  </div>
                  <div className="m-id-badge">{index + 1}</div>
                </div>
                <hr className="m-divider"/>
                <div className="m-body">
                  <div className="mobile-row">
                    <span className="m-label">Type</span>
                    <span className={`badge-pill ${person.ticketType.toLowerCase()}`}>{person.ticketType}</span>
                  </div>
                  <div className="mobile-row">
                    <span className="m-label">Phone</span>
                    <span className="phone-display"><PhoneIcon className="icon-xs"/> {person.phone}</span>
                  </div>
                  <div className="mobile-row">
                    <span className="m-label">Proof</span>
                     {person.paymentScreenshot ? (
                      <a href={person.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="btn-view">
                        View Image
                      </a>
                    ) : <span>-</span>}
                  </div>
                  <div className="mobile-row">
                    <span className="m-label">Status</span>
                    <span className={`status-tag ${person.status.toLowerCase()}`}>{person.status}</span>
                  </div>
                </div>
                <div className="m-footer">
                   {person.status === 'Confirmed' ? (
                     <div className="done-box"><CheckBadgeIcon className="icon-sm"/> Payment Confirmed</div>
                  ) : (
                    <button onClick={() => handleApprove(person.rowIndex)} className="btn-approve full-width">Approve Payment</button>
                  )}
                </div>
              </div>

            </div>
          ))}
          
          {!loading && attendees.length === 0 && (
            <p className="empty-msg" style={{textAlign:'center', marginTop:'30px', color: '#888'}}>
              No registrations found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;