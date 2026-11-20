<script setup>
import Icon from './Icon.vue'
import { SYSTEM_NAME } from '../utils/constants'
</script>

<template>
  <div class="auth-layout">
    <section class="brand-panel">
      <div class="brand-top">
        <div class="brand-mark">ESSU</div>
        <span>Eastern Samar State University</span>
      </div>
      <div class="brand-center">
        <p class="campus">Salcedo Campus &middot; Supply Management</p>
        <h2>School Supplies Inventory Monitoring System</h2>
        <p class="lead">A centralized platform for real-time stock visibility, digital requisitions, and accountable supply distribution.</p>
        <div class="feature-list">
          <div><span><Icon name="package" :size="17" /></span> Real-time inventory and stock status</div>
          <div><span><Icon name="clipboard" :size="17" /></span> Digital supply request workflow</div>
          <div><span><Icon name="bell" :size="17" /></span> Automatic low-stock alerts</div>
          <div><span><Icon name="shield" :size="17" /></span> Role-based access and audit trail</div>
        </div>
      </div>
      <p class="brand-foot">{{ SYSTEM_NAME }}</p>
    </section>
    <section class="form-panel">
      <div class="form-container"><slot /></div>
      <p class="form-foot">Authorized access only &middot; Accounts are created by the Property Custodian</p>
    </section>
  </div>
</template>

<style scoped>
.auth-layout { min-height: 100vh; display: grid; grid-template-columns: minmax(340px, 46%) 1fr; background: #fff; }
.brand-panel { position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 42px 48px; color: #fff; background: radial-gradient(circle at 85% 15%, rgba(47,160,105,0.45), transparent 42%), linear-gradient(150deg, var(--green-800), var(--green-950)); overflow: hidden; }
.brand-top { display: flex; align-items: center; gap: 12px; font-size: 0.82rem; font-weight: 600; }
.brand-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 11px; background: #fff; color: var(--green-900); font-weight: 800; font-size: 0.75rem; letter-spacing: 0.04em; }
.brand-center { max-width: 460px; }
.campus { color: var(--green-200); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }
.brand-center h2 { font-size: clamp(1.7rem, 3vw, 2.5rem); line-height: 1.18; letter-spacing: -0.03em; margin: 12px 0 16px; }
.lead { color: #c6ddcd; font-size: 0.92rem; line-height: 1.6; }
.feature-list { display: grid; gap: 12px; margin-top: 30px; }
.feature-list div { display: flex; align-items: center; gap: 11px; font-size: 0.85rem; color: #e2efe6; }
.feature-list span { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: rgba(255,255,255,0.12); }
.brand-foot { font-size: 0.63rem; color: #8fb8a0; letter-spacing: 0.04em; max-width: 360px; }
.form-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; }
.form-container { width: 100%; max-width: 400px; }
.form-foot { margin-top: 28px; font-size: 0.72rem; color: var(--muted); text-align: center; }
@media (max-width: 860px) { .auth-layout { grid-template-columns: 1fr; } .brand-panel { display: none; } .form-panel { min-height: 100vh; } }
</style>
