const functions = require('firebase-functions');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');

admin.initializeApp();

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });


exports.onImageStored = functions.storage.object().onMetadataUpdate(async (imageObj) => {
    console.log(imageObj);

    // Creates a client
    const client = new vision.ImageAnnotatorClient();
    const imagePath = `gs://${imageObj.bucket}/${imageObj.name}`

    const [landmarkResult] = await client.landmarkDetection(imagePath);
    const [objectResult] = await client.objectLocalization(imagePath);
    const landmarks = landmarkResult.landmarkAnnotations;
    const objects = objectResult.localizedObjectAnnotations;

    const tags = [];
    console.log('Landmarks:');
    landmarks.forEach(landmark => {
        console.log(landmark.description);
        tags.push(landmark.description);
    });
    console.log('objects:');
    objects.forEach(object => {
        console.log(object.name);
        tags.push(object.name);
    });

    //to get rid of duplicates
    const uniqTags = [...new Set(tags)];
    
    return admin.firestore().doc(`users/${imageObj.name.split('/')[0]}/myAlbum/${imageObj.metadata.objId}`).update({tags: uniqTags});
});