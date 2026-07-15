const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  
  storageBucket: 'projeto-zeladoria-cn.appspot.com'});

const db = admin.firestore(); 
db.settings({ ignoreUndefinedProperties: true })
const auth = admin.auth();    
const bucket = admin.storage().bucket(); 

module.exports = { admin, db, auth, bucket };