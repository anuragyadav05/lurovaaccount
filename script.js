// ==========================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCZvJC6xQkhuM7MkybSwn7FqW5W-ByTKFk",
  authDomain: "lurova-account.firebaseapp.com",
  projectId: "lurova-account",
  storageBucket: "lurova-account.firebasestorage.app",
  messagingSenderId: "925302881748",
  appId: "1:925302881748:web:da8f9f6b298e27b758ea41"
};

// Initialize Firebase App, Auth, and Firestore
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Set Auth Persistence to LOCAL
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Initialize EmailJS (Optional: Replace with your actual Public Key if used)
(function() {
    if (window.emailjs) {
        emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");
    }
})();

// ==========================================================================
// SHARED DOMAIN COOKIE & LOGIN SUCCESS REDIRECT FUNCTION
// ==========================================================================
function onLoginSuccess(user, userData) {
  // नाम निर्धारित करें (Firestore डाटा या Auth डिस्प्ले नेम से)
  let name = "";
  if (userData && userData.firstName) {
    name = `${userData.firstName} ${userData.lastName || ''}`.trim();
  } else {
    name = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
  }

  const email = user.email || '';
  const uid = user.uid || '';

  // 1. Shared Root Domain Cookie सेट करें (.lurova.life ताकि ott.lurova.life इसे तुरंत पढ़ सके)
  const cookiePayload = JSON.stringify({ email, name, uid });
  document.cookie = `lurova_user=${encodeURIComponent(cookiePayload)}; domain=.lurova.life; path=/; max-age=2592000; SameSite=Lax; Secure`;

  // 2. URL पैरामीटर्स के साथ वापस OTT या संदर्भित साइट पर भेजें
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect_url') || urlParams.get('redirect');

  if (redirectUrl) {
    try {
      const finalUrl = new URL(redirectUrl);
      finalUrl.searchParams.set('email', email);
      finalUrl.searchParams.set('name', name);
      finalUrl.searchParams.set('uid', uid);
      window.location.href = finalUrl.toString();
      return true;
    } catch (e) {
      window.location.href = redirectUrl;
      return true;
    }
  }

  return false; // अगर कोई redirect parameter नहीं दिया गया है
}

// Auto Email Notification Helper (Optional)
async function sendAutoEmail(templateId, templateParams) {
  if (!window.emailjs) return;
  const SERVICE_ID = "YOUR_EMAILJS_SERVICE_ID";
  try {
    await emailjs.send(SERVICE_ID, templateId, templateParams);
  } catch (error) {
    console.error("Failed to send automated email:", error);
  }
}

