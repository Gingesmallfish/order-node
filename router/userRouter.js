const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { validateRegister, validateLogin, } = require('../middleware/validation');
const { authenticate, } = require('../middleware/auth');


// 注册
router.post('/register', validateRegister, userController.register);

// 登录
router.post('/login', validateLogin, userController.login);

// 获取当前用户信息
router.get('/me', authenticate, userController.getCurrentUser );

// 使用authenticate中间件确保只有已登录用户才能访问
router.post('/logout', authenticate, userController.logout);

// 刷新访问令牌（公开接口，用刷新令牌换取新的访问令牌）
router.post('/refresh-token', userController.refreshToken);



module.exports = router;