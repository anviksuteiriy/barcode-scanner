<template>
  <div>
    <video ref="video" autoplay playsinline></video>
  </div>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount } from 'vue';

const video = ref(null);
let stream = null;

const startCamera = async () => {
  try {
    // Try back camera first
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: 'environment' } }
    });
  } catch (err) {
    console.warn('Back camera not found, using default camera', err);
    // Fallback to default camera
    stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });
  }

  if (video.value) {
    video.value.srcObject = stream;
  }
};

onMounted(() => {
  startCamera();
});

onBeforeUnmount(() => {
  // Clean up the stream
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});
</script>

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
video {
  width: 100%;
  height: auto;
  border-radius: 10px;
  background: #000;
}
</style>
