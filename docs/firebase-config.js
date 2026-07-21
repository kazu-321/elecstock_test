// Firebaseコンソールの「プロジェクトの設定」>「マイアプリ」>「ウェブアプリ」からコピーします。
// この設定値はブラウザに公開される前提のものです。データ保護はFirestore Security Rulesで行います。
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) => String(value).startsWith('YOUR_'));
