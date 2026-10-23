import React, { useState, useRef, useEffect } from 'react';
import { FormC1Upload } from '../../types/vore';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Upload,
  RefreshCw,
  Edit2,
  ShieldCheck,
  Check,
  Sparkles,
  BarChart3,
  TrendingUp,
  Crop,
  ImageIcon,
  Maximize2,
  Layers,
  SwitchCamera,
  Zap,
} from 'lucide-react';

interface QuickCountOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproveC1: (data: FormC1Upload) => void;
  defaultTps?: string;
  defaultKelurahan?: string;
  defaultKecamatan?: string;
  saksiNama?: string;
}

export const QuickCountOcrModal: React.FC<QuickCountOcrModalProps> = ({
  isOpen,
  onClose,
  onApproveC1,
  defaultTps = 'TPS 047',
  defaultKelurahan = 'Kel. Sukamaju',
  defaultKecamatan = 'Kec. Cilandak',
  saksiNama = 'Ahmad Rizky',
}) => {
  const [formType, setFormType] = useState<'C1' | 'B1'>('C1');
  const [tpsNumber, setTpsNumber] = useState(defaultTps);
  const [kelurahanName, setKelurahanName] = useState(defaultKelurahan);
  const [kecamatanName, setKecamatanName] = useState(defaultKecamatan);

  // Voting extraction
  const [paslon1, setPaslon1] = useState(132);
  const [paslon2, setPaslon2] = useState(54);
  const [paslon3, setPaslon3] = useState(18);
  const [tidakSah, setTidakSah] = useState(4);

  const [isEditing, setIsEditing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Camera & Image upload state
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoName, setFotoName] = useState<string>('');
  const [isLiveCamera, setIsLiveCamera] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream
  const stopLiveCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopLiveCamera = () => {
    stopLiveCameraTracks();
    setIsLiveCamera(false);
    setCameraLoading(false);
  };

  // Start device live camera (auto turns on when modal opens)
  const startLiveCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setCameraLoading(true);
    setIsLiveCamera(true);
    stopLiveCameraTracks();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Kamera langsung tidak didukung pada browser ini. Silakan gunakan tombol Ambil/Upload Foto.');
      setIsLiveCamera(false);
      setCameraLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraLoading(false);
      setIsLiveCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Initial camera access fallback:', err);
      // Fallback: try default video without strict constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = fallbackStream;
        setCameraLoading(false);
        setIsLiveCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr) {
        setCameraLoading(false);
        setIsLiveCamera(false);
        setCameraError('Kamera belum diizinkan atau sedang digunakan aplikasi lain. Anda dapat mengambil foto dengan tombol di bawah.');
      }
    }
  };

  // Switch front and rear cameras
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startLiveCamera(nextMode);
  };

  // KAMERA LANGSUNG MENYALA SAAT MODAL DIBUKA
  useEffect(() => {
    if (isOpen) {
      setIsApproved(false);
      setFotoUrl(null);
      setIsLiveCamera(true);
      startLiveCamera(facingMode);
    } else {
      stopLiveCamera();
    }
    return () => {
      stopLiveCamera();
    };
  }, [isOpen]);

  // Connect video element to active stream when live camera mounts
  useEffect(() => {
    if (isLiveCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isLiveCamera]);

  if (!isOpen) return null;

  const totalSuaraSah = paslon1 + paslon2 + paslon3;
  const grandTotal = totalSuaraSah + tidakSah;
  const pct1 = grandTotal > 0 ? ((paslon1 / grandTotal) * 100).toFixed(1) : '0.0';
  const pct2 = grandTotal > 0 ? ((paslon2 / grandTotal) * 100).toFixed(1) : '0.0';
  const pct3 = grandTotal > 0 ? ((paslon3 / grandTotal) * 100).toFixed(1) : '0.0';

  // Capture snapshot from live stream and immediately trigger OCR scan
  const handleTakeLiveSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setFotoUrl(dataUrl);
        setFotoName(`Foto-Kamera-${formType}-${Date.now()}.jpg`);
        stopLiveCamera();
        triggerOcrSimulation();
      }
    } catch (err) {
      console.error('Snapshot capture error:', err);
    }
  };

  // Handle uploaded photo from file input / camera capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoName(file.name);
      stopLiveCamera();
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFotoUrl(event.target.result as string);
          triggerOcrSimulation();
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const triggerOcrSimulation = () => {
    setIsScanning(true);
    setIsApproved(false);
    setScanProgress(20);
    setTimeout(() => setScanProgress(55), 250);
    setTimeout(() => setScanProgress(85), 500);
    setTimeout(() => {
      setIsScanning(false);
      setScanProgress(100);
      const base1 = Math.floor(Math.random() * 35) + 115;
      const base2 = Math.floor(Math.random() * 20) + 42;
      const base3 = Math.floor(Math.random() * 12) + 16;
      const baseInvalid = Math.floor(Math.random() * 4) + 2;
      setPaslon1(base1);
      setPaslon2(base2);
      setPaslon3(base3);
      setTidakSah(baseInvalid);
    }, 750);
  };

  const handleOneTapApprove = () => {
    setIsApproved(true);

    const record: FormC1Upload = {
      id: `${formType.toLowerCase()}-ocr-${Date.now()}`,
      tps: tpsNumber,
      kelurahan: kelurahanName,
      kecamatan: kecamatanName,
      saksiNama: saksiNama,
      waktuUpload: 'Baru saja',
      suaraPaslon1: paslon1,
      suaraPaslon2: paslon2,
      suaraPaslon3: paslon3,
      suaraTidakSah: tidakSah,
      totalSuaraSah: totalSuaraSah,
      statusVerifikasi: 'Terverifikasi',
      fileName: fotoName || `Form-${formType}-${tpsNumber.replace(/\s+/g, '')}.jpg`,
      fotoC1Url: fotoUrl || undefined,
    };

    onApproveC1(record);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Hidden inputs for camera capture & file upload */}
        <input
          type="file"
          ref={nativeCameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          ref={galleryInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full font-mono">
                SCAN &amp; OCR
              </span>
              <span className="text-xs text-slate-500 font-bold">Quick Count C1 / B1</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1">
              Scan Formulir {formType} Plano • Kamera &amp; OCR
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ambil foto langsung dengan kamera atau unggah gambar dokumen hasil perhitungan TPS
            </p>
          </div>

          <button
            onClick={() => {
              stopLiveCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Pilihan Form C1 Plano vs Form B1 */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setFormType('C1');
              setTpsNumber('TPS 047');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              formType === 'C1'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Form C1 Plano (TPS)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormType('B1');
              setTpsNumber('Rekap Kecamatan');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              formType === 'B1'
                ? 'bg-white text-cyan-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-600" />
            <span>Form B1 (Kecamatan)</span>
          </button>
        </div>

        {/* Live Camera Viewfinder or Photo Preview Box */}
        {isLiveCamera ? (
          <div className="rounded-3xl bg-slate-950 text-white overflow-hidden border-2 border-teal-500/80 shadow-2xl relative">
            {/* Live Camera Video Feed */}
            <div className="relative w-full h-64 sm:h-72 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {cameraLoading && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-4">
                  <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-2" />
                  <span className="text-xs text-white font-bold">Menghidupkan Kamera Langsung...</span>
                </div>
              )}

              {/* Viewfinder Document Framing Guide */}
              <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-teal-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-t-4 border-l-4 border-teal-400 -mt-1 -ml-1"></span>
                  <span className="w-4 h-4 border-t-4 border-r-4 border-teal-400 -mt-1 -mr-1"></span>
                </div>
                <div className="text-center bg-black/60 backdrop-blur-xs py-1 px-3 rounded-full self-center border border-white/10">
                  <span className="text-[10px] sm:text-xs text-teal-300 font-bold tracking-wide">
                    Posisikan Formulir {formType} di dalam kotak
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="w-4 h-4 border-b-4 border-l-4 border-teal-400 -mb-1 -ml-1"></span>
                  <span className="w-4 h-4 border-b-4 border-r-4 border-teal-400 -mb-1 -mr-1"></span>
                </div>
              </div>

              {/* Top Controls on Camera Overlay */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-white font-bold">KAMERA AKTIF</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-full border border-white/20 transition-all cursor-pointer active:scale-95"
                    title="Putar Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-4 h-4 text-teal-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-2.5 py-1 bg-black/70 hover:bg-black/90 text-white rounded-full border border-white/20 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-cyan-300" />
                    <span>Galeri</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Shutter Button (Snapshot & Auto OCR) */}
            <div className="p-3.5 bg-slate-900 flex items-center justify-between border-t border-slate-800">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {tpsNumber} · {kelurahanName}
              </span>

              {/* Central Large Shutter Button */}
              <button
                type="button"
                onClick={handleTakeLiveSnapshot}
                className="mx-auto px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm rounded-full shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <div className="w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center">
                  <Camera className="w-3 h-3 text-teal-400" />
                </div>
                <span>Ambil Foto &amp; Scan OCR</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 text-white space-y-3 border border-slate-800 shadow-md">
            {/* Foto Pratinjau dengan Overlay Crop Otomatis & Status OCR */}
            <div className="relative rounded-xl overflow-hidden border-2 border-teal-400/80 bg-teal-950/40 min-h-[150px] max-h-[190px] flex items-center justify-center">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={`Pratinjau ${formType}`}
                  className="w-full h-full max-h-[190px] object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                  <span className="text-xs text-slate-400">Belum ada foto</span>
                </div>
              )}

              {/* Scanning Overlay Animation */}
              {isScanning && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                  <RefreshCw className="w-7 h-7 text-teal-400 animate-spin mb-2" />
                  <span className="text-xs font-bold text-white">Memindai Angka Suara OCR dari Foto...</span>
                  <div className="w-40 bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-teal-400 h-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Top Crop Badge & Retake Button */}
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px]">
                <Crop className="w-3 h-3 text-teal-300" />
                <span className="font-mono text-teal-300 font-bold">Hasil Foto Kamera • OCR 98.4%</span>
              </div>

              <button
                type="button"
                onClick={() => startLiveCamera(facingMode)}
                className="absolute top-2 right-2 flex items-center gap-1 bg-teal-600/90 hover:bg-teal-500 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all shadow-xs"
              >
                <Camera className="w-3 h-3" />
                <span>Buka Kamera Lagi</span>
              </button>

              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-slate-300 font-mono">
                {tpsNumber} · {kelurahanName}
              </div>
            </div>

            {/* Voting Extraction Numbers Grid */}
            <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="flex items-center justify-between pb-1 text-[11px] font-bold text-teal-300">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Hasil Deteksi OCR (Dapat Diedit Manual):</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-white hover:text-teal-300 underline font-mono text-[10px] cursor-pointer"
                >
                  {isEditing ? 'Selesai' : 'Ubah Angka'}
                </button>
              </div>

              {/* Paslon 01 */}
              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-teal-500/20 text-teal-300 font-black text-[10px] flex items-center justify-center font-mono">
                    01
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">Paslon 01 (Utama)</span>
                    <span className="text-[9px] text-teal-300 font-mono">{pct1}% suara</span>
                  </div>
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    value={paslon1}
                    onChange={(e) => setPaslon1(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-white text-slate-900 rounded-lg font-mono font-bold text-xs text-right"
                  />
                ) : (
                  <span className="text-base font-black font-mono text-teal-300">
                    {paslon1}
                  </span>
                )}
              </div>

              {/* Paslon 02 */}
              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-slate-300 font-black text-[10px] flex items-center justify-center font-mono">
                    02
                  </span>
                  <div>
                    <span className="text-xs font-medium text-slate-200 block">Paslon 02</span>
                    <span className="text-[9px] text-slate-400 font-mono">{pct2}% suara</span>
                  </div>
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    value={paslon2}
                    onChange={(e) => setPaslon2(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-white text-slate-900 rounded-lg font-mono font-bold text-xs text-right"
                  />
                ) : (
                  <span className="text-base font-black font-mono text-white">
                    {paslon2}
                  </span>
                )}
              </div>

              {/* Paslon 03 */}
              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-slate-300 font-black text-[10px] flex items-center justify-center font-mono">
                    03
                  </span>
                  <div>
                    <span className="text-xs font-medium text-slate-200 block">Paslon 03</span>
                    <span className="text-[9px] text-slate-400 font-mono">{pct3}% suara</span>
                  </div>
                </div>
                {isEditing ? (
                  <input
                    type="number"
                    value={paslon3}
                    onChange={(e) => setPaslon3(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-white text-slate-900 rounded-lg font-mono font-bold text-xs text-right"
                  />
                ) : (
                  <span className="text-base font-black font-mono text-white">
                    {paslon3}
                  </span>
                )}
              </div>

              {/* Suara Tidak Sah */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-400">Suara Tidak Sah / Rusak:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={tidakSah}
                    onChange={(e) => setTidakSah(Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-white text-slate-900 rounded-lg font-mono font-bold text-xs text-right"
                  />
                ) : (
                  <span className="text-xs font-mono font-bold text-rose-300">{tidakSah}</span>
                )}
              </div>
            </div>

            {/* Total Summary */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10 text-slate-300">
              <span>Total Suara Masuk:</span>
              <span className="font-mono font-black text-white">
                {grandTotal.toLocaleString('id-ID')} Suara ({totalSuaraSah} Sah)
              </span>
            </div>

            {/* Action Buttons: Edit & One-Tap Approve */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Selesai' : 'Edit Angka'}</span>
              </button>

              <button
                type="button"
                onClick={handleOneTapApprove}
                disabled={isApproved}
                className={`flex-1 py-2.5 px-4 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isApproved
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950'
                }`}
              >
                {isApproved ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span className="text-white">Telah Disetujui (Approved)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>One-Tap Approve &amp; Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Real-time sync feedback message */}
        {isApproved && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs space-y-1 animate-in fade-in">
            <div className="flex items-center gap-2 font-black text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tabulasi Real-Time &amp; Command Center Diperbarui!</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Statistik perolehan suara {tpsNumber} ({kelurahanName}) telah tersinkronisasi otomatis ke Rekap Paslon dan Command Center.
            </p>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={triggerOcrSimulation}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Pindai Ulang</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopLiveCamera();
              onClose();
            }}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
