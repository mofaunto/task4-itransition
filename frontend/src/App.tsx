import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import PrivateRoute from './components/PrivateRoute';
import Landing from './components/Landing';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminPanel />
          </PrivateRoute>
        } />
        <Route path="/" element={<Landing />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;