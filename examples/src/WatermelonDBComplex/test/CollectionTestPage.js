import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { runAllTests, cleanTestData, testCreateMethod, testFindMethod, testQueryFetchMethod, testQueryFetchCountMethod, testFindAndObserveMethod, testPrepareCreateMethod } from './testCollectionApi';

// 测试按钮组件
const TestButton = ({ label, onPress, disabled = false }) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.btnDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <Text style={[styles.btnText, disabled && styles.btnTextDisabled]}>{label}</Text>
  </TouchableOpacity>
);

// 测试结果项
const ResultItem = ({ result }) => (
  <View style={[styles.resultItem, result.success ? styles.success : styles.error]}>
    <Text style={styles.resultMethod}>{result.method}</Text>
    <Text style={styles.resultMsg}>{result.message}</Text>
  </View>
);

const CollectionTestPage = () => {
  // 移除 TS 类型标注，直接初始化数组
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  // 接收测试结果（移除参数类型标注）
  const handleResult = useCallback((res) => {
    setResults(prev => [...prev, res]);
  }, []);

  // 运行单个测试（移除参数类型标注）
  const runSingle = useCallback(async (test) => {
    if (testing) return;
    setTesting(true);
    handleResult(await test());
    setTesting(false);
  }, [testing, handleResult]);

  // 运行所有测试
  const runAll = useCallback(async () => {
    if (testing) return;
    setTesting(true);
    setResults([]);
    await runAllTests(handleResult);
    setTesting(false);
  }, [testing, handleResult]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Collection API 测试面板</Text>

      {/* 批量测试按钮 */}
      <View style={styles.btnGroup}>
        <TestButton label="运行所有测试" onPress={runAll} disabled={testing} />
        <TestButton label="清理测试数据" onPress={() => runSingle(cleanTestData)} disabled={testing} />
        <TestButton label="清空结果" onPress={() => setResults([])} disabled={testing} />
      </View>

      {/* 单个测试按钮 */}
      <Text style={styles.subtitle}>单个 API 测试</Text>
      <View style={styles.singleBtnGroup}>
        <TestButton label="create" onPress={() => runSingle(testCreateMethod)} disabled={testing} />
        <TestButton label="find" onPress={() => runSingle(testFindMethod)} disabled={testing} />
        <TestButton label="query+fetch" onPress={() => runSingle(testQueryFetchMethod)} disabled={testing} />
        <TestButton label="query + fetchCount" onPress={() => runSingle(testQueryFetchCountMethod)} disabled={testing} />
        <TestButton label="findAndObserve" onPress={() => runSingle(testFindAndObserveMethod)} disabled={testing} />
        <TestButton label="prepareCreate" onPress={() => runSingle(testPrepareCreateMethod)} disabled={testing} />
      </View>

      {/* 测试结果展示 */}
      <Text style={styles.subtitle}>测试结果</Text>
      <ScrollView style={styles.resultContainer}>
        {results.length === 0 ? (
          <Text style={styles.noResult}>点击按钮开始测试...</Text>
        ) : (
          results.map((res, i) => <ResultItem key={i} result={res} />)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
    marginVertical: 12,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  singleBtnGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  btn: {
    padding: 10,
    backgroundColor: '#4299e1',
    borderRadius: 6,
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#a0aec0',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btnTextDisabled: {
    color: '#e2e8f0',
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultItem: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 6,
    borderLeftWidth: 4,
  },
  success: {
    backgroundColor: '#f0f8fb',
    borderLeftColor: '#48bb78',
  },
  error: {
    backgroundColor: '#fef7fb',
    borderLeftColor: '#e53e3e',
  },
  resultMethod: {
    fontWeight: '600',
    color: '#2d3748',
    fontSize: 12,
    marginBottom: 4,
  },
  resultMsg: {
    color: '#4a5568',
    fontSize: 12,
    lineHeight: 14,
    height: 'auto',
  },
  noResult: {
    color: '#718096',
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
  },
});

export default CollectionTestPage;