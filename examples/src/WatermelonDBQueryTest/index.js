// index.js - 纯JS导航方案（无原生依赖）
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import FetchTestScreen from './FetchTestScreen';
import ObserveMethodTest from './ObserveMethodTest';
import MarkAllAsDeletedTest from './MarkAllAsDeletedTest';
import QueryMetadataTest from './QueryMetadataTest';
import { DatabaseProvider } from '@react-native-ohos/watermelondb/react';
import { database } from './database';

// 主入口组件（纯JS切换页面）
export default function WatermelonDBQueryTest() {
  // 用状态管理当前显示的页面
  const [currentScreen, setCurrentScreen] = useState('home');

  // 渲染对应页面
  const renderScreen = () => {
    switch (currentScreen) {
      case 'fetch':
        return <FetchTestScreen />;
      case 'observe':
        return <ObserveMethodTest />;
      case 'markAll':
        return <MarkAllAsDeletedTest />;
      case 'metadata':
        return <QueryMetadataTest />;
      default: // home
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Query类测试页面入口</Text>
            <Button
              title="进入Fetch测试页面"
              onPress={() => setCurrentScreen('fetch')}
              style={styles.button}
            />
            <Button
              title="进入Observe测试页面"
              onPress={() => setCurrentScreen('observe')}
              style={styles.button}
            />
            <Button
              title="进入markAllAsDelted测试页面"
              onPress={() => setCurrentScreen('markAll')}
              style={styles.button}
            />
            <Button
              title="进入QueryMetadataTest测试页面"
              onPress={() => setCurrentScreen('metadata')}
              style={styles.button}
            />
          </View>
        );
    }
  };

  return (
    <DatabaseProvider database={database}>
      <View style={{ flex: 1 }}>
        {/* 返回按钮（非首页时显示） */}
        {currentScreen !== 'home' && (
          <View style={styles.backButtonContainer}>
            <Button
              title="返回上一页"
              onPress={() => setCurrentScreen('home')}
              color="#666"
            />
          </View>
        )}
        {/* 渲染当前页面 */}
        {renderScreen()}
      </View>
    </DatabaseProvider>
  );
}

// 样式
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 40,
  },
  backButtonContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
});