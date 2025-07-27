const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./api/index.js');
require('dotenv').config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors(
    {
        origin: '*', // 允许所有源访问
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 允许的请求方法
        preflightContinue: false, // 允许预检请求继续执行
        optionsSuccessStatus: 204 // 预检请求成功返回的状态码
    }
));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
});

module.exports = app;