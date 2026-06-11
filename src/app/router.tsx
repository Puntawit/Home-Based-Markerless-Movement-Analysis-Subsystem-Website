import { createBrowserRouter, Navigate } from "react-router-dom";
import { DoctorDashboardPage } from "@/features/doctor/pages/DoctorDashboardPage";
import { PatientLayout } from "@/features/patient/components/PatientLayout";
import { PatientFeedbackPage } from "@/features/patient/pages/PatientFeedbackPage";
import { PatientHomePage } from "@/features/patient/pages/PatientHomePage";
import { PatientLoginPage } from "@/features/patient/pages/PatientLoginPage";
import { PatientRecordPage } from "@/features/patient/pages/PatientRecordPage";
import { PatientStatusPage } from "@/features/patient/pages/PatientStatusPage";
import { PatientTutorialPage } from "@/features/patient/pages/PatientTutorialPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/patient/login" replace /> },
  {
    path: "/patient",
    element: <PatientLayout />,
    children: [
      { index: true, element: <Navigate to="/patient/login" replace /> },
      { path: "login", element: <PatientLoginPage /> },
      { path: "home", element: <PatientHomePage /> },
      { path: "tutorial", element: <PatientTutorialPage /> },
      { path: "record", element: <PatientRecordPage /> },
      { path: "status", element: <PatientStatusPage /> },
      { path: "feedback", element: <PatientFeedbackPage /> },
    ],
  },
  { path: "/doctor", element: <Navigate to="/doctor/dashboard" replace /> },
  { path: "/doctor/dashboard", element: <DoctorDashboardPage /> },
  { path: "*", element: <Navigate to="/patient/login" replace /> },
]);
