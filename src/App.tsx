/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, FileAudio, X, ArrowRight, CheckCircle, AlertTriangle, UserCheck, UserX, RotateCcw } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'results' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState<{
    deepfake_result: string;
    confidence: number;
    speaker_match: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(selectedFile.type) && !['wav', 'mp3'].includes(extension || '')) {
      setErrorMessage('Invalid file format. Please upload a .wav or .mp3 file.');
      setStatus('error');
      return;
    }

    if (selectedFile.size > 16 * 1024 * 1024) {
      setErrorMessage('File is too large. Maximum size is 16MB.');
      setStatus('error');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setErrorMessage('');
  };

  const handleAnalyze = () => {
    if (!file) return;
    
    setStatus('analyzing');
    
    // Simulate API call to the Python backend
    setTimeout(() => {
      const isReal = Math.random() > 0.5;
      setResults({
        deepfake_result: isReal ? 'REAL' : 'FAKE',
        confidence: Number((Math.random() * (99.9 - 75.0) + 75.0).toFixed(2)),
        speaker_match: isReal && Math.random() > 0.3 ? 'MATCH' : 'NOT MATCH'
      });
      setStatus('results');
    }, 2500);
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans relative overflow-hidden flex flex-col items-center">
      {/* Background Shapes */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[80px] -top-[100px] -left-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[80px] -bottom-[200px] -right-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
        <div className="absolute w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] top-[40%] left-[60%] animate-pulse" style={{ animationDuration: '10s' }}></div>
      </div>

      <div className="w-full max-w-3xl p-8 z-10 flex flex-col min-h-screen">
        <header className="text-center my-12 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 text-blue-400 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <Upload size={36} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            AI Audio Authenticity Analyzer
          </h1>
          <p className="text-slate-400 text-lg">Detect Deepfake Voices with Advanced AI</p>
        </header>

        <main className="flex-1 flex flex-col">
          {/* Upload Section */}
          {(status === 'idle' || status === 'error') && (
            <section className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] flex flex-col gap-6 animate-fade-in-up">
              {!file ? (
                <div 
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 bg-white/5 hover:border-blue-400 hover:bg-blue-500/5'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className={`mx-auto mb-4 w-12 h-12 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                  <h3 className="text-xl font-semibold mb-2">Drag & Drop Audio File</h3>
                  <p className="text-slate-400 mb-4">or click to browse</p>
                  <span className="text-xs text-slate-500">Supported formats: .wav, .mp3 (Max 16MB)</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".wav,.mp3" 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="flex items-center bg-white/5 p-4 rounded-xl border border-white/10">
                  <FileAudio className="text-blue-400 w-8 h-8 mr-4" />
                  <span className="flex-1 font-medium truncate">{file.name}</span>
                  <button 
                    onClick={() => setFile(null)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-2"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <button 
                onClick={handleAnalyze}
                disabled={!file}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-slate-500 disabled:cursor-not-allowed text-white border-none py-4 px-8 rounded-xl text-lg font-semibold flex justify-center items-center gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.6)] disabled:shadow-none"
              >
                <span>Analyze Audio</span>
                <ArrowRight size={20} />
              </button>
              
              {status === 'error' && (
                <div className="bg-red-500/10 text-red-300 p-4 rounded-xl border border-red-500/30 text-center text-sm">
                  {errorMessage}
                </div>
              )}
            </section>
          )}

          {/* Loading Section */}
          {status === 'analyzing' && (
            <section className="flex flex-col items-center justify-center py-16">
              <div className="flex items-center justify-center gap-2 mb-8 h-12">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-2 bg-blue-500 rounded-full animate-pulse"
                    style={{ 
                      height: i % 2 === 0 ? '40px' : '20px',
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.8s'
                    }}
                  ></div>
                ))}
              </div>
              <p className="text-slate-400 text-lg animate-pulse">Analyzing audio signatures...</p>
              <p className="text-slate-500 text-sm mt-2">(Simulated analysis for preview)</p>
            </section>
          )}

          {/* Results Section */}
          {status === 'results' && results && (
            <section className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.36)] animate-fade-in-up">
              <h2 className="text-center text-2xl text-slate-300 mb-8">Analysis Results</h2>
              
              <div className="flex justify-center mb-10">
                <div className={`flex items-center gap-3 px-8 py-4 rounded-full text-2xl font-bold tracking-wider shadow-[0_10px_30px_rgba(0,0,0,0.2)] border-2 ${
                  results.deepfake_result === 'REAL' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                    : 'bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                }`}>
                  {results.deepfake_result === 'REAL' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                  <span>{results.deepfake_result === 'REAL' ? 'REAL AUDIO' : 'DEEPFAKE DETECTED'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-4 text-slate-300 font-medium">
                    <span>Confidence Score</span>
                    <span className="text-white font-bold text-xl">{results.confidence.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        results.confidence > 85 ? 'bg-emerald-500' : 
                        results.confidence > 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${results.confidence}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
                  <div className="text-slate-300 font-medium mb-4">Speaker Verification</div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-lg w-fit ${
                    results.speaker_match === 'MATCH'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}>
                    {results.speaker_match === 'MATCH' ? <UserCheck size={24} /> : <UserX size={24} />}
                    <span>{results.speaker_match === 'MATCH' ? 'SPEAKER MATCH' : 'SPEAKER MISMATCH'}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleReset}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 px-6 rounded-xl text-base font-medium flex justify-center items-center gap-2 transition-all duration-300"
              >
                <RotateCcw size={18} />
                <span>Analyze Another File</span>
              </button>
            </section>
          )}
        </main>
        
        <footer className="mt-auto py-8 text-center text-slate-500 text-sm">
          <p>&copy; 2026 AI Audio Authenticity Analyzer. Powered by SVM & MFCC.</p>
        </footer>
      </div>
    </div>
  );
}

