import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLoadingScreen } from "@/app/AuthLoadingScreen";
import { RoleEntryRoute } from "@/app/RoleEntryRoute";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { PatientLayout } from "@/features/patient/components/PatientLayout";
import { PatientHomePage } from "@/features/patient/pages/PatientHomePage";
import { PatientLoginPage } from "@/features/patient/pages/PatientLoginPage";
import { PatientStatusPage } from "@/features/patient/pages/PatientStatusPage";
import { PatientTutorialPage } from "@/features/patient/pages/PatientTutorialPage";

const DoctorDashboardPage = lazy(() =>
  import("@/features/doctor/pages/DoctorDashboardPage").then((module) => ({
    default: module.DoctorDashboardPage,
  })),
);

const DoctorLoginPage = lazy(() =>
  import("@/features/doctor/pages/DoctorLoginPage").then((module) => ({
    default: module.DoctorLoginPage,
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

const AdminPatientsPage = lazy(() =>
  import("@/features/admin/pages/AdminPatientsPage").then((module) => ({
    default: module.AdminPatientsPage,
  })),
);

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/patient" replace /> },
  {
    path: "/patient",
    element: <PatientLayout />,
    children: [
      {
        index: true,
        element: <RoleEntryRoute loginPath="/patient/login" role="patient" successPath="/patient/home" />,
      },
      { path: "login", element: <PatientLoginPage /> },
      {
        path: "home",
        element: (
          <ProtectedRoute loginPath="/patient/login" role="patient">
            <PatientHomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "tutorial",
        element: (
          <ProtectedRoute loginPath="/patient/login" role="patient">
            <PatientTutorialPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "record",
        element: (
          <ProtectedRoute loginPath="/patient/login" role="patient">
            <Suspense fallback={<AuthLoadingScreen message="กำลังโหลดหน้า..." />}>
              <PatientRecordPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "status",
        element: (
          <ProtectedRoute loginPath="/patient/login" role="patient">
            <PatientStatusPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "feedback",
        element: (
          <ProtectedRoute loginPath="/patient/login" role="patient">
            <Suspense fallback={<AuthLoadingScreen message="กำลังโหลดหน้า..." />}>
              <PatientFeedbackPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/doctor",
    element: <RoleEntryRoute loginPath="/doctor/login" role="doctor" successPath="/doctor/dashboard" />,
  },
  {
    path: "/doctor/login",
    element: (
      <Suspense fallback={<AuthLoadingScreen message="กำลังโหลดหน้า..." />}>
        <DoctorLoginPage />
      </Suspense>
    ),
  },
  {
    path: "/doctor/dashboard",
    element: (
      <ProtectedRoute loginPath="/doctor/login" role="doctor">
        <Suspense fallback={<AuthLoadingScreen message="กำลังโหลดหน้า..." />}>
          <DoctorDashboardPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  { path: "/admin", element: <Navigate to="/admin/login" replace /> },
  {
    path: "/admin/login",
    element: (
      <Suspense fallback={<AuthLoadingScreen message="กำลังโหลดหน้า..." />}>
        <AdminLoginPage />
      </Suspense>
    ),
  },
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute loginPath="/admin/login" role="admin">
        <Suspense fallback={<AuthLoadingScreen message="กำลังโหลดหน้า..." />}>
          <AdminDashboardPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/patients",
    element: (
      <ProtectedRoute loginPath="/admin/login" role="admin">
        <Suspense fallback={<AuthLoadingScreen message="กำลังโหลดหน้า..." />}>
          <AdminPatientsPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/patient" replace /> },
]);
