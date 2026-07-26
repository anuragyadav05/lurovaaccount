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
// 2. CROSS-SUBDOMAIN POSTMESSAGE LISTENER (auto-login check requests)
// ==========================================================================
window.addEventListener('message', (event) => {
  if (event.origin.includes('lurova.life') || event.origin.includes('localhost')) {
    if (event.data === 'CHECK_LUROVA_SESSION') {
      const savedUser = localStorage.getItem('lurova_account_user');
      if (savedUser) {
        event.source.postMessage({
          type: 'LUROVA_SESSION_RESPONSE',
          user: JSON.parse(savedUser)
        }, event.origin);
      } else {
        event.source.postMessage({
          type: 'LUROVA_SESSION_RESPONSE',
          user: null
        }, event.origin);
      }
    }
  }
});

// ==========================================================================
// 3. REDIRECT & SHARED COOKIE / LOCALSTORAGE FUNCTION
// ==========================================================================
function onLoginSuccess(user, userData) {
  const email = user.email || '';
  
  let name = "";
  if (userData && userData.firstName) {
    name = `${userData.firstName} ${userData.lastName || ''}`.trim();
  } else {
    name = user.displayName || (email ? email.split('@')[0] : 'User');
  }
  
  const uid = user.uid || '';
  const phone = (userData && userData.phone) || user.phoneNumber || '';

  const userPayload = { uid, email, displayName: name, phone };

  // Store in LocalStorage for cross-tab availability & postMessage checks
  localStorage.setItem('lurova_account_user', JSON.stringify(userPayload));

  // Set Root Domain Cookie (.lurova.life)
  const cookiePayload = JSON.stringify({ email, name, uid, phone });
  document.cookie = `lurova_user=${encodeURIComponent(cookiePayload)}; domain=.lurova.life; path=/; max-age=2592000; SameSite=Lax; Secure`;

  // Check for Redirect Parameters (redirect_to, redirect_url, redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const redirectToParam = urlParams.get('redirect_to');
  const redirectUrl = urlParams.get('redirect_url') || urlParams.get('redirect') || redirectToParam;

  if (redirectUrl) {
    try {
      const encodedUser = encodeURIComponent(JSON.stringify(userPayload));
      const finalUrl = new URL(redirectUrl);
      finalUrl.searchParams.set('user', encodedUser);
      finalUrl.searchParams.set('email', email);
      finalUrl.searchParams.set('name', name);
      finalUrl.searchParams.set('uid', uid);
      finalUrl.searchParams.set('safari_auth', 'true');
      
      window.location.replace(finalUrl.toString());
      return true;
    } catch (e) {
      console.error("Invalid Redirect URL:", e);
      const encodedUser = encodeURIComponent(JSON.stringify(userPayload));
      window.location.href = `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}user=${encodedUser}`;
      return true;
    }
  }

  return false;
}

