import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { AuthLoginPage } from "@/app/AuthLoginPage";
import { ChangePasswordPage } from "@/app/ChangePasswordPage";
import { LandingPage } from "@/app/LandingPage";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { PatientLayout } from "@/features/patient/components/PatientLayout";
import { PatientHomePage } from "@/features/patient/pages/PatientHomePage";
import { PatientStatusPage } from "@/features/patient/pages/PatientStatusPage";
import { PatientTutorialPage } from "@/features/patient/pages/PatientTutorialPage";

const DoctorDashboardPage = lazy(() =>
  import("@/features/doctor/pages/DoctorDashboardPage").then((module) => ({
    default: module.DoctorDashboardPage,
  })),
);

const PatientRecordPage = lazy(() =>
  import("@/features/patient/pages/PatientRecordPage").then((module) => ({
    default: module.PatientRecordPage,
  })),
);

const PatientFeedbackPage = lazy(() =>
  import("@/features/patient/pages/PatientFeedbackPage").then((module) => ({
    default: module.PatientFeedbackPage,
  })),
);

const AdminDashboardPage = lazy(() =>
  import("@/features/admin/pages/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);

const AdminLoginPage = lazy(() =>
  import("@/features/admin/pages/AdminLoginPage").then((module) => ({
    default: module.AdminLoginPage,
  })),
);

const pageLoading = <AuthLoadingScreen message="กำลังโหลดหน้า..." />;

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/auth/login", element: <AuthLoginPage /> },
  { path: "/auth/change-password", element: <ChangePasswordPage /> },
  {
    path: "/patient",
    element: <PatientLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute loginPath="/auth/login?type=patient" role="patient">
            <PatientHomePage />
          </ProtectedRoute>
        ),
      },
      { path: "login", element: <Navigate replace to="/auth/login?type=patient" /> },
      { path: "home", element: <Navigate replace to="/patient" /> },
      {
        path: "tutorial",
        element: (
          <ProtectedRoute loginPath="/auth/login?type=patient" role="patient">
            <PatientTutorialPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "record",
        element: (
          <ProtectedRoute loginPath="/auth/login?type=patient" role="patient">
            <Suspense fallback={pageLoading}>
              <PatientRecordPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "status",
        element: (
          <ProtectedRoute loginPath="/auth/login?type=patient" role="patient">
            <PatientStatusPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "feedback",
        element: (
          <ProtectedRoute loginPath="/auth/login?type=patient" role="patient">
            <Suspense fallback={pageLoading}>
              <PatientFeedbackPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/doctor",
    element: (
      <ProtectedRoute loginPath="/auth/login?type=doctor" role="doctor">
        <Suspense fallback={pageLoading}>
          <DoctorDashboardPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  { path: "/doctor/login", element: <Navigate replace to="/auth/login?type=doctor" /> },
  { path: "/doctor/dashboard", element: <Navigate replace to="/doctor" /> },
  { path: "/admin", element: <Navigate to="/admin/login" replace /> },
  {
    path: "/admin/login",
    element: (
      <Suspense fallback={pageLoading}>
        <AdminLoginPage />
      </Suspense>
    ),
  },
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute loginPath="/admin/login" role="admin">
        <Suspense fallback={pageLoading}>
          <AdminDashboardPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
