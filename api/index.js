const express = require('express');
const router = express.Router();
const userRouter = require('../router/userRouter');

// 挂载用户路由
router.use('/users', userRouter);


module.exports = router;