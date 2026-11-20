/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './layouts/AppLayout';
import DashboardView from './pages/app/DashboardView';
import EmployeeAttendanceView from './pages/app/EmployeeAttendanceView';
import StudentAttendanceView from './pages/app/StudentAttendanceView';
import StudentRecapView from './pages/app/StudentRecapView';
import EmployeeRecapView from './pages/app/EmployeeRecapView';
import StudentsDataView from './pages/app/StudentsDataView';
import UserManagementView from './pages/app/UserManagementView';
import type { UserRole } from './types';

function RoleGuard({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  const role: UserRole = profile?.role || 'tenaga_kependidikan';
  if (!allowed.includes(role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="absensi-karyawan" element={<EmployeeAttendanceView />} />

            <Route
              path="absensi-siswa"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentAttendanceView />
                </RoleGuard>
              }
            />
            <Route
              path="absensi-siswa/:kelas"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentAttendanceView />
                </RoleGuard>
              }
            />

            <Route
              path="rekap/siswa"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentRecapView />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/siswa/:kelas"
              element={
                <RoleGuard allowed={['admin', 'guru']}>
                  <StudentRecapView />
                </RoleGuard>
              }
            />

            <Route
              path="rekap/karyawan"
              element={
                <RoleGuard allowed={['admin']}>
                  <EmployeeRecapView />
                </RoleGuard>
              }
            />

            <Route
              path="data-siswa"
              element={
                <RoleGuard allowed={['admin']}>
                  <StudentsDataView />
                </RoleGuard>
              }
            />
            <Route
              path="data-siswa/:kelas"
              element={
                <RoleGuard allowed={['admin']}>
                  <StudentsDataView />
                </RoleGuard>
              }
            />

            <Route
              path="user-management"
              element={
                <RoleGuard allowed={['admin']}>
                  <UserManagementView />
                </RoleGuard>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
