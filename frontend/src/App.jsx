import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { SubjectProvider } from './context/SubjectContext'
import { ToastProvider } from './context/ToastContext'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Test from './pages/Test'
import Progress from './pages/Progress'
import Register from './pages/Register'
import Login from './pages/Login'
import Prediction from './pages/Prediction'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Profile from './pages/Profile'

function App() {
  return (
    <UserProvider>
      <SubjectProvider>
        <ToastProvider>
          <Router>
            <Layout>
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test"
              element={
                <ProtectedRoute>
                  <Test />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prediction"
              element={
                <ProtectedRoute>
                  <Prediction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
              </Routes>
            </Layout>
          </Router>
        </ToastProvider>
      </SubjectProvider>
    </UserProvider>
  )
}

export default App

