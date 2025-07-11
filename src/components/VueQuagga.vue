<template>
    <div>
      <div id="scanner-container" ref="scannerRef" class="scanner-box"></div>
      <div v-if="code" class="result">
        ✅ Scanned: {{ code }}
      </div>
      <button @click="startScanner" class="start-btn">Start</button>
      <button @click="stopScanner" class="stop-btn">Stop</button>
    </div>
  </template>
  
  <script setup>
  import { onUnmounted, ref } from 'vue';
  import Quagga from '@ericblade/quagga2';

  const code = ref("");
  const scannerRef = ref(null);

const onDetected = result => {
  const scanned = result?.codeResult?.code
  if (scanned) {
    code.value = scanned
    console.log('✅ Detected:', scanned)
    stopScanner()
  }
}

const startScanner = () => {
  Quagga.init({
    inputStream: {
      type: 'LiveStream',
      constraints: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      target: scannerRef.value,
    },
    decoder: {
      readers: ['code_128_reader'], // You can add more if needed
    },
    locate: true,
    numOfWorkers: navigator.hardwareConcurrency || 4,
  }, (err) => {
    if (err) {
      console.error('Quagga init error:', err)
      return
    }
    Quagga.start()
    Quagga.onDetected(onDetected)

    console.log('📷 Quagga started')
  })
}

const stopScanner = () => {
  try {
    Quagga.stop()
    Quagga.offDetected(onDetected)

    // Remove video from DOM
    const video = scannerRef.value.querySelector('video')
    if (video) {
      video.srcObject?.getTracks().forEach(track => track.stop()) // stops webcam
      video.remove()
    }

    // Also remove canvas if Quagga added it
    const canvas = scannerRef.value.querySelector('canvas')
    if (canvas) canvas.remove()

    console.log('🛑 Scanner fully stopped and video removed')
  } catch (err) {
    console.warn('Error while stopping:', err)
  }
}

onUnmounted(stopScanner)
  </script>
  
  <style>
  .scanner-box {
    width: 100%;
    height: 300px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    overflow: hidden;
  }
  .scanner-box--open {
    height: 100%;
  }
  .result {
    margin-top: 1rem;
    font-weight: bold;
  }
  .start-btn, .stop-btn {
    margin-top: 1rem;
    margin-right: 0.5rem;
    padding: 8px 12px;
    border-radius: 4px;
    border: none;
    color: white;
  }
  .start-btn { background-color: #28a745; }
  .stop-btn { background-color: #dc3545; }
  </style>
  