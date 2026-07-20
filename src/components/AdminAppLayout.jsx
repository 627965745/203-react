import React, { useMemo, useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
    Button,
    Layout as AntLayout,
    Menu,
    theme,
    Space,
    message,
    Dropdown,
    ConfigProvider,
    Empty,
} from "antd";
import { UserOutlined, LockOutlined, LogoutOutlined } from "@ant-design/icons";
import * as AntdIcons from "@ant-design/icons";
import { logout } from "../api/user";
import { useAuth } from "../contexts/AuthContext";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

dayjs.locale("zh-cn");

// V2: 全局下拉框空状态文案 —— Select/Cascader/TreeSelect 无数据时显示“无数据”，
//     其它组件（如表格）返回 undefined 走 antd 默认空状态。
const renderDropdownEmpty = (componentName) =>
    ["Select", "Cascader", "TreeSelect"].includes(componentName) ? (
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="无数据"
            style={{ margin: "8px 0" }}
        />
    ) : undefined;

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
                    <ConfigProvider
                        locale={zhCN}
                        theme={{ algorithm: theme.compactAlgorithm }}
                        renderEmpty={renderDropdownEmpty}
                    >
                        <Outlet />
                    </ConfigProvider>
                </div>
            </div>
        );
    }

    const [selectedKey, setSelectedKey] = useState(() => {
        const pathParts = location.pathname.split("/");
        return pathParts[1] || "";
    });

    useEffect(() => {
        const pathParts = location.pathname.split("/");
        const currentKey = pathParts[1] || "";
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



    const sidebarComponent = useMemo(() => {
        const buildMenuItems = (menus) => {
            if (!menus || !Array.isArray(menus)) return [];
            return menus.map((item) => {
                const isParent = !item.path;
                let key = item.id ? item.id.toString() : item.name;

                if (!isParent) {
                    key = item.path.startsWith("/")
                        ? item.path.slice(1)
                        : item.path;
                }

                let IconComponent = null;
                if (item.icon && AntdIcons[item.icon]) {
                    const IconComp = AntdIcons[item.icon];
                    IconComponent = <IconComp />;
                }

                const result = {
                    key,
                    label: isParent ? (
                        item.name
                    ) : (
                        <Link to={item.path}>{item.name}</Link>
                    ),
                    icon: IconComponent,
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
        // V2: 认证区域此前没有 ConfigProvider，下拉框空态回退到 antd 英文 "No Data"。
        //     统一包一层，使所有下拉框空态显示“无数据”。
        <ConfigProvider renderEmpty={renderDropdownEmpty}>
        <AntLayout className="min-h-screen" >
            <Header className="flex items-center justify-between sticky top-0" style={{ zIndex: 1000, background: "#DAEBFD", paddingLeft: 36, paddingRight: 24 }}>
                <div className="flex items-center flex-1">
                    <div className="demo-logo text-black font-bold text-lg mr-8">
                        富立盈鑫实验室管理系统
                    </div>
                    <Menu
                        style={{ background: "#DAEBFD" }}
                        mode="horizontal"
                        selectedKeys={selectedKey === '' ? ['home'] : (['fileshare', 'workloadCommon'].includes(selectedKey) ? [selectedKey] : [])}
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
                            {
                                key: "fileshare",
                                onClick: () => {
                                    setSelectedKey('fileshare');
                                    navigate('/fileshare');
                                },
                                label: "文件库",
                            },
                            {
                                key: "workloadCommon",
                                onClick: () => {
                                    setSelectedKey('workloadCommon');
                                    navigate('/workloadCommon');
                                },
                                label: "工作量",
                            },
                        ]}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-sm font-bold text-slate-800 leading-tight">
                            {user?.name || "管理员"}
                        </span>
                        {user?.nickname && (
                            <span className="text-xs text-slate-500 mt-1">
                                {user?.nickname}
                            </span>
                        )}
                    </div>
                    <Space size="small">
                        <Button
                            type="text"
                            icon={<LockOutlined />}
                            onClick={() => navigate("/reset-password")}
                            className="font-bold text-slate-600 hover:text-blue-600"
                        >
                            修改密码
                        </Button>
                        <Button
                            type="text"
                            danger
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            className="font-bold"
                        >
                            退出登录
                        </Button>
                    </Space>
                </div>
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
        </ConfigProvider>
    );
};

export default AdminAppLayout;
