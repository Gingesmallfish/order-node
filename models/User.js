const { DataTypes } = require('sequelize');
const sequelize = require('../config/index');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '用户ID，主键'
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '用户名'
    },
    phone: {
        type: DataTypes.STRING(20),
        unique: true,
        comment: '手机号'
    },
    email: {
        type: DataTypes.STRING(100),
        unique: true,
        comment: '邮箱'
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '加密密码(bcrypt)'
    },
    avatar: {
        type: DataTypes.STRING(255),
        comment: '头像URL'
    },
    role: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '角色：0-需求方，1-服务者，2-管理员'
    },
    status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '状态：0-禁用，1-正常'
    },
    last_login_time: {
        type: DataTypes.DATE,
        comment: '最后登录时间'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '创建时间'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW,
        comment: '更新时间'
    },
    agreed_to_terms: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '是否同意用户协议：0-不同意，1-同意'
    },
    terms_accepted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '协议接受时间'
    },
    terms_version: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '协议版本'
    }
}, {
    tableName: 'users',
    timestamps: false,  // 禁用自动添加的createdAt和updatedAt字段
    indexes: [
        { name: 'idx_username', fields: ['username'] },
        { name: 'idx_phone', fields: ['phone'] },
        { name: 'idx_email', fields: ['email'] }
    ]
});

module.exports = User;