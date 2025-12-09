import {AppRegistry, View, Text, LogBox} from 'react-native';
import {name as appName} from './app.json';
import MainPage from './src/MainPage';

LogBox.ignoreAllLogs(true);

AppRegistry.registerComponent(appName, () => MainPage);