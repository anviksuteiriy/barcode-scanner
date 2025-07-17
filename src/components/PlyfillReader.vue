<template>
  <div style="width: 100%">
    <p>
      Select camera:
      <select v-model="selectedConstraints" @change="startScan">
        <option
          v-for="option in constraintOptions"
          :key="option.label"
          :value="option.constraints"
        >
          {{ option.label }}
        </option>
      </select>
    </p>

    <p class="error">{{ error }}</p>

    <p class="decode-result">
      Last result: <b>{{ result }}</b>
    </p>

    <video ref="videoRef" autoplay muted playsinline style="width: 100%; max-width: 600px;"></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import 'barcode-detector' // loads sec‑ant polyfill

const result = ref('')
const error = ref('')
const selectedConstraints = ref({ facingMode: 'environment' })
const constraintOptions = ref([
  { label: 'Rear Camera', constraints: { facingMode: 'environment' } },
  { label: 'Front Camera', constraints: { facingMode: 'user' } }
])

const videoRef = ref(null)
let stream = null
let scannerInterval = null
let detector = null

async function onError(e) {
  error.value = `Error: ${e.name || e.message}`
}

async function startScan() {
  clearScan()
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: selectedConstraints.value })
    videoRef.value.srcObject = stream
    await videoRef.value.play()

    detector = new window.BarcodeDetector({ formats: ['code_128'] })
    error.value = ''

    scannerInterval = setInterval(async () => {
      try {
        const codes = await detector.detect(videoRef.value)
        if (codes.length) {
          result.value = codes.map(c => c.rawValue).join(', ')
          clearScan()
        }
      } catch (e) {
        onError(e)
      }
    }, 300)
  } catch (e) {
    onError(e)
  }
}

function clearScan() {
  if (scannerInterval) clearInterval(scannerInterval)
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}

onMounted(startScan)
onBeforeUnmount(clearScan)
</script>

<style scoped>
.error {
  font-weight: bold;
  color: red;
}
.decode-result {
  margin-top: 1rem;
  font-size: 1.2em;
}
select {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1rem;
}
</style>
