// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { Platform } from "react-native";

// Importa o auth do Firebase JS SDK da web
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";

// ignora tipos — força o runtime a usar as exports que existem
const { setPersistence, browserLocalPersistence } =
  require("firebase/auth") as any;

// TODO: Substituir com suas credenciais do Firebase Console
// 1. Acesse: https://console.firebase.google.com/
// 2. Crie um projeto novo
// 3. Vá em Project Settings > Your apps > Web app
// 4. Copie as credenciais aqui

const firebaseConfig = {
  apiKey: "AIzaSyAx0tbUjxoxt6jGh6feJFE1LJVctOUnMww",
  authDomain: "confere-angola.firebaseapp.com",
  databaseURL: "https://confere-angola-default-rtdb.firebaseio.com",
  projectId: "confere-angola",
  storageBucket: "confere-angola.firebasestorage.app",
  messagingSenderId: "600788511196",
  appId: "1:600788511196:web:f74d7633507140a1b94719"
};


// Initialize Firebase
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: any;
if (Platform.OS === "web") {
  // Navegador
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence);
} else {
  // React Native
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}
const database = getDatabase(app);

// browserLocalPersistence usa AsyncStorage no React Native (quando disponível), e o firebase web já entende isto automaticamente
// Não precisa instalar @react-native-firebase/app
// setPersistence(auth, browserLocalPersistence).catch(console.error);

export { app, auth, database };
