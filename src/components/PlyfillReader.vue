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

    <video
      ref="videoRef"
      autoplay
      muted
      playsinline
      style="width: 100%; max-width: 600px;"
    ></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import 'barcode-detector' // sec-ant polyfill

const result = ref('')
const error = ref('')
const videoRef = ref(null)
const selectedConstraints = ref({}) // will be set to rear cam in onMounted
const constraintOptions = ref([])

let stream = null
let scannerInterval = null
let detector = null

async function onError(e) {
  error.value = `Error: ${e.name || e.message}`
}

// Detect all cameras and label them nicely
async function populateCameraOptions() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')

    // constraintOptions.value = videoDevices.map((device, index) => {
    //   const isBack = /back|rear|environment/i.test(device.label)
    //   const label = device.label || `Camera ${index + 1}`
    //   return {
    //     label: isBack ? `Back Camera (${label})` : `Front Camera (${label})`,
    //     constraints: {
    //       deviceId: { exact: device.deviceId },
    //       width: { ideal: 1920 },
    //       height: { ideal: 1080 }
    //     }
    //   }
    // })

    constraintOptions.value = videoDevices.map((device, index) => {
      const label = device.label || `Camera ${index + 1}`
      return {
        label,
        constraints: {
          deviceId: { exact: device.deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      }
    })

    // Try to auto-select back camera
    const backCam = constraintOptions.value.find(opt =>
      /back|rear|environment/i.test(opt.label)
    )
    selectedConstraints.value = backCam?.constraints || constraintOptions.value[0]?.constraints || {}
  } catch (e) {
    onError(e)
  }
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
          // clearScan()
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

onMounted(async () => {
  await populateCameraOptions()
  await startScan()
})

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
