import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/homepage.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/homepage" element={<HomePage />} />
    </Routes>
  );
}
