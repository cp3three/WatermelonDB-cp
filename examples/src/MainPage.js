import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import WatermelonDemo from './WatermelonDBComplex'; 
import WatermelonDBQueryTest from './WatermelonDBQueryTest/index'; 
import WatermelonDBSimpleBase from './WaterDatabase'; 
import LocalStorageTest from './WaterLocalStorage'; 
import CollectionMapTestPage from './WatermelonDBCollectionMap'; 
import WatermelonRelaDemo from './WatermelonDBSimple'; 

// 主入口组件
export default function MainPage() {
  // 用状态管理当前显示的页面
  const [currentScreen, setCurrentScreen] = useState('home');

  // 渲染对应页面
  const renderScreen = () => {
    switch (currentScreen) {
      case 'query':
        return <WatermelonDBQueryTest />;
      case 'collection':
        return <WatermelonDemo />;
      case 'base':
        return <WatermelonDBSimpleBase />;
      case 'collectionMap':
        return <CollectionMapTestPage />;
      case 'local':
        return <LocalStorageTest />;
      case 'realtion':
        return <WatermelonRelaDemo />;
      default: // home
        return (
          <View style={styles.container}>
            <Text style={styles.title}>watermelon测试页面入口</Text>
            <Button
              title="进入Query测试页面"
              onPress={() => setCurrentScreen('query')}
              style={styles.button}
            />
            <Button
              title="进入Collection测试页面"
              onPress={() => setCurrentScreen('collection')}
              style={styles.button}
            />
            <Button
              title="进入Database测试页面"
              onPress={() => setCurrentScreen('base')}
              style={styles.button}
            />
            <Button
              title="进入LocalStorageKey测试页面"
              onPress={() => setCurrentScreen('local')}
              style={styles.button}
            />
            <Button
              title="进入CollectionMap测试页面"
              onPress={() => setCurrentScreen('collectionMap')}
              style={styles.button}
            />
            <Button
              title="进入Relation测试页面"
              onPress={() => setCurrentScreen('realtion')}
              style={styles.button}
            />
          </View>
        );
    }
  };

  return (
      <View style={{ flex: 1 }}>
        {/* 返回按钮（非首页时显示） */}
        {currentScreen !== 'home' && (
          <View style={styles.backButtonContainer}>
            <Button
              title="返回首页"
              onPress={() => setCurrentScreen('home')}
              color="#666"
            />
          </View>
        )}
        {/* 渲染当前页面 */}
        {renderScreen()}
      </View>
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
    marginTop:50,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
});