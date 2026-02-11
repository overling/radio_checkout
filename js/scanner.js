/**
 * Barcode / QR Code Scanner Module
 * Supports webcam scanning and USB handheld scanner (keyboard emulation).
 */
const Scanner = (() => {
    let cameraStream = null;
    let scanCallback = null;
    let scannerActive = false;
    let keyBuffer = '';
    let keyTimer = null;
    let globalKeyHandler = null;

    // USB Scanner Detection (keyboard emulation)
    // USB scanners type characters very fast and end with Enter
    function startKeyboardListener(callback) {
        stopKeyboardListener();
        scanCallback = callback;
        globalKeyHandler = (e) => {
            // Only capture when an input with class 'scan-target' is focused or no input focused
            const active = document.activeElement;
            const isScanInput = active && active.classList.contains('scan-target');

            if (!isScanInput) return;

            if (e.key === 'Enter' && keyBuffer.length > 2) {
                e.preventDefault();
                const scanned = keyBuffer.trim();
                keyBuffer = '';
                if (scanCallback) scanCallback(scanned);
                // Clear the input field
                if (active && active.tagName === 'INPUT') {
                    active.value = '';
                }
                return;
            }

            if (e.key.length === 1) {
                keyBuffer += e.key;
                clearTimeout(keyTimer);
                keyTimer = setTimeout(() => { keyBuffer = ''; }, 200);
            }
        };
        document.addEventListener('keydown', globalKeyHandler, true);
    }

    function stopKeyboardListener() {
        if (globalKeyHandler) {
            document.removeEventListener('keydown', globalKeyHandler, true);
            globalKeyHandler = null;
        }
        keyBuffer = '';
        scanCallback = null;
    }

    // Camera Scanner
    async function startCamera(callback) {
        scanCallback = callback;
        const overlay = document.getElementById('scanner-overlay');
        const video = document.getElementById('scanner-video');
        overlay.classList.remove('hidden');

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            video.srcObject = cameraStream;
            scannerActive = true;

            // Try to use ZXing for decoding
            if (typeof ZXingBrowser !== 'undefined' || typeof ZXing !== 'undefined') {
                startZXingDecoding(video, callback);
            } else {
                // Fallback: manual frame analysis not available, show message
                console.warn('ZXing library not loaded. Camera scanning requires manual code entry.');
            }
        } catch (err) {
            console.error('Camera access error:', err);
            stopCamera();
            throw new Error('Could not access camera. Please check permissions or use a USB scanner.');
        }
    }

    function startZXingDecoding(video, callback) {
        const BrowserReader = (typeof ZXingBrowser !== 'undefined')
            ? ZXingBrowser
            : (typeof ZXing !== 'undefined' ? ZXing : null);

        if (!BrowserReader) return;

        try {
            // Try different ZXing API patterns
            let reader;
            if (BrowserReader.BrowserMultiFormatReader) {
                reader = new BrowserReader.BrowserMultiFormatReader();
            } else if (BrowserReader.BrowserQRCodeReader) {
                reader = new BrowserReader.BrowserQRCodeReader();
            } else {
                console.warn('No compatible ZXing reader found');
                return;
            }

            const decodeLoop = () => {
                if (!scannerActive) return;

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                try {
                    if (reader.decodeFromCanvas) {
                        const result = reader.decodeFromCanvas(canvas);
                        if (result && result.text) {
                            callback(result.text);
                            stopCamera();
                            return;
                        }
                    }
                } catch (e) {
                    // No code found in this frame, continue
                }

                if (scannerActive) {
                    requestAnimationFrame(decodeLoop);
                }
            };

            // Wait for video to be ready
            video.addEventListener('loadeddata', () => {
                setTimeout(decodeLoop, 500);
            }, { once: true });

            if (video.readyState >= 2) {
                setTimeout(decodeLoop, 500);
            }
        } catch (e) {
            console.warn('ZXing initialization error:', e);
        }
    }

    function stopCamera() {
        scannerActive = false;
        const overlay = document.getElementById('scanner-overlay');
        const video = document.getElementById('scanner-video');

        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            cameraStream = null;
        }
        if (video) video.srcObject = null;
        if (overlay) overlay.classList.add('hidden');
    }

    // Generate QR Code as data URL
    async function generateQR(text, size = 200) {
        if (typeof QRCode === 'undefined') {
            console.warn('QRCode library not loaded');
            return null;
        }
        try {
            return await QRCode.toDataURL(text, {
                width: size,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' }
            });
        } catch (e) {
            console.error('QR generation error:', e);
            return null;
        }
    }

    // Generate QR Code to canvas
    async function generateQRToCanvas(canvas, text, size = 200) {
        if (typeof QRCode === 'undefined') return;
        try {
            await QRCode.toCanvas(canvas, text, { width: size, margin: 1 });
        } catch (e) {
            console.error('QR canvas error:', e);
        }
    }

    // Generate Code 128 barcode to SVG element
    function generateBarcode(svgElement, text) {
        if (typeof JsBarcode === 'undefined') {
            console.warn('JsBarcode library not loaded');
            return;
        }
        try {
            JsBarcode(svgElement, text, {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                margin: 5
            });
        } catch (e) {
            console.error('Barcode generation error:', e);
        }
    }

    // Init close button
    function init() {
        const closeBtn = document.getElementById('scanner-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', stopCamera);
        }
    }

    return {
        startKeyboardListener,
        stopKeyboardListener,
        startCamera,
        stopCamera,
        generateQR,
        generateQRToCanvas,
        generateBarcode,
        init
    };
})();
