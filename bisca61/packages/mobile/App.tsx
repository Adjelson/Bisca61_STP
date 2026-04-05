import 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import LoginScreen from './src/screens/LoginScreen'
import LobbyScreen from './src/screens/LobbyScreen'
import RoomScreen  from './src/screens/RoomScreen'
import PlayScreen  from './src/screens/PlayScreen'
import RulesScreen from './src/screens/RulesScreen'
import { THEME } from './src/constants/config'

export type RootStackParamList = {
  Login: undefined
  Lobby: undefined
  Room:  { code: string }
  Play:  { code: string }
  Rules: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerStyle: { backgroundColor: THEME.bg },
              headerTintColor: THEME.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: THEME.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Lobby" component={LobbyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Room"  component={RoomScreen}  options={{ title: 'Sala de Espera', headerBackTitle: 'Voltar' }} />
            <Stack.Screen name="Play"  component={PlayScreen}  options={{ headerShown: false }} />
            <Stack.Screen name="Rules" component={RulesScreen} options={{ title: 'Regras do Jogo', headerBackTitle: 'Voltar' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