// ==========================================================================
// 4. MAIN APPLICATION LOGIC
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // UI Containers
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
  const resetEmailDisplay = document.getElementById("resetEmailDisplay");

  // Dashboard Sidebar & Tabs
  const sidebarMenuItems = document.querySelectorAll(".menu-item");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // Profile Actions
  const editToggleBtn = document.getElementById("editToggleBtn");
  const editActions = document.getElementById("editActions");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const directResetEmailBtn = document.getElementById("directResetEmailBtn");
  const devicesListContainer = document.getElementById("devicesListContainer");
  const addCardBtn = document.getElementById("addCardBtn");
  const downloadDataBtn = document.getElementById("downloadDataBtn");

  let currentUserData = null;

  /* ------------------------------------------------------------------------
     A. SIDEBAR TAB SWITCHING
     ------------------------------------------------------------------------ */
  sidebarMenuItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");

      // Update Active Menu State
      sidebarMenuItems.forEach(btn => btn.classList.remove("active"));
      item.classList.add("active");

      // Switch Visible Panel
      tabPanels.forEach(panel => {
        if (panel.id === targetTab) {
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
        }
      });
    });
  });

  /* ------------------------------------------------------------------------
     B. LOGIN / SIGNUP VIEW SWITCHING
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
     C. PROFILE BACK BUTTON NAVIGATION HANDLER
     ------------------------------------------------------------------------ */
  if (profileBackBtn) {
    profileBackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.referrer && document.referrer !== window.location.href) {
        window.location.href = document.referrer;
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        switchToAuthView();
      }
    });
  }

  /* ------------------------------------------------------------------------
     D. FORGOT PASSWORD MODAL & RESET HANDLERS
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
      if (e.target === forgotModal) forgotModal.classList.add("hidden");
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
        resetSubmitBtn.querySelector("span").textContent = "Sending...";
      }

      try {
        await auth.sendPasswordResetEmail(resetEmail);
        alert("Password reset email sent! Please check your inbox for the reset link.");
        forgotModal.classList.add("hidden");
        forgotPasswordForm.reset();
      } catch (error) {
        alert("Reset Error: " + error.message);
      } finally {
        if (resetSubmitBtn) {
          resetSubmitBtn.disabled = false;
          resetSubmitBtn.querySelector("span").textContent = "Send Reset Link";
        }
      }
    });
  }

  if (directResetEmailBtn) {
    directResetEmailBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (user && user.email) {
        try {
          await auth.sendPasswordResetEmail(user.email);
          alert(`Password reset link sent to ${user.email}!`);
        } catch (error) {
          alert("Error: " + error.message);
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     E. FIREBASE AUTH STATE OBSERVER
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

        const isRedirected = onLoginSuccess(user, currentUserData);

        if (!isRedirected) {
          populateProfileFields(currentUserData);
          renderActiveDevices();
          switchToProfileView();
        }
      } catch (error) {
        console.error("Error fetching user data from Firestore:", error);
      }
    } else {
      currentUserData = null;
      localStorage.removeItem('lurova_account_user');
      switchToAuthView();
    }
  });

  /* ------------------------------------------------------------------------
     F. SOCIAL LOGINS (GOOGLE & APPLE)
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
     G. LIVE PASSWORD MATCH VALIDATION & FORM SUBMISSIONS
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
        signupSubmitBtn.querySelector("span").textContent = "Registering...";
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
          signupSubmitBtn.querySelector("span").textContent = "Register";
        }
      }
    });
  }

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
        loginSubmitBtn.querySelector("span").textContent = "Logging in...";
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
              loginSubmitBtn.querySelector("span").textContent = "Login";
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
          loginSubmitBtn.querySelector("span").textContent = "Login";
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     H. LOGIN DEVICES RENDERING (DETECT OPERATING SYSTEM & BROWSER)
     ------------------------------------------------------------------------ */
  function detectDeviceOS() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows PC";
    if (ua.indexOf("Mac") !== -1) return "macOS Device";
    if (ua.indexOf("Android") !== -1) return "Android Mobile";
    if (ua.indexOf("iPhone") !== -1 || ua.indexOf("iPad") !== -1) return "iOS Device (iPhone/iPad)";
    if (ua.indexOf("Linux") !== -1) return "Linux Workstation";
    return "Web Browser";
  }

  function renderActiveDevices() {
    if (!devicesListContainer) return;

    const currentOS = detectDeviceOS();
    const lastActiveTime = new Date().toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    devicesListContainer.innerHTML = `
      <div class="device-card primary-device">
        <div class="device-details">
          <div class="device-icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2"></rect>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div class="device-info">
            <h4>${currentOS} <span class="badge-primary">Primary Device</span></h4>
            <p>Active Now • Last use: ${lastActiveTime}</p>
          </div>
        </div>
        <button type="button" class="btn-revoke" disabled style="opacity:0.5; cursor:default;">Current</button>
      </div>

      <div class="device-card">
        <div class="device-details">
          <div class="device-icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
          </div>
          <div class="device-info">
            <h4>LUROVA Mobile App Session</h4>
            <p>Last active: 22 Jul 2026, 04:15 PM</p>
          </div>
        </div>
        <button type="button" class="btn-revoke" onclick="alert('Session revoked from device.')">Logout</button>
      </div>
    `;
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

    if (profileEmail) profileEmail.textContent = data.email || "";
    if (resetEmailDisplay) resetEmailDisplay.textContent = data.email || "";

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

        const refreshedUserPayload = {
          uid: user.uid,
          email: user.email,
          displayName: `${updatedFields.firstName} ${updatedFields.lastName}`.trim(),
          phone: updatedFields.phone
        };
        localStorage.setItem('lurova_account_user', JSON.stringify(refreshedUserPayload));

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

  if (addCardBtn) {
    addCardBtn.addEventListener("click", () => {
      alert("Payment gateway integration (Cards / UPI) will be activated for future purchases.");
    });
  }

  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", () => {
      alert("Your account data export request has been logged. An archive file will be prepared.");
    });
  }

  /* ------------------------------------------------------------------------
     K. LOGOUT & DELETE ACCOUNT
     ------------------------------------------------------------------------ */
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        localStorage.removeItem('lurova_account_user');
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
          localStorage.removeItem('lurova_account_user');
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
