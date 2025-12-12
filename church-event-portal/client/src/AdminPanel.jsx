import { useState } from 'react';
import axios from 'axios';
import './App.css'; 
import { ArrowPathIcon, CheckBadgeIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/solid';
import { DocumentMagnifyingGlassIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';

function AdminPanel() {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // NEW STATE VARIABLES
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_CODE = "admin2025"; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (accessCode === ADMIN_CODE) {
      setIsAuthenticated(true);
      fetchData(); 
    } else {
      alert("Wrong Access Code!");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://dominion-backend-lt5m.onrender.com/api/admin/data');
      setAttendees(res.data.reverse());
    } catch (error) {
      console.error("Error fetching data", error);
    }
    setLoading(false);
  };

  const handleApprove = async (rowIndex) => {
    if(!window.confirm("Confirm payment for this person?")) return;
    try {
      await axios.post('https://dominion-backend-lt5m.onrender.com/api/admin/approve', { rowIndex });
      setAttendees(prev => prev.map(person => 
        person.rowIndex === rowIndex ? { ...person, status: 'Confirmed' } : person
      ));
    } catch (error) {
      alert("Failed to update status.");
    }
  };

  // --- NEW LOGIC: COUNTS ---
  const confirmedCount = attendees.filter(p => p.status === 'Confirmed').length;
  const pendingCount = attendees.filter(p => p.status === 'Pending').length;

  // --- NEW LOGIC: FILTERING ---
  const filteredAttendees = attendees.filter(person => 
    person.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.phone.includes(searchTerm)
  );

  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <img src="https://imgur.com/qyUvkiS.png" alt="Logo" className="auth-logo" />
          <h2 style={{margin: '0 0 1.5rem 0', color: '#111827'}}>Admin Portal</h2>
          <form onSubmit={handleLogin}>
            
            {/* UPDATED PASSWORD INPUT WITH EYE ICON */}
            <div className="input-wrapper" style={{marginBottom: '1.5rem'}}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter Code" 
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="auth-input"
                style={{marginBottom: 0}} // Override margin for wrapper
              />
              <div 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </div>
            </div>

            <button className="btn-primary full-width">Enter Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        {/* We moved the refresh button down to the toolbar for better mobile layout */}
      </div>

      {loading ? (
        <p style={{textAlign:'center', color:'#6B7280', marginTop:'40px'}}>Loading records...</p>
      ) : (
        <div className="data-container">
          
          {/* --- NEW: STATS GRID --- */}
          <div className="stats-grid">
            <div className="stat-card confirmed">
              <div>
                <div className="stat-label">Confirmed</div>
                <div className="stat-value">{confirmedCount}</div>
              </div>
              <div className="stat-icon"><UserGroupIcon className="icon-sm" style={{width:'24px', height:'24px', margin:0}}/></div>
            </div>
            <div className="stat-card pending">
              <div>
                <div className="stat-label">Pending</div>
                <div className="stat-value">{pendingCount}</div>
              </div>
              <div className="stat-icon"><ClockIcon className="icon-sm" style={{width:'24px', height:'24px', margin:0}}/></div>
            </div>
          </div>

          {/* --- NEW: TOOLBAR (SEARCH + REFRESH) --- */}
          <div className="toolbar">
            <div className="search-wrapper">
              <MagnifyingGlassIcon className="search-icon"/>
              <input 
                type="text" 
                placeholder="Search by name, phone, location..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={fetchData} className="btn-refresh">
              <ArrowPathIcon className="icon-sm"/> Refresh List
            </button>
          </div>

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

          {/* RENDER FILTERED LIST INSTEAD OF FULL LIST */}
          {filteredAttendees.map((person, index) => (
            <div className="data-card" key={person.rowIndex}>
              {/* DESKTOP ROW */}
              <div className="d-col d-id"><span className="row-index">{attendees.length - index}</span></div> 
              {/* Note: Index calculation adjusted since we reversed the data array */}
              
              <div className="d-col d-name"><div className="user-info"><strong>{person.fullName}</strong></div></div>
              <div className="d-col d-loc">{person.location}</div>
              <div className="d-col d-type"><span className={`badge-pill ${person.ticketType.toLowerCase()}`}>{person.ticketType}</span></div>
              <div className="d-col d-phone">{person.phone}</div>
              <div className="d-col d-proof">{person.paymentScreenshot ? <a href={person.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="btn-view"><DocumentMagnifyingGlassIcon className="icon-sm"/> View</a> : <span>-</span>}</div>
              <div className="d-col d-status"><span className={`status-tag ${person.status.toLowerCase()}`}>{person.status}</span></div>
              <div className="d-col d-action" style={{textAlign:'right'}}>{person.status === 'Confirmed' ? <span className="done-mark"><CheckBadgeIcon className="icon-sm"/> Done</span> : <button onClick={() => handleApprove(person.rowIndex)} className="btn-approve">Approve</button>}</div>

              {/* MOBILE CARD */}
              <div className="mobile-card-content">
                <div className="m-header">
                  <div className="m-user">
                    <strong>{person.fullName}</strong>
                    <span className="location-text"><MapPinIcon className="icon-xs"/> {person.location}</span>
                  </div>
                  <div className="m-id-badge">{attendees.length - index}</div>
                </div>
                <hr className="m-divider"/>
                <div className="m-body">
                  <div className="mobile-row"><span className="m-label">Type</span><span className={`badge-pill ${person.ticketType.toLowerCase()}`}>{person.ticketType}</span></div>
                  <div className="mobile-row"><span className="m-label">Phone</span><span className="phone-display"><PhoneIcon className="icon-xs"/> {person.phone}</span></div>
                  <div className="mobile-row"><span className="m-label">Proof</span>{person.paymentScreenshot ? <a href={person.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="btn-view">View Image</a> : <span>-</span>}</div>
                  <div className="mobile-row"><span className="m-label">Status</span><span className={`status-tag ${person.status.toLowerCase()}`}>{person.status}</span></div>
                </div>
                <div className="m-footer">{person.status === 'Confirmed' ? <div className="done-box"><CheckBadgeIcon className="icon-sm"/> Payment Confirmed</div> : <button onClick={() => handleApprove(person.rowIndex)} className="btn-approve full-width">Approve Payment</button>}</div>
              </div>
            </div>
          ))}

          {!loading && filteredAttendees.length === 0 && (
            <p style={{textAlign:'center', marginTop:'30px', color: '#9CA3AF'}}>
              {searchTerm ? "No results found for your search." : "No registrations found."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;