// 配置swagger
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// 如果你完全改用独立openapi.yaml，可以删除这部分（保留也不影响）
const Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '接单平台',
            version: '1.0.0',
            description: '接单 API 文档',
        },
        // components: {
        //     securitySchemes: {
        //         bearerAuth: {
        //             type: 'http',
        //             scheme: 'bearer',
        //             bearerFormat: 'JWT',
        //         },
        //     },
        // },
    },
    apis: ['./router/*.js', './middleware/*.js'], // 如果你不用注释，可以删除这个
};

// 如果你完全改用独立openapi.yaml，可以删除这行
const swaggerDocs = swaggerJsDoc(Options);

// 导出时让 setup 成为一个接收文档参数的函数
module.exports = {
    serve: swaggerUi.serve,
    // 改为函数形式，接收外部传入的文档（如openapi.yaml解析的结果）
    setup: (doc) => swaggerUi.setup(doc || swaggerDocs) // 兼容两种方式：优先用外部传入的doc，没有则用默认的swaggerDocs
};
