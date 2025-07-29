const jwt = require('jsonwebtoken');
const User = require('../models/user');
const redisClient = require('../utils/redis');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({message: '未提供认证令牌'});
        }

        const token = authHeader.split(' ')[1];

        // 1. 检查令牌是否在黑名单中（已退出登录）
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return res.status(401).json({message: '令牌已失效，请重新登录'});
        }

        // 2. 验证令牌有效性
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. 检查Redis中是否存在该用户的有效会话（单点登录验证）
        const storedToken = await redisClient.get(`user:${decoded.userId}:accessToken`);
        if (!storedToken || storedToken !== token) {
            return res.status(401).json({message: '登录已过期或在其他设备登录，请重新登录'});
        }

        // 4. 验证用户状态
        const user = await User.findByPk(decoded.userId);
        if (!user) {
            return res.status(401).json({message: '用户不存在'});
        }

        if (user.status !== 1) {
            return res.status(403).json({message: '账号已被禁用'});
        }

        // 将用户信息和令牌挂载到req对象
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({message: '无效的令牌'});
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({message: '令牌已过期，请刷新令牌'});
        }
        console.error('认证中间件错误:', error);
        res.status(500).json({message: '服务器错误'});
    }
};

// 可选：角色授权中间件（如需基于角色的访问控制）
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({message: '请先登录'});
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({message: '没有访问权限'});
        }

        next();
    };
};


module.exports = {authenticate, authorize};
