const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const yaml = require("js-yaml");
const routes = require('./api/index.js');
const { serve, setup } = require('./Swagger/swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const RELOAD_INTERVAL = 5000; // 配置更新间隔（5 秒，可调整）

// 缓存 OpenAPI 配置（定时更新）
let openapiDocument;

// ========== 核心改造：定时加载配置 ==========
const loadOpenapiConfig = () => {
    try {
        openapiDocument = yaml.load(
            fs.readFileSync('./OpenAPI/openapi.yaml', 'utf8')
        );
        console.log('✅ OpenAPI 配置已更新');
    } catch (err) {
        console.error('❌ 加载 OpenAPI 配置失败:', err);
    }
};

// 初始加载 + 定时更新
loadOpenapiConfig();
setInterval(loadOpenapiConfig, RELOAD_INTERVAL);

// 中间件配置
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 挂载 Swagger（使用缓存的配置）
app.use('/api-docs', serve, (req, res, next) => {
    if (!openapiDocument) {
        return res.status(500).json({ message: 'Swagger 文档未加载' });
    }
    setup(openapiDocument)(req, res, next);
});

// 路由
app.use('/', routes);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`Swagger 文档地址：http://localhost:${PORT}/api-docs`);
    console.log(`配置自动更新间隔：${RELOAD_INTERVAL / 1000} 秒`);
});