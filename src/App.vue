<template>
  <div class="container">
    <div>Ver 1.6.0</div>
    <input
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      @change="onFilesSelected"
    />
    <button @click="tryUploadQueue">Force Sync</button>
    <ul>
      <li v-for="(item) in queue" :key="item.id">
        {{ item.itemId }} - {{ item.fileName }} - {{ item.uploaded ? 'Uploaded' : 'Pending' }}
      </li>
    </ul>
    <div v-for="(item, index) in uploadedItems" class="text-green" :key="index">
      {{ item }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const queue = ref([]);
const uploadedItems = ref([]);

function loadQueue() {
  queue.value = JSON.parse(localStorage.getItem('uploadQueue') || '[]');
}

function saveQueue() {
  localStorage.setItem('uploadQueue', JSON.stringify(queue.value));
}

function addToQueue(itemId, file) {
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result;

    queue.value.push({
      id: Date.now() + Math.random(), // make unique
      itemId,
      fileName: file.name,
      data: base64,
      uploaded: false,
    });

    saveQueue();
  };
  reader.readAsDataURL(file);
}

function onFilesSelected(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const itemId = prompt('Enter item ID for these images:');
  if (!itemId) return;

  files.forEach(file => addToQueue(itemId, file));

  // Try immediate upload attempt
  tryUploadQueue();
}

async function tryUploadQueue() {
  const pending = queue.value.filter(item => !item.uploaded);
  const remaining = [];

  for (const item of pending) {
    if (item.uploaded) continue;

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
      console.log(uploadedItems.value);
      // Mark uploaded
      item.uploaded = true;
      uploadedItems.value.push(`${item.fileName} is uploaded now.`);
      

      item.uploaded = true;
    } catch (err) {
      console.warn(`Failed to upload ${item.fileName}`, err);
      remaining.push(item);
    }
  }

  // Keep only non-uploaded items
  queue.value = remaining;
  saveQueue();
}

onMounted(() => {
  loadQueue();
  window.addEventListener('online', tryUploadQueue);
});
</script>

<style scoped>
input {
  margin-bottom: 1rem;
}
</style>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
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
</style>
