import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    envDir: "./",
    // ⬇️ 新增以下配置
    server: {
        allowedHosts: ["jm.fraft.cn"],
        // proxy: {
        //     '/api': {
        //         target: 'https://frankhcy.v6.softether.net:1443',
        //         changeOrigin: true,
        //         // 关键点：将 /api 替换为空字符串，因为后端地址里自带了 /obj
        //         rewrite: (path) => path.replace(/^\/api/, ''),
        //         // 解决自签名证书或非标准 HTTPS 端口可能导致的预检失败
        //         secure: false,
        //         // 手动处理 Cookie 属性，确保路径和安全标记在代理后依然有效
        //         onProxyRes: (proxyRes) => {
        //             const sc = proxyRes.headers['set-cookie'];
        //             if (sc) {
        //                 proxyRes.headers['set-cookie'] = sc.map(c => 
        //                     c.replace(/Path=\/obj/gi, 'Path=/api/obj') // 匹配前端 BaseURL
        //                      .replace(/SameSite=None/gi, 'SameSite=Lax') // 解决 SameSite=None 必须 Secure 的限制
        //                      .replace(/;\s?Secure/gi, '') // 允许非 HTTPS 环境
        //                 );
        //             }
        //         }
        //     }
        // }
    }
});