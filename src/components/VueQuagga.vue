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

// 🟩 Select the back camera based on label/deviceId
async function selectBackCamera() {
  // Ask for permission to access camera so labels are populated
  await navigator.mediaDevices.getUserMedia({ video: true })
  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoDevices = devices.filter(device => device.kind === 'videoinput')

  // Try to find a back/environment camera
  const backCamera = videoDevices.find(device =>
    device.label.toLowerCase().includes('back') ||
    device.label.toLowerCase().includes('environment')
  )

  return backCamera?.deviceId || videoDevices[0]?.deviceId || null
}

// 🟩 Start scanner with selected back camera
async function startScanner() {
  const deviceId = await selectBackCamera()
  if (!deviceId) {
    console.error('No back camera found')
    return
  }

  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: scannerContainer.value,
      constraints: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.777 },
      },
    },
    locator: {
      patchSize: 'medium',
      halfSample: false,
    },
    decoder: {
      readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'upc_reader'],
    },
    locate: true,
    numOfWorkers: navigator.hardwareConcurrency || 4,
  }, err => {
    if (err) {
      console.error('Quagga init failed:', err)
      return
    }
    Quagga.start()
  })

  Quagga.onDetected(result => {
    const detectedCode = result.codeResult.code
    console.log('📦 Barcode detected:', detectedCode)
    code.value = detectedCode

    // Optionally stop after one detection:
    // stopScanner()
  })
}

// 🟥 Stop scanner and fully release camera stream
function stopScanner() {
  Quagga.stop()

  // Stop video stream manually
  const stream = Quagga?.cameraAccess?.getActiveStream?.()
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }

  // Optional: Clear DOM
  scannerContainer.value.innerHTML = ''

  code.value = null
}

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<style scoped>
.viewport {
  width: 100%;
  max-width: 720px;
  margin: auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
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
  border: none;
  background-color: #42b883;
  color: white;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}
button:hover {
  background-color: #33996c;
}
</style>
