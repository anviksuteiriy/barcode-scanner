<template>
    <div style="width: 100%">
      <p>
        Select Camera:
        <select v-model="selectedDeviceId" @change="startScanner">
          <option
            v-for="device in videoInputDevices"
            :key="device.deviceId"
            :value="device.deviceId"
          >
            {{ device.label || 'Camera ' + device.deviceId }}
          </option>
        </select>
      </p>
  
      <p class="error">{{ error }}</p>
  
      <video ref="videoRef" style="width: 100%; height: auto;" muted playsinline></video>
  
      <p class="decode-result">
        Last Code 128 result: <b>{{ result }}</b>
      </p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import {
  BrowserMultiFormatReader,
  BarcodeFormat
} from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'
  
  const videoRef = ref(null)
  const result = ref('')
  const error = ref('')
  const selectedDeviceId = ref('')
  const videoInputDevices = ref([])
  
  onMounted(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      videoInputDevices.value = devices.filter(d => d.kind === 'videoinput')
  
      // default to back camera
      const backCam = videoInputDevices.value.find(d => /back|rear/i.test(d.label))
      selectedDeviceId.value = backCam?.deviceId || videoInputDevices.value[0]?.deviceId || ''
  
      await startScanner()
    } catch (err) {
      error.value = err.message
    }
  })
  
  onBeforeUnmount(() => {
  if (streamControls) {
    streamControls.stop()
  }
})
  
let codeReader = null
let streamControls = null // holds stop() method

async function startScanner() {
  try {
    if (streamControls) {
      streamControls.stop() // ✅ stop previous scanner
    }

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])

    codeReader = new BrowserMultiFormatReader(hints)

    streamControls = await codeReader.decodeFromVideoDevice(
      selectedDeviceId.value,
      videoRef.value,
      (resultObj) => {
        prompt(resultObj);
        if (resultObj) {
          result.value = resultObj.getText()
        }
      },
      {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        }
      }
    )

    error.value = ''
  } catch (err) {
    error.value = err.message
  }
}
  </script>
  
  <style scoped>
  .error {
    color: red;
    font-weight: bold;
  }
  .decode-result {
    margin-top: 10px;
    font-size: 1.2em;
  }
  select {
    width: 100%;
    margin-bottom: 10px;
  }
  </style>
  