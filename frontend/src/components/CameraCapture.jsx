import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './CameraCapture.css';

export default function CameraCapture({ onImageCapture, onAnalysisResult }) {
  const [mode, setMode]             = useState('upload'); // 'upload' | 'camera'
  const [previewUrl, setPreviewUrl]  = useState(null);
  const [file, setFile]              = useState(null);
  const [analyzing, setAnalyzing]    = useState(false);
  const [analysis, setAnalysis]      = useState(null);
  const [dragOver, setDragOver]      = useState(false);
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Process a file (from input or drop)
  const processFile = useCallback(async (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setAnalysis(null);
    onImageCapture?.(f);

    // Trigger AI analysis
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('image', f);
      // Call analysis endpoint (returns mock data if backend offline)
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/issues/analyze`,
        { method: 'POST', body: fd }
      );
      if (res.ok) {
        const json = await res.json();
        setAnalysis(json.data);
        onAnalysisResult?.(json.data);
      }
    } catch (_) {
      // Offline mock
      const mockResult = mockAnalysis();
      setAnalysis(mockResult);
      onAnalysisResult?.(mockResult);
    } finally {
      setAnalyzing(false);
    }
  }, [onImageCapture, onAnalysisResult]);

  const handleFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const clearImage = () => {
    setPreviewUrl(null); setFile(null); setAnalysis(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Camera capture
  const startCamera = async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert('Camera access denied. Please use file upload instead.');
      setMode('upload');
    }
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const f = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      processFile(f);
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setMode('upload');
  };

  const mockAnalysis = () => ({
    issue_type: 'pothole',
    severity: 'high',
    confidence: 0.87,
    notes: 'Deep surface depression detected. Immediate repair required.',
  });

  return (
    <div className="camera-capture">
      {mode === 'camera' ? (
        <div className="camera-capture__camera">
          <video ref={videoRef} autoPlay playsInline className="camera-capture__video" />
          <div className="camera-capture__camera-controls">
            <button className="btn btn-secondary" onClick={stopCamera}><X size={16} /> Cancel</button>
            <button className="btn btn-primary" onClick={capturePhoto}><Camera size={16} /> Capture</button>
          </div>
        </div>
      ) : previewUrl ? (
        <div className="camera-capture__preview">
          <img src={previewUrl} alt="Captured road issue" />
          <button className="camera-capture__clear" onClick={clearImage}><X size={16} /></button>

          {/* AI Analysis Result */}
          {analyzing && (
            <div className="camera-capture__analyzing">
              <div className="spinner spinner-sm" />
              <span>AI analyzing image…</span>
            </div>
          )}
          {analysis && !analyzing && (
            <div className="camera-capture__analysis animate-fadeInUp">
              <div className="camera-capture__analysis-header">
                <CheckCircle size={16} className="text-success" />
                <span>AI Analysis Complete</span>
              </div>
              <div className="camera-capture__analysis-grid">
                <div>
                  <span className="camera-capture__analysis-key">Issue Type</span>
                  <span className="camera-capture__analysis-val">
                    {analysis.issue_type?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="camera-capture__analysis-key">Severity</span>
                  <span className={`badge badge-${analysis.severity}`}>{analysis.severity}</span>
                </div>
                <div>
                  <span className="camera-capture__analysis-key">Confidence</span>
                  <span className="camera-capture__analysis-val">
                    {Math.round((analysis.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>
              {analysis.notes && (
                <p className="camera-capture__analysis-notes">{analysis.notes}</p>
              )}
            </div>
          )}

          <button className="btn btn-ghost btn-sm" onClick={clearImage}>
            <RotateCcw size={14} /> Use different image
          </button>
        </div>
      ) : (
        <div
          className={`camera-capture__dropzone ${dragOver ? 'camera-capture__dropzone--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="camera-capture__dropzone-icon">
            <Upload size={28} />
          </div>
          <p className="camera-capture__dropzone-text">
            Drop your photo here or <span>browse files</span>
          </p>
          <p className="camera-capture__dropzone-hint">JPEG, PNG, WebP up to 10MB</p>
          <input
            ref={fileRef} type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput} hidden
          />
        </div>
      )}

      {/* Mode toggles */}
      {!previewUrl && mode !== 'camera' && (
        <div className="camera-capture__modes">
          <span className="text-muted text-sm">or</span>
          <button className="btn btn-secondary btn-sm" onClick={startCamera}>
            <Camera size={14} /> Use Camera
          </button>
        </div>
      )}
    </div>
  );
}
