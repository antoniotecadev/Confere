import { Redirect } from 'expo-router';

export default function Index() {
  // Redireciona imediatamente para a Splash
  return <Redirect href="/screens/SplashScreen" />;
}
