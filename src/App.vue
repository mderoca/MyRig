<script setup>
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <div class="app-shell">
    <Navbar />
    <main class="app-main">
      <RouterView />
    </main>
    <Footer />
  </div>
</template>
