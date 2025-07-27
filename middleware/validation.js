// 验证注册请求
const validateRegister = (req, res, next) => {
    const {username, password, email, phone, role, } = req.body;

    // 基本验证
    if (!username || !password) {
        return res.status(400).json({message: '用户名和密码不能为空'});
    }

    // 用户名验证
    if (username.length < 3 || username.length > 50) {
        return res.status(400).json({message: '用户名长度必须在3-50个字符之间'});
    }

    // 密码验证
    if (password.length < 6) {
        return res.status(400).json({message: '密码长度不能少于6个字符'});
    }

    // 邮箱验证
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({message: '邮箱格式不正确'});
    }

    // 手机号验证
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({message: '手机号格式不正确'});
    }

    // 角色验证
    if (role !== undefined && !([0, 1, 2].includes(role))) {
        return res.status(400).json({message: '无效的角色值'});
    }

    next();
};

// 验证登录请求
const validateLogin = (req, res, next) => {
    const {username, password} = req.body;

    if (!username || !password) {
        return res.status(400).json({message: '用户名和密码不能为空'});
    }

    next();
};

module.exports = {validateRegister, validateLogin};