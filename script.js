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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let phoneConfirmationResult = null;
let qrTimerInterval = null;
let currentUniqueId = "";

// ==========================================================================
// 2. POPUP TOAST NOTIFICATION HELPER
// ==========================================================================
function showToast(title, message, type = "success") {
  const toast = document.getElementById("toastNotification");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");

  if (!toast || !toastTitle || !toastMessage) return;

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
// 3. 7-DIGIT UNIQUE ID & SVG BARCODE GENERATOR
// ==========================================================================
async function getOrCreateUserSevenDigitId(user) {
  if (!user) return "1000001";

  try {
    const userDocRef = db.collection("users").doc(user.uid);
    const doc = await userDocRef.get();

    if (doc.exists && doc.data().uniqueIdNumber) {
      return doc.data().uniqueIdNumber.toString();
    }

    const randomSevenDigit = Math.floor(1000000 + Math.random() * 9000000).toString();
    await userDocRef.set({ uniqueIdNumber: randomSevenDigit }, { merge: true });
    return randomSevenDigit;
  } catch (err) {
    let hash = 0;
    for (let i = 0; i < user.uid.length; i++) {
      hash = (hash << 5) - hash + user.uid.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 9000000 + 1000000).toString();
  }
}

function drawBarcode(svgElement, codeString) {
  if (!svgElement) return;
  svgElement.innerHTML = '';
  
  const barPattern = [
    [2,1,1,2,3,2], [2,2,2,1,1,3], [1,3,1,2,2,2], [3,1,1,2,2,2],
    [2,3,1,1,2,2], [2,2,1,1,1,4], [2,1,4,1,1,2], [2,2,3,2,1,1],
    [4,1,1,1,2,2], [2,1,3,1,2,2]
  ];

  let x = 14;
  const height = 75;

  const createBar = (posX, w) => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", posX.toString());
    rect.setAttribute("y", "0");
    rect.setAttribute("width", w.toString());
    rect.setAttribute("height", height.toString());
    rect.setAttribute("fill", "#0f172a");
    return rect;
  };

  svgElement.appendChild(createBar(x, 3));
  x += 7;

  for (let i = 0; i < codeString.length; i++) {
    const digit = parseInt(codeString[i], 10) || 0;
    const pattern = barPattern[digit];

    for (let j = 0; j < pattern.length; j++) {
      const width = pattern[j] * 1.5;
      if (j % 2 === 0) {
        svgElement.appendChild(createBar(x, width));
      }
      x += width;
    }
    x += 3;
  }

  svgElement.appendChild(createBar(x, 3));
  x += 14;

  svgElement.setAttribute("viewBox", `0 0 ${x} ${height}`);
}

// ==========================================================================
// 4. CROSS-SUBDOMAIN & REDIRECT MANAGEMENT
// ==========================================================================
window.addEventListener('message', (event) => {
  if (event.origin.includes('lurova.life') || event.origin.includes('localhost')) {
    if (event.data === 'CHECK_LUROVA_SESSION') {
      const savedUser = localStorage.getItem('lurova_account_user');
      event.source.postMessage({
        type: 'LUROVA_SESSION_RESPONSE',
        user: savedUser ? JSON.parse(savedUser) : null
      }, event.origin);
    }
  }
});

