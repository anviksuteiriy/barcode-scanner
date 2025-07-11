<template>
    <div ref="scannerRef" class="quagga-scanner"></div>
  </template>
  
  <script setup>
  import { onMounted, onUnmounted, ref, defineProps, defineEmits } from 'vue'
  import Quagga from 'quagga'
  
  const props = defineProps({
    reader: {
      type: String,
      default: 'code_128_reader' // You can override this
    },
    locate: {
      type: Boolean,
      default: true
    },
    constraints: {
      type: Object,
      default: () => ({
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      })
    },
    stopOnDetection: {
      type: Boolean,
      default: true
    }
  })
  
  const emit = defineEmits(['init', 'error', 'detected'])
  
  const scannerRef = ref(null)
  
  const onDetected = (result) => {
    const code = result?.codeResult?.code
    if (code) {
      emit('detected', code)
      if (props.stopOnDetection) {
        stopScanner()
      }
    }
  }
  
  const startScanner = () => {
    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerRef.value,
        constraints: props.constraints
      },
      decoder: {
        readers: [props.reader]
      },
      locate: props.locate,
      numOfWorkers: navigator.hardwareConcurrency || 2
    }, (err) => {
      if (err) {
        console.error('Quagga init error', err)
        emit('error', err)
      } else {
        Quagga.start()
        emit('init')
        Quagga.onDetected(onDetected)
      }
    })
  }
  
  const stopScanner = () => {
    try {
      Quagga.stop()
      Quagga.offDetected(onDetected)
    } catch (e) {
      console.warn('Error stopping scanner:', e)
    }
  }
  
  onMounted(startScanner)
  onUnmounted(stopScanner)
  </script>
  
  <style scoped>
  .quagga-scanner {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  </style>
  