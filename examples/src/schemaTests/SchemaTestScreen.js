import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import {
  appSchema,
  tableSchema,
  tableName,
  columnName,
  validateColumnSchema,
} from '@nozbe/watermelondb';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

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

// 定义应用数据库结构（使用 appSchema）
const appDatabaseSchema = appSchema({
  version: 1,
  tables: [userTableSchema],
});

// 验证字段定义（使用 validateColumnSchema）
const validateUserColumns = () => {
  const results = [];
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

// 初始化数据库
const initializeDatabase = async () => {
  const adapter = new SQLiteAdapter({
    dbName: 'watermelon_test_db',
    schema: appDatabaseSchema,
    jsi: false,
    migrations: schemaMigrations({ migrations: [] }),
  });

  await adapter.initializingPromise; // 等待适配器初始化
  return new Database({ adapter, modelClasses: [] });
};

const SchemaExample = () => {
  const [validationResult, setValidationResult] = useState(null);
  const [createResult, setCreateResult] = useState(null);
  const [database, setDatabase] = useState(null);

  // 验证字段结构
  const handleValidateSchema = () => {
    const results = validateUserColumns();
    setValidationResult(results);
    setCreateResult(null);
  };

  // 创建数据库表
  const handleCreateTables = async () => {
    try {
      if (database) {
        setCreateResult({
          success: true,
          message: '数据库已存在',
          tables: [userTable],
        });
        return;
      }

      const db = await initializeDatabase();
      setDatabase(db);
      setCreateResult({
        success: true,
        message: '数据库表创建成功',
        tables: [userTable],
      });
    } catch (error) {
      setCreateResult({
        success: false,
        message: '数据库表创建失败',
        error: error.message,
      });
    }
  };

  // 清空页面状态
  const handleClear = () => {
    setValidationResult(null);
    setCreateResult(null);
    setDatabase(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WatermelonDB 表创建示例</Text>

      <View style={styles.buttons}>
        <Button
          title="验证字段定义"
          onPress={handleValidateSchema}
          color="#2196F3"
        />
        <Button
          title="创建用户表"
          onPress={handleCreateTables}
          color="#4CAF50"
        />
        <Button title="清空状态" onPress={handleClear} color="#f44336" />
      </View>

      {/* 字段验证结果展示 */}
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

      {/* 创建结果展示 */}
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