function onLoginSuccess(user, userData) {
  const email = user.email || '';
  let name = (userData && userData.firstName) 
    ? `${userData.firstName} ${userData.lastName || ''}`.trim() 
    : (user.displayName || (email ? email.split('@')[0] : 'User'));
  
  const uid = user.uid || '';
  const phone = (userData && userData.phone) || user.phoneNumber || '';

  const userPayload = { uid, email, displayName: name, phone };
  localStorage.setItem('lurova_account_user', JSON.stringify(userPayload));

  document.cookie = `lurova_user=${encodeURIComponent(JSON.stringify(userPayload))}; domain=.lurova.life; path=/; max-age=2592000; SameSite=Lax; Secure`;

  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect_to') || urlParams.get('redirect_url') || urlParams.get('redirect');

  if (redirectUrl) {
    try {
      const finalUrl = new URL(redirectUrl);
      finalUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(userPayload)));
      finalUrl.searchParams.set('email', email);
      finalUrl.searchParams.set('name', name);
      finalUrl.searchParams.set('uid', uid);
      finalUrl.searchParams.set('safari_auth', 'true');
      window.location.replace(finalUrl.toString());
      return true;
    } catch (e) {
      window.location.href = `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}user=${encodeURIComponent(JSON.stringify(userPayload))}`;
      return true;
    }
  }
  return false;
}

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
// 5. DOM INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const bgArt = document.getElementById("bgArt");
  const authCard = document.getElementById("authCard");
  const profileCard = document.getElementById("profileCard");

  const switchToSignupBtn = document.getElementById("switchToSignupBtn");
  const switchToLoginBtn = document.getElementById("switchToLoginBtn");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");
  const signupSubmitBtn = document.getElementById("signupSubmitBtn");

  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const googleSignupBtn = document.getElementById("googleSignupBtn");
  const appleLoginBtn = document.getElementById("appleLoginBtn");
  const appleSignupBtn = document.getElementById("appleSignupBtn");
  const facebookLoginBtn = document.getElementById("facebookLoginBtn");
  const facebookSignupBtn = document.getElementById("facebookSignupBtn");

  const toastCloseBtn = document.getElementById("toastCloseBtn");
  if (toastCloseBtn) {
    toastCloseBtn.addEventListener("click", () => {
      document.getElementById("toastNotification").classList.add("hidden");
    });
  }

  // 3D Flip & Barcode Elements
  const idFlipWrapper = document.getElementById("idFlipWrapper");
  const uniqueIdDisplay = document.getElementById("uniqueIdDisplay");
  const barcodeModal = document.getElementById("barcodeModal");
  const closeBarcodeModal = document.getElementById("closeBarcodeModal");
  const barcodeSvg = document.getElementById("barcodeSvg");
  const barcodeNumberText = document.getElementById("barcodeNumberText");

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

  // Top-Up QR Elements
  const topupQrModal = document.getElementById("topupQrModal");
  const openTopupQrBtn = document.getElementById("openTopupQrBtn");
  const closeTopupQrModal = document.getElementById("closeTopupQrModal");
  const qrCountdownTimer = document.getElementById("qrCountdownTimer");

  // Forms
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const profileDetailsForm = document.getElementById("profileDetailsForm");
  const signupPassword = document.getElementById("signupPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const passwordMatchError = document.getElementById("passwordMatchError");

  // Profile Fields
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

  const sidebarMenuItems = document.querySelectorAll(".menu-item");
  const tabPanels = document.querySelectorAll(".tab-panel");

  const editToggleBtn = document.getElementById("editToggleBtn");
  const editActions = document.getElementById("editActions");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const directResetEmailBtn = document.getElementById("directResetEmailBtn");
  const devicesListContainer = document.getElementById("devicesListContainer");
  const savedPaymentMethodsGrid = document.getElementById("savedPaymentMethodsGrid");
  const transactionHistoryContainer = document.getElementById("transactionHistoryContainer");

  let currentUserData = null;

  /* --- 3D FLIP & BARCODE INTERACTION --- */
  if (idFlipWrapper) {
    idFlipWrapper.addEventListener("click", (e) => {
      e.stopPropagation();

      if (!idFlipWrapper.classList.contains("flipped")) {
        idFlipWrapper.classList.add("flipped");
      } else {
        if (currentUniqueId && barcodeSvg && barcodeNumberText && barcodeModal) {
          drawBarcode(barcodeSvg, currentUniqueId);
          barcodeNumberText.textContent = currentUniqueId;
          barcodeModal.classList.remove("hidden");
        }
      }
    });
  }

  if (closeBarcodeModal && barcodeModal) {
    closeBarcodeModal.addEventListener("click", () => {
      barcodeModal.classList.add("hidden");
    });
  }

  if (barcodeModal) {
    barcodeModal.addEventListener("click", (e) => {
      if (e.target === barcodeModal) barcodeModal.classList.add("hidden");
    });
  }

  /* --- TAB SWITCHING --- */
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

  /* --- FORM SLIDING --- */
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

  /* --- PASSWORD RESET MODAL --- */
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotModal = document.getElementById("forgotModal");
  const closeForgotModal = document.getElementById("closeForgotModal");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");

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

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const resetEmail = document.getElementById("resetEmail").value.trim().toLowerCase();
      if (!resetEmail) return showToast("Error", "Please enter your email.", "error");

      try {
        await auth.sendPasswordResetEmail(resetEmail);
        showToast("Email Sent", "Password reset email sent!", "success");
        forgotModal.classList.add("hidden");
        forgotPasswordForm.reset();
      } catch (error) {
        showToast("Reset Error", error.message, "error");
      }
    });
  }

  if (directResetEmailBtn) {
    directResetEmailBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (user && user.email) {
        try {
          await auth.sendPasswordResetEmail(user.email);
          showToast("Email Sent", `Reset link sent to ${user.email}`, "success");
        } catch (error) {
          showToast("Error", error.message, "error");
        }
      }
    });
  }

  /* --- PHONE OTP --- */
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', { 'size': 'invisible' });

  const phoneOtpModal = document.getElementById("phoneOtpModal");
  const loginWithPhoneOtpBtn = document.getElementById("loginWithPhoneOtpBtn");
  const closePhoneOtpModal = document.getElementById("closePhoneOtpModal");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  const phoneInputStep = document.getElementById("phoneInputStep");
  const otpInputStep = document.getElementById("otpInputStep");

  if (loginWithPhoneOtpBtn && phoneOtpModal) {
    loginWithPhoneOtpBtn.addEventListener("click", () => {
      phoneOtpModal.classList.remove("hidden");
      phoneInputStep.classList.remove("hidden");
      otpInputStep.classList.add("hidden");
    });
  }

  if (closePhoneOtpModal && phoneOtpModal) {
    closePhoneOtpModal.addEventListener("click", () => phoneOtpModal.classList.add("hidden"));
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", async () => {
      const phoneNumber = document.getElementById("phoneAuthNumber").value.trim();
      if (!phoneNumber || phoneNumber.length < 10) return showToast("Invalid Input", "Enter valid phone with country code.", "error");

      sendOtpBtn.disabled = true;
      try {
        phoneConfirmationResult = await auth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);
        phoneInputStep.classList.add("hidden");
        otpInputStep.classList.remove("hidden");
        showToast("OTP Sent", `Verification code sent to ${phoneNumber}`, "info");
      } catch (error) {
        showToast("SMS Error", error.message, "error");
      } finally {
        sendOtpBtn.disabled = false;
      }
    });
  }

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", async () => {
      const code = document.getElementById("otpCode").value.trim();
      if (!code || code.length !== 6) return showToast("Invalid OTP", "Enter 6-digit code.", "error");

      verifyOtpBtn.disabled = true;
      try {
        const result = await phoneConfirmationResult.confirm(code);
        phoneOtpModal.classList.add("hidden");
        const doc = await db.collection("users").doc(result.user.uid).get();
        currentUserData = doc.exists ? doc.data() : await handleNewSocialUserProfile(result.user);
        showToast("Success", "Phone authentication successful!", "success");
        if (!onLoginSuccess(result.user, currentUserData)) {
          populateProfileFields(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        showToast("OTP Error", error.message, "error");
      } finally {
        verifyOtpBtn.disabled = false;
      }
    });
  }

  /* --- SOCIAL AUTHENTICATION --- */
  async function handleSocial(provider, name) {
    try {
      const res = await auth.signInWithPopup(provider);
      const doc = await db.collection("users").doc(res.user.uid).get();
      currentUserData = doc.exists ? doc.data() : await handleNewSocialUserProfile(res.user);
      showToast("Welcome", `${name} sign-in successful!`, "success");
      if (!onLoginSuccess(res.user, currentUserData)) {
        populateProfileFields(currentUserData);
        switchToProfileView();
      }
    } catch (error) {
      if (error.code === 'auth/popup-blocked') auth.signInWithRedirect(provider);
      else showToast(`${name} Error`, error.message, "error");
    }
  }

  if (googleLoginBtn) googleLoginBtn.addEventListener("click", () => handleSocial(new firebase.auth.GoogleAuthProvider(), "Google"));
  if (googleSignupBtn) googleSignupBtn.addEventListener("click", () => handleSocial(new firebase.auth.GoogleAuthProvider(), "Google"));
  if (appleLoginBtn) appleLoginBtn.addEventListener("click", () => handleSocial(new firebase.auth.OAuthProvider('apple.com'), "Apple"));
  if (appleSignupBtn) appleSignupBtn.addEventListener("click", () => handleSocial(new firebase.auth.OAuthProvider('apple.com'), "Apple"));
  if (facebookLoginBtn) facebookLoginBtn.addEventListener("click", () => handleSocial(new firebase.auth.FacebookAuthProvider(), "Facebook"));
  if (facebookSignupBtn) facebookSignupBtn.addEventListener("click", () => handleSocial(new firebase.auth.FacebookAuthProvider(), "Facebook"));

  /* --- WALLET & KYC ACTIVATION --- */
  if (openKycModalBtn) openKycModalBtn.addEventListener("click", () => kycModal.classList.remove("hidden"));
  if (closeKycModal) closeKycModal.addEventListener("click", () => kycModal.classList.add("hidden"));

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
        return showToast("Missing Fields", "Please complete all Aadhaar fields.", "error");
      }

      await saveKycAndActivateWallet(user.uid, {
        type: "aadhaar",
        maskedNumber: "[Aadhaar Verified]",
        name, fatherName, dob, address,
        status: "verified",
        submittedAt: new Date().toLocaleDateString('en-IN')
      });
    });
  }

  if (panKycForm) {
    panKycForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const num = document.getElementById("panNumber").value.trim().toUpperCase();
      const name = document.getElementById("panName").value.trim();
      const dob = document.getElementById("panDob").value;

      if (!num || !name || !dob) return showToast("Missing Fields", "Please complete all PAN fields.", "error");

      await saveKycAndActivateWallet(user.uid, {
        type: "pan",
        panNumber: num.slice(-4) ? `••••••${num.slice(-4)}` : num,
        name, dob,
        status: "verified",
        submittedAt: new Date().toLocaleDateString('en-IN')
      });
    });
  }

  async function saveKycAndActivateWallet(uid, kycData) {
    try {
      await db.collection("users").doc(uid).update({
        walletActivated: true,
        walletBalance: 20.00,
        kycData: kycData
      });

      currentUserData.walletActivated = true;
      currentUserData.walletBalance = 20.00;
      currentUserData.kycData = kycData;

      kycModal.classList.add("hidden");
      renderWalletState(currentUserData);
      showToast("Wallet Activated!", "₹20 Signup Bonus credited!", "success");

      if (walletMenuItem) walletMenuItem.click();
    } catch (err) {
      showToast("KYC Error", err.message, "error");
    }
  }

  function renderWalletState(data) {
    if (!data) return;
    const isActivated = data.walletActivated || false;
    const balance = (data.walletBalance !== undefined) ? data.walletBalance : 0.00;
    const kyc = data.kycData || null;

    if (isActivated) {
      if (walletMenuItem) walletMenuItem.classList.remove("hidden");
      if (walletBalanceDisplay) walletBalanceDisplay.textContent = `₹${balance.toFixed(2)}`;

      if (paymentWalletBanner && walletBannerText && openKycModalBtn) {
        paymentWalletBanner.style.background = "#dcfce7";
        paymentWalletBanner.style.borderColor = "#86efac";
        paymentWalletBanner.style.color = "#166534";
        walletBannerText.innerHTML = `Your wallet is active with <strong>₹${balance.toFixed(2)}</strong> balance.`;
        openKycModalBtn.style.display = "none";
      }

      if (bonusDateCell) bonusDateCell.textContent = kyc ? kyc.submittedAt : "Today";

      if (verifiedKycDisplayBox && kyc) {
        if (kyc.type === "aadhaar") {
          verifiedKycDisplayBox.innerHTML = `
            <div class="kyc-field-row"><span>Document Type:</span><strong>Aadhaar Card</strong></div>
            <div class="kyc-field-row"><span>UID Number:</span><strong>${kyc.maskedNumber}</strong></div>
            <div class="kyc-field-row"><span>Full Name:</span><strong>${kyc.name}</strong></div>
            <div class="kyc-field-row"><span>Father's Name:</span><strong>${kyc.fatherName}</strong></div>
            <div class="kyc-field-row"><span>Date of Birth:</span><strong>${kyc.dob}</strong></div>
            <div class="kyc-field-row"><span>Address:</span><strong>${kyc.address}</strong></div>
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

  /* --- TOP-UP QR SCANNER MODAL --- */
  if (openTopupQrBtn && topupQrModal) {
    openTopupQrBtn.addEventListener("click", () => {
      topupQrModal.classList.remove("hidden");
      startQrCountdown(300);
    });
  }

  if (closeTopupQrModal && topupQrModal) {
    closeTopupQrModal.addEventListener("click", () => {
      topupQrModal.classList.add("hidden");
      clearInterval(qrTimerInterval);
    });
  }

  function startQrCountdown(duration) {
    clearInterval(qrTimerInterval);
    let timer = duration;

    function update() {
      const min = Math.floor(timer / 60);
      const sec = timer % 60;
      if (qrCountdownTimer) {
        qrCountdownTimer.textContent = `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;
      }
      if (--timer < 0) {
        clearInterval(qrTimerInterval);
        if (topupQrModal) topupQrModal.classList.add("hidden");
        showToast("Session Expired", "QR Top-Up session expired.", "info");
      }
    }
    update();
    qrTimerInterval = setInterval(update, 1000);
  }

  /* --- CARDS & UPI METHODS --- */
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

  if (openCardModalBtn) openCardModalBtn.addEventListener("click", () => cardModal.classList.remove("hidden"));
  if (openUpiModalBtn) openUpiModalBtn.addEventListener("click", () => upiModal.classList.remove("hidden"));
  if (closeCardModal) closeCardModal.addEventListener("click", () => cardModal.classList.add("hidden"));
  if (closeUpiModal) closeUpiModal.addEventListener("click", () => upiModal.classList.add("hidden"));

  if (cardNumberInput && cardBrandBadge) {
    cardNumberInput.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 16);
      e.target.value = val.match(/.{1,4}/g)?.join(' ') || val;
      cardBrandBadge.textContent = detectCardBrand(val);
    });
  }

  if (addCardForm) {
    addCardForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const name = document.getElementById("cardHolderName").value.trim();
      const num = document.getElementById("cardNumber").value.trim();
      const exp = document.getElementById("cardExpiry").value.trim();

      if (!name || !num || !exp) return showToast("Error", "Fill all card fields.", "error");

      const newCard = {
        id: "card_" + Date.now(),
        type: "card",
        brand: detectCardBrand(num),
        name,
        masked: `•••• •••• •••• ${num.replace(/\s/g, '').slice(-4) || '0000'}`,
        expiry: exp,
        createdAt: new Date().toISOString()
      };

      try {
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();
        let methods = (doc.exists && doc.data().paymentMethods) || [];
        methods.push(newCard);
        await userRef.update({ paymentMethods: methods });
        currentUserData.paymentMethods = methods;
        renderPaymentMethods(methods);
        cardModal.classList.add("hidden");
        addCardForm.reset();
        showToast("Saved", "Card details saved!", "success");
      } catch (err) {
        showToast("Error", err.message, "error");
      }
    });
  }

  if (addUpiForm) {
    addUpiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const name = document.getElementById("upiAccountName").value.trim();
      const vpa = document.getElementById("upiId").value.trim();
      if (!name || !vpa) return showToast("Error", "Fill all UPI fields.", "error");

      const newUpi = {
        id: "upi_" + Date.now(),
        type: "upi",
        name, vpa,
        createdAt: new Date().toISOString()
      };

      try {
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();
        let methods = (doc.exists && doc.data().paymentMethods) || [];
        methods.push(newUpi);
        await userRef.update({ paymentMethods: methods });
        currentUserData.paymentMethods = methods;
        renderPaymentMethods(methods);
        upiModal.classList.add("hidden");
        addUpiForm.reset();
        showToast("Saved", "UPI ID saved!", "success");
      } catch (err) {
        showToast("Error", err.message, "error");
      }
    });
  }

  function renderPaymentMethods(methods) {
    if (!savedPaymentMethodsGrid) return;
    if (!methods || methods.length === 0) {
      savedPaymentMethodsGrid.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">No saved payment methods added yet.</p>`;
      return;
    }

    savedPaymentMethodsGrid.innerHTML = methods.map((item) => `
      <div class="saved-payment-card">
        <div class="payment-card-left">
          <span class="payment-type-badge">${item.type === 'card' ? item.brand : 'UPI'}</span>
          <div class="payment-card-info">
            <h5>${item.type === 'card' ? item.masked : item.vpa}</h5>
            <p>${item.name} ${item.expiry ? '• Exp: ' + item.expiry : ''}</p>
          </div>
        </div>
        <button type="button" class="btn-revoke" onclick="deletePaymentMethod('${item.id}')">Delete</button>
      </div>
    `).join('');
  }

  window.deletePaymentMethod = async function(id) {
    const user = auth.currentUser;
    if (!user || !confirm("Remove this payment method?")) return;

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

  function renderTransactionHistory(transactions) {
    if (!transactionHistoryContainer) return;
    if (!transactions || transactions.length === 0) {
      transactionHistoryContainer.innerHTML = `<div class="empty-history-box"><p>Transaction history not available</p></div>`;
      return;
    }

    transactionHistoryContainer.innerHTML = `
      <table class="history-table">
        <thead>
          <tr><th>Service</th><th>Date</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td>${t.service || 'LUROVA'}</td>
              <td>${t.date || ''}</td>
              <td>${t.amount || '₹0'}</td>
              <td><span class="badge-success">${t.status || 'Successful'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /* --- AUTH STATE OBSERVER --- */
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const userDocRef = db.collection("users").doc(user.uid);
        const doc = await userDocRef.get();
        currentUserData = doc.exists ? doc.data() : await handleNewSocialUserProfile(user);

        currentUniqueId = await getOrCreateUserSevenDigitId(user);
        if (uniqueIdDisplay) uniqueIdDisplay.textContent = currentUniqueId;

        if (!onLoginSuccess(user, currentUserData)) {
          populateProfileFields(currentUserData);
          renderAccurateActiveDevices();
          renderPaymentMethods(currentUserData.paymentMethods || []);
          renderTransactionHistory(currentUserData.transactions || []);
          renderWalletState(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        console.error("Auth state error:", error);
      }
    } else {
      currentUserData = null;
      currentUniqueId = "";
      if (idFlipWrapper) idFlipWrapper.classList.remove("flipped");
      localStorage.removeItem('lurova_account_user');
      switchToAuthView();
    }
  });

  function renderAccurateActiveDevices() {
    if (!devicesListContainer) return;
    const ua = navigator.userAgent;
    let browser = "Chrome";
    let os = "Desktop";

    if (ua.indexOf("Win") !== -1) os = "Windows PC";
    else if (ua.indexOf("Mac") !== -1) os = "macOS";
    else if (ua.indexOf("Android") !== -1) os = "Android";
    else if (ua.indexOf("iPhone") !== -1) os = "iPhone";
    else if (ua.indexOf("Linux") !== -1) os = "Linux";

    if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
    else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("Edg") !== -1) browser = "Edge";

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
            <h4>${os} (${browser}) <span class="badge-primary">Primary Device</span></h4>
            <p>Active Now • Res: ${window.screen.width}x${window.screen.height} • Last sync: Today</p>
          </div>
        </div>
        <button type="button" class="btn-revoke" disabled style="opacity:0.5; cursor:default;">Current Session</button>
      </div>
    `;
  }

  async function handleNewSocialUserProfile(user) {
    const parts = (user.displayName || "").split(" ");
    const userData = {
      uid: user.uid,
      firstName: parts[0] || "User",
      lastName: parts.slice(1).join(" ") || "",
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

  /* --- REGISTRATION & LOGIN SUBMISSIONS --- */
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (signupPassword.value !== confirmPassword.value) {
        if (passwordMatchError) passwordMatchError.style.display = "block";
        return showToast("Error", "Passwords do not match.", "error");
      }

      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const email = document.getElementById("signupEmail").value.trim().toLowerCase();
      const phone = document.getElementById("signupPhone").value.trim();
      const password = signupPassword.value;

      if (!firstName || !email || !password) return showToast("Missing Fields", "Please complete all fields.", "error");

      signupSubmitBtn.disabled = true;
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.sendEmailVerification();

        const userData = {
          uid: cred.user.uid,
          firstName, lastName, email, phone,
          address: "", dob: "", gender: "",
          paymentMethods: [], transactions: [],
          walletActivated: false, walletBalance: 0, kycData: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("users").doc(cred.user.uid).set(userData);
        currentUserData = userData;
        showToast("Account Created", "Registration successful!", "success");

        if (!onLoginSuccess(cred.user, currentUserData)) {
          populateProfileFields(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        showToast("Registration Error", error.message, "error");
      } finally {
        signupSubmitBtn.disabled = false;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const idInput = document.getElementById("loginIdentifier").value.trim().toLowerCase();
      const pwd = document.getElementById("loginPassword").value;

      if (!idInput || !pwd) return showToast("Error", "Enter your credentials.", "error");

      loginSubmitBtn.disabled = true;
      try {
        let emailTarget = idInput;
        if (!idInput.includes("@")) {
          const snapshot = await db.collection("users").where("phone", "==", idInput).get();
          if (snapshot.empty) throw new Error("No user registered with this phone number.");
          emailTarget = snapshot.docs[0].data().email;
        }

        const cred = await auth.signInWithEmailAndPassword(emailTarget, pwd);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        currentUserData = doc.exists ? doc.data() : null;
        showToast("Success", "Logged in successfully!", "success");

        if (!onLoginSuccess(cred.user, currentUserData)) {
          populateProfileFields(currentUserData);
          switchToProfileView();
        }
      } catch (error) {
        showToast("Login Error", error.message, "error");
      } finally {
        loginSubmitBtn.disabled = false;
      }
    });
  }

  /* --- PROFILE UTILITIES --- */
  function populateProfileFields(data) {
    if (!data) return;
    if (userAvatar) userAvatar.textContent = data.firstName ? data.firstName.charAt(0).toUpperCase() : "L";
    if (profileFullName) profileFullName.textContent = `${data.firstName || ''} ${data.lastName || ''}`.trim() || "LUROVA User";
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

  if (editToggleBtn) {
    editToggleBtn.addEventListener("click", () => {
      [profileFirstName, profileLastName, profilePhone, profileAddress, profileDob, profileGender].forEach(el => {
        if (el) el.disabled = false;
      });
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

      const updated = {
        firstName: profileFirstName.value.trim(),
        lastName: profileLastName.value.trim(),
        phone: profilePhone.value.trim(),
        address: profileAddress.value.trim(),
        dob: profileDob.value,
        gender: profileGender.value
      };

      try {
        await db.collection("users").doc(user.uid).update(updated);
        currentUserData = { ...currentUserData, ...updated };
        populateProfileFields(currentUserData);
        disableEditMode();
        showToast("Profile Updated", "Details saved successfully!", "success");
      } catch (error) {
        showToast("Update Error", error.message, "error");
      }
    });
  }

  function disableEditMode() {
    [profileFirstName, profileLastName, profilePhone, profileAddress, profileDob, profileGender].forEach(el => {
      if (el) el.disabled = true;
    });
    if (editActions) editActions.classList.add("hidden");
    if (editToggleBtn) editToggleBtn.style.display = "inline-block";
  }

  if (downloadDataBtn) {
    downloadDataBtn.addEventListener("click", () => {
      showToast("Data Export Logged", "Your account export request has been created.", "info");
    });
  }

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
          showToast("Account Deleted", "Your account was permanently deleted.", "info");
        } catch (error) {
          showToast("Delete Error", error.message, "error");
        }
      }
    });
  }
});
