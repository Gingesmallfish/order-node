const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/user');
const Terms = require('../models/Terms'); // 引入协议模型
const redisClient = require('../utils/redis');
require('dotenv').config();

// 生成双Token：访问令牌(短期)和刷新令牌(长期)
const generateTokens = (userId) => {
    // 访问令牌 - 短期有效(15分钟)，用于API访问
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
    );

    // 刷新令牌 - 长期有效(7天)，用于获取新的访问令牌
    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '15' }
    );

    return { accessToken, refreshToken };
};

// 用户注册
const register = async (req, res) => {
    try {
        const { username, password, email, phone, role = 0  } = req.body;

        // 检查用户名/邮箱/手机号是否已存在
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { username },
                    { email },
                    { phone }
                ]
            }
        });

        if (existingUser) {
            let message = '';
            if (existingUser.username === username) message = '用户名已存在';
            else if (existingUser.email === email) message = '邮箱已被注册';
            else if (existingUser.phone === phone) message = '手机号已被注册';
            return res.status(400).json({ message });
        }

        // 密码加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 创建用户（默认未同意协议）
        const user = await User.create({
            username,
            password: hashedPassword,
            email: email || null,
            phone: phone || null,
            role
        });

        // 生成双令牌
        const { accessToken, refreshToken } = generateTokens(user.id);

        // 存储令牌到Redis
        await redisClient.set(`user:${user.id}:accessToken`, accessToken, { EX: 900 });
        await redisClient.set(`user:${user.id}:refreshToken`, refreshToken, { EX: 604800 });

        res.status(200).json({
            code: 200,
            message: '注册成功',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,

            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 用户登录（支持单点登录）
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户（支持用户名、邮箱或手机号登录）
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { username },
                    { email: username },
                    { phone: username }
                ]
            }
        });

        // 验证用户和密码
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: '用户名或密码不正确' });
        }

        // 检查用户状态
        if (user.status !== 1) {
            return res.status(403).json({ message: '账号已被禁用' });
        }

        // 单点登录：将旧令牌加入黑名单
        const existingAccessToken = await redisClient.get(`user:${user.id}:accessToken`); // 获取旧令牌
        if (existingAccessToken) {
            const decoded = jwt.decode(existingAccessToken);
            if (decoded && decoded.exp) {
                const now = Math.floor(Date.now() / 1000);
                const ttl = decoded.exp - now;
                // 如果令牌未过期，则将其加入黑名单
                if (ttl > 0) {
                    await redisClient.set(`blacklist:${existingAccessToken}`, 'invalid', { EX: ttl });
                }
            }
        }

        // 生成新的双令牌
        const { accessToken, refreshToken } = generateTokens(user.id);

        // 存储新令牌到Redis（覆盖旧的）
        await redisClient.set(`user:${user.id}:accessToken`, accessToken, { EX: 604800 }); // 7天
        await redisClient.set(`user:${user.id}:refreshToken`, refreshToken, { EX: 900 }); // 15分钟过

        // 更新最后登录时间
        await user.update({ last_login_time: new Date() });

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
                avatar: user.avatar,
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] } // 排除密码字段
        });

        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.json({
            user: {
                ...user.toJSON(),
                hasAgreedTerms: user.agreed_to_terms === 1 // 补充协议同意状态
            }
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 刷新访问令牌
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: '刷新令牌不能为空' });
        }

        // 验证刷新令牌
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

        // 检查Redis中是否存在该刷新令牌
        const storedRefreshToken = await redisClient.get(`user:${decoded.userId}:refreshToken`);
        if (storedRefreshToken !== refreshToken) {
            return res.status(401).json({ message: '刷新令牌无效' });
        }

        // 生成新的访问令牌
        const accessToken = jwt.sign(
            { userId: decoded.userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
        );

        // 更新Redis中的访问令牌
        await redisClient.set(`user:${decoded.userId}:accessToken`, accessToken, { EX: 900 });

        res.json({ accessToken });
    } catch (error) {
        console.error('刷新令牌错误:', error);
        res.status(401).json({ message: '刷新令牌已过期或无效' });
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

        // 1. 清除Redis中存储的访问令牌和刷新令牌
        await redisClient.del(`user:${userId}:accessToken`);
        await redisClient.del(`user:${userId}:refreshToken`);

        // 2. 将当前访问令牌加入黑名单
        if (accessToken) {
            const decoded = jwt.decode(accessToken);
            if (decoded && decoded.exp) {
                const now = Math.floor(Date.now() / 1000);
                const ttl = decoded.exp - now;
                if (ttl > 0) {
                    await redisClient.set(`blacklist:${accessToken}`, 'invalid', { EX: ttl });
                }
            }
        }

        res.json({ code: 200, message: '退出登录成功，所有令牌已失效' });
    } catch (error) {
        console.error('退出登录错误:', error);
        res.status(500).json({ message: '退出登录失败' });
    }
};

// 新增：获取最新用户协议
const getLatestTerms = async (req, res) => {
    try {
        // 查询最新版本协议（is_latest=1）
        const latestTerm = await Terms.findOne({
            where: { is_latest: 1 },
            attributes: ['version', 'content'] // 只返回版本和内容
        });

        if (!latestTerm) {
            return res.status(404).json({ message: '未找到用户协议' });
        }

        res.json({
            code: 200,
            data: {
                version: latestTerm.version,
                content: latestTerm.content
            },
            message: '获取最新协议成功'
        });
    } catch (error) {
        console.error('获取协议错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};

// 新增：用户同意协议
const agreeToTerms = async (req, res) => {
    try {
        const { version } = req.body; // 前端传递用户同意的协议版本
        const userId = req.user.id; // 从登录信息中获取用户ID

        if (!version) {
            return res.status(400).json({ message: '请提供协议版本号' });
        }

        // 1. 验证版本是否为最新有效版本
        const validTerm = await Terms.findOne({
            where: {
                version: String(version),
                is_latest: 1 // 必须是当前生效的最新版本
            }
        });

        if (!validTerm) {
            return res.status(400).json({ message: '协议版本无效，请获取最新协议' });
        }

        // 2. 更新用户的协议同意状态
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        await user.update({
            agreed_to_terms: 1, // 标记为已同意
            terms_accepted_at: new Date(), // 记录同意时间
            terms_version: version // 记录同意的版本
        });

        res.json({
            code: 200,
            message: '已成功同意用户协议',
            data: {
                version,
                acceptedAt: new Date()
            }
        });
    } catch (error) {
        console.error('同意协议错误:', error);
        res.status(500).json({ message: '服务器错误' });
    }
};


module.exports = {
    register,
    login,
    getCurrentUser,
    logout,
    refreshToken,
    agreeToTerms,
    getLatestTerms
};