// ==========================================================================
// 2. MAIN APPLICATION LOGIC
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // UI Containers & Artwork
  const bgArt = document.getElementById("bgArt");
  const authCard = document.getElementById("authCard");
  const profileCard = document.getElementById("profileCard");

  // Auth Toggle Buttons
  const switchToSignupBtn = document.getElementById("switchToSignupBtn");
  const switchToLoginBtn = document.getElementById("switchToLoginBtn");

  // Form Submit Buttons
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");
  const signupSubmitBtn = document.getElementById("signupSubmitBtn");

  // Social Auth Buttons
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const googleSignupBtn = document.getElementById("googleSignupBtn");
  const appleLoginBtn = document.getElementById("appleLoginBtn");
  const appleSignupBtn = document.getElementById("appleSignupBtn");

  // Forgot Password Elements
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotModal = document.getElementById("forgotModal");
  const closeForgotModal = document.getElementById("closeForgotModal");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetSubmitBtn = document.getElementById("resetSubmitBtn");

  // Forms
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const profileDetailsForm = document.getElementById("profileDetailsForm");

  // Password Inputs
  const signupPassword = document.getElementById("signupPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const passwordMatchError = document.getElementById("passwordMatchError");

  // Profile Elements
  const profileBackBtn = document.getElementById("profileBackBtn");
  const userAvatar = document.getElementById("userAvatar");
  const profileFullName = document.getElementById("profileFullName");
  const profileEmail = document.getElementById("profileEmail");
  const profileFirstName = document.getElementById("profileFirstName");
  const profileLastName = document.getElementById("profileLastName");
  const profilePhone = document.getElementById("profilePhone");
  const profileAddress = document.getElementById("profileAddress");
  const profileDob = document.getElementById("profileDob");
  const profileGender = document.getElementById("profileGender");

  // Profile Actions
  const editToggleBtn = document.getElementById("editToggleBtn");
  const editActions = document.getElementById("editActions");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");

  let currentUserData = null;

  /* ------------------------------------------------------------------------
     A. LOGIN / SIGNUP VIEW SWITCHING
     ------------------------------------------------------------------------ */
  if (switchToSignupBtn) {
    switchToSignupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (authCard) authCard.classList.add("signup-mode");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (switchToLoginBtn) {
    switchToLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (authCard) authCard.classList.remove("signup-mode");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------------
     B. PROFILE BACK BUTTON NAVIGATION HANDLER
     ------------------------------------------------------------------------ */
  if (profileBackBtn) {
    profileBackBtn.addEventListener("click", (e) => {
      e.preventDefault();

      if (document.referrer && document.referrer !== window.location.href) {
        window.location.href = document.referrer;
      } 
      else if (window.history.length > 1) {
        window.history.back();
      } 
      else {
        switchToAuthView();
      }
    });
  }

  /* ------------------------------------------------------------------------
     C. FORGOT PASSWORD MODAL & RESET HANDLER
     ------------------------------------------------------------------------ */
  if (forgotPasswordLink && forgotModal) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      forgotModal.classList.remove("hidden");
    });
  }

  if (closeForgotModal && forgotModal) {
    closeForgotModal.addEventListener("click", () => {
      forgotModal.classList.add("hidden");
    });
  }

  if (forgotModal) {
    forgotModal.addEventListener("click", (e) => {
      if (e.target === forgotModal) {
        forgotModal.classList.add("hidden");
      }
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const resetEmailInput = document.getElementById("resetEmail");
      const resetEmail = resetEmailInput ? resetEmailInput.value.trim().toLowerCase() : "";

      if (!resetEmail) {
        alert("Please enter your registered email address.");
        return;
      }

      if (resetSubmitBtn) {
        resetSubmitBtn.disabled = true;
        const btnText = resetSubmitBtn.querySelector("span");
        if (btnText) btnText.textContent = "Sending...";
      }

      try {
        await auth.sendPasswordResetEmail(resetEmail);
        alert("Password reset email sent! Please check your email inbox for the link.");
        forgotModal.classList.add("hidden");
        forgotPasswordForm.reset();
      } catch (error) {
        alert("Reset Error: " + error.message);
      } finally {
        if (resetSubmitBtn) {
          resetSubmitBtn.disabled = false;
          const btnText = resetSubmitBtn.querySelector("span");
          if (btnText) btnText.textContent = "Send Reset Link";
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     D. FIREBASE AUTH STATE OBSERVER (ऑटोमैटिक कुकी & रीडायरेक्ट चेक)
     ------------------------------------------------------------------------ */
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const userDocRef = db.collection("users").doc(user.uid);
        const doc = await userDocRef.get();

        if (doc.exists) {
          currentUserData = doc.data();
        } else {
          currentUserData = await handleNewSocialUserProfile(user);
        }

        // कुकी सेट करें और चेक करें कि क्या रीडायरेक्ट करना है
        const isRedirected = onLoginSuccess(user, currentUserData);

        // अगर रीडायरेक्ट URL नहीं है, तो लोकल प्रोफाइल कार्ड दिखाएं
        if (!isRedirected) {
          populateProfileFields(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        console.error("Error fetching user data from Firestore:", error);
      }
    } else {
      currentUserData = null;
      switchToAuthView();
    }
  });

  /* ------------------------------------------------------------------------
     E. SOCIAL LOGINS (GOOGLE & APPLE)
     ------------------------------------------------------------------------ */
  async function handleNewSocialUserProfile(user) {
    const nameParts = (user.displayName || "").split(" ");
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "";

    const userData = {
      uid: user.uid,
      firstName: firstName,
      lastName: lastName,
      email: user.email || "",
      phone: user.phoneNumber || "",
      address: "",
      dob: "",
      gender: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("users").doc(user.uid).set(userData);
    return userData;
  }

  async function handleGoogleAuth() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        auth.signInWithRedirect(provider);
      } else {
        alert("Google Auth Error: " + error.message);
      }
    }
  }

  async function handleAppleAuth() {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        auth.signInWithRedirect(provider);
      } else {
        alert("Apple Auth Error: " + error.message);
      }
    }
  }

  if (googleLoginBtn) googleLoginBtn.addEventListener("click", handleGoogleAuth);
  if (googleSignupBtn) googleSignupBtn.addEventListener("click", handleGoogleAuth);
  if (appleLoginBtn) appleLoginBtn.addEventListener("click", handleAppleAuth);
  if (appleSignupBtn) appleSignupBtn.addEventListener("click", handleAppleAuth);

  /* ------------------------------------------------------------------------
     F. LIVE PASSWORD MATCH VALIDATION
     ------------------------------------------------------------------------ */
  function validatePasswords() {
    if (!signupPassword || !confirmPassword || !passwordMatchError) return true;

    if (confirmPassword.value && signupPassword.value !== confirmPassword.value) {
      passwordMatchError.style.display = "block";
      return false;
    } else {
      passwordMatchError.style.display = "none";
      return true;
    }
  }

  if (confirmPassword && signupPassword) {
    confirmPassword.addEventListener("input", validatePasswords);
    signupPassword.addEventListener("input", validatePasswords);
  }

  /* ------------------------------------------------------------------------
     G. USER REGISTRATION HANDLER
     ------------------------------------------------------------------------ */
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!validatePasswords()) {
        alert("Please make sure your passwords match.");
        return;
      }

      const firstName = document.getElementById("firstName") ? document.getElementById("firstName").value.trim() : "";
      const lastName = document.getElementById("lastName") ? document.getElementById("lastName").value.trim() : "";
      const email = document.getElementById("signupEmail") ? document.getElementById("signupEmail").value.trim().toLowerCase() : "";
      const phone = document.getElementById("signupPhone") ? document.getElementById("signupPhone").value.trim() : "";
      const password = signupPassword ? signupPassword.value : "";

      if (!firstName || !lastName || !email || !phone || !password) {
        alert("Please fill out all required registration fields.");
        return;
      }

      if (signupSubmitBtn) {
        signupSubmitBtn.disabled = true;
        const btnText = signupSubmitBtn.querySelector("span");
        if (btnText) btnText.textContent = "Registering...";
      }

      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.sendEmailVerification();

        const userData = {
          uid: user.uid,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          address: "",
          dob: "",
          gender: "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("users").doc(user.uid).set(userData);
        currentUserData = userData;

        alert("LUROVA Account created successfully!");

        // कुकी सेट करें और सब-डोमेन रीडायरेक्ट लागू करें
        const isRedirected = onLoginSuccess(user, currentUserData);
        if (!isRedirected) {
          populateProfileFields(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        alert("Registration Error: " + error.message);
      } finally {
        if (signupSubmitBtn) {
          signupSubmitBtn.disabled = false;
          const btnText = signupSubmitBtn.querySelector("span");
          if (btnText) btnText.textContent = "Register";
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     H. USER LOGIN HANDLER
     ------------------------------------------------------------------------ */
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const identifierInput = document.getElementById("loginIdentifier");
      const passwordInput = document.getElementById("loginPassword");

      const identifier = identifierInput ? identifierInput.value.trim().toLowerCase() : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!identifier || !password) {
        alert("Please enter both your Email/Phone and Password.");
        return;
      }

      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        const btnText = loginSubmitBtn.querySelector("span");
        if (btnText) btnText.textContent = "Logging in...";
      }

      try {
        let targetEmail = identifier;

        if (!identifier.includes("@")) {
          const querySnapshot = await db.collection("users").where("phone", "==", identifier).get();
          if (!querySnapshot.empty) {
            targetEmail = querySnapshot.docs[0].data().email;
          } else {
            alert("No registered user found with this phone number.");
            if (loginSubmitBtn) {
              loginSubmitBtn.disabled = false;
              const btnText = loginSubmitBtn.querySelector("span");
              if (btnText) btnText.textContent = "Login";
            }
            return;
          }
        }

        const userCredential = await auth.signInWithEmailAndPassword(targetEmail, password);
        const user = userCredential.user;

        if (user) {
          const doc = await db.collection("users").doc(user.uid).get();
          if (doc.exists) {
            currentUserData = doc.data();
          }

          // कुकी सेट करें और सब-डोमेन रीडायरेक्ट लागू करें
          const isRedirected = onLoginSuccess(user, currentUserData);

          if (!isRedirected) {
            populateProfileFields(currentUserData);
            switchToProfileView();
          }
        }
      } catch (error) {
        alert("Login Error: " + error.message);
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          const btnText = loginSubmitBtn.querySelector("span");
          if (btnText) btnText.textContent = "Login";
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     I. POPULATE & RENDER PROFILE FIELDS
     ------------------------------------------------------------------------ */
  function populateProfileFields(data) {
    if (!data) return;

    if (userAvatar) {
      userAvatar.textContent = data.firstName ? data.firstName.charAt(0).toUpperCase() : "L";
    }

    if (profileFullName) {
      const full = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      profileFullName.textContent = full || "LUROVA User";
    }

    if (profileEmail) {
      profileEmail.textContent = data.email || "";
    }

    if (profileFirstName) profileFirstName.value = data.firstName || "";
    if (profileLastName) profileLastName.value = data.lastName || "";
    if (profilePhone) profilePhone.value = data.phone || "";
    if (profileAddress) profileAddress.value = data.address || "";
    if (profileDob) profileDob.value = data.dob || "";
    if (profileGender) profileGender.value = data.gender || "";
  }

  function switchToProfileView() {
    if (authCard) authCard.classList.add("hidden");
    if (profileCard) profileCard.classList.remove("hidden");
    if (bgArt) bgArt.classList.add("fade-out");
    document.body.classList.add("profile-view-active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function switchToAuthView() {
    if (profileCard) profileCard.classList.add("hidden");
    if (authCard) authCard.classList.remove("hidden");
    if (bgArt) bgArt.classList.remove("fade-out");
    document.body.classList.remove("profile-view-active");

    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------------------
     J. EDIT, SAVE, & CANCEL PROFILE DETAILS
     ------------------------------------------------------------------------ */
  if (editToggleBtn) {
    editToggleBtn.addEventListener("click", () => {
      if (profileFirstName) profileFirstName.disabled = false;
      if (profileLastName) profileLastName.disabled = false;
      if (profilePhone) profilePhone.disabled = false;
      if (profileAddress) profileAddress.disabled = false;
      if (profileDob) profileDob.disabled = false;
      if (profileGender) profileGender.disabled = false;

      if (editActions) editActions.classList.remove("hidden");
      editToggleBtn.style.display = "none";
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      populateProfileFields(currentUserData);
      disableEditMode();
    });
  }

  if (profileDetailsForm) {
    profileDetailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const updatedFields = {
        firstName: profileFirstName ? profileFirstName.value.trim() : "",
        lastName: profileLastName ? profileLastName.value.trim() : "",
        phone: profilePhone ? profilePhone.value.trim() : "",
        address: profileAddress ? profileAddress.value.trim() : "",
        dob: profileDob ? profileDob.value : "",
        gender: profileGender ? profileGender.value : ""
      };

      try {
        await db.collection("users").doc(user.uid).update(updatedFields);
        currentUserData = { ...currentUserData, ...updatedFields };
        populateProfileFields(currentUserData);
        disableEditMode();
        alert("Profile details updated successfully!");
      } catch (error) {
        alert("Update Error: " + error.message);
      }
    });
  }

  function disableEditMode() {
    if (profileFirstName) profileFirstName.disabled = true;
    if (profileLastName) profileLastName.disabled = true;
    if (profilePhone) profilePhone.disabled = true;
    if (profileAddress) profileAddress.disabled = true;
    if (profileDob) profileDob.disabled = true;
    if (profileGender) profileGender.disabled = true;

    if (editActions) editActions.classList.add("hidden");
    if (editToggleBtn) editToggleBtn.style.display = "inline-block";
  }

  /* ------------------------------------------------------------------------
     K. LOGOUT & DELETE ACCOUNT
     ------------------------------------------------------------------------ */
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        // Shared domain cookie को भी डिलीट करें
        document.cookie = "lurova_user=; domain=.lurova.life; path=/; max-age=0;";
        await auth.signOut();
        disableEditMode();
      } catch (error) {
        alert("Logout Error: " + error.message);
      }
    });
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) return;

      if (confirm("Are you sure you want to delete your LUROVA Account? This action cannot be undone.")) {
        try {
          document.cookie = "lurova_user=; domain=.lurova.life; path=/; max-age=0;";
          await db.collection("users").doc(user.uid).delete();
          await user.delete();
          alert("Your LUROVA Account has been permanently deleted.");
        } catch (error) {
          alert("Delete Error: " + error.message);
        }
      }
    });
  }
});
