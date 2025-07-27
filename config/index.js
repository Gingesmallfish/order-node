const { Sequelize } = require('sequelize');
require('dotenv').config();

// 创建Sequelize实例
const sequelize = new Sequelize(
    process.env.DB_NAME,      // 数据库名
    process.env.DB_USER,      // 用户名
    process.env.DB_PASSWORD,  // 密码
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306,
        timezone: '+08:00',     // 设置时区
        logging: false          // 关闭SQL日志输出
    }
);

// 测试数据库连接
sequelize.authenticate()
    .then(() => console.log('数据库连接成功'))
    .catch(err => console.error('数据库连接失败:', err));

module.exports = sequelize;