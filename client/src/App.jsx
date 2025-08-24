import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import useAuth from "./hooks/useAuth";
import { OnlineUsersProvider } from './contexts/OnlineUsersContext';
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  // console.log("PrivateRoute user:", user);
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* <Route path="/register" element={<Register />} /> */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <OnlineUsersProvider>
              <Chat />
              </OnlineUsersProvider>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
