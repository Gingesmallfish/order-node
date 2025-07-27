const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {Op} = require('sequelize');
const User = require('../models/user');
const redisClient = require('../utils/redis');
require('dotenv').config();

// 生成双Token：访问令牌(短期)和刷新令牌(长期)
const generateTokens = (userId) => {
    // 访问令牌 - 短期有效(15分钟)，用于API访问
    const accessToken = jwt.sign(
        {userId},
        process.env.JWT_SECRET,
        {expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'}
    );

    // 刷新令牌 - 长期有效(7天)，用于获取新的访问令牌
    const refreshToken = jwt.sign(
        {userId},
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        {expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'}
    );

    return {accessToken, refreshToken};
};

// 用户注册
const register = async (req, res) => {
    try {
        const {username, password, email, phone, role = 0, } = req.body;

        // 检查用户名是否已存在
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    {username},
                    {email},
                    {phone}
                ]
            }
        });

        if (existingUser) {
            let message = '';
            if (existingUser.username === username) {
                message = '用户名已存在';
            } else if (existingUser.email === email) {
                message = '邮箱已被注册';
            } else if (existingUser.phone === phone) {
                message = '手机号已被注册';
            }
            return res.status(400).json({message});
        }

        // 密码加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 创建用户
        const user = await User.create({
            username,
            password: hashedPassword,
            email: email || null,
            phone: phone || null,
            role,

        });

        // 生成双令牌
        const {accessToken, refreshToken} = generateTokens(user.id);

        // 存储令牌到Redis
        await redisClient.set(
            `user:${user.id}:accessToken`,
            accessToken,
            {EX: 900} // 15分钟，与访问令牌有效期一致
        );

        await redisClient.set(
            `user:${user.id}:refreshToken`,
            refreshToken,
            {EX: 604800} // 7天，与刷新令牌有效期一致
        );

        res.status(201).json({
            message: '注册成功',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({message: '服务器错误'});
    }
};

// 用户登录（支持单点登录）
const login = async (req, res) => {
    try {
        const {username, password} = req.body;


        // 查找用户（支持用户名、邮箱或手机号登录）
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    {username},
                    {email: username},
                    {phone: username}
                ]
            }
        });


        // 验证用户和密码
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({message: '用户名或密码不正确'});
        }

        // 检查用户状态
        if (user.status !== 1) {
            return res.status(403).json({message: '账号已被禁用'});
        }

        // 单点登录：检查该用户是否已有登录会话
        const existingAccessToken = await redisClient.get(`user:${user.id}:accessToken`);

        // 如果已存在登录会话，将其加入黑名单
        if (existingAccessToken) {
            const decoded = jwt.decode(existingAccessToken);
            if (decoded && decoded.exp) {
                const now = Math.floor(Date.now() / 1000);
                const ttl = decoded.exp - now;
                if (ttl > 0) {
                    await redisClient.set(
                        `blacklist:${existingAccessToken}`,
                        'invalid',
                        {EX: ttl}
                    );
                }
            }
        }

        // 生成新的双令牌
        const {accessToken, refreshToken} = generateTokens(user.id);

        // 存储新令牌到Redis（覆盖旧的）
        await redisClient.set(
            `user:${user.id}:accessToken`,
            accessToken,
            {EX: 900}
        );

        await redisClient.set(
            `user:${user.id}:refreshToken`,
            refreshToken,
            {EX: 604800}
        );

        // 更新最后登录时间
        await user.update({last_login_time: new Date()});

        res.json({

            code: 200,
            message: '登录成功',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar
            }

        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({message: '服务器错误'});
    }
};





// 获取当前用户信息
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: {exclude: ['password']} // 排除密码字段
        });

        if (!user) {
            return res.status(404).json({message: '用户不存在'});
        }

        res.json({user});
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({message: '服务器错误'});
    }
};

// 刷新访问令牌
const refreshToken = async (req, res) => {
    try {
        const {refreshToken} = req.body;

        if (!refreshToken) {
            return res.status(400).json({message: '刷新令牌不能为空'});
        }

        // 验证刷新令牌
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

        // 检查Redis中是否存在该刷新令牌
        const storedRefreshToken = await redisClient.get(`user:${decoded.userId}:refreshToken`);
        if (storedRefreshToken !== refreshToken) {
            return res.status(401).json({message: '刷新令牌无效'});
        }

        // 生成新的访问令牌
        const accessToken = jwt.sign(
            {userId: decoded.userId},
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'}
        );

        // 更新Redis中的访问令牌
        await redisClient.set(
            `user:${decoded.userId}:accessToken`,
            accessToken,
            {EX: 900} // 15分钟
        );

        res.json({accessToken});
    } catch (error) {
        console.error('刷新令牌错误:', error);
        res.status(401).json({message: '刷新令牌已过期或无效'});
    }
};

// 退出登录（清理Redis中的令牌）
const logout = async (req, res) => {
    try {
        const userId = req.user.id;
        const authHeader = req.headers.authorization;

        // 从请求头获取当前访问令牌
        let accessToken = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.split(' ')[1];
        }

        // 1. 清除Redis中存储的访问令牌
        await redisClient.del(`user:${userId}:accessToken`);

        // 2. 清除Redis中存储的刷新令牌
        await redisClient.del(`user:${userId}:refreshToken`);

        // 3. 将当前访问令牌加入黑名单
        if (accessToken) {
            const decoded = jwt.decode(accessToken);
            if (decoded && decoded.exp) {
                const now = Math.floor(Date.now() / 1000);
                const ttl = decoded.exp - now;
                if (ttl > 0) {
                    await redisClient.set(
                        `blacklist:${accessToken}`,
                        'invalid',
                        {EX: ttl}
                    );
                }
            }
        }

        res.json({code: 200, message: '退出登录成功，所有令牌已失效'});
    } catch (error) {
        console.error('退出登录错误:', error);
        res.status(500).json({message: '退出登录失败'});
    }
};

module.exports = {
    register,
    login,
    getCurrentUser,
    logout,
    refreshToken,

};
