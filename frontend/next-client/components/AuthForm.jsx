"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";
import ForgotPasswordForm from "./auth/ForgotPasswordForm";
import LoginForm from "./auth/LoginForm";
import RegisterForm from "./auth/RegisterForm";

const GOOGLE_REDIRECT_PENDING_KEY = "autosub.googleRedirectPending";

function getGoogleAuthMessage(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") {
    return `Domain ${window.location.hostname} chưa được thêm vào Firebase Authentication > Settings > Authorized domains.`;
  }
  if (code === "auth/popup-blocked") {
    return "Trình duyệt đã chặn cửa sổ đăng nhập Google. Đang thử chuyển trang đăng nhập...";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google provider chưa được bật trong Firebase Authentication > Sign-in method.";
  }
  if (code === "auth/network-request-failed") {
    return "Không kết nối được Firebase/Google. Kiểm tra mạng rồi thử lại.";
  }
  return error?.message || "Đăng nhập Google thất bại.";
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  async function redirectAfterLogin(user) {
    try {
      const snapshot = await getDoc(doc(db, "users", user.uid));
      if (snapshot.exists() && snapshot.data().role === "admin") {
        router.push("/admin");
        return;
      }
    } catch (error) {
      console.warn("Could not read user role from Firestore. Redirecting as regular user.", error);
    }

    router.push("/app");
  }

  async function saveGoogleUser(user) {
    const userRef = doc(db, "users", user.uid);
    try {
      const snapshot = await getDoc(userRef);
      await setDoc(
        userRef,
        {
          username: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
          lastLogin: serverTimestamp(),
          ...(snapshot.exists()
            ? {}
            : {
                role: "user",
                is_plus: false,
                createdAt: serverTimestamp(),
              }),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn("Could not save Google user profile to Firestore.", error);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function finishRedirectLogin() {
      try {
        const hadPendingRedirect = window.sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === "1";
        const result = await getRedirectResult(auth);
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        if (cancelled) return;
        if (!result) {
          if (hadPendingRedirect) {
            setMessage("Google không trả về phiên đăng nhập. Hãy thử lại hoặc kiểm tra Authorized domains trong Firebase.");
          }
          return;
        }

        setBusy(true);
        setMessage("");
        await saveGoogleUser(result.user);
        if (!cancelled) await redirectAfterLogin(result.user);
      } catch (error) {
        console.error("Google redirect sign-in failed", error);
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        if (!cancelled) setMessage(getGoogleAuthMessage(error));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    finishRedirectLogin();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Mật khẩu xác nhận không khớp.");
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", credential.user.uid), {
          username,
          email,
          role: "user",
          is_plus: false,
          createdAt: serverTimestamp(),
        });
        setSuccess(true);
        window.setTimeout(() => router.push("/app"), 1800);
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email);
        setSuccess(true);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await redirectAfterLogin(credential.user);
      }
    } catch (error) {
      setMessage(error.message || "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setMessage("Đang mở đăng nhập Google...");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
      await saveGoogleUser(result.user);
      await redirectAfterLogin(result.user);
    } catch (error) {
      console.error("Google popup sign-in failed", error);
      if (error.code === "auth/popup-blocked") {
        try {
          setMessage("Popup bị chặn, đang chuyển sang trang đăng nhập Google...");
          window.sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, "1");
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          console.error("Google redirect fallback failed", redirectError);
          window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
          setMessage(getGoogleAuthMessage(redirectError));
        }
      } else {
        window.sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        setMessage(getGoogleAuthMessage(error));
      }
      setBusy(false);
    }
  }

  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const strengthClass = strength <= 1 ? "weak" : strength <= 2 ? "medium" : "strong";
  const sharedProps = {
    busy,
    email,
    message,
    onEmailChange: setEmail,
    onGoogle: handleGoogle,
    onPasswordChange: setPassword,
    onShowPasswordToggle: () => setShowPassword((value) => !value),
    onSubmit: handleSubmit,
    password,
    showPassword,
    success,
  };

  if (mode === "forgot") {
    return <ForgotPasswordForm {...sharedProps} />;
  }

  if (mode === "register") {
    return (
      <RegisterForm
        {...sharedProps}
        confirmPassword={confirmPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onUsernameChange={setUsername}
        strength={strength}
        strengthClass={strengthClass}
        username={username}
      />
    );
  }

  return <LoginForm {...sharedProps} />;
}
