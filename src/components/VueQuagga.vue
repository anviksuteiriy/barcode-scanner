<template>
  <div>
    <div ref="scannerContainer" class="viewport"></div>

    <div class="controls">
      <button @click="startScanner">Start Scanner</button>
      <button @click="stopScanner">Stop Scanner</button>
    </div>

    <p v-if="code">✅ Detected Code: <strong>{{ code }}</strong></p>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import Quagga from '@ericblade/quagga2'

const scannerContainer = ref(null)
const code = ref(null)

function startScanner() {
  console.log('📷 Starting scanner...')
  if (!scannerContainer.value) {
    console.error('❌ Scanner container missing')
    return
  }

  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: scannerContainer.value,
      constraints: {
        facingMode: { ideal: 'environment' }, // back camera
        width: { ideal: 1920 },
        height: { ideal: 720 }
      },
    },
    locator: {
      patchSize: 'medium',
      halfSample: false,
    },
    decoder: {
      readers: ['code_128_reader', 'ean_reader'],
    },
    locate: true,
    numOfWorkers: navigator.hardwareConcurrency || 4,
  }, err => {
    if (err) {
      console.error('❌ Quagga init failed:', err)
      return
    }
    console.log('✅ Quagga initialized, starting...')
    Quagga.start()
  })

  Quagga.onDetected(result => {
    const scanned = result.codeResult.code
    console.log('📦 Detected:', scanned)
    code.value = scanned
  })
}

function stopScanner() {
  console.log('🛑 Stopping scanner...')
  Quagga.stop()

  const stream = Quagga?.cameraAccess?.getActiveStream?.()
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    console.log('✅ Stream stopped')
  }

  scannerContainer.value.innerHTML = ''
  code.value = null
}

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<style>
.viewport {
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
  position: relative;
  width: 90vw;
  height: 75vh; /* or 100% if inside a container with fixed height */
  background: black;
  overflow: hidden;
}

/* Force video to fill the container */
.viewport video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover; /* maintain aspect ratio */
}

/* Make canvas fill container exactly like video */
.viewport canvas.drawingBuffer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none;
}
video, canvas {
  width: 100%;
  height: auto;
  display: block;
}
.controls {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}
button {
  padding: 0.6rem 1.2rem;
  background-color: #42b883;
  color: white;
  font-weight: bold;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
</style>
