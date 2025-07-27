const { createClient } = require('redis');
require('dotenv').config();

// 创建Redis客户端
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379', // 默认连接本地Redis
    // 可选配置：如果Redis有密码或其他配置
    password: process.env.REDIS_PASSWORD,
    // socket: {
    //   host: process.env.REDIS_HOST || 'localhost',
    //   port: process.env.REDIS_PORT || 6379
    // }
});

// 监听连接事件
redisClient.on('connect', () => {
    console.log('Redis客户端已连接');
});

// 监听错误事件
redisClient.on('error', (err) => {
    console.error('Redis连接错误:', err);
});

// 连接到Redis
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Redis连接失败:', err);
    }
})();

module.exports = redisClient;

// redis-cli