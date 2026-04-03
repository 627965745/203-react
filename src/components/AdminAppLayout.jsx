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
            { key: "AnalysisType", label: "分析类型" },
            { key: "Client", label: "客户管理" },
            { key: "Control", label: "菜单/权限控制" },
            { key: "Department", label: "部门/科室" },
            { key: "Device", label: "设备管理" },
            { key: "DeviceCategory", label: "设备分类" },
            { key: "ProcessingMethod", label: "加工方法" },
            { key: "ProcessingOption", label: "加工选项" },
            { key: "Reagent", label: "试剂管理" },
            { key: "ReagentStorage", label: "试剂柜管理" },
            { key: "ReferenceMaterial", label: "标准物质" },
            { key: "ReportCover", label: "报告封面模板" },
            { key: "ReportTable", label: "报告数据表" },
            { key: "Role", label: "角色管理" },
            { key: "TaskType", label: "任务类型" },
            { key: "TestCategory", label: "检测类别" },
            { key: "TestItem", label: "检测项目" },
            { key: "TestMethod", label: "检测方法" },
            { key: "User", label: "用户管理" }
        ];

        return (
            <div className="border-r border-[#f0f0f0] w-[180px] sticky top-[88px] h-[calc(100vh-112px)] overflow-y-auto">
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    className="border-r-0"
                    onSelect={({ key }) => {
                        setSelectedKey(key);
                        navigate(`/${key}`);
                    }}
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
                        <div className="flex-1">
                            <Outlet />
                        </div>
                    </div>
                </Content>
            </AntLayout>
        </AntLayout>
    );
};

export default AdminAppLayout;
