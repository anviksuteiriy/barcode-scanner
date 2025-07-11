<template>
  <div>
    <div ref="scannerContainer" class="viewport"></div>
    <button @click="startScanner">Start Scanner</button>
    <button @click="stopScanner">Stop Scanner</button>
    <p v-if="code">Detected Code: {{ code }}</p>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import Quagga from '@ericblade/quagga2'

const scannerContainer = ref(null)
const code = ref(null)
let selectedDeviceId = null

// Get all video input devices and pick back camera (camera 0 or 2 ideally)
async function selectBackCamera() {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoDevices = devices.filter(d => d.kind === 'videoinput')

  // Try to find the first back-facing camera
  const backCam = videoDevices.find(device =>
    device.label.toLowerCase().includes('back') ||
    device.label.toLowerCase().includes('environment') ||
    device.deviceId.includes('2') // fallback for camera 2
  ) || videoDevices[0] // fallback to first if not found

  selectedDeviceId = backCam?.deviceId || null
}

// Start scanner after selecting camera
async function startScanner() {
  await selectBackCamera()

  if (!selectedDeviceId) {
    console.error('No camera found')
    return
  }

  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: scannerContainer.value,
      constraints: {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.777 },
        focusMode: 'continuous',
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
    console.log('Barcode detected:', detectedCode)
    code.value = detectedCode

    // Optional: Quagga.stop()
  })
}

function stopScanner() {
  Quagga.stop()

  // Stop camera video stream completely
  const stream = Quagga?.cameraAccess?.getActiveStream?.()
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }

  code.value = null
}
onBeforeUnmount(() => {
  stopScanner()
})
</script>

<style scoped>
.viewport {
  width: 100%;
  margin: auto;
}
video, canvas {
  display: none;
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
}
</style>
