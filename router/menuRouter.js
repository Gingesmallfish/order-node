const express = require('express');
const router = express.Router();
const MenuController = require('../controller/MenuController');

// 获取侧边栏菜单列表（树形结构）
router.post('/list',  MenuController.getMenuList);

module.exports = router;