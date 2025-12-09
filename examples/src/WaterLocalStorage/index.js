// LocalStorageTest.js
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput } from 'react-native';
import SQLiteAdapter from '@react-native-ohos/watermelondb/adapters/sqlite';
import Database from '@react-native-ohos/watermelondb/Database';
import { mySchema } from './models/schema';
import { dbModels } from './models/index.js';
const adapter = new SQLiteAdapter({
  dbName: 'WatermelonDemo',
  schema: mySchema,
  jsi: false,
  onSetUpError: (error) => {
    console.error('[LocalStorage] 初始化数据库失败', error);
  },
});

const database = new Database({
  adapter,
  modelClasses: dbModels,
});

const LocalStorageTest = () => {
  // 状态管理：输入的键/值、获取的结果、操作提示
  const [key, setKey] = useState('test_key');
  const [value, setValue] = useState('test_value');
  const [result, setResult] = useState('');
  const [tip, setTip] = useState('请点击按钮操作');

  // 初始化数据库实例（假设已配置）

  // 1. 设置 database.localStorage 值
  const handleSet = async () => {
    try {
      console.log('!!!!', database.localStorage.set())
      
      // 支持 JSON 可序列化类型（字符串/数字/对象/数组）
      // 若输入的是 JSON 字符串，可解析为对象：JSON.parse(value)
      await database.localStorage.set(key, value)
      setTip(`设置成功：key=${key}, value=${value}`);
      setResult(''); // 清空结果
    } catch (error) {
      setTip(`设置失败：${error.message}`);
    }
  };

  // 2. 获取 database.localStorage 值
  const handleGet = async () => {
    try {
      const res = await database.localStorage.get(key);
      setResult(res ? `获取结果：${JSON.stringify(res)}` : '该键不存在');
      setTip('获取操作完成');
    } catch (error) {
      setTip(`获取失败：${error.message}`);
    }
  };

  // 3. 删除 database.localStorage 值
  const handleRemove = async () => {
    try {
      await database.localStorage.remove(key);
      setTip(`删除成功：key=${key}`);
      setResult(''); // 清空结果
    } catch (error) {
      setTip(`删除失败：${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WatermelonDB LocalStorage 测试</Text>

      {/* 键/值输入框 */}
      <TextInput
        style={styles.input}
        placeholder="输入存储的键（默认 test_key）"
        value={key}
        onChangeText={setKey}
      />
      <TextInput
        style={styles.input}
        placeholder="输入存储的值（默认 test_value）"
        value={value}
        onChangeText={setValue}
      />

      {/* 操作按钮组 */}
      <View style={styles.buttonGroup}>
        <Button title="设置值" onPress={handleSet} />
        <Button title="获取值" onPress={handleGet} color="#2196F3" />
        <Button title="删除值" onPress={handleRemove} color="#F44336" />
      </View>

      {/* 操作提示 */}
      <Text style={styles.tip}>{tip}</Text>

      {/* 获取结果展示 */}
      {result ? <Text style={styles.result}>{result}</Text> : null}
    </View>
  );
}; 

// 样式
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 10,
  },
  tip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  result: {
    fontSize: 16,
    color: '#2196F3',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LocalStorageTest;