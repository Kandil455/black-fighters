import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LVCard } from "@/components/ui/linevault";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState("");
  const [invalidLink, setInvalidLink] = useState(false);

  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    if (!oobCode) {
      setInvalidLink(true);
      setVerifying(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((verifiedEmail) => {
        setEmail(verifiedEmail);
        setVerifying(false);
      })
      .catch(() => {
        setInvalidLink(true);
        setVerifying(false);
      });
  }, [oobCode]);

  const handle = async (e) => {
    e.preventDefault();
    if (password.length < 8)
      return toast.error("الباسورد لازم 8 حروف على الأقل");
    if (password !== confirm) return toast.error("الباسوردين مش متطابقين");
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      toast.success("تم تغيير كلمة المرور بنجاح");
      navigate("/login");
    } catch (err) {
      const msg =
        err.code === "auth/invalid-action-code"
          ? "الرابط انتهت صلاحيته — اطلب رابطاً جديداً"
          : err.code === "auth/weak-password"
          ? "كلمة المرور ضعيفة — يجب أن تكون 8 أحرف على الأقل"
          : err.message || "حدث خطأ — جرب الرابط مرة أخرى";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[#07080C] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#3DDC97]" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#07080C] flex items-center justify-center px-4 py-10"
      dir={dir}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo size={32} linkTo="/" />
        </div>

        <LVCard padding="p-6 sm:p-8">
          {invalidLink ? (
            <div className="text-center space-y-4">
              <h1 className="text-xl font-bold text-[#E5484D]">
                {isEn ? "Invalid or Expired Link" : "رابط غير صالح أو منتهي"}
              </h1>
              <p className="text-xs text-[#9AA0AE]">
                {isEn
                  ? "This password reset link has expired or has already been used."
                  : "انتهت صلاحية هذا الرابط أو تم استخدامه بالفعل."}
              </p>
              <Button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="w-full h-11 font-bold"
              >
                {isEn ? "Request New Link" : "طلب رابط جديد"}
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-[#F2F3F5]">
                  {isEn ? "Set New Password" : "تعيين كلمة مرور جديدة"}
                </h1>
                {email && (
                  <p className="text-xs text-[#9AA0AE] mt-1 font-mono">{email}</p>
                )}
              </div>

              <form onSubmit={handle} className="space-y-4">
                <div className="relative">
                  <Input
                    dir="ltr"
                    type={showPass ? "text" : "password"}
                    placeholder={
                      isEn ? "New password (8+ chars)" : "كلمة المرور الجديدة (8 أحرف+)"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "h-11 bg-[#07080C] border-[#1E222B] rounded-xl focus-visible:border-[#3DDC97] text-[#F2F3F5]",
                      isEn ? "pr-10" : "pl-10"
                    )}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 text-[#9AA0AE] hover:text-[#F2F3F5]",
                      isEn ? "right-3" : "left-3"
                    )}
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <Input
                  dir="ltr"
                  type={showPass ? "text" : "password"}
                  placeholder={isEn ? "Confirm password" : "تأكيد كلمة المرور"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 bg-[#07080C] border-[#1E222B] rounded-xl focus-visible:border-[#3DDC97] text-[#F2F3F5]"
                  required
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 font-bold gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isEn ? "Save Password" : "حفظ كلمة المرور"}
                </Button>
              </form>
            </>
          )}
        </LVCard>
      </div>
    </div>
  );
}
