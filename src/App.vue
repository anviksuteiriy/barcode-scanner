<template>
  <div class="container">
    <div>Ver 2.0</div>
    <input
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      @change="onFilesSelected"
    />
    <button @click="tryUploadQueue">Force Sync</button>
    <div>
      <h2>Code 128 Scanner</h2>
      <video ref="videoRef" width="320" height="240" autoplay muted playsinline />
      <div v-if="scannedCode" class="mt-4">
        <strong>Scanned:</strong> {{ scannedCode }}
      </div>
      <button @click="startScanner" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Start</button>
      <button @click="stopScanner" class="ml-2 px-4 py-2 bg-red-600 text-white rounded">Stop</button>
    </div>
    <ul>
      <li v-for="(item) in queue" :key="item.id">
        {{ item.itemId }} - {{ item.fileName }} - {{ item.uploaded ? 'Uploaded' : 'Pending' }}
      </li>
    </ul>
    <div v-for="(item, index) in uploadedItems" class="text-green" :key="index">
      {{ item }}
    </div>

    <div v-for="(text, index) in quotas" class="quotas" :key="index">
      {{ text }}
    </div>

    <div v-if="uploadPausedOrNetworkIssue">
      {{ uploadPausedOrNetworkIssue }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import {
  addToIndexedDB,
  getAllFromIndexedDB,
  deleteFromIndexedDB
} from '@/utils/db';

const queue = ref([]);
const uploadedItems = ref([]);
const quotas = ref([]);
const uploadPausedOrNetworkIssue = ref("");

// this is for barcode 128 scanner
const videoRef = ref(null)
const scannedCode = ref(null)

const reader = new BrowserMultiFormatReader()
const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.UPC_A,
])
reader.setHints(hints)

let streamControls = null

const startScanner = async () => {
  scannedCode.value = null

  const devices = await navigator.mediaDevices.enumerateDevices()
  const videoInputDevices = devices.filter(device => device.kind === 'videoinput')

  const rearCamera = videoInputDevices.find(device =>
    device.label.toLowerCase().includes('back') ||
    device.label.toLowerCase().includes('rear') ||
    device.label.toLowerCase().includes('environment')
  )

  const selectedDeviceId = rearCamera?.deviceId || videoInputDevices[0]?.deviceId
  if (!selectedDeviceId) {
    console.error('No camera found')
    return
  }

  streamControls = await reader.decodeFromVideoDevice(
    selectedDeviceId,
    videoRef.value,
    (result, error) => {
      if (result) {
        const text = result.getText()
        if (text !== scannedCode.value) {
          scannedCode.value = text
          console.log('Scanned:', text)
          // comment out to keep scanning:
          // controls.stop()
        }
      } else if (error && error.name !== 'NotFoundException') {
        console.warn('Decode error:', error.message)
      }
    },
    {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    }
  )
}

const stopScanner = () => {
  if (streamControls) {
    streamControls.stop()
    streamControls = null
  }
}

onUnmounted(stopScanner)
// this is for barcode 128 scanner
async function loadQueue() {
  queue.value = await getAllFromIndexedDB();
}

async function addToQueue(itemId, file) {
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;
    const newItem = {
      id: Date.now() + Math.random(), // unique
      itemId,
      fileName: file.name,
      data: base64,
      uploaded: false
    };
    await addToIndexedDB(newItem);
    queue.value.push(newItem);
    const { usage } = await navigator.storage.estimate();
    quotas.value.pop();
    quotas.value.push(`Used: ${Math.round(usage / 1024 / 1024)} MB`);
  };
  reader.readAsDataURL(file);
}

function onFilesSelected(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const itemId = prompt('Enter item ID for these images:');
  if (!itemId) return;

  files.forEach(file => addToQueue(itemId, file));

  // Try upload after small delay
  setTimeout(() => tryUploadQueue(), 500);
}

async function tryUploadQueue() {
  // 🛑 Check: Are we online?
  if (!navigator.onLine) {
    console.warn('Device is offline. Upload paused.');
    uploadPausedOrNetworkIssue.value = 'Offline - Upload paused.';
    return;
  }

  // 🐢 Optional: Check for slow or constrained network
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    const slowTypes = ['slow-2g', '2g', '3g'];
    const effectiveType = connection.effectiveType;
    const saveData = connection.saveData;

    if (slowTypes.includes(effectiveType) || saveData) {
      console.warn(`Network is too slow (${effectiveType}) or data saving is enabled.`);
      uploadPausedOrNetworkIssue.value = `Slow or limited network (${effectiveType}) - Upload skipped.`;
      return;
    }
  }

  const pending = queue.value.filter(item => !item.uploaded);
  const successfulUploads = [];

  for (const item of pending) {
    try {
      await fetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.itemId,
          fileName: item.fileName,
          image: item.data,
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (uploadPausedOrNetworkIssue.value) {
        uploadPausedOrNetworkIssue.value = "";
      }
      uploadedItems.value.push(`${item.fileName} uploaded`);
      successfulUploads.push(item.id);
    } catch (err) {
      console.warn(`Failed to upload ${item.fileName}`, err);
    }
  }

  for (const id of successfulUploads) {
    await deleteFromIndexedDB(id);
  }

  await loadQueue();
}

onMounted(async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { quota, usage } = await navigator.storage.estimate();
    quotas.value.push(`Quota: ${Math.round(quota / 1024 / 1024)} MB`);
    quotas.value.push(`Used: ${Math.round(usage / 1024 / 1024)} MB`);
  }

  await loadQueue();
  window.addEventListener('online', tryUploadQueue);
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
input {
  margin-bottom: 16px;
}
.text-green {
  color: #42b983;
}
.quotas {
  color: black;
  font-weight: 500;
  font-size: 18px;
  margin-top: 16px;
}
video {
  width: 100%;
  max-height: 300px;
  border: 1px solid #ccc;
}
</style>
