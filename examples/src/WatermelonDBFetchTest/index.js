// App.js
import React from 'react';
import { View } from 'react-native';
import FetchTestScreen from './FetchTestScreen';
import { database } from './database';
import { DatabaseProvider } from '@react-native-ohos/watermelondb/react';

export default function App() {
  return (
    <DatabaseProvider database={database}>
      <View style={{ flex: 1 }}>
        <FetchTestScreen />
      </View>
    </DatabaseProvider>
  );
}