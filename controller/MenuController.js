// controller/MenuController.js
const SysMenu = require('../models/SysMenu');

/**
 * 递归构建树形菜单结构
 * @param {Array} menus - 平级菜单列表
 * @param {Number} parentId - 父级菜单ID（默认查一级菜单）
 * @returns {Array} 树形菜单数据
 */
function buildMenuTree(menus, parentId = 0) {
    const tree = [];
    for (const menu of menus) {
        if (menu.parent_id === parentId) {
            // 递归查找子菜单
            const children = buildMenuTree(menus, menu.id);
            if (children.length > 0) {
                menu.children = children;
            }
            tree.push(menu);
        }
    }
    return tree;
}

/**
 * 获取侧边栏菜单列表（树形结构）
 * @param {Request} req - Express 请求对象
 * @param {Response} res - Express 响应对象
 */
exports.getMenuList = async (req, res) => {
    try {
        // 1. 查询所有菜单（按排序号升序）
        const menus = await SysMenu.findAll({
            order: [['order_num', 'ASC']]
        });

        // 2. 转换为树形结构
        const menuTree = buildMenuTree(menus);

        // 3. 返回结果
        res.status(200).json({
            code: 200,
            message: '查询成功',
            data: menuTree
        });
    } catch (error) {
        res.status(500).json({
            code: 500,
            message: '服务器内部错误',
            error: error.message
        });
    }
};