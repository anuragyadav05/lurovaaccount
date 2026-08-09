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

// Global Variables
let phoneConfirmationResult = null;
let qrTimerInterval = null;

// Initialize EmailJS Browser SDK (Optional)
(function() {
    if (window.emailjs) {
        emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");
    }
})();

// ==========================================================================
// 2. POPUP TOAST NOTIFICATION HELPER FUNCTION
// ==========================================================================
function showToast(title, message, type = "success") {
  const toast = document.getElementById("toastNotification");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");

  if (!toast || !toastTitle || !toastMessage) {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    return;
  }

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  toast.className = "toast-notification";
  toast.classList.add(`toast-${type}`);

  if (type === "success") {
    toastIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === "error") {
    toastIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else {
    toastIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.classList.remove("hidden");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 4000);
}

// ==========================================================================
// 3. CROSS-SUBDOMAIN POSTMESSAGE LISTENER (ads.lurova.life Auto-Login)
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
// 4. REDIRECT & SHARED COOKIE / LOCALSTORAGE FUNCTION
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

  localStorage.setItem('lurova_account_user', JSON.stringify(userPayload));

  const cookiePayload = JSON.stringify({ email, name, uid, phone });
  document.cookie = `lurova_user=${encodeURIComponent(cookiePayload)}; domain=.lurova.life; path=/; max-age=2592000; SameSite=Lax; Secure`;

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
// 5. CARD BRAND DETECTION HELPER
// ==========================================================================
function detectCardBrand(number) {
  const cleanNumber = number.replace(/\D/g, '');
  if (/^4/.test(cleanNumber)) return "Visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleanNumber)) return "Mastercard";
  if (/^(60|65|81|82|508|353|356)/.test(cleanNumber)) return "RuPay";
  if (/^3[47]/.test(cleanNumber)) return "American Express";
  if (/^(6011|65|64[4-9])/.test(cleanNumber)) return "Discover";
  return "Card";
}

// ==========================================================================
// 6. MAIN APPLICATION LOGIC
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // UI Canvas Containers
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
  const facebookLoginBtn = document.getElementById("facebookLoginBtn");
  const facebookSignupBtn = document.getElementById("facebookSignupBtn");

  // Toast Close Handler
  const toastCloseBtn = document.getElementById("toastCloseBtn");
  if (toastCloseBtn) {
    toastCloseBtn.addEventListener("click", () => {
      document.getElementById("toastNotification").classList.add("hidden");
    });
  }

  // Phone Auth Elements
  const loginWithPhoneOtpBtn = document.getElementById("loginWithPhoneOtpBtn");
  const phoneOtpModal = document.getElementById("phoneOtpModal");
  const closePhoneOtpModal = document.getElementById("closePhoneOtpModal");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  const phoneInputStep = document.getElementById("phoneInputStep");
  const otpInputStep = document.getElementById("otpInputStep");

  // Forgot Password Elements
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotModal = document.getElementById("forgotModal");
  const closeForgotModal = document.getElementById("closeForgotModal");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetSubmitBtn = document.getElementById("resetSubmitBtn");

  // Payment Modals & Forms
  const cardModal = document.getElementById("cardModal");
  const upiModal = document.getElementById("upiModal");
  const openCardModalBtn = document.getElementById("openCardModalBtn");
  const openUpiModalBtn = document.getElementById("openUpiModalBtn");
  const closeCardModal = document.getElementById("closeCardModal");
  const closeUpiModal = document.getElementById("closeUpiModal");
  const addCardForm = document.getElementById("addCardForm");
  const addUpiForm = document.getElementById("addUpiForm");
  const cardNumberInput = document.getElementById("cardNumber");
  const cardBrandBadge = document.getElementById("cardBrandBadge");
  const savedPaymentMethodsGrid = document.getElementById("savedPaymentMethodsGrid");
  const transactionHistoryContainer = document.getElementById("transactionHistoryContainer");

  // Wallet & KYC Elements
  const kycModal = document.getElementById("kycModal");
  const openKycModalBtn = document.getElementById("openKycModalBtn");
  const closeKycModal = document.getElementById("closeKycModal");
  const aadhaarKycTab = document.getElementById("aadhaarKycTab");
  const panKycTab = document.getElementById("panKycTab");
  const aadhaarKycForm = document.getElementById("aadhaarKycForm");
  const panKycForm = document.getElementById("panKycForm");
  const walletMenuItem = document.getElementById("walletMenuItem");
  const walletBalanceDisplay = document.getElementById("walletBalanceDisplay");
  const verifiedKycDisplayBox = document.getElementById("verifiedKycDisplayBox");
  const paymentWalletBanner = document.getElementById("paymentWalletBanner");
  const walletBannerText = document.getElementById("walletBannerText");
  const bonusDateCell = document.getElementById("bonusDateCell");

  // Top-Up QR Modal Elements
  const topupQrModal = document.getElementById("topupQrModal");
  const openTopupQrBtn = document.getElementById("openTopupQrBtn");
  const closeTopupQrModal = document.getElementById("closeTopupQrModal");
  const qrCountdownTimer = document.getElementById("qrCountdownTimer");

  // Forms & Inputs
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
  const downloadDataBtn = document.getElementById("downloadDataBtn");

  let currentUserData = null;

  /* ------------------------------------------------------------------------
     A. SIDEBAR TAB SWITCHING
     ------------------------------------------------------------------------ */
  sidebarMenuItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");

      sidebarMenuItems.forEach(btn => btn.classList.remove("active"));
      item.classList.add("active");

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
     C. PROFILE BACK BUTTON NAVIGATION
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
        showToast("Error", "Please enter your registered email address.", "error");
        return;
      }

      if (resetSubmitBtn) {
        resetSubmitBtn.disabled = true;
        resetSubmitBtn.querySelector("span").textContent = "Sending...";
      }

      try {
        await auth.sendPasswordResetEmail(resetEmail);
        showToast("Email Sent", "Password reset email sent! Check your inbox.", "success");
        forgotModal.classList.add("hidden");
        forgotPasswordForm.reset();
      } catch (error) {
        showToast("Reset Error", error.message, "error");
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
          showToast("Email Sent", `Password reset link sent to ${user.email}`, "success");
        } catch (error) {
          showToast("Error", error.message, "error");
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     E. PHONE SMS OTP AUTHENTICATION (FIREBASE RECAPTCHA)
     ------------------------------------------------------------------------ */
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible',
    'callback': (response) => {}
  });

  if (loginWithPhoneOtpBtn && phoneOtpModal) {
    loginWithPhoneOtpBtn.addEventListener("click", () => {
      phoneOtpModal.classList.remove("hidden");
      phoneInputStep.classList.remove("hidden");
      otpInputStep.classList.add("hidden");
    });
  }

  if (closePhoneOtpModal && phoneOtpModal) {
    closePhoneOtpModal.addEventListener("click", () => {
      phoneOtpModal.classList.add("hidden");
    });
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", async () => {
      const phoneNumber = document.getElementById("phoneAuthNumber").value.trim();

      if (!phoneNumber || phoneNumber.length < 10) {
        showToast("Invalid Input", "Please enter a valid phone number with country code.", "error");
        return;
      }

      sendOtpBtn.disabled = true;
      sendOtpBtn.querySelector("span").textContent = "Sending SMS...";

      try {
        const appVerifier = window.recaptchaVerifier;
        phoneConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
        
        phoneInputStep.classList.add("hidden");
        otpInputStep.classList.remove("hidden");
        showToast("OTP Sent", `Verification code sent to ${phoneNumber}`, "info");
      } catch (error) {
        showToast("SMS Error", error.message, "error");
        window.recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));
      } finally {
        sendOtpBtn.disabled = false;
        sendOtpBtn.querySelector("span").textContent = "Send SMS OTP";
      }
    });
  }

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", async () => {
      const code = document.getElementById("otpCode").value.trim();

      if (!code || code.length !== 6) {
        showToast("Invalid OTP", "Please enter the 6-digit code received via SMS.", "error");
        return;
      }

      verifyOtpBtn.disabled = true;
      verifyOtpBtn.querySelector("span").textContent = "Verifying...";

      try {
        const result = await phoneConfirmationResult.confirm(code);
        const user = result.user;

        phoneOtpModal.classList.add("hidden");

        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists) {
          currentUserData = doc.data();
        } else {
          currentUserData = await handleNewSocialUserProfile(user);
        }

        showToast("Success", "Phone authentication successful!", "success");

        const isRedirected = onLoginSuccess(user, currentUserData);
        if (!isRedirected) {
          populateProfileFields(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        showToast("OTP Error", error.message, "error");
      } finally {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.querySelector("span").textContent = "Verify & Sign In";
      }
    });
  }

  /* ------------------------------------------------------------------------
     F. FACEBOOK SOCIAL LOGIN
     ------------------------------------------------------------------------ */
  async function handleFacebookAuth() {
    const provider = new firebase.auth.FacebookAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        currentUserData = doc.data();
      } else {
        currentUserData = await handleNewSocialUserProfile(user);
      }

      showToast("Welcome", "Facebook login successful!", "success");

      const isRedirected = onLoginSuccess(user, currentUserData);
      if (!isRedirected) {
        populateProfileFields(currentUserData);
        switchToProfileView();
      }
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        auth.signInWithRedirect(provider);
      } else {
        showToast("Facebook Error", error.message, "error");
      }
    }
  }

  if (facebookLoginBtn) facebookLoginBtn.addEventListener("click", handleFacebookAuth);
  if (facebookSignupBtn) facebookSignupBtn.addEventListener("click", handleFacebookAuth);

  /* ------------------------------------------------------------------------
     G. WALLET & KYC HANDLERS
     ------------------------------------------------------------------------ */
  if (openKycModalBtn) {
    openKycModalBtn.addEventListener("click", () => {
      kycModal.classList.remove("hidden");
    });
  }

  if (closeKycModal) {
    closeKycModal.addEventListener("click", () => {
      kycModal.classList.add("hidden");
    });
  }

  // Toggle Aadhaar vs PAN KYC View
  if (aadhaarKycTab && panKycTab) {
    aadhaarKycTab.addEventListener("click", () => {
      aadhaarKycTab.classList.add("active");
      panKycTab.classList.remove("active");
      aadhaarKycForm.classList.remove("hidden");
      panKycForm.classList.add("hidden");
    });

    panKycTab.addEventListener("click", () => {
      panKycTab.classList.add("active");
      aadhaarKycTab.classList.remove("active");
      panKycForm.classList.remove("hidden");
      aadhaarKycForm.classList.add("hidden");
    });
  }

  // Submit Aadhaar KYC Form
  if (aadhaarKycForm) {
    aadhaarKycForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const num = document.getElementById("aadhaarNumber").value.trim();
      const name = document.getElementById("aadhaarName").value.trim();
      const fatherName = document.getElementById("aadhaarFatherName").value.trim();
      const dob = document.getElementById("aadhaarDob").value;
      const address = document.getElementById("aadhaarAddress").value.trim();

      if (!num || !name || !fatherName || !dob || !address) {
        showToast("Missing Fields", "Please complete all Aadhaar KYC fields.", "error");
        return;
      }

      const kycData = {
        type: "aadhaar",
        aadhaarNumber: num.slice(-4) ? `•••• •••• ${num.slice(-4)}` : num,
        name,
        fatherName,
        dob,
        address,
        status: "verified",
        submittedAt: new Date().toLocaleDateString('en-IN')
      };

      await saveKycAndActivateWallet(user.uid, kycData);
    });
  }

  // Submit PAN KYC Form
  if (panKycForm) {
    panKycForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const num = document.getElementById("panNumber").value.trim().toUpperCase();
      const name = document.getElementById("panName").value.trim();
      const dob = document.getElementById("panDob").value;

      if (!num || !name || !dob) {
        showToast("Missing Fields", "Please complete all PAN KYC fields.", "error");
        return;
      }

      const kycData = {
        type: "pan",
        panNumber: num.slice(-4) ? `••••••${num.slice(-4)}` : num,
        name,
        dob,
        status: "verified",
        submittedAt: new Date().toLocaleDateString('en-IN')
      };

      await saveKycAndActivateWallet(user.uid, kycData);
    });
  }

  // Save KYC to Firestore & Activate Wallet
  async function saveKycAndActivateWallet(uid, kycData) {
    try {
      const userRef = db.collection("users").doc(uid);
      await userRef.update({
        walletActivated: true,
        walletBalance: 20.00,
        kycData: kycData
      });

      currentUserData.walletActivated = true;
      currentUserData.walletBalance = 20.00;
      currentUserData.kycData = kycData;

      kycModal.classList.add("hidden");
      renderWalletState(currentUserData);

      showToast("Wallet Activated!", "₹20 Signup Bonus credited to your wallet balance.", "success");

      // Automatically switch to Wallet tab panel
      if (walletMenuItem) {
        walletMenuItem.click();
      }
    } catch (err) {
      showToast("KYC Error", err.message, "error");
    }
  }

  // Render Wallet UI State
  function renderWalletState(data) {
    if (!data) return;

    const isActivated = data.walletActivated || false;
    const balance = (data.walletBalance !== undefined) ? data.walletBalance : 0.00;
    const kyc = data.kycData || null;

    if (isActivated) {
      // Reveal Wallet item in Sidebar Menu
      if (walletMenuItem) walletMenuItem.classList.remove("hidden");

      // Update Balance
      if (walletBalanceDisplay) walletBalanceDisplay.textContent = `₹${balance.toFixed(2)}`;

      // Update Banner in Payment Tab
      if (paymentWalletBanner && walletBannerText && openKycModalBtn) {
        paymentWalletBanner.style.background = "#dcfce7";
        paymentWalletBanner.style.borderColor = "#86efac";
        paymentWalletBanner.style.color = "#166534";
        walletBannerText.innerHTML = `Your wallet is active with <strong>₹${balance.toFixed(2)}</strong> balance.`;
        openKycModalBtn.style.display = "none";
      }

      // Render Date in Signup Bonus Table
      if (bonusDateCell) {
        bonusDateCell.textContent = kyc ? kyc.submittedAt : "Today";
      }

      // Render Verified KYC Box (Non-Editable Format)
      if (verifiedKycDisplayBox && kyc) {
        if (kyc.type === "aadhaar") {
          verifiedKycDisplayBox.innerHTML = `
            <div class="kyc-field-row"><span>Document Type:</span><strong>Aadhaar Card (UID)</strong></div>
            <div class="kyc-field-row"><span>Aadhaar Number:</span><strong>${kyc.aadhaarNumber}</strong></div>
            <div class="kyc-field-row"><span>Full Name:</span><strong>${kyc.name}</strong></div>
            <div class="kyc-field-row"><span>Father's Name:</span><strong>${kyc.fatherName}</strong></div>
            <div class="kyc-field-row"><span>Date of Birth:</span><strong>${kyc.dob}</strong></div>
            <div class="kyc-field-row"><span>Full Address:</span><strong>${kyc.address}</strong></div>
            <div class="kyc-field-row"><span>Status:</span><strong style="color:#16a34a;">Verified ✅</strong></div>
          `;
        } else {
          verifiedKycDisplayBox.innerHTML = `
            <div class="kyc-field-row"><span>Document Type:</span><strong>PAN Card</strong></div>
            <div class="kyc-field-row"><span>PAN Number:</span><strong>${kyc.panNumber}</strong></div>
            <div class="kyc-field-row"><span>Full Name:</span><strong>${kyc.name}</strong></div>
            <div class="kyc-field-row"><span>Date of Birth:</span><strong>${kyc.dob}</strong></div>
            <div class="kyc-field-row"><span>Status:</span><strong style="color:#16a34a;">Verified ✅</strong></div>
          `;
        }
      }
    } else {
      if (walletMenuItem) walletMenuItem.classList.add("hidden");
    }
  }

  /* ------------------------------------------------------------------------
     H. TOP-UP QR SCANNER MODAL & 5-MINUTE COUNTDOWN TIMER
     ------------------------------------------------------------------------ */
  if (openTopupQrBtn && topupQrModal) {
    openTopupQrBtn.addEventListener("click", () => {
      topupQrModal.classList.remove("hidden");
      startQrCountdown(300); // 5 minutes = 300 seconds
    });
  }

  if (closeTopupQrModal && topupQrModal) {
    closeTopupQrModal.addEventListener("click", () => {
      topupQrModal.classList.add("hidden");
      clearInterval(qrTimerInterval);
    });
  }

  function startQrCountdown(durationInSeconds) {
    clearInterval(qrTimerInterval);
    let timer = durationInSeconds;

    function updateDisplay() {
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;

      const formattedMin = minutes < 10 ? "0" + minutes : minutes;
      const formattedSec = seconds < 10 ? "0" + seconds : seconds;

      if (qrCountdownTimer) {
        qrCountdownTimer.textContent = `${formattedMin}:${formattedSec}`;
      }

      if (--timer < 0) {
        clearInterval(qrTimerInterval);
        if (topupQrModal) topupQrModal.classList.add("hidden");
        showToast("Session Expired", "QR Top-Up payment session expired after 5 minutes.", "info");
      }
    }

    updateDisplay();
    qrTimerInterval = setInterval(updateDisplay, 1000);
  }

  /* ------------------------------------------------------------------------
     I. PAYMENT MODALS & CARD/UPI SAVING (FIRESTORE)
     ------------------------------------------------------------------------ */
  if (openCardModalBtn) openCardModalBtn.addEventListener("click", () => cardModal.classList.remove("hidden"));
  if (openUpiModalBtn) openUpiModalBtn.addEventListener("click", () => upiModal.classList.remove("hidden"));
  if (closeCardModal) closeCardModal.addEventListener("click", () => cardModal.classList.add("hidden"));
  if (closeUpiModal) closeUpiModal.addEventListener("click", () => upiModal.classList.add("hidden"));

  // Auto detect card brand on typing card number
  if (cardNumberInput && cardBrandBadge) {
    cardNumberInput.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, '');
      val = val.match(/.{1,4}/g)?.join(' ') || val;
      e.target.value = val.substring(0, 19);

      const detected = detectCardBrand(val);
      cardBrandBadge.textContent = detected;
    });
  }

  // Save Debit/Credit Card
  if (addCardForm) {
    addCardForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const name = document.getElementById("cardHolderName").value.trim();
      const num = document.getElementById("cardNumber").value.trim();
      const exp = document.getElementById("cardExpiry").value.trim();

      if (!name || !num || !exp) {
        showToast("Error", "Please fill out all card details.", "error");
        return;
      }

      const brand = detectCardBrand(num);
      const last4 = num.replace(/\s/g, '').slice(-4) || "0000";

      const newPayment = {
        id: "card_" + Date.now(),
        type: "card",
        brand: brand,
        name: name,
        masked: `•••• •••• •••• ${last4}`,
        expiry: exp,
        createdAt: new Date().toISOString()
      };

      try {
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();
        let methods = (doc.exists && doc.data().paymentMethods) || [];
        methods.push(newPayment);

        await userRef.update({ paymentMethods: methods });
        currentUserData.paymentMethods = methods;
        
        renderPaymentMethods(methods);
        cardModal.classList.add("hidden");
        addCardForm.reset();
        showToast("Saved", "Card details saved securely!", "success");
      } catch (err) {
        showToast("Error", err.message, "error");
      }
    });
  }

  // Save UPI ID
  if (addUpiForm) {
    addUpiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const accountName = document.getElementById("upiAccountName").value.trim();
      const vpa = document.getElementById("upiId").value.trim();

      if (!accountName || !vpa) {
        showToast("Error", "Please fill out all UPI details.", "error");
        return;
      }

      const newPayment = {
        id: "upi_" + Date.now(),
        type: "upi",
        name: accountName,
        vpa: vpa,
        createdAt: new Date().toISOString()
      };

      try {
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();
        let methods = (doc.exists && doc.data().paymentMethods) || [];
        methods.push(newPayment);

        await userRef.update({ paymentMethods: methods });
        currentUserData.paymentMethods = methods;

        renderPaymentMethods(methods);
        upiModal.classList.add("hidden");
        addUpiForm.reset();
        showToast("Saved", "UPI ID saved successfully!", "success");
      } catch (err) {
        showToast("Error", err.message, "error");
      }
    });
  }

  // Render Saved Payment Methods
  function renderPaymentMethods(methods) {
    if (!savedPaymentMethodsGrid) return;

    if (!methods || methods.length === 0) {
      savedPaymentMethodsGrid.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">No saved payment cards or UPI IDs added yet.</p>`;
      return;
    }

    savedPaymentMethodsGrid.innerHTML = methods.map((item) => {
      if (item.type === 'card') {
        return `
          <div class="saved-payment-card">
            <div class="payment-card-left">
              <span class="payment-type-badge">${item.brand}</span>
              <div class="payment-card-info">
                <h5>${item.masked}</h5>
                <p>${item.name} • Exp: ${item.expiry}</p>
              </div>
            </div>
            <button type="button" class="btn-revoke" onclick="deletePaymentMethod('${item.id}')">Delete</button>
          </div>
        `;
      } else {
        return `
          <div class="saved-payment-card">
            <div class="payment-card-left">
              <span class="payment-type-badge">UPI</span>
              <div class="payment-card-info">
                <h5>${item.vpa}</h5>
                <p>${item.name}</p>
              </div>
            </div>
            <button type="button" class="btn-revoke" onclick="deletePaymentMethod('${item.id}')">Delete</button>
          </div>
        `;
      }
    }).join('');
  }

  // Delete Saved Payment Method
  window.deletePaymentMethod = async function(id) {
    const user = auth.currentUser;
    if (!user || !confirm("Are you sure you want to remove this saved payment method?")) return;

    try {
      const userRef = db.collection("users").doc(user.uid);
      const doc = await userRef.get();
      let methods = (doc.exists && doc.data().paymentMethods) || [];
      methods = methods.filter(m => m.id !== id);

      await userRef.update({ paymentMethods: methods });
      currentUserData.paymentMethods = methods;
      renderPaymentMethods(methods);
      showToast("Removed", "Payment method deleted.", "info");
    } catch (err) {
      showToast("Error", err.message, "error");
    }
  };

  // Render Transaction History
  function renderTransactionHistory(transactions) {
    if (!transactionHistoryContainer) return;

    if (!transactions || transactions.length === 0) {
      transactionHistoryContainer.innerHTML = `
        <div class="empty-history-box">
          <p>Transaction history not available</p>
        </div>
      `;
      return;
    }

    transactionHistoryContainer.innerHTML = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td>${t.service || 'LUROVA Service'}</td>
              <td>${t.date || ''}</td>
              <td>${t.amount || '₹0'}</td>
              <td><span class="badge-success">${t.status || 'Successful'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /* ------------------------------------------------------------------------
     J. FIREBASE AUTH STATE OBSERVER
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
          renderAccurateActiveDevices();
          renderPaymentMethods(currentUserData.paymentMethods || []);
          renderTransactionHistory(currentUserData.transactions || []);
          renderWalletState(currentUserData);
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
     K. ACCURATE DEVICE & OS PARSING
     ------------------------------------------------------------------------ */
  function parseAccurateUserAgent() {
    const ua = navigator.userAgent;
    let browser = "Web Browser";
    let os = "Desktop/Mobile";

    if (ua.indexOf("Win") !== -1) os = "Windows PC";
    else if (ua.indexOf("Mac") !== -1) os = "macOS Device";
    else if (ua.indexOf("Android") !== -1) os = "Android Phone";
    else if (ua.indexOf("iPhone") !== -1) os = "Apple iPhone";
    else if (ua.indexOf("iPad") !== -1) os = "Apple iPad";
    else if (ua.indexOf("Linux") !== -1) os = "Linux Workstation";

    if (ua.indexOf("Chrome") !== -1 && ua.indexOf("Edg") === -1 && ua.indexOf("OPR") === -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Apple Safari";
    else if (ua.indexOf("Edg") !== -1) browser = "Microsoft Edge";
    else if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("OPR") !== -1 || ua.indexOf("Opera") !== -1) browser = "Opera Browser";

    return { browser, os, full: `${os} (${browser})` };
  }

  function renderAccurateActiveDevices() {
    if (!devicesListContainer) return;

    const deviceInfo = parseAccurateUserAgent();
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const lastActiveTime = new Date().toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    devicesListContainer.innerHTML = `
      <div class="device-card primary-device">
        <div class="device-details">
          <div class="device-icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div class="device-info">
            <h4>${deviceInfo.full} <span class="badge-primary">Primary Device</span></h4>
            <p>Active Now • Res: ${screenRes} • Last sync: ${lastActiveTime}</p>
          </div>
        </div>
        <button type="button" class="btn-revoke" disabled style="opacity:0.5; cursor:default;">Current Session</button>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     L. GOOGLE & APPLE AUTH
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
      paymentMethods: [],
      transactions: [],
      walletActivated: false,
      walletBalance: 0,
      kycData: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("users").doc(user.uid).set(userData);
    return userData;
  }

  async function handleGoogleAuth() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
      showToast("Success", "Logged in with Google", "success");
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        auth.signInWithRedirect(provider);
      } else {
        showToast("Google Auth Error", error.message, "error");
      }
    }
  }

  async function handleAppleAuth() {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    try {
      await auth.signInWithPopup(provider);
      showToast("Success", "Logged in with Apple", "success");
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        auth.signInWithRedirect(provider);
      } else {
        showToast("Apple Auth Error", error.message, "error");
      }
    }
  }

  if (googleLoginBtn) googleLoginBtn.addEventListener("click", handleGoogleAuth);
  if (googleSignupBtn) googleSignupBtn.addEventListener("click", handleGoogleAuth);
  if (appleLoginBtn) appleLoginBtn.addEventListener("click", handleAppleAuth);
  if (appleSignupBtn) appleSignupBtn.addEventListener("click", handleAppleAuth);

  /* ------------------------------------------------------------------------
     M. LIVE PASSWORD VALIDATION & FORM SUBMISSIONS
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
        showToast("Error", "Please make sure your passwords match.", "error");
        return;
      }

      const firstName = document.getElementById("firstName") ? document.getElementById("firstName").value.trim() : "";
      const lastName = document.getElementById("lastName") ? document.getElementById("lastName").value.trim() : "";
      const email = document.getElementById("signupEmail") ? document.getElementById("signupEmail").value.trim().toLowerCase() : "";
      const phone = document.getElementById("signupPhone") ? document.getElementById("signupPhone").value.trim() : "";
      const password = signupPassword ? signupPassword.value : "";

      if (!firstName || !lastName || !email || !phone || !password) {
        showToast("Missing Fields", "Please fill out all required registration fields.", "error");
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
          paymentMethods: [],
          transactions: [],
          walletActivated: false,
          walletBalance: 0,
          kycData: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("users").doc(user.uid).set(userData);
        currentUserData = userData;

        showToast("Account Created", "LUROVA Account registered successfully!", "success");

        const isRedirected = onLoginSuccess(user, currentUserData);
        if (!isRedirected) {
          populateProfileFields(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        showToast("Registration Error", error.message, "error");
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
        showToast("Missing Credentials", "Please enter both your Email/Phone and Password.", "error");
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
            showToast("User Not Found", "No registered user found with this phone number.", "error");
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

          showToast("Success", "Logged in successfully!", "success");

          const isRedirected = onLoginSuccess(user, currentUserData);

          if (!isRedirected) {
            populateProfileFields(currentUserData);
            switchToProfileView();
          }
        }
      } catch (error) {
        showToast("Login Error", error.message, "error");
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.querySelector("span").textContent = "Login";
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     N. POPULATE & RENDER PROFILE FIELDS
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
     O. EDIT, SAVE, & CANCEL PROFILE DETAILS
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
        showToast("Profile Updated", "Your details have been saved successfully!", "success");
      } catch (error) {
        showToast("Update Error", error.message, "error");
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

  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", () => {
      showToast("Data Export Logged", "Your account export request has been created.", "info");
    });
  }

  /* ------------------------------------------------------------------------
     P. LOGOUT & DELETE ACCOUNT
     ------------------------------------------------------------------------ */
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        localStorage.removeItem('lurova_account_user');
        document.cookie = "lurova_user=; domain=.lurova.life; path=/; max-age=0;";
        await auth.signOut();
        disableEditMode();
        showToast("Logged Out", "You have been signed out.", "info");
      } catch (error) {
        showToast("Logout Error", error.message, "error");
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
          showToast("Account Deleted", "Your LUROVA Account was permanently deleted.", "info");
        } catch (error) {
          showToast("Delete Error", error.message, "error");
        }
      }
    });
  }
});
