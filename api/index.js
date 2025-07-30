const express = require('express');
const router = express.Router();
const userRouter = require('../router/userRouter');
const menuRouter = require('../router/menuRouter');

// 挂载用户路由
router.use('/users', userRouter);
// 挂在菜单
router.use('/menus', menuRouter);


// 模块导出
module.exports = router;