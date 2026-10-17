import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Loader2, Eye, EyeOff } from "@/components/ui/animatedIcons";
import { toast } from "sonner";
import { authErrorMessage } from "@/lib/authErrors";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const currentEmail =
      email || document.querySelector('input[name="email"]')?.value || "";
    const currentPassword =
      password || document.querySelector('input[name="password"]')?.value || "";
    if (!currentEmail || !currentPassword) {
      return toast.error(
        isEn ? "Please enter email and password" : "اكتب الإيميل والباسورد"
      );
    }
    setLoading(true);
    try {
      await login(currentEmail, currentPassword);
      navigate("/dashboard");
    } catch (err) {
      toast.error(
        authErrorMessage(
          err,
          err.message || (isEn ? "Login failed" : "حصل خطأ في تسجيل الدخول")
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      toast.error(
        authErrorMessage(
          err,
          err.message ||
            (isEn ? "Google login failed" : "حصل خطأ في تسجيل الدخول بـ Google")
        )
      );
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: "var(--paper)", color: "var(--ink)" }}
      dir={dir}
    >
      {/* Editorial Header */}
      <div className="hd text-center mb-6">
        <span className="mono">{isEn ? "ACCOUNT" : "الحساب"}</span>
        <h1 className="serif">
          {isEn ? "Sign In & " : "ادخل "}
          <em style={{ color: "var(--sig)" }}>{isEn ? "Get Started." : "وابدأ."}</em>
        </h1>
      </div>

      {/* Auth Card */}
      <div className="card w-full max-w-md p-6 sm:p-8">
        {/* Auth Mode Switch */}
        <div className="tabs justify-center mb-4">
          <button aria-selected="true" className="font-bold">
            {isEn ? "Sign In" : "تسجيل الدخول"}
          </button>
          <Link to="/register" className="text-muted-foreground hover:text-foreground">
            <button aria-selected="false">
              {isEn ? "New Account" : "حساب جديد"}
            </button>
          </Link>
        </div>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <div className="comp">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isEn ? "Email Address" : "البريد الإلكتروني"}
              required
              autoComplete="email"
            />
          </div>

          <div className="comp">
            <input
              type={showPass ? "text" : "password"}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEn ? "Password" : "كلمة السر"}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="p-2"
              style={{ color: "var(--mute)" }}
            >
              {showPass ? <EyeOff className="w-4 h-4" animated={false} /> : <Eye className="w-4 h-4" animated={false} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn w-full mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" animated={false} /> : (isEn ? "Sign In" : "دخول")}
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-[var(--line)]" />
            <span className="mono text-[0.68rem]">{isEn ? "OR" : "أو"}</span>
            <div className="flex-1 h-px bg-[var(--line)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="btn line w-full gap-2"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>{isEn ? "Continue with Google" : "دخول بـ Google"}</span>
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: "var(--mute)" }}>
          {isEn ? "Don't have an account? " : "معندكش حساب؟ "}
          <Link to="/register" className="font-bold underline" style={{ color: "var(--sig)" }}>
            {isEn ? "Create Account" : "سجل حساب جديد"}
          </Link>
        </p>
      </div>
    </div>
  );
}
