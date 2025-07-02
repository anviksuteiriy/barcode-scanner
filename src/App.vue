<template>
  <div class="container">
    <input
      type="file"
      accept="image/*"
      capture="environment"
      @change="handleCapture"
    />
  </div>
</template>

<script setup>
function handleCapture(event) {
  const file = event.target.files[0];
  if (file) {
    // You can use this file (image taken from back camera)
    console.log('Captured image:', file);
    // Optional: pass it to a scanner or upload it
  }
}
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
.container {
  display: flex;
  justify-content: center;
}
</style>
