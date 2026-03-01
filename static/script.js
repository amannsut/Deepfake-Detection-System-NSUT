document.addEventListener('DOMContentLoaded', () => {
    // Suspicious Audio Elements
    const dropZoneSusp = document.getElementById('drop-zone-susp');
    const fileInputSusp = document.getElementById('file-input-susp');
    const selectedFileDivSusp = document.getElementById('selected-file-susp');
    const filenameSpanSusp = document.getElementById('filename-susp');
    const removeFileBtnSusp = document.getElementById('remove-file-susp');

    // Reference Audio Elements
    const dropZoneRef = document.getElementById('drop-zone-ref');
    const fileInputRef = document.getElementById('file-input-ref');
    const selectedFileDivRef = document.getElementById('selected-file-ref');
    const filenameSpanRef = document.getElementById('filename-ref');
    const removeFileBtnRef = document.getElementById('remove-file-ref');

    const analyzeBtn = document.getElementById('analyze-btn');
    const errorMessage = document.getElementById('error-message');
    
    const uploadSection = document.getElementById('upload-section');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');
    const resetBtn = document.getElementById('reset-btn');

    let suspiciousFile = null;
    let referenceFile = null;

    // --- Suspicious Audio Handlers ---
    setupDragAndDrop(dropZoneSusp, fileInputSusp, (file) => {
        if (validateFile(file)) {
            suspiciousFile = file;
            updateFileUI(file, dropZoneSusp, selectedFileDivSusp, filenameSpanSusp);
            checkAnalyzeReady();
        }
    });

    removeFileBtnSusp.addEventListener('click', () => {
        suspiciousFile = null;
        fileInputSusp.value = '';
        resetFileUI(dropZoneSusp, selectedFileDivSusp);
        checkAnalyzeReady();
    });

    // --- Reference Audio Handlers ---
    setupDragAndDrop(dropZoneRef, fileInputRef, (file) => {
        if (validateFile(file)) {
            referenceFile = file;
            updateFileUI(file, dropZoneRef, selectedFileDivRef, filenameSpanRef);
            checkAnalyzeReady();
        }
    });

    removeFileBtnRef.addEventListener('click', () => {
        referenceFile = null;
        fileInputRef.value = '';
        resetFileUI(dropZoneRef, selectedFileDivRef);
        checkAnalyzeReady();
    });

    // --- Helper Functions ---
    function setupDragAndDrop(dropZone, fileInput, callback) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt.files.length > 0) callback(dt.files[0]);
        });

        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) callback(this.files[0]);
        });
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function validateFile(file) {
        const validExtensions = ['wav', 'mp3', 'm4a', 'opus'];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!validExtensions.includes(extension)) {
            showError('Invalid file format. Please upload a .wav, .mp3, .m4a, or .opus file.');
            return false;
        }

        if (file.size > 10 * 1024 * 1024) {
            showError('File is too large. Maximum size is 10MB.');
            return false;
        }
        
        hideError();
        return true;
    }

    function updateFileUI(file, dropZone, selectedDiv, filenameSpan) {
        filenameSpan.textContent = file.name;
        dropZone.classList.add('hidden');
        selectedDiv.classList.remove('hidden');
    }

    function resetFileUI(dropZone, selectedDiv) {
        selectedDiv.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    function checkAnalyzeReady() {
        if (suspiciousFile && referenceFile) {
            analyzeBtn.disabled = false;
        } else {
            analyzeBtn.disabled = true;
        }
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // --- Analyze Button Click ---
    analyzeBtn.addEventListener('click', async () => {
        if (!suspiciousFile || !referenceFile) return;

        uploadSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        const formData = new FormData();
        formData.append('suspicious', suspiciousFile);
        formData.append('reference', referenceFile);

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze audio');
            }

            displayResults(data);

        } catch (error) {
            console.error('Error:', error);
            uploadSection.classList.remove('hidden');
            loadingSection.classList.add('hidden');
            showError(error.message);
        }
    });

    function displayResults(data) {
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        // --- Stage 1: Deepfake Result ---
        const verdictBadge = document.getElementById('verdict-badge');
        const verdictIcon = document.getElementById('verdict-icon');
        const verdictText = document.getElementById('verdict-text');
        const confidenceBar = document.getElementById('confidence-bar');
        const confidenceValue = document.getElementById('confidence-value');

        verdictBadge.className = 'verdict-badge'; // reset
        if (data.deepfake_result === 'REAL') {
            verdictBadge.classList.add('real');
            verdictIcon.className = 'fas fa-check-circle';
            verdictText.textContent = 'AUTHENTIC AUDIO';
        } else {
            verdictBadge.classList.add('fake');
            verdictIcon.className = 'fas fa-exclamation-triangle';
            verdictText.textContent = 'DEEPFAKE DETECTED';
        }

        setTimeout(() => {
            confidenceBar.style.width = `${data.confidence}%`;
        }, 100);
        
        confidenceValue.textContent = `${data.confidence.toFixed(1)}%`;
        confidenceBar.className = 'progress-bar-fill';
        if (data.confidence > 85) confidenceBar.classList.add('high');
        else if (data.confidence > 60) confidenceBar.classList.add('medium');
        else confidenceBar.classList.add('low');

        // --- Stage 2: Speaker Verification Result ---
        const speakerResultContainer = document.getElementById('speaker-result-container');
        const speakerSkippedContainer = document.getElementById('speaker-skipped-container');
        
        if (data.speaker_verification === 'SKIPPED') {
            speakerResultContainer.classList.add('hidden');
            speakerSkippedContainer.classList.remove('hidden');
        } else {
            speakerSkippedContainer.classList.add('hidden');
            speakerResultContainer.classList.remove('hidden');
            
            const speakerBadge = document.getElementById('speaker-badge');
            const speakerIcon = document.getElementById('speaker-icon');
            const speakerText = document.getElementById('speaker-text');
            const speakerSimBar = document.getElementById('speaker-sim-bar');
            const speakerSimValue = document.getElementById('speaker-sim-value');

            speakerBadge.className = 'verdict-badge'; // reset
            if (data.speaker_verification === 'MATCH') {
                speakerBadge.classList.add('real');
                speakerIcon.className = 'fas fa-user-check';
                speakerText.textContent = 'SPEAKER MATCH';
                speakerSimBar.className = 'progress-bar-fill high';
            } else {
                speakerBadge.classList.add('fake');
                speakerIcon.className = 'fas fa-user-times';
                speakerText.textContent = 'NOT A MATCH';
                speakerSimBar.className = 'progress-bar-fill low';
            }

            const simPercentage = (data.speaker_similarity * 100).toFixed(1);
            setTimeout(() => {
                speakerSimBar.style.width = `${simPercentage}%`;
            }, 100);
            
            speakerSimValue.textContent = data.speaker_similarity.toFixed(4);
        }
    }

    // --- Reset Button ---
    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        
        suspiciousFile = null;
        referenceFile = null;
        fileInputSusp.value = '';
        fileInputRef.value = '';
        
        resetFileUI(dropZoneSusp, selectedFileDivSusp);
        resetFileUI(dropZoneRef, selectedFileDivRef);
        
        analyzeBtn.disabled = true;
        
        document.getElementById('confidence-bar').style.width = '0%';
        document.getElementById('speaker-sim-bar').style.width = '0%';
    });
});
