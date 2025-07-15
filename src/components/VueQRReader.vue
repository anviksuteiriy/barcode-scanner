<template>
    <div>
      <h2>Barcode Scanner (Code 128)</h2>
  
      <label for="camera-select">Select Camera:</label>
      <select id="camera-select" v-model="selectedDeviceId">
        <option disabled value="">-- Choose Camera --</option>
        <option
          v-for="device in videoInputs"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label || `Camera ${deviceIndex(device)}` }}
        </option>
      </select>
  
      <qrcode-stream
        :constraints="cameraConstraints"
        @detect="onDetect"
        @camera-on="onCameraOn"
        @camera-error="onCameraError"
      />
  
      <p v-if="result">✅ Scanned Code 128: {{ result }}</p>
      <p v-else>📷 Waiting for barcode...</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { QrcodeStream } from 'vue-qrcode-reader'
  
  const result = ref('')
  const selectedDeviceId = ref('')
  const videoInputs = ref([])
  
  const onDetect = ([detected]) => {
    console.log('Detected:', detected)
    const code = detected.rawValue || detected.decodedText
  
    // ✅ Only accept Code 128 barcodes
    if (detected.barcodeFormat === 'code_128') {
      result.value = code
    } else {
      console.warn('Ignored non-code_128:', detected.barcodeFormat)
    }
  }
  
  const onCameraOn = () => {
    console.log('✅ Camera started.')
  }
  
  const onCameraError = (err) => {
    console.error('❌ Camera error:', err)
    alert(`Camera Error: ${err.name} - ${err.message}`)
  }
  
  const deviceIndex = (device) => videoInputs.value.indexOf(device)
  
  const cameraConstraints = computed(() => {
    return {
      video: selectedDeviceId.value
        ? { deviceId: { exact: selectedDeviceId.value } }
        : { facingMode: { ideal: 'environment' } },
    }
  })
  
  onMounted(async () => {
    try {
      console.log('📸 Requesting camera permission...')
      await navigator.mediaDevices.getUserMedia({ video: true })
      const devices = await navigator.mediaDevices.enumerateDevices()
      videoInputs.value = devices.filter((d) => d.kind === 'videoinput')
  
      const backCam = videoInputs.value.find((d) =>
        /back|rear/i.test(d.label)
      )
      selectedDeviceId.value =
        backCam?.deviceId || videoInputs.value[0]?.deviceId || ''
      console.log('🎯 Selected Camera:', selectedDeviceId.value)
    } catch (err) {
      console.error('❌ Could not access camera:', err)
      alert('Please allow camera access and reload.')
    }
  })
  </script>
  