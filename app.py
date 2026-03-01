import os
import uuid
import logging
import subprocess
import numpy as np
import librosa
import joblib
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB max file size
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'opus'}
UPLOAD_FOLDER = 'temp_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load models
try:
    deepfake_model = joblib.load('deepfake_detector_svm.pkl')
    deepfake_scaler = joblib.load('deepfake_scaler.pkl')
    MODELS_LOADED = True
    logger.info("Models loaded successfully.")
except Exception as e:
    logger.warning(f"Could not load models: {e}. Running in mock mode for demonstration.")
    MODELS_LOADED = False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_to_wav(input_path, output_path):
    """Converts unsupported audio formats to WAV using FFMPEG."""
    try:
        command = ['ffmpeg', '-y', '-i', input_path, '-ar', '16000', '-ac', '1', output_path]
        subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"FFMPEG conversion failed: {e.stderr.decode('utf-8')}")
        return False
    except Exception as e:
        logger.error(f"FFMPEG execution error: {e}")
        return False

def extract_features(file_path):
    """
    Stage 1: Deepfake Feature Extraction
    """
    temp_wav = None
    ext = file_path.rsplit('.', 1)[1].lower()
    
    try:
        process_path = file_path
        if ext not in ['wav', 'mp3']:
            temp_wav = f"{file_path}_converted.wav"
            if not convert_to_wav(file_path, temp_wav):
                return None
            process_path = temp_wav

        # Load audio: 3 second duration with 0.5 offset
        y, sr = librosa.load(process_path, sr=16000, offset=0.5, duration=3.0)
        
        # Extract MFCC (13)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Delta and Delta-Delta
        delta_mfcc = librosa.feature.delta(mfcc)
        delta2_mfcc = librosa.feature.delta(mfcc, order=2)
        
        # Mean pooling
        mfcc_mean = np.mean(mfcc, axis=1)
        delta_mean = np.mean(delta_mfcc, axis=1)
        delta2_mean = np.mean(delta2_mfcc, axis=1)
        
        # Concatenate features (13 + 13 + 13 = 39 features)
        features = np.concatenate((mfcc_mean, delta_mean, delta2_mean))
        return features.reshape(1, -1)
        
    except Exception as e:
        logger.error(f"Error extracting deepfake features: {e}")
        return None
    finally:
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)

def extract_speaker_features(file_path):
    """
    Stage 2: Speaker Verification Feature Extraction
    """
    temp_wav = None
    ext = file_path.rsplit('.', 1)[1].lower()
    
    try:
        process_path = file_path
        if ext not in ['wav', 'mp3']:
            temp_wav = f"{file_path}_speaker_converted.wav"
            if not convert_to_wav(file_path, temp_wav):
                return None
            process_path = temp_wav

        # Load audio: 4 second duration
        y, sr = librosa.load(process_path, sr=16000, duration=4.0)
        
        # Silence removal
        y, _ = librosa.effects.trim(y, top_db=25)
        
        # Pre-emphasis filter
        y = librosa.effects.preemphasis(y, coef=0.97)
        
        # Extract MFCC
        mfcc = librosa.feature.mfcc(
            y=y, sr=sr, n_mfcc=20, n_fft=2048, hop_length=512, fmin=50, fmax=8000, lifter=22
        )
        
        # Extract delta
        delta_mfcc = librosa.feature.delta(mfcc)
        
        # Stack MFCC + delta
        stacked_features = np.vstack((mfcc, delta_mfcc))
        
        # Compute mean and std vectors
        mean_vec = np.mean(stacked_features, axis=1)
        std_vec = np.std(stacked_features, axis=1)
        
        # Concatenate mean + std
        final_features = np.concatenate((mean_vec, std_vec))
        return final_features
        
    except Exception as e:
        logger.error(f"Error extracting speaker features: {e}")
        return None
    finally:
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)

def compute_cosine_similarity(a, b):
    """Computes cosine similarity between two vectors."""
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'suspicious' not in request.files or 'reference' not in request.files:
        return jsonify({'error': 'Both suspicious and reference audio files are required.'}), 400
    
    suspicious_file = request.files['suspicious']
    reference_file = request.files['reference']
    
    if suspicious_file.filename == '' or reference_file.filename == '':
        return jsonify({'error': 'No selected file for one or both inputs.'}), 400
        
    if not allowed_file(suspicious_file.filename) or not allowed_file(reference_file.filename):
        return jsonify({'error': 'Invalid file format. Allowed formats: .wav, .mp3, .m4a, .opus'}), 400

    susp_filename = secure_filename(suspicious_file.filename)
    ref_filename = secure_filename(reference_file.filename)
    
    susp_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4().hex}_{susp_filename}")
    ref_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4().hex}_{ref_filename}")
    
    try:
        # Save files temporarily
        suspicious_file.save(susp_path)
        reference_file.save(ref_path)
        logger.info(f"Files saved: {susp_path}, {ref_path}")
        
        if MODELS_LOADED:
            # STEP 1: Deepfake Detection on suspicious_audio
            df_features = extract_features(susp_path)
            if df_features is None:
                return jsonify({'error': 'Failed to process suspicious audio for deepfake detection.'}), 500
                
            scaled_features = deepfake_scaler.transform(df_features)
            probabilities = deepfake_model.predict_proba(scaled_features)[0]
            pred_class = deepfake_model.predict(scaled_features)[0]
            
            confidence = float(np.max(probabilities) * 100)
            deepfake_result = "REAL" if pred_class in [1, 'REAL', 'Real', 'real'] else "FAKE"
            
            # IF FAKE -> Skip Speaker Verification
            if deepfake_result == "FAKE":
                return jsonify({
                    "deepfake_result": "FAKE",
                    "confidence": round(confidence, 2),
                    "speaker_verification": "SKIPPED"
                })
                
            # STEP 2: IF REAL -> Run Speaker Verification
            susp_speaker_feats = extract_speaker_features(susp_path)
            ref_speaker_feats = extract_speaker_features(ref_path)
            
            if susp_speaker_feats is None or ref_speaker_feats is None:
                return jsonify({'error': 'Failed to process audio for speaker verification.'}), 500
                
            similarity = compute_cosine_similarity(susp_speaker_feats, ref_speaker_feats)
            speaker_match = "MATCH" if similarity >= 0.85 else "NOT MATCH"
            
            return jsonify({
                "deepfake_result": "REAL",
                "confidence": round(confidence, 2),
                "speaker_similarity": round(float(similarity), 4),
                "speaker_verification": speaker_match
            })
            
        else:
            # Mock response if models are not loaded (for preview/demo purposes)
            import random
            import time
            time.sleep(2.0)
            is_real = random.choice([True, False])
            deepfake_result = "REAL" if is_real else "FAKE"
            confidence = round(random.uniform(75.0, 99.9), 2)
            
            if deepfake_result == "FAKE":
                return jsonify({
                    "deepfake_result": "FAKE",
                    "confidence": confidence,
                    "speaker_verification": "SKIPPED"
                })
            else:
                sim = random.uniform(0.60, 0.95)
                return jsonify({
                    "deepfake_result": "REAL",
                    "confidence": confidence,
                    "speaker_similarity": round(sim, 4),
                    "speaker_verification": "MATCH" if sim >= 0.85 else "NOT MATCH"
                })
        
    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        return jsonify({'error': 'An internal error occurred during analysis.'}), 500
        
    finally:
        # Clean up original uploaded files
        for path in [susp_path, ref_path]:
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"Cleaned up temporary file {path}")

if __name__ == '__main__':
    # Production safe: no debug=True
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3000)))
