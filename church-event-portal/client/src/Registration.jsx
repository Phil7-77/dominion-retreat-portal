import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { UserIcon, MapPinIcon, PhoneIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dcih4tkwz/image/upload"; 
const UPLOAD_PRESET = "end_of_year_retreat";

// VERIFY THIS URL: Open it in your browser. It should say "Dominion Retreat Server Running"
const BACKEND_URL = "https://dominion-backend-lt5m.onrender.com";

function Registration() {
  const [registrants, setRegistrants] = useState([]);
  const [currentPerson, setCurrentPerson] = useState({
    fullName: '',
    location: '',
    phone: '',
    ticketType: 'Worker'
  });
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [status, setStatus] = useState('idle');

  // --- HANDLERS ---
  const handleChange = (e) => {
    setCurrentPerson({ ...currentPerson, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setPaymentScreenshot(e.target.files[0]);
  };

  const addPersonToList = () => {
    if (!currentPerson.fullName || !currentPerson.phone || !currentPerson.location) {
      alert("Please fill in all fields before adding.");
      return;
    }
    setRegistrants([...registrants, currentPerson]);
    setCurrentPerson({ ...currentPerson, fullName: '', phone: '' }); 
  };

  const removePerson = (index) => {
    const updated = registrants.filter((_, i) => i !== index);
    setRegistrants(updated);
  };

  // --- SMART TOTAL CALCULATION ---
  const calculateTotal = () => {
    let total = registrants.reduce((sum, p) => sum + (p.ticketType === 'Worker' ? 150 : 100), 0);
    
    // If there is valid data in the form inputs, add that price too
    if (currentPerson.fullName && currentPerson.phone) {
      total += (currentPerson.ticketType === 'Worker' ? 150 : 100);
    }
    return total;
  };

  // --- SMART SUBMIT LOGIC (The Fix) ---
  const handleFinalSubmit = async (e) => {
    e.preventDefault(); // Stop page refresh

    // 1. Build the Final List (List + Current Form Input)
    let finalPayload = [...registrants];

    // If the user typed someone in the form but didn't click "Add", include them!
    if (currentPerson.fullName && currentPerson.phone && currentPerson.location) {
      finalPayload.push(currentPerson);
    }

    // 2. Validation
    if (finalPayload.length === 0) {
      alert("Please enter your details to register.");
      return;
    }
    if (!paymentScreenshot) {
      alert("Please upload the payment screenshot.");
      return;
    }

    setStatus('submitting');

    try {
      // 3. Upload Image
      const imageFormData = new FormData();
      imageFormData.append('file', paymentScreenshot);
      imageFormData.append('upload_preset', UPLOAD_PRESET);

      const cloudinaryRes = await axios.post(CLOUDINARY_URL, imageFormData);
      const imageUrl = cloudinaryRes.data.secure_url;

      // 4. Attach Image to Everyone
      const peopleToRegister = finalPayload.map(person => ({
        fullName: person.fullName,
        location: person.location,
        phone: person.phone,
        ticketType: person.ticketType,
        paymentScreenshot: imageUrl
      }));

      // 5. Send ONE batch request
      // We use the new endpoint for BOTH single and group users
      await axios.post(`${BACKEND_URL}/api/register-group`, { 
        registrants: peopleToRegister 
      });
      
      setStatus('success');
      setRegistrants([]);
      setCurrentPerson({ fullName: '', location: '', phone: '', ticketType: 'Worker' });
    } catch (error) {
      console.error("Registration Error:", error);
      if (error.response && error.response.status === 409) {
        setStatus('duplicate');
      } else {
        setStatus('error');
      }
    }
  };

  // --- COUNTDOWN (Keep existing logic) ---
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const targetDate = new Date("December 21, 2025 00:00:00").getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        clearInterval(timer); setTimeLeft(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (status === 'success') {
    return (
      <div className="container">
        <div className="card">
          <div className="success-message">
            <CheckCircleIcon className="success-icon" />
            <h1>Registration Complete!</h1>
            <p style={{marginBottom: '1.5rem', color: '#6B7280'}}>Success! Please join the platform below.</p>
            <a href="https://chat.whatsapp.com/FAz7Wb4gmNT5m0DjaIrGsi?mode=hqrt1" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
              Click to join WhatsApp Platform
            </a>
            <div style={{marginTop: '2rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem'}}>
               <button className="btn-secondary" onClick={() => window.location.reload()}>Register Another Person</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
       <div className="registration-header">
        <img src="https://imgur.com/qyUvkiS.png" alt="Church Logo"/>
        <h1>End of Year Retreat 2025</h1>
        <p>Register yourself or your group</p>
      </div>

      {timeLeft ? (
        <div className="countdown-container">
          <p className="countdown-label">Registration closes in:</p>
          <div className="timer-box">
             <div className="time-unit"><span className="time-val">{timeLeft.days||0}</span><span className="time-txt">Days</span></div>
             <div className="time-unit"><span className="time-val">{timeLeft.hours||0}</span><span className="time-txt">Hrs</span></div>
             <div className="time-unit"><span className="time-val">{timeLeft.minutes||0}</span><span className="time-txt">Mins</span></div>
             <div className="time-unit"><span className="time-val">{timeLeft.seconds||0}</span><span className="time-txt">Secs</span></div>
          </div>
        </div>
      ) : <div className="countdown-closed">Registration Closed</div>}

      <div className="card">
        {/* LIST SECTION (Only shows if people are added) */}
        {registrants.length > 0 && (
          <div style={{ marginBottom: '20px', background: '#F3F4F6', padding: '15px', borderRadius: '8px' }}>
             <h3 style={{fontSize: '1rem', margin: '0 0 10px 0', color: '#374151'}}>Group Members ({registrants.length})</h3>
             {registrants.map((person, idx) => (
               <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'white', padding:'8px', marginBottom:'5px', borderRadius:'6px', border:'1px solid #E5E7EB'}}>
                  <div><span style={{fontWeight:'bold', display:'block'}}>{person.fullName}</span><span style={{fontSize:'0.8rem', color:'#6B7280'}}>{person.ticketType} - {person.location}</span></div>
                  <button onClick={() => removePerson(idx)} style={{background:'none', border:'none', cursor:'pointer', color:'#EF4444'}}><TrashIcon style={{width:'18px'}}/></button>
               </div>
             ))}
          </div>
        )}

        {/* INPUT FORM */}
        <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper"><UserIcon className="icon" /><input type="text" name="fullName" value={currentPerson.fullName} onChange={handleChange} placeholder="John Doe"/></div>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-wrapper"><PhoneIcon className="icon" /><input type="tel" name="phone" value={currentPerson.phone} onChange={handleChange} placeholder="020 123 4567"/></div>
            </div>
            <div className="form-group">
              <label>Location / Branch</label>
              <div className="input-wrapper"><MapPinIcon className="icon" /><input type="text" name="location" value={currentPerson.location} onChange={handleChange} placeholder="Kumasi"/></div>
            </div>
             <div className="form-group">
              <label>Registering As</label>
              <div className="input-wrapper">
                <select name="ticketType" value={currentPerson.ticketType} onChange={handleChange}>
                  <option value="Worker">Worker (GH₵ 150.00)</option>
                  <option value="Student">Student (GH₵ 100.00)</option>
                </select>
              </div>
            </div>
        </div>

        {/* OPTIONAL ADD BUTTON */}
        <button type="button" onClick={addPersonToList} className="btn-secondary" style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px'}}>
          <UserPlusIcon style={{width: '20px'}}/> Add Another Person (Optional)
        </button>

        <hr style={{border: 'none', borderTop: '1px dashed #E5E7EB', margin: '20px 0'}} />

        <div className="payment-info">
           <p style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem'}}><strong>Total Due: GH₵ {calculateTotal()}.00</strong></p>
           <p style={{margin: 0, fontSize: '0.9rem'}}>Send to MoMo: <strong>055-070-3541</strong><br/>Name: <strong>Daniel Obeng Tuffour</strong></p>
        </div>

        <div className="form-group">
           <label>Upload Payment Screenshot</label>
           <div className="input-wrapper" style={{border: '1px dashed #E5E7EB', padding: '10px', borderRadius: '8px'}}>
             <CameraIcon className="icon" style={{top: '18px'}} />
             <input type="file" accept="image/*" onChange={handleFileChange} style={{border: 'none', paddingLeft: '40px'}} />
           </div>
           {status === 'submitting' && <small style={{color: 'blue'}}>Processing registration... please wait.</small>}
        </div>

        {/* ERROR MESSAGES */}
        {status === 'duplicate' && (
           <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
             <ExclamationTriangleIcon style={{width:'20px'}}/> <span>Member already registered.</span>
           </div>
        )}
        {status === 'error' && (
           <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
             Connection Failed. Please contact Admin.
           </div>
        )}

        {/* FINAL BUTTON - NOW ALWAYS ACTIVE */}
        <button 
          type="button" 
          className="btn-submit" 
          onClick={handleFinalSubmit}
          disabled={status === 'submitting'} 
        >
          {status === 'submitting' ? 'Processing...' : `Complete Registration`}
        </button>

      </div>
      <p style={{textAlign: 'center', marginTop: '2rem', color: '#94A3B8', fontSize: '0.8rem'}}>&copy; O.T Daniel Ministry</p>
    </div>
  );
}

export default Registration;