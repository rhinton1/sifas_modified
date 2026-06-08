import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthScreen from "./src/screens/AuthScreen";
import AvatarSelectScreen from "./src/screens/AvatarSelectScreen";
import SessionScreen from "./src/screens/SessionScreen";
import { ActivityIndicator, View } from "react-native";

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <View style={{ flex: 1, backgroundColor: "#0f0f1a", justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#7c3aed" size="large" />
        </View>
    );
  }

  return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
            <>
              <Stack.Screen name="Avatars" component={AvatarSelectScreen} />
              <Stack.Screen name="Session" component={SessionScreen} />
            </>
        ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
  );
}

export default function App() {
  return (
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
  );
}