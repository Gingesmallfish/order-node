// models/SysMenu.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/index'); // 导入数据库连接（需提前配置）

class SysMenu extends Model {}

SysMenu.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    parent_id: {
        type: DataTypes.INTEGER,
        defaultValue: 0, // 一级菜单 parent_id 为 0
        comment: '父级菜单ID'
    },
    menu_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '菜单名称'
    },
    path: {
        type: DataTypes.STRING(200),
        comment: '前端路由路径'
    },
    icon: {
        type: DataTypes.STRING(50),
        comment: 'Element Plus 图标名（如 Home）'
    },
    menu_type: {
        type: DataTypes.ENUM('CATALOG', 'MENU'),
        allowNull: false,
        comment: '菜单类型：CATALOG=目录（一级），MENU=菜单（二级）'
    },
    order_num: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '排序号（值越小越靠前）'
    },
    component: {
        type: DataTypes.STRING(200),
        comment: '前端组件路径（如 views/Home.vue）'
    },
    is_show: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '是否显示在侧边栏'
    }
}, {
    sequelize,
    modelName: 'SysMenu',
    tableName: 'sys_menu',
    timestamps: false // 若表无时间戳字段，关闭自动生成
});

module.exports = SysMenu;