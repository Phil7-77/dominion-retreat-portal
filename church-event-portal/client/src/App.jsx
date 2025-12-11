import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Registration from './Registration';
import AdminPanel from './AdminPanel';

function App() {
  return (
    <Router>
      <Routes>
        {/* The main page everyone sees */}
        <Route path="/" element={<Registration />} />
        
        {/* The hidden admin page */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;