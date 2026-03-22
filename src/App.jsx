import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedLayout from "./middlewares/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext/AuthContext.jsx";
import "./App.css";

const LoginPage    = lazy(() => import("./pages/LoginPage/LoginPage.jsx"));
const HomePage     = lazy(() => import("./pages/HomePage/HomePage.jsx"));
const MoviesPage   = lazy(() => import("./pages/MoviesPage/MoviesPage.jsx"));
const GalleryPage  = lazy(() => import("./pages/GalleryPage/GalleryPage.jsx"));
const PasswordsPage = lazy(() => import("./pages/PasswordsPage/PasswordsPage.jsx"));

function PageLoader() {
  return (
    <div className="app-spinner-wrap">
      <div className="app-spinner" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/passwords" element={<PasswordsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
