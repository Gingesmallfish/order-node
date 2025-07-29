const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const {validateRegister, validateLogin,} = require('../middleware/validation');
const {authenticate,} = require('../middleware/auth');

// 用户注册、登录、获取当前用户、登出、刷新令牌、获取最新条款
router.post('/register', validateRegister, userController.register);
router.post('/login', validateLogin, userController.login);
router.get('/me', authenticate, userController.getCurrentUser);
router.post('/logout', authenticate, userController.logout);
router.post('/refresh-token', userController.refreshToken);
router.get('/terms/latest', userController.getLatestTerms);
router.post('/terms/agree', authenticate, userController.agreeToTerms);

module.exports = router;
