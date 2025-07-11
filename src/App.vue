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
      <h2>Manual Barcode Scanner (ZXing + Canvas)</h2>
      <video ref="video" autoplay muted playsinline width="640" height="480" />
      <canvas ref="canvas" class="hidden" width="640" height="480"></canvas>
      <div v-if="result"><strong>Scanned:</strong> {{ result }}</div>
      <button @click="startCamera">Start Camera</button>
      <button @click="stopCamera">Stop Camera</button>
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
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource
} from '@zxing/library'
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
const video = ref(null)
const canvas = ref(null)
const result = ref('')
let stream = null
let reader = null
let interval = null

const startCamera = async () => {
  result.value = ''

  // Start camera
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  })

  video.value.srcObject = stream

  // Initialize reader
  reader = new MultiFormatReader()
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])
  reader.setHints(hints)

  interval = setInterval(decodeFrame, 300)
}

const decodeFrame = () => {
  const ctx = canvas.value.getContext('2d')
  ctx.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height)
  const imageData = ctx.getImageData(0, 0, canvas.value.width, canvas.value.height)

  const luminanceSource = new RGBLuminanceSource(imageData.data, canvas.value.width, canvas.value.height)
  const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))

  try {
    const decoded = reader.decode(binaryBitmap)
    result.value = decoded.getText()
    console.log('Decoded:', result.value)
    stopCamera()
  } catch (err) {
    // nothing found in this frame
  }
}

const stopCamera = () => {
  if (interval) clearInterval(interval)
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}
onUnmounted(() => {
  stopCamera()
})
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
canvas.hidden {
  display: none;
}
video {
  border: 1px solid #ccc;
  border-radius: 8px;
}
</style>
