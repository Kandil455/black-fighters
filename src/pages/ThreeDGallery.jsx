import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Boxes, Info } from "lucide-react";
import Spline3DHero from "@/components/ui/Spline3DHero";
import NeuralCore3D from "@/components/ui/NeuralCore3D";
import CinematicHoloVisualizer from "@/components/ui/CinematicHoloVisualizer";
import StudyOrbit3D from "@/components/dashboard/StudyOrbit3D";
import SaturnCosmos3D from "@/components/dashboard/SaturnCosmos3D";
import Mascot3DModel from "@/components/course/Mascot3DModel";
import { use3DQuality } from "@/lib/webglQuality";

const DEMO_MASCOT = {
  name: "AIK Robot",
  url: "/models/robot-expressive.glb",
  cameraZ: 4.6,
  scale: 1,
  autoRotateSpeed: 0.006,
};

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c0d16]/80 p-6 flex flex-col items-center gap-3">
      <div className="flex items-center justify-center min-h-[300px] w-full">{children}</div>
      <h3 className="text-lg font-black text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground text-center leading-relaxed">{subtitle}</p>
    </div>
  );
}

export default function ThreeDGallery() {
  const quality = use3DQuality();
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
              <Boxes className="text-primary" /> معرض الـ 3D — عرض كل المشاهد الحية
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              جودة الرندر الحالية: <strong className="text-primary">{quality.tier}</strong>
              {quality.isPowerSaver ? " (Battery Saver مفعّل — المشاهد متوقفة أو خفيفة)" : " (رندر كامل)"}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            رجوع للصفحة الرئيسية <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Quantum Core Hero" subtitle="Landing — Three.js WebGL عالي الأداء مع تفاعل الماوس">
            <Spline3DHero className="w-64 h-64" />
          </Card>
          <Card title="AIK Mascot (GLTF)" subtitle="robot-expressive.glb — أسلوانات وأنيميشن وسحب للدوران">
            <Mascot3DModel
              model={DEMO_MASCOT}
              size={220}
              state="idle"
              fallback={<div className="text-xs text-muted-foreground">GLTF مش موجود — fallback</div>}
            />
          </Card>
          <Card title="Neural Core" subtitle="Canvas 2D — كرة جزيئات متصلة (بأداء متكيف جديد)">
            <NeuralCore3D className="w-60 h-60" />
          </Card>
          <Card title="Holo Visualizer" subtitle="Canvas 2D — حلقات هولوجرام تفاعلية (بأداء متكيف جديد)">
            <CinematicHoloVisualizer className="w-64 h-64" />
          </Card>
          <Card title="Study Orbit" subtitle="Dashboard — كان antialias مطفّي، دلوقتي بجودة متكيفة">
            <StudyOrbit3D power={2} />
          </Card>
          <Card title="Saturn Cosmos" subtitle="Dashboard — زحل بأقمار وحقل نجوم (تفاعل الماوس)">
            <SaturnCosmos3D power={2} />
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          الجودة بتتحكم فيها: وضع توفير الطاقة + قدرات الجهاز (GPU حقيقي ولا Software) — غيّر الوضع من الإعدادات وشوف الفرق فوراً.
        </p>
      </div>
    </div>
  );
}
