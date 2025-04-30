// Import the required Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBX9gB7gUCWdesBT9bR9Z_mjO8Bh_p3KME",
  authDomain: "instagram-clone-d2266.firebaseapp.com",
  projectId: "instagram-clone-d2266",
  storageBucket: "instagram-clone-d2266.appspot.com",
  messagingSenderId: "398933303110",
  appId: "1:398933303110:web:ba6eba7c15941385b24f47",
  measurementId: "G-R6B0GQK5TR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// CUID or similar simple ID generator
function cuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class Post {
  constructor(id, caption, image) {
    this.id = id;
    this.caption = caption;
    this.image = image;
  }
}

class App {
  constructor() {
    this.posts = [];
    this.loginUsername = "";
    this.userId = "";
    this.files = [];
    this.selectedOptionsId = "";
    this.selectedOptionsCaption = "";
    this.selectedOptionsImage = "";
    this.indexOfPost = "";

    // DOM USER INTERFACE
    this.$app = document.querySelector("#app");
    this.$firebaseAuthContainer = document.querySelector("#firebaseui-auth-container");
    this.$logoutBtn = document.querySelector(".logout-btn");
    this.$authUser = document.querySelector(".auth-user");

    // DOM FUNCTIONALITY
    this.$uploadContainer = document.querySelector("#upload-container");
    this.$filesToUpload = document.querySelector("#files");
    this.$uploadBtn = document.querySelector(".upload-btn");
    this.$cancelUpload = document.querySelector("#cancel");
    this.$sendBtn = document.querySelector("#send");
    this.$progress = document.querySelector("#progress");
    this.$uploadingBar = document.querySelector("#uploading");
    this.$posts = document.querySelector(".posts");
    this.$captionText = document.querySelector("#caption-text");
    this.$postTime = document.querySelector(".posted-time");
    this.$authModal = document.querySelector(".authenticated");
    this.$modalContent = document.querySelector("#auth-content");
    this.$editBtn = document.querySelector("#edit-btn");
    this.$fileName = document.querySelector(".file-name");
    this.$updateBtn = document.querySelector("#update-post");
    this.$defaultModal = document.querySelector(".default-modal");
    this.$defaultContent = document.querySelector(".default");
    this.$unFollow = document.querySelector("#delete-post");

    // Initialize FirebaseUI
    this.ui = new firebaseui.auth.AuthUI(auth);
    this.handleAuth();

    this.addEventListeners();
    this.displayPost();
  }

  // AUTHENTICATION
  handleAuth() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.loginUsername = user.displayName || user.email;
        this.$authUser.innerHTML = this.loginUsername;
        this.userId = user.uid;
        this.redirectToApp();
      } else {
        this.redirectToAuth();
      }
    });
  }

  handleLogout(event) {
    const isLogoutBtnClickedOn = this.$logoutBtn.contains(event.target);
    if (isLogoutBtnClickedOn) {
      auth.signOut().then(() => {
        this.redirectToAuth();
      }).catch((error) => {
        console.log("ERROR HAS OCCURED", error);
      });
    }
  }

  redirectToApp() {
    this.$firebaseAuthContainer.style.display = "none";
    this.$uploadContainer.style.display = "none";
    this.$app.style.display = "block";
    this.fetchPostsFromDB();
  }

  redirectToAuth() {
    this.$firebaseAuthContainer.style.display = "block";
    this.$app.style.display = "none";
    this.$uploadContainer.style.display = "none";

    this.ui.start('#firebaseui-auth-container', {
      signInOptions: [
        EmailAuthProvider.PROVIDER_ID,
        GoogleAuthProvider.PROVIDER_ID,
      ],
      signInSuccessUrl: '/',
      credentialHelper: firebaseui.auth.CredentialHelper.NONE
    });
  }

  // EVENT LISTENERS
  addEventListeners() {
    document.body.addEventListener("click", (event) => {
      this.handleLogout(event);
      this.redirectToUploadContainer(event);
      this.handleUploadClick(event);
      this.cancelUpload(event);
      this.closeDefaultModal(event);
      this.closeModal(event);
      this.openModalOnOptions(event);
      this.handleDeletePost(event);
      this.handleUpdate(event);
    });
    
    this.$filesToUpload.addEventListener("change", (event) => {
      this.handleFileChosen(event);
    });
  }

  redirectToUploadContainer(event) {
    const isUploadBtnClickedOn = this.$uploadBtn.contains(event.target);
    if (isUploadBtnClickedOn) {
      this.$app.style.display = "none";
      this.$uploadContainer.style.display = "block";
      this.$sendBtn.style.display = "block";
      this.$updateBtn.style.display = "none";
    }
  }

  // FILE HANDLING
  handleFileChosen(event) {
    this.files = event.target.files;
    if (this.files.length > 0) {
      alert("File chosen!");
    } else {
      alert("No file chosen!");
    }
  }

  // UPLOAD TO FIREBASE STORAGE
  uploadToFB() {
    for (let i = 0; i < this.files.length; i++) {
      const name = this.files[i].name;
      const storageRef = ref(storage, name);
      const uploadTask = uploadBytesResumable(storageRef, this.files[i]);

      uploadTask.on('state_changed',
        (snapshot) => {
          this.progressBar(snapshot);
        },
        (error) => {
          console.log(error, "error uploading file");
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((url) => {
            console.log("image URL =", url);
            this.fileChosen(url);
          });
        }
      );
    }
  }

  // POST TO FEED
  fileChosen(url) {
    const caption = this.$captionText.value;
    const image = url;
    this.postImage({ image, caption });
    this.$filesToUpload.value = "";
    this.$progress.value = "";
    this.$uploadingBar.innerHTML = "";
    this.$captionText.value = "";
    this.redirectToApp();
  }

  progressBar(snapshot) {
    const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    this.$progress.value = percentage;
    if (percentage) {
      this.$uploadingBar.innerHTML = `${this.files[0].name} uploaded`;
    }
  }

  cancelUpload(event) {
    const isCancelBtnClickedOn = this.$cancelUpload.contains(event.target);
    if (isCancelBtnClickedOn) {
      this.$filesToUpload.value = "";
      this.$progress.value = "";
      this.$uploadingBar.innerHTML = "";
      this.$captionText.value = "";
      this.redirectToApp();
    }
  }

  // POST MANAGEMENT
  postImage({ image, caption }) {
    const lowerCaseUsername = this.loginUsername.toLocaleLowerCase();
    const username = lowerCaseUsername.replace(/\s/g, "");
    const newPost = { 
      id: cuid(), 
      image, 
      caption, 
      username, 
      timestamp: this.getTimestamp() 
    };
    this.posts = [...this.posts, newPost];
    this.render();
  }

  getTimestamp() {
    const d = new Date();
    const timestamp = d.getHours() + ':' + d.getUTCMinutes();
    return timestamp;
  }

  editPost(id, { image, caption }) {
    this.posts = this.posts.map((post) => {
      if (post.id == id) {
        post.image = image;
        post.caption = caption;
      }
      return post;
    });
    this.render();
  }

  deletePost(id) {
    this.posts = this.posts.filter((post) => post.id != id);
    this.render();
  }

  // MODAL FUNCTIONALITY
  openModalOnOptions(event) {
    const $selectedOptions = event.target.closest(".options");
    if ($selectedOptions) {
      this.selectedOptionsId = $selectedOptions.id;
      this.handleModalPop(event);
    }
  }

  handleModalPop(event) {
    const $selectedPost = event.target.closest(".post");
    this.selectedOptionsCaption = $selectedPost.children[2].childNodes[3].childNodes[2].nextSibling.innerText;
    const $postUsername = $selectedPost.children[0].innerText;
    if ($postUsername.length === this.loginUsername.length - 1) {
      this.openModal();
    } else {
      this.openDefaultModal();
    }
  }

  openDefaultModal() {
    this.$defaultModal.classList.add("open-modal");
  }

  openModal() {
    this.$authModal.classList.add("open-modal");
  }

  closeDefaultModal(event) {
    const isdefaultContentModalClickedOn = this.$defaultContent.contains(event.target);
    if (!isdefaultContentModalClickedOn && this.$defaultModal.classList.contains("open-modal")) {
      this.$defaultModal.classList.remove("open-modal");
    }
  }

  closeModal(event) {
    const isAuthContentClickedOn = this.$modalContent.contains(event.target);
    if (!isAuthContentClickedOn && this.$authModal.classList.contains("open-modal")) {
      this.$authModal.classList.remove("open-modal");
    }
  }

  // DATABASE OPERATIONS
  async fetchPostsFromDB() {
    try {
      const docRef = doc(db, "users", this.userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("Document data:", docSnap.data().posts);
        this.posts = docSnap.data().posts || [];
        this.displayPost();
      } else {
        console.log("No such document!");
        await setDoc(doc(db, "users", this.userId), {
          posts: this.posts
        });
        console.log("Document successfully written!");
      }
    } catch (error) {
      console.log("Error getting document:", error);
    }
  }

  async savePosts() {
    try {
      await setDoc(doc(db, "users", this.userId), {
        posts: this.posts
      }, { merge: true });
      console.log("Document successfully written!");
    } catch (error) {
      console.error("Error writing document: ", error);
    }
  }

  render() {
    this.savePosts();
    this.displayPost();
  }

  // DISPLAY POSTS
  displayPost() {
    this.$posts.innerHTML = this.posts.map((post) => `
      <div class="post" id="${post.id}">
        <!-- Your post HTML structure here -->
        <!-- Keep your existing post HTML template -->
      </div>
    `).join("");
  }

  // UPDATE POST HANDLING
  async fetchImageFromDB() {
    try {
      const docRef = doc(db, "users", this.userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.getIndex();
        const fileLink = docSnap.data().posts[this.indexOfPost].image;
        this.updatePost(fileLink);
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.log("Error getting document:", error);
    }
  }

  getIndex() {
    const index = this.posts.map(post => post.id).indexOf(this.selectedOptionsId);
    this.indexOfPost = index;
  }

  handleUpdate(event) {
    const isEditBtnClickedOn = this.$editBtn.contains(event.target);
    const isUpdateBtnClickedOn = this.$updateBtn.contains(event.target);
    const isInputFileClickedOn = this.$filesToUpload.contains(event.target);

    if (isEditBtnClickedOn) {
      this.$app.style.display = "none";
      this.$uploadContainer.style.display = "block";
      this.$updateBtn.style.display = "block";
      this.$sendBtn.style.display = "none";
      this.$captionText.value = this.selectedOptionsCaption;
    } else if (isUpdateBtnClickedOn) {
      this.fetchImageFromDB();
    } else if (isInputFileClickedOn) {
      this.$sendBtn.style.display = "block";
      this.$updateBtn.style.display = "none";
      this.uploadToFB();
      this.deletePost(this.selectedOptionsId);
    }
  }

  updatePost(fileLink) {
    this.editPost(this.selectedOptionsId, { 
      image: fileLink, 
      caption: this.$captionText.value 
    });
    this.$progress.value = "";
    this.$uploadingBar.innerHTML = "";
    this.$captionText.value = "";
    this.redirectToApp();
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const instagramApp = new App();
});