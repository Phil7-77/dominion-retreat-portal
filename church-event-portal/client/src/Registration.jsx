import { useState } from 'react';
import axios from 'axios';
import './App.css';
import { UserIcon, MapPinIcon, PhoneIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dcih4tkwz/image/upload"; 
const UPLOAD_PRESET = "end_of_year_retreat";

function Registration() {
  const [formData, setFormData] = useState({
    fullName: '',
    location: '',
    phone: '',
    ticketType: 'Worker',
    paymentScreenshot: null 
  });
  
  const [status, setStatus] = useState('idle');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, paymentScreenshot: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      let imageUrl = "";

      if (formData.paymentScreenshot) {
        const imageFormData = new FormData();
        imageFormData.append('file', formData.paymentScreenshot);
        imageFormData.append('upload_preset', UPLOAD_PRESET);

        const cloudinaryRes = await axios.post(CLOUDINARY_URL, imageFormData);
        imageUrl = cloudinaryRes.data.secure_url;
      }

      const finalData = {
        fullName: formData.fullName,
        location: formData.location,
        phone: formData.phone,
        ticketType: formData.ticketType,
        paymentScreenshot: imageUrl
      };

      // Ensure this matches your Vercel/Render URL
      await axios.post('https://dominion-backend.onrender.com/api/register', finalData);
      
      setStatus('success');
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 409) {
        setStatus('duplicate');
      } else {
        setStatus('error');
      }
    }
  };

  const price = formData.ticketType === 'Worker' ? '150.00' : '100.00';

  if (status === 'success') {
    return (
      <div className="container">
        <div className="card">
          <div className="success-message">
            <CheckCircleIcon className="success-icon" />
            <h1>Registration Complete!</h1>
            <p className="subtitle">See you at <strong>the End of Year Retreat</strong>!</p>
            <button className="btn-submit" onClick={() => window.location.reload()}>Register Another Person</button>
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
      </div>
      
      <div className="card">
        <form onSubmit={handleSubmit}>
          
          {/* --- NEW: 2-COLUMN GRID WRAPPER --- */}
          <div className="form-grid">
            
            {/* Row 1, Col 1 */}
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <UserIcon className="icon" />
                <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="John Doe"/>
              </div>
            </div>

            {/* Row 1, Col 2 */}
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-wrapper">
                <PhoneIcon className="icon" />
                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="020 123 4567"/>
              </div>
            </div>

            {/* Row 2, Col 1 */}
            <div className="form-group">
              <label>Location / Branch</label>
              <div className="input-wrapper">
                <MapPinIcon className="icon" />
                <input type="text" name="location" required value={formData.location} onChange={handleChange} placeholder="Kumasi"/>
              </div>
            </div>

            {/* Row 2, Col 2 */}
             <div className="form-group">
              <label>Registering As</label>
              <div className="input-wrapper">
                <select name="ticketType" value={formData.ticketType} onChange={handleChange}>
                  <option value="Worker">Worker (GH₵ 150.00)</option>
                  <option value="Student">Student (GH₵ 100.00)</option>
                </select>
              </div>
            </div>

          </div>
          {/* --- END GRID WRAPPER --- */}

          <div className="payment-info">
            <p style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem'}}><strong>Amount Due: GH₵ {price}</strong></p>
            <p style={{margin: 0, fontSize: '0.9rem'}}>Send to MoMo: <strong>055-070-3541</strong><br/>Name: <strong>Daniel Obeng Tuffour</strong></p>
          </div>

          <div className="form-group">
            <label>Upload Payment Screenshot</label>
            <div className="input-wrapper" style={{border: '1px dashed #E5E7EB', padding: '10px', borderRadius: '8px'}}>
              <CameraIcon className="icon" style={{top: '18px'}} />
              <input type="file" accept="image/*" required onChange={handleFileChange} style={{border: 'none', paddingLeft: '40px'}} />
            </div>
            {status === 'submitting' && <small style={{color: 'blue'}}>Uploading image... please wait.</small>}
          </div>

          {status === 'duplicate' && (
            <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              <ExclamationTriangleIcon style={{width:'20px'}}/>
              <span>Member is already registered.</span>
            </div>
          )}

          {status === 'error' && (
             <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
              Registration failed. Please check your connection.
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Processing...' : 'Complete Registration'}
          </button>

        </form>
      </div>
      <p style={{textAlign: 'center', marginTop: '2rem', color: '#94A3B8', fontSize: '0.8rem'}}>&copy; O.T Daniel Ministry</p>
    </div>
  );
}

export default Registration;