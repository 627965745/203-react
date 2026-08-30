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
import ProcessingMethodPage from './pages/ProcessingMethod';
import ReagentPage from './pages/Reagent';
import ReagentStoragePage from './pages/ReagentStorage';
import ReagentStockPage from './pages/ReagentStock';
import ReferenceMaterialPage from './pages/ReferenceMaterial';
// V5: 「标准物质」拆分 —— 新增独立的「标准样品」模块（ReagentAdmin/ReferenceSample）
import ReferenceSamplePage from './pages/ReferenceSample';
import ReportCoverPage from './pages/ReportCover';
import ReportTablePage from './pages/ReportTable';
import RolePage from './pages/Role';
import TaskTypePage from './pages/TaskType';
import TestCategoryPage from './pages/TestCategory';
import TestItemPage from './pages/TestItem';
import TestMethodPage from './pages/TestMethod';
import UserPage from './pages/User';
import LogPage from './pages/Log';
import WorkflowTaskPage from './pages/WorkflowManager/Task';
import WorkflowSamplePage from './pages/WorkflowManager/Sample';
import DepartmentSamplePage from './pages/DepartmentManager/Sample';
import TestingSamplePage from './pages/TestingManager/Sample';
import TestingSampleHelperPage from './pages/TestingManager/SampleHelper';
import ThermometerPage from './pages/MonitorAdmin/Thermometer';

import ProcessingManagerPage from './pages/ProcessingManager';
import ReferenceMaterialMediumTypePage from './pages/ReferenceMaterialMediumType';
import ControlPage from './pages/Control';
import SharePage from './pages/Share';
import FileSharePage from './pages/Share/FileShare';
import WorkloadCommonPage from './pages/WorkloadCommon';
import WorkloadManagerPage from './pages/GeneralManager/Workload';
import {
  AdminHome,
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
            <Route path="Reagent" element={<ReagentPage />} />
            <Route path="ReagentStorage" element={<ReagentStoragePage />} />
            <Route path="ReagentStock" element={<ReagentStockPage />} />
            <Route path="ReferenceMaterial" element={<ReferenceMaterialPage />} />
            {/* V5: 新页面「标准样品」。左侧菜单由后端下发，需在角色菜单里新增 path=/ReferenceSample 的条目 */}
            <Route path="ReferenceSample" element={<ReferenceSamplePage />} />
            <Route path="ReferenceMaterialMediumType" element={<ReferenceMaterialMediumTypePage />} />
            <Route path="ReportCover" element={<ReportCoverPage />} />
            <Route path="ReportTable" element={<ReportTablePage />} />
            <Route path="TaskType" element={<TaskTypePage />} />
            <Route path="/workflowTask" element={<WorkflowTaskPage />} />
            <Route path="/ProcessingManager" element={<ProcessingManagerPage />} />
            <Route path="/workflowSample" element={<WorkflowSamplePage />} />
            <Route path="/departmentManager" element={<DepartmentSamplePage />} />
            <Route path="/testingManager" element={<TestingSamplePage />} />
            <Route path="/testingSampleHelper" element={<TestingSampleHelperPage />} />
            <Route path="/monitorThermometer" element={<ThermometerPage />} />

            <Route path="TestCategory" element={<TestCategoryPage />} />
            <Route path="TestItem" element={<TestItemPage />} />
            <Route path="TestMethod" element={<TestMethodPage />} />
            <Route path="Role" element={<RolePage />} />
            <Route path="User" element={<UserPage />} />
            <Route path="Log" element={<LogPage />} />
            <Route path="files" element={<SharePage />} />
            <Route path="fileshare" element={<FileSharePage />} />
            <Route path="/workloadCommon" element={<WorkloadCommonPage />} />
            <Route path="/workloadManager" element={<WorkloadManagerPage />} />
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
