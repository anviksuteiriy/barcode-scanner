<template>
  <button class="" @click="startCamera">Open camera</button>
</template>

<script>
export default {
  methods: {
    async startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log(stream);
      } catch (err) {
        console.error("Error accessing camera:", err);
        // Handle permission denial or other errors
      }
    }
  }
}
</script>

<style>
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
</style>
