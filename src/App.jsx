import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminAppLayout from './components/AdminAppLayout';
import ClientPage from './pages/Client';
import AnalysisTypePage from './pages/AnalysisType';
import DepartmentPage from './pages/Department';
import DevicePage from './pages/Device';
import DeviceCategoryPage from './pages/DeviceCategory';
import ReagentPage from './pages/Reagent';
import ReagentStoragePage from './pages/ReagentStorage';
import ReferenceMaterialPage from './pages/ReferenceMaterial';
import ReportCoverPage from './pages/ReportCover';
import ReportTablePage from './pages/ReportTable';
import RolePage from './pages/Role';
import TaskTypePage from './pages/TaskType';
import TestCategoryPage from './pages/TestCategory';
import TestItemPage from './pages/TestItem';
import TestMethodPage from './pages/TestMethod';
import UserPage from './pages/User';
import {
  AdminHome,
  ControlPage,
  ProcessingMethodPage,
  ProcessingOptionPage,
  ResetPasswordPage
} from './pages/DummyPages';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <AdminAppLayout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<AdminHome />} />
            <Route path="AnalysisType" element={<AnalysisTypePage />} />
            <Route path="Client" element={<ClientPage />} />
            <Route path="Control" element={<ControlPage />} />
            <Route path="Department" element={<DepartmentPage />} />
            <Route path="Device" element={<DevicePage />} />
            <Route path="DeviceCategory" element={<DeviceCategoryPage />} />
            <Route path="ProcessingMethod" element={<ProcessingMethodPage />} />
            <Route path="ProcessingOption" element={<ProcessingOptionPage />} />
            <Route path="Reagent" element={<ReagentPage />} />
            <Route path="ReagentStorage" element={<ReagentStoragePage />} />
            <Route path="ReferenceMaterial" element={<ReferenceMaterialPage />} />
            <Route path="ReportCover" element={<ReportCoverPage />} />
            <Route path="ReportTable" element={<ReportTablePage />} />
            <Route path="Role" element={<RolePage />} />
            <Route path="TaskType" element={<TaskTypePage />} />
            <Route path="TestCategory" element={<TestCategoryPage />} />
            <Route path="TestItem" element={<TestItemPage />} />
            <Route path="TestMethod" element={<TestMethodPage />} />
            <Route path="User" element={<UserPage />} />
          </Route>

          <Route
            path="/reset-password"
            element={
              <ProtectedRoute>
                <AdminAppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ResetPasswordPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
