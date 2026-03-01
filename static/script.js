document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectedFileDiv = document.getElementById('selected-file');
    const filenameSpan = document.getElementById('filename');
    const removeFileBtn = document.getElementById('remove-file');
    const analyzeBtn = document.getElementById('analyze-btn');
    const errorMessage = document.getElementById('error-message');
    
    const uploadSection = document.getElementById('upload-section');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');
    const resetBtn = document.getElementById('reset-btn');

    let currentFile = null;

    // File Drag & Drop Handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        
        // Validate file type
        const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!validTypes.includes(file.type) && !['wav', 'mp3'].includes(extension)) {
            showError('Invalid file format. Please upload a .wav or .mp3 file.');
            return;
        }

        // Validate file size (16MB max)
        if (file.size > 16 * 1024 * 1024) {
            showError('File is too large. Maximum size is 16MB.');
            return;
        }

        currentFile = file;
        filenameSpan.textContent = file.name;
        
        dropZone.classList.add('hidden');
        selectedFileDiv.classList.remove('hidden');
        analyzeBtn.disabled = false;
        hideError();
    }

    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        selectedFileDiv.classList.add('hidden');
        dropZone.classList.remove('hidden');
        analyzeBtn.disabled = true;
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // Analyze Button Click
    analyzeBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // UI State change
        uploadSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        const formData = new FormData();
        formData.append('audio', currentFile);

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

        // Verdict Badge
        const verdictBadge = document.getElementById('verdict-badge');
        const verdictIcon = document.getElementById('verdict-icon');
        const verdictText = document.getElementById('verdict-text');

        verdictBadge.className = 'verdict-badge'; // reset
        if (data.deepfake_result === 'REAL') {
            verdictBadge.classList.add('real');
            verdictIcon.className = 'fas fa-check-circle';
            verdictText.textContent = 'REAL AUDIO';
        } else {
            verdictBadge.classList.add('fake');
            verdictIcon.className = 'fas fa-exclamation-triangle';
            verdictText.textContent = 'DEEPFAKE DETECTED';
        }

        // Confidence Bar
        const confidenceBar = document.getElementById('confidence-bar');
        const confidenceValue = document.getElementById('confidence-value');
        
        // Animate progress bar
        setTimeout(() => {
            confidenceBar.style.width = `${data.confidence}%`;
        }, 100);
        
        confidenceValue.textContent = `${data.confidence.toFixed(1)}%`;
        
        confidenceBar.className = 'progress-bar-fill';
        if (data.confidence > 85) {
            confidenceBar.classList.add('high');
        } else if (data.confidence > 60) {
            confidenceBar.classList.add('medium');
        } else {
            confidenceBar.classList.add('low');
        }

        // Speaker Verification
        const speakerBadge = document.getElementById('speaker-badge');
        const speakerIcon = document.getElementById('speaker-icon');
        const speakerText = document.getElementById('speaker-text');

        speakerBadge.className = 'speaker-badge';
        if (data.speaker_match === 'MATCH') {
            speakerBadge.classList.add('match');
            speakerIcon.className = 'fas fa-user-check';
            speakerText.textContent = 'SPEAKER MATCH';
        } else {
            speakerBadge.classList.add('mismatch');
            speakerIcon.className = 'fas fa-user-times';
            speakerText.textContent = 'SPEAKER MISMATCH';
        }
    }

    // Reset Button
    resetBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        
        // Reset file input
        currentFile = null;
        fileInput.value = '';
        selectedFileDiv.classList.add('hidden');
        dropZone.classList.remove('hidden');
        analyzeBtn.disabled = true;
        
        // Reset progress bar
        document.getElementById('confidence-bar').style.width = '0%';
    });
});
