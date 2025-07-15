<template>
    <div style="width: 100%;">
      <p>Select device ID:</p>
      <select v-model="selectedConstraints">
        <option
          v-for="option in constraintOptions"
          :key="option.label"
          :value="option.constraints"
        >
          {{ option.label }}
        </option>
      </select>
  
      <p>
        Detected codes are visually highlighted in real-time. Use the following dropdown to change the
        flavor:
      </p>
      <select v-model="trackFunctionSelected">
        <option
          v-for="option in trackFunctionOptions"
          :key="option.text"
          :value="option"
        >
          {{ option.text }}
        </option>
      </select>
  
      <p>
        <span
          v-for="option in Object.keys(barcodeFormats)"
          :key="option"
          class="barcode-format-checkbox"
        >
          <input
            type="checkbox"
            v-model="barcodeFormats[option]"
            :id="option"
          />
          <label :for="option">{{ option }}</label>
        </span>
      </p>
  
      <p class="error">{{ error }}</p>
  
      <p class="decode-result">
        Last result: <b>{{ result }}</b>
      </p>
  
      <div>
        <qrcode-stream
          :constraints="selectedConstraints"
          :track="trackFunctionSelected.value"
          :formats="selectedBarcodeFormats"
          @error="onError"
          @detect="onDetect"
          @camera-on="onCameraReady"
        />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { QrcodeStream } from 'vue-qrcode-reader'
  
  /*** detection handling ***/
  const result = ref('')
  function onDetect(detectedCodes) {
    console.log(detectedCodes)
    result.value = JSON.stringify(detectedCodes.map((code) => code.rawValue))
  }
  
  /*** camera selection ***/
  const selectedConstraints = ref({ facingMode: 'environment' })
  const defaultConstraintOptions = [
    { label: 'rear camera', constraints: { facingMode: 'environment' } },
    { label: 'front camera', constraints: { facingMode: 'user' } }
  ]
  const constraintOptions = ref(defaultConstraintOptions)
  
  async function onCameraReady() {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(({ kind }) => kind === 'videoinput')
  
    constraintOptions.value = [
      ...defaultConstraintOptions,
      ...videoDevices.map(({ deviceId, label }) => ({
        label: `${label} (ID: ${deviceId})`,
        constraints: { deviceId }
      }))
    ]
  
    // ✅ Auto-select "camera 2 0" or fallback to rear-facing
    const preferredCam = constraintOptions.value.find(opt =>
      prompt(opt.label)
    )

    // /camera\s*2\s*0|back|rear/i.test(opt.label)
    selectedConstraints.value = preferredCam?.constraints || { facingMode: 'environment' }
  
    error.value = ''
  }
  
  /*** track functions ***/
  function paintOutline(detectedCodes, ctx) {
    for (const detectedCode of detectedCodes) {
      const [firstPoint, ...otherPoints] = detectedCode.cornerPoints
      ctx.strokeStyle = 'red'
      ctx.beginPath()
      ctx.moveTo(firstPoint.x, firstPoint.y)
      for (const { x, y } of otherPoints) {
        ctx.lineTo(x, y)
      }
      ctx.lineTo(firstPoint.x, firstPoint.y)
      ctx.closePath()
      ctx.stroke()
    }
  }
  function paintBoundingBox(detectedCodes, ctx) {
    for (const detectedCode of detectedCodes) {
      const {
        boundingBox: { x, y, width, height }
      } = detectedCode
      ctx.lineWidth = 2
      ctx.strokeStyle = '#007bff'
      ctx.strokeRect(x, y, width, height)
    }
  }
  function paintCenterText(detectedCodes, ctx) {
    for (const detectedCode of detectedCodes) {
      const { boundingBox, rawValue } = detectedCode
      const centerX = boundingBox.x + boundingBox.width / 2
      const centerY = boundingBox.y + boundingBox.height / 2
      const fontSize = Math.max(12, (50 * boundingBox.width) / ctx.canvas.width)
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.lineWidth = 3
      ctx.strokeStyle = '#35495e'
      ctx.strokeText(detectedCode.rawValue, centerX, centerY)
      ctx.fillStyle = '#5cb984'
      ctx.fillText(rawValue, centerX, centerY)
    }
  }
  
  const trackFunctionOptions = [
    { text: 'nothing (default)', value: undefined },
    { text: 'outline', value: paintOutline },
    { text: 'centered text', value: paintCenterText },
    { text: 'bounding box', value: paintBoundingBox }
  ]
  
  // ✅ Default select "outline"
  const trackFunctionSelected = ref(trackFunctionOptions[1])
  
  /*** barcode formats ***/
  const barcodeFormats = ref({
    code_128: true
  })
  const selectedBarcodeFormats = computed(() => {
    return Object.keys(barcodeFormats.value).filter((format) => barcodeFormats.value[format])
  })
  
  /*** error handling ***/
  const error = ref('')
  function onError(err) {
    error.value = `[${err.name}]: `
    if (err.name === 'NotAllowedError') {
      error.value += 'you need to grant camera access permission'
    } else if (err.name === 'NotFoundError') {
      error.value += 'no camera on this device'
    } else if (err.name === 'NotSupportedError') {
      error.value += 'secure context required (HTTPS, localhost)'
    } else if (err.name === 'NotReadableError') {
      error.value += 'is the camera already in use?'
    } else if (err.name === 'OverconstrainedError') {
      error.value += 'installed cameras are not suitable'
    } else if (err.name === 'StreamApiNotSupportedError') {
      error.value += 'Stream API is not supported in this browser'
    } else if (err.name === 'InsecureContextError') {
      error.value += 'Camera access is only permitted in secure context. Use HTTPS or localhost.'
    } else {
      error.value += err.message
    }
  }
  </script>
  
  <style scoped>
  .error {
    font-weight: bold;
    color: red;
  }
  .barcode-format-checkbox {
    margin-right: 10px;
    white-space: nowrap;
    display: inline-block;
  }
  select {
    width: 100%;
  }
  </style>
  