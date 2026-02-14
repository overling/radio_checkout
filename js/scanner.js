/**
 * Barcode / QR Code Scanner Module
 * Supports webcam scanning via html5-qrcode and USB handheld scanner (keyboard emulation).
 * Recognized formats: QR, Code 128, Code 39, EAN, UPC, PDF417, Data Matrix, and more.
 */
const Scanner = (() => {
    let html5Scanner = null;
    let scanCallback = null;
    let keyBuffer = '';
    let keyTimer = null;
    let globalKeyHandler = null;

    // Text-to-speech using Web Speech API
    function speak(text) {
        try {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.1;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            // Speech not available — silent fallback
        }
    }

    // Beep sound using Web Audio API — plays on every successful camera scan
    let audioCtx = null;
    function beep(frequency = 1800, duration = 150, volume = 0.3) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.value = frequency;
            gain.gain.value = volume;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
            osc.stop(audioCtx.currentTime + duration / 1000);
        } catch (e) {
            // Audio not available — silent fallback
        }
    }

    // After camera starts, try to apply zoom and focus for better barcode reading
    // Delayed slightly to ensure the video track is fully initialized
    function applyAdvancedCameraSettings() {
        setTimeout(async () => {
            try {
                const videoEl = document.querySelector('video');
                if (!videoEl || !videoEl.srcObject) return;
                const track = videoEl.srcObject.getVideoTracks()[0];
                if (!track) return;
                const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                const settings = {};
                if (capabilities.zoom) {
                    settings.zoom = Math.min(2.0, capabilities.zoom.max || 1);
                }
                if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                    settings.focusMode = 'continuous';
                }
                if (Object.keys(settings).length > 0) {
                    await track.applyConstraints({ advanced: [settings] });
                    console.log('Applied camera settings:', settings);
                }
            } catch (e) {
                // Advanced settings not supported — no problem
            }
        }, 1000);
    }

    // USB Scanner Detection (keyboard emulation)
    // USB scanners type characters very fast (5-20ms per char).
    // Some scanners append Enter/CR after the barcode, some don't.
    // We handle both:
    //   1. Enter key with buffered chars → submit immediately
    //   2. No Enter, but rapid chars stop arriving for 80ms → submit (debounce)
    // Human typing is much slower (~100-300ms/char) and won't trigger the debounce.
    const SCAN_DEBOUNCE_MS = 80;  // gap after last char to auto-submit
    const MIN_SCAN_LENGTH = 3;    // minimum chars to consider a valid scan

    function startKeyboardListener(callback) {
        stopKeyboardListener();
        scanCallback = callback;
        globalKeyHandler = (e) => {
            // Only capture when an input with class 'scan-target' is focused
            const active = document.activeElement;
            const isScanInput = active && active.classList.contains('scan-target');

            if (!isScanInput) return;

            // Enter key with buffered chars → submit immediately
            if (e.key === 'Enter' && keyBuffer.length >= MIN_SCAN_LENGTH) {
                e.preventDefault();
                clearTimeout(keyTimer);
                const scanned = keyBuffer.trim();
                keyBuffer = '';
                if (scanCallback) scanCallback(scanned);
                if (active && active.tagName === 'INPUT') {
                    active.value = '';
                }
                return;
            }

            // Enter with no/short buffer → ignore (normal keyboard Enter)
            if (e.key === 'Enter') return;

            // Accumulate printable characters
            if (e.key.length === 1) {
                keyBuffer += e.key;
                clearTimeout(keyTimer);
                // Auto-submit after a short gap (handles scanners without Enter)
                keyTimer = setTimeout(() => {
                    if (keyBuffer.length >= MIN_SCAN_LENGTH) {
                        const scanned = keyBuffer.trim();
                        keyBuffer = '';
                        if (scanCallback) scanCallback(scanned);
                        // Clear the input field
                        const el = document.activeElement;
                        if (el && el.tagName === 'INPUT' && el.classList.contains('scan-target')) {
                            el.value = '';
                        }
                    } else {
                        keyBuffer = '';
                    }
                }, SCAN_DEBOUNCE_MS);
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

    // Camera Scanner using html5-qrcode
    async function startCamera(callback) {
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Camera scanner library not loaded. Please check your internet connection and reload.');
        }

        const overlay = document.getElementById('scanner-overlay');
        overlay.classList.remove('hidden');

        // Clear any previous scanner instance
        const readerEl = document.getElementById('scanner-reader');
        readerEl.innerHTML = '';

        const supportedFormats = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.CODABAR
        ];

        const scanConfig = {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                // Large scan region — 90% width, 70% height
                return {
                    width: Math.max(Math.floor(viewfinderWidth * 0.9), 250),
                    height: Math.max(Math.floor(viewfinderHeight * 0.7), 150)
                };
            },
            aspectRatio: 1.333,
            disableFlip: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        };

        const onSuccess = (decodedText, decodedResult) => {
            console.log('Scanned:', decodedText, decodedResult?.result?.format?.formatName);
            beep();
            callback(decodedText);
            stopCamera();
        };

        const onFailure = (errorMessage) => {
            // No code found in this frame — normal, ignore
        };

        try {
            html5Scanner = new Html5Qrcode('scanner-reader', {
                formatsToSupport: supportedFormats,
                verbose: false
            });

            await html5Scanner.start(
                { facingMode: 'environment' },
                scanConfig,
                onSuccess,
                onFailure
            );
            applyAdvancedCameraSettings();
        } catch (err) {
            console.error('Camera start error:', err);
            // If environment camera fails, try user-facing camera
            try {
                if (html5Scanner) {
                    try { await html5Scanner.stop(); } catch (e) {}
                    try { html5Scanner.clear(); } catch (e) {}
                }
                readerEl.innerHTML = '';
                html5Scanner = new Html5Qrcode('scanner-reader', {
                    formatsToSupport: supportedFormats,
                    verbose: false
                });
                await html5Scanner.start(
                    { facingMode: 'user' },
                    scanConfig,
                    onSuccess,
                    onFailure
                );
                applyAdvancedCameraSettings();
            } catch (err2) {
                console.error('Fallback camera error:', err2);
                stopCamera();
                throw new Error('Could not access any camera. Check permissions or use a USB scanner.');
            }
        }
    }

    async function stopCamera() {
        const overlay = document.getElementById('scanner-overlay');

        if (html5Scanner) {
            try {
                // Html5QrcodeScannerState: NOT_STARTED=1, SCANNING=2, PAUSED=3
                const state = html5Scanner.getState();
                if (state === 2 || state === 3) {
                    await html5Scanner.stop();
                }
            } catch (e) {
                // Ignore stop errors
            }
            try {
                html5Scanner.clear();
            } catch (e) {
                // Ignore clear errors
            }
            html5Scanner = null;
        }

        // Also clear the reader element to remove any leftover video
        const readerEl = document.getElementById('scanner-reader');
        if (readerEl) readerEl.innerHTML = '';

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
    function generateBarcode(svgElement, text, opts = {}) {
        if (typeof JsBarcode === 'undefined') {
            console.warn('JsBarcode library not loaded');
            return;
        }
        try {
            JsBarcode(svgElement, text, {
                format: 'CODE128',
                width: opts.width || 2,
                height: opts.height || 50,
                displayValue: opts.displayValue !== undefined ? opts.displayValue : true,
                fontSize: opts.fontSize || 12,
                margin: opts.margin !== undefined ? opts.margin : 5
            });
        } catch (e) {
            console.error('Barcode generation error:', e);
        }
    }

    // Inline camera scanner — renders into a specific DOM element, stays open continuously
    // Calls callback on each successful scan, with a cooldown to prevent duplicate reads
    let inlineScanner = null;
    let inlineCooldown = false;

    async function startInlineCamera(elementId, callback, cooldownMs = 1500) {
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error('Camera scanner library not loaded.');
        }

        await stopInlineCamera();

        const el = document.getElementById(elementId);
        if (!el) throw new Error('Scanner element not found: ' + elementId);
        el.innerHTML = '';

        const supportedFormats = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.CODABAR
        ];

        inlineScanner = new Html5Qrcode(elementId, {
            formatsToSupport: supportedFormats,
            verbose: false
        });

        const config = {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                return {
                    width: Math.max(Math.floor(viewfinderWidth * 0.9), 250),
                    height: Math.max(Math.floor(viewfinderHeight * 0.7), 150)
                };
            },
            aspectRatio: 1.333,
            disableFlip: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        };

        const onSuccess = (decodedText) => {
            if (inlineCooldown) return;
            inlineCooldown = true;
            beep();
            callback(decodedText);
            setTimeout(() => { inlineCooldown = false; }, cooldownMs);
        };

        try {
            await inlineScanner.start(
                { facingMode: 'environment' },
                config,
                onSuccess,
                () => {}
            );
            applyAdvancedCameraSettings();
        } catch (err) {
            // Fallback to user-facing camera
            try {
                if (inlineScanner) {
                    try { await inlineScanner.stop(); } catch (e) {}
                    try { inlineScanner.clear(); } catch (e) {}
                }
                el.innerHTML = '';
                inlineScanner = new Html5Qrcode(elementId, {
                    formatsToSupport: supportedFormats,
                    verbose: false
                });
                await inlineScanner.start(
                    { facingMode: 'user' },
                    config,
                    onSuccess,
                    () => {}
                );
                applyAdvancedCameraSettings();
            } catch (err2) {
                await stopInlineCamera();
                throw new Error('Could not access camera.');
            }
        }
    }

    async function stopInlineCamera() {
        if (inlineScanner) {
            try {
                const state = inlineScanner.getState();
                if (state === 2 || state === 3) {
                    await inlineScanner.stop();
                }
            } catch (e) {}
            try { inlineScanner.clear(); } catch (e) {}
            inlineScanner = null;
        }
        inlineCooldown = false;
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
        startInlineCamera,
        stopInlineCamera,
        generateQR,
        generateQRToCanvas,
        generateBarcode,
        speak,
        beep,
        init
    };
})();
