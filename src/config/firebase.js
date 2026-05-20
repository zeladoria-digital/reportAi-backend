const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // se usar Firestore
db.settings({ ignoreUndefinedProperties: true })
const auth = admin.auth();    // se usar Authentication

module.exports = { admin, db, auth };