const functions = require('firebase-functions');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');

admin.initializeApp();

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });


exports.onImageStored = functions.storage.object().onMetadataUpdate(async (object) => {
    console.log(object);

    // Creates a client
    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.landmarkDetection(`gs://${object.bucket}/${object.name}`);
    const [result2] = await client.faceDetection(`gs://${object.bucket}/${object.name}`);
    const landmarks = result.landmarkAnnotations;
    const faces = result2.faceAnnotations;
    console.log('Landmarks:');
    landmarks.forEach(landmark => console.log(landmark));
    console.log('faces:');
    console.log(faces);
    return result;
});