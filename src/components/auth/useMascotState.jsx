import { useState, useCallback } from "react";

/**
 * يدير حالة شخصية الـ Auth بناءً على تفاعل المستخدم مع الحقول.
 * يرجّع state + lookX + handlers تربطها بحقول الفورم.
 */
export function useMascotState() {
  const [state, setState] = useState("idle");
  const [lookX, setLookX] = useState(0);

  // وقت الكتابة في الإيميل: العين تتبع آخر حرف
  const onEmailType = useCallback((value) => {
    setState("peek");
    // حرّك النظر يمين/شمال حسب طول النص (يدّي إحساس إنه بيقرا)
    const wave = Math.sin(value.length / 2);
    setLookX(wave);
  }, []);

  const onEmailFocus = useCallback(() => setState("peek"), []);

  // أول ما يركّز على الباسورد → يغطّي عينه
  const onPasswordFocus = useCallback(() => setState("cover"), []);

  const onBlur = useCallback(() => {
    setState("idle");
    setLookX(0);
  }, []);

  const celebrate = useCallback(() => setState("happy"), []);

  return { state, lookX, onEmailType, onEmailFocus, onPasswordFocus, onBlur, celebrate, setState };
}