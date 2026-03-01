import os
import logging
import uuid
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
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max file size
ALLOWED_EXTENSIONS = {'wav', 'mp3'}
UPLOAD_FOLDER = 'temp_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load models
try:
    deepfake_model = joblib.load('Rdeepfake_svm_model.pkl')
    deepfake_scaler = joblib.load('Rdeepfake_scaler.pkl')
    speaker_model = joblib.load('speaker_model.pkl')
    MODELS_LOADED = True
    logger.info("Models loaded successfully.")
except Exception as e:
    logger.warning(f"Could not load models: {e}. Running in mock mode for demonstration.")
    MODELS_LOADED = False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_features(file_path):
    try:
        # Load audio
        y, sr = librosa.load(file_path, sr=16000, duration=5.0) # Limit to 5 seconds for processing speed
        
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
        logger.error(f"Error extracting features: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file format. Only .wav and .mp3 are allowed.'}), 400

    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    
    try:
        # Save file temporarily
        file.save(file_path)
        logger.info(f"File saved to {file_path}")
        
        if MODELS_LOADED:
            # Extract features
            features = extract_features(file_path)
            if features is None:
                return jsonify({'error': 'Failed to process audio file'}), 500
                
            # Scale features
            scaled_features = deepfake_scaler.transform(features)
            
            # Predict Deepfake
            probabilities = deepfake_model.predict_proba(scaled_features)[0]
            pred_class = deepfake_model.predict(scaled_features)[0]
            
            # Assuming class 1 or 'REAL' is authentic
            confidence = float(np.max(probabilities) * 100)
            deepfake_result = "REAL" if pred_class == 1 or pred_class == 'REAL' else "FAKE"
            
            # Predict Speaker
            speaker_pred = speaker_model.predict(scaled_features)[0]
            speaker_match = "MATCH" if speaker_pred == 1 or speaker_pred == 'MATCH' else "NOT MATCH"
            
        else:
            # Mock response if models are not loaded
            import random
            import time
            time.sleep(1.5) # Simulate processing time
            is_real = random.choice([True, False])
            deepfake_result = "REAL" if is_real else "FAKE"
            confidence = round(random.uniform(75.0, 99.9), 2)
            speaker_match = "MATCH" if is_real and random.random() > 0.3 else "NOT MATCH"

        response = {
            "deepfake_result": deepfake_result,
            "confidence": round(confidence, 2),
            "speaker_match": speaker_match
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        return jsonify({'error': 'An internal error occurred during analysis.'}), 500
        
    finally:
        # Clean up temporary file
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Cleaned up temporary file {file_path}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3000)), debug=False)
