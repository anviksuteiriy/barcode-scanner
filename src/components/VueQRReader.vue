<template>
    <div>
      <!-- Camera Selector -->
      <label for="camera-select">Select Camera:</label>
      <select id="camera-select" v-model="selectedDeviceId">
        <option disabled value="">-- Choose Camera --</option>
        <option v-for="device in videoInputs" :key="device.deviceId" :value="device.deviceId">
          {{ device.label || `Camera ${deviceIndex(device)}` }}
        </option>
      </select>
  
      <!-- Barcode Scanner -->
      <qrcode-stream
        :constraints="cameraConstraints"
        @detect="onDetect"
        @camera-on="onCameraOn"
        @camera-error="onCameraError"
      />
  
      <p v-if="result">Scanned: {{ result }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { QrcodeStream } from 'vue-qrcode-reader'
  
  const videoInputs = ref([])
  const selectedDeviceId = ref('')
  const result = ref(null)
  
  const onDetect = ([detected]) => {
    const code = detected.rawValue || detected.decodedText
    if (detected.barcodeFormat === 'code_128') {
      result.value = code
    }
  }
  
  const onCameraOn = () => {
    console.log('Camera is on.')
  }
  
  const onCameraError = (err) => {
    console.error('Camera error:', err)
  }
  
  const deviceIndex = (device) => videoInputs.value.indexOf(device)
  
  const cameraConstraints = computed(() => ({
    video: {
      deviceId: selectedDeviceId.value ? { exact: selectedDeviceId.value } : undefined,
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  }))
  
  onMounted(async () => {
    try {
      // Ask for permission first (required to get device labels)
      await navigator.mediaDevices.getUserMedia({ video: true })
      const devices = await navigator.mediaDevices.enumerateDevices()
      videoInputs.value = devices.filter(d => d.kind === 'videoinput')
  
      // Auto-select the first back-facing camera (if available)
      const backCam = videoInputs.value.find(d => /back|rear/i.test(d.label))
      selectedDeviceId.value = backCam?.deviceId || videoInputs.value[0]?.deviceId || ''
    } catch (err) {
      console.error('Camera access error:', err)
    }
  })
  </script>
  