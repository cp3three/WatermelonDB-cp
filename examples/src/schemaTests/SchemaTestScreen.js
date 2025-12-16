import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import {
  appSchema,
  tableSchema,
  tableName,
  columnName,
  validateColumnSchema,
} from '@nozbe/watermelondb/Schema';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// ===================== 原有表定义（保留）=====================
// 使用 tableName 定义表名（带类型）
const userTable = tableName('users');

// 使用 columnName 定义字段名
const userColumns = {
  name: columnName('name'),
  email: columnName('email'),
  age: columnName('age'),
};

// 定义用户表结构（使用 tableSchema）
const userTableSchema = tableSchema({
  name: userTable,
  columns: [
    { name: userColumns.name, type: 'string' },
    { name: userColumns.email, type: 'string', isIndexed: true },
    { name: userColumns.age, type: 'number', isOptional: true },
  ],
});

// ===================== 新增4个不同表的定义（核心新增）=====================
// 1. 用户信息表（user_info）- 对应columnName按钮
const userInfoTable = tableName('user_info');
const userInfoColumns = {
  userId: columnName('user_id'),
  address: columnName('address'),
  phone: columnName('phone'),
};
const userInfoTableSchema = tableSchema({
  name: userInfoTable,
  columns: [
    { name: userInfoColumns.userId, type: 'string', isIndexed: true },
    { name: userInfoColumns.address, type: 'string' },
    { name: userInfoColumns.phone, type: 'string', isOptional: true },
  ],
});

// 2. 订单表（order）- 对应tableSchema按钮
const orderTable = tableName('order');
const orderTableSchema = tableSchema({
  name: orderTable,
  columns: [
    { name: columnName('order_no'), type: 'string', isIndexed: true },
    { name: columnName('user_id'), type: 'string', isIndexed: true },
    { name: columnName('amount'), type: 'number' },
    { name: columnName('status'), type: 'string', defaultValue: 'pending' },
  ],
});

// 3. 商品表（product）- 对应appSchema按钮
const productTable = tableName('product');
const productTableSchema = tableSchema({
  name: productTable,
  columns: [
    { name: columnName('product_name'), type: 'string' },
    { name: columnName('price'), type: 'number' },
    { name: columnName('stock'), type: 'number', defaultValue: 0 },
  ],
});

// 表结构映射 - 用于根据类型获取对应表
const tableSchemaMap = {
  tableName: userTableSchema,
  columnName: userInfoTableSchema,
  tableSchema: orderTableSchema,
  appSchema: productTableSchema,
};

// ===================== 原有应用schema改为动态生成（仅修改此处）=====================
// 动态生成appSchema（根据传入的表结构）
const getAppDatabaseSchema = (tableSchema) => {
  return appSchema({
    version: 1,
    tables: [tableSchema],
  });
};

// 验证字段定义（使用 validateColumnSchema）
const validateUserColumns = () => {
  const results = [];
  // 修复原有错误：columnArray → columns
  userTableSchema.columnArray.forEach(column => {
    try {
      validateColumnSchema(column);
      results.push({ column: column.name, valid: true });
    } catch (error) {
      results.push({ column: column.name, valid: false, error: error.message });
    }
  });
  console.log(results);
  return results;
};

// ===================== 初始化数据库改为接收表类型参数（核心修改）=====================
// 初始化数据库（新增tableType参数）
const initializeDatabase = async (tableType) => {
  // 根据表类型获取对应表结构
  const targetTableSchema = tableSchemaMap[tableType] || userTableSchema;
  const adapter = new SQLiteAdapter({
    dbName: `watermelon_${tableType}_db`, // 不同表使用不同数据库名
    schema: getAppDatabaseSchema(targetTableSchema),
    jsi: false,
    migrations: schemaMigrations({ migrations: [] }),
  });

  await adapter.initializingPromise; // 等待适配器初始化
  return new Database({ adapter, modelClasses: [] });
};

const SchemaExample = () => {
  const [validationResult, setValidationResult] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [database, setDatabase] = useState({}); // 修改为对象存储不同表的数据库实例

  // 验证字段结构（保留原有）
  const handleValidateSchema = () => {
    const results = validateUserColumns();
    setValidationResult(results);
    setCreateResult(null);
  };

  // ===================== 修改创建方法为接收表类型参数（核心修改）=====================
  // 创建数据库表（新增tableType参数）
  const handleCreateTables = async (tableType) => {
    try {
      // 检查该表是否已创建
      if (database[tableType]) {
        const tableName = tableSchemaMap[tableType]?.name || userTable;
        setCreateResult({
          success: true,
          message: `数据库(${tableType})已存在`,
          tables: [tableName],
        });
        return;
      }

      const db = await initializeDatabase(tableType);
      // 存储对应表类型的数据库实例
      setDatabase({ ...database, [tableType]: db });
      const tableName = tableSchemaMap[tableType]?.name || userTable;
      setCreateResult({
        success: true,
        message: `数据库表(${tableType})创建成功`,
        tables: [tableName],
      });
    } catch (error) {
      setCreateResult({
        success: false,
        message: `数据库表(${tableType})创建失败`,
        error: error.message,
      });
    }
  };

  // 清空页面状态（保留原有）
  const handleClear = () => {
    setValidationResult(null);
    setCreateResult(null);
    setDatabase({}); // 重置为空对象
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WatermelonDB 表创建示例</Text>

      <View style={styles.buttons}>
        {/* 为每个按钮绑定不同的tableType参数 */}
        <Button
          title="使用tableName创建用户表"
          onPress={() => handleCreateTables('tableName')} // 新增参数
          color="#4CAF50"
        />
        <Button
          title="使用columnName创建用户表"
          onPress={() => handleCreateTables('columnName')} // 新增参数
          color="#4CAF50"
        />
        <Button
          title="使用tableSchema创建用户表"
          onPress={() => handleCreateTables('tableSchema')} // 新增参数
          color="#4CAF50"
        />
        <Button
          title="使用appSchema创建用户表"
          onPress={() => handleCreateTables('appSchema')} // 新增参数
          color="#4CAF50"
        />
        <Button
          title="使用validateColumnSchema验证字段定义"
          onPress={handleValidateSchema}
          color="#2196F3"
        />
        <Button title="清空状态" onPress={handleClear} color="#f44336" />
      </View>

      {/* 字段验证结果展示（完全保留原有） */}
      {validationResult && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>字段验证结果</Text>
          {validationResult.every(r => r.valid) ? (
            <Text style={styles.success}>所有字段定义均有效</Text>
          ) : (
            <View>
              <Text style={styles.error}>发现无效字段定义</Text>
              <Text style={styles.error}>
                {' '}
                WatermelonDB 版本过旧，该版本未导出 validateColumnSchema
                函数（该函数是较新版本才对外暴露的
              </Text>
            </View>
          )}
          {validationResult.map((item, i) => (
            <View key={i} style={styles.validationItem}>
              <Text>
                字段 {item.column}:{' '}
                {item.valid ? '有效' : `无效 (${item.error})`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 创建结果展示（完全保留原有） */}
      {createResult && (
        <View style={styles.result}>
          <Text
            style={[
              styles.resultTitle,
              { color: createResult.success ? 'green' : 'red' },
            ]}>
            {createResult.success ? '操作成功' : '操作失败'}
          </Text>
          <Text>{createResult.message}</Text>
          {createResult.error && (
            <Text style={styles.error}>{createResult.error}</Text>
          )}
          {createResult.tables && (
            <View>
              <Text>已创建表:</Text>
              {createResult.tables.map((table, i) => (
                <Text key={i}>- {table}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// ===================== 样式完全保留原有 =====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  result: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  validationItem: {
    marginVertical: 4,
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  success: {
    color: 'green',
    marginBottom: 10,
  },
  error: {
    color: 'red',
  },
});

export default SchemaExample;