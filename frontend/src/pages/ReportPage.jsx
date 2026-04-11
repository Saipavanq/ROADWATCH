import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, MapPin, Camera, ChevronRight, ChevronLeft, Mic, MicOff } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import LocationPicker from '../components/LocationPicker';
import useComplaintsStore from '../store/complaintsStore';
import './ReportPage.css';

const ISSUE_TYPES = [
  { value: 'pothole',         label: '🕳️ Pothole',            desc: 'Surface depression or hole' },
  { value: 'crack',           label: '⚡ Road Crack',          desc: 'Linear cracks or fractures' },
  { value: 'waterlogging',    label: '💧 Waterlogging',        desc: 'Standing water drainage issue' },
  { value: 'broken_divider',  label: '🚧 Broken Divider',      desc: 'Damaged road divider / barrier' },
  { value: 'missing_signage', label: '🚫 Missing Signage',     desc: 'Missing or damaged road signs' },
  { value: 'streetlight_failure', label: '💡 Streetlight',   desc: 'Faulty or missing streetlight' },
  { value: 'encroachment',    label: '⚠️ Encroachment',        desc: 'Illegal obstruction on road' },
  { value: 'other',           label: '📍 Other',               desc: 'Other road infrastructure issue' },
];

const SEVERITIES = [
  { value: 'low',      label: '🟢 Low',      desc: 'Minor inconvenience',        color: '#4ADE80' },
  { value: 'medium',   label: '🟡 Medium',   desc: 'Needs attention soon',       color: '#FBBF24' },
  { value: 'high',     label: '🟠 High',     desc: 'Urgent – causes difficulty', color: '#F97316' },
  { value: 'critical', label: '🔴 Critical', desc: 'Immediate safety hazard',    color: '#EF4444' },
];

const STEPS = ['📸 Photo', '📍 Location', '📝 Details', '✅ Review'];

export default function ReportPage() {
  const navigate = useNavigate();
  const { submitComplaint, isLoading } = useComplaintsStore();

  const [step, setStep]       = useState(0);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError]     = useState('');

  const [imageFile, setImageFile]  = useState(null);
  const [aiResult, setAiResult]    = useState(null);
  const [location, setLocation]    = useState(null);
  const [form, setForm] = useState({
    issue_type: '', severity: 'medium', title: '', description: '',
  });
  const [isListening, setIsListening] = useState(false);

  // Module 23: Voice Input
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input.");
      return;
    }
    if (isListening) return; // cannot stop manually easily without keeping ref, but it auto-stops

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm((f) => ({ 
        ...f, 
        description: f.description ? `${f.description} ${transcript}` : transcript 
      }));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleNext = () => {
    if (step === 1 && !location) { setError('Please select a location'); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!location) { setError('Location is required'); return; }
    const fd = new FormData();
    fd.append('latitude',    location.lat);
    fd.append('longitude',   location.lng);
    fd.append('address_text',location.address || '');
    fd.append('issue_type',  form.issue_type || aiResult?.issue_type || 'other');
    fd.append('severity',    form.severity   || aiResult?.severity   || 'medium');
    fd.append('title',       form.title || `${form.issue_type || 'Issue'} reported`);
    fd.append('description', form.description);
    if (imageFile) fd.append('images', imageFile);

    const result = await submitComplaint(fd);
    if (result.success) {
      setSubmitted(result);
    } else {
      setError(result.message || 'Submission failed');
    }
  };

  // ── Success Screen ────────────────────────────────────────
  if (submitted) {
    return (
      <div className="report-page__success animate-fadeInUp">
        <div className="report-page__success-card card">
          <div className="card-body text-center">
            <div className="report-page__success-icon">
              <CheckCircle size={48} />
            </div>
            <h2>Report Submitted!</h2>
            <p>Your complaint has been registered and will be reviewed shortly.</p>
            <div className="report-page__ref-badge">
              {submitted.data?.referenceNo}
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button className="btn btn-secondary" onClick={() => navigate('/status')}>
                Track My Reports
              </button>
              <button className="btn btn-primary" onClick={() => {
                setSubmitted(null); setStep(0); setImageFile(null);
                setLocation(null); setForm({ issue_type:'', severity:'medium', title:'', description:'' });
                setAiResult(null);
              }}>
                Report Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="report-page container">
        <div className="report-page__header">
          <h1>Report a Road Issue</h1>
          <p>Help improve your city's infrastructure by reporting road problems</p>
        </div>

        {/* Step Progress */}
        <div className="report-page__steps">
          {STEPS.map((label, i) => (
            <div key={i} className={`report-page__step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="report-page__step-dot">
                {i < step ? '✓' : i + 1}
              </div>
              <span>{label}</span>
              {i < STEPS.length - 1 && <div className="report-page__step-line" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="report-page__content card animate-fadeIn">
          <div className="card-body">
            {/* Step 0 — Photo */}
            {step === 0 && (
              <div>
                <h3>Upload a Photo</h3>
                <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
                  A clear photo helps AI accurately identify the issue and severity.
                </p>
                <CameraCapture
                  onImageCapture={setImageFile}
                  onAnalysisResult={(res) => {
                    setAiResult(res);
                    if (!form.issue_type) setForm((f) => ({ ...f, issue_type: res.issue_type, severity: res.severity }));
                  }}
                />
                {!imageFile && (
                  <p className="report-page__skip-hint">
                    No photo? You can still submit a report →
                  </p>
                )}
              </div>
            )}

            {/* Step 1 — Location */}
            {step === 1 && (
              <div>
                <h3>Set Location</h3>
                <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
                  Pinpoint the exact location of the road issue. GPS or click on the map.
                </p>
                <LocationPicker onLocationSelect={setLocation} />
                {location?.address && (
                  <div className="report-page__location-badge">
                    <MapPin size={14} /> {location.address}
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Details */}
            {step === 2 && (
              <div className="report-page__details">
                <h3>Issue Details</h3>
                {aiResult && (
                  <div className="report-page__ai-hint animate-fadeIn">
                    🤖 AI Suggestion: <strong>{aiResult.issue_type?.replace('_',' ')}</strong>, severity <strong>{aiResult.severity}</strong>
                    &nbsp;({Math.round((aiResult.confidence || 0) * 100)}% confidence)
                  </div>
                )}

                {/* Issue Type */}
                <div className="form-group">
                  <label className="form-label">Issue Type</label>
                  <div className="report-page__type-grid">
                    {ISSUE_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        className={`report-page__type-btn ${form.issue_type === t.value ? 'active' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, issue_type: t.value }))}
                      >
                        <span className="report-page__type-label">{t.label}</span>
                        <span className="report-page__type-desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Severity */}
                <div className="form-group">
                  <label className="form-label">Severity</label>
                  <div className="report-page__severity-grid">
                    {SEVERITIES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={`report-page__severity-btn ${form.severity === s.value ? 'active' : ''}`}
                        style={form.severity === s.value ? { borderColor: s.color, background: `${s.color}15` } : {}}
                        onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                      >
                        <span>{s.label}</span>
                        <span className="report-page__severity-desc">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="title">Title (optional)</label>
                  <input
                    id="title" type="text"
                    className="form-input"
                    placeholder="Brief description of the issue"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                    <label className="form-label" htmlFor="description">Additional Details (optional)</label>
                    <button 
                      type="button" 
                      onClick={toggleListening} 
                      className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                    >
                      {isListening ? <MicOff size={14}/> : <Mic size={14}/>}
                      {isListening ? 'Listening...' : 'Dictate'}
                    </button>
                  </div>
                  <textarea
                    id="description"
                    className="form-textarea"
                    placeholder="Describe the issue in more detail..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <div className="report-page__review">
                <h3>Review & Submit</h3>
                <div className="report-page__review-grid">
                  {[
                    ['Photo',     imageFile ? `📸 ${imageFile.name}` : 'No photo'],
                    ['Location',  location?.address || 'Not set'],
                    ['Latitude',  location ? location.lat?.toFixed(5) : '—'],
                    ['Longitude', location ? location.lng?.toFixed(5) : '—'],
                    ['Issue Type', form.issue_type?.replace('_', ' ') || 'Not set'],
                    ['Severity',  form.severity],
                    ['Title',     form.title || 'Auto-generated'],
                    ['AI Analysis', aiResult ? `${aiResult.issue_type} (${Math.round((aiResult.confidence||0)*100)}%)` : 'Not analyzed'],
                  ].map(([key, val]) => (
                    <div key={key} className="report-page__review-row">
                      <span className="report-page__review-key">{key}</span>
                      <span className="report-page__review-val">{val}</span>
                    </div>
                  ))}
                </div>
                {form.description && (
                  <div className="report-page__review-desc">
                    <span className="report-page__review-key">Details</span>
                    <p>{form.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="toast toast-error animate-fadeIn" style={{ margin: 'var(--space-4) 0' }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {/* Navigation */}
            <div className="report-page__nav">
              {step > 0 && (
                <button className="btn btn-secondary" onClick={handleBack}>
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {step < STEPS.length - 1 ? (
                <button className="btn btn-primary" onClick={handleNext}>
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? <div className="spinner spinner-sm" /> : <CheckCircle size={16} />}
                  {isLoading ? 'Submitting…' : 'Submit Report'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
