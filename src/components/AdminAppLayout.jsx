import React, { useMemo, useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Button, Layout as AntLayout, Menu, theme, Space, message, Dropdown } from 'antd';
import { UserOutlined, LockOutlined, LogoutOutlined } from '@ant-design/icons';
import * as AntdIcons from '@ant-design/icons';
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

    if (!user) {
        return (
            <div className="min-h-screen w-screen flex items-center justify-center bg-[#f0f2f5] bg-no-repeat bg-position-[center_110px] bg-size-[100%] bg-[url('https://gw.alipayobjects.com/zos/rmsportal/TVYTbAXWNIpQyUPTRXyQ.svg')]">
                <div className="w-[90%] md:w-[500px] p-6 md:p-9 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    <Outlet />
                </div>
            </div>
        );
    }
    
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
        const buildMenuItems = (menus) => {
            if (!menus || !Array.isArray(menus)) return [];
            return menus.map(item => {
                const isParent = !item.path;
                let key = item.id ? item.id.toString() : item.name;
                
                if (!isParent) {
                    key = item.path.startsWith('/') ? item.path.slice(1) : item.path;
                }

                let IconComponent = null;
                if (item.icon && AntdIcons[item.icon]) {
                    const IconComp = AntdIcons[item.icon];
                    IconComponent = <IconComp />;
                }

                const result = {
                    key,
                    label: isParent ? item.name : <Link to={item.path}>{item.name}</Link>,
                    icon: IconComponent
                };

                if (item.children && item.children.length > 0) {
                    result.children = buildMenuItems(item.children);
                }

                return result;
            });
        };

        const dynamicMenuItems = buildMenuItems(user?.menu);

        return (
            <div className="border-r border-[#f0f0f0] w-[200px] sticky top-[88px] h-[calc(100vh-112px)] overflow-y-auto">
                <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    className="border-r-0"
                    inlineIndent={8}
                    items={dynamicMenuItems}
                />
            </div>
        );
    }, [selectedKey, navigate, user?.menu]);

    return (
        <AntLayout className="min-h-screen">
            <Header className="flex items-center justify-between px-6 sticky top-0" style={{ zIndex: 1000 }}>
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
