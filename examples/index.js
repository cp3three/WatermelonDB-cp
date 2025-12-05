import { AppRegistry, View, Text, LogBox } from 'react-native';
import { name as appName } from './app.json';
// import App from './src/WatermelonDBAndroid';
// import App from './src/WatermelonDBQuery';
import App from './src/WatermelonDBFetchTest';

LogBox.ignoreAllLogs(true);

AppRegistry.registerComponent(appName, () => App);