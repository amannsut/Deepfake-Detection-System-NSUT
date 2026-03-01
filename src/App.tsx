import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, X, ArrowRight, CheckCircle, AlertTriangle, UserCheck, UserX, RotateCcw, ShieldAlert, Mic, Square } from 'lucide-react';

type Stage = 'upload_suspicious' | 'analyzing_deepfake' | 'deepfake_results' | 'provide_reference' | 'analyzing_speaker' | 'final_results';

export default function App() {
  const [stage, setStage] = useState<Stage>('upload_suspicious');
  const [suspiciousFile, setSuspiciousFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [refType, setRefType] = useState<'upload' | 'record'>('upload');
  
  const [deepfakeResult, setDeepfakeResult] = useState<{ result: string; confidence: number } | null>(null);
  const [speakerResult, setSpeakerResult] = useState<{ similarity: number; match: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const suspInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'susp' | 'ref') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File is too large. Maximum size is 10MB.');
        return;
      }
      setErrorMessage('');
      if (type === 'susp') setSuspiciousFile(file);
      else setReferenceFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], "live_recording.webm", { type: 'audio/webm' });
        setReferenceFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      setErrorMessage("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAnalyzeDeepfake = async () => {
    if (!suspiciousFile) return;
    setStage('analyzing_deepfake');
    
    // Simulate API call for preview
    setTimeout(() => {
      const isReal = Math.random() > 0.3;
      setDeepfakeResult({
        result: isReal ? 'REAL' : 'FAKE',
        confidence: Number((Math.random() * (99.9 - 75.0) + 75.0).toFixed(2))
      });
      setStage('deepfake_results');
    }, 2500);
  };

  const handleAnalyzeSpeaker = async () => {
    if (!suspiciousFile || !referenceFile) return;
    setStage('analyzing_speaker');
    
    // Simulate API call for preview
    setTimeout(() => {
      const sim = Math.random() * (0.95 - 0.60) + 0.60;
      setSpeakerResult({
        similarity: Number(sim.toFixed(4)),
        match: sim >= 0.85 ? 'MATCH' : 'NOT MATCH'
      });
      setStage('final_results');
    }, 2500);
  };

  const resetAll = () => {
    setStage('upload_suspicious');
    setSuspiciousFile(null);
    setReferenceFile(null);
    setDeepfakeResult(null);
    setSpeakerResult(null);
    setRefType('upload');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans relative overflow-hidden flex flex-col items-center">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[80px] -top-[100px] -left-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[80px] -bottom-[200px] -right-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>

      <div className="w-full max-w-3xl p-8 z-10 flex flex-col min-h-screen">
        <header className="text-center my-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 mb-4 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Forensic Audio Analyzer
          </h1>
          <p className="text-slate-400">Two-Stage Deepfake Detection & Speaker Verification</p>
        </header>

        <main className="flex-1 flex flex-col">
          {errorMessage && (
            <div className="bg-red-500/10 text-red-300 p-4 rounded-xl border border-red-500/30 text-center text-sm mb-6">
              {errorMessage}
            </div>
          )}

          {/* STAGE 1: UPLOAD SUSPICIOUS */}
          {stage === 'upload_suspicious' && (
            <section className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 animate-fade-in-up">
              <h2 className="text-xl font-semibold text-white text-center mb-2">Stage 1: Upload Suspicious Audio</h2>
              
              {!suspiciousFile ? (
                <div 
                  className="border-2 border-dashed border-white/10 bg-white/5 hover:border-blue-400 hover:bg-blue-500/5 rounded-2xl p-10 text-center cursor-pointer transition-all"
                  onClick={() => suspInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-3 w-10 h-10 text-slate-400" />
                  <p className="text-slate-300 font-medium mb-1">Click to upload evidence</p>
                  <span className="text-xs text-slate-500">.wav, .mp3, .m4a, .opus (Max 10MB)</span>
                  <input type="file" ref={suspInputRef} onChange={(e) => handleFileChange(e, 'susp')} accept=".wav,.mp3,.m4a,.opus" className="hidden" />
                </div>
              ) : (
                <div className="flex items-center bg-white/5 p-4 rounded-xl border border-white/10">
                  <FileAudio className="text-blue-400 w-8 h-8 mr-4 flex-shrink-0" />
                  <span className="flex-1 font-medium truncate">{suspiciousFile.name}</span>
                  <button onClick={() => setSuspiciousFile(null)} className="text-slate-400 hover:text-red-400 p-2"><X size={20} /></button>
                </div>
              )}

              <button 
                onClick={handleAnalyzeDeepfake} disabled={!suspiciousFile}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-4 rounded-xl text-lg font-semibold flex justify-center items-center gap-2 transition-all"
              >
                <span>Run Deepfake Detection</span> <ArrowRight size={20} />
              </button>
            </section>
          )}

          {/* STAGE 1: ANALYZING */}
          {stage === 'analyzing_deepfake' && (
            <section className="flex flex-col items-center justify-center py-20">
              <div className="flex items-center gap-2 mb-6 h-12">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="w-2 bg-blue-500 rounded-full animate-pulse" style={{ height: i % 2 === 0 ? '40px' : '20px', animationDelay: `${i * 0.15}s` }}></div>
                ))}
              </div>
              <p className="text-slate-300 text-xl font-medium animate-pulse">Analyzing for synthetic artifacts...</p>
            </section>
          )}

          {/* STAGE 1: RESULTS */}
          {stage === 'deepfake_results' && deepfakeResult && (
            <section className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
              <h2 className="text-center text-xl text-slate-300 mb-6 font-semibold">Stage 1: Authenticity Result</h2>
              
              <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border mb-8 ${
                deepfakeResult.result === 'REAL' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
              }`}>
                {deepfakeResult.result === 'REAL' ? <CheckCircle size={48} className="text-emerald-400 mb-4" /> : <AlertTriangle size={48} className="text-red-400 mb-4" />}
                <h3 className={`text-2xl font-bold mb-2 ${deepfakeResult.result === 'REAL' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {deepfakeResult.result === 'REAL' ? 'AUTHENTIC AUDIO' : 'DEEPFAKE DETECTED'}
                </h3>
                <p className="text-slate-300">SVM Confidence: <span className="font-bold text-white">{deepfakeResult.confidence.toFixed(1)}%</span></p>
              </div>

              {deepfakeResult.result === 'REAL' ? (
                <button onClick={() => setStage('provide_reference')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl text-lg font-semibold flex justify-center items-center gap-2 transition-all">
                  <span>Proceed to Stage 2: Speaker Verification</span> <ArrowRight size={20} />
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-slate-400 mb-6">Audio is synthetic. Speaker verification is not applicable.</p>
                  <button onClick={resetAll} className="bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-medium flex justify-center items-center gap-2 mx-auto transition-all">
                    <RotateCcw size={18} /> <span>Start Over</span>
                  </button>
                </div>
              )}
            </section>
          )}

          {/* STAGE 2: PROVIDE REFERENCE */}
          {stage === 'provide_reference' && (
            <section className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 animate-fade-in-up">
              <h2 className="text-xl font-semibold text-white text-center mb-2">Stage 2: Provide Reference Audio</h2>
              
              <div className="flex bg-black/30 p-1 rounded-lg mb-4">
                <button onClick={() => setRefType('upload')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${refType === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Upload File</button>
                <button onClick={() => setRefType('record')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${refType === 'record' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Record Live</button>
              </div>

              {refType === 'upload' ? (
                !referenceFile ? (
                  <div className="border-2 border-dashed border-white/10 bg-white/5 hover:border-blue-400 hover:bg-blue-500/5 rounded-2xl p-8 text-center cursor-pointer transition-all" onClick={() => refInputRef.current?.click()}>
                    <Upload className="mx-auto mb-3 w-8 h-8 text-slate-400" />
                    <p className="text-slate-300 font-medium mb-1">Upload known voice sample</p>
                    <input type="file" ref={refInputRef} onChange={(e) => handleFileChange(e, 'ref')} accept=".wav,.mp3,.m4a,.opus" className="hidden" />
                  </div>
                ) : (
                  <div className="flex items-center bg-white/5 p-4 rounded-xl border border-white/10">
                    <FileAudio className="text-emerald-400 w-8 h-8 mr-4 flex-shrink-0" />
                    <span className="flex-1 font-medium truncate">{referenceFile.name}</span>
                    <button onClick={() => setReferenceFile(null)} className="text-slate-400 hover:text-red-400 p-2"><X size={20} /></button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-2xl">
                  {referenceFile ? (
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                      <p className="text-white font-medium mb-4">Live recording saved</p>
                      <button onClick={() => setReferenceFile(null)} className="text-sm text-slate-400 hover:text-white underline">Record again</button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all ${isRecording ? 'bg-red-500/20 text-red-500 border-2 border-red-500 animate-pulse' : 'bg-blue-500/20 text-blue-400 border-2 border-blue-500 hover:bg-blue-500/30'}`}
                      >
                        {isRecording ? <Square size={28} /> : <Mic size={32} />}
                      </button>
                      <p className="text-slate-300 font-medium">{isRecording ? `Recording... 00:${recordingTime.toString().padStart(2, '0')}` : 'Click to start recording'}</p>
                    </>
                  )}
                </div>
              )}

              <button 
                onClick={handleAnalyzeSpeaker} disabled={!referenceFile}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-4 rounded-xl text-lg font-semibold flex justify-center items-center gap-2 transition-all mt-2"
              >
                <span>Verify Speaker Identity</span> <ArrowRight size={20} />
              </button>
            </section>
          )}

          {/* STAGE 2: ANALYZING */}
          {stage === 'analyzing_speaker' && (
            <section className="flex flex-col items-center justify-center py-20">
              <div className="flex items-center gap-2 mb-6 h-12">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="w-2 bg-purple-500 rounded-full animate-pulse" style={{ height: i % 2 === 0 ? '40px' : '20px', animationDelay: `${i * 0.15}s` }}></div>
                ))}
              </div>
              <p className="text-slate-300 text-xl font-medium animate-pulse">Comparing speaker biometrics...</p>
            </section>
          )}

          {/* FINAL RESULTS */}
          {stage === 'final_results' && deepfakeResult && speakerResult && (
            <section className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
              <h2 className="text-center text-2xl text-slate-300 mb-8 font-semibold">Final Forensic Report</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Stage 1: Authenticity</h3>
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 mb-4">
                    <CheckCircle size={20} /> AUTHENTIC AUDIO
                  </div>
                  <p className="text-sm text-slate-400">Confidence: <span className="text-white font-medium">{deepfakeResult.confidence.toFixed(1)}%</span></p>
                </div>

                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                  <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Stage 2: Speaker Identity</h3>
                  <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl font-bold mb-4 border ${
                    speakerResult.match === 'MATCH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {speakerResult.match === 'MATCH' ? <UserCheck size={20} /> : <UserX size={20} />}
                    {speakerResult.match === 'MATCH' ? 'SPEAKER MATCH' : 'NOT A MATCH'}
                  </div>
                  <p className="text-sm text-slate-400">Similarity: <span className="text-white font-medium">{speakerResult.similarity}</span></p>
                </div>
              </div>

              <button onClick={resetAll} className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-xl text-base font-medium flex justify-center items-center gap-2 transition-all">
                <RotateCcw size={18} /> <span>Start New Analysis</span>
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
