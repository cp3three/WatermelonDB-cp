// import React, { useState, useRef } from 'react';
// import { Database, Model, tableSchema, column } from '@nozbe/watermelondb'; // 修正导入路径
// import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'; // 基础适配器（模拟场景也需要）
// import {
//     AppRegistry,
//     StyleSheet,
//     ScrollView,
//     Button,
//     Text,
//     View
// } from 'react-native';

// // ===================== 1. 非装饰器写法定义 Model（核心修复） =====================
// // 新版本 WatermelonDB 推荐的非装饰器写法，兼容所有 RN 版本和 Hermes 引擎
// class TestModel extends Model {
//     static table = 'test_tables'; // 直接定义表名，替代 @table 装饰器
    
//     // 定义列映射，替代 @column 装饰器
//     static columns = {
//         title: column('title'),
//         content: column('content'),
//         is_deleted: column('is_deleted'),
//     };

//     // 封装获取字段的方法
//     get title() {
//         return this._raw.title;
//     }

//     get content() {
//         return this._raw.content;
//     }

//     get isDeleted() {
//         return this._raw.is_deleted;
//     }
// }

// // ===================== 2. 模拟数据库配置（避免 App 注册错误） =====================
// // 定义表结构（模拟场景也需要基础配置）
// const schema = tableSchema({
//     name: 'test_schema',
//     tables: [
//         {
//             name: 'test_tables',
//             columns: [
//                 { name: 'title', type: 'string' },
//                 { name: 'content', type: 'string' },
//                 { name: 'is_deleted', type: 'boolean', isOptional: true },
//             ]
//         }
//     ]
// });

// // 创建空适配器（模拟场景无需真实数据库连接）
// const adapter = new SQLiteAdapter({
//     schema,
//     // 模拟模式：禁用真实数据库连接
//     jsi: false,
//     onSetUpError: error => console.log('适配器初始化错误:', error),
// });

// // 创建模拟数据库实例
// const mockDatabase = new Database({
//     adapter,
//     modelClasses: [TestModel],
// });

// // ===================== 3. 测试组件 =====================
// const WatermelonQueryTest = () => {
//     const [mockDbLogs, setMockDbLogs] = useState([]);
    
//     // 模拟 Query 对象（完全兼容 WatermelonDB 接口）
//     const mockQueryRef = useRef({
//         fetch: async () => {
//             // 返回模拟数据（匹配 Model 结构）
//             return [
//                 { id: '1', title: '测试数据1', content: '这是第一条测试数据', is_deleted: false },
//                 { id: '2', title: '测试数据2', content: '这是第二条测试数据', is_deleted: false },
//                 { id: '3', title: '测试数据3', content: '这是第三条测试数据', is_deleted: false },
//             ];
//         },
//         fetchCount: async () => 3,
//         markAllAsDeleted: async () => true
//     });

//     // 模拟 fetch 测试方法
//     const testMockFetch = async () => {
//         try {
//             const data = await mockQueryRef.current.fetch();
//             setMockDbLogs(prev => [
//                 ...prev,
//                 `✅ 模拟 fetch() 结果：共 ${data.length} 条数据`,
//                 `   数据：${data.map(t => t.title).join(', ')}`
//             ]);
//         } catch (error) {
//             setMockDbLogs(prev => [...prev, `❌ 模拟 fetch() 失败：${error.message}`]);
//         }
//     };

//     // UI 渲染
//     return (
//         <ScrollView style={styles.container}>
//             <Text style={styles.title}>Watermelon DB Query 测试（兼容版）</Text>
//             <View style={styles.section}>
//                 <Text style={styles.subtitle}>🟢 模拟数据测试（无需真实数据库）</Text>
//                 <Button title="1. 测试模拟 fetch()" onPress={testMockFetch} />
//                 <View style={styles.logs}>
//                     {mockDbLogs.map((log, idx) => (
//                         <Text key={idx} style={styles.logText}>{log}</Text>
//                     ))}
//                 </View>
//             </View>
//         </ScrollView>
//     );
// };

// // ===================== 4. 关键：注册 App（修复 "未注册" 错误） =====================
// // 替换 "app_name" 为你项目的实际名称（在 app.json 中查看 name 字段）
// AppRegistry.registerComponent('app_name', () => WatermelonQueryTest);

// // 样式定义
// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         padding: 20,
//         backgroundColor: '#f5f5f5',
//     },
//     title: {
//         fontSize: 20,
//         fontWeight: 'bold',
//         marginBottom: 20,
//         textAlign: 'center',
//     },
//     section: {
//         backgroundColor: 'white',
//         padding: 15,
//         borderRadius: 8,
//         marginBottom: 20,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//     },
//     subtitle: {
//         fontSize: 16,
//         fontWeight: '600',
//         marginBottom: 10,
//     },
//     logs: {
//         marginTop: 10,
//         padding: 10,
//         backgroundColor: '#f9f9f9',
//         borderRadius: 4,
//     },
//     logText: {
//         fontSize: 14,
//         lineHeight: 20,
//         color: '#333',
//     },
// });

// export default WatermelonQueryTest;