var imageProcessingListenerUnsubscribe;

document.addEventListener("DOMContentLoaded", function() {
  
    firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      console.log(user);
      document.querySelector('.loading').style.display = 'block';
      loadAlbum();
    } else {
      // No user is signed in.
      console.log("user not signed in");

      var ui = new firebaseui.auth.AuthUI(firebase.auth());

      ui.start("#firebaseui-auth-container", {
        callbacks: {
          signInSuccessWithAuthResult: function(authResult, redirectUrl) {
            document.getElementById('login').style.display = 'none';
            return false;
          },
          uiShown: function(){
              document.querySelector('.loading').style.display = 'none';
              document.getElementById('login').style.display = 'block';
          }
        },
        signInFlow: "popup",
        // signInSuccessUrl: 'https://codesprint-demo.firebaseapp.com/',
        signInOptions: [
          {
            provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
            scopes: ["https://www.googleapis.com/auth/contacts.readonly"],
            customParameters: {
              // Forces account selection even when one account
              // is available.
              prompt: "select_account"
            }
          },
          firebase.auth.EmailAuthProvider.PROVIDER_ID
        ]
      });
    }
  });

  //image selection listener
    var imageInput = document.getElementById('imageSelector');

    imageInput.addEventListener('change', function(event){
        for (let i = 0; i < event.target.files.length; i++) {
            const f = event.target.files[i];
            
            // Only process image files.
            if (!f.type.match('image.*')) {
                continue;
              }
        
              var reader = new FileReader();
        
              // Closure to capture the file information.
              reader.onload = (function(theFile) {
                return function(e) {
                  // Render thumbnail.
                  var imDivId = 'imgx_'+ document.querySelectorAll('.photo_container').length;
                  var placeholder = createPhotoNode(e.target.result, imDivId);

                  document.getElementById('photo_grid').insertBefore(placeholder, document.getElementById('form'));
                  placeholder.querySelector('.thumb_loading').style.visibility = 'visible';
  
                  uploadToStorage(firebase.auth().currentUser.uid, theFile, imDivId)
                };
              })(f);
        
              // Read in the image file as a data URL.
              reader.readAsDataURL(f);
        }
    });

});

function createPhotoNode(imageURL, nodeId, tags){
    var cont = document.createElement('div');
    cont.id = nodeId;
    cont.className = 'photo_container';
    var imgCont = document.createElement('div');
    imgCont.className = 'img';
    imgCont.style.backgroundImage = 'url('+imageURL+')';
    var loadingImg = document.createElement('img');
    loadingImg.className = 'thumb_loading';
    loadingImg.src = '/loading.gif';
    loadingImg.alt = 'loading-image';
    imgCont.appendChild(loadingImg);
    cont.appendChild(imgCont);
    
    if(tags) {
        cont.appendChild(createTags(tags));
    }

    return cont;
}

function createTags(tags) {
    var tagCont = document.createElement('div');
    tagCont.className = 'tags group';
    for (var i = 0; i < tags.length; i++) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerText = tags[i];
        tagCont.appendChild(tag);
    }
    return tagCont;
}

function loadAlbum() {
    var user = firebase.auth().currentUser;
    var db = firebase.firestore();
    var userRef = db.collection('users').doc(user.uid)
    
    userRef.get().then(function(userDoc){
        if(userDoc.exists) {
            //user is registered already. retrieve his album data
            console.log(userDoc.data())
            userRef.collection('myAlbum').get().then(function(snapshot){
                document.querySelector('.loading').style.display = 'none';
                document.getElementById('logged').style.display = 'block';
                if(snapshot.empty){
                    // no images uploaded   
                }else{
                    populateAlbum(snapshot);
                }
            })
            .catch(function(err){
                console.log(err);
            });
        }else{
            //user not registered. register now
            userRef.set({
                id: user.uid,
                name: user.displayName,
                hasVerified: user.emailVerified,
                email: user.email,
                photoUrl: user.photoUrl || ''
            }).then(function(newUser){
                document.querySelector('.loading').style.display = 'none';
                document.getElementById('logged').style.display = 'block';
            })
            .catch(function(err){
                console.log(err);
            });
        }

        
    })
    .catch(function(err){
        console.log(err);
    });
}

function uploadToStorage(userId, file, imageDivId) {
    var fileName = Math.round(Math.random()*1000)+'-'+file.name;
    var ref = firebase.storage().ref().child(userId+'/'+fileName);
    ref.put(file).then(function(snapshot){
        
        firebase.firestore().collection('users/'+userId+'/myAlbum').add({
            filename: fileName,
            path: snapshot.ref.location.path_
        })
        .then(function(docRef){
            document.getElementById(imageDivId).id = 'imgx_'+docRef.id;
            ref.updateMetadata({
                customMetadata: {
                    objId: docRef.id
                }
            }).then(function(meta){
                //removing the previous listeners, if any
                if(imageProcessingListenerUnsubscribe) imageProcessingListenerUnsubscribe();

                //attaching a db listener to the image node in firestore
                imageProcessingListenerUnsubscribe = firebase.firestore().doc('users/'+userId+'/myAlbum/'+docRef.id)
                    .onSnapshot(function(imageDoc){
                        var imNode = document.getElementById('imgx_'+docRef.id);
                        //hide the loader on image node
                        
                        console.log(imageDoc.data());
                        if(imageDoc.data().tags) {
                            imNode.querySelector('.thumb_loading').style.visibility = 'hidden';
                            var tagCont = createTags(imageDoc.data().tags);
                            imNode.appendChild(tagCont);
                            imageProcessingListenerUnsubscribe();
                        }

                        
                    },
                    function(error){
                        console.log(error);
                        imageProcessingListenerUnsubscribe();
                    });
            }).catch(function(err){
                console.log(err);
            });
        })
        .catch(function(err){
            console.log(err);
        });
    }).catch(function(err) {
        console.log(err);
    });
}

function populateAlbum(dataset) {
    var container = document.getElementById('photo_grid');
    dataset.forEach(function(doc){
        var data = doc.data()
        console.log(data);
        var placeholder = createPhotoNode('', 'imgx_'+doc.id, data.tags);
        placeholder.querySelector('.thumb_loading').style.visibility = 'visible';
        container.insertBefore(placeholder, document.getElementById('form'));
        downloadImageIntoView('imgx_'+doc.id, data.path);
    });
}

function downloadImageIntoView(viewId, imagePath) {
    var ref = firebase.storage().ref(imagePath);
    ref.getDownloadURL().then(function(url){
        var imageBg = new Image();
        imageBg.onload = function(e){
            document.getElementById(viewId).querySelector('.img').style.backgroundImage = 'url('+url+')';
            document.getElementById(viewId).querySelector('.thumb_loading').style.visibility = 'hidden';
        };
        imageBg.src = url;
        
    })
    .catch(function(error) {
        console.log(err);
    });
}