// Firebaseコンソールの「プロジェクトの設定」>「マイアプリ」>「ウェブアプリ」からコピーします。
// この設定値はブラウザに公開される前提のものです。データ保護はFirestore Security Rulesで行います。
export const firebaseConfig = {
  apiKey: 'AIzaSyAzbdou5M1jNkOV5EsWn_jv1zjPtBI-Rt8',
  authDomain: 'elecstock-test.firebaseapp.com',
  projectId: 'elecstock-test',
  storageBucket: 'elecstock-test.firebasestorage.app',
  messagingSenderId: '604072399702',
  appId: '1:604072399702:web:40608590eac14426783cf7'
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) => String(value).startsWith('YOUR_'));
