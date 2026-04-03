import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getLogin, getCaptcha } from '../../api/user';
import { useAuth } from '../../contexts/AuthContext';


const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [captchaUrl, setCaptchaUrl] = useState("");
  const [captchaValue, setCaptchaValue] = useState("");
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { checkAuthStatus, user } = useAuth();

  useEffect(() => {
    // 如果已经有 user，说明已经登录过，直接重定向
    if (user) {
      navigate('/', { replace: true });
    }
    fetchCaptcha();
  }, [user, navigate]);

  const fetchCaptcha = async () => {
    try {
      const response = await getCaptcha();
      if (response.data && response.data.status === 0) {
        setCaptchaUrl(response.data.data.image);
      } else {
        message.error('验证码加载失败');
      }
    } catch (error) {
      message.error('验证码加载异常');
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await getLogin({
        username: values.username,
        password: values.password,
        captcha: values.captcha,
      });

      if (response.data && response.data.status === 0) {
        message.success('登录成功');
        await checkAuthStatus(); // Synchronize global auth state
        navigate('/', { replace: true });
      } else {
        message.error(response.data?.message || '登录失败');
        setCaptchaValue("");
        fetchCaptcha();
        form.setFieldsValue({ captcha: "" });
      }
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || '登录异常');
      setCaptchaValue("");
      fetchCaptcha();
      form.setFieldsValue({ captcha: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#f0f2f5] bg-no-repeat bg-position-[center_110px] bg-size-[100%] bg-[url('https://gw.alipayobjects.com/zos/rmsportal/TVYTbAXWNIpQyUPTRXyQ.svg')]">
      <div className="w-[90%] md:w-[400px] p-6 md:p-9 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <div className="login-header text-center mb-8">
          <Title level={3} className="m-0">系统登录</Title>
          <Text type="secondary">Admin Portal</Text>
        </div>

        <Form
          form={form}
          name="normal_login"
          className="login-form space-y-4"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: '请输入账号！' }]}
          >
            <Input prefix={<UserOutlined className="site-form-item-icon" />} placeholder="请输入账号" className="rounded-md" />
          </Form.Item>
          
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码！' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="请输入密码"
              className="rounded-md"
            />
          </Form.Item>

          <Form.Item
            label="验证码"
            name="captcha"
            rules={[{ required: true, message: '请输入验证码！' }]}
          >
            <div className="flex w-full">
              <Input
                placeholder="请输入验证码"
                className="flex-1 rounded-r-none border-r-0"
                value={captchaValue}
                onChange={(e) => setCaptchaValue(e.target.value)}
              />
              {captchaUrl && (
                <div className="h-10 w-[120px] border border-[#d9d9d9] border-l-0 rounded-r-md overflow-hidden">
                    <img
                        src={captchaUrl}
                        alt="captcha"
                        onClick={fetchCaptcha}
                        className="h-full w-full cursor-pointer object-cover"
                    />
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item className="mt-8">
            <Button type="primary" htmlType="submit" className="login-form-button rounded-md" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
