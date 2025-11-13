import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedLayout from "./middlewares/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage/LoginPage.jsx";
import HomePage from "./pages/HomePage/HomePage.jsx";
import MoviesPage from "./pages/MoviesPage/MoviesPage.jsx";
import PhotosPage from "./pages/PhotosPage/PhotosPage.jsx";
import PasswordsPage from "./pages/PasswordsPage/PasswordsPage.jsx";
import { AuthProvider } from "./context/AuthContext/AuthContext.jsx";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/photos" element={<PhotosPage />} />
            <Route path="/passwords" element={<PasswordsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
