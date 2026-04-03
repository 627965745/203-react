import React from 'react';

const createDummy = (name) => () => (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', minHeight: '400px' }}>
        <h2>{name} - 开发中</h2>
        <p>此页面的内容正在建设中...</p>
    </div>
);

export const ClientPage = createDummy('客户管理 (Client)');
export const ControlPage = createDummy('菜单/权限控制 (Control)');
export const ProcessingMethodPage = createDummy('加工方法 (ProcessingMethod)');
export const ProcessingOptionPage = createDummy('加工选项 (ProcessingOption)');
// export const ReferenceMaterialPage = createDummy('标准物质 (ReferenceMaterial)');
// export const ReportCoverPage = createDummy('报告封面模板 (ReportCover)');
// export const ReportTablePage = createDummy('报告数据表 (ReportTable)');
export const RolePage = createDummy('角色管理 (Role)');
export const TaskTypePage = createDummy('任务类型 (TaskType)');
export const TestCategoryPage = createDummy('检测类别 (TestCategory)');
export const TestItemPage = createDummy('检测项目 (TestItem)');
export const TestMethodPage = createDummy('检测方法 (TestMethod)');
export const UserPage = createDummy('用户管理 (User)');

export const ResetPasswordPage = createDummy('修改密码 (Reset Password)');

export const AdminHome = () => (
    <div style={{ padding: '24px', background: '#fff', borderRadius: '8px', minHeight: '400px' }}>
        <h2>仪表盘首页</h2>
        <p>欢迎来到管理后台。请从左侧菜单选择要管理的项目。</p>
    </div>
);
