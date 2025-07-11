<template>
  <div>
    <div ref="scannerContainer" class="viewport"></div>
    <button @click="startScanner">Start</button>
    <button @click="stopScanner">Stop</button>
    <p v-if="code">Detected Code: {{ code }}</p>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import Quagga from '@ericblade/quagga2'

const scannerContainer = ref(null)
const code = ref(null)

async function startScanner() {
  // Start directly using facingMode: environment
  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: scannerContainer.value,
      constraints: {
        facingMode: { exact: 'environment' }, // Try to use back camera directly
        width: { ideal: 1920 },
        height: { ideal: 720 }
      }
    },
    locator: {
      patchSize: 'medium',
      halfSample: false,
    },
    decoder: {
      readers: ['code_128_reader', 'ean_reader'],
    },
    locate: true,
  }, (err) => {
    if (err) {
      console.error('❌ Quagga init failed:', err)
      return
    }
    console.log('✅ Quagga init success')
    Quagga.start()
  })

  Quagga.onDetected(result => {
    const scanned = result.codeResult.code
    console.log('📦 Barcode Detected:', scanned)
    code.value = scanned
    // Optionally stop scanning: stopScanner()
  })
}

function stopScanner() {
  Quagga.stop()
  const stream = Quagga?.cameraAccess?.getActiveStream?.()
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
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
}
video, canvas {
  width: 100%;
  height: auto;
}
</style>
