# AI Audio Authenticity Analyzer

A professional, production-ready web application for detecting deepfake audio and verifying speaker authenticity using Machine Learning.

## 🌟 Project Overview

With the rise of sophisticated AI voice cloning, verifying the authenticity of audio is critical. This application provides a two-stage analysis pipeline:
1. **Deepfake Detection:** Analyzes the audio using MFCC features and an SVM classifier to determine if the audio is human-generated or AI-synthesized.
2. **Speaker Verification:** Compares the audio signature against a known speaker model to verify identity.

## 🚀 Tech Stack

- **Backend:** Python, Flask, Gunicorn
- **Machine Learning:** scikit-learn, librosa, numpy, joblib
- **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- **Deployment:** Ready for Render.com

## ⚙️ Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd deepfake-app
   ```

2. **Create a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Add your trained models:**
   Ensure the following files are in the root directory:
   - `Rdeepfake_svm_model.pkl`
   - `Rdeepfake_scaler.pkl`
   - `speaker_model.pkl`

5. **Run the application:**
   ```bash
   python app.py
   ```
   The app will be available at `http://localhost:3000`

## ☁️ How to Deploy on Render

1. Create an account on [Render.com](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name:** ai-audio-analyzer
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Click **Create Web Service**. Render will automatically build and deploy your app.

## 📤 How to Push to GitHub

Run the following commands in your terminal to push this project to GitHub:

```bash
git init
git add .
git commit -m "Initial commit: AI Audio Authenticity Analyzer"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 📸 Demo

*(Add a screenshot of your application here)*
![App Screenshot](placeholder.png)

---
*Developed for robust audio forensics and security.*
