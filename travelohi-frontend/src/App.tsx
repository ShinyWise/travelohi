import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function HomePage() {
  return (
    <div>
      <h2>Welcome to TraveloHI</h2>
      <p>Start build here!</p>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
