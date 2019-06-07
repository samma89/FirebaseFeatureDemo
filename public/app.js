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
        debugger;
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
                  var placeholder = createPhotoNode(e.target.result, theFile.name, 'imgx_'+ document.querySelectorAll('.photo_container').length)
                  
                  document.getElementById('photo_grid').insertBefore(placeholder, document.getElementById('form'));
  
                  uploadToStorage(firebase.auth().currentUser.uid, theFile)
                };
              })(f);
        
              // Read in the image file as a data URL.
              reader.readAsDataURL(f);
        }
    });

});

function createPhotoNode(imageURL, filename, nodeId){
    // <div class="photo_container">
    //         <div class="img">
    //           <img src="/loading.gif" alt="loading-image" class="thumb_loading"/>
    //         </div>
    //         <div class="tags group">
    //           <span class="tag">People</span>
    //           <span class="tag">Building</span>
    //         </div>
    //       </div>
    var cont = document.createElement('div');
    cont.id = nodeId;
    cont.className = 'photo_container';
    var imgCont = document.createElement('div');
    imgCont.className = 'img';
    imgCont.style.backgroundImage = 'url('+imageURL+')';
    imgCont.append('<img src="/loading.gif" alt="loading-image" class="thumb_loading"/>');
    cont.appendChild(imgCont);
    var tagCont = document.createElement('div');
    tagCont.className = 'tags group';
    cont.appendChild(tagCont);

    return cont;
}

function setCookie(key, value) {
  var expires = new Date();
  expires.setTime(expires.getTime() + 1 * 24 * 60 * 60 * 1000);
  document.cookie = key + "=" + value + ";expires=" + expires.toUTCString();
}

function getCookie(key) {
  var keyValue = document.cookie.match("(^|;) ?" + key + "=([^;]*)(;|$)");
  return keyValue ? keyValue[2] : null;
}

function loadAlbum() {
    var user = firebase.auth().currentUser;
    var db = firebase.firestore();
    var userRef = db.collection('users').doc(user.uid)
    
    userRef.get().then(function(userDoc){
        debugger
        if(userDoc.exists) {
            //user is registered already. retrieve his album data
            console.log(userDoc.data())
            userRef.collection('album').get().then(function(snapshot){
                debugger
                document.querySelector('.loading').style.display = 'none';
                document.getElementById('logged').style.display = 'block';
                if(snapshot.empty){
                    // no images uploaded   
                }else{
                    snapshot.forEach(function(doc){
                        debugger
                        console.log(doc.data());
                    });
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
                document.getElementById('album').style.display = 'block';
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

function uploadToStorage(userId, file) {
    var fileName = Math.round(Math.random()*1000)+'-'+file.name;
    var ref = firebase.storage().ref().child(userId+'/'+fileName);
    ref.put(file).then(function(snapshot){
        
        firebase.firestore().collection('users/'+userId+'/myAlbum').add({
            filename: fileName,
            path: snapshot.ref.location.path_
        })
        .then(function(docRef){
            debugger;
            ref.updateMetadata({
                customMetadata: {
                    objId: docRef.id
                }
            }).then(function(meta){
                debugger
            }).catch(function(err){
                console.log(err);
            });
        })
        .catch(function(err){
            console.log(err);
        });
        debugger
    }).catch(function(err) {

    });
}

//Constants
var AUTH_COOKIE_KEY = "key-auth-t";
