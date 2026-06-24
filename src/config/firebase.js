const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // A URL da sua gaveta de arquivos (Storage) injetada com sucesso!
  storageBucket: 'projeto-zeladoria-cn.appspot.com'});

const db = admin.firestore(); // se usar Firestore
db.settings({ ignoreUndefinedProperties: true })
const auth = admin.auth();    // se usar Authentication
const bucket = admin.storage().bucket(); // Iniciamos o Storage

module.exports = { admin, db, auth, bucket };