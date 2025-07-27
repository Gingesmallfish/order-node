// models/Terms.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/index');

const Terms = sequelize.define('Terms', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '协议ID，主键'
    },
    version: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: '协议版本号（如1.0.0）'
    },
    content: {
        type: DataTypes.TEXT, // 存储协议完整文本（支持大文本）
        allowNull: false,
        comment: '协议内容'
    },
    is_latest: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '是否为最新版本：0-否，1-是'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '创建时间'
    }
}, {
    tableName: 'terms',
    timestamps: false,
    indexes: [
        { name: 'idx_version', fields: ['version'] },
        { name: 'idx_is_latest', fields: ['is_latest'] } // 加速查询最新版本
    ]
});

module.exports = Terms;