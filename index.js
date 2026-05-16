// Entry point — registerRootComponent wires up AppRegistry correctly for both
// Expo Go and production builds. No bare side-effect imports here.
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
