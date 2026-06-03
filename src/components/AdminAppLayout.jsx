import React, { useMemo, useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Button, Layout as AntLayout, Menu, theme, Space, message, Dropdown } from 'antd';
import { UserOutlined, LockOutlined, LogoutOutlined } from '@ant-design/icons';
import { logout } from "../api/user";
import { useAuth } from '../contexts/AuthContext';

const { Header, Content } = AntLayout;

const AdminAppLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, checkAuthStatus } = useAuth();
    
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();
    
    const [selectedKey, setSelectedKey] = useState(() => {
        const pathParts = location.pathname.split('/');
        return pathParts[1] || '';
    });

    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const currentKey = pathParts[1] || '';
        setSelectedKey(currentKey);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            const response = await logout();
            if (response.data && response.data.status === 0) {
                message.success("退出登录成功");
                await checkAuthStatus();
                navigate("/login");
            } else {
                message.error(response.data?.message || "退出登录失败");
            }
        } catch (error) {
            message.error(error.response?.data?.message || "退出登录异常");
            await checkAuthStatus();
            navigate("/login");
        }
    };

    const handleMenuClick = ({ key }) => {
        switch (key) {
            case 'logout':
                handleLogout();
                break;
            case 'changePassword':
                navigate("/reset-password"); // Assume we will handle this in future or just provide route
                break;
            default:
                break;
        }
    };

    const userMenu = {
        items: [
            {
                key: 'changePassword',
                label: '修改密码',
                icon: <LockOutlined />
            },
            {
                type: 'divider'
            },
            {
                key: 'logout',
                label: '退出登录',
                icon: <LogoutOutlined />,
                danger: true
            }
        ],
        onClick: handleMenuClick
    };

    const sidebarComponent = useMemo(() => {
        const menuItems = [
            { key: "AnalysisType", label: <Link to="/AnalysisType">分析类型</Link> },
            { key: "Client", label: <Link to="/Client">客户管理</Link> },
            { key: "Control", label: <Link to="/Control">菜单/权限控制</Link> },
            { key: "Department", label: <Link to="/Department">部门/科室</Link> },
            { key: "Device", label: <Link to="/Device">设备管理</Link> },
            { key: "DeviceCategory", label: <Link to="/DeviceCategory">设备分类</Link> },
            { key: "ProcessingMethod", label: <Link to="/ProcessingMethod">加工方法</Link> },
            { key: "Reagent", label: <Link to="/Reagent">试剂管理</Link> },
            { key: "ReagentStorage", label: <Link to="/ReagentStorage">试剂柜管理</Link> },
            { key: "ReagentStock", label: <Link to="/ReagentStock">试剂库存明细</Link> },
            { key: "ReferenceMaterial", label: <Link to="/ReferenceMaterial">标准物质</Link> },
            { key: "ReferenceMaterialMediumType", label: <Link to="/ReferenceMaterialMediumType">介质类型</Link> },
            { key: "ReportCover", label: <Link to="/ReportCover">报告封面模板</Link> },
            { key: "ReportTable", label: <Link to="/ReportTable">报告数据表</Link> },
            { key: "TaskType", label: <Link to="/TaskType">任务类型</Link> },
            { key: "workflowTask", label: <Link to="/workflowTask">任务管理</Link> },
            { key: "ProcessingManager", label: <Link to="/ProcessingManager">加工任务管理</Link> },
            { key: "workflowSample", label: <Link to="/workflowSample">样品管理</Link> },
            { key: "departmentManager", label: <Link to="/departmentManager">科室任务管理</Link> },
            { key: "testingManager", label: <Link to="/testingManager">检测任务管理</Link> },
            { key: "testingSampleHelper", label: <Link to="/testingSampleHelper">辅助检测管理</Link> },
            { key: "monitorThermometer", label: <Link to="/monitorThermometer">温湿度计管理</Link> },

            { key: "TestCategory", label: <Link to="/TestCategory">检测类别</Link> },
            { key: "TestItem", label: <Link to="/TestItem">检测项目</Link> },
            { key: "TestMethod", label: <Link to="/TestMethod">检测方法</Link> },
            { key: "Role", label: <Link to="/Role">角色管理</Link> },
            { key: "User", label: <Link to="/User">用户管理</Link> },
            { key: "Log", label: <Link to="/Log">操作日志</Link> }
        ];

        return (
            <div className="border-r border-[#f0f0f0] w-[180px] sticky top-[88px] h-[calc(100vh-112px)] overflow-y-auto">
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    className="border-r-0"
                    items={menuItems}
                />
            </div>
        );
    }, [selectedKey, navigate]);

    return (
        <AntLayout className="min-h-screen">
            <Header className="flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center flex-1">
                    <div className="demo-logo text-white font-bold text-lg mr-8">
                        LIMS Admin
                    </div>
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        selectedKeys={selectedKey === '' ? ['home'] : []}
                        className="flex-1 min-w-0"
                        items={[
                            {
                                key: "home",
                                onClick: () => {
                                    setSelectedKey('');
                                    navigate('/');
                                },
                                label: "首页",
                            },
                        ]}
                    />
                </div>
                <Space>
                    <Dropdown menu={userMenu} placement="bottomRight">
                        <Button 
                            type="text" 
                            icon={<UserOutlined className="text-white" />}
                            className="flex items-center text-white"
                        >
                            <span className="ml-1 text-white">
                                {user?.nickname || user?.name || '管理员'}
                            </span>
                        </Button>
                    </Dropdown>
                </Space>
            </Header>
            <AntLayout className="min-h-[calc(100vh-64px)]">
                <Content
                    className="p-6 m-0 min-h-full"
                    style={{
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    <div className="flex min-h-full">
                        {sidebarComponent}
                        <div className="flex-1 min-w-0">
                            <Outlet />
                        </div>
                    </div>
                </Content>
            </AntLayout>
        </AntLayout>
    );
};

export default AdminAppLayout;